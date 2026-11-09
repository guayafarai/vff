# Agenda Deportiva

Página con los partidos de fútbol, NBA y MLB del día: hora, nombre del partido y canales de TV.

## Cómo funciona

- `api/agenda.js`: función serverless (Vercel). Consulta la API pública de ESPN (`site.api.espn.com`) liga por liga, unifica los datos y responde JSON limpio con caché de 2 minutos.
- `index.html` + `app.js` + `style.css`: la interfaz. Elige fecha, filtra por deporte y busca por equipo o torneo.

## Ejecutar

1. `npm i -g vercel`
2. `vercel dev` en la carpeta del proyecto.
3. Diagnóstico: `/api/agenda?fecha=AAAA-MM-DD&debug=1` muestra cuántos eventos devolvió cada liga.

## Notas

- La API de ESPN no está documentada oficialmente; puede cambiar sin aviso.
- Los canales que devuelve son los de la transmisión en EE. UU. (ESPN, Fox, TNT, Peacock, etc.).
- Las horas se muestran en la zona horaria del navegador.
- Para agregar ligas, añade una línea a `LIGAS` en `api/agenda.js`.
