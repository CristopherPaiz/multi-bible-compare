/**
 * Aparato de estudio: referencias cruzadas y concordancia Strong.
 *
 * Igual que la búsqueda, esto solo existe con el backend. El CDN sirve JSON de
 * capítulos sueltos: no hay forma de preguntarle "en qué otros versículos sale
 * G26" sin descargarse la Biblia entera y recorrerla en el navegador.
 *
 * Los dos endpoints devuelven lista vacía si el administrador no ha corrido los
 * comandos que llenan esas tablas (`migrate.mjs crossrefs` y
 * `migrate.mjs strongs-index`). La UI trata "vacío" y "no disponible" igual:
 * esconde el panel. Así la app no cambia de comportamiento según cómo esté
 * poblada la base.
 */
import { API_URL, getDataSource, SOURCES } from "../config/dataSource";

export const estaDisponible = () => getDataSource() === SOURCES.TURSO;

const pedir = async (ruta, { signal } = {}) => {
  const response = await fetch(`${API_URL}${ruta}`, { signal });
  if (!response.ok) throw new Error(`API respondió ${response.status}`);
  return (await response.json()).data;
};

/**
 * Referencias cruzadas de un versículo, de más a menos votadas.
 *
 * @returns {Promise<Array<{bookId:number, chapter:number, verse:number, end:object|null, votes:number}>>}
 */
export const referenciasCruzadas = async ({ bookId, capitulo, versiculo, limite = 25, signal }) => {
  if (!estaDisponible()) return [];
  const params = new URLSearchParams({
    book: String(bookId),
    chapter: String(capitulo),
    verse: String(versiculo),
    limit: String(limite),
  });
  return (await pedir(`/api/crossrefs?${params}`, { signal })) ?? [];
};

/**
 * Versículos donde aparece un código Strong.
 *
 * `bibleId` es opcional. Sin él la respuesta son solo referencias y llega al
 * instante; con él el backend adjunta el texto de cada versículo, que es lo que
 * hace la lista útil de leer pero obliga a descomprimir un capítulo por
 * resultado.
 */
export const aparicionesStrong = async ({ code, bibleId, pagina = 1, limite = 25, signal }) => {
  if (!estaDisponible()) return { data: [], pagination: { page: 1, limit: limite, total: 0, totalPages: 1 } };

  const params = new URLSearchParams({ page: String(pagina), limit: String(limite) });
  if (bibleId) params.set("bible", String(bibleId));

  return await pedir(`/api/strongs/${code}/occurrences?${params}`, { signal });
};
