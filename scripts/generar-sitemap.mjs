/**
 * Genera el sitemap del sitio dentro de `dist/`, después del build.
 *
 * Se escribe en `dist/` y no en `public/` a propósito: es un archivo derivado
 * —sale del canon y de `utils/seo`— y tenerlo versionado obligaría a acordarse
 * de regenerarlo cada vez que cambie una ruta, que es exactamente el tipo de
 * paso que se olvida y produce un sitemap que miente.
 *
 * Se parte en dos en vez de emitir un único archivo porque Search Console
 * informa de la cobertura POR sitemap: con la división se ve de un vistazo si
 * lo que no se indexa son los capítulos o las páginas fijas. Con un solo
 * archivo solo se ve un número.
 *
 *   node scripts/generar-sitemap.mjs [directorio-de-salida]
 */
import fs from "node:fs";
import path from "node:path";
import { SITE_URL, alternativasDeIdioma } from "../src/config/sitio.js";
import { rutasDeCapitulos, rutasEstaticas } from "../src/utils/seo.js";

const SALIDA = path.resolve(process.argv[2] ?? "dist");

/** `&`, `<` y `>` dentro de una URL rompen el XML; el resto no hace falta. */
const escaparXml = (valor) => String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const HOY = new Date().toISOString().slice(0, 10);

/**
 * Una entrada `<url>` con sus alternativas de idioma.
 *
 * Los `xhtml:link` van en TODAS las variantes de la misma página, incluida la
 * que se está declarando: es lo que pide la especificación de hreflang y sin la
 * autorreferencia Google descarta el grupo entero.
 */
const entrada = ({ ruta, prioridad, frecuencia }) => {
  const alternativas = alternativasDeIdioma(ruta)
    .map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escaparXml(href)}" />`)
    .join("\n");

  const url = ruta === "/" ? `${SITE_URL}/` : `${SITE_URL}${ruta}`;

  return [
    "  <url>",
    `    <loc>${escaparXml(url)}</loc>`,
    `    <lastmod>${HOY}</lastmod>`,
    `    <changefreq>${frecuencia}</changefreq>`,
    `    <priority>${prioridad}</priority>`,
    alternativas,
    "  </url>",
  ].join("\n");
};

const documento = (entradas) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas.join("\n")}
</urlset>
`;

const indice = (archivos) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${archivos.map((archivo) => `  <sitemap>\n    <loc>${SITE_URL}/${archivo}</loc>\n    <lastmod>${HOY}</lastmod>\n  </sitemap>`).join("\n")}
</sitemapindex>
`;

/*
 * Las prioridades son relativas entre sí, no una nota: le dicen al rastreador
 * en qué orden gastar el presupuesto cuando no puede con todo. La portada y el
 * comparador primero, los capítulos al final porque son 1189 y ninguno es más
 * importante que la puerta de entrada.
 */
const PRIORIDAD = { "/": "1.0", "/compare": "0.9", "/search": "0.8", "/about": "0.6", "/3d": "0.6", "/atlas": "0.6" };

const paginas = rutasEstaticas().map((ruta) => entrada({ ruta, prioridad: PRIORIDAD[ruta] ?? "0.5", frecuencia: ruta === "/" ? "weekly" : "monthly" }));
const capitulos = rutasDeCapitulos().map((ruta) => entrada({ ruta, prioridad: "0.6", frecuencia: "monthly" }));

/*
 * Las 66 direcciones de libro (`/compare/gen`) NO van en el sitemap.
 *
 * La app las resuelve mostrando el capitulo 1 y reescribiendo la URL, asi que
 * su canonica apunta a `/compare/gen/1`. Listar en el sitemap una URL que se
 * declara duplicada de otra es pedirle al rastreador que gaste presupuesto en
 * descubrir algo que le vas a decir que ignore. Se siguen prerenderizando y
 * enlazando: por ahi se llega al resto de capitulos.
 */

fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, "sitemap-paginas.xml"), documento(paginas), "utf8");
fs.writeFileSync(path.join(SALIDA, "sitemap-capitulos.xml"), documento(capitulos), "utf8");
fs.writeFileSync(path.join(SALIDA, "sitemap.xml"), indice(["sitemap-paginas.xml", "sitemap-capitulos.xml"]), "utf8");

console.log(`[sitemap] ${paginas.length} páginas + ${capitulos.length} capítulos = ${paginas.length + capitulos.length} URLs en ${SALIDA}`);
