import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANCHO, ALTO } from "../utils/mapaProyeccion";

/**
 * Zoom y desplazamiento del mapa del atlas.
 *
 * Sin esto el mapa era ilegible en el móvil, que es donde se usa: 44 grados de
 * longitud en 360 píxeles son 8 píxeles por grado, así que Cafarnaúm, Betsaida
 * y Tiberias caían en el mismo punto con las tres etiquetas encima.
 *
 * ---------------------------------------------------------------------------
 * Se mueve el `viewBox`, no el contenido
 * ---------------------------------------------------------------------------
 * La alternativa era un `transform: scale()` sobre un grupo. Se descartó porque
 * escala TODO por igual: al acercarte, los marcadores se vuelven pelotas y las
 * etiquetas, carteles. Moviendo la ventana del `viewBox` el mapa crece y los
 * marcadores se compensan con `escala`, que es como se comporta un mapa de
 * verdad: te acercas al terreno, no a los iconos.
 *
 * ---------------------------------------------------------------------------
 * Punteros, no eventos táctiles
 * ---------------------------------------------------------------------------
 * `PointerEvent` cubre dedo, ratón y lápiz con el mismo código. Con `touch` +
 * `mouse` por separado harían falta dos implementaciones que se pisan en los
 * portátiles con pantalla táctil.
 */

/** Cuánto se puede acercar. Más allá el mapa de 50 m no tiene detalle que dar. */
const MAX_ZOOM = 8;

/** Paso de los botones y del doble toque. */
const PASO = 1.6;

const RELACION = ALTO / ANCHO;

/**
 * Encaja la ventana dentro del mapa.
 *
 * El alto se DERIVA del ancho para que la relación no se deforme: si se
 * dejaran libres, un pellizco en diagonal estiraría el mapa.
 */
const limitar = ({ x, y, w }) => {
  const ancho = Math.min(ANCHO, Math.max(ANCHO / MAX_ZOOM, w));
  const alto = ancho * RELACION;
  return {
    // Sin este tope la ventana se sale del mapa y queda medio lienzo vacío.
    x: Math.min(Math.max(0, x), ANCHO - ancho),
    y: Math.min(Math.max(0, y), ALTO - alto),
    w: ancho,
    h: alto,
  };
};

const VISTA_INICIAL = { x: 0, y: 0, w: ANCHO, h: ALTO };

/** Distancia entre dos punteros, para el pellizco. */
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const useMapaZoom = () => {
  const svgRef = useRef(null);
  const [vista, setVista] = useState(VISTA_INICIAL);

  /** Punteros activos, por id. Dos a la vez = pellizco. */
  const punteros = useRef(new Map());
  /** Distancia y punto medio del gesto anterior, para calcular el incremento. */
  const gesto = useRef(null);
  /**
   * Píxeles recorridos desde que se apoyó el dedo.
   *
   * El `click` llega DESPUÉS del `pointerup`, así que al arrastrar el mapa el
   * marcador que quedaba debajo al soltar se seleccionaba solo. Con esto el
   * componente puede distinguir un toque de un arrastre que acabó encima.
   */
  const recorrido = useRef(0);

  const rect = () => svgRef.current?.getBoundingClientRect() ?? null;

  /**
   * Acerca o aleja dejando quieto el punto que está bajo el dedo.
   *
   * Es la diferencia entre un zoom que se siente natural y uno que "huye": si
   * se ampliara siempre por el centro, acercarse a Jerusalén la sacaría de la
   * pantalla.
   */
  const acercar = useCallback((factor, clienteX, clienteY) => {
    const caja = rect();
    if (!caja) return;

    // Posición del dedo dentro del lienzo, de 0 a 1.
    const px = caja.width > 0 ? (clienteX - caja.left) / caja.width : 0.5;
    const py = caja.height > 0 ? (clienteY - caja.top) / caja.height : 0.5;

    setVista((previa) => {
      const siguiente = limitar({ x: previa.x, y: previa.y, w: previa.w / factor });
      return limitar({
        x: previa.x + px * (previa.w - siguiente.w),
        y: previa.y + py * (previa.h - siguiente.h),
        w: siguiente.w,
      });
    });
  }, []);

  /** Arrastre, en píxeles de pantalla. */
  const desplazar = useCallback((dx, dy) => {
    const caja = rect();
    if (!caja || caja.width === 0) return;

    setVista((previa) =>
      limitar({
        x: previa.x - dx * (previa.w / caja.width),
        y: previa.y - dy * (previa.h / caja.height),
        w: previa.w,
      })
    );
  }, []);

  const reiniciar = useCallback(() => setVista(VISTA_INICIAL), []);

  /** Botones `+` y `−`: amplían por el centro, que es lo que se está mirando. */
  const acercarCentro = useCallback(
    (factor) => {
      const caja = rect();
      if (!caja) return;
      acercar(factor, caja.left + caja.width / 2, caja.top + caja.height / 2);
    },
    [acercar]
  );

  // --- Gestos --------------------------------------------------------------

  const alBajarPuntero = useCallback((evento) => {
    // La captura mantiene los eventos aunque el dedo salga del mapa a media
    // pasada; sin ella el arrastre se corta al llegar al borde.
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    punteros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    gesto.current = null;
    recorrido.current = 0;
  }, []);

  const alMoverPuntero = useCallback(
    (evento) => {
      const activo = punteros.current.get(evento.pointerId);
      if (!activo) return;

      const anterior = { ...activo };
      punteros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

      const lista = [...punteros.current.values()];

      if (lista.length === 1) {
        const dx = evento.clientX - anterior.x;
        const dy = evento.clientY - anterior.y;
        recorrido.current += Math.hypot(dx, dy);
        desplazar(dx, dy);
        return;
      }

      if (lista.length !== 2) return;

      const [a, b] = lista;
      const separacion = distancia(a, b);
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

      if (gesto.current) {
        // El pellizco mueve y amplía a la vez: primero se sigue el punto medio
        // (arrastre con dos dedos) y luego se aplica el cambio de separación.
        desplazar(medio.x - gesto.current.medio.x, medio.y - gesto.current.medio.y);
        if (gesto.current.separacion > 0) acercar(separacion / gesto.current.separacion, medio.x, medio.y);
      }

      gesto.current = { separacion, medio };
    },
    [acercar, desplazar]
  );

  const alSoltarPuntero = useCallback((evento) => {
    punteros.current.delete(evento.pointerId);
    // Al levantar un dedo del pellizco, el que queda arrancaría un arrastre con
    // un salto enorme si no se olvidara el gesto anterior.
    gesto.current = null;
  }, []);

  /*
   * La rueda va con `addEventListener` y no con `onWheel` porque hay que
   * llamar a `preventDefault`: si no, la página entera se desplaza mientras se
   * intenta ampliar el mapa. React registra `wheel` como pasivo y ahí
   * `preventDefault` no tiene efecto.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const alGirarRueda = (evento) => {
      evento.preventDefault();
      acercar(evento.deltaY < 0 ? PASO : 1 / PASO, evento.clientX, evento.clientY);
    };

    svg.addEventListener("wheel", alGirarRueda, { passive: false });
    return () => svg.removeEventListener("wheel", alGirarRueda);
  }, [acercar]);

  const alDobleClic = useCallback((evento) => acercar(PASO, evento.clientX, evento.clientY), [acercar]);

  /**
   * Cuánto miden los marcadores en unidades del lienzo.
   *
   * Al acercarse la ventana se estrecha, así que un radio multiplicado por esto
   * se mantiene del MISMO tamaño en pantalla. Sin ello, a 8 aumentos los puntos
   * taparían medio mapa.
   */
  const escala = vista.w / ANCHO;

  const gestos = useMemo(
    () => ({
      onPointerDown: alBajarPuntero,
      onPointerMove: alMoverPuntero,
      onPointerUp: alSoltarPuntero,
      onPointerCancel: alSoltarPuntero,
      onDoubleClick: alDobleClic,
    }),
    [alBajarPuntero, alMoverPuntero, alSoltarPuntero, alDobleClic]
  );

  return {
    svgRef,
    viewBox: `${vista.x.toFixed(2)} ${vista.y.toFixed(2)} ${vista.w.toFixed(2)} ${vista.h.toFixed(2)}`,
    escala,
    ampliado: vista.w < ANCHO - 0.5,
    gestos,
    /**
     * `true` si el gesto que acaba de terminar fue un arrastre y no un toque.
     * Lo consultan los marcadores antes de seleccionarse.
     */
    huboArrastre: () => recorrido.current > 6,
    acercarCentro,
    reiniciar,
    PASO,
  };
};
