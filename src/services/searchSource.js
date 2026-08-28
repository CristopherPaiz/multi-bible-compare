/**
 * Búsqueda full-text.
 *
 * A diferencia del texto bíblico, esto NO tiene equivalente en el CDN: buscar
 * una palabra ahí obligaría a descargar las 1,189 capítulos de una versión y
 * escanearlos en el navegador. Es una feature que solo existe con el backend.
 *
 * Por eso `estaDisponible()`: la UI esconde la búsqueda cuando la fuente activa
 * es el CDN, en vez de ofrecer un botón que no puede funcionar.
 */
import { API_URL, getDataSource, SOURCES } from "../config/dataSource";

/** La búsqueda requiere el backend; con el CDN no hay índice que consultar. */
export const estaDisponible = () => getDataSource() === SOURCES.TURSO;

/** Mínimo que exige el backend (SEARCH.MIN_QUERY_LENGTH). */
export const LARGO_MINIMO = 3;

/**
 * @param {object} opciones
 * @param {string} opciones.q          términos a buscar
 * @param {number[]} [opciones.bibles] ids de versión; vacío = todas
 * @param {number} [opciones.book]     filtrar por libro (1-66)
 * @param {number} [opciones.page]
 * @param {number} [opciones.limit]
 * @returns {Promise<{data: Array, pagination: object}>}
 */
export const buscar = async ({ q, bibles, book, page = 1, limit = 25, signal }) => {
  if (!estaDisponible()) throw new Error("La búsqueda necesita la fuente API.");

  const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  if (bibles?.length) params.set("bibles", bibles.join(","));
  if (book) params.set("book", String(book));

  const response = await fetch(`${API_URL}/api/search?${params}`, { signal });

  if (!response.ok) {
    // El backend devuelve 400 con el detalle cuando el término es inválido.
    const detalle = await response.json().catch(() => null);
    throw new Error(detalle?.message ?? `API respondió ${response.status}`);
  }

  return (await response.json()).data;
};

/**
 * Busca dentro del diccionario Strong.
 *
 * El índice local del cliente (`IndexGreek.json`, `IndexHebrew.json`) solo trae
 * código, lema y transliteración: son 900 KB y meter las definiciones lo
 * multiplicaría. Así que buscar "amor" y que salga G26 solo puede resolverlo el
 * backend, que sí tiene el texto.
 *
 * Devuelve lista vacía —no error— cuando la fuente es el CDN o cuando el
 * administrador no ha construido el índice: es una función que no está, no un
 * fallo, y quien llama puede seguir mostrando sus resultados locales.
 */
export const buscarStrongs = async ({ q, idioma, lang, pagina = 1, limite = 25, signal }) => {
  const vacio = { data: [], pagination: { page: 1, limit: limite, total: 0, totalPages: 1 } };

  if (!estaDisponible() || String(q ?? "").trim().length < LARGO_MINIMO) return vacio;

  const params = new URLSearchParams({ q, page: String(pagina), limit: String(limite) });
  if (idioma) params.set("language", idioma);
  // Idioma de la definición en que se busca y que se devuelve.
  if (lang) params.set("lang", lang);

  const response = await fetch(`${API_URL}/api/strongs?${params}`, { signal });
  if (!response.ok) return vacio;

  return (await response.json()).data ?? vacio;
};

/** Catálogo de versiones para el selector. */
export const listarBiblias = async ({ signal } = {}) => {
  const response = await fetch(`${API_URL}/api/bibles`, { signal });
  if (!response.ok) throw new Error(`API respondió ${response.status}`);
  return (await response.json()).data ?? [];
};
