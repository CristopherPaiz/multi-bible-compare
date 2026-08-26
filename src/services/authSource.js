/**
 * Sesión y sincronización de usuario.
 *
 * Solo existe con el backend: el CDN no puede guardar nada. Sin sesión, la app
 * sigue funcionando exactamente igual con localStorage — la cuenta es opcional
 * y solo agrega que favoritos e historial sobrevivan al cambio de dispositivo.
 *
 * El token viaja en cookie httpOnly (el backend la emite), así que aquí se usa
 * `credentials: "include"` y NO se guarda el token en localStorage: desde JS no
 * se puede leer una cookie httpOnly, que es justo lo que la protege de XSS.
 */
import { API_URL, getDataSource, SOURCES } from "../config/dataSource";

export const sesionDisponible = () => getDataSource() === SOURCES.TURSO;

const pedir = async (ruta, opciones = {}) => {
  const response = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opciones.headers ?? {}) },
  });

  const cuerpo = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(cuerpo?.message ?? `API respondió ${response.status}`);
    error.status = response.status;
    error.errores = cuerpo?.errors;
    throw error;
  }
  return cuerpo?.data ?? null;
};

export const registrar = ({ username, email, password }) =>
  pedir("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(email ? { username, email, password } : { username, password }),
  });

export const iniciarSesion = ({ username, password }) =>
  pedir("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });

export const cerrarSesion = () => pedir("/api/auth/logout", { method: "POST" });

/** `null` si no hay sesión: un 401 aquí es lo normal, no un error a reportar. */
export const usuarioActual = async () => {
  try {
    return await pedir("/api/auth/me");
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
};

// --- Favoritos e historial -------------------------------------------------

export const leerFavoritos = () => pedir("/api/user/favorites");

export const guardarFavoritos = (bibleIds) =>
  pedir("/api/user/favorites", { method: "PUT", body: JSON.stringify({ bibleIds }) });

export const leerHistorial = () => pedir("/api/user/history");

export const agregarHistorial = ({ bibleIds, bookId, chapter, verse }) =>
  pedir("/api/user/history", { method: "POST", body: JSON.stringify({ bibleIds, bookId, chapter, verse }) });

export const borrarHistorial = () => pedir("/api/user/history", { method: "DELETE" });
