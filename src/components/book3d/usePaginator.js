import { useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Reparte los capítulos en hojas SIN cortar ninguna línea por la mitad.
 *
 * El enfoque obvio sería trocear el HTML por versículos y meter N versículos
 * por hoja, pero entonces cada hoja termina donde termina un versículo y el
 * texto deja de fluir: quedan huecos blancos al pie y se pierde el aire de
 * página impresa.
 *
 * Aquí se hace al revés. El texto se maqueta en un medidor invisible con el
 * ancho y la tipografía definitivos, y se le pregunta al navegador dónde cayó
 * cada renglón. Con esa lista se calcula en qué desplazamiento vertical debe
 * empezar cada hoja; las hojas luego enseñan el mismo contenido recortado a
 * distinta altura.
 *
 * La lista de renglones sale de `Range.getClientRects()`: sobre un nodo de
 * texto devuelve un rectángulo POR LÍNEA VISUAL, ya con el ajuste de línea, la
 * justificación y los guiones aplicados. Es la única forma de saber dónde
 * partió el navegador sin reimplementar su algoritmo de maquetado.
 *
 * ---
 *
 * Se mide CAPÍTULO A CAPÍTULO y se guarda lo medido.
 *
 * La versión anterior recibía el flujo entero ya pegado y lo volvía a medir
 * completo cada vez que se encadenaba un capítulo: recorrer con `TreeWalker`
 * todos los nodos de texto y pedir `getClientRects()` en cada uno, dentro de un
 * `useLayoutEffect` que bloquea antes de pintar. Leyendo veinte capítulos
 * seguidos, la vigésima medición recorría los veinte —trabajo cuadrático justo
 * en el momento en que el usuario está pasando hoja.
 *
 * Medir por separado es EXACTO, no una aproximación, y la garantía la da
 * `prosa.js`: cada pieza empieza con un bloque `clear: both`, así que ninguna
 * arrastra flotantes ni renglones a medias de la anterior y una pieza suelta se
 * maqueta igual que dentro del flujo. Encadenar deja de costar N mediciones y
 * pasa a costar una.
 */

const recogerRenglones = (raiz) => {
  const origen = raiz.getBoundingClientRect().top;
  const rango = document.createRange();
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const renglones = [];

  let nodo = recorrido.nextNode();
  while (nodo) {
    // Los nodos de solo espacios no pintan renglón propio; incluirlos metería
    // rectángulos fantasma entre líneas reales.
    if (nodo.nodeValue.trim()) {
      rango.selectNodeContents(nodo);
      for (const caja of rango.getClientRects()) {
        if (caja.height > 0) {
          renglones.push({ arriba: caja.top - origen, abajo: caja.bottom - origen });
        }
      }
    }
    nodo = recorrido.nextNode();
  }

  renglones.sort((a, b) => a.arriba - b.arriba);
  return renglones;
};

/**
 * Mide una pieza suelta dentro del medidor.
 *
 * Devuelve dos alturas distintas y las dos hacen falta:
 *
 *   `alto`       la caja completa, que es donde arrancaría la pieza siguiente.
 *                Sale de `getBoundingClientRect()` y no de sumar renglones
 *                porque el numeral capitular es un `float`: en un capítulo
 *                corto sobresale por debajo del último renglón, y el
 *                `clear: both` de la pieza siguiente lo tiene en cuenta.
 *                El medidor está posicionado, así que forma contexto de
 *                formato y su caja sí incluye el flotante.
 *
 *   `altoTexto`  el pie del último renglón. Es donde termina el TEXTO, y es lo
 *                que necesita la última hoja para no dejar asomar el hueco del
 *                flotante como si fuera contenido.
 */
const medirPieza = (medidor, html) => {
  medidor.innerHTML = html;

  const renglones = recogerRenglones(medidor);

  return {
    renglones,
    alto: medidor.getBoundingClientRect().height,
    altoTexto: renglones.length ? renglones[renglones.length - 1].abajo : 0,
    capitulo: medidor.querySelector("[data-capitulo]")?.dataset.capitulo ?? "",
  };
};

/**
 * Empaquetado voraz: se van sumando renglones a la hoja actual hasta que el
 * siguiente no cabe, y ahí empieza hoja nueva.
 *
 * La comparación es contra `abajo` y no contra `arriba` a propósito: lo que no
 * puede rebasar el alto útil es el PIE del renglón. Usando `arriba` entraría un
 * renglón que asoma cortado por debajo del recorte.
 */
const calcularCortes = (renglones, altoUtil) => {
  if (!renglones.length || altoUtil <= 0) return [0];

  const cortes = [0];
  let inicio = 0;

  for (const renglon of renglones) {
    if (renglon.abajo - inicio <= altoUtil) continue;

    // Un solo renglón más alto que la hoja (una capitular enorme, un cuerpo de
    // letra desmedido) haría que el corte se quedara clavado en el mismo sitio
    // y el bucle generara hojas vacías para siempre. Si no hay avance posible,
    // se le deja rebasar y se sigue.
    if (renglon.arriba <= inicio) continue;

    inicio = renglon.arriba;
    cortes.push(inicio);
  }

  return cortes;
};

/**
 * ¿Están ya las serifas web?
 *
 * EB Garamond tiene otras métricas que la serifa de respaldo, así que medir
 * antes de que llegue da un número de hojas que después hay que corregir
 * reconstruyendo el libro entero delante del usuario. Se espera y se mide una
 * sola vez.
 *
 * Es estado de módulo y no de componente porque `document.fonts.ready` resuelve
 * una vez por carga de página: montar el lector por segunda vez no tiene que
 * volver a esperar nada.
 */
let fuentesListas = !document.fonts?.ready;
const esperaFuentes = fuentesListas ? null : document.fonts.ready.then(() => (fuentesListas = true));

const useFuentesListas = () => {
  const [listas, setListas] = useState(fuentesListas);

  useLayoutEffect(() => {
    if (listas) return;
    let vigente = true;
    esperaFuentes?.then(() => vigente && setListas(true));
    return () => {
      vigente = false;
    };
  }, [listas]);

  return listas;
};

/**
 * @param {string[]} piezas   Un HTML por capítulo, en orden (ver `prosa.js`).
 * @param {number} ancho      Ancho útil de la caja de texto, en px.
 * @param {number} altoUtil   Alto útil de la caja de texto, en px.
 * @param {string} firma      Cualquier cosa que, al cambiar, invalide lo medido
 *                            (cuerpo de letra, Strong visible, idioma...).
 * @returns {{cortes: number[], altoContenido: number, marcas: object[], medidorRef: object, listo: boolean}}
 */
export const usePaginator = (piezas, ancho, altoUtil, firma) => {
  const medidorRef = useRef(null);
  const fuentes = useFuentesListas();

  /*
   * Lo medido, por pieza.
   *
   * La clave del mapa es el HTML de la pieza: dos capítulos distintos nunca
   * coinciden, y el mismo capítulo con el aparato crítico encendido es otro
   * HTML, así que la clave sola ya distingue los casos que hay que distinguir
   * dentro de una misma firma.
   *
   * Va en estado y no en una ref, y cada ronda de medición crea un mapa nuevo
   * en vez de mutar el de antes: así el `useMemo` de abajo puede depender de él
   * y recalcular cuando toca. Copiar un mapa de una docena de entradas no se
   * nota; no enterarse de que hay medidas nuevas, sí.
   *
   * `firma` acompaña al mapa porque al cambiar el ancho o el cuerpo de letra lo
   * medido deja de valer entero, y hay que saber distinguir "mapa vacío" de
   * "mapa de otra maqueta".
   */
  const [medido, setMedido] = useState({ firma: null, mapa: new Map() });

  const clave = `${firma}|${ancho}`;

  useLayoutEffect(() => {
    const medidor = medidorRef.current;
    if (!medidor || !fuentes || ancho <= 0 || altoUtil <= 0 || !piezas.length) return;

    const vigente = medido.firma === clave ? medido.mapa : null;

    /*
     * El mapa se REHACE con las piezas de ahora, en vez de irle añadiendo las
     * que falten.
     *
     * Acumulando, el mapa se quedaba con todo lo medido en la sesión: quien
     * anda saltando de Juan a Génesis y a Salmos va dejando atrás una lista de
     * renglones por capítulo (y la de Salmos 119 son ciento setenta y seis
     * versículos) que ya no se va a volver a mirar. Rehacerlo lo deja en el
     * tamaño de la cadena que se está leyendo y no cuesta nada: lo que ya
     * estaba medido se reaprovecha tal cual, solo se mide lo que entra nuevo.
     *
     * `unicas` en vez de `piezas` porque el mapa indexa por contenido: si dos
     * piezas fueran iguales, el mapa tendría una entrada menos que la lista y
     * la comprobación de "ya está todo" no se cumpliría jamás, dejando este
     * efecto midiendo en bucle.
     */
    const unicas = new Set(piezas);
    if (vigente && vigente.size === unicas.size && [...unicas].every((pieza) => vigente.has(pieza))) return;

    const mapa = new Map();
    for (const pieza of unicas) mapa.set(pieza, vigente?.get(pieza) ?? medirPieza(medidor, pieza));

    setMedido({ firma: clave, mapa });
  }, [piezas, clave, ancho, altoUtil, fuentes, medido]);

  /*
   * El reparto completo, armado en JS a partir de lo ya medido.
   *
   * Aquí no se toca el DOM: se van acumulando los altos de cada pieza y se
   * desplazan sus renglones. Son unas cuantas centenas de sumas, frente a las
   * miles de consultas de maquetado que costaba medir de nuevo.
   */
  return useMemo(() => {
    const mapa = medido.firma === clave ? medido.mapa : null;
    const medidas = piezas.map((pieza) => mapa?.get(pieza));

    // Mientras falte alguna pieza por medir, el reparto anterior es mentira: se
    // devuelve vacío y el libro espera un fotograma más.
    if (!medidas.length || medidas.some((medida) => !medida)) {
      return { cortes: [0], altoContenido: 0, marcas: [], medidorRef, listo: false };
    }

    const renglones = [];
    const marcas = [];
    let desplazamiento = 0;

    for (const medida of medidas) {
      marcas.push({ capitulo: medida.capitulo, top: desplazamiento });
      for (const renglon of medida.renglones) {
        renglones.push({ arriba: renglon.arriba + desplazamiento, abajo: renglon.abajo + desplazamiento });
      }
      desplazamiento += medida.alto;
    }

    // El alto del contenido termina en el último RENGLÓN, no en la última caja:
    // el hueco que deja el flotante del numeral capitular por debajo del texto
    // no es contenido y no debe generar hoja.
    const ultima = medidas[medidas.length - 1];
    const altoContenido = desplazamiento - ultima.alto + ultima.altoTexto;

    return { cortes: calcularCortes(renglones, altoUtil), altoContenido, marcas, medidorRef, listo: true };
  }, [piezas, altoUtil, medido, clave]);
};
