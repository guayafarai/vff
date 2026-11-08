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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://streamx723.sbs/'
            },
            responseType: 'text',
            timeout: 10000
        });

        let html = response.data;

        // 1. Eliminar scripts de publicidad agresiva conocidos (aclib, popups, redirecciones)
        html = html.replace(/<script[^>]*src="[^"]*aclib\.js"[^>]*><\/script>/gi, '');
        html = html.replace(/<script[^>]*src="[^"]*pop[^"]*"[^>]*><\/script>/gi, '');
        html = html.replace(/<script[^>]*src="[^"]*ad[^"]*"[^>]*><\/script>/gi, '');
        html = html.replace(/<div[^>]*id="dontfoid"[^>]*>[\s\S]*?<\/div>/gi, '');
        html = html.replace(/<a[^>]*href="[^"]*ad\/visit\.php[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

        // 2. Inyección de script anulador de ventanas emergentes y clics publicitarios
        const adBlockInjection = `
            <script>
                (function() {
                    // Bloquear aperturas de popups y nuevas pestañas
                    window.open = function() { return null; };
                    window.aclib = { runPop: function(){}, init: function(){} };

                    // Neutralizar funciones de redirección masivas
                    const noop = function() {};
                    window.popunder = noop;
                    window.openPop = noop;

                    // Desactivar clics en enlaces publicitarios o elementos transparentes
                    document.addEventListener('click', function(e) {
                        const target = e.target;
                        if (target) {
                            if (target.tagName === 'A' && target.href && (target.href.includes('ad/') || target.href.includes('visit.php') || target.target === '_blank')) {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }
                            if (target.id === 'dontfoid' || (target.style && target.style.zIndex > 1000 && target.tagName !== 'VIDEO')) {
                                e.preventDefault();
                                e.stopPropagation();
                                target.remove();
                                return false;
                            }
                        }
                    }, true);

                    // Limpiador recurrente en el DOM
                    setInterval(function() {
                        const bads = document.querySelectorAll('#dontfoid, a[href*="ad/visit"], a[target="_blank"]');
                        bads.forEach(function(el) {
                            if (el.tagName === 'A' && !el.href.includes('streamx')) {
                                el.removeAttribute('target');
                                el.onclick = function(ev) { ev.preventDefault(); return false; };
                            } else if (el.id === 'dontfoid') {
                                el.remove();
                            }
                        });
                    }, 400);
                })();
            </script>
            <style>
                #dontfoid, a[href*="ad/visit.php"] { display: none !important; opacity: 0 !important; pointer-events: none !important; }
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
                iframe, video { width: 100% !important; height: 100% !important; border: 0 !important; }
            </style>
        `;

        html = html.replace('</head>', adBlockInjection + '</head>');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error en proxy:', error.message);
        return res.redirect(302, targetUrl);
    }
}
