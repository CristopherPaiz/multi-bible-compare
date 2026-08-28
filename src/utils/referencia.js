/**
 * Referencias bíblicas: texto libre <-> `{ bookId, capitulo, versiculo }`.
 *
 * Es la pieza que comparten tres cosas que antes no existían:
 *
 *   - las URLs (`/compare/jua/3/16`), que necesitan un identificador de libro
 *     estable y que no cambie al cambiar de idioma;
 *   - la paleta de comandos (Ctrl+K), donde el usuario escribe "jn 3 16";
 *   - las referencias cruzadas, que llegan del backend como números y hay que
 *     pintar como "Juan 3:16".
 *
 * El slug NO es el nombre traducido a propósito. Si la URL llevara "juan", la
 * misma referencia tendría dos direcciones distintas según el idioma de quien
 * la copió, y un enlace compartido entre un usuario en español y otro en inglés
 * dejaría de abrir el mismo pasaje.
 */
import { totalCapitulos, mapaDeLibro } from "../data/canon";

/** Slug canónico por libro (índice = bookId - 1). Es lo que viaja en la URL. */
export const SLUGS = [
  "gen", "exo", "lev", "num", "deu", "jos", "jue", "rut", "1sa", "2sa",
  "1re", "2re", "1cr", "2cr", "esd", "neh", "est", "job", "sal", "pro",
  "ecl", "can", "isa", "jer", "lam", "eze", "dan", "ose", "joe", "amo",
  "abd", "jon", "miq", "nah", "hab", "sof", "hag", "zac", "mal", "mat",
  "mar", "luc", "jua", "hec", "rom", "1co", "2co", "gal", "efe", "fil",
  "col", "1ts", "2ts", "1ti", "2ti", "tit", "flm", "heb", "stg", "1pe",
  "2pe", "1jn", "2jn", "3jn", "jud", "apo",
];

/**
 * Todo lo que puede escribir alguien para nombrar un libro.
 *
 * Van español e inglés juntos en la misma tabla porque el usuario no cambia el
 * idioma de la app para escribir "john", y aceptar ambos no cuesta nada: las
 * cadenas se normalizan y se comparan por igualdad.
 *
 * Los choques reales están resueltos aquí y no por orden de aparición: "fil" es
 * Filipenses y Filemón se queda con "flm"/"filemon"; "jud" es Judas y Jueces se
 * queda con "jue"/"judges".
 */
const ALIAS = [
  ["genesis", "gn", "ge"],
  ["exodo", "exodus", "ex"],
  ["levitico", "leviticus", "lv"],
  ["numeros", "numbers", "nm", "nu"],
  ["deuteronomio", "deuteronomy", "dt"],
  ["josue", "joshua", "js"],
  ["jueces", "judges", "jdg", "jc"],
  ["rut", "ruth", "rt", "ru"],
  ["1samuel", "1s", "1sm"],
  ["2samuel", "2s", "2sm"],
  ["1reyes", "1kings", "1ki", "1r"],
  ["2reyes", "2kings", "2ki", "2r"],
  ["1cronicas", "1chronicles", "1ch", "1cro"],
  ["2cronicas", "2chronicles", "2ch", "2cro"],
  ["esdras", "ezra", "ezr", "esr"],
  ["nehemias", "nehemiah", "ne"],
  ["ester", "esther", "et"],
  ["jb"],
  ["salmos", "salmo", "psalms", "psalm", "psa", "ps", "sl"],
  ["proverbios", "proverbs", "prov", "pr", "prv"],
  ["eclesiastes", "ecclesiastes", "ecc", "ec", "qo"],
  ["cantares", "cantar", "cantico", "songofsolomon", "song", "son", "ct"],
  ["isaias", "isaiah", "is"],
  ["jeremias", "jeremiah", "jr"],
  ["lamentaciones", "lamentations", "lm"],
  ["ezequiel", "ezekiel", "ez", "ezk"],
  ["daniel", "dn", "da"],
  ["oseas", "hosea", "hos", "os"],
  ["joel", "jl"],
  ["amos", "am"],
  ["abdias", "obadiah", "oba", "ab", "ob"],
  ["jonas", "jonah", "jns"],
  ["miqueas", "micah", "mic", "mq"],
  ["nahum", "na"],
  ["habacuc", "habakkuk", "hb"],
  ["sofonias", "zephaniah", "zep", "sf"],
  ["hageo", "haggai", "ag", "hg"],
  ["zacarias", "zechariah", "zec", "zc"],
  ["malaquias", "malachi", "ml"],
  ["mateo", "matthew", "mt", "matt"],
  ["marcos", "mark", "mc", "mk", "mr"],
  ["lucas", "luke", "luk", "lc", "lk"],
  ["juan", "john", "joh", "jn", "jhn"],
  ["hechos", "acts", "act", "hch", "hh"],
  ["romanos", "romans", "rm", "ro"],
  ["1corintios", "1corinthians", "1cor", "1c"],
  ["2corintios", "2corinthians", "2cor", "2c"],
  ["galatas", "galatians", "ga", "gl"],
  ["efesios", "ephesians", "eph", "ef", "ep"],
  ["filipenses", "philippians", "phi", "php", "flp", "fp"],
  ["colosenses", "colossians", "cl"],
  ["1tesalonicenses", "1thessalonians", "1th", "1te", "1ts", "1tes"],
  ["2tesalonicenses", "2thessalonians", "2th", "2te", "2ts", "2tes"],
  ["1timoteo", "1timothy", "1tm", "1t", "1tim"],
  ["2timoteo", "2timothy", "2tm", "2t", "2tim"],
  ["tito", "titus", "tt"],
  ["filemon", "philemon", "phm", "fm"],
  ["hebreos", "hebrews", "he"],
  ["santiago", "james", "jam", "jas", "sant", "st"],
  ["1pedro", "1peter", "1pt", "1p", "1ped"],
  ["2pedro", "2peter", "2pt", "2p", "2ped"],
  ["1juan", "1john", "1jo", "1j"],
  ["2juan", "2john", "2jo", "2j"],
  ["3juan", "3john", "3jo", "3j"],
  ["judas", "jude", "jd", "jds"],
  ["apocalipsis", "revelation", "rev", "ap", "apoc", "rv"],
];

/**
 * Minúsculas, sin tildes y sin nada que no sea letra o dígito.
 *
 * Sin esto "Éxodo", "exodo" y "ÉXODO " serían tres libros distintos, y quien
 * escribe rápido no pone tildes.
 */
export const normalizar = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Mapa alias normalizado -> bookId. Se arma una vez al cargar el módulo. */
const POR_ALIAS = new Map();

SLUGS.forEach((slug, indice) => POR_ALIAS.set(slug, indice + 1));
ALIAS.forEach((lista, indice) => {
  for (const alias of lista) {
    const clave = normalizar(alias);
    // El primero gana: los slugs ya están puestos y no deben ser pisados por un
    // alias ambiguo de otro libro.
    if (clave && !POR_ALIAS.has(clave)) POR_ALIAS.set(clave, indice + 1);
  }
});

/** Slug canónico de un libro. `""` si el id se sale del canon. */
export const slugDeLibro = (bookId) => SLUGS[Number(bookId) - 1] ?? "";

/**
 * bookId a partir de cualquier forma de nombrarlo: slug, nombre completo en
 * español o inglés, abreviatura común, `"book43"` o el número suelto.
 */
export const libroDesdeTexto = (texto) => {
  const crudo = String(texto ?? "").trim();
  if (!crudo) return null;

  const conPrefijo = /^book(\d{1,2})$/i.exec(crudo);
  if (conPrefijo) {
    const id = Number(conPrefijo[1]);
    return id >= 1 && id <= 66 ? id : null;
  }

  const clave = normalizar(crudo);
  if (!clave) return null;

  const directo = POR_ALIAS.get(clave);
  if (directo) return directo;

  // Solo dígitos: el usuario escribió el número de libro.
  if (/^\d{1,2}$/.test(clave)) {
    const id = Number(clave);
    return id >= 1 && id <= 66 ? id : null;
  }

  /*
   * Prefijo, pero solo si es INEQUÍVOCO. "gene" resuelve a Génesis; "co" no
   * resuelve a nada porque encaja con Colosenses y con Corintios, y adivinar
   * ahí mandaría al usuario a un libro que no pidió.
   */
  const candidatos = new Set();
  for (const [alias, id] of POR_ALIAS) {
    if (alias.startsWith(clave)) candidatos.add(id);
    if (candidatos.size > 1) return null;
  }
  return candidatos.size === 1 ? [...candidatos][0] : null;
};

/**
 * Cuántos versículos tiene un capítulo según el canon. 0 si no existe.
 *
 * Se usa para no aceptar "Juan 3:99" ni "Salmos 200".
 */
export const totalVersiculos = (bookId, capitulo) => mapaDeLibro(bookId)?.[String(capitulo)]?.length ?? 0;

/**
 * Interpreta una referencia escrita a mano.
 *
 * Acepta, entre otras: "jn 3 16", "jn3:16", "juan 3.16", "1co 13", "sal 23",
 * "Génesis 1:1-5", "apocalipsis 22 21".
 *
 * @returns {{bookId:number, capitulo:number, versiculo:number|null, versiculoFin:number|null}|null}
 */
export const parseReferencia = (entrada) => {
  const texto = String(entrada ?? "").trim();
  if (!texto) return null;

  /*
   * El nombre puede empezar por un dígito ordinal ("1 Corintios") y a la vez el
   * capítulo es un número, así que no se puede partir por el primer dígito. Se
   * captura: ordinal opcional + letras, y después los números.
   */
  const m = /^\s*(\d\s*)?([\p{L}\s.]+?)\s*(\d{1,3})?\s*(?:[:.,\s]\s*(\d{1,3}))?\s*(?:\s*[-–]\s*(\d{1,3}))?\s*$/u.exec(texto);
  if (!m) return null;

  const [, ordinal, nombre, capituloCrudo, versiculoCrudo, finCrudo] = m;
  const bookId = libroDesdeTexto(`${ordinal ? ordinal.trim() : ""}${nombre}`);
  if (!bookId) return null;

  /*
   * En los libros de un solo capítulo (Abdías, Filemón, 2 y 3 Juan, Judas)
   * nadie escribe "Judas 1:3": se cita "Judas 3". Un único número ahí es el
   * VERSÍCULO, no el capítulo — leerlo como capítulo devolvía `null` para la
   * forma en que realmente se citan esos cinco libros.
   */
  const capituloUnico = totalCapitulos(bookId) === 1;
  const soloUnNumero = Boolean(capituloCrudo) && !versiculoCrudo;

  const capitulo = capituloUnico ? 1 : capituloCrudo ? Number(capituloCrudo) : 1;
  if (capitulo < 1 || capitulo > totalCapitulos(bookId)) return null;

  const maximo = totalVersiculos(bookId, capitulo);
  const versiculo = capituloUnico && soloUnNumero ? Number(capituloCrudo) : versiculoCrudo ? Number(versiculoCrudo) : null;
  if (versiculo !== null && (versiculo < 1 || versiculo > maximo)) return null;

  const fin = finCrudo ? Number(finCrudo) : null;
  const versiculoFin = fin !== null && versiculo !== null && fin > versiculo && fin <= maximo ? fin : null;

  return { bookId, capitulo, versiculo, versiculoFin };
};

/**
 * Texto de una referencia en el idioma activo: "Juan 3:16".
 *
 * @param t función de traducción del `LanguageContext`.
 */
export const formatearReferencia = ({ bookId, capitulo, versiculo, versiculoFin } = {}, t) => {
  if (!bookId) return "";
  const nombre = typeof t === "function" ? t(`book${bookId}`) : `book${bookId}`;
  if (!capitulo) return nombre;
  if (!versiculo) return `${nombre} ${capitulo}`;
  return versiculoFin ? `${nombre} ${capitulo}:${versiculo}-${versiculoFin}` : `${nombre} ${capitulo}:${versiculo}`;
};

/** Ruta canónica de una referencia dentro de la app. */
export const rutaDeReferencia = ({ bookId, capitulo, versiculo } = {}) => {
  const slug = slugDeLibro(bookId);
  if (!slug) return "/compare";
  if (!capitulo) return `/compare/${slug}`;
  return `/compare/${slug}/${capitulo}/${versiculo || 1}`;
};

/**
 * Referencia codificada como entero: `book * 65536 + chapter * 256 + verse`.
 *
 * Es el mismo empaquetado que usa el backend para el rowid del índice FTS5 (sin
 * el campo de versión), así que sirve de clave estable y comparable para las
 * referencias cruzadas y la concordancia sin arrastrar objetos.
 */
export const codificarRef = (bookId, capitulo, versiculo) =>
  Number(bookId) * 65536 + Number(capitulo) * 256 + Number(versiculo);

export const decodificarRef = (valor) => ({
  bookId: Math.floor(valor / 65536),
  capitulo: Math.floor(valor / 256) % 256,
  versiculo: valor % 256,
});
