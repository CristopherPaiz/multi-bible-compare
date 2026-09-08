/**
 * Escribe un HTML estático por ruta dentro de `dist/`, después del build.
 *
 * ---------------------------------------------------------------------------
 * Por qué existe
 * ---------------------------------------------------------------------------
 * Biblian es una SPA: el servidor manda SIEMPRE el mismo `index.html` y el
 * contenido lo pinta React después. Para un buscador eso significa que las
 * ~1250 direcciones del sitio son, en el primer vistazo, la misma página vacía.
 * Google sabe ejecutar JavaScript, pero lo hace en una segunda pasada, en cola
 * y sin garantías; el resto de rastreadores —Bing, redes sociales, buscadores
 * de IA— en general ni eso. El resultado práctico es que un sitio con la Biblia
 * entera se indexa como una sola URL.
 *
 * Este script rompe eso sin meter un servidor de por medio: coge el `dist` ya
 * construido y, para cada ruta, escribe un archivo con SU `<head>` y con el
 * texto del pasaje ya en el HTML. Netlify sirve el archivo que coincide con la
 * ruta antes de aplicar el fallback de `_redirects`, así que `/compare/gen/1`
 * devuelve `dist/compare/gen/1/index.html` y no el `index.html` genérico.
 *
 * ---------------------------------------------------------------------------
 * Qué NO es
 * ---------------------------------------------------------------------------
 * No es SSR ni hidratación. El contenido estático es un fallback: cuando React
 * monta, sustituye `#root` entero. Por eso el texto que se escribe aquí tiene
 * que decir lo MISMO que acaba mostrando la app —el mismo pasaje, el mismo
 * título—; si dijera otra cosa sería encubrimiento, y además el usuario vería
 * un parpadeo entre dos contenidos distintos.
 *
 * El texto prerenderizado es Reina Valera 1909, de dominio público. La app deja
 * elegir entre 150+ versiones, pero volcar una moderna en 1189 archivos
 * estáticos sería republicar una traducción con derechos vigentes.
 *
 *   node scripts/prerender.mjs [directorio-de-dist]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES_OG, OG_IMAGE, OG_IMAGE_ALTO, OG_IMAGE_ANCHO, SITE_NAME, alternativasDeIdioma } from "../src/config/sitio.js";
import { metadatosDeRuta, recortar, rutasDeCapitulos, rutasDeLibros, rutasEstaticas, textoLimpio } from "../src/utils/seo.js";
import { LIBROS, libroPorSlug, nombreDeLibro } from "../src/data/libros.js";
import { ULTIMO_LIBRO_AT, totalCapitulos } from "../src/data/canon.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.resolve(process.argv[2] ?? path.join(RAIZ, "dist"));

/** Versión de dominio público que se vuelca en el HTML estático. */
const VERSION_ESTATICA = {
  directorio: "033. Español - Biblia Reina Valera (1909)",
  nombre: "Reina Valera 1909",
  nota: "Texto de dominio público. En la app se puede comparar con 150+ versiones más.",
};

const IDIOMA = "es";

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const escapar = (valor) => String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/*
 * Todas las etiquetas que se escriben aquí llevan `data-seo`.
 *
 * Es el mismo marcador que usa `components/Seo.jsx`, y es lo que evita que la
 * página acabe con DOS canonical y DOS description: cuando React monta, ese
 * componente borra todo lo que lleve la marca antes de escribir lo suyo. Sin
 * ella, la etiqueta estática y la dinámica conviven, y un buscador que ve dos
 * canonical distintas descarta las dos.
 */
const MARCA = "data-seo";

/** El `<head>` se escribe con `content="…"`, así que aquí sí importan las comillas. */
const meta = (clave, valor, atributo = "name") => (valor ? `    <meta ${atributo}="${clave}" content="${escapar(valor)}" ${MARCA} />` : "");

const enlace = (rel, href, extra = "") => `    <link rel="${rel}" href="${escapar(href)}"${extra} ${MARCA} />`;

/**
 * Lee un capítulo del disco. Devuelve `null` si esa versión no lo tiene: la
 * 1909 los tiene todos, pero el script no debe romper el build por un archivo
 * que falte.
 */
const leerCapitulo = (bookId, capitulo) => {
  const testamento = bookId <= ULTIMO_LIBRO_AT ? "Old" : "New";
  const archivo = path.join(RAIZ, "src", "assets", "bibles", VERSION_ESTATICA.directorio, testamento, `book${bookId}`, `chapter${capitulo}.json`);
  try {
    const crudo = JSON.parse(fs.readFileSync(archivo, "utf8"));
    return Object.entries(crudo)
      .map(([numero, texto]) => ({ numero: Number(numero), texto: textoLimpio(texto) }))
      .filter((verso) => verso.texto)
      .sort((uno, otro) => uno.numero - otro.numero);
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*  Cuerpo estático                                                            */
/* -------------------------------------------------------------------------- */

/*
 * El HTML de respaldo va con clases de Tailwind porque la hoja de estilos ya
 * está cargada cuando se pinta: sin ellas el usuario ve un instante de texto
 * plano sin márgenes antes de que React monte, que se lee como un error de
 * carga.
 */
const CONTENEDOR = "max-w-[850px] mx-auto px-5 py-10 dark:text-white";

const listaDeEnlaces = (enlaces) =>
  `<ul class="flex flex-wrap gap-1.5 mt-3">${enlaces
    .map(({ href, texto }) => `<li><a class="inline-block text-xs px-2.5 py-1 rounded-md border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10" href="${escapar(href)}">${escapar(texto)}</a></li>`)
    .join("")}</ul>`;

const enlacesDeLibros = () => listaDeEnlaces(LIBROS.map((libro) => ({ href: `/compare/${libro.slug}/1`, texto: nombreDeLibro(libro.id, IDIOMA) })));

const migasHtml = (elementos) =>
  `<nav aria-label="Ruta" class="text-xs opacity-70 mb-4">${elementos
    .map((elemento, indice) => (elemento.href ? `<a href="${escapar(elemento.href)}">${escapar(elemento.texto)}</a>` : `<span>${escapar(elemento.texto)}</span>`) + (indice < elementos.length - 1 ? " › " : ""))
    .join("")}</nav>`;

const cuerpoGenerico = (metadatos, extra = "") => `
      <main class="${CONTENEDOR}">
        <h1 class="text-3xl font-bold mb-3">${escapar(metadatos.h1)}</h1>
        <p class="opacity-80">${escapar(metadatos.description)}</p>
        ${extra}
      </main>`;

const cuerpoPortada = (metadatos) => `
      <main class="${CONTENEDOR}">
        <h1 class="text-4xl font-bold mb-2">${SITE_NAME}</h1>
        <h2 class="text-xl font-semibold mb-3">${escapar(metadatos.h1)}</h2>
        <p class="opacity-80">${escapar(metadatos.description)}</p>
        <p class="mt-4"><a class="underline font-semibold" href="/compare">Comparar versiones de la Biblia</a></p>
        <nav aria-label="Secciones" class="mt-6">
          ${listaDeEnlaces([
            { href: "/search", texto: "Buscar en la Biblia" },
            { href: "/3d", texto: "Biblia en 3D" },
            { href: "/atlas", texto: "Atlas bíblico" },
            { href: "/about", texto: "Versiones y fuentes" },
          ])}
        </nav>
        <h2 class="text-lg font-bold mt-10">Índice de los 66 libros de la Biblia</h2>
        ${enlacesDeLibros()}
      </main>`;

/** El indice de capitulos de un libro, que es lo que aporta la pagina del libro. */
const indiceDeCapitulos = (libro) => {
  const nombre = nombreDeLibro(libro.id, IDIOMA);
  const testamento = libro.id <= ULTIMO_LIBRO_AT ? "Antiguo Testamento" : "Nuevo Testamento";
  const capitulos = totalCapitulos(libro.id);

  return `
        <h2 class="text-lg font-bold mt-10">Capítulos de ${escapar(nombre)} (${testamento})</h2>
        ${listaDeEnlaces(Array.from({ length: capitulos }, (unused, indice) => ({ href: `/compare/${libro.slug}/${indice + 1}`, texto: String(indice + 1) })))}`;
};

const cuerpoCapitulo = (metadatos, libro, capitulo, versiculos, extra = "") => {
  const nombre = nombreDeLibro(libro.id, IDIOMA);
  const capitulos = totalCapitulos(libro.id);

  const navegacion = [
    capitulo > 1 ? { href: `/compare/${libro.slug}/${capitulo - 1}`, texto: `← ${nombre} ${capitulo - 1}` } : null,
    { href: `/compare/${libro.slug}`, texto: `${nombre} — todos los capítulos` },
    capitulo < capitulos ? { href: `/compare/${libro.slug}/${capitulo + 1}`, texto: `${nombre} ${capitulo + 1} →` } : null,
  ].filter(Boolean);

  const texto = versiculos
    .map(
      ({ numero, texto: contenido }) =>
        `<li id="v${numero}" class="mb-2"><a href="/compare/${libro.slug}/${capitulo}/${numero}" class="font-bold text-xs align-super opacity-60 mr-1">${numero}</a>${escapar(contenido)}</li>`
    )
    .join("\n          ");

  return `
      <main class="${CONTENEDOR}">
        ${migasHtml([
          { texto: SITE_NAME, href: "/" },
          { texto: "Comparar", href: "/compare" },
          { texto: nombre, href: `/compare/${libro.slug}` },
          { texto: `${nombre} ${capitulo}` },
        ])}
        <h1 class="text-3xl font-bold mb-1">${escapar(nombre)} ${capitulo}</h1>
        <p class="text-xs opacity-70 mb-5">${escapar(VERSION_ESTATICA.nombre)} — ${escapar(VERSION_ESTATICA.nota)}</p>
        <ol class="leading-relaxed">
          ${texto}
        </ol>
        <nav aria-label="Capítulos" class="mt-8">${listaDeEnlaces(navegacion)}</nav>
        ${extra}
        <h2 class="text-lg font-bold mt-10">Índice de los 66 libros de la Biblia</h2>
        ${enlacesDeLibros()}
      </main>`;
};

/* -------------------------------------------------------------------------- */
/*  Ensamblado                                                                 */
/* -------------------------------------------------------------------------- */

const bloqueHead = (metadatos) =>
  [
    `    <title>${escapar(metadatos.title)}</title>`,
    meta("description", metadatos.description),
    meta("keywords", metadatos.keywords),
    meta("robots", metadatos.robots),
    meta("googlebot", metadatos.robots),
    enlace("canonical", metadatos.canonical),
    ...alternativasDeIdioma(metadatos.ruta).map(({ hreflang, href }) => enlace("alternate", href, ` hreflang="${hreflang}"`)),
    meta("og:type", metadatos.tipoOg, "property"),
    meta("og:site_name", SITE_NAME, "property"),
    meta("og:title", metadatos.title, "property"),
    meta("og:description", metadatos.description, "property"),
    meta("og:url", metadatos.canonical, "property"),
    meta("og:image", OG_IMAGE, "property"),
    meta("og:image:width", String(OG_IMAGE_ANCHO), "property"),
    meta("og:image:height", String(OG_IMAGE_ALTO), "property"),
    meta("og:image:alt", metadatos.h1, "property"),
    meta("og:locale", LOCALES_OG[IDIOMA], "property"),
    meta("og:locale:alternate", LOCALES_OG.en, "property"),
    meta("twitter:card", "summary_large_image"),
    meta("twitter:title", metadatos.title),
    meta("twitter:description", metadatos.description),
    meta("twitter:image", OG_IMAGE),
    meta("twitter:image:alt", metadatos.h1),
  ]
    .filter(Boolean)
    .join("\n");

/**
 * Sustituye lo que hay entre dos marcadores del `index.html` construido.
 * Falla ruidosamente: un marcador que desaparezca (por un cambio en el HTML o
 * por un minificador que se coma los comentarios) dejaría 1250 páginas con los
 * metadatos de la portada, y eso es peor que no prerenderizar nada.
 */
const sustituir = (html, marcador, contenido) => {
  const inicio = `<!-- ${marcador}:INICIO -->`;
  const fin = `<!-- ${marcador}:FIN -->`;
  const desde = html.indexOf(inicio);
  const hasta = html.indexOf(fin);
  if (desde === -1 || hasta === -1) throw new Error(`No se encontró el marcador ${marcador} en dist/index.html`);
  return `${html.slice(0, desde + inicio.length)}\n${contenido}\n${html.slice(hasta)}`;
};

const plantilla = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

const escribir = (ruta, metadatos, cuerpo) => {
  let html = sustituir(plantilla, "SEO", bloqueHead(metadatos));
  html = sustituir(html, "SEO:JSONLD", `    <script type="application/ld+json" ${MARCA}>\n${JSON.stringify(metadatos.jsonLd)}\n    </script>`);
  html = sustituir(html, "SEO:CUERPO", `    <div id="root">${cuerpo}\n    </div>`);

  const destino = ruta === "/" ? path.join(DIST, "index.html") : path.join(DIST, ruta.replace(/^\//, ""), "index.html");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html, "utf8");
};

/* -------------------------------------------------------------------------- */

let escritas = 0;
const empezado = Date.now();

for (const ruta of rutasEstaticas()) {
  const metadatos = metadatosDeRuta({ ruta, idioma: IDIOMA });
  escribir(ruta, metadatos, ruta === "/" ? cuerpoPortada(metadatos) : cuerpoGenerico(metadatos, ruta === "/compare" ? `<h2 class="text-lg font-bold mt-8">Índice de los 66 libros</h2>${enlacesDeLibros()}` : ""));
  escritas += 1;
}

/*
 * `/compare/gen` muestra lo mismo que `/compare/gen/1` —la app selecciona el
 * capitulo 1 al entrar—, asi que se escribe con ESE contenido y no con una
 * ficha de libro que nadie llega a ver. Lo que si aporta esta pagina, y por lo
 * que se sigue generando aunque no entre en el sitemap, es el indice de sus
 * capitulos: es el enlace por el que se descubren los otros 49.
 */
for (const ruta of rutasDeLibros()) {
  const slug = ruta.split("/")[2];
  const libro = libroPorSlug(slug);
  const versiculos = leerCapitulo(libro.id, 1);
  const metadatos = metadatosDeRuta({ ruta, params: { libro: slug }, idioma: IDIOMA, extracto: versiculos?.[0]?.texto ?? "" });
  escribir(ruta, metadatos, versiculos ? cuerpoCapitulo(metadatos, libro, 1, versiculos, indiceDeCapitulos(libro)) : cuerpoGenerico(metadatos, indiceDeCapitulos(libro)));
  escritas += 1;
}

let sinTexto = 0;
for (const ruta of rutasDeCapitulos()) {
  const [, , slug, capitulo] = ruta.split("/");
  const libro = libroPorSlug(slug);
  const versiculos = leerCapitulo(libro.id, Number(capitulo));

  if (!versiculos) sinTexto += 1;

  /* El primer versículo es la descripción: es literalmente lo que busca quien
     teclea "juan 3 16". Sin texto se cae a la plantilla de `utils/seo`. */
  const extracto = versiculos?.[0]?.texto ?? "";
  const metadatos = metadatosDeRuta({ ruta, params: { libro: slug, capitulo }, idioma: IDIOMA, extracto });

  escribir(ruta, metadatos, versiculos ? cuerpoCapitulo(metadatos, libro, Number(capitulo), versiculos) : cuerpoGenerico(metadatos));
  escritas += 1;
}

/*
 * El 404 se escribe aparte: no está en ningún sitemap y no debe indexarse, pero
 * Netlify lo sirve tal cual cuando una ruta no existe si se llama `404.html`.
 * Sin él, una dirección rota devolvía la portada con estado 200 y el buscador
 * la registraba como una página más.
 */
const metaNoEncontrada = metadatosDeRuta({ ruta: "/404", idioma: IDIOMA });
fs.writeFileSync(
  path.join(DIST, "404.html"),
  (() => {
    let html = sustituir(plantilla, "SEO", bloqueHead(metaNoEncontrada));
    html = sustituir(html, "SEO:JSONLD", `    <script type="application/ld+json" ${MARCA}>\n${JSON.stringify(metaNoEncontrada.jsonLd)}\n    </script>`);
    return sustituir(html, "SEO:CUERPO", `    <div id="root">${cuerpoGenerico(metaNoEncontrada, `<h2 class="text-lg font-bold mt-8">Índice de los 66 libros</h2>${enlacesDeLibros()}`)}\n    </div>`);
  })(),
  "utf8"
);

const segundos = ((Date.now() - empezado) / 1000).toFixed(1);
console.log(`[prerender] ${escritas} páginas + 404.html en ${segundos}s${sinTexto ? ` (${sinTexto} capítulos sin texto en ${VERSION_ESTATICA.nombre})` : ""}`);
if (sinTexto > 20) {
  console.warn(`[prerender] AVISO: ${sinTexto} capítulos se escribieron sin texto. Revisa que exista "src/assets/bibles/${VERSION_ESTATICA.directorio}".`);
}
