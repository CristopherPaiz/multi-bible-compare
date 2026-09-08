import { useContext, useEffect, useMemo } from "react";
import { matchPath, useLocation } from "react-router-dom";
import LanguageContext from "../context/LanguageContext";
import { metadatosDeRuta } from "../utils/seo";
import { LOCALES_OG, OG_IMAGE, OG_IMAGE_ALTO, OG_IMAGE_ANCHO, SITE_NAME, alternativasDeIdioma } from "../config/sitio";

/**
 * Mantiene el `<head>` al día mientras el usuario navega.
 *
 * El HTML que sirve el CDN ya viene con el `<head>` correcto de cada ruta
 * (`scripts/prerender.mjs`), pero eso solo cubre la PRIMERA carga: a partir de
 * ahí navega el router, el documento no se vuelve a pedir y el `<head>` se
 * quedaría congelado en la página de entrada. Se nota en tres sitios que no son
 * teóricos: el título de la pestaña, lo que copia quien comparte el enlace
 * desde el navegador, y lo que ve el rastreador cuando renderiza la SPA.
 *
 * La regla que sigue este componente es que su salida tiene que ser IDÉNTICA a
 * la del prerenderizador para la misma ruta. Por eso los dos leen de
 * `utils/seo` y ninguno decide nada por su cuenta.
 */

/** Marca las etiquetas que gestiona este módulo, para poder retirarlas después. */
const MARCA = "data-seo";

const fijarMeta = (clave, valor, atributo = "name") => {
  if (!valor) return;
  const etiqueta = document.createElement("meta");
  etiqueta.setAttribute(atributo, clave);
  etiqueta.setAttribute("content", valor);
  etiqueta.setAttribute(MARCA, "");
  document.head.appendChild(etiqueta);
};

const fijarLink = (rel, href, extra = {}) => {
  const etiqueta = document.createElement("link");
  etiqueta.setAttribute("rel", rel);
  etiqueta.setAttribute("href", href);
  Object.entries(extra).forEach(([nombre, valor]) => etiqueta.setAttribute(nombre, valor));
  etiqueta.setAttribute(MARCA, "");
  document.head.appendChild(etiqueta);
};

/**
 * Sustituye de golpe todo lo que este módulo había puesto antes.
 *
 * Se borra y se vuelve a escribir en vez de ir actualizando cada etiqueta
 * porque el conjunto cambia de forma entre rutas —una página de capítulo lleva
 * `article:section` y migas que la portada no tiene— y reconciliar eso a mano
 * es más código y más formas de dejar una etiqueta huérfana.
 */
const aplicarSeo = (meta) => {
  document.title = meta.title;
  document.documentElement.setAttribute("lang", meta.idioma);

  document.head.querySelectorAll(`[${MARCA}]`).forEach((etiqueta) => etiqueta.remove());

  fijarMeta("description", meta.description);
  fijarMeta("keywords", meta.keywords);
  fijarMeta("robots", meta.robots);
  fijarMeta("googlebot", meta.robots);

  fijarLink("canonical", meta.canonical);
  alternativasDeIdioma(meta.ruta).forEach(({ hreflang, href }) => fijarLink("alternate", href, { hreflang }));

  fijarMeta("og:type", meta.tipoOg, "property");
  fijarMeta("og:site_name", SITE_NAME, "property");
  fijarMeta("og:title", meta.title, "property");
  fijarMeta("og:description", meta.description, "property");
  fijarMeta("og:url", meta.canonical, "property");
  fijarMeta("og:image", OG_IMAGE, "property");
  fijarMeta("og:image:width", String(OG_IMAGE_ANCHO), "property");
  fijarMeta("og:image:height", String(OG_IMAGE_ALTO), "property");
  fijarMeta("og:image:alt", meta.h1, "property");
  fijarMeta("og:locale", LOCALES_OG[meta.idioma] ?? LOCALES_OG.es, "property");
  Object.entries(LOCALES_OG)
    .filter(([idioma]) => idioma !== meta.idioma)
    .forEach(([, locale]) => fijarMeta("og:locale:alternate", locale, "property"));

  fijarMeta("twitter:card", "summary_large_image");
  fijarMeta("twitter:title", meta.title);
  fijarMeta("twitter:description", meta.description);
  fijarMeta("twitter:image", OG_IMAGE);
  fijarMeta("twitter:image:alt", meta.h1);

  const datos = document.createElement("script");
  datos.type = "application/ld+json";
  datos.setAttribute(MARCA, "");
  datos.textContent = JSON.stringify(meta.jsonLd);
  document.head.appendChild(datos);
};

/**
 * Va montado una sola vez dentro del router. Lee la ruta y los parámetros y
 * reescribe el `<head>` en cada cambio.
 *
 * No recibe props: si cada pantalla tuviera que declarar su propio `<Seo>`, una
 * pantalla nueva nacería sin metadatos y nadie lo notaría hasta ver el
 * resultado en el buscador semanas después.
 */
const Seo = () => {
  const { pathname } = useLocation();
  const { idiomaNavegador } = useContext(LanguageContext);

  /*
   * `useParams` devolvería `{}`: este componente vive al lado de `<Routes>`, no
   * dentro de una `<Route>`, así que no hay coincidencia de la que heredar
   * parámetros. Se resuelve el patrón a mano contra el pathname.
   */
  const params = useMemo(() => matchPath("/compare/:libro/:capitulo/:versiculo", pathname)?.params ?? matchPath("/compare/:libro/:capitulo", pathname)?.params ?? matchPath("/compare/:libro", pathname)?.params ?? {}, [pathname]);

  useEffect(() => {
    aplicarSeo(metadatosDeRuta({ ruta: pathname, params, idioma: idiomaNavegador }));
  }, [pathname, params, idiomaNavegador]);

  return null;
};

export default Seo;
