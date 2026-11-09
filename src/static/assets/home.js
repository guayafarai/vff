/* VerFutbol · página principal */
(function () {
  'use strict';
  const { CONFIG, $, el, norm, hora, diaLabel, diaKey,
          cargarAgenda, cargarEscudos, iconSources, setImg, playerUrl } = VF;

  let partidos = [];

  function fila(m) {
    const img = el('img', { alt: m.torneo || m.pais || 'Fútbol', loading: 'lazy', width: '28', height: '28' });
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
      el('time', { class: 'match-time', datetime: m.inicio.toISOString(), text: hora(m.inicio) }),
      el('div', { class: 'match-icon' }, img),
      info);

    if (m.enlaces.length) {
      row.append(el('div', { class: 'watch-links' },
        ...m.enlaces.map((e, i) => el('a', {
          class: 'watch-btn',
          href: playerUrl(m, i),
          title: e.idioma || e.etiqueta,
          'aria-label': `Ver ${m.partido} (${e.etiqueta})`,
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
      ? 'Agenda deportiva · ' + diaLabel(partidos[0].inicio)
      : 'Agenda deportiva de hoy';
  }

  function jsonLd() {
    const items = partidos.filter(m => m.torneo).slice(0, 30).map(m => ({
      '@type': 'SportsEvent',
      name: m.partido,
      startDate: m.inicio.toISOString(),
      sport: 'Fútbol',
      description: m.torneo + (m.canales.length ? ' · ' + m.canales.join(', ') : ''),
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: location.origin + '/' }
    }));
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

  async function cargar() {
    try {
      partidos = await cargarAgenda();
      if (partidos.length) { titulo(); jsonLd(); }
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

  $('search').addEventListener('input', filtrar);
  cargar();
  setInterval(cargar, CONFIG.REFRESH_MS);
})();
