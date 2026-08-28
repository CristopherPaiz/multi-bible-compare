import { useCallback, useContext, useEffect, useRef, useState } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { codigoDeVersion, idiomaDeVersion } from "../utils/versiones";
import { nombreCortoVersion } from "../utils/exportar";

/**
 * Índice lateral de las versiones abiertas, para móvil.
 *
 * En el teléfono los paneles caen en UNA columna, así que con ocho versiones
 * abiertas leer la octava son ocho pantallas de desplazamiento y volver a la
 * primera, otras ocho. La barra de desplazamiento del navegador no ayuda:
 * indica cuánto queda de página, no en qué versión estás.
 *
 * Esto es esa barra pero sabiendo lo que hay dentro. Cada segmento es una
 * versión, en su orden; el segmento de la que se está viendo va marcado, y
 * arrastrar por la tira lleva directo a cualquiera.
 *
 * ---------------------------------------------------------------------------
 * Por qué a partir de cinco
 * ---------------------------------------------------------------------------
 * Con cuatro o menos, la página cabe casi en una pantalla y la tira sería un
 * mando para un viaje que no existe: ocuparía sitio y taparía texto para
 * ahorrar un gesto de desplazamiento. Aparece cuando el problema aparece.
 *
 * ---------------------------------------------------------------------------
 * Instantáneo al arrastrar, suave al tocar
 * ---------------------------------------------------------------------------
 * Son dos intenciones distintas. Al arrastrar se está BUSCANDO, y el texto
 * tiene que seguir al dedo: un desplazamiento suave llegaría tarde y la tira
 * respondería a algo que el dedo ya dejó atrás. Al tocar se está SALTANDO a un
 * sitio concreto, y ahí la animación es lo que deja ver que la página se movió
 * y hacia dónde.
 */

/** A partir de cuántas versiones tiene sentido el índice. */
const MINIMO = 5;

/*
 * -----------------------------------------------------------------------------
 * Cuándo se asoma
 * -----------------------------------------------------------------------------
 * Permanente no puede estar: va por encima del texto, y reservarle sitio
 * costaba 56 px de ancho fijos —en un móvil, una sexta parte de la línea— para
 * un control que casi nunca se usa.
 *
 * Así que aparece cuando hace falta y se va solo. "Hace falta" es una intención
 * concreta: alguien que quiere RECORRER la página, no leerla. Eso se distingue
 * por dos cosas a la vez, y las dos son necesarias:
 *
 *   - Velocidad. Leer y avanzar despacio no es buscar.
 *   - Distancia recorrida en la misma ráfaga. Un golpe de dedo corto pero
 *     brusco —pasar de un versículo al siguiente— es rápido y no es un viaje.
 *
 * Con una sola de las dos saldría cada vez que alguien pasa la página.
 */

/** px/ms. 0.9 son ~900 px/s: bastante más de lo que se desplaza leyendo. */
const VELOCIDAD_MINIMA = 0.9;

/** Recorrido acumulado en la ráfaga antes de darla por "viaje". */
const DISTANCIA_MINIMA = 500;

/** Un hueco mayor que esto entre dos eventos empieza una ráfaga nueva. */
const PAUSA_MS = 250;

/** Lo que sigue visible tras dejar de desplazar, para poder agarrarlo. */
const OCULTAR_MS = 1400;

const IndiceBiblias = () => {
  const { bibliasSeleccionadas } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const [activo, setActivo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [asomado, setAsomado] = useState(false);
  const tiraRef = useRef(null);

  /** Estado de la ráfaga de desplazamiento en curso. */
  const rafaga = useRef({ y: 0, t: 0, recorrido: 0 });
  const temporizadorOcultar = useRef(0);

  /*
   * Mientras el dedo está en la tira NO se puede ocultar, y el propio arrastre
   * genera desplazamiento que reiniciaría el temporizador en bucle. Se guarda
   * en un ref porque lo consulta el manejador de scroll, que vive fuera del
   * render.
   */
  const arrastrandoRef = useRef(false);

  const asomar = useCallback(() => {
    setAsomado(true);
    clearTimeout(temporizadorOcultar.current);
    if (arrastrandoRef.current) return;
    temporizadorOcultar.current = setTimeout(() => setAsomado(false), OCULTAR_MS);
  }, []);

  useEffect(() => () => clearTimeout(temporizadorOcultar.current), []);

  const total = bibliasSeleccionadas.length;
  const visible = total >= MINIMO;

  /** El `<article>` de una versión, localizado por su código corto. */
  const panelDe = useCallback((indice) => {
    const codigo = codigoDeVersion(bibliasSeleccionadas[indice]);
    return codigo ? document.querySelector(`[data-panel="${codigo}"]`) : null;
  }, [bibliasSeleccionadas]);

  /*
   * Qué versión se está viendo: la que tenga su centro más cerca del centro de
   * la pantalla. Con el borde superior se marcaría la de arriba incluso cuando
   * ya solo se ve su última línea.
   */
  useEffect(() => {
    if (!visible) return;

    let pendiente = 0;

    const medir = () => {
      pendiente = 0;
      const centro = window.innerHeight / 2;
      let mejor = 0;
      let menorDistancia = Infinity;

      for (let i = 0; i < total; i++) {
        const panel = panelDe(i);
        if (!panel) continue;
        const caja = panel.getBoundingClientRect();
        const distancia = Math.abs(caja.top + caja.height / 2 - centro);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          mejor = i;
        }
      }

      setActivo(mejor);
    };

    /*
     * Además de recalcular la versión activa, cada evento mide la ráfaga.
     *
     * Va aquí y no en un oyente aparte porque `scroll` ya es el evento más
     * ruidoso de la página: dos suscriptores harían el doble de trabajo por el
     * mismo dato.
     */
    const medirRafaga = () => {
      const ahora = performance.now();
      const y = window.scrollY;

      const dt = ahora - rafaga.current.t;
      const dy = Math.abs(y - rafaga.current.y);

      // Primer evento tras montar: no hay con qué comparar.
      if (rafaga.current.t === 0) {
        rafaga.current = { y, t: ahora, recorrido: 0 };
        return;
      }

      // Un hueco largo significa que el usuario paró: lo que venga es un gesto
      // nuevo y su recorrido empieza de cero.
      const recorrido = dt > PAUSA_MS ? dy : rafaga.current.recorrido + dy;
      rafaga.current = { y, t: ahora, recorrido };

      if (dt <= 0) return;

      const velocidad = dy / dt;
      if (velocidad >= VELOCIDAD_MINIMA && recorrido >= DISTANCIA_MINIMA) asomar();
    };

    // Un fotograma como mucho: `scroll` dispara decenas de veces por segundo y
    // cada pasada mide N cajas.
    const alDesplazar = () => {
      medirRafaga();
      if (!pendiente) pendiente = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar, { passive: true });

    return () => {
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, [visible, total, panelDe, asomar]);

  const irA = useCallback(
    (indice, suave) => {
      panelDe(indice)?.scrollIntoView({ block: "center", behavior: suave ? "smooth" : "auto" });
    },
    [panelDe]
  );

  /**
   * Segmento sobre el que está el dedo.
   *
   * Se mide contra la LISTA y no contra el contenedor: el contenedor lleva
   * relleno para agrandar el área de toque, y contarlo desplazaría el cálculo
   * medio segmento.
   */
  const indiceDesdeY = (clientY) => {
    const caja = tiraRef.current?.getBoundingClientRect();
    if (!caja || caja.height === 0) return 0;
    const proporcion = (clientY - caja.top) / caja.height;
    return Math.min(total - 1, Math.max(0, Math.floor(proporcion * total)));
  };

  /** Golpecito al cambiar de versión. En iOS no existe y se ignora solo. */
  const vibrar = () => {
    try {
      navigator.vibrate?.(8);
    } catch {
      // Algunos navegadores lo exponen y lo prohíben; no es motivo para nada.
    }
  };

  const alBajarPuntero = (evento) => {
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    arrastrandoRef.current = true;
    setArrastrando(true);
    asomar();
    const indice = indiceDesdeY(evento.clientY);
    setActivo(indice);
    vibrar();
    irA(indice, true);
  };

  const alMoverPuntero = (evento) => {
    if (!arrastrando) return;
    const indice = indiceDesdeY(evento.clientY);
    if (indice === activo) return;
    setActivo(indice);
    vibrar();
    irA(indice, false);
  };

  const alSoltarPuntero = () => {
    arrastrandoRef.current = false;
    setArrastrando(false);
    // Se reinicia la cuenta atras: al soltar vuelve a poder esconderse.
    asomar();
  };

  if (!visible) return null;

  const versionActiva = bibliasSeleccionadas[activo];

  return (
    /*
      ---------------------------------------------------------------------
      SEPARADA DEL BORDE A PROPÓSITO
      ---------------------------------------------------------------------
      Pegada a `right-0` la tira caía dentro de la franja del gesto de
      retroceso de Android (unos 20dp desde cada borde). Ahí el sistema se
      queda el toque ANTES de que llegue a la página: no era que el toque no
      funcionara, es que nunca llegaba. `touch-action` no ayuda; eso lo
      decide el sistema, no el navegador.

      Con `right-3` el control arranca 12 px adentro y su cuerpo queda fuera
      de la franja.

      `sm:hidden` porque en escritorio los paneles van en varias columnas y
      casi siempre caben: allí sería un mando para un problema que no hay.

      `touch-none` para que arrastrar sobre la tira no desplace además la
      página: el dedo movería las dos cosas a la vez y pelearían.
    */
    <div
      onPointerDown={alBajarPuntero}
      onPointerMove={alMoverPuntero}
      onPointerUp={alSoltarPuntero}
      onPointerCancel={alSoltarPuntero}
      role="navigation"
      aria-label={t("IndiceBiblias")}
      /*
        Se desvanece en vez de desmontarse: montarlo de golpe lo haría aparecer
        a tirones a mitad de un desplazamiento rápido, que es justo cuando se
        nota. `pointer-events-none` mientras está oculto para que no intercepte
        toques destinados al texto que hay debajo.

        El desplazamiento lateral acompaña al desvanecido: entra desde el borde,
        que es de donde viene.
      */
      className={`fixed right-3 top-1/2 z-30 flex -translate-y-1/2 touch-none select-none items-center rounded-full border border-black/10 bg-white/85 py-2 shadow-lg backdrop-blur transition-[opacity,transform] duration-200 dark:border-white/10 dark:bg-neutral-900/85 sm:hidden ${
        asomado ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"
      }`}
    >
      {/*
        Cada versión es una fila de 24 px de alto y 40 px de ancho. La barrita
        que se ve es mucho menor, pero lo que hay que poder tocar es la fila:
        antes el objetivo real medía 2 px de ancho.
      */}
      <div ref={tiraRef} className="flex w-10 flex-col">
        {bibliasSeleccionadas.map((biblia, indice) => (
          <span key={biblia} aria-hidden="true" className="flex h-6 items-center justify-center">
            <span
              className={`block rounded-full transition-all ${
                indice === activo ? "h-2.5 w-6 bg-amber-500 dark:bg-purple-400" : "h-1.5 w-4 bg-neutral-400/70 dark:bg-neutral-500/70"
              }`}
            ></span>
          </span>
        ))}
      </div>

      {/*
        La etiqueta solo aparece mientras se arrastra. Fija sería un cartel
        permanente encima del texto para decir algo que ya dice la cabecera del
        panel que tienes delante.
      */}
      {arrastrando && versionActiva && (
        <span className="pointer-events-none absolute right-full top-1/2 mr-2 max-w-[60vw] -translate-y-1/2 truncate rounded-lg bg-neutral-900/90 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg dark:bg-neutral-100/95 dark:text-neutral-900">
          {idiomaDeVersion(versionActiva)} · {nombreCortoVersion(versionActiva)}
        </span>
      )}
    </div>
  );
};

export default IndiceBiblias;
