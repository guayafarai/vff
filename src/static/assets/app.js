/* VerFutbol · núcleo compartido por index.html y player.html */
(function () {
  'use strict';

  /* ---------- Configuración única ---------- */
  const CONFIG = {
    NAME: '{{name}}',
    API_URL: '/api/agenda',
    // Origen para rutas relativas que vengan en el feed.
    ASSET_ORIGIN: 'https://la18hd.su',
    // Zona horaria en la que el feed publica las horas.
    FEED_OFFSET: '-05:00',
    // Cuánto dura "EN VIVO" desde el inicio del partido (minutos).
    LIVE_WINDOW_MIN: 180,
    REFRESH_MS: 5 * 60 * 1000,
    PLAYER_PATH: '/player',
    TSDB_KEY: '123',
    BADGE_CACHE_KEY: 'verfutbol_badges_v1'
  };

  /* ---------- Utilidades ---------- */
  const $ = id => document.getElementById(id);

  const norm = s => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    }
    n.append(...kids);
    return n;
  }

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function absUrl(u) {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('//')) return 'https:' + u;
    return CONFIG.ASSET_ORIGIN + (u.startsWith('/') ? '' : '/') + u;
  }

  const hora = d => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });

  const diaLabel = d => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  const diaKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  function emojiIcon(e) {
    return 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="19" font-size="19" text-anchor="middle">${e}</text></svg>`);
  }
  const FALLBACK_ICON = emojiIcon('⚽');

  /* ---------- Datos de ligas e iconos ---------- */
  // Orden importa: la primera coincidencia gana.
  const LIGAS = [
    { match: 'formula 1',         tsdb: 4370, emoji: '🏎️' },
    { match: 'nfl',               tsdb: 4391, emoji: '🏈' },
    { match: 'nba',               tsdb: 4387, emoji: '🏀' },
    { match: 'mlb',               tsdb: 4424, emoji: '⚾' },
    { match: 'nhl',               tsdb: 4380, emoji: '🏒' },
    { match: 'ufc',               emoji: '🥊' },
    { match: 'boxeo',             emoji: '🥊' },
    { match: 'motogp',            emoji: '🏍️' },
    { match: 'atp',               emoji: '🎾' },
    { match: 'wta',               emoji: '🎾' },
    { match: 'wimbledon',         emoji: '🎾' },
    { match: 'roland garros',     emoji: '🎾' },
    { match: 'rugby',             emoji: '🏉' },
    { match: 'voley',             emoji: '🏐' },
    { match: 'golf',              emoji: '⛳' },
    { match: 'ciclismo',          emoji: '🚴' },
    { match: 'champions league',  tsdb: 4480 },
    { match: 'europa league',     tsdb: 4481 },
    { match: 'libertadores',      tsdb: 4501 },
    { match: 'premier league',    flag: 'gb-eng', tsdb: 4328 },
    { match: 'laliga',            flag: 'es', tsdb: 4335 },
    { match: 'la liga',           flag: 'es', tsdb: 4335 },
    { match: 'bundesliga',        flag: 'de', tsdb: 4331 },
    { match: 'serie a',           flag: 'it', tsdb: 4332 },
    { match: 'ligue 1',           flag: 'fr', tsdb: 4334 },
    { match: 'liga mx',           flag: 'mx', tsdb: 4350 },
    { match: 'liga profesional',  flag: 'ar', tsdb: 4406 },
    { match: 'brasileirao',       flag: 'br', tsdb: 4351 },
    { match: 'mls',               flag: 'us', tsdb: 4346 },
    { match: 'liga betplay',      flag: 'co' },
    { match: 'liga 1',            flag: 'pe' },
    { match: 'eredivisie',        flag: 'nl' },
    { match: 'primeira liga',     flag: 'pt' }
  ];

  const ligaDe = torneo => {
    const t = norm(torneo);
    return LIGAS.find(l => t.includes(l.match)) || null;
  };

  const flagUrl = code => code ? `https://flagcdn.com/w40/${code}.png` : '';

  /* ---------- Escudos de liga (TheSportsDB) con caché local ---------- */
  let badgeCache = {};
  try { badgeCache = JSON.parse(localStorage.getItem(CONFIG.BADGE_CACHE_KEY) || '{}'); } catch { /* sin storage */ }

  async function cargarEscudo(id) {
    if (id in badgeCache) return badgeCache[id];
    try {
      const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${CONFIG.TSDB_KEY}/lookupleague.php?id=${id}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const b = j?.leagues?.[0]?.strBadge || '';
      badgeCache[id] = b ? b + '/tiny' : '';
    } catch {
      return ''; // no se cachea: se reintenta en la próxima carga
    }
    try { localStorage.setItem(CONFIG.BADGE_CACHE_KEY, JSON.stringify(badgeCache)); } catch { /* sin storage */ }
    return badgeCache[id];
  }

  async function cargarEscudos(partidos) {
    const faltan = [...new Set(partidos.map(m => m.tsdb).filter(Boolean))].filter(id => !(id in badgeCache));
    if (!faltan.length) return false;
    await Promise.all(faltan.map(cargarEscudo));
    return true;
  }

  function iconSources(m) {
    const badge = m.tsdb ? badgeCache[m.tsdb] : '';
    return [badge, ...m.banderas, m.emoji ? emojiIcon(m.emoji) : '', FALLBACK_ICON].filter(Boolean);
  }

  function setImg(img, urls) {
    let k = 0;
    img.onerror = () => {
      if (++k < urls.length) img.src = urls[k];
      else img.onerror = null;
    };
    img.src = urls[0];
  }

  /* ---------- Agenda: carga y normalización ---------- */
  // El feed es una lista plana: una entrada por enlace. Varias entradas con la
  // misma fecha, hora y título son el mismo partido con distintas opciones.
  const CANALES = {
    disney: 'Disney+', espn: 'ESPN', espn2: 'ESPN2', espn2mx: 'ESPN2 MX', espn3: 'ESPN3',
    winplus: 'Win+', winsports: 'Win Sports', tudn: 'TUDN', tudnusa: 'TUDN USA',
    liga1max: 'Liga 1 Max', foxsports: 'Fox Sports', tnt: 'TNT Sports', dsports: 'DSports',
    tycsports: 'TyC Sports', gol: 'GolTV', golperu: 'Gol Perú', directv: 'DIRECTV'
  };

  function prettify(s) {
    return s.length <= 4 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Deduce el canal a partir del enlace (?stream=disney19, .../repro/espn2tv.html, ...).
  function infoEnlace(link) {
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

  function normalizar(items) {
    const a = items[0];
    const desc = a.title || '';
    const i = desc.indexOf(': ');
    const torneo = i > -1 ? desc.slice(0, i) : '';
    const partido = i > -1 ? desc.slice(i + 2) : desc;

    const inicio = new Date(`${a.date}T${a.time}${CONFIG.FEED_OFFSET}`);
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

      enlaces.push({ url, nombre: base, idioma: (it.language || '').trim(), etiqueta });
    }
    enlaces.forEach((e, idx) => {
      if (!e.etiqueta) e.etiqueta = enlaces.length > 1 ? 'Opción ' + (idx + 1) : 'Ver';
    });

    // Si el feed informa el estado, se respeta; si no, se calcula por la hora.
    const ahora = Date.now();
    const status = norm(a.status);
    const envivo = enlaces.length > 0 && (status
      ? status.includes('vivo')
      : ahora >= inicio.getTime() && ahora <= inicio.getTime() + CONFIG.LIVE_WINDOW_MIN * 60000);

    return {
      id: hash(`${a.date}|${a.time}|${desc}`),
      inicio, torneo, partido, pais: '', envivo,
      tsdb: liga?.tsdb || null,
      emoji: liga?.emoji || '',
      banderas: [flagUrl(liga?.flag)].filter(Boolean),
      canales, enlaces
    };
  }

  async function cargarAgenda() {
    const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Formato de agenda inesperado');

    const grupos = new Map();
    for (const it of json) {
      if (!it || !it.title || !it.date || !it.time) continue;
      const k = `${it.date}|${it.time}|${it.title}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(it);
    }
    return [...grupos.values()]
      .map(normalizar)
      .filter(m => !isNaN(m.inicio))
      .sort((a, b) => a.inicio - b.inicio);
  }

  const playerUrl = (m, idx) =>
    `${CONFIG.PLAYER_PATH}?m=${encodeURIComponent(m.id)}&o=${idx}`;

  window.VF = {
    CONFIG, $, el, norm, hora, diaLabel, diaKey,
    normalizar, cargarAgenda, cargarEscudos,
    iconSources, setImg, playerUrl
  };
})();
