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

/** A partir de cuántas versiones aparece la tira. */
const MINIMO = 5;

const IndiceBiblias = () => {
  const { bibliasSeleccionadas } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const [activo, setActivo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const tiraRef = useRef(null);

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

    // Un fotograma como mucho: `scroll` dispara decenas de veces por segundo y
    // cada pasada mide N cajas.
    const alDesplazar = () => {
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
  }, [visible, total, panelDe]);

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
    setArrastrando(true);
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

  const alSoltarPuntero = () => setArrastrando(false);

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
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 touch-none select-none items-center rounded-full border border-black/10 bg-white/85 py-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/85 sm:hidden"
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
