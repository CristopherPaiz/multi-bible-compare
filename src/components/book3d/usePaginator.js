import { useLayoutEffect, useRef, useState } from "react";

/**
 * Reparte un capítulo en hojas SIN cortar ninguna línea por la mitad.
 *
 * El enfoque obvio sería trocear el HTML por versículos y meter N versículos
 * por hoja, pero entonces cada hoja termina donde termina un versículo y el
 * texto deja de fluir: quedan huecos blancos al pie y se pierde el aire de
 * página impresa.
 *
 * Aquí se hace al revés. El capítulo entero se maqueta UNA vez en un medidor
 * invisible con el ancho y la tipografía definitivos, y se le pregunta al
 * navegador dónde cayó cada renglón. Con esa lista de renglones se calcula en
 * qué desplazamiento vertical debe empezar cada hoja; las hojas luego enseñan
 * el mismo contenido recortado a distinta altura.
 *
 * La lista de renglones sale de `Range.getClientRects()`: sobre un nodo de
 * texto devuelve un rectángulo POR LÍNEA VISUAL, ya con el ajuste de línea, la
 * justificación y los guiones aplicados. Es la única forma de saber dónde
 * partió el navegador sin reimplementar su algoritmo de maquetado.
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
 * Empaquetado voraz: se van sumando renglones a la hoja actual hasta que el
 * siguiente no cabe, y ahí empieza hoja nueva.
 *
 * La comparación es contra `abajo` y no contra `arriba` a propósito: lo que no
 * puede rebasar el alto útil es el PIE del renglón. Usando `arriba` entraría un
 * renglón que asoma cortado por debajo del recorte.
 */
/**
 * Dónde empieza cada capítulo dentro del flujo.
 *
 * `capitulosAProsa` deja un marcador de altura cero delante de cada capítulo;
 * aquí se lee su posición para que el titulillo de cada hoja pueda decir a qué
 * capítulo pertenece lo que se está leyendo. Sin esto, con varios capítulos
 * encadenados la cabecera se quedaría clavada en el primero.
 */
const recogerMarcas = (raiz) => {
  const origen = raiz.getBoundingClientRect().top;

  return Array.from(raiz.querySelectorAll("[data-capitulo]"), (nodo) => ({
    capitulo: nodo.dataset.capitulo,
    top: nodo.getBoundingClientRect().top - origen,
  }));
};

const calcularCortes = (renglones, altoUtil) => {
  if (!renglones.length || altoUtil <= 0) return { cortes: [0], altoContenido: 0 };

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

  // El pie del último renglón es el alto real del capítulo maquetado. La hoja
  // final lo necesita para saber dónde termina: sin él tendría que asumir que
  // ocupa la caja entera y volvería a asomar texto por debajo del recorte.
  const altoContenido = renglones[renglones.length - 1].abajo;

  return { cortes, altoContenido };
};

/**
 * @param {string} html      Capítulo ya montado como prosa continua.
 * @param {number} ancho     Ancho útil de la caja de texto, en px.
 * @param {number} altoUtil  Alto útil de la caja de texto, en px.
 * @param {unknown} version  Cualquier valor que, al cambiar, obligue a medir de
 *                           nuevo (cuerpo de letra, Strong visible, tema...).
 * @returns {{cortes: number[], altoContenido: number, marcas: object[], medidorRef: object, listo: boolean}}
 */
export const usePaginator = (html, ancho, altoUtil, version) => {
  const medidorRef = useRef(null);
  const [reparto, setReparto] = useState({ cortes: [0], altoContenido: 0, marcas: [] });
  const [listo, setListo] = useState(false);

  /*
   * `useLayoutEffect` y no `useEffect`: hay que medir después de que el medidor
   * esté maquetado pero ANTES de que el navegador pinte. Con `useEffect` el
   * usuario alcanza a ver un fotograma con la paginación vieja y las hojas dan
   * un salto visible al corregirse.
   */
  useLayoutEffect(() => {
    const medidor = medidorRef.current;
    if (!medidor || !html || ancho <= 0 || altoUtil <= 0) {
      setListo(false);
      return;
    }

    setReparto({ ...calcularCortes(recogerRenglones(medidor), altoUtil), marcas: recogerMarcas(medidor) });
    setListo(true);
  }, [html, ancho, altoUtil, version]);

  /*
   * Las fuentes web llegan después del primer maquetado. Si no se vuelve a
   * medir, los cortes se calcularon con la serif de respaldo (otra métrica,
   * otro número de renglones) y el texto queda descuadrado justo cuando entra
   * EB Garamond. `document.fonts.ready` resuelve una sola vez por carga.
   */
  useLayoutEffect(() => {
    if (!document.fonts?.ready) return;

    let vigente = true;
    document.fonts.ready.then(() => {
      const medidor = medidorRef.current;
      if (!vigente || !medidor || altoUtil <= 0) return;
      setReparto({ ...calcularCortes(recogerRenglones(medidor), altoUtil), marcas: recogerMarcas(medidor) });
    });

    return () => {
      vigente = false;
    };
  }, [html, ancho, altoUtil, version]);

  return { ...reparto, medidorRef, listo };
};
