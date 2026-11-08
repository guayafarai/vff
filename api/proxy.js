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

    // Petición de la agenda JSON
    if (targetUrl.endsWith('.json') || targetUrl.includes('json')) {
        try {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                timeout: 10000
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).json(response.data);
        } catch (err) {
            console.error('Error proxy JSON:', err.message);
            return res.status(500).json({ error: 'Error al obtener la agenda JSON: ' + err.message });
        }
    }

    // Petición de stream / reproductor
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            responseType: 'text',
            timeout: 10000
        });

        let html = response.data;

        // Limpieza de publicidad y popups
        html = html.replace(/<script[^>]*src="[^"]*aclib\.js"[^>]*><\/script>/gi, '');
        html = html.replace(/<div[^>]*id="dontfoid"[^>]*>[\s\S]*?<\/div>/gi, '');
        html = html.replace(/<a[^>]*href="[^"]*ad\/visit\.php[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

        html = html.replace('</head>', `
            <script>
                window.aclib = { runPop: function(){}, init: function(){} };
                window.open = function(){ return null; };
            </script>
            <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
                iframe, video { width: 100% !important; height: 100% !important; border: 0 !important; }
            </style>
            </head>
        `);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error en proxy (redirigiendo a targetUrl):', error.message);
        // Si el servidor de origen rechaza la petición del proxy con 403 o error de red, redirigimos al iframe directo
        return res.redirect(302, targetUrl);
    }
}
