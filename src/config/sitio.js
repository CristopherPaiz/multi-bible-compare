/**
 * Identidad pública del sitio: el único lugar donde vive el dominio.
 *
 * Lo consumen tres runtimes distintos —los componentes (Vite), el generador de
 * sitemaps y el prerenderizador (Node)—, así que el archivo no puede depender
 * de nada específico de uno de ellos:
 *
 *   - `import.meta.env` solo existe cuando compila Vite; en Node es `undefined`
 *     y el encadenamiento opcional lo absorbe.
 *   - `process.env` solo existe en Node; se lee por `globalThis` para que Vite
 *     no intente sustituirlo en el bundle del navegador.
 *
 * Cambiar de dominio es cambiar `VITE_SITE_URL` (o esta constante) y volver a
 * construir: canonical, Open Graph, hreflang, sitemap y JSON-LD salen de aquí.
 */
const DOMINIO_POR_DEFECTO = "https://biblian.netlify.app";

/*
 * `import.meta.env` se escribe TAL CUAL, sin encadenamiento opcional en esa
 * parte: Vite sustituye esa cadena exacta por el objeto literal con las
 * variables del build, y `import.meta?.env` ya no coincide —el override
 * dejaria de funcionar en produccion sin que nada fallara, porque el valor por
 * defecto sigue siendo valido—. En Node la propiedad simplemente no existe y
 * el `||` sigue adelante.
 */
const entornoVite = import.meta.env || {};
const entornoNode = globalThis.process?.env || {};

const desdeEntorno = entornoVite.VITE_SITE_URL || entornoNode.VITE_SITE_URL || "";

/** Sin barra final: todas las URLs se componen concatenando rutas con `/`. */
export const SITE_URL = String(desdeEntorno || DOMINIO_POR_DEFECTO).replace(/\/+$/, "");

export const SITE_NAME = "Biblian";

export const AUTOR = "Cristopher Paiz";

export const REPO_URL = "https://github.com/CristopherPaiz/multi-bible-compare";

/** Idiomas de la interfaz. El primero es el que sirve de `x-default`. */
export const IDIOMAS = ["es", "en"];

export const IDIOMA_POR_DEFECTO = IDIOMAS[0];

/** Mapa a los códigos completos que pide Open Graph (`og:locale`). */
export const LOCALES_OG = { es: "es_ES", en: "en_US" };

/**
 * Cuántas versiones bíblicas se anuncian en los textos de marketing.
 *
 * Es un número redondo a propósito: el catálogo crece y no tiene sentido que
 * cada versión nueva obligue a reescribir 1200 páginas prerenderizadas.
 */
export const TOTAL_VERSIONES = 150;

export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const OG_IMAGE_ANCHO = 1200;

export const OG_IMAGE_ALTO = 630;

/**
 * Convierte una ruta interna (`/compare/gen/1`) en URL absoluta, CON barra
 * final.
 *
 * La barra no es cosmetica. Cada pagina prerenderizada se escribe como
 * `dist/compare/gen/1/index.html`, y ante eso Netlify responde a
 * `/compare/gen/1` con un **301 hacia `/compare/gen/1/`**. Si la canonica y el
 * sitemap anunciaran la version sin barra, las 1195 URLs declaradas serian
 * redirecciones: el rastreador gasta dos peticiones por pagina y la direccion
 * que decimos que es la buena no es la que acaba sirviendo el servidor.
 *
 * Asi que se declara la forma que responde 200 sin rebotar.
 */
export const urlAbsoluta = (ruta = "/") => {
  if (!ruta || ruta === "/") return `${SITE_URL}/`;
  return `${SITE_URL}/${String(ruta).replace(/^\/+/, "").replace(/\/+$/, "")}/`;
};

/**
 * Las alternativas de idioma de una ruta, en la forma que piden `hreflang` y
 * el sitemap.
 *
 * El idioma viaja en `?lng=` y no en el path porque la app es una SPA con una
 * sola build: partir las rutas por idioma duplicaría 1200 páginas para cambiar
 * media docena de cadenas de interfaz —el texto bíblico no se traduce, se
 * elige versión—.
 */
export const alternativasDeIdioma = (ruta = "/") => {
  const base = urlAbsoluta(ruta);
  const separador = base.includes("?") ? "&" : "?";
  return [
    ...IDIOMAS.map((idioma) => ({ hreflang: idioma, href: `${base}${separador}lng=${idioma}` })),
    { hreflang: "x-default", href: base },
  ];
};
