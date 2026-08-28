/**
 * Fachada: los componentes hablan SOLO con este archivo.
 *
 * Elige la fuente activa y, si la primaria falla, reintenta contra el CDN. Ese
 * respaldo es por petición y no cambia la preferencia guardada: el caso típico
 * es el backend dormido (Render free tier tarda 30-60s en despertar), no una
 * caída real.
 */
import { getDataSource, SOURCES, AUTO_FALLBACK } from "../config/dataSource";
import * as github from "./githubSource";
import * as turso from "./tursoSource";

const adapterFor = (source) => (source === SOURCES.GITHUB ? github : turso);

/** Se registra qué fuente resolvió la última petición, útil para depurar. */
let lastResolvedBy = null;
export const getLastResolvedBy = () => lastResolvedBy;

const withFallback = async (method, args) => {
  const source = getDataSource();
  const primary = adapterFor(source);

  try {
    const result = await primary[method](args);
    lastResolvedBy = source;
    return result;
  } catch (error) {
    // Un AbortError es una cancelación nuestra, no un fallo de la fuente
    if (error?.name === "AbortError") throw error;

    // Si el capítulo o versículo simplemente no existe en esta versión (ej. Nuevo Testamento pedido para un libro del AT),
    // no se hace fallback a GitHub porque tampoco existirá allí y evitará llamadas 404 masivas.
    if (error?.isNotFound || error?.status === 404 || error?.message?.includes("no existe en esta versión")) {
      throw error;
    }

    if (!AUTO_FALLBACK || source === SOURCES.GITHUB) throw error;

    console.warn(`[bibleSource] ${method} falló en Turso, reintentando con el CDN:`, error.message);
    const result = await github[method](args);
    lastResolvedBy = SOURCES.GITHUB;
    return result;
  }
};

/**
 * Capítulo completo con la forma que ya consume la UI: `{ "1": "...", "2": "..." }`,
 * con el markup `<sup>` intacto para que el clic abra el diccionario Strong.
 */
export const getChapter = ({ legacyPath, bookId, chapter, signal }) =>
  withFallback("getChapter", { legacyPath, bookId, chapter, signal });

/** Arreglo de entradas Strong; la UI busca dentro por `id`. */
export const getStrongBatch = ({ code, lang, signal }) => withFallback("getStrongBatch", { code, lang, signal });

/**
 * Precalienta la fuente activa. Sin efecto en el CDN (no hay servidor que
 * despertar); en Turso carga el catálogo y despierta el backend.
 */
export const preheat = () => {
  if (getDataSource() === SOURCES.TURSO) turso.preheat();
};

/** URL directa del mp3. No depende de la fuente. */
export const getStrongAudioUrl = (code) => github.getStrongAudioUrl(code);
