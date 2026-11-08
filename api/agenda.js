export default async function handler(req, res) {
  // Permitir peticiones (CORS opcional por si lo necesitas)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const response = await fetch('https://agenda18.com/agenda.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Opcional por si el servidor de origen lo requiere
      }
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor externo: ${response.status}`);
    }

    const data = await response.json();

    // Devuelve los datos al frontend de forma limpia
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'No se pudo obtener la agenda' });
  }
}
