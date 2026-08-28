/**
 * Proyección del mapa del atlas.
 *
 * Vive aparte porque la usan DOS cosas que tienen que coincidir exactamente: la
 * página que dibuja los marcadores, y el script que convierte las costas de
 * Natural Earth en un `<path>` de SVG. Si cada una tuviera su copia de las
 * constantes, bastaría cambiar el encuadre en un sitio para que las ciudades
 * quedaran flotando sobre el mar.
 */

/** Encuadre del mundo bíblico: de Roma (12°E) a Persépolis (53°E). */
export const VISTA = { lonMin: 10, lonMax: 54, latMin: 25, latMax: 43 };

/** Ancho del lienzo en unidades de SVG. El alto se deriva. */
export const ANCHO = 1000;

/**
 * Equirectangular, corregida por la latitud media.
 *
 * Sin el factor `cos`, un grado de longitud y uno de latitud medirían lo mismo
 * en pantalla, y a 34° de latitud un grado de longitud es un 17% más corto que
 * uno de latitud: el mapa saldría estirado a lo ancho y las distancias
 * este-oeste engañarían.
 *
 * La deformación que queda dentro de esta banda (25°–43°) es menor que el error
 * de las propias identificaciones arqueológicas, así que no compensa una
 * proyección más cara.
 */
const LATITUD_MEDIA = (((VISTA.latMin + VISTA.latMax) / 2) * Math.PI) / 180;

export const ALTO = Math.round((ANCHO * (VISTA.latMax - VISTA.latMin)) / ((VISTA.lonMax - VISTA.lonMin) * Math.cos(LATITUD_MEDIA)));

export const proyectar = ({ lat, lon }) => ({
  x: ((lon - VISTA.lonMin) / (VISTA.lonMax - VISTA.lonMin)) * ANCHO,
  y: ((VISTA.latMax - lat) / (VISTA.latMax - VISTA.latMin)) * ALTO,
});
