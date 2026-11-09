// Proxy de la agenda: evita problemas de CORS y deja cachear la respuesta en el CDN de Vercel.
const SOURCE_URL = 'https://agenda18.com/agenda.json';
const TIMEOUT_MS = 8000;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Servidor de origen respondió ${response.status}`);

    const data = await response.json();

    // 1 min fresco en el CDN; hasta 2 min más sirviendo copia vieja mientras se refresca.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (error) {
    console.error('[agenda]', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'No se pudo obtener la agenda' });
  } finally {
    clearTimeout(timer);
  }
}
