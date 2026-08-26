import { useRef, useEffect, useCallback, useContext, useState } from "react";
import PropTypes from "prop-types";
import { traducir } from "../services/translateSource";
import DataContext from "../context/DataContext";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import TRANSLATE from "/translationBeta.png";
import TRANSLATEGOOGLE from "/google.png";
import SHARE from "/share.png";

const VerseSingle = ({ texto, nombre, iso, cargando = false, bookId }) => {
  const { versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero, tipoTraductor, setCompartirVerse, tamanioVerseAncho, tamanioVerseAlto, strongFun } =
    useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const { idiomaNavegador, t } = useContext(LanguageContext);

  const [textoTraducido, setTextoTraducido] = useState(texto);
  const [textoOriginal, setTextoOriginal] = useState(texto);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorTraduccion, setErrorTraduccion] = useState(false);

  const containerRef = useRef(null);
  const translatingRef = useRef(null);

  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
    },
    [setVersiculoSeleccionadoNumero]
  );

  useEffect(() => {
    if (texto !== textoOriginal) {
      setTextoOriginal(texto);
      setTextoTraducido(texto);
    }
  }, [texto, textoOriginal]);

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
    if (texto !== textoOriginal) {
      setTextoOriginal(texto);
      setTextoTraducido(texto);
    }
  }, [texto, textoOriginal]);

  useEffect(() => {
    centerText();
  }, [textoTraducido, centerText]);

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
    const verso = textoOriginal[versiculoSeleccionadoNumero];

    setIsTranslating(true);
    setErrorTraduccion(false);

    try {
      // El servicio limpia el markup `<sup>` por su cuenta: traducir los
      // números Strong incrustados devolvía basura.
      const resultado = await traducir({
        texto: verso,
        desde: idiomaVersoTranslate,
        hacia: idiomaNavegadorTranslate,
      });
      setTextoTraducido({ ...textoTraducido, [versiculoSeleccionadoNumero]: resultado });
      centerText();
    } catch (error) {
      console.error("No se pudo traducir el versículo:", error);
      setErrorTraduccion(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGoogleTranslate = (iso) => {
    if (iso === "no" || !versiculoSeleccionadoNumero) {
      return;
    }

    const idiomaVersoTranslate = iso.toString();
    const idiomaNavegadorTranslate = idiomaNavegador;
    const verso = textoOriginal[versiculoSeleccionadoNumero];
    return `https://translate.google.com/${tipoTraductor}sl=${idiomaVersoTranslate}&tl=${idiomaNavegadorTranslate}&q=${encodeURIComponent(verso)}`;
  };

  //TAMAÑOS
  return (
    <>
      <div className="flex flex-col border-neutral-400 rounded-md border relative bg-white dark:bg-[#0f0f0f]">
        <div
          className={`${tamanioVerseAncho.min} ${tamanioVerseAncho.max} text-wrap px-3 py-2 bg-neutral-300 dark:bg-neutral-800 rounded-t-md justify-between flex flex-row`}
        >
          <div className="flex flex-col">
            <h1 className="font-thin">{nombre.split(".")[1].split("-")[0]}</h1>
            <h1 className="font-bold">{nombre.split("-")[1].replace("ccc", "cc")}</h1>
          </div>
          {iso !== "no" && typeof textoTraducido !== "string" && idiomaNavegador !== iso ? (
            <div className="flex flex-nowrap items-center">
              <button onClick={() => setCompartirVerse(textoOriginal, versiculoSeleccionadoNumero, nombre)}>
                <img className="mt-3 mr-3 w-6 h-6 dark:invert" src={SHARE} alt="Share verse from Biblian"></img>
              </button>
              <button disabled={isTranslating ? true : false}>
                <a href={handleGoogleTranslate(iso)} target="_blank" rel="nofollow noopener noreferrer">
                  <img className="mt-1 mr-3 w-6 h-9" src={TRANSLATEGOOGLE} alt="Translate in Google"></img>
                </a>
              </button>
              <button disabled={isTranslating ? true : false} onClick={() => handleTranslate(iso)}>
                <img className="mt-1 mr-1 w-6 h-8 dark:invert" src={TRANSLATE} alt="Translate"></img>
              </button>
            </div>
          ) : (
            typeof textoTraducido !== "string" && (
              <div className="flex flex-nowrap items-center">
                <button onClick={() => setCompartirVerse(textoOriginal, versiculoSeleccionadoNumero, nombre)}>
                  <img className="mt-3 mr-3 w-6 h-6 dark:invert" src={SHARE} alt="Share verse from Biblian"></img>
                </button>
              </div>
            )
          )}
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-[70px] bg-red-500 opacity-0 z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-[70px] bg-red-500 opacity-0 z-10"></div>
          <div
            ref={containerRef}
            className={`p-3 overflow-y-auto no-scrollbarVerse ${tamanioVerseAncho.min} ${tamanioVerseAncho.max} ${
              typeof textoTraducido === "string" ? "h-fit" : tamanioVerseAlto.def
            }`}
            style={{ position: "relative" }}
          >
            {typeof textoTraducido === "object" && textoTraducido !== null ? (
              Object.entries(textoTraducido)
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
                        className="[&_sup]:cursor-pointer [&_sup]:text-blue-600 [&_sup]:font-semibold dark:[&_sup]:text-blue-400 [&_sup]:hover:underline"
                        onClick={handleStrongClick}
                        dangerouslySetInnerHTML={{ __html: contenido }}
                      ></span>
                    </span>
                  </p>
                ))
            ) : typeof textoTraducido === "string" ? (
              <div
                className={`animate-slide-in-bottom font-bold ${tamanioVerseAncho.min} ${tamanioVerseAncho.max} px-2 text-center text-[#ff0000] dark:text-orange-500`}
              >
                {textoTraducido}
              </div>
            ) : (
              <p>{t("NoObjetoNoString")}</p>
            )}
          </div>
        </div>
        {cargando && (
          <div className="absolute inset-0 z-40 flex flex-col gap-2 bg-white/70 p-3 dark:bg-neutral-900/70">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-300 dark:bg-neutral-700"></div>
            <div className="h-3 w-full animate-pulse rounded bg-gray-300 dark:bg-neutral-700"></div>
            <div className="h-3 w-11/12 animate-pulse rounded bg-gray-300 dark:bg-neutral-700"></div>
            <div className="h-3 w-4/5 animate-pulse rounded bg-gray-300 dark:bg-neutral-700"></div>
          </div>
        )}
        {errorTraduccion && !isTranslating && (
          <div className="text-center text-xs text-red-600 dark:text-red-400 my-1">{t("TraduccionFallo")}</div>
        )}
        {isTranslating && (
          <div
            ref={translatingRef}
            className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-60 z-50 flex justify-center items-center"
            style={{ pointerEvents: "none" }}
          >
            <div className="text-white font-bold flex flex-col">
              <div className="flex justify-center m-auto h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <div>{t("Traduciendo")}</div>
            </div>
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
