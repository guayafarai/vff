const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const streamUrl = req.query.url;
        if (!streamUrl) {
            return res.status(400).send('Falta el parámetro url.');
        }

        // Hacemos la petición al sitio original simulando un navegador
        const response = await axios.get(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://la18hd.su/'
            }
        });

        let html = response.data;

        // --- FILTRADO Y REMOCIÓN DE PUBLICIDAD ---
        // 1. Eliminar script aclib.js
        html = html.replace(/<script[^>]*src="[^"]*aclib\.js"[^>]*><\/script>/gi, '');
        
        // 2. Eliminar la capa invisible trampa (dontfoid)
        html = html.replace(/<div[^>]*id="dontfoid"[^>]*>[\s\S]*?<\/div>/gi, '');

        // 3. Eliminar enlace trampa oculto
        html = html.replace(/<a[^>]*href="[^"]*ad\/visit\.php[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

        // 4. Inyectar CSS para adaptar el reproductor y ocultar scrollbars molestos
        html = html.replace('</head>', `
            <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
                iframe, video { width: 100% !important; height: 100% !important; border: 0 !important; }
            </style>
            </head>
        `);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error en el proxy:', error.message);
        return res.status(500).send('Error al cargar la transmisión limpia.');
    }
}
