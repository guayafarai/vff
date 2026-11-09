# VerFutbol

Agenda deportiva diaria. Sitio estático generado con un script sin dependencias + una función serverless para Vercel.

## Dónde cambiar cada cosa
| Qué | Dónde |
|---|---|
| Nombre, **dominio**, **correo de contacto**, descripción, tagline, color, imagen social | `src/site.json` |
| `<head>` común (iconos, manifest, robots, canonical, estilos) | `src/partials/head.html` |
| Etiquetas Open Graph / Twitter | `src/partials/social.html` |
| Cabeceras y footer | `src/partials/header-*.html`, `src/partials/footer.html` |
| Esqueleto HTML de todas las páginas | `src/layouts/base.html` |
| Contenido de cada página (título, ruta, robots, scripts, sitemap en su cabecera `---`) | `src/pages/*.html` |
| Configuración de la app (API, zona horaria, duración de "EN VIVO"…) | `CONFIG` en `src/static/assets/app.js` |
| `robots.txt`, `sitemap.xml`, `manifest.webmanifest` | Se **generan solos** desde `site.json` y las páginas con `sitemap: true` |

Para añadir una página: crea `src/pages/mi-pagina.html` con su cabecera `---` (usa `path: /mi-pagina` y `sitemap: true` si debe indexarse).

## Build
```
npm run build      # genera dist/
```
Vercel lo ejecuta solo (`buildCommand` y `outputDirectory` en `vercel.json`). Para probar en local con la API: `vercel dev`.

## Antes de publicar
- Cambia `domain` y `email` en `src/site.json` (hoy son `TUDOMINIO.com`).
- Verifica `CONFIG.ASSET_ORIGIN` y `CONFIG.FEED_OFFSET` en `app.js`.
- Revisa los textos de `privacidad.html` y `aviso-legal.html`.
