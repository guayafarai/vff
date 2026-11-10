# VerFutbol

Agenda deportiva diaria. Sitio estático generado con un script sin dependencias + funciones serverless para Vercel.

## Dónde cambiar cada cosa
| Qué | Dónde |
|---|---|
| Nombre, **dominio**, **correo de contacto**, descripción, tagline, color, imagen social | `src/site.json` |
| `<head>` común (iconos, manifest, robots, canonical, estilos) | `src/partials/head.html` |
| Etiquetas Open Graph / Twitter | `src/partials/social.html` |
| Cabeceras y footer | `src/partials/header-*.html`, `src/partials/footer.html` |
| Esqueleto HTML de todas las páginas | `src/layouts/base.html` |
| Contenido de cada página (título, ruta, robots, scripts, sitemap en su cabecera `---`) | `src/pages/*.html` |
| Configuración del cliente (API, zona horaria del feed, duración de "EN VIVO", claves de almacenamiento…) | `src/static/assets/config.js` |
| Ligas, banderas, escudos y deporte de cada torneo | `LIGAS` en `src/static/assets/lib.js` |
| `robots.txt`, `sitemap.xml`, `manifest.webmanifest` | Se **generan solos** desde `site.json` y las páginas con `sitemap: true` |

Para añadir una página: crea `src/pages/mi-pagina.html` con su cabecera `---` (usa `path: /mi-pagina` y `sitemap: true` si debe indexarse; `lastmod: AAAA-MM-DD` es opcional y solo se publica si lo pones).

## Estructura del código del cliente (módulos ES)
| Archivo | Contenido |
|---|---|
| `config.js` | Constantes |
| `lib.js` | Lógica **pura** (sin DOM ni red): normalización del feed, ligas, estados, cuenta atrás. Es lo que cubren las pruebas |
| `app.js` | Utilidades de DOM, `localStorage`, carga de la agenda, canal preferido |
| `home.js` / `player.js` | Páginas (cada una importa `app.js`) |

El build añade `?v=<hash>` a CSS y JS (y a los `import` entre módulos), así que tras cada despliegue nadie ve código viejo, y los assets versionados se cachean un año (`vercel.json`).

## Funciones de la API (`api/`)
- `GET /api/agenda`: proxy del feed con caché en el CDN.
- `GET /api/badge?league=<id>` / `?flag=<código>`: proxy de escudos (TheSportsDB) y banderas (flagcdn), cacheado una semana en el CDN. Solo admite ids y banderas que existan en `LIGAS`. **Define `TSDB_KEY`** en las variables de entorno de Vercel con tu clave de TheSportsDB (la `123` por defecto es solo de pruebas).

## Comandos
```
npm run dev      # build + servidor local con recarga + funciones de api/ (http://localhost:3000)
npm run build    # genera dist/
npm test         # pruebas de lib.js (node:test)
npm run check    # build + pruebas
```
Vercel ejecuta el build solo (`buildCommand` y `outputDirectory` en `vercel.json`).

## Almacenamiento local (relevante para la política de privacidad)
`verfutbol_agenda_v1` (copia de la agenda, 10 min), `verfutbol_favs_v1` (equipos favoritos), `verfutbol_canal_v1` (último canal elegido). Si añades analítica, anuncios o cookies propias, actualiza `privacidad.html` y valora un aviso de cookies.

## Antes de publicar
- Cambia `domain` y `email` en `src/site.json` (hoy son `TUDOMINIO.com`).
- Verifica `FEED_OFFSET` en `config.js` contra el feed real (se ignora si la hora ya trae zona).
- Define `TSDB_KEY` en Vercel.
- Revisa los textos de `privacidad.html` y `aviso-legal.html`.
