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
        let refererHeader = 'https://streamx723.sbs/';
        if (targetUrl.includes('agenda888.json')) {
            refererHeader = 'https://streamx723.sbs/';
        }

        // Petición al servidor original simulando un navegador real
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': refererHeader,
                'Origin': 'https://streamx723.sbs'
            },
            responseType: (targetUrl.endsWith('.json') || targetUrl.includes('json')) ? 'json' : 'text',
            timeout: 10000
        });

        if (targetUrl.endsWith('.json') || targetUrl.includes('json') || typeof response.data === 'object') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).json(response.data);
        }

        let html = response.data;

        // Remoción de scripts e identificadores conocidos
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
        console.error('Error en el proxy:', error.message);
        return res.status(500).json({ error: 'Error en proxy: ' + error.message });
    }
}
