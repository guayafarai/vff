/* VerFutbol · configuración única del cliente */
export const CONFIG = {
  NAME: '{{name}}',
  API_URL: '/api/agenda',
  // Origen para rutas relativas que vengan en el feed.
  ASSET_ORIGIN: 'https://la18hd.su',
  // Zona horaria en la que el feed publica las horas. Se ignora si la hora ya
  // trae zona (por ejemplo "20:00-05:00" o "20:00Z"). Verifícala contra el feed real.
  FEED_OFFSET: '-05:00',
  // Cuánto dura "EN VIVO" desde el inicio del partido (minutos).
  LIVE_WINDOW_MIN: 180,
  REFRESH_MS: 5 * 60 * 1000,
  // Cada cuánto se recalculan estados y cuentas atrás sin pedir datos.
  TICK_MS: 30 * 1000,
  PLAYER_PATH: '/player',
  // Claves de localStorage
  AGENDA_CACHE_KEY: 'verfutbol_agenda_v1',
  AGENDA_CACHE_MAX_MS: 10 * 60 * 1000,
  FAV_KEY: 'verfutbol_favs_v1',
  PREF_KEY: 'verfutbol_canal_v1'
};
