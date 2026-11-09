# Agenda de Fútbol

Página que muestra los partidos de fútbol del día con su hora, nombre y los canales de TV que los transmiten.

## Cómo funciona

- `api/agenda.js`: función serverless (Vercel) que consulta la API pública de [TheSportsDB](https://www.thesportsdb.com/documentation) (`eventstv.php`), deja solo fútbol, agrupa los canales por partido y responde con JSON limpio. Usa caché de 5 minutos.
- `index.html` + `app.js` + `style.css`: la interfaz. Permite elegir fecha, filtrar por país del canal y buscar por equipo o torneo.

## Ejecutar

1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto: `vercel dev`
3. (Opcional) Clave propia de TheSportsDB: define la variable `THESPORTSDB_KEY`. Sin ella usa la clave gratuita `123`, que tiene límite de peticiones.

## Notas

- Las horas se muestran en la zona horaria de tu navegador.
- La cobertura de canales depende de los datos de TheSportsDB; algunos partidos pueden no tener canal.
