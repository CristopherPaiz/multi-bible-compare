/**
 * Interruptor de fuente de datos.
 *
 * La app puede leer el texto bíblico de dos lugares:
 *
 *   TURSO  → el backend nuevo (una consulta trae N versiones).
 *   GITHUB → el CDN viejo, un fetch por versión contra raw.githubusercontent.
 *
 * Ambas conviven a propósito: si el backend falla, se vuelve al CDN sin
 * redeploy. La preferencia se guarda en localStorage, así que el usuario (o
 * nosotros desde Ajustes) puede cambiarla en caliente.
 *
 * Prioridad: localStorage > VITE_DATA_SOURCE > TURSO.
 */

export const SOURCES = {
  TURSO: "turso",
  GITHUB: "github",
};

const STORAGE_KEY = "dataSource";

/** Backend desplegado. Se usa cuando la app NO corre en localhost. */
const API_REMOTO = "https://biblian-api-rasjz3-e671c7-109-123-255-138.sslip.io";
const API_LOCAL = "http://localhost:3000";

const esLocalhost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local");
};

/**
 * Base del backend, en orden de prioridad:
 *   1. VITE_API_URL, si se definió en el build (gana siempre).
 *   2. localhost:3000, si la app se está sirviendo en local.
 *   3. el backend desplegado.
 *
 * Así en desarrollo se apunta al API local sin configurar nada, y el build de
 * producción funciona aunque nadie haya puesto la variable.
 */
export const API_URL = (import.meta.env.VITE_API_URL || (esLocalhost() ? API_LOCAL : API_REMOTO)).replace(/\/+$/, "");

/** Rama del repo desde donde el CDN sirve los JSON originales. */
export const CDN_URL = (
  import.meta.env.VITE_CDN_URL ?? "https://raw.githubusercontent.com/CristopherPaiz/multi-bible-compare/main/src/assets"
).replace(/\/+$/, "");

/**
 * Base del audio Strong. Por defecto el bucket que ya venía funcionando; se
 * puede apuntar a otro sin tocar código.
 */
export const AUDIO_URL = (import.meta.env.VITE_AUDIO_URL ?? "https://music-fragments.s3.fr-par.scw.cloud").replace(/\/+$/, "");

const DEFAULT_SOURCE = import.meta.env.VITE_DATA_SOURCE === SOURCES.GITHUB ? SOURCES.GITHUB : SOURCES.TURSO;

const isValid = (value) => value === SOURCES.TURSO || value === SOURCES.GITHUB;

let current = DEFAULT_SOURCE;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isValid(saved)) current = saved;
} catch {
  // Safari en modo privado tira excepción al tocar localStorage.
}

const listeners = new Set();

export const getDataSource = () => current;

export const setDataSource = (value) => {
  if (!isValid(value) || value === current) return current;
  current = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sin persistencia, pero el cambio aplica en esta sesión.
  }
  listeners.forEach((listener) => listener(current));
  return current;
};

/** Se notifica a los suscriptores cuando cambia la fuente. Devuelve el cancelador. */
export const onDataSourceChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Cuando la fuente primaria es Turso y una petición falla, se reintenta contra
 * el CDN en vez de dejar la pantalla vacía. El fallback NO cambia la
 * preferencia guardada: es por petición, para que un backend dormido (Render
 * free tier tarda 30-60s en despertar) no rompa la lectura.
 */
export const AUTO_FALLBACK = import.meta.env.VITE_AUTO_FALLBACK !== "false";
