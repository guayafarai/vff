/* VerFutbol · núcleo compartido por la home y el reproductor (DOM, red y almacenamiento) */
import { CONFIG } from './config.js';
import { construirAgenda } from './lib.js';

export * from './lib.js';
export { CONFIG };

export const $ = id => document.getElementById(id);

export function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}

export function setImg(img, urls) {
  let k = 0;
  img.onerror = () => {
    if (++k < urls.length) img.src = urls[k];
    else img.onerror = null;
  };
  img.src = urls[0];
}

/* ---------- localStorage tolerante a fallos ---------- */
export function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch { return porDefecto; }
}
export function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin storage o lleno */ }
}

/* ---------- Agenda ---------- */
// Copia reciente de la última respuesta del feed (compartida entre pestañas):
// permite pintar la home al instante y abrir el reproductor sin esperar a la red.
export function agendaDeCache(maxAgeMs) {
  const c = leer(CONFIG.AGENDA_CACHE_KEY, null);
  if (!c || !Array.isArray(c.data) || !(Date.now() - c.t < maxAgeMs)) return null;
  try { return construirAgenda(c.data); } catch { return null; }
}

export async function cargarAgenda() {
  const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const lista = construirAgenda(json);
  guardar(CONFIG.AGENDA_CACHE_KEY, { t: Date.now(), data: json });
  return lista;
}

/* ---------- Canal preferido ---------- */
// Se recuerda el último canal que el usuario eligió y se muestra primero entre las opciones.
export const prefCanal = () => String(leer(CONFIG.PREF_KEY, '') || '');
export function guardarPrefCanal(nombre) { if (nombre) guardar(CONFIG.PREF_KEY, nombre); }
export function ordenarEnlaces(enlaces) {
  const pref = prefCanal();
  if (!pref) return enlaces;
  return [...enlaces].sort((a, b) => (b.nombre === pref) - (a.nombre === pref));
}
