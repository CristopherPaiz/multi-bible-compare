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

/**
 * En producción el backend NO se llama por su dominio propio, sino por el mismo
 * origen que sirve la app: `public/_redirects` tiene una regla de proxy que
 * manda `/api/*` al backend real.
 *
 * Es lo que hace que la sesión sobreviva a un F5. Llamando al dominio de la API
 * directamente, la cookie de sesión es de tercera parte y el navegador la tira
 * (Safari e ITP siempre, Brave igual, Firefox la aísla). Bajo el mismo origen
 * es de primera parte y no depende de la política de terceros de nadie.
 *
 * Cadena vacía = URLs relativas (`/api/bibles`), que es justo lo que se quiere.
 * El dominio real vive UNA sola vez, en `_redirects`. Si algún día se despliega
 * en un host sin reglas de proxy, se define `VITE_API_URL` y gana esa.
 */
const API_MISMO_ORIGEN = "";
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
 *   3. el mismo origen, resuelto por el proxy de `_redirects`.
 *
 * Así en desarrollo se apunta al API local sin configurar nada, y el build de
 * producción funciona aunque nadie haya puesto la variable.
 */
const apuntaALocalhost = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);

/*
 * `VITE_API_URL` se congela en el build, no en el arranque. Un `.env` local con
 * `http://localhost:3000` —que es lo que dice `.env.example`— se queda pegado en
 * el bundle si alguien compila desde su máquina en vez de en Netlify, y la app
 * publicada termina pidiéndole datos al equipo de quien visita. Se descarta.
 */
const apiConfigurada = import.meta.env.VITE_API_URL || "";
const apiValida = apiConfigurada && !(apuntaALocalhost(apiConfigurada) && !esLocalhost()) ? apiConfigurada : "";

export const API_URL = (apiValida || (esLocalhost() ? API_LOCAL : API_MISMO_ORIGEN)).replace(/\/+$/, "");

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

const listeners = new Set();

const isValid = (value) => value === SOURCES.TURSO || value === SOURCES.GITHUB;

const leerGuardada = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValid(saved) ? saved : null;
  } catch {
    // Safari en modo privado tira excepción al tocar localStorage.
    return null;
  }
};

/**
 * Respaldo en memoria para cuando localStorage no está disponible.
 * NO es la fuente de verdad: ver `getDataSource`.
 */
let enMemoria = leerGuardada() ?? DEFAULT_SOURCE;

/**
 * La preferencia se lee de localStorage EN CADA LLAMADA, no de una variable de
 * módulo. Si el bundler entrega dos instancias de este archivo (pasa con
 * imports por ruta absoluta vs relativa), cada una tendría su propia variable y
 * el interruptor de Ajustes no afectaría a quien hace las peticiones.
 * localStorage es compartido, así que siempre coinciden.
 */
export const getDataSource = () => leerGuardada() ?? enMemoria;

export const setDataSource = (value) => {
  if (!isValid(value) || value === getDataSource()) return getDataSource();
  enMemoria = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sin persistencia, pero el cambio aplica en esta sesión.
  }
  listeners.forEach((listener) => listener(value));
  return value;
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
