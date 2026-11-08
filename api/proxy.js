const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Falta el parámetro url.');
    }

    try {
        // Hacemos la petición simulando un navegador real
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://la18hd.su/'
            },
            responseType: 'text',
            timeout: 8000 // Evitar que se quede colgado si el servidor tarda
        });

        let html = response.data;

        // Limpieza segura de scripts publicitarios y capas trampa
        html = html.replace(/<script[^>]*src="[^"]*aclib\.js"[^>]*><\/script>/gi, '');
        html = html.replace(/<div[^>]*id="dontfoid"[^>]*>[\s\S]*?<\/div>/gi, '');

        // Inyectar estilos para ajustar el reproductor al 100%
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
        console.error('Error detallado en el proxy:', error.message);
        // Si falla el proxy, redirigimos de emergencia al sitio original para que al menos cargue el video
        return res.redirect(302, targetUrl);
    }
}
