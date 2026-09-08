/**
 * El `<head>` de cada ruta, calculado en un solo sitio.
 *
 * Biblian es una SPA: sin esto, las 1200 direcciones que puede tener la app
 * comparten el mismo título y la misma descripción, que es como pedirle a un
 * buscador que las trate como una sola página. Aquí cada ruta produce su
 * título, su descripción, su canónica y su JSON-LD.
 *
 * El archivo es JavaScript puro —sin React, sin `import.meta` salvo lo que ya
 * absorbe `config/sitio`— porque lo usan dos consumidores que no comparten
 * runtime:
 *
 *   - `components/Seo.jsx`, que lo aplica al DOM cuando el usuario navega;
 *   - `scripts/prerender.mjs`, que lo escribe en el HTML estático del build.
 *
 * Los dos tienen que producir exactamente el mismo `<head>`: si el HTML servido
 * dijera una cosa y el DOM renderizado otra, el buscador se queda con la
 * segunda y el trabajo del prerenderizado se pierde.
 */
import { SITE_NAME, SITE_URL, TOTAL_VERSIONES, urlAbsoluta } from "../config/sitio.js";
import { LIBROS, libroPorSlug, nombreDeLibro } from "../data/libros.js";
import { totalCapitulos } from "../data/canon.js";

/** Longitud a la que Google recorta la descripción en el resultado. */
const MAX_DESCRIPCION = 158;

/**
 * Recorta por palabra, no por carácter: cortar "Reina Valer…" se ve peor en el
 * resultado de búsqueda que perder la última palabra entera.
 */
export const recortar = (texto, maximo = MAX_DESCRIPCION) => {
  const limpio = String(texto).replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const cortado = limpio.slice(0, maximo - 1);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  return `${(ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).replace(/[,;:.\s]+$/, "")}…`;
};

/** Quita el markup `<sup>NNNN</sup>` de los números Strong y las etiquetas sueltas. */
export const textoLimpio = (html) =>
  String(html ?? "")
    .replace(/<sup>[\s\S]*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const TEXTOS = {
  es: {
    marca: SITE_NAME,
    lema: "Compara versiones de la Biblia en línea",
    home: {
      title: `Biblia en línea — Compara ${TOTAL_VERSIONES}+ versiones lado a lado`,
      description: `Lee la Biblia gratis y compara ${TOTAL_VERSIONES}+ versiones a la vez: Reina Valera 1960, NVI, LBLA, Textual, interlineal griego y hebreo, con diccionario Strong. Sin registro y sin anuncios.`,
      h1: "Biblia en línea: compara versiones lado a lado",
    },
    compare: {
      title: `Comparar versiones de la Biblia — ${TOTAL_VERSIONES}+ traducciones lado a lado`,
      description: `Elige dos o más versiones de la Biblia y compáralas versículo por versículo: Reina Valera, NVI, LBLA, Peshitta, Septuaginta e interlineales griego y hebreo con números Strong.`,
      h1: "Comparar versiones de la Biblia",
    },
    search: {
      title: "Buscar en la Biblia — palabras, frases y versículos",
      description: "Busca cualquier palabra o frase en la Biblia y salta al versículo exacto. Resultados con referencia, contexto y comparación entre versiones.",
      h1: "Buscar en la Biblia",
    },
    about: {
      title: "Sobre Biblian — qué es y de dónde salen los textos",
      description: `Biblian es una app libre y gratuita para comparar ${TOTAL_VERSIONES}+ versiones de la Biblia con diccionario Strong. Aquí se explica su origen, sus fuentes y quién colabora.`,
      h1: "Sobre Biblian",
    },
    settings: { title: "Ajustes", description: "Tema, idioma, tamaño de letra, voz de lectura y fuente de datos de Biblian.", h1: "Ajustes" },
    history: { title: "Historial de lectura", description: "Los pasajes que has leído en Biblian, ordenados por fecha, para retomar donde lo dejaste.", h1: "Historial de lectura" },
    notes: { title: "Notas y subrayados de la Biblia", description: "Tus notas, subrayados y versículos marcados, sincronizados entre dispositivos.", h1: "Notas y subrayados" },
    tresD: {
      title: "Biblia 3D — lector de libro con páginas que pasan",
      description: "Lee la Biblia como un libro físico: páginas que pasan, tipografía serif y paginación adaptada a tu pantalla.",
      h1: "Biblia en 3D",
    },
    atlas: {
      title: "Atlas bíblico — mapa de lugares y cronología",
      description: "Mapa interactivo de los lugares de la Biblia con su cronología: dónde ocurrió cada pasaje y en qué momento de la historia.",
      h1: "Atlas bíblico",
    },
    account: { title: "Cuenta", description: "Inicia sesión para sincronizar tus notas, subrayados e historial entre dispositivos.", h1: "Cuenta" },
    notFound: { title: "Página no encontrada", description: "La dirección no existe en Biblian.", h1: "Página no encontrada" },
    antiguo: "Antiguo Testamento",
    nuevo: "Nuevo Testamento",
  },
  en: {
    marca: SITE_NAME,
    lema: "Compare Bible versions online",
    home: {
      title: `Bible online — Compare ${TOTAL_VERSIONES}+ versions side by side`,
      description: `Read the Bible free and compare ${TOTAL_VERSIONES}+ versions at once: KJV, ESV, NIV, ASV, Greek and Hebrew interlinear, with Strong's dictionary. No sign-up, no ads.`,
      h1: "Bible online: compare versions side by side",
    },
    compare: {
      title: `Compare Bible versions — ${TOTAL_VERSIONES}+ translations side by side`,
      description: `Pick two or more Bible versions and compare them verse by verse: KJV, ESV, NIV, ASV, Peshitta, Septuagint and Greek/Hebrew interlinears with Strong's numbers.`,
      h1: "Compare Bible versions",
    },
    search: {
      title: "Search the Bible — words, phrases and verses",
      description: "Search any word or phrase in the Bible and jump straight to the verse. Results include reference, context and cross-version comparison.",
      h1: "Search the Bible",
    },
    about: {
      title: "About Biblian — what it is and where the texts come from",
      description: `Biblian is a free, open app to compare ${TOTAL_VERSIONES}+ Bible versions with Strong's dictionary. Here is its origin, its sources and its contributors.`,
      h1: "About Biblian",
    },
    settings: { title: "Settings", description: "Theme, language, font size, reading voice and data source for Biblian.", h1: "Settings" },
    history: { title: "Reading history", description: "The passages you have read in Biblian, sorted by date, so you can pick up where you left off.", h1: "Reading history" },
    notes: { title: "Bible notes and highlights", description: "Your notes, highlights and bookmarked verses, synced across devices.", h1: "Notes and highlights" },
    tresD: {
      title: "3D Bible — book reader with page-turn",
      description: "Read the Bible like a physical book: turning pages, serif typography and pagination fitted to your screen.",
      h1: "3D Bible",
    },
    atlas: {
      title: "Bible atlas — places map and timeline",
      description: "Interactive map of biblical places with their timeline: where each passage happened and when in history.",
      h1: "Bible atlas",
    },
    account: { title: "Account", description: "Sign in to sync your notes, highlights and history across devices.", h1: "Account" },
    notFound: { title: "Page not found", description: "That address does not exist on Biblian.", h1: "Page not found" },
    antiguo: "Old Testament",
    nuevo: "New Testament",
  },
};

const dic = (idioma) => TEXTOS[idioma] ?? TEXTOS.es;

/*
 * Las listas de palabras clave se componen de trozos y algunos coinciden: en
 * una pagina de capitulo, la referencia ("juan 3") y el patron
 * "<libro> <numero>" son la misma cadena. Repetirla no aporta y se lee como
 * relleno.
 */
const sinRepetir = (claves) => [...new Set(claves.map((clave) => clave.trim()).filter(Boolean))].join(", ");

/** El título de pestaña siempre acaba en la marca, salvo en la portada. */
const conMarca = (titulo) => (titulo.includes(SITE_NAME) ? titulo : `${titulo} | ${SITE_NAME}`);

const PALABRAS_CLAVE = {
  es: [
    "biblia",
    "biblia en línea",
    "biblia online gratis",
    "comparar biblias",
    "versiones de la biblia",
    "reina valera 1960",
    "biblia interlineal",
    "diccionario strong",
    "concordancia strong",
    "biblia griega",
    "biblia hebrea",
    "septuaginta",
    "leer la biblia",
  ],
  en: [
    "bible",
    "bible online",
    "free online bible",
    "compare bible versions",
    "bible translations",
    "interlinear bible",
    "strongs dictionary",
    "strongs concordance",
    "greek bible",
    "hebrew bible",
    "septuagint",
    "read the bible",
  ],
};

/* -------------------------------------------------------------------------- */
/*  JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

const ID_SITIO = `${SITE_URL}/#website`;
const ID_ORG = `${SITE_URL}/#organization`;
const ID_APP = `${SITE_URL}/#app`;

/**
 * El grafo que va en TODAS las páginas: quién publica el sitio, qué es y cómo
 * se busca dentro. Los `@id` permiten que las páginas concretas lo referencien
 * en vez de repetirlo entero.
 */
export const grafoBase = (idioma = "es") => [
  {
    "@type": "Organization",
    "@id": ID_ORG,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/bibleIcon.svg` },
    sameAs: ["https://github.com/CristopherPaiz/multi-bible-compare"],
  },
  {
    "@type": "WebSite",
    "@id": ID_SITIO,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    alternateName: dic(idioma).lema,
    description: dic(idioma).home.description,
    inLanguage: ["es", "en"],
    publisher: { "@id": ID_ORG },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@type": "WebApplication",
    "@id": ID_APP,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: "ReferenceApplication",
    applicationSubCategory: idioma === "en" ? "Bible study" : "Estudio bíblico",
    operatingSystem: "Any (PWA)",
    browserRequirements: "Requires JavaScript",
    inLanguage: ["es", "en"],
    isAccessibleForFree: true,
    publisher: { "@id": ID_ORG },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    featureList:
      idioma === "en"
        ? [`Compare ${TOTAL_VERSIONES}+ Bible versions side by side`, "Strong's Hebrew and Greek dictionary", "Full-text search", "Highlights and notes with sync", "Offline reading (PWA)", "Text to speech", "Bible atlas and timeline"]
        : [
            `Comparar ${TOTAL_VERSIONES}+ versiones de la Biblia lado a lado`,
            "Diccionario Strong hebreo y griego",
            "Búsqueda de texto completo",
            "Subrayados y notas con sincronización",
            "Lectura sin conexión (PWA)",
            "Lectura en voz alta",
            "Atlas bíblico y cronología",
          ],
  },
];

/** Migas de pan: le dan a Google la jerarquía Inicio › Libro › Capítulo. */
const migas = (elementos) => ({
  "@type": "BreadcrumbList",
  itemListElement: elementos.map((elemento, indice) => ({
    "@type": "ListItem",
    position: indice + 1,
    name: elemento.nombre,
    item: urlAbsoluta(elemento.ruta),
  })),
});

/* -------------------------------------------------------------------------- */
/*  Metadatos por ruta                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Normaliza lo que llega de `useParams` o del prerenderizador.
 * Devuelve `null` si la referencia no existe en el canon.
 */
export const referenciaDeRuta = ({ libro, capitulo, versiculo } = {}) => {
  const datos = libro ? libroPorSlug(libro) : null;
  if (!datos) return null;

  const capitulos = totalCapitulos(datos.id);
  const cap = capitulo === undefined || capitulo === null || capitulo === "" ? null : Number(capitulo);
  if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > capitulos)) return { libro: datos, capitulo: null, versiculo: null };

  const ver = versiculo === undefined || versiculo === null || versiculo === "" ? null : Number(versiculo);
  return { libro: datos, capitulo: cap, versiculo: Number.isInteger(ver) && ver > 0 ? ver : null };
};

/**
 * El `<head>` de una ruta.
 *
 * @param {object} opciones
 * @param {string} opciones.ruta       Pathname, sin query (`/compare/gen/1`).
 * @param {object} [opciones.params]   `{ libro, capitulo, versiculo }`.
 * @param {string} [opciones.idioma]   "es" | "en".
 * @param {string} [opciones.extracto] Primer versículo ya limpio, si se tiene.
 *                                     Solo lo pasa el prerenderizador: en el
 *                                     navegador el texto llega después del
 *                                     `<head>` y esperar por él retrasaría el
 *                                     título varios cientos de milisegundos.
 */
export const metadatosDeRuta = ({ ruta = "/", params = {}, idioma = "es", extracto = "" } = {}) => {
  const t = dic(idioma);
  const path = `/${String(ruta).replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const seccion = path.split("/")[1] ?? "";
  const claves = PALABRAS_CLAVE[idioma] ?? PALABRAS_CLAVE.es;

  const base = {
    ruta: path === "/" ? "/" : path,
    canonical: urlAbsoluta(path === "/" ? "/" : path),
    idioma,
    robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    keywords: claves.join(", "),
    tipoOg: "website",
  };

  /* Pantallas personales: no aportan nada a un buscador y algunas exponen
     estado del usuario. Se marcan `noindex` pero se dejan `follow` para que el
     rastreador siga los enlaces internos que contienen. */
  const privadas = { settings: "settings", history: "history", notes: "notes", account: "account" };
  if (privadas[seccion]) {
    const clave = privadas[seccion];
    return {
      ...base,
      robots: "noindex, follow",
      title: conMarca(t[clave].title),
      description: t[clave].description,
      h1: t[clave].h1,
      jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) },
    };
  }

  if (path === "/") {
    return {
      ...base,
      title: conMarca(t.home.title),
      description: t.home.description,
      h1: t.home.h1,
      jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) },
    };
  }

  if (seccion === "search") {
    return { ...base, title: conMarca(t.search.title), description: t.search.description, h1: t.search.h1, jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) } };
  }

  if (seccion === "about") {
    return {
      ...base,
      title: conMarca(t.about.title),
      description: t.about.description,
      h1: t.about.h1,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [...grafoBase(idioma), migas([{ nombre: SITE_NAME, ruta: "/" }, { nombre: t.about.h1, ruta: "/about" }]), preguntasFrecuentes(idioma)],
      },
    };
  }

  if (seccion === "3d") {
    return { ...base, title: conMarca(t.tresD.title), description: t.tresD.description, h1: t.tresD.h1, jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) } };
  }

  if (seccion === "atlas") {
    return { ...base, title: conMarca(t.atlas.title), description: t.atlas.description, h1: t.atlas.h1, jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) } };
  }

  if (seccion === "compare") {
    return metadatosDeCompare({ base, params, idioma, extracto, t });
  }

  return {
    ...base,
    robots: "noindex, follow",
    title: conMarca(t.notFound.title),
    description: t.notFound.description,
    h1: t.notFound.h1,
    jsonLd: { "@context": "https://schema.org", "@graph": grafoBase(idioma) },
  };
};

const metadatosDeCompare = ({ base, params, idioma, extracto, t }) => {
  const ref = referenciaDeRuta(params);

  // `/compare` a secas: el selector de versiones, sin pasaje elegido.
  if (!ref) {
    return {
      ...base,
      title: conMarca(t.compare.title),
      description: t.compare.description,
      h1: t.compare.h1,
      jsonLd: { "@context": "https://schema.org", "@graph": [...grafoBase(idioma), migas([{ nombre: SITE_NAME, ruta: "/" }, { nombre: t.compare.h1, ruta: "/compare" }])] },
    };
  }

  const nombre = nombreDeLibro(ref.libro.id, idioma);
  const rutaLibro = `/compare/${ref.libro.slug}`;
  const migasBase = [
    { nombre: SITE_NAME, ruta: "/" },
    { nombre: t.compare.h1, ruta: "/compare" },
    { nombre: nombre, ruta: rutaLibro },
  ];

  /*
   * `/compare/gen` sin capítulo NO es una pantalla propia.
   *
   * Al abrirla, la app selecciona el capítulo 1 y reescribe la barra de
   * direcciones a `/compare/gen/1`. Si aquí se devolvieran metadatos de "libro
   * completo", el HTML servido para esa URL diría una cosa —"Génesis, 50
   * capítulos"— y el DOM que acaba viendo el rastreador diría otra —"Génesis
   * 1"—, con dos canónicas distintas para la misma dirección. Un buscador que
   * ve eso descarta las dos.
   *
   * Así que la dirección se describe por lo que de verdad muestra: el capítulo
   * 1. Sigue prerenderizándose (su HTML lleva el índice de los 50 capítulos y
   * es por donde se llega al resto), pero no entra en el sitemap: es un
   * duplicado declarado de `/compare/gen/1`.
   */
  if (!ref.capitulo) {
    return metadatosDeCompare({ base, params: { ...params, capitulo: 1 }, idioma, extracto, t });
  }

  const referenciaTexto = `${nombre} ${ref.capitulo}`;
  const rutaCapitulo = `${rutaLibro}/${ref.capitulo}`;
  const migasCompletas = [...migasBase, { nombre: referenciaTexto, ruta: rutaCapitulo }];

  /* El extracto del propio versículo es la mejor descripción posible: es
     exactamente lo que busca quien escribe "juan 3 16" en el buscador. Cuando
     no se tiene (navegación en cliente), se cae a una plantilla. */
  const plantilla =
    idioma === "en"
      ? `Read ${referenciaTexto} and compare ${TOTAL_VERSIONES}+ Bible versions side by side — KJV, ESV, NIV, interlinear Greek and Hebrew with Strong's numbers.`
      : `Lee ${referenciaTexto} y compara ${TOTAL_VERSIONES}+ versiones de la Biblia lado a lado — Reina Valera, NVI, LBLA, interlineal griego y hebreo con números Strong.`;

  return {
    ...base,
    canonical: urlAbsoluta(rutaCapitulo),
    // `ruta` alimenta los hreflang, que tienen que apuntar a lo mismo que la
    // canonica: anunciar la version en ingles de una URL que se declara
    // duplicada de otra es contradecirse.
    ruta: rutaCapitulo,
    title: conMarca(idioma === "en" ? `${referenciaTexto} — compare Bible versions` : `${referenciaTexto} — comparar versiones de la Biblia`),
    description: recortar(extracto ? `${referenciaTexto} — «${extracto}»` : plantilla),
    h1: referenciaTexto,
    tipoOg: "article",
    keywords: sinRepetir([
      referenciaTexto.toLowerCase(),
      `${nombre.toLowerCase()} ${ref.capitulo}`,
      `${nombre.toLowerCase()} capítulo ${ref.capitulo}`,
      `biblia ${nombre.toLowerCase()}`,
      "biblia",
      "comparar versiones de la biblia",
      "reina valera",
    ]),
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        ...grafoBase(idioma),
        migas(migasCompletas),
        {
          "@type": "Chapter",
          name: referenciaTexto,
          url: urlAbsoluta(rutaCapitulo),
          position: ref.capitulo,
          inLanguage: idioma,
          isPartOf: { "@type": "Book", name: nombre, url: urlAbsoluta(rutaLibro) },
          ...(extracto ? { abstract: recortar(extracto, 300) } : {}),
        },
      ],
    },
  };
};

/**
 * Preguntas frecuentes de `/about`.
 *
 * Van como `FAQPage` porque es de los pocos tipos que Google todavía muestra
 * expandido en el resultado, y las preguntas son exactamente las que se teclean
 * en el buscador ("qué biblia es más fiel", "qué son los números Strong").
 */
export const PREGUNTAS = {
  es: [
    {
      p: "¿Qué es Biblian?",
      r: `Biblian es una aplicación web gratuita para leer la Biblia y comparar ${TOTAL_VERSIONES}+ versiones lado a lado, con diccionario Strong hebreo y griego, búsqueda de texto completo, notas y lectura sin conexión.`,
    },
    {
      p: "¿Cuántas versiones de la Biblia se pueden comparar a la vez?",
      r: "Se pueden abrir varias versiones simultáneamente y leerlas versículo por versículo en la misma pantalla. El catálogo incluye Reina Valera (1569 a 2020), NVI, LBLA, Biblia Textual, Peshitta, Septuaginta e interlineales griego-español y hebreo-español.",
    },
    {
      p: "¿Qué son los números Strong?",
      r: "Son el código que identifica cada palabra original hebrea, aramea o griega del texto bíblico. En Biblian aparecen junto al texto: al tocarlos se abre la definición, la pronunciación y la concordancia con todos los pasajes donde aparece esa misma palabra original.",
    },
    { p: "¿Hay que registrarse o pagar?", r: "No. Leer, comparar y buscar es gratis y no requiere cuenta. La cuenta solo sirve para sincronizar notas, subrayados e historial entre dispositivos." },
    { p: "¿Funciona sin internet?", r: "Sí. Biblian es una PWA: se puede instalar en el teléfono o el escritorio y los pasajes ya visitados siguen disponibles sin conexión." },
    { p: "¿De dónde salen los textos bíblicos?", r: "De colecciones públicas de dominio libre recopiladas por la comunidad, principalmente el proyecto Beblia. Los textos no son obra propia; se acreditan sus fuentes en la página de agradecimientos." },
  ],
  en: [
    {
      p: "What is Biblian?",
      r: `Biblian is a free web app to read the Bible and compare ${TOTAL_VERSIONES}+ versions side by side, with a Hebrew and Greek Strong's dictionary, full-text search, notes and offline reading.`,
    },
    {
      p: "How many Bible versions can be compared at once?",
      r: "Several versions can be open at the same time and read verse by verse on one screen. The catalog includes KJV, ASV, ESV, CSB, Darby, Young's Literal, the Septuagint, the Peshitta and Greek/Hebrew interlinears.",
    },
    {
      p: "What are Strong's numbers?",
      r: "They are the codes that identify each original Hebrew, Aramaic or Greek word of the biblical text. In Biblian they sit next to the text: tapping one opens its definition, pronunciation and a concordance of every passage using that same original word.",
    },
    { p: "Is an account or payment required?", r: "No. Reading, comparing and searching are free and need no account. An account only syncs notes, highlights and history across devices." },
    { p: "Does it work offline?", r: "Yes. Biblian is a PWA: it installs on phone or desktop and passages already visited stay available with no connection." },
    { p: "Where do the biblical texts come from?", r: "From public-domain collections compiled by the community, mainly the Beblia project. The texts are not original work; their sources are credited on the acknowledgements page." },
  ],
};

export const preguntasFrecuentes = (idioma = "es") => ({
  "@type": "FAQPage",
  mainEntity: (PREGUNTAS[idioma] ?? PREGUNTAS.es).map(({ p, r }) => ({
    "@type": "Question",
    name: p,
    acceptedAnswer: { "@type": "Answer", text: r },
  })),
});

/** Todas las rutas indexables que existen, para el sitemap y el prerenderizado. */
export const rutasEstaticas = () => ["/", "/compare", "/search", "/about", "/3d", "/atlas"];

export const rutasDeLibros = () => LIBROS.map((libro) => `/compare/${libro.slug}`);

export const rutasDeCapitulos = () =>
  LIBROS.flatMap((libro) => Array.from({ length: totalCapitulos(libro.id) }, (unused, indice) => `/compare/${libro.slug}/${indice + 1}`));
