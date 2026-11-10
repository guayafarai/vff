// Genera dist/ a partir de src/. Sin dependencias (Node >= 18).
// Todo lo compartido vive en src/site.json, src/partials y src/layouts.
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');

const site = JSON.parse(await readFile(path.join(SRC, 'site.json'), 'utf8'));
site.domain = site.domain.replace(/\/+$/, '');
site.ogImageUrl = site.domain + site.ogImage;
site.year = String(new Date().getFullYear());

const read = (...p) => readFile(path.join(SRC, ...p), 'utf8');

// Cabecera opcional de cada página: líneas "clave: valor" entre '---'.
function parseFront(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: text.slice(m[0].length) };
}

// {{> nombre}} inserta src/partials/nombre.html
async function includes(text, depth = 0) {
  if (depth > 5) throw new Error('Parciales anidados en exceso');
  const re = /\{\{>\s*([\w-]+)\s*\}\}/g;
  let out = '', last = 0, m;
  while ((m = re.exec(text))) {
    out += text.slice(last, m.index) + await includes(await read('partials', `${m[1]}.html`), depth + 1);
    last = m.index + m[0].length;
  }
  return out + text.slice(last);
}

// {{variable}}: falla si falta alguna, para detectar errores al construir.
function fill(text, vars, where) {
  for (let i = 0; i < 4; i++) {
    const next = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, k) => {
      if (!(k in vars)) throw new Error(`Variable sin definir "${k}" en ${where}`);
      return vars[k];
    });
    if (next === text) return text;
    text = next;
  }
  if (/\{\{/.test(text)) throw new Error(`Plantilla sin resolver en ${where}`);
  return text;
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

await rm(OUT, { recursive: true, force: true });

// 1) Archivos estáticos (los .js admiten {{variables}} del sitio)
// Los .css y .js se referencian con ?v=<hash del contenido>: tras cada despliegue el navegador
// descarga el código nuevo y los módulos nunca se mezclan con versiones viejas de la caché.
const staticDir = path.join(SRC, 'static');
const archivos = [];
for await (const file of walk(staticDir)) archivos.push(file);

const hv = createHash('sha256');
for (const file of archivos.filter(f => /\.(js|css)$/.test(f)).sort()) {
  hv.update(path.relative(staticDir, file)).update(await readFile(file));
}
site.assetV = hv.digest('hex').slice(0, 8);

for (const file of archivos) {
  const dest = path.join(OUT, path.relative(staticDir, file));
  await mkdir(path.dirname(dest), { recursive: true });
  if (file.endsWith('.js')) {
    let code = fill(await readFile(file, 'utf8'), site, file);
    // import ... from './x.js'  ->  './x.js?v=hash'
    code = code.replace(/(\bfrom\s+['"])(\.\/[\w.-]+\.js)(['"])/g, `$1$2?v=${site.assetV}$3`);
    await writeFile(dest, code);
  } else {
    await copyFile(file, dest);
  }
}

// 2) Páginas
const base = await includes(await read('layouts', 'base.html'));
const sitemap = [];
for (const name of (await readdir(path.join(SRC, 'pages'))).filter(f => f.endsWith('.html'))) {
  const { data, body } = parseFront(await read('pages', name));
  const vars = { robots: 'index, follow', ...site, ...data };

  vars.url = data.path ? site.domain + data.path : '';
  vars.canonical = data.path ? `<link rel="canonical" href="${vars.url}">` : '';
  vars.social = data.social === 'true' ? await includes('{{> social}}') : '';
  vars.header = await includes(`{{> header-${data.header || 'simple'}}}`);
  vars.scripts = data.scripts
    ? data.scripts.split(',').map(x => x.trim()).filter(Boolean)
        .map(x => `<script type="module" src="/assets/${x}?v=${site.assetV}"></script>`).join('\n  ')
    : '';

  const extra = /<head-extra>([\s\S]*?)<\/head-extra>/.exec(body);
  vars.headExtra = extra ? extra[1].trim() : '';
  vars.content = await includes(body.replace(/<head-extra>[\s\S]*?<\/head-extra>\s*/, '')).then(s => s.trim());

  await writeFile(path.join(OUT, name), fill(base, vars, `pages/${name}`));
  if (data.sitemap === 'true') {
    sitemap.push({ loc: vars.url, lastmod: data.lastmod, priority: data.priority, changefreq: data.changefreq });
  }
}

sitemap.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

// 3) robots.txt, sitemap.xml y manifest, generados desde site.json
await writeFile(path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.domain}/sitemap.xml\n`);

await writeFile(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map(u => `  <url><loc>${u.loc}</loc>` +
    (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
    (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : '') +
    (u.priority ? `<priority>${u.priority}</priority>` : '') + `</url>`).join('\n') +
  `\n</urlset>\n`);

await writeFile(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: site.name, short_name: site.name,
  description: site.tagline, lang: site.lang,
  start_url: '/', display: 'standalone',
  background_color: '#ffffff', theme_color: site.themeColor,
  icons: [
    { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2) + '\n');

console.log(`Sitio generado en dist/ (dominio: ${site.domain}, assets v=${site.assetV})`);
