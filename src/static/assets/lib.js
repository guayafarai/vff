/* VerFutbol · lógica pura (sin DOM ni red), pensada para poder probarse con node:test */
import { CONFIG } from './config.js';

/* ---------- Utilidades ---------- */
export const norm = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Hash de 53 bits (cyrb53): colisiones despreciables para unos cientos de partidos.
export function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function absUrl(u) {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  return CONFIG.ASSET_ORIGIN + (u.startsWith('/') ? '' : '/') + u;
}

export const hora = d => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
export const diaLabel = d => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
export const diaCorto = d => d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
export const diaKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function emojiIcon(e) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="19" font-size="19" text-anchor="middle">${e}</text></svg>`);
}
export const FALLBACK_ICON = emojiIcon('⚽');

/* ---------- Ligas e iconos ---------- */
// Se evalúa sobre el torneo normalizado (minúsculas, sin tildes) con límites de
// palabra; la primera coincidencia gana, así que lo específico va antes que lo general.
// deporte: 'futbol' por defecto. tsdb = id de la liga en TheSportsDB (escudo).
const L = (re, datos) => ({ re, ...datos });
const OTRO = 'otros';

export const LIGAS = [
  // Otros deportes
  L(/\bformula 1\b|\bf1\b/,        { tsdb: 4370, emoji: '🏎️', deporte: OTRO }),
  L(/\bnfl\b/,                     { tsdb: 4391, emoji: '🏈', deporte: OTRO }),
  L(/\bnba\b/,                     { tsdb: 4387, emoji: '🏀', deporte: OTRO }),
  L(/\bmlb\b/,                     { tsdb: 4424, emoji: '⚾', deporte: OTRO }),
  L(/\bnhl\b/,                     { tsdb: 4380, emoji: '🏒', deporte: OTRO }),
  L(/\bufc\b|\bboxeo\b|\bmma\b|\bbellator\b/, { emoji: '🥊', deporte: OTRO }),
  L(/\bmotogp\b|\bnascar\b/,       { emoji: '🏍️', deporte: OTRO }),
  L(/\batp\b|\bwta\b|\bwimbledon\b|\broland garros\b|\bus open\b|\baustralian open\b|\btenis\b/, { emoji: '🎾', deporte: OTRO }),
  L(/\brugby\b/,                   { emoji: '🏉', deporte: OTRO }),
  L(/\bvoley\w*\b|\bvolei\w*\b/,   { emoji: '🏐', deporte: OTRO }),
  L(/\bgolf\b/,                    { emoji: '⛳', deporte: OTRO }),
  L(/\bciclismo\b|\btour de france\b/, { emoji: '🚴', deporte: OTRO }),
  L(/\bbasquet\w*\b|\bbaloncesto\b|\beuroliga\b/, { emoji: '🏀', deporte: OTRO }),
  L(/\bwwe\b/,                     { emoji: '🤼', deporte: OTRO }),

  // Fútbol: los países concretos van antes que los nombres genéricos ("Serie A", "Liga 1"…)
  L(/\bindonesia\b/,               { flag: 'id' }),
  L(/\bligapro\b|\becuador\b/,     { flag: 'ec' }),
  L(/\bbrasileir\w*|\bbrasil\b|\bbrazil\b/, { flag: 'br', tsdb: 4351 }),
  L(/\bboliv\w*/,                  { flag: 'bo' }),
  L(/\bchampions league\b/,        { tsdb: 4480, emoji: '🏆' }),
  L(/\beuropa league\b/,           { tsdb: 4481, emoji: '🏆' }),
  L(/\blibertadores\b/,            { tsdb: 4501, emoji: '🏆' }),
  L(/\bsudamericana\b|\bconcacaf\b|\bleagues cup\b|\bcopa america\b|\beliminatorias\b|\bnations league\b|\bmundial\b|\bworld cup\b/, { emoji: '🏆' }),
  L(/\bpremier league\b/,          { flag: 'gb-eng', tsdb: 4328 }),
  L(/\bla ?liga\b/,                { flag: 'es', tsdb: 4335 }),
  L(/\bcopa del rey\b/,            { flag: 'es' }),
  L(/\bbundesliga\b/,              { flag: 'de', tsdb: 4331 }),
  L(/\bdfb pokal\b/,               { flag: 'de' }),
  L(/\bserie a\b/,                 { flag: 'it', tsdb: 4332 }),
  L(/\bcoppa italia\b/,            { flag: 'it' }),
  L(/\bligue 1\b/,                 { flag: 'fr', tsdb: 4334 }),
  L(/\bliga mx\b/,                 { flag: 'mx', tsdb: 4350 }),
  L(/\bliga profesional\b|\bargentin\w*/, { flag: 'ar', tsdb: 4406 }),
  L(/\bmls\b/,                     { flag: 'us', tsdb: 4346 }),
  L(/\bbetplay\b|\bcolombia\w*/,   { flag: 'co' }),
  L(/\bliga 1\b|\bperu\w*/,        { flag: 'pe' }),
  L(/\bchile\w*/,                  { flag: 'cl' }),
  L(/\buruguay\w*/,                { flag: 'uy' }),
  L(/\bparaguay\w*/,               { flag: 'py' }),
  L(/\bvenezuela\w*/,              { flag: 've' }),
  L(/\beredivisie\b/,              { flag: 'nl' }),
  L(/\bprimeira liga\b/,           { flag: 'pt' }),
  L(/\bfa cup\b|\bcarabao\b/,      { flag: 'gb-eng' })
];

export const ligaDe = torneo => {
  const t = norm(torneo);
  return LIGAS.find(l => l.re.test(t)) || null;
};

// Escudos y banderas se piden a nuestro propio dominio (api/badge.js), que los cachea en el CDN.
export const badgeUrl = id => `/api/badge?league=${encodeURIComponent(id)}`;
export const flagUrl = code => code ? `/api/badge?flag=${encodeURIComponent(code)}` : '';

export function iconSources(m) {
  return [
    m.tsdb ? badgeUrl(m.tsdb) : '',
    flagUrl(m.flag),
    m.emoji ? emojiIcon(m.emoji) : '',
    FALLBACK_ICON
  ].filter(Boolean);
}

/* ---------- Canales y enlaces ---------- */
export const CANALES = {
  disney: 'Disney+', espn: 'ESPN', espn2: 'ESPN2', espn2mx: 'ESPN2 MX', espn3: 'ESPN3',
  winplus: 'Win+', winsports: 'Win Sports', tudn: 'TUDN', tudnusa: 'TUDN USA',
  liga1max: 'Liga 1 Max', foxsports: 'Fox Sports', tnt: 'TNT Sports', dsports: 'DSports',
  tycsports: 'TyC Sports', gol: 'GolTV', golperu: 'Gol Perú', directv: 'DIRECTV'
};

export function prettify(s) {
  return s.length <= 4 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1);
}

// Deduce el canal a partir del enlace (?stream=disney19, .../repro/espn2tv.html, ...).
export function infoEnlace(link) {
  let u;
  try { u = new URL(link); } catch { return { base: '', op: 0, alt: false }; }
  let s = u.searchParams.get('stream') || '';
  let alt = false;
  if (!s) {
    alt = true; // enlace de un reproductor externo
    const g = u.searchParams.get('get') || u.pathname;
    s = g.split('/').pop().replace(/\.html?$/i, '').replace(/tv$/i, '');
  }
  s = s.toLowerCase();
  const m = /_op(\d+)$/.exec(s);
  const op = m ? Number(m[1]) : 0;
  s = s.replace(/_op\d+$/, '').replace(/^disney\d*$/, 'disney');
  return { base: CANALES[s] || (s ? prettify(s) : ''), op, alt };
}

/* ---------- Partidos ---------- */
// "Local vs Visitante" (también "v", "-", "–", "—"). Devuelve null si no hay exactamente dos equipos.
export function dividirEquipos(partido) {
  const partes = String(partido || '').split(/\s+(?:vs\.?|v|-|–|—)\s+/i).map(s => s.trim());
  if (partes.length !== 2 || partes.some(p => !p || p.length > 60)) return null;
  return partes;
}

// 'envivo' | 'proximo' | 'finalizado'. Si el feed informa el estado se respeta; si no, se calcula por la hora.
export function estadoDe(inicioMs, statusFeed, ahora = Date.now()) {
  const s = norm(statusFeed);
  if (s.includes('vivo')) return 'envivo';
  if (/final|termin|conclu/.test(s)) return 'finalizado';
  if (ahora < inicioMs) return 'proximo';
  return ahora <= inicioMs + CONFIG.LIVE_WINDOW_MIN * 60000 ? 'envivo' : 'finalizado';
}
export const estado = (m, ahora = Date.now()) => estadoDe(m.inicio.getTime(), m.statusFeed, ahora);

export function cuentaAtras(ms) {
  if (!(ms > 0) || ms > 3 * 3600000) return '';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `Empieza en ${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `Empieza en ${h} h ${r} min` : `Empieza en ${h} h`;
}

// El feed es una lista plana: una entrada por enlace. Varias entradas con la
// misma fecha, hora y título son el mismo partido con distintas opciones.
export function normalizar(items) {
  const a = items[0];
  const desc = a.title || '';
  const i = desc.indexOf(': ');
  const torneo = i > -1 ? desc.slice(0, i) : '';
  const partido = i > -1 ? desc.slice(i + 2) : desc;

  const hh = String(a.time).trim();
  const tieneZona = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(hh);
  const inicio = new Date(`${a.date}T${hh}${tieneZona ? '' : CONFIG.FEED_OFFSET}`);
  const liga = ligaDe(torneo);

  const canales = [];
  const enlaces = [];
  const vistos = new Set();
  const usados = {};
  for (const it of items) {
    const url = absUrl((it.link || '').trim());
    // Solo https: el navegador bloquea http dentro de una página https.
    if (!/^https:\/\//i.test(url) || vistos.has(url)) continue;
    vistos.add(url);

    const { base, op, alt } = infoEnlace(url);
    if (base && !op && !canales.includes(base)) canales.push(base);

    let etiqueta = base || '';
    if (op) etiqueta += ` (Op. ${op})`;
    else if (alt && etiqueta) etiqueta += ' (alt)';
    usados[etiqueta] = (usados[etiqueta] || 0) + 1;
    if (usados[etiqueta] > 1) etiqueta += ` ${usados[etiqueta]}`;

    // idx = posición en el orden original del feed; es lo que viaja en la URL del reproductor.
    enlaces.push({ url, nombre: base, idioma: (it.language || '').trim(), etiqueta, idx: enlaces.length });
  }
  enlaces.forEach((e, k) => {
    if (!e.etiqueta) e.etiqueta = enlaces.length > 1 ? 'Opción ' + (k + 1) : 'Ver';
  });

  return {
    // Sin la hora en el id: si el feed corre el horario unos minutos, los enlaces al reproductor siguen vivos.
    id: hash(`${a.date}|${norm(desc)}`),
    inicio, statusFeed: a.status || '',
    torneo, partido, equipos: dividirEquipos(partido),
    deporte: liga?.deporte || 'futbol',
    tsdb: liga?.tsdb || null,
    flag: liga?.flag || '',
    emoji: liga?.emoji || '',
    canales, enlaces,
    busqueda: norm([partido, torneo, canales.join(' ')].join(' '))
  };
}

export function construirAgenda(json) {
  if (!Array.isArray(json)) throw new Error('Formato de agenda inesperado');
  const grupos = new Map();
  for (const it of json) {
    if (!it || !it.title || !it.date || !it.time) continue;
    const k = `${it.date}|${it.time}|${it.title}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(it);
  }
  const lista = [...grupos.values()]
    .map(normalizar)
    .filter(m => !isNaN(m.inicio))
    .sort((a, b) => a.inicio - b.inicio);

  // Mismo título y fecha a distinta hora (repetición): se desambigua por orden.
  const vistos = new Map();
  for (const m of lista) {
    const n = (vistos.get(m.id) || 0) + 1;
    vistos.set(m.id, n);
    if (n > 1) m.id += '-' + n;
  }
  return lista;
}

export const playerUrl = (m, idx) =>
  `${CONFIG.PLAYER_PATH}?m=${encodeURIComponent(m.id)}&o=${idx}`;
