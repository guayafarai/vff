// Proxy hacia TheSportsDB: devuelve solo fútbol, con hora, nombre y canales.
const BASE = 'https://www.thesportsdb.com/api/v1/json';

// TheSportsDB guarda la hora en UTC pero sin "Z"; se la agregamos.
function aISO(texto) {
  if (!texto) return null;
  const t = /(Z|[+-]\d\d:\d\d)$/.test(texto) ? texto : texto + 'Z';
  const d = new Date(t);
  return isNaN(d) ? null : d.toISOString();
}

export default async function handler(req, res) {
  const fecha = String(req.query.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Usa ?fecha=AAAA-MM-DD' });
  }

  const clave = process.env.THESPORTSDB_KEY || '123'; // clave gratuita por defecto

  try {
    const r = await fetch(`${BASE}/${clave}/eventstv.php?d=${fecha}`);
    if (!r.ok) throw new Error('TheSportsDB respondió ' + r.status);
    const json = await r.json();

    // Un partido sale una vez por canal; los agrupamos por idEvent.
    const porId = new Map();
    for (const e of json.tvevents || []) {
      if (e.strSport !== 'Soccer') continue;
      const inicio = aISO(e.strTimestamp || `${e.dateEvent}T${e.strTime}`);
      if (!inicio) continue;

      if (!porId.has(e.idEvent)) {
        porId.set(e.idEvent, {
          id: e.idEvent,
          inicio,
          torneo: e.strLeague || '',
          partido: e.strEvent || `${e.strHomeTeam} vs ${e.strAwayTeam}`,
          canales: []
        });
      }
      const p = porId.get(e.idEvent);
      const canal = { nombre: e.strChannel || '', pais: e.strCountry || '' };
      const repetido = p.canales.some(c => c.nombre === canal.nombre && c.pais === canal.pais);
      if (canal.nombre && !repetido) p.canales.push(canal);
    }

    const partidos = [...porId.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));

    // Caché en Vercel: evita pedirle datos a TheSportsDB por cada visitante.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ fecha, partidos });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'No se pudo obtener la agenda' });
  }
}
