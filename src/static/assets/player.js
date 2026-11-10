/* VerFutbol · reproductor */
import {
  CONFIG, $, el, hora, cargarAgenda, agendaDeCache, playerUrl,
  estado, ordenarEnlaces, guardarPrefCanal
} from './app.js';

const box = $('player');

function error(msg) {
  box.className = 'player vacio';
  box.replaceChildren(el('div', { class: 'state', text: msg }));
}

function pintarPartido(m) {
  $('bar').textContent = estado(m) === 'envivo' ? 'Transmisión en vivo' : 'Transmisión';
  $('match-time').textContent = hora(m.inicio);
  $('tournament').textContent = m.torneo ? m.torneo + ': ' : '';
  $('match-name').textContent = m.partido;
  $('channels').textContent = m.canales.length ? 'Canales: ' + m.canales.join(' · ') : '';
  $('match-box').hidden = false;
  document.title = `${m.partido || m.torneo} · ${CONFIG.NAME}`;
}

function pintarOpciones(m, ordenadas, actual) {
  if (ordenadas.length < 2) return;
  $('options').replaceChildren(el('div', { class: 'other-options' },
    el('span', { text: 'Opciones:' }),
    ...ordenadas.map(e => el('a', {
      class: 'option-btn' + (e.idx === actual.idx ? ' active' : ''),
      href: playerUrl(m, e.idx),
      'data-canal': e.nombre,
      text: e.etiqueta,
      ...(e.idx === actual.idx ? { 'aria-current': 'true' } : {})
    }))));
}

function pintarPlayer(url) {
  const f = el('iframe', {
    src: url,
    allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
    referrerpolicy: 'no-referrer',
    scrolling: 'no',
    title: 'Reproductor'
  });
  box.className = 'player';
  box.replaceChildren(f);
  $('reload').onclick = () => { f.src = url; };
}

// Usa la copia reciente de la agenda (instantáneo); solo va a la red si no está o el partido no aparece.
async function buscarPartido(id) {
  const copia = agendaDeCache(CONFIG.AGENDA_CACHE_MAX_MS);
  const enCopia = copia && copia.find(x => x.id === id);
  if (enCopia) return enCopia;
  return (await cargarAgenda()).find(x => x.id === id);
}

function mostrar(m, actual) {
  const ordenadas = ordenarEnlaces(m.enlaces);
  pintarPartido(m);
  pintarOpciones(m, ordenadas, actual);
  pintarPlayer(actual.url);

  const sig = $('next');
  sig.hidden = ordenadas.length < 2;
  sig.onclick = () => {
    const i = ordenadas.findIndex(e => e.idx === actual.idx);
    const otra = ordenadas[(i + 1) % ordenadas.length];
    guardarPrefCanal(otra.nombre);
    history.replaceState(null, '', playerUrl(m, otra.idx));
    mostrar(m, otra);
  };
}

async function iniciar() {
  const q = new URLSearchParams(location.search);
  const id = q.get('m');
  if (!id) return error('Falta el partido a reproducir. Vuelve a la agenda y elige uno.');

  let m;
  try {
    m = await buscarPartido(id);
  } catch (err) {
    console.error(err);
    return error('No se pudo cargar la transmisión. Inténtalo de nuevo en unos minutos.');
  }
  if (!m) return error('Este partido ya no está en la agenda.');
  if (!m.enlaces.length) return error('Este partido todavía no tiene transmisión disponible.');

  const pedido = parseInt(q.get('o'), 10);
  const actual = m.enlaces.find(e => e.idx === pedido) || ordenarEnlaces(m.enlaces)[0];
  mostrar(m, actual);
}

// Recordar la opción elegida entre las alternativas (clic o clic central).
const recordar = e => {
  const a = e.target.closest('.option-btn');
  if (a) guardarPrefCanal(a.dataset.canal);
};
$('options').addEventListener('click', recordar);
$('options').addEventListener('auxclick', recordar);

iniciar();
