// Proxy hacia la API pública de ESPN: fútbol, NBA y MLB con hora, nombre y canales.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// Si un código no existe, ESPN responde vacío o con error y simplemente se ignora.
const LIGAS = [
  { deporte: 'futbol', ruta: 'soccer/uefa.champions', nombre: 'Champions League' },
  { deporte: 'futbol', ruta: 'soccer/uefa.europa', nombre: 'Europa League' },
  { deporte: 'futbol', ruta: 'soccer/eng.1', nombre: 'Premier League' },
  { deporte: 'futbol', ruta: 'soccer/esp.1', nombre: 'LaLiga' },
  { deporte: 'futbol', ruta: 'soccer/ger.1', nombre: 'Bundesliga' },
  { deporte: 'futbol', ruta: 'soccer/ita.1', nombre: 'Serie A' },
  { deporte: 'futbol', ruta: 'soccer/fra.1', nombre: 'Ligue 1' },
  { deporte: 'futbol', ruta: 'soccer/por.1', nombre: 'Primeira Liga' },
  { deporte: 'futbol', ruta: 'soccer/ned.1', nombre: 'Eredivisie' },
  { deporte: 'futbol', ruta: 'soccer/mex.1', nombre: 'Liga MX' },
  { deporte: 'futbol', ruta: 'soccer/arg.1', nombre: 'Liga Profesional Argentina' },
  { deporte: 'futbol', ruta: 'soccer/bra.1', nombre: 'Brasileirão' },
  { deporte: 'futbol', ruta: 'soccer/col.1', nombre: 'Liga BetPlay' },
  { deporte: 'futbol', ruta: 'soccer/usa.1', nombre: 'MLS' },
  { deporte: 'futbol', ruta: 'soccer/conmebol.libertadores', nombre: 'Copa Libertadores' },
  { deporte: 'futbol', ruta: 'soccer/conmebol.sudamericana', nombre: 'Copa Sudamericana' },
  { deporte: 'nba', ruta: 'basketball/nba', nombre: 'NBA' },
  { deporte: 'mlb', ruta: 'baseball/mlb', nombre: 'MLB' }
];

async function pedirLiga(liga, fecha) {
  const url = `${BASE}/${liga.ruta}/scoreboard?dates=${fecha.replaceAll('-', '')}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).events || [];
}

// ESPN pone los canales en dos lugares: broadcasts[].names y geoBroadcasts[].media.shortName.
function canalesDe(comp) {
  const nombres = new Set();
  for (const b of comp?.broadcasts || []) for (const n of b.names || []) nombres.add(n);
  for (const g of comp?.geoBroadcasts || []) if (g.media?.shortName) nombres.add(g.media.shortName);
  return [...nombres];
}

function armarPartido(ev, liga) {
  const comp = ev.competitions?.[0];
  const equipos = comp?.competitors || [];
  const local = equipos.find(c => c.homeAway === 'home')?.team?.displayName;
  const visita = equipos.find(c => c.homeAway === 'away')?.team?.displayName;
  const partido = local && visita
    ? (liga.deporte === 'futbol' ? `${local} vs ${visita}` : `${visita} @ ${local}`)
    : ev.name;
  const inicio = new Date(ev.date);
  if (isNaN(inicio)) return null;
  return {
    id: ev.id,
    deporte: liga.deporte,
    torneo: liga.nombre,
    partido,
    inicio: inicio.toISOString(),
    estado: ev.status?.type?.state || 'pre', // pre = por jugar, in = en vivo, post = terminado
    canales: canalesDe(comp)
  };
}

export default async function handler(req, res) {
  const fecha = String(req.query.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Usa ?fecha=AAAA-MM-DD' });
  }

  const resultados = await Promise.allSettled(LIGAS.map(l => pedirLiga(l, fecha)));

  // Diagnóstico: /api/agenda?fecha=AAAA-MM-DD&debug=1
  if (req.query.debug) {
    const ligas = LIGAS.map((l, i) => ({
      liga: l.nombre,
      eventos: resultados[i].status === 'fulfilled' ? resultados[i].value.length : null,
      error: resultados[i].status === 'rejected' ? String(resultados[i].reason) : undefined
    }));
    const primero = resultados.find(r => r.status === 'fulfilled' && r.value.length)?.value[0];
    return res.status(200).json({ ligas, ejemplo: primero?.competitions?.[0]
      ? { name: primero.name, broadcasts: primero.competitions[0].broadcasts, geoBroadcasts: primero.competitions[0].geoBroadcasts }
      : null });
  }

  if (resultados.every(r => r.status === 'rejected')) {
    return res.status(502).json({ error: 'No se pudo obtener la agenda' });
  }

  const partidos = [];
  resultados.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    for (const ev of r.value) {
      const p = armarPartido(ev, LIGAS[i]);
      if (p) partidos.push(p);
    }
  });
  partidos.sort((a, b) => a.inicio.localeCompare(b.inicio));

  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  return res.status(200).json({ fecha, partidos });
}
