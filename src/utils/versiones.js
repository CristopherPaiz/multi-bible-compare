/**
 * Código corto de cada versión, para que quepa en una URL.
 *
 * La UI identifica las versiones por el nombre de la carpeta original
 * ("075. Español - Reina Valera [RV60] (1960)"). Eso vale dentro de la app,
 * pero en una dirección compartible es un desastre: 45 caracteres escapados por
 * versión, y con cinco versiones abiertas la URL deja de ser copiable.
 *
 * Ese nombre ya empieza por un número que es único en todo el catálogo (162
 * versiones, 162 prefijos distintos), así que el código corto no hay que
 * inventarlo: ya estaba ahí. `?v=75,9,34` en vez de tres rutas completas.
 */
import { BIBLIAS } from "../data/biblias";

/** "001. Español - Biblia al día (1989)" -> "Español" */
export const idiomaDeVersion = (ruta) => String(ruta ?? "").split(". ")[1]?.split(" -")[0]?.trim() ?? "";

/** Nombre de idioma del catálogo -> código ISO, para la voz y la traducción. */
export const ISO_POR_IDIOMA = {
  Español: "es",
  English: "en",
  Esperanto: "eo",
  Greek: "el",
  Hebrew: "he",
  Latin: "la",
  Portugues: "pt",
  Frances: "fr",
  Aleman: "de",
  Italiano: "it",
};

export const isoDeVersion = (ruta) => ISO_POR_IDIOMA[idiomaDeVersion(ruta)] ?? "no";

/**
 * Idiomas que son el TEXTO ORIGINAL, no una traducción.
 *
 * Importa para elegir por defecto: una interlineal griega o hebrea es lo que
 * quiere ver quien estudia el original, pero es lo peor que se puede enseñar
 * como previsualización de una referencia cruzada o como texto a leer en voz
 * alta. Nadie decide si le interesa Romanos 5:8 leyéndolo en griego.
 */
const ORIGINALES = new Set(["Greek", "Hebrew", "Arameo", "Aramaic"]);

/**
 * Cuál de las versiones abiertas usar cuando hace falta UNA sola.
 *
 * Lo pide el panel de referencias (para previsualizar el texto del destino), el
 * lector por voz y la exportación. Antes los tres cogían `bibliasSeleccionadas[0]`,
 * que es el orden del CATÁLOGO y no tiene nada que ver con cuál le importa al
 * usuario: con una griega y una española abiertas, mandaba la griega.
 *
 * El orden de preferencia es:
 *   1. la que el usuario haya fijado a mano, si sigue abierta;
 *   2. la primera en el idioma de la interfaz;
 *   3. la primera que no sea texto original;
 *   4. la primera, sea lo que sea.
 *
 * @param {string[]} abiertas    versiones seleccionadas, en su orden
 * @param {string} [preferida]   la fijada a mano
 * @param {string} [idiomaUI]    "es" | "en"
 */
export const versionDeTrabajo = (abiertas, preferida, idiomaUI = "es") => {
  const lista = Array.isArray(abiertas) ? abiertas : [];
  if (lista.length === 0) return null;

  if (preferida && lista.includes(preferida)) return preferida;

  const enIdiomaUI = lista.find((ruta) => isoDeVersion(ruta) === idiomaUI);
  if (enIdiomaUI) return enIdiomaUI;

  const traduccion = lista.find((ruta) => !ORIGINALES.has(idiomaDeVersion(ruta)));
  if (traduccion) return traduccion;

  return lista[0];
};

const porCodigo = new Map();
const porRuta = new Map();

for (const versiones of Object.values(BIBLIAS)) {
  for (const meta of Object.values(versiones)) {
    const codigo = Number(String(meta.ruta).match(/^(\d+)\./)?.[1]);
    if (!Number.isFinite(codigo)) continue;
    porCodigo.set(codigo, meta.ruta);
    porRuta.set(meta.ruta, codigo);
  }
}

/** "075. Español - ..." -> 75 */
export const codigoDeVersion = (ruta) => porRuta.get(ruta) ?? null;

/** 75 -> "075. Español - ..." */
export const versionDesdeCodigo = (codigo) => porCodigo.get(Number(codigo)) ?? null;

/** Lista de rutas -> "75,9,34". Las que no estén en el catálogo se omiten. */
export const codificarVersiones = (rutas) =>
  (Array.isArray(rutas) ? rutas : [])
    .map(codigoDeVersion)
    .filter((codigo) => codigo !== null)
    .join(",");

/** "75,9,34" -> lista de rutas, en el mismo orden y sin repetidos. */
export const decodificarVersiones = (texto) => {
  const vistos = new Set();
  const rutas = [];
  for (const parte of String(texto ?? "").split(",")) {
    const ruta = versionDesdeCodigo(parte.trim());
    if (ruta && !vistos.has(ruta)) {
      vistos.add(ruta);
      rutas.push(ruta);
    }
  }
  return rutas;
};
