import { useRef, useEffect, useCallback, useContext, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { traducir } from "../services/translateSource";
import "../styles/BibleMarkup.css";
import MarkupTab from "./MarkupTab";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import AnotacionesContext from "../context/AnotacionesContext";
import { CLASES_COLOR } from "../utils/paletaAnotaciones";
import { codigoDeVersion } from "../utils/versiones";
import { marcarDiferencias } from "../utils/diffVersiones";
import TRANSLATE from "/translation.png";
import SHARE from "/share.png";

/**
 * Estilos de los números Strong incrustados en el versículo.
 *
 * Dos detalles que importan:
 *
 * 1. `[&_sup:hover]:` y NO `[&_sup]:hover:`. El segundo compila a
 *    `.contenedor:hover sup`, o sea que al pasar el cursor por CUALQUIER parte
 *    del versículo se resaltaban TODOS los números a la vez.
 *
 * 2. `inline-block` + padding. Un <sup> es texto en superíndice: diminuto, y su
 *    área de clic también. Con padding el objetivo crece sin mover el texto
 *    (el margen negativo compensa), así deja de fallar el clic.
 */
/**
 * `<pb/>` marca inicio de párrafo, pero en HTML una etiqueta desconocida NO
 * puede auto-cerrarse: el navegador parsea `<pb/>A<pb/>B` como
 * `<pb>A<pb>B</pb></pb>`, anidando y envolviendo todo el resto del versículo.
 *
 * Se cambia por un <span> vacío (elemento conocido y con cierre explícito),
 * que la hoja de estilos convierte en un salto de bloque.
 */
/** Tope total de una traducción antes de rendirse y dejar el texto original. */
const TIEMPO_MAXIMO_MS = 30000;

const normalizarMarcado = (html) =>
  String(html ?? "")
    // Un salto de párrafo AL INICIO del versículo no separa nada: lo único que
    // hacía era empujar el texto al renglón de abajo, dejando el número del
    // versículo solo en su propia línea.
    .replace(/^(?:\s|\\par\b|<pb\s*\/?>)+/i, "")
    .replace(/\\par\b/gi, '<span class="salto-parrafo"></span>')
    .replace(/<pb\s*\/?>/gi, '<span class="salto-parrafo"></span>');

const CLASES_STRONG = [
  "[&_sup]:cursor-pointer",
  "[&_sup]:inline-block",
  // El preflight de Tailwind pone `sub, sup { line-height: 0 }`. Con eso la
  // caja del <sup> mide 0px de alto y el clic solo pegaba en los píxeles de
  // los dígitos. Se le devuelve una altura real.
  "[&_sup]:leading-[1.3]",
  "[&_sup]:px-[3px]",
  "[&_sup]:mx-[-1px]",
  "[&_sup]:rounded",
  "[&_sup]:font-semibold",
  "[&_sup]:text-blue-600",
  "[&_sup]:transition-colors",
  "[&_sup:hover]:bg-blue-100",
  "[&_sup:hover]:underline",
  "dark:[&_sup]:text-blue-400",
  "dark:[&_sup:hover]:bg-blue-900",
].join(" ");

/**
 * Caja común de los botones del encabezado. Son iconos de distinto tamaño y
 * antes cada uno traía su propio margen suelto (`mt-3 mr-3`, `mt-1 mr-1`), así
 * que ninguno quedaba alineado con el de al lado.
 */
const BOTON_ICONO = "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10";

/** "034. Español - Biblia ccc" -> { idioma: "Español", version: "Biblia cc" } */
const partirNombre = (nombre) => {
  const idioma = nombre.split(".")[1]?.split("-")[0]?.trim() ?? "";
  const version = nombre.split("-")[1]?.replace("ccc", "cc").trim() || nombre;
  return { idioma, version };
};

const VerseSingle = ({ texto, nombre, iso, cargando = false, bookId }) => {
  const {
    versiculoSeleccionadoNumero,
    setVersiculoSeleccionadoNumero,
    setCompartirVerse,
    tamanioVerseAlto,
    mostrarStrongPopup,
    leerMarcado,
    libroSeleccionado,
    capituloSeleccionadoNumero,
    diferenciasPorBiblia,
    claseTamanoTexto,
    versionDestacada,
    destacarVersion,
  } = useContext(DataContext);
  const { idiomaNavegador, t } = useContext(LanguageContext);
  const { colorDe, notasDe } = useContext(AnotacionesContext);

  /**
   * Palabras que ESTA versión usa y las demás no. `null` cuando el modo está
   * apagado o no hay con qué comparar; el cálculo vive en el contexto porque
   * necesita ver los textos de todos los paneles a la vez.
   */
  const diferencias = diferenciasPorBiblia?.get(nombre) ?? null;

  /**
   * Traducciones hechas en este panel, indexadas por número de versículo.
   *
   * Antes se guardaba una copia completa del capítulo y se reemplazaba entera,
   * así que al cambiar de versículo se perdía lo traducido. Con un mapa aparte
   * las traducciones se acumulan y conviven con el texto original.
   */
  const [traducciones, setTraducciones] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorTraduccion, setErrorTraduccion] = useState(false);
  // Número del versículo que se está traduciendo ahora mismo. Solo ESE lleva el
  // esqueleto; antes se cubría el panel entero con una capa.
  const [versiculoTraduciendo, setVersiculoTraduciendo] = useState(null);

  // El aviso de fallo se retira solo: es informativo, no requiere acción.
  useEffect(() => {
    if (!errorTraduccion) return;
    const id = setTimeout(() => setErrorTraduccion(false), 4000);
    return () => clearTimeout(id);
  }, [errorTraduccion]);

  const containerRef = useRef(null);

  // Qué marcado trae ESTE texto. Se calcula aquí y no en el contexto porque la
  // pestaña es de este panel: un cuadro sin glosa no debe mostrarla.
  const marcado = useMemo(() => {
    if (typeof texto !== "object" || texto === null) return { morfologia: false, glosa: false };
    const crudo = Object.values(texto).join("");
    return { morfologia: /<m>/i.test(crudo), glosa: /<n>/i.test(crudo) };
  }, [texto]);

  const preferencia = leerMarcado(nombre);

  const esCapitulo = typeof texto === "object" && texto !== null;

  const { idioma: idiomaEtiqueta, version } = partirNombre(nombre);

  /** Lo que se pinta: el original con las traducciones encima. */
  const textoVisible = useMemo(() => (esCapitulo ? { ...texto, ...traducciones } : texto), [texto, traducciones, esCapitulo]);

  const estaTraducido = Boolean(traducciones[versiculoSeleccionadoNumero]);
  const puedeTraducir = iso !== "no" && esCapitulo && idiomaNavegador !== iso;

  // `true` mientras no haya ni un versículo que pintar.
  const sinContenido = !textoVisible || (esCapitulo && Object.keys(texto).length === 0);

  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
    },
    [setVersiculoSeleccionadoNumero],
  );

  // Las traducciones son de ESTE capítulo: al cambiar de libro o capítulo se
  // descartan, pero NO al cambiar de versículo dentro del mismo.
  useEffect(() => {
    setTraducciones({});
  }, [libroSeleccionado, capituloSeleccionadoNumero]);

  const centerText = useCallback(() => {
    if (containerRef.current && versiculoSeleccionadoNumero) {
      const highlightedVerse = containerRef.current.querySelector(`[data-verse="${versiculoSeleccionadoNumero}"]`);
      if (highlightedVerse) {
        const containerHeight = containerRef.current.clientHeight;
        const verseHeight = highlightedVerse.clientHeight;

        const verseOffsetTop = highlightedVerse.offsetTop;
        const scrollTop = verseOffsetTop - containerHeight / 2 + verseHeight / 2;

        containerRef.current.scrollTop = scrollTop;
      }
    }
  }, [versiculoSeleccionadoNumero]);

  useEffect(() => {
    centerText();
  }, [textoVisible, centerText]);

  /**
   * Los números Strong van dentro del HTML del versículo como `<sup>2424 </sup>`,
   * así que no se les puede poner un onClick por elemento sin dejar de usar
   * `dangerouslySetInnerHTML`. Se delega: se escucha el clic en el contenedor y
   * se mira si el objetivo era un <sup>.
   *
   * Se determina si es Hebreo (H) o Griego (G) considerando la versión (ej. Septuaginta /
   * Filos Pergamos en el AT es griega), el alfabeto del texto y el testamento.
   */
  const handleStrongClick = useCallback(
    (evento) => {
      const sup = evento.target.closest?.("sup");
      if (!sup) return;

      const numero = sup.textContent.replace(/\D/g, "");
      if (!numero) return;

      evento.stopPropagation();

      const nombreLower = (nombre || "").toLowerCase();
      const esGriegoPorVersion = iso === "el" || iso === "grc" || nombreLower.includes("greek") || nombreLower.includes("griego") || nombreLower.includes("septuagint") || nombreLower.includes("lxx");

      const esHebreoPorVersion =
        iso === "iw" ||
        iso === "he" ||
        nombreLower.includes("hebrew") ||
        nombreLower.includes("hebreo") ||
        nombreLower.includes("stuttgartensia") ||
        nombreLower.includes("wlc") ||
        nombreLower.includes("tanakh");

      const contenedorTexto = sup.parentElement?.textContent || "";
      const tieneGriego = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(contenedorTexto);
      const tieneHebreo = /[\u0590-\u05FF]/.test(contenedorTexto);

      let prefijo = Number(bookId) <= 39 ? "H" : "G";
      if (esGriegoPorVersion || (tieneGriego && !tieneHebreo)) {
        prefijo = "G";
      } else if (esHebreoPorVersion || (tieneHebreo && !tieneGriego)) {
        prefijo = "H";
      }

      const code = `${prefijo}${Number(numero)}`;
      const rect = sup.getBoundingClientRect();
      mostrarStrongPopup(code, rect);
    },
    [bookId, iso, nombre, mostrarStrongPopup],
  );

  const handleTranslate = async (iso) => {
    if (iso === "no" || !versiculoSeleccionadoNumero) {
      return;
    }

    const idiomaVersoTranslate = iso.toString();
    const idiomaNavegadorTranslate = idiomaNavegador;
    const verso = texto?.[versiculoSeleccionadoNumero];

    setIsTranslating(true);
    setErrorTraduccion(false);
    setVersiculoTraduciendo(versiculoSeleccionadoNumero);

    // Tope duro de 30 s para TODA la traducción. Si se pasa, se deja el texto
    // como estaba y se avisa: mejor eso que un esqueleto girando para siempre.
    const abortador = new AbortController();
    const corte = setTimeout(() => abortador.abort(), TIEMPO_MAXIMO_MS);

    try {
      // El servicio limpia el markup `<sup>` por su cuenta: traducir los
      // números Strong incrustados devolvía basura.
      const resultado = await traducir({
        texto: verso,
        desde: idiomaVersoTranslate,
        hacia: idiomaNavegadorTranslate,
        signal: abortador.signal,
      });
      setTraducciones((previo) => ({ ...previo, [versiculoSeleccionadoNumero]: resultado }));
      centerText();
    } catch (error) {
      // Al abortar no se toca `traducciones`, así que el versículo se queda
      // exactamente con lo que tenía antes.
      console.error("No se pudo traducir el versículo:", error);
      setErrorTraduccion(true);
    } finally {
      clearTimeout(corte);
      setIsTranslating(false);
      setVersiculoTraduciendo(null);
    }
  };

  /*
   * ------------------------------------------------------------------------
   * "Esta es la versión que buscabas"
   * ------------------------------------------------------------------------
   * Al llegar desde Buscar, este panel puede ser el que dio el resultado. Se
   * desplaza a la vista y destella una vez.
   *
   * Se espera a que el texto esté cargado: con el esqueleto puesto el panel
   * mide otra cosa, y centrarlo entonces deja el sitio equivocado en cuanto
   * llega el capítulo y la tarjeta crece.
   */
  const articuloRef = useRef(null);
  const destacado = versionDestacada === nombre;

  useEffect(() => {
    if (!destacado || cargando) return undefined;

    // Un fotograma de margen: el navegador tiene que haber pintado el texto
    // para que `scrollIntoView` mida la altura definitiva.
    const fotograma = requestAnimationFrame(() => {
      articuloRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    /*
     * La señal la apaga el panel, no quien la encendió: hasta aquí no se sabía
     * cuándo iba a existir esta tarjeta —el capítulo viaja por red— y apagarla
     * a ciegas desde la búsqueda dejaba el destello sin ver cuando el backend
     * tardaba en despertar.
     *
     * 3.8s = las dos pasadas de la animación (1.8s cada una) con margen.
     */
    const apagar = setTimeout(() => destacarVersion(null), 3800);

    return () => {
      cancelAnimationFrame(fotograma);
      clearTimeout(apagar);
    };
  }, [destacado, cargando, destacarVersion]);

  /** Descarta la traducción de este versículo y deja el original. */
  const revertirTraduccion = () => {
    setTraducciones((previo) => {
      const copia = { ...previo };
      delete copia[versiculoSeleccionadoNumero];
      return copia;
    });
    setErrorTraduccion(false);
  };

  return (
    /*
      `data-panel` con el código corto de la versión: es el ancla que usa el
      índice lateral para saltar a este panel. Va el código y no el nombre de
      carpeta porque ese nombre lleva puntos, paréntesis y acentos, y como
      selector CSS habría que escaparlo entero.

      El contraste de la tarjeta: en claro era blanca sobre un fondo blanco, con
      un borde tan tenue que los paneles se fundían con la página y entre sí. El
      texto se queda blanco —es papel, y es lo que se lee—, pero el borde sube a
      `neutral-300` y la sombra a `shadow-md` para que el recorte se vea. En
      oscuro pasa lo contrario: la tarjeta es más oscura que la página, así que
      lo que separa es aclarar el borde.
    */
    <article
      ref={articuloRef}
      data-panel={codigoDeVersion(nombre) ?? ""}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-md transition-shadow hover:shadow-lg dark:border-neutral-700 dark:bg-[#0d0d10] ${
        destacado ? "panel-destacado" : ""
      }`}
    >
      {/*
        El nombre de la versión se trunca a una línea a propósito: si envolviera,
        cada encabezado mediría distinto y las cabeceras de la rejilla dejarían
        de alinearse entre sí. El nombre completo queda en el `title`.
      */}
      <header className="flex items-center justify-between gap-2 border-b border-neutral-500 bg-neutral-200 px-3 py-2 dark:border-neutral-700 dark:bg-[#191820]">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{idiomaEtiqueta}</p>
          <h2 title={version} className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {version}
          </h2>
        </div>

        {esCapitulo && (
          <div className="flex shrink-0 items-center gap-0.5">
            <MarkupTab biblia={nombre} tieneMorfologia={marcado.morfologia} tieneGlosa={marcado.glosa} />
            <button type="button" className={BOTON_ICONO} onClick={() => setCompartirVerse(texto, versiculoSeleccionadoNumero, nombre, traducciones[versiculoSeleccionadoNumero] ?? null)}>
              <img className="h-[18px] w-[18px] dark:invert" src={SHARE} alt="Share verse from Biblian" />
            </button>
            {/* El mismo botón traduce o revierte según el estado del versículo
                actual, para no añadir un icono más al encabezado. */}
            {puedeTraducir && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => (estaTraducido ? revertirTraduccion() : handleTranslate(iso))}
                title={estaTraducido ? t("VerOriginal") : t("Traducir")}
                aria-label={estaTraducido ? t("VerOriginal") : t("Traducir")}
                className={BOTON_ICONO}
              >
                <img className={`h-[18px] w-[18px] dark:invert ${isTranslating ? "animate-pulse" : ""}`} src={TRANSLATE} alt="" />
                {estaTraducido && <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-neutral-100 dark:ring-neutral-900"></span>}
              </button>
            )}
          </div>
        )}
      </header>

      {/*
        `relative` no es decorativo: `centerText` centra el versículo con
        `offsetTop`, que se mide contra el ancestro posicionado más cercano. Sin
        esto se mediría contra la página y el scroll saltaría a otro lado.
      */}
      {/*
        Sin `flex-1` a propósito: en un contenedor flex vertical, `flex: 1 1 0%`
        ignora la altura declarada y el panel crecía hasta abarcar el capítulo
        entero (miles de píxeles) en vez de quedarse en su alto fijo y hacer
        scroll dentro.
      */}
      <div ref={containerRef} className={`no-scrollbarVerse relative overflow-y-auto px-3 py-3 ${claseTamanoTexto} ${esCapitulo ? tamanioVerseAlto : "h-fit"}`}>
        {cargando && sinContenido ? (
          // Esqueleto mientras no hay nada que mostrar: primera carga y
          // cambio de capítulo (`VerseWindow` vacía el texto al empezar a
          // pedir el nuevo). Cambiar de versículo NO recarga nada, así que
          // el texto nunca se tapa con una capa gris al leer.
          <div className="flex flex-col gap-3 py-1" aria-hidden="true">
            {[90, 100, 96, 82, 94, 70].map((ancho, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" style={{ width: `${ancho}%`, animationDelay: `${i * 80}ms` }}></div>
            ))}
          </div>
        ) : esCapitulo ? (
          Object.entries(textoVisible)
            .sort(([keyA], [keyB]) => keyA - keyB)
            .map(([versiculo, contenido]) => {
              const seleccionado = parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero);

              // El resaltado y las notas son del VERSÍCULO, no de la versión:
              // subrayar Juan 3:16 lo subraya en los seis paneles, porque lo
              // que el usuario marcó fue el pasaje y no una traducción suya.
              const color = colorDe(bookId, capituloSeleccionadoNumero, versiculo);
              const tieneNota = notasDe(bookId, capituloSeleccionadoNumero, versiculo).length > 0;

              /*
               * El resaltado cede ante la selección. Los dos son un fondo, y si
               * el amarillo del resaltado pisara al de "estoy leyendo este", se
               * perdería de vista cuál es el versículo activo — que es la
               * referencia que enseña la barra de arriba.
               */
              const fondo = seleccionado
                ? "border-amber-500 bg-[#ffe4b3] text-black dark:border-purple-300 dark:bg-[#693BCC] dark:text-white"
                : color
                  ? `border-transparent ${CLASES_COLOR[color] ?? ""}`
                  : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60";

              return (
                <p
                  key={versiculo}
                  data-verse={versiculo}
                  onClick={() => handleVerseClick(versiculo)}
                  // El borde izquierdo va siempre, transparente cuando no toca:
                  // si apareciera solo al seleccionar, el texto se correría 3px
                  // en cada clic.
                  className={`animate-slide-in-bottom mb-1 cursor-pointer rounded-lg border-l-[3px] px-2 py-2 leading-relaxed transition-colors ${fondo}`}
                >
                  {/*
                    El número va EN LÍNEA con el texto, sin columna propia: una
                    columna fija sangraba todos los renglones y el texto se veía
                    corrido hacia la derecha. Que la primera línea arranque al
                    lado del número lo resuelve el CSS del marcado, no el layout.
                  */}
                  <span className={`mr-1.5 select-none text-xs font-bold tabular-nums ${seleccionado ? "opacity-70" : "text-amber-600 dark:text-purple-300"}`}>{versiculo}</span>
                  {tieneNota && (
                    // Un punto y no un icono: va dentro del renglón del texto y
                    // cualquier cosa más alta descuadraría la primera línea.
                    <span title={t("NotasTiene")} aria-label={t("NotasTiene")} className="mr-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 align-middle dark:bg-sky-400"></span>
                  )}
                  <span
                    className={`texto-biblico ${CLASES_STRONG} ${preferencia.morfologia ? "" : "sin-morfologia"} ${preferencia.glosa ? "" : "sin-glosa"} ${
                      String(versiculoTraduciendo) === String(versiculo) ? "traduciendo-skeleton" : ""
                    }`}
                    onClick={handleStrongClick}
                    // El marcado de diferencias solo se aplica al versículo
                    // SELECCIONADO. Pintar el capítulo entero llenaría el panel
                    // de subrayados y la comparación se hace de un versículo a
                    // la vez, que es como se lee.
                    dangerouslySetInnerHTML={{
                      __html: seleccionado && diferencias ? marcarDiferencias(normalizarMarcado(contenido), diferencias) : normalizarMarcado(contenido),
                    }}
                  ></span>
                </p>
              );
            })
        ) : typeof textoVisible === "string" ? (
          <div className="animate-slide-in-bottom rounded-lg bg-red-50 px-3 py-4 text-center text-sm font-semibold text-[#ff0000] dark:bg-red-950/40 dark:text-orange-400">{textoVisible}</div>
        ) : (
          <p>{t("NoObjetoNoString")}</p>
        )}
      </div>

      {errorTraduccion && !isTranslating && (
        <div role="status" className="animate-fade-in border-t border-neutral-200 py-1 text-center text-xs text-red-600 dark:border-neutral-800 dark:text-red-400">
          {t("TraduccionFallo")}
        </div>
      )}
    </article>
  );
};

VerseSingle.propTypes = {
  cargando: PropTypes.bool,
  bookId: PropTypes.number,
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  nombre: PropTypes.string.isRequired,
  iso: PropTypes.string.isRequired,
};

export default VerseSingle;
