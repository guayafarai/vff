// Proxy de escudos de liga (TheSportsDB) y banderas (flagcdn).
// El navegador pide la imagen a nuestro dominio y el CDN de Vercel la cachea una semana:
// ya no hay una consulta por visitante a la API gratuita ni hotlinking a terceros.
// Para producción, define TSDB_KEY en Vercel con tu clave de TheSportsDB (la '123' es solo de pruebas).
import { LIGAS } from '../src/static/assets/lib.js';

const TSDB_KEY = process.env.TSDB_KEY || '123';
const TIMEOUT_MS = 6000;
const MAX_BYTES = 300_000;

// Solo se aceptan ids y banderas que existen en la lista de ligas del sitio.
const LIGAS_OK = new Set(LIGAS.map(l => l.tsdb).filter(Boolean).map(String));
const BANDERAS_OK = new Set(LIGAS.map(l => l.flag).filter(Boolean));

async function pedir(url, tipo) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
    if (!r.ok) throw new Error(`Origen respondió ${r.status}`);
    if (tipo === 'json') return await r.json();
    const mime = r.headers.get('content-type') || '';
    if (!mime.startsWith('image/')) throw new Error('No es una imagen');
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) throw new Error('Tamaño inesperado');
    return { mime, buf };
  } finally {
    clearTimeout(timer);
  }
}

async function urlDeLiga(id) {
  const j = await pedir(`https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}/lookupleague.php?id=${id}`, 'json');
  const badge = j?.leagues?.[0]?.strBadge;
  if (!badge) throw new Error('Liga sin escudo');
  const u = new URL(badge);
  if (u.protocol !== 'https:' || !/(^|\.)thesportsdb\.com$/.test(u.hostname)) throw new Error('Host no permitido');
  return `${badge}/tiny`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { league, flag } = req.query || {};
  try {
    let origen;
    if (league) {
      if (!LIGAS_OK.has(String(league))) throw Object.assign(new Error('Liga no admitida'), { status: 404 });
      origen = await urlDeLiga(league);
    } else if (flag) {
      if (!BANDERAS_OK.has(String(flag))) throw Object.assign(new Error('Bandera no admitida'), { status: 404 });
      origen = `https://flagcdn.com/w40/${flag}.png`;
    } else {
      throw Object.assign(new Error('Falta league o flag'), { status: 400 });
    }

    const { mime, buf } = await pedir(origen, 'img');
    res.statusCode = 200;
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    return res.end(req.method === 'HEAD' ? undefined : buf);
  } catch (error) {
    // Errores cacheados poco tiempo: el cliente cae al siguiente icono y no se martillea el origen.
    res.statusCode = error.status || 502;
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.end();
  }
}
