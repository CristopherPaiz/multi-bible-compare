/**
 * Fuente TURSO — el backend nuevo.
 *
 * Lo importante de este archivo es el AGRUPADOR de peticiones.
 *
 * La UI monta un `<VerseWindow>` por versión y cada uno pide su capítulo por
 * separado. Contra el CDN eso son 20 peticiones para 20 biblias. Aquí, en vez
 * de reestructurar los componentes, se recogen todas las llamadas que ocurren
 * en el mismo tick y se resuelven con UNA sola consulta a `/api/chapters`.
 *
 * Resultado: el beneficio del backend sin tocar la forma de los componentes, y
 * el rollback al CDN sigue siendo un cambio de una línea.
 */
import { API_URL } from "../config/dataSource";

/** El backend rechaza más de 20 versiones por consulta. */
const MAX_PER_REQUEST = 20;

// ---------------------------------------------------------------------------
// Catálogo: puente entre el nombre de carpeta que usa la UI y el id de Turso
// ---------------------------------------------------------------------------

let catalogPromise = null;

const loadCatalog = () => {
  if (catalogPromise) return catalogPromise;

  catalogPromise = fetch(`${API_URL}/api/bibles`)
    .then((response) => {
      if (!response.ok) throw new Error(`API respondió ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const byLegacyPath = new Map();
      const byId = new Map();
      for (const bible of payload.data ?? []) {
        if (bible.legacyPath) byLegacyPath.set(bible.legacyPath, bible.id);
        byId.set(bible.id, bible);
      }
      return { byLegacyPath, byId };
    })
    .catch((error) => {
      // Sin catálogo no se puede traducir ruta -> id. Se limpia la memo para
      // que el siguiente intento reintente en vez de quedar envenenado.
      catalogPromise = null;
      throw error;
    });

  return catalogPromise;
};

export const resetCatalog = () => {
  catalogPromise = null;
};

/**
 * Dispara la carga del catálogo al arrancar la app.
 *
 * Cumple dos funciones: deja el mapa ruta→id listo antes del primer capítulo, y
 * despierta el backend. En el plan free de Render el proceso se duerme y la
 * primera petición tarda 30-60s; hacerla mientras el usuario todavía está
 * eligiendo versiones evita que ese costo caiga sobre la lectura.
 */
export const preheat = () => loadCatalog().catch(() => {});

/**
 * Mapas ruta↔id. Los necesita la sincronización de usuario: en localStorage los
 * favoritos son nombres de carpeta y el backend los guarda como ids.
 */
export const getCatalogMaps = () => loadCatalog();

// ---------------------------------------------------------------------------
// Agrupador
// ---------------------------------------------------------------------------

/** Peticiones en espera, agrupadas por capítulo: "43:3" -> [{ bibleId, resolve, reject }] */
const pending = new Map();
let flushScheduled = false;

const flush = async () => {
  flushScheduled = false;
  const batches = [...pending.entries()];
  pending.clear();

  await Promise.all(
    batches.map(async ([key, waiters]) => {
      const [bookId, chapter] = key.split(":").map(Number);

      // Varios `<VerseWindow>` pueden pedir la misma versión; se consulta una vez.
      const uniqueIds = [...new Set(waiters.map((waiter) => waiter.bibleId))];

      for (let start = 0; start < uniqueIds.length; start += MAX_PER_REQUEST) {
        const slice = uniqueIds.slice(start, start + MAX_PER_REQUEST);
        const group = waiters.filter((waiter) => slice.includes(waiter.bibleId));

        try {
          const url = `${API_URL}/api/chapters?bibles=${slice.join(",")}&book=${bookId}&chapter=${chapter}`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`API respondió ${response.status}`);

          const payload = await response.json();
          const versesById = new Map();
          for (const item of payload.data?.chapters ?? []) versesById.set(item.bibleId, item.verses);

          for (const waiter of group) {
            const verses = versesById.get(waiter.bibleId);
            if (verses) waiter.resolve(verses);
            else waiter.reject(new Error("El capítulo no existe en esta versión."));
          }
        } catch (error) {
          for (const waiter of group) waiter.reject(error);
        }
      }
    })
  );
};

const schedule = () => {
  if (flushScheduled) return;
  flushScheduled = true;
  // React ejecuta todos los efectos del commit en el mismo tick, así que un
  // timeout de 0 alcanza a juntar las N versiones montadas a la vez.
  setTimeout(flush, 0);
};

// ---------------------------------------------------------------------------
// API pública (misma firma que githubSource)
// ---------------------------------------------------------------------------

/** Devuelve `{ "1": "...", "2": "..." }`, idéntico a lo que servía el CDN. */
export const getChapter = async ({ legacyPath, bookId, chapter }) => {
  const { byLegacyPath } = await loadCatalog();
  const bibleId = byLegacyPath.get(legacyPath);
  if (!bibleId) throw new Error(`Versión no encontrada en el catálogo: ${legacyPath}`);

  const key = `${bookId}:${chapter}`;
  if (!pending.has(key)) pending.set(key, []);

  const result = new Promise((resolve, reject) => {
    pending.get(key).push({ bibleId, resolve, reject });
  });

  schedule();
  return result;
};

/**
 * La UI espera un ARREGLO y busca dentro con `.find(obj => obj.id === strong)`,
 * porque el CDN servía lotes de 150 entradas. Aquí solo hace falta una, pero se
 * devuelve envuelta en arreglo para no tocar `StrongSingle`.
 */
export const getStrongBatch = async ({ code, signal }) => {
  const response = await fetch(`${API_URL}/api/strongs/${code}`, { signal });
  if (!response.ok) throw new Error(`API respondió ${response.status}`);

  const entry = (await response.json()).data;
  if (!entry) return [];

  return [
    {
      id: entry.code,
      ti: entry.title,
      le: entry.lemma,
      pl: entry.transliteration,
      ps: entry.pronunciation,
      df: entry.definition,
      audioUrl: entry.audioUrl,
    },
  ];
};

export { getStrongAudioUrl } from "./githubSource";
