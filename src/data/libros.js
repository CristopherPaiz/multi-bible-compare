/**
 * Catálogo mínimo de los 66 libros: id, slug de URL y nombre en cada idioma.
 *
 * Existe porque el nombre del libro hace falta en tres sitios que no comparten
 * runtime: los componentes (que ya tienen `t()`), el generador del sitemap y el
 * prerenderizador. Los dos últimos corren en Node, donde importar un .json
 * necesita `with { type: "json" }` y donde `LanguageContext` no existe.
 *
 * Se genera a partir de `locales/*.json` + `SLUGS` de `utils/referencia`. Si se
 * añade un idioma a la app, se añade una columna aquí.
 */
export const LIBROS = [
  { id: 1, slug: "gen", es: "Génesis", en: "Genesis" },
  { id: 2, slug: "exo", es: "Éxodo", en: "Exodus" },
  { id: 3, slug: "lev", es: "Levítico", en: "Leviticus" },
  { id: 4, slug: "num", es: "Números", en: "Numbers" },
  { id: 5, slug: "deu", es: "Deuteronomio", en: "Deuteronomy" },
  { id: 6, slug: "jos", es: "Josué", en: "Joshua" },
  { id: 7, slug: "jue", es: "Jueces", en: "Judges" },
  { id: 8, slug: "rut", es: "Rut", en: "Ruth" },
  { id: 9, slug: "1sa", es: "1 Samuel", en: "1 Samuel" },
  { id: 10, slug: "2sa", es: "2 Samuel", en: "2 Samuel" },
  { id: 11, slug: "1re", es: "1 Reyes", en: "1 Kings" },
  { id: 12, slug: "2re", es: "2 Reyes", en: "2 Kings" },
  { id: 13, slug: "1cr", es: "1 Crónicas", en: "1 Chronicles" },
  { id: 14, slug: "2cr", es: "2 Crónicas", en: "2 Chronicles" },
  { id: 15, slug: "esd", es: "Esdras", en: "Ezra" },
  { id: 16, slug: "neh", es: "Nehemías", en: "Nehemiah" },
  { id: 17, slug: "est", es: "Ester", en: "Esther" },
  { id: 18, slug: "job", es: "Job", en: "Job" },
  { id: 19, slug: "sal", es: "Salmos", en: "Psalms" },
  { id: 20, slug: "pro", es: "Proverbios", en: "Proverbs" },
  { id: 21, slug: "ecl", es: "Eclesiastés", en: "Ecclesiastes" },
  { id: 22, slug: "can", es: "Cantares", en: "Song of Solomon" },
  { id: 23, slug: "isa", es: "Isaías", en: "Isaiah" },
  { id: 24, slug: "jer", es: "Jeremías", en: "Jeremiah" },
  { id: 25, slug: "lam", es: "Lamentaciones", en: "Lamentations" },
  { id: 26, slug: "eze", es: "Ezequiel", en: "Ezekiel" },
  { id: 27, slug: "dan", es: "Daniel", en: "Daniel" },
  { id: 28, slug: "ose", es: "Oseas", en: "Hosea" },
  { id: 29, slug: "joe", es: "Joel", en: "Joel" },
  { id: 30, slug: "amo", es: "Amós", en: "Amos" },
  { id: 31, slug: "abd", es: "Abdías", en: "Obadiah" },
  { id: 32, slug: "jon", es: "Jonás", en: "Jonah" },
  { id: 33, slug: "miq", es: "Miqueas", en: "Micah" },
  { id: 34, slug: "nah", es: "Nahúm", en: "Nahum" },
  { id: 35, slug: "hab", es: "Habacuc", en: "Habakkuk" },
  { id: 36, slug: "sof", es: "Sofonías", en: "Zephaniah" },
  { id: 37, slug: "hag", es: "Hageo", en: "Haggai" },
  { id: 38, slug: "zac", es: "Zacarías", en: "Zechariah" },
  { id: 39, slug: "mal", es: "Malaquías", en: "Malachi" },
  { id: 40, slug: "mat", es: "Mateo", en: "Matthew" },
  { id: 41, slug: "mar", es: "Marcos", en: "Mark" },
  { id: 42, slug: "luc", es: "Lucas", en: "Luke" },
  { id: 43, slug: "jua", es: "Juan", en: "John" },
  { id: 44, slug: "hec", es: "Hechos", en: "Acts" },
  { id: 45, slug: "rom", es: "Romanos", en: "Romans" },
  { id: 46, slug: "1co", es: "1 Corintios", en: "1 Corinthians" },
  { id: 47, slug: "2co", es: "2 Corintios", en: "2 Corinthians" },
  { id: 48, slug: "gal", es: "Gálatas", en: "Galatians" },
  { id: 49, slug: "efe", es: "Efesios", en: "Ephesians" },
  { id: 50, slug: "fil", es: "Filipenses", en: "Philippians" },
  { id: 51, slug: "col", es: "Colosenses", en: "Colossians" },
  { id: 52, slug: "1ts", es: "1 Tesalonicenses", en: "1 Thessalonians" },
  { id: 53, slug: "2ts", es: "2 Tesalonicenses", en: "2 Thessalonians" },
  { id: 54, slug: "1ti", es: "1 Timoteo", en: "1 Timothy" },
  { id: 55, slug: "2ti", es: "2 Timoteo", en: "2 Timothy" },
  { id: 56, slug: "tit", es: "Tito", en: "Titus" },
  { id: 57, slug: "flm", es: "Filemón", en: "Philemon" },
  { id: 58, slug: "heb", es: "Hebreos", en: "Hebrews" },
  { id: 59, slug: "stg", es: "Santiago", en: "James" },
  { id: 60, slug: "1pe", es: "1 Pedro", en: "1 Peter" },
  { id: 61, slug: "2pe", es: "2 Pedro", en: "2 Peter" },
  { id: 62, slug: "1jn", es: "1 Juan", en: "1 John" },
  { id: 63, slug: "2jn", es: "2 Juan", en: "2 John" },
  { id: 64, slug: "3jn", es: "3 Juan", en: "3 John" },
  { id: 65, slug: "jud", es: "Judas", en: "Jude" },
  { id: 66, slug: "apo", es: "Apocalipsis", en: "Revelation" },
];

/** Índice por slug para no recorrer el array en cada búsqueda. */
const PORSLUG = new Map(LIBROS.map((l) => [l.slug, l]));

export const libroPorSlug = (slug) => PORSLUG.get(String(slug).toLowerCase()) ?? null;

export const libroPorId = (id) => LIBROS[Number(id) - 1] ?? null;

/** Nombre del libro en el idioma pedido, con el español como respaldo. */
export const nombreDeLibro = (id, idioma = "es") => {
  const libro = libroPorId(id);
  if (!libro) return "";
  return libro[idioma] ?? libro.es;
};
