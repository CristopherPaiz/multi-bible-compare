import { useRef, useEffect, useCallback, useContext, useState } from "react";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import TRANSLATE from "/translationBeta.png";
import TRANSLATEGOOGLE from "/google.png";
import SHARE from "/share.png";
import { GoogleTranslatorTokenFree, GoogleTranslator } from "@translate-tools/core/translators/GoogleTranslator";

const VerseSingle = ({ texto, nombre, iso }) => {
  const { versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero, tipoTraductor, setCompartirVerse, tamanioVerseAncho, tamanioVerseAlto } =
    useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const { idiomaNavegador, t } = useContext(LanguageContext);

  const [textoTraducido, setTextoTraducido] = useState(texto);
  const [textoOriginal, setTextoOriginal] = useState(texto);
  const [isTranslating, setIsTranslating] = useState(false);

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

  const handleTranslate = async (iso) => {
    if (iso === "no" || !versiculoSeleccionadoNumero) {
      return;
    }

    const idiomaVersoTranslate = iso.toString();
    const idiomaNavegadorTranslate = idiomaNavegador;
    const verso = textoOriginal[versiculoSeleccionadoNumero];

    setIsTranslating(true);

    const translator1 = new GoogleTranslator({
      corsProxy: "https://corsproxy.io/",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
      },
    });
    const translator2 = new GoogleTranslatorTokenFree({});
    try {
      const resultado = await translator1.translate(encodeURIComponent(verso), idiomaVersoTranslate, idiomaNavegadorTranslate);
      setTextoTraducido({ ...textoTraducido, [versiculoSeleccionadoNumero]: resultado });
      centerText();
    } catch (error) {
      try {
        const resultado = await translator2.translate(verso, idiomaVersoTranslate, idiomaNavegadorTranslate);
        setTextoTraducido({ ...textoTraducido, [versiculoSeleccionadoNumero]: resultado });
      } catch (error) {
        console.error(error);
      }
      console.error(error);
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
                      <span style={{ fontWeight: "bold" }}>{versiculo}</span> <span dangerouslySetInnerHTML={{ __html: contenido }}></span>
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
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  nombre: PropTypes.string.isRequired,
  iso: PropTypes.string.isRequired,
};

export default VerseSingle;
