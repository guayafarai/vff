/* VerFutbol · página principal */
(function () {
  'use strict';
  const { CONFIG, $, el, norm, hora, diaLabel, diaKey, renderHeader,
          cargarAgenda, cargarEscudos, iconSources, setImg, playerUrl } = VF;

  let partidos = [];

  function fila(m) {
    const img = el('img', { alt: m.torneo || m.pais, loading: 'lazy' });
    setImg(img, iconSources(m));

    const titulo = el('div', {},
      el('span', { class: 'tournament', text: m.torneo ? m.torneo + ': ' : '' }),
      m.partido);
    if (m.envivo) titulo.append(el('span', { class: 'live', text: 'EN VIVO' }));

    const info = el('div', { class: 'match-info' }, titulo);
    if (m.canales.length) {
      info.append(el('span', { class: 'channels', text: 'Canales: ' + m.canales.join(' · ') }));
    }

    const row = el('div', { class: 'match-row' },
      el('div', { class: 'match-time', text: hora(m.inicio) }),
      el('div', { class: 'match-icon' }, img),
      info);

    if (m.enlaces.length) {
      row.append(el('div', { class: 'watch-links' },
        ...m.enlaces.map((e, i) => el('a', {
          class: 'watch-btn',
          href: playerUrl(m, i),
          title: e.idioma || e.etiqueta,
          text: e.etiqueta
        }))));
    }
    return row;
  }

  function render(lista) {
    const cont = $('matches-list');
    cont.replaceChildren();
    if (!lista.length) {
      cont.append(el('div', { class: 'state', text: 'No hay partidos para mostrar.' }));
      return;
    }
    const variosDias = new Set(lista.map(m => diaKey(m.inicio))).size > 1;
    let dia = '';
    for (const m of lista) {
      if (variosDias && diaKey(m.inicio) !== dia) {
        dia = diaKey(m.inicio);
        cont.append(el('div', { class: 'day-sep', text: diaLabel(m.inicio) }));
      }
      cont.append(fila(m));
    }
  }

  function filtrar() {
    const q = norm($('search').value);
    render(!q ? partidos : partidos.filter(m =>
      norm([m.partido, m.torneo, m.pais, m.canales.join(' ')].join(' ')).includes(q)));
  }

  function titulo() {
    const dias = new Set(partidos.map(m => diaKey(m.inicio)));
    $('agenda-date').textContent = dias.size === 1
      ? 'Agenda de Partidos · ' + diaLabel(partidos[0].inicio)
      : 'Agenda de Partidos';
  }

  async function cargar() {
    try {
      partidos = await cargarAgenda();
      if (partidos.length) titulo();
      filtrar();
      if (await cargarEscudos(partidos)) filtrar();
    } catch (err) {
      console.error(err);
      // Si ya había datos en pantalla, se conservan y se reintenta en el próximo ciclo.
      if (!partidos.length) {
        $('matches-list').replaceChildren(
          el('div', { class: 'state', text: 'No se pudo cargar la agenda. Inténtalo de nuevo en unos minutos.' }));
      }
    }
  }

  renderHeader();
  $('search').addEventListener('input', filtrar);
  cargar();
  setInterval(cargar, CONFIG.REFRESH_MS);
})();
