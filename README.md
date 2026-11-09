# VerFutbol

Agenda deportiva diaria. Sitio estático + una función serverless para Vercel.

## Estructura
- `index.html` / `player.html`: páginas (solo marcado).
- `assets/app.js`: núcleo compartido y **toda la configuración** (`CONFIG`): nombre, API, zona horaria, duración de "EN VIVO", etc.
- `assets/home.js`, `assets/player.js`: lógica de cada página.
- `assets/styles.css`: estilos compartidos.
- `api/agenda.js`: proxy de la agenda con caché en CDN y timeout.

## Despliegue
Sube la carpeta a Vercel tal cual (no requiere build).

## Ajustes a verificar
- `CONFIG.ASSET_ORIGIN` (`assets/app.js`): origen para rutas relativas del feed (banderas y reproductores).
- `CONFIG.FEED_OFFSET`: zona horaria en la que el feed publica las horas (`-05:00`).
