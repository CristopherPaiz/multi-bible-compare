/**
 * Fuente GITHUB — el comportamiento original, intacto.
 *
 * Lee los JSON directo de raw.githubusercontent. Un fetch por versión: si el
 * usuario compara 20 biblias, son 20 peticiones. Se conserva como respaldo para
 * poder hacer rollback sin redeploy.
 */
import { CDN_URL, API_URL } from "../config/dataSource";

const LAST_OLD_TESTAMENT_BOOK = 39;

const testamentOf = (bookId) => (Number(bookId) <= LAST_OLD_TESTAMENT_BOOK ? "Old" : "New");

/**
 * Devuelve el capítulo con la MISMA forma que espera la UI: `{ "1": "...", "2": "..." }`,
 * markup `<sup>` incluido.
 */
export const getChapter = async ({ legacyPath, bookId, chapter, signal }) => {
  const url = `${CDN_URL}/bibles/${legacyPath}/${testamentOf(bookId)}/book${bookId}/chapter${chapter}.json`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`CDN respondió ${response.status}`);
  return response.json();
};

/**
 * Los Strong viven en archivos por lotes de 150 entradas. La UI descarga el lote
 * y busca la entrada por id, así que aquí se replica ese cálculo de rango.
 *
 * El griego tiene un salto irregular alrededor de G2401-G2650, por eso el `if`
 * en vez de una división limpia.
 */
const greekRangeFor = (number) => {
  if (number <= 2400) return Math.floor((number - 1) / 150) * 150 + 1;
  if (number <= 2650) return 2401;
  return Math.floor((number - 2651) / 150) * 150 + 2651;
};

const hebrewRangeFor = (number) => Math.floor(number / 150) * 150 + 1;

export const getStrongBatch = async ({ code, signal }) => {
  const isHebrew = code.startsWith("H");
  const number = parseInt(code.slice(1), 10);
  if (!Number.isFinite(number)) throw new Error(`Código Strong inválido: ${code}`);

  const range = isHebrew ? hebrewRangeFor(number) : greekRangeFor(number);
  const folder = isHebrew ? "Hebreo" : "Griego";
  const file = String(range).padStart(4, "0");

  const response = await fetch(`${CDN_URL}/strongs/${folder}/${file}.json`, { signal });
  if (!response.ok) throw new Error(`CDN respondió ${response.status}`);
  return response.json();
};

/** El audio de Strong se sirve a través del endpoint de la API nueva. */
export const getStrongAudioUrl = (code) => {
  return `${API_URL}/api/strongs/${code}/audio`;
};
