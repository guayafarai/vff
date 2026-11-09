/* VerFutbol · reproductor */
(function () {
  'use strict';
  const { $, el, hora, renderHeader, cargarAgenda, playerUrl } = VF;

  const box = $('player');

  function error(msg) {
    box.className = 'player vacio';
    box.replaceChildren(el('div', { class: 'state', text: msg }));
  }

  function pintarPartido(m) {
    $('bar').textContent = m.envivo ? 'Transmisión en vivo' : 'Transmisión';
    $('match-time').textContent = hora(m.inicio);
    $('tournament').textContent = m.torneo ? m.torneo + ': ' : '';
    $('match-name').textContent = m.partido;
    $('channels').textContent = m.canales.length ? 'Canales: ' + m.canales.join(' · ') : '';
    $('match-box').hidden = false;
    document.title = `${m.partido || m.torneo} · ${VF.CONFIG.NAME}`;
  }

  function pintarOpciones(m, actual) {
    if (m.enlaces.length < 2) return;
    $('options').replaceChildren(el('div', { class: 'other-options' },
      el('span', { text: 'Opciones:' }),
      ...m.enlaces.map((e, i) => el('a', {
        class: 'option-btn' + (i === actual ? ' active' : ''),
        href: playerUrl(m, i),
        text: e.etiqueta,
        ...(i === actual ? { 'aria-current': 'true' } : {})
      }))));
  }

  function pintarPlayer(url) {
    const f = el('iframe', {
      src: url,
      allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
      allowfullscreen: '',
      referrerpolicy: 'no-referrer',
      scrolling: 'no',
      title: 'Reproductor'
    });
    box.className = 'player';
    box.replaceChildren(f);
    $('reload').onclick = () => { f.src = url; };
  }

  async function iniciar() {
    renderHeader();
    const q = new URLSearchParams(location.search);
    const id = q.get('m');
    if (!id) return error('Falta el partido a reproducir. Vuelve a la agenda y elige uno.');

    let m;
    try {
      m = (await cargarAgenda()).find(x => x.id === id);
    } catch (err) {
      console.error(err);
      return error('No se pudo cargar la transmisión. Inténtalo de nuevo en unos minutos.');
    }
    if (!m) return error('Este partido ya no está en la agenda.');
    if (!m.enlaces.length) return error('Este partido todavía no tiene transmisión disponible.');

    const pedido = parseInt(q.get('o'), 10);
    const actual = Number.isInteger(pedido) && pedido >= 0 && pedido < m.enlaces.length ? pedido : 0;

    pintarPartido(m);
    pintarOpciones(m, actual);
    pintarPlayer(m.enlaces[actual].url);
  }

  iniciar();
})();
