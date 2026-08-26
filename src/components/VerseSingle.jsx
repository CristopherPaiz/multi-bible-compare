import { useRef, useEffect, useCallback, useContext, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { traducir } from "../services/translateSource";
import "../styles/BibleMarkup.css";
import MarkupTab from "./MarkupTab";
import DataContext from "../context/DataContext";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import TRANSLATE from "/translationBeta.png";
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

const VerseSingle = ({ texto, nombre, iso, cargando = false, bookId }) => {
  const {
    versiculoSeleccionadoNumero,
    setVersiculoSeleccionadoNumero,
    setCompartirVerse,
    tamanioVerseAncho,
    tamanioVerseAlto,
    strongFun,
    leerMarcado,
    libroSeleccionado,
    capituloSeleccionadoNumero,
  } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const { idiomaNavegador, t } = useContext(LanguageContext);

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

  /** Lo que se pinta: el original con las traducciones encima. */
  const textoVisible = useMemo(() => (esCapitulo ? { ...texto, ...traducciones } : texto), [texto, traducciones, esCapitulo]);

  const estaTraducido = Boolean(traducciones[versiculoSeleccionadoNumero]);

  // `true` mientras no haya ni un versículo que pintar.
  const sinContenido = !textoVisible || (esCapitulo && Object.keys(texto).length === 0);

  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
    },
    [setVersiculoSeleccionadoNumero]
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
   * El prefijo sale del testamento, no del idioma de la versión: los números del
   * Antiguo Testamento son hebreos (H) y los del Nuevo, griegos (G).
   */
  const handleStrongClick = useCallback(
    (evento) => {
      const sup = evento.target.closest?.("sup");
      if (!sup) return;

      const numero = sup.textContent.replace(/\D/g, "");
      if (!numero) return;

      evento.stopPropagation();
      const prefijo = Number(bookId) <= 39 ? "H" : "G";
      strongFun(`${prefijo}${Number(numero)}`);
    },
    [bookId, strongFun]
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


  /** Descarta la traducción de este versículo y deja el original. */
  const revertirTraduccion = () => {
    setTraducciones((previo) => {
      const copia = { ...previo };
      delete copia[versiculoSeleccionadoNumero];
      return copia;
    });
    setErrorTraduccion(false);
  };

  //TAMAÑOS
  return (
    <>
      <div className="flex flex-col border-neutral-400 rounded-md border relative bg-white dark:bg-[#0f0f0f]">
        <MarkupTab biblia={nombre} tieneMorfologia={marcado.morfologia} tieneGlosa={marcado.glosa} />
        <div
          className={`${tamanioVerseAncho.min} ${tamanioVerseAncho.max} text-wrap px-3 py-2 bg-neutral-300 dark:bg-neutral-800 rounded-t-md justify-between flex flex-row`}
        >
          <div className="flex flex-col">
            <h1 className="font-thin">{nombre.split(".")[1].split("-")[0]}</h1>
            <h1 className="font-bold">{nombre.split("-")[1].replace("ccc", "cc")}</h1>
          </div>
          {iso !== "no" && esCapitulo && idiomaNavegador !== iso ? (
            <div className="flex flex-nowrap items-center">
              <button onClick={() => setCompartirVerse(texto, versiculoSeleccionadoNumero, nombre, traducciones[versiculoSeleccionadoNumero] ?? null)}>
                <img className="mt-3 mr-3 w-6 h-6 dark:invert" src={SHARE} alt="Share verse from Biblian"></img>
              </button>
              {/* El mismo botón traduce o revierte según el estado del
                  versículo actual, para no añadir un icono más al encabezado. */}
              <button
                disabled={isTranslating}
                onClick={() => (estaTraducido ? revertirTraduccion() : handleTranslate(iso))}
                title={estaTraducido ? t("VerOriginal") : t("Traducir")}
                aria-label={estaTraducido ? t("VerOriginal") : t("Traducir")}
                className="relative disabled:opacity-40"
              >
                <img className="mt-1 mr-1 w-6 h-8 dark:invert" src={TRANSLATE} alt=""></img>
                {estaTraducido && (
                  <span className="absolute -right-0 -top-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-neutral-300 dark:ring-neutral-800"></span>
                )}
              </button>
            </div>
          ) : (
            esCapitulo && (
              <div className="flex flex-nowrap items-center">
                <button onClick={() => setCompartirVerse(texto, versiculoSeleccionadoNumero, nombre, traducciones[versiculoSeleccionadoNumero] ?? null)}>
                  <img className="mt-3 mr-3 w-6 h-6 dark:invert" src={SHARE} alt="Share verse from Biblian"></img>
                </button>
              </div>
            )
          )}
        </div>
        <div className="relative">
          {/*
            Franjas invisibles en los bordes. No tienen handler ni ref: son
            decorativas, pero al estar en z-10 sobre el texto se comían todo
            clic en los 70px de cada lado — versículos y números Strong por
            igual. `pointer-events-none` las deja pasar de largo.
          */}
          <div className="absolute left-0 top-0 bottom-0 w-[70px] bg-red-500 opacity-0 z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-[70px] bg-red-500 opacity-0 z-10 pointer-events-none"></div>
          <div
            ref={containerRef}
            className={`p-3 overflow-y-auto no-scrollbarVerse ${tamanioVerseAncho.min} ${tamanioVerseAncho.max} ${
              esCapitulo ? tamanioVerseAlto.def : "h-fit"
            }`}
            style={{ position: "relative" }}
          >
            {cargando && sinContenido ? (
              // Esqueleto SOLO en la primera carga, cuando no hay nada que
              // mostrar todavía. Si ya hay texto en pantalla se deja tal cual y
              // se reemplaza cuando llega el nuevo: tapar contenido válido con
              // una capa gris hace que la app parpadee en cada versículo.
              <div className="flex flex-col gap-3 py-1" aria-hidden="true">
                {[90, 100, 96, 82, 94, 70].map((ancho, i) => (
                  <div
                    key={i}
                    className="h-3 animate-pulse rounded bg-gray-200 dark:bg-neutral-700"
                    style={{ width: `${ancho}%`, animationDelay: `${i * 80}ms` }}
                  ></div>
                ))}
              </div>
            ) : esCapitulo ? (
              Object.entries(textoVisible)
                .sort(([keyA], [keyB]) => keyA - keyB)
                .map(([versiculo, contenido], index) => (
                  <p
                    key={index}
                    data-verse={versiculo}
                    onClick={() => handleVerseClick(versiculo)}
                    style={{
                      cursor: "pointer",
                      marginBottom: "0.7rem",
                      color: parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? (theme === "light" ? "black" : "white") : "inherit",
                      backgroundColor:
                        parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? (theme === "light" ? "#ffe4b3" : "#693BCC") : "transparent",
                      padding: "1rem",
                      margin: "-1rem",
                    }}
                    className="animate-slide-in-bottom"
                  >
                    <span>
                      <span style={{ fontWeight: "bold" }}>{versiculo}</span>{" "}
                      <span
                        className={`texto-biblico ${CLASES_STRONG} ${preferencia.morfologia ? "" : "sin-morfologia"} ${
                          preferencia.glosa ? "" : "sin-glosa"
                        } ${String(versiculoTraduciendo) === String(versiculo) ? "traduciendo-skeleton" : ""}`}
                        onClick={handleStrongClick}
                        dangerouslySetInnerHTML={{ __html: normalizarMarcado(contenido) }}
                      ></span>
                    </span>
                  </p>
                ))
            ) : typeof textoVisible === "string" ? (
              <div
                className={`animate-slide-in-bottom font-bold ${tamanioVerseAncho.min} ${tamanioVerseAncho.max} px-2 text-center text-[#ff0000] dark:text-orange-500`}
              >
                {textoVisible}
              </div>
            ) : (
              <p>{t("NoObjetoNoString")}</p>
            )}
          </div>
        </div>
        {errorTraduccion && !isTranslating && (
          <div role="status" className="animate-fade-in my-1 text-center text-xs text-red-600 dark:text-red-400">
            {t("TraduccionFallo")}
          </div>
        )}
      </div>
    </>
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
