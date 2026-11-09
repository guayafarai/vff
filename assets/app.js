/* VerFutbol · núcleo compartido por index.html y player.html */
(function () {
  'use strict';

  /* ---------- Configuración única ---------- */
  const CONFIG = {
    NAME: 'VerFutbol',
    TAGLINE: 'Agenda deportiva diaria con horarios, torneos y canales oficiales de transmisión.',
    API_URL: '/api/agenda',
    // Origen para rutas relativas que vengan en el feed (banderas y reproductores).
    ASSET_ORIGIN: 'https://agenda18.com',
    // Zona horaria en la que el feed publica las horas.
    FEED_OFFSET: '-05:00',
    // Cuánto dura "EN VIVO" desde el inicio del partido (minutos).
    LIVE_WINDOW_MIN: 180,
    REFRESH_MS: 5 * 60 * 1000,
    PLAYER_PATH: 'player.html',
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

  /* ---------- Cabecera común ---------- */
  function renderHeader() {
    const host = $('site-header');
    if (!host) return;
    host.className = 'header';
    host.replaceChildren(
      el('h1', {}, el('a', { href: 'index.html', text: CONFIG.NAME })),
      el('p', { text: CONFIG.TAGLINE })
    );
  }

  /* ---------- Datos de ligas, países e iconos ---------- */
  const PAISES = {
    'argentina':'ar','brasil':'br','mexico':'mx','colombia':'co','peru':'pe','chile':'cl',
    'uruguay':'uy','paraguay':'py','ecuador':'ec','bolivia':'bo','venezuela':'ve',
    'espana':'es','inglaterra':'gb-eng','escocia':'gb-sct','gales':'gb-wls','italia':'it',
    'alemania':'de','francia':'fr','portugal':'pt','paises bajos':'nl','holanda':'nl',
    'belgica':'be','turquia':'tr','estados unidos':'us','eeuu':'us','usa':'us','ee.uu.':'us',
    'arabia saudita':'sa','arabia saudi':'sa','japon':'jp','china':'cn','grecia':'gr','rusia':'ru',
    'ucrania':'ua','suiza':'ch','austria':'at','croacia':'hr','serbia':'rs','polonia':'pl',
    'dinamarca':'dk','suecia':'se','noruega':'no','costa rica':'cr','panama':'pa',
    'honduras':'hn','guatemala':'gt','el salvador':'sv','jamaica':'jm','canada':'ca',
    'australia':'au','corea del sur':'kr','egipto':'eg','marruecos':'ma','sudafrica':'za',
    'qatar':'qa','catar':'qa','emiratos arabes':'ae','republica checa':'cz','rumania':'ro',
    'hungria':'hu','bulgaria':'bg','irlanda':'ie','israel':'il','cuba':'cu',
    'republica dominicana':'do','nicaragua':'ni','haiti':'ht','trinidad y tobago':'tt',
    'finlandia':'fi','eslovaquia':'sk','eslovenia':'si','chipre':'cy','islandia':'is'
  };

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
  function normalizar(item) {
    const a = item.attributes || {};
    const desc = a.diary_description || '';
    const i = desc.indexOf(': ');
    const torneo = i > -1 ? desc.slice(0, i) : '';
    const partido = i > -1 ? desc.slice(i + 2) : desc;

    const inicio = new Date(`${a.date_diary}T${a.diary_hour}${CONFIG.FEED_OFFSET}`);

    const pais = a.country?.data?.attributes?.name || '';
    const imgApi = a.country?.data?.attributes?.image?.data?.attributes?.url;
    const liga = ligaDe(torneo);
    const code = PAISES[norm(pais)] || liga?.flag || '';

    const canales = [];
    const enlaces = [];
    for (const e of a.embeds?.data || []) {
      const attr = e.attributes || {};
      const nombre = (attr.embed_name || '').trim();
      const url = absUrl((attr.embed_iframe || '').trim());

      if (nombre && !/movil/i.test(nombre) && !/op2/i.test(nombre)) canales.push(nombre);
      // Solo https: el navegador bloquea http dentro de una página https.
      if (/^https:\/\//i.test(url)) enlaces.push({ url, nombre, idioma: (attr.idioma || '').trim() });
    }
    enlaces.forEach((e, idx) => {
      e.etiqueta = e.nombre || (enlaces.length > 1 ? 'Opción ' + (idx + 1) : 'Ver');
    });

    const ahora = Date.now();
    const envivo = enlaces.length > 0 && ahora >= inicio.getTime() &&
      ahora <= inicio.getTime() + CONFIG.LIVE_WINDOW_MIN * 60000;

    return {
      id: String(item.id ?? hash(`${a.date_diary}|${a.diary_hour}|${desc}`)),
      inicio, torneo, partido, pais, envivo,
      tsdb: liga?.tsdb || null,
      emoji: liga?.emoji || '',
      banderas: [flagUrl(code), imgApi ? absUrl(imgApi) : ''].filter(Boolean),
      canales: [...new Set(canales)],
      enlaces
    };
  }

  async function cargarAgenda() {
    const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    return (Array.isArray(json?.data) ? json.data : [])
      .map(normalizar)
      .filter(m => !isNaN(m.inicio))
      .sort((a, b) => a.inicio - b.inicio);
  }

  const playerUrl = (m, idx) =>
    `${CONFIG.PLAYER_PATH}?m=${encodeURIComponent(m.id)}&o=${idx}`;

  window.VF = {
    CONFIG, $, el, norm, hora, diaLabel, diaKey,
    renderHeader, normalizar, cargarAgenda, cargarEscudos,
    iconSources, setImg, playerUrl
  };
})();
