// Servidor local: construye dist/, lo sirve y ejecuta las funciones de api/ (sin necesitar `vercel dev`).
// Uso: npm run dev   (PORT=3000 por defecto). Recarga el build al cambiar src/ o build.mjs.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json'
};

function construir() {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) console.error('El build falló; se sigue sirviendo la versión anterior.');
}

async function existe(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

async function api(req, res, url) {
  const nombre = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  if (!/^[\w-]+$/.test(nombre)) { res.statusCode = 404; return res.end(); }
  const archivo = path.join(ROOT, 'api', `${nombre}.js`);
  if (!(await existe(archivo))) { res.statusCode = 404; return res.end('{"error":"No existe"}'); }

  // Mismos helpers que ofrece Vercel (res.status().json(), req.query).
  req.query = Object.fromEntries(url.searchParams);
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  try {
    const mod = await import(`${pathToFileURL(archivo).href}?t=${Date.now()}`); // sin caché de módulos
    await mod.default(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"Error interno"}'); }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url);

  let ruta = decodeURIComponent(url.pathname);
  const candidatos = [ruta, ruta + '.html', path.posix.join(ruta, 'index.html')];
  for (const c of candidatos) {
    const archivo = path.join(DIST, c);
    if (!archivo.startsWith(DIST + path.sep) && archivo !== DIST) continue; // evita salir de dist/
    if (await existe(archivo)) {
      res.setHeader('Content-Type', TIPOS[path.extname(archivo)] || 'application/octet-stream');
      return res.end(await readFile(archivo));
    }
  }
  res.statusCode = 404;
  res.setHeader('Content-Type', TIPOS['.html']);
  res.end(await readFile(path.join(DIST, '404.html')).catch(() => 'No encontrado'));
});

construir();
let t;
const recargar = () => { clearTimeout(t); t = setTimeout(construir, 150); };
try {
  watch(path.join(ROOT, 'src'), { recursive: true }, recargar);
  watch(path.join(ROOT, 'build.mjs'), recargar);
} catch {
  console.warn('Este Node no admite watch recursivo: reinicia `npm run dev` tras editar archivos.');
}
server.listen(PORT, () => console.log(`VerFutbol en http://localhost:${PORT}`));
