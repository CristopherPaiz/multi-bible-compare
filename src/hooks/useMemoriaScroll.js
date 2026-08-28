import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Dónde estaba la página, y cuándo hay que volver a ese sitio.
 *
 * Ahora que la referencia vive en la URL, el botón "atrás" del navegador
 * funciona: vuelve al pasaje anterior. Pero volvía al pasaje y NO al punto de
 * la página donde se estaba leyendo, así que había que bajar otra vez a mano.
 *
 * ---------------------------------------------------------------------------
 * Las tres situaciones son distintas y el router ya las distingue
 * ---------------------------------------------------------------------------
 * `useNavigationType()` dice cómo se llegó aquí, y cada caso quiere una cosa:
 *
 *   POP     — atrás o adelante del navegador. Se RESTAURA la altura guardada:
 *             el usuario vuelve a algo que ya había visto y espera encontrarlo
 *             como lo dejó.
 *
 *   PUSH    — pasaje nuevo (paleta, selector de libro, atlas). Se va ARRIBA:
 *             es contenido que no se había visto, y dejarlo a media altura
 *             empieza la lectura por el medio.
 *
 *             Excepción: quien salta desde las referencias cruzadas o la
 *             concordancia YA estaba leyendo, y moverle la página debajo de los
 *             ojos es peor que dejarla quieta. Esas navegaciones piden
 *             `state.mantenerScroll` y se quedan donde están.
 *
 *   REPLACE — el mismo pasaje con otro versículo. Aquí NO se toca nada: cada
 *             clic en un versículo reescribe la URL, y saltar arriba en cada
 *             clic haría la lectura imposible.
 *
 * ---------------------------------------------------------------------------
 * Por qué la restauración es un bucle y no una línea
 * ---------------------------------------------------------------------------
 * Al volver atrás, el capítulo todavía no ha llegado: la página mide unos pocos
 * cientos de píxeles y `scrollTo(0, 4200)` no hace nada porque no hay dónde
 * bajar. Se reintenta cada fotograma hasta que el contenido crece lo suficiente
 * o hasta que se agota el plazo.
 */

/**
 * Alturas por dirección. Es un módulo y no un estado porque tiene que
 * sobrevivir al desmontaje de los componentes: cuando se vuelve a `/compare`,
 * la página se monta de cero y el dato de dónde estábamos ya no existiría.
 */
const posiciones = new Map();

/** Tope de direcciones recordadas. Cada versículo visitado es una entrada. */
const MAXIMO = 40;

/** Plazo para que el contenido cargue y se pueda restaurar la altura. */
const PLAZO_MS = 2500;

const guardar = (clave, valor) => {
  // Se reinserta para que la clave pase al final: al podar se descarta la
  // dirección más antigua, no una que se esté usando.
  posiciones.delete(clave);
  posiciones.set(clave, valor);
  if (posiciones.size > MAXIMO) posiciones.delete(posiciones.keys().next().value);
};

export const useMemoriaScroll = () => {
  const { pathname, search, state } = useLocation();
  const tipo = useNavigationType();

  const clave = `${pathname}${search}`;
  const mantener = Boolean(state?.mantenerScroll);

  /*
   * El navegador trae su propia restauración de scroll, y con contenido que
   * llega por red se equivoca: mide la página vacía. Se apaga para que no pelee
   * con esta.
   */
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previo = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previo;
    };
  }, []);

  // --- Anotar dónde está la página ----------------------------------------
  useEffect(() => {
    let pendiente = 0;

    const anotar = () => {
      pendiente = 0;
      guardar(clave, window.scrollY);
    };

    // Un evento por fotograma como mucho: `scroll` dispara decenas de veces por
    // segundo y no hace falta esa resolución para recordar una altura.
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(anotar);
    };

    window.addEventListener("scroll", alDesplazar, { passive: true });

    return () => {
      window.removeEventListener("scroll", alDesplazar);
      if (pendiente) cancelAnimationFrame(pendiente);
      /*
       * Se anota también AL SALIR. La limpieza corre antes de que el navegador
       * pinte la pantalla nueva, así que `scrollY` todavía es el de la página
       * que se abandona — que es justo el dato que hará falta al volver.
       */
      anotar();
    };
  }, [clave]);

  // --- Colocar la página ---------------------------------------------------
  useEffect(() => {
    // Mismo pasaje, otro versículo: la página no se mueve.
    if (tipo === "REPLACE") return;

    if (tipo === "PUSH") {
      if (!mantener) window.scrollTo(0, 0);
      return;
    }

    const objetivo = posiciones.get(clave);
    if (objetivo === undefined || objetivo === 0) return;

    let raf = 0;
    let cancelado = false;
    const limite = performance.now() + PLAZO_MS;

    /*
     * Si el usuario empieza a moverse por su cuenta, se abandona. Un bucle que
     * insiste durante dos segundos y medio contra alguien que ya está
     * desplazando es peor que no restaurar nada.
     *
     * Se escuchan gestos de intención (rueda, dedo, teclas) y no el evento
     * `scroll`, que también lo dispara nuestro propio `scrollTo`.
     */
    const abandonar = () => {
      cancelado = true;
    };

    const intentar = () => {
      if (cancelado) return;

      window.scrollTo(0, objetivo);

      const llegado = Math.abs(window.scrollY - objetivo) <= 2;
      if (llegado || performance.now() > limite) return;

      raf = requestAnimationFrame(intentar);
    };

    window.addEventListener("wheel", abandonar, { passive: true, once: true });
    window.addEventListener("touchmove", abandonar, { passive: true, once: true });
    window.addEventListener("keydown", abandonar, { once: true });

    raf = requestAnimationFrame(intentar);

    return () => {
      cancelado = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("wheel", abandonar);
      window.removeEventListener("touchmove", abandonar);
      window.removeEventListener("keydown", abandonar);
    };
  }, [clave, tipo, mantener]);
};
