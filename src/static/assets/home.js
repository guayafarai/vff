/* VerFutbol · página principal */
import {
  CONFIG, $, el, norm, hora, diaLabel, diaCorto, diaKey,
  cargarAgenda, agendaDeCache, iconSources, setImg, playerUrl,
  estado, cuentaAtras, ordenarEnlaces, prefCanal, guardarPrefCanal, leer, guardar
} from './app.js';

const filtros = { q: '', torneo: '', canal: '', soloFutbol: false, soloVivo: false, soloFavs: false };
let partidos = [];
let dia = '';
let sigPrevia = '';
let ultimaCarga = 0;
let finAbierto = false;
let temporizadores = [];

const guardados = leer(CONFIG.FAV_KEY, []);
const favs = new Set(Array.isArray(guardados) ? guardados : []);
const esFav = m => Boolean(m.equipos && m.equipos.some(e => favs.has(norm(e))));

function alternarFav(clave) {
  if (favs.has(clave)) favs.delete(clave); else favs.add(clave);
  guardar(CONFIG.FAV_KEY, [...favs]);
}

/* ---------- Filas ---------- */
function btnFav(nombre) {
  const clave = norm(nombre);
  const on = favs.has(clave);
  return el('button', {
    type: 'button',
    class: 'fav-btn',
    'data-equipo': clave,
    'aria-pressed': String(on),
    'aria-label': `${on ? 'Quitar de' : 'Añadir a'} mis equipos: ${nombre}`,
    title: on ? 'Quitar de mis equipos' : 'Añadir a mis equipos',
    text: on ? '★' : '☆'
  });
}

function fila(m, est, mostrarFin) {
  const img = el('img', { alt: m.torneo || 'Fútbol', loading: 'lazy', width: '28', height: '28' });
  setImg(img, iconSources(m));

  const titulo = el('div', { class: 'match-title' },
    el('span', { class: 'tournament', text: m.torneo ? m.torneo + ': ' : '' }));
  if (m.equipos) {
    m.equipos.forEach((nombre, i) => {
      if (i) titulo.append(' vs ');
      titulo.append(el('span', { class: 'team', text: nombre }), btnFav(nombre));
    });
  } else {
    titulo.append(m.partido);
  }
  if (est === 'envivo') titulo.append(el('span', { class: 'live', text: 'EN VIVO' }));
  else if (est === 'finalizado' && mostrarFin) titulo.append(el('span', { class: 'ended', text: 'Finalizado' }));

  const info = el('div', { class: 'match-info' }, titulo);
  if (m.canales.length) {
    info.append(el('span', { class: 'channels', text: 'Canales: ' + m.canales.join(' · ') }));
  }
  if (est === 'proximo') {
    info.append(el('span', { class: 'countdown', 'data-inicio': String(m.inicio.getTime()) }));
  }

  const row = el('div', { class: 'match-row' + (esFav(m) ? ' fav' : '') },
    el('time', { class: 'match-time', datetime: m.inicio.toISOString(), text: hora(m.inicio) }),
    el('div', { class: 'match-icon' }, img),
    info);

  if (m.enlaces.length) {
    row.append(el('div', { class: 'watch-links' },
      ...ordenarEnlaces(m.enlaces).map(e => el('a', {
        class: 'watch-btn',
        href: playerUrl(m, e.idx),
        title: e.idioma || e.etiqueta,
        'aria-label': `Ver ${m.partido} (${e.etiqueta})`,
        'data-canal': e.nombre,
        text: e.etiqueta
      }))));
  }
  return row;
}

/* ---------- Filtros ---------- */
function filtrarBase() {
  const q = norm(filtros.q);
  return partidos.filter(m =>
    (!filtros.soloFutbol || m.deporte === 'futbol') &&
    (!filtros.torneo || m.torneo === filtros.torneo) &&
    (!filtros.canal || m.canales.includes(filtros.canal)) &&
    (!filtros.soloFavs || esFav(m)) &&
    (!q || m.busqueda.includes(q)));
}

function llenarSelect(sel, clave, valores, todos) {
  const sig = valores.join('|');
  if (sel.dataset.sig === sig) return;
  sel.dataset.sig = sig;
  const actual = sel.value;
  sel.replaceChildren(
    el('option', { value: '', text: todos }),
    ...valores.map(v => el('option', { value: v, text: v })));
  sel.value = valores.includes(actual) ? actual : '';
  filtros[clave] = sel.value;
}

function prepararFiltros() {
  const pool = partidos.filter(m => !filtros.soloFutbol || m.deporte === 'futbol');
  const ordenar = (a, b) => a.localeCompare(b, 'es');
  llenarSelect($('f-torneo'), 'torneo',
    [...new Set(pool.map(m => m.torneo).filter(Boolean))].sort(ordenar), 'Todos los torneos');
  llenarSelect($('f-canal'), 'canal',
    [...new Set(pool.flatMap(m => m.canales))].sort(ordenar), 'Todos los canales');
  $('filters').hidden = false;
}

/* ---------- Días ---------- */
function etiquetaDia(d, ahora) {
  const k = diaKey(d);
  if (k === diaKey(ahora)) return 'Hoy';
  if (k === diaKey(new Date(ahora.getTime() + 864e5))) return 'Mañana';
  if (k === diaKey(new Date(ahora.getTime() - 864e5))) return 'Ayer';
  return diaCorto(d);
}

// Hoy si hay partidos; si no, el próximo día con partidos; si no, el último.
function diaPorDefecto(dias, ahora) {
  const hoy = dias.find(x => x.k === diaKey(ahora));
  if (hoy) return hoy.k;
  const futuro = dias.find(x => x.d.getTime() > ahora.getTime());
  return (futuro || dias[dias.length - 1] || { k: '' }).k;
}

/* ---------- Render ---------- */
function render() {
  if (!partidos.length) return;
  const ahora = Date.now();
  const ahoraD = new Date(ahora);
  const plano = Boolean(filtros.q.trim()) || filtros.soloVivo; // búsqueda o "en vivo": lista cronológica de todos los días

  let lista = filtrarBase();
  if (filtros.soloVivo) lista = lista.filter(m => estado(m, ahora) === 'envivo');

  const dias = [];
  const vistos = new Set();
  for (const m of lista) {
    const k = diaKey(m.inicio);
    if (!vistos.has(k)) { vistos.add(k); dias.push({ k, d: m.inicio }); }
  }
  if (!dias.some(x => x.k === dia)) dia = diaPorDefecto(dias, ahoraD);

  // Plan de filas: se calcula antes de tocar el DOM para poder saltarse el repintado si nada cambió.
  const plan = [];
  let visibles = 0;
  if (!lista.length) {
    plan.push({ msg: 'Ningún partido coincide con los filtros actuales.' });
  } else if (plano) {
    const variosDias = dias.length > 1;
    let ult = '';
    for (const m of lista) {
      const k = diaKey(m.inicio);
      if (variosDias && k !== ult) { ult = k; plan.push({ sep: diaLabel(m.inicio) }); }
      plan.push({ m, est: estado(m, ahora), fin: true });
      visibles++;
    }
  } else {
    const delDia = lista.filter(m => diaKey(m.inicio) === dia).map(m => ({ m, est: estado(m, ahora) }));
    visibles = delDia.length;
    const favPrimero = arr => arr.sort((a, b) => esFav(b.m) - esFav(a.m)); // estable: mantiene la hora
    const vivo = favPrimero(delDia.filter(x => x.est === 'envivo'));
    const prox = favPrimero(delDia.filter(x => x.est === 'proximo'));
    const fin = delDia.filter(x => x.est === 'finalizado');
    const grupos = (vivo.length ? 1 : 0) + (prox.length ? 1 : 0) + (fin.length ? 1 : 0);
    if (vivo.length) { if (grupos > 1) plan.push({ sep: 'En vivo ahora', seccion: true }); plan.push(...vivo); }
    if (prox.length) { if (grupos > 1) plan.push({ sep: 'Próximos', seccion: true }); plan.push(...prox); }
    if (fin.length) plan.push({ finales: fin, abierto: !vivo.length && !prox.length });
  }

  const sigFila = x => `${x.m.id}|${x.est}|${esFav(x.m) ? 1 : 0}|${x.m.enlaces.length}`;
  const sig = [
    plano ? 'plano' : dia,
    filtros.soloFutbol ? 'f' : 'd', // cambia el titular aunque la lista sea la misma
    dias.map(x => x.k + etiquetaDia(x.d, ahoraD)).join(','),
    prefCanal(),
    plan.map(p => p.msg ? 'm:' + p.msg : p.sep ? 's:' + p.sep
      : p.finales ? 'f:' + p.abierto + p.finales.map(sigFila).join(',') : sigFila(p)).join(';')
  ].join('#');

  if (sig === sigPrevia) { actualizarCuentas(); return; }
  sigPrevia = sig;

  // Conservar el foco del teclado si el elemento reaparece tras repintar.
  const act = document.activeElement;
  const foco = act && act.dataset && (act.dataset.equipo ? ['equipo', act.dataset.equipo]
    : act.dataset.dia ? ['dia', act.dataset.dia] : null);

  const deporte = filtros.soloFutbol ? 'Partidos de fútbol' : 'Agenda deportiva';
  let titulo = deporte;
  const sel = dias.find(x => x.k === dia);
  if (!plano && sel) titulo += sel.k === diaKey(ahoraD) ? ' de hoy' : ' · ' + diaLabel(sel.d);
  $('agenda-date').textContent = titulo;

  const nav = $('days');
  nav.hidden = plano || dias.length < 2;
  nav.replaceChildren(...dias.map(x => el('button', {
    type: 'button', class: 'day-btn', 'data-dia': x.k,
    'aria-pressed': String(x.k === dia), text: etiquetaDia(x.d, ahoraD)
  })));

  const cont = $('matches-list');
  cont.replaceChildren();
  for (const p of plan) {
    if (p.msg) {
      cont.append(el('div', { class: 'state', text: p.msg }));
    } else if (p.sep) {
      cont.append(el('div', { class: 'day-sep' + (p.seccion ? ' seccion' : ''), text: p.sep }));
    } else if (p.finales) {
      const resumen = el('summary', { text: `Finalizados (${p.finales.length})` });
      const det = el('details', { class: 'finished' }, resumen,
        ...p.finales.map(x => fila(x.m, x.est, false)));
      det.open = p.abierto || finAbierto;
      resumen.addEventListener('click', () => { finAbierto = !det.open; });
      cont.append(det);
    } else {
      cont.append(fila(p.m, p.est, p.fin));
    }
  }

  $('status').textContent = visibles
    ? `${visibles} ${visibles === 1 ? 'partido' : 'partidos'}`
    : 'Sin resultados';

  if (foco) {
    const n = document.querySelector(`[data-${foco[0]}="${CSS.escape(foco[1])}"]`);
    if (n) n.focus();
  }
  actualizarCuentas();
}

function actualizarCuentas() {
  const ahora = Date.now();
  for (const n of document.querySelectorAll('.countdown')) {
    const t = cuentaAtras(Number(n.dataset.inicio) - ahora);
    if (n.textContent !== t) n.textContent = t;
  }
}

/* ---------- Datos estructurados ---------- */
function jsonLd() {
  const ahora = Date.now();
  const items = partidos
    .filter(m => m.torneo && m.deporte === 'futbol' && estado(m, ahora) !== 'finalizado')
    .slice(0, 30)
    .map(m => {
      const ev = {
        '@type': 'SportsEvent',
        name: m.partido,
        startDate: m.inicio.toISOString(),
        sport: 'Fútbol',
        eventStatus: 'https://schema.org/EventScheduled',
        description: m.torneo + (m.canales.length ? ' · ' + m.canales.join(', ') : ''),
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: location.origin + '/' }
      };
      if (m.equipos) {
        ev.homeTeam = { '@type': 'SportsTeam', name: m.equipos[0] };
        ev.awayTeam = { '@type': 'SportsTeam', name: m.equipos[1] };
      }
      return ev;
    });
  let tag = document.getElementById('ld-matches');
  if (!items.length) { if (tag) tag.remove(); return; }
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = 'ld-matches';
    document.head.append(tag);
  }
  tag.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': items });
}

/* ---------- Carga y ciclo de vida ---------- */
function mostrar(lista) {
  partidos = lista;
  jsonLd();
  prepararFiltros();
  render();
}

async function cargar(primera) {
  try {
    if (primera) {
      // Pintado inmediato con la copia reciente (si existe) mientras llega la red.
      const copia = agendaDeCache(CONFIG.AGENDA_CACHE_MAX_MS);
      if (copia && copia.length) mostrar(copia);
    }
    const lista = await cargarAgenda();
    ultimaCarga = Date.now();
    if (!lista.length) {
      partidos = [];
      sigPrevia = '';
      $('matches-list').replaceChildren(el('div', { class: 'state', text: 'No hay partidos para mostrar.' }));
      return;
    }
    mostrar(lista);
  } catch (err) {
    console.error(err);
    // Si ya había datos en pantalla, se conservan y se reintenta en el próximo ciclo.
    if (!partidos.length) {
      $('matches-list').replaceChildren(
        el('div', { class: 'state', text: 'No se pudo cargar la agenda. Inténtalo de nuevo en unos minutos.' }));
    }
  }
}

function iniciarTemporizadores() {
  detenerTemporizadores();
  temporizadores = [setInterval(cargar, CONFIG.REFRESH_MS), setInterval(render, CONFIG.TICK_MS)];
}
function detenerTemporizadores() {
  temporizadores.forEach(clearInterval);
  temporizadores = [];
}

/* ---------- Eventos ---------- */
$('search').addEventListener('input', e => { filtros.q = e.target.value; render(); });
$('f-torneo').addEventListener('change', e => { filtros.torneo = e.target.value; render(); });
$('f-canal').addEventListener('change', e => { filtros.canal = e.target.value; render(); });

for (const b of document.querySelectorAll('.chip[data-filtro]')) {
  b.addEventListener('click', () => {
    const k = b.dataset.filtro;
    filtros[k] = !filtros[k];
    b.setAttribute('aria-pressed', String(filtros[k]));
    if (k === 'soloFutbol') prepararFiltros();
    render();
  });
}

$('days').addEventListener('click', e => {
  const b = e.target.closest('.day-btn');
  if (b) { dia = b.dataset.dia; render(); }
});

const recordarCanal = e => {
  const a = e.target.closest('.watch-btn');
  if (a) guardarPrefCanal(a.dataset.canal);
};
$('matches-list').addEventListener('click', e => {
  const f = e.target.closest('.fav-btn');
  if (f) { alternarFav(f.dataset.equipo); render(); return; }
  recordarCanal(e);
});
$('matches-list').addEventListener('auxclick', recordarCanal);

// Sin pestaña visible no se consulta nada; al volver se actualiza si hace falta.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { detenerTemporizadores(); return; }
  if (Date.now() - ultimaCarga >= CONFIG.REFRESH_MS) cargar(); else render();
  iniciarTemporizadores();
});

cargar(true);
iniciarTemporizadores();
