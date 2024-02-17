import { useRef, useEffect, useCallback, useContext } from "react";
import EasyGoogleTranslate from "free-google-translate";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import ThemeContext from "../context/ThemeContext";
import LanguageContext from "../context/LanguageContext";
import TRANSLATE from "/translation.png";

const VerseSingle = ({ texto, nombre, iso }) => {
  const { versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const { idiomaNavegador } = useContext(LanguageContext);

  const containerRef = useRef(null);

  //Cambiar posicion del texto al centro del div
  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 10);
    },
    [setVersiculoSeleccionadoNumero]
  );

  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (containerRef.current && versiculoSeleccionadoNumero) {
        const highlightedVerse = containerRef.current.querySelector(`[data-verse="${versiculoSeleccionadoNumero}"]`);

        if (highlightedVerse) {
          const containerTop = containerRef.current.offsetTop;
          const containerHeight = containerRef.current.offsetHeight;
          const verseTop = highlightedVerse.offsetTop;
          const verseHeight = highlightedVerse.offsetHeight;

          const scrollTop = Math.max(0, verseTop - containerTop - containerHeight / 2 + verseHeight / 2);

          containerRef.current.scrollTop = scrollTop;
        }
      }
    }, 50);

    return () => clearTimeout(scrollTimeout);
  }, [versiculoSeleccionadoNumero]);

  //Funcion para traducir solo el versiculo seleccionadoa
  const handleTranslate = async (iso) => {
    if (iso === "no" || !versiculoSeleccionadoNumero) {
      return; // No hace nada si no hay iso o no hay versículo seleccionado
    }

    const idiomaVersoTranslate = iso.toString();
    const idiomaNavegadorTranslate = idiomaNavegador.split("-")[0];
    const verso = texto[versiculoSeleccionadoNumero]; // Obtener el verso seleccionado

    const translator = new EasyGoogleTranslate(idiomaVersoTranslate, idiomaNavegadorTranslate, 10000);
    try {
      const result = await translator.translate(verso);
      const newTexto = { ...texto }; // Clonar el objeto texto para no mutarlo directamente
      newTexto[versiculoSeleccionadoNumero] = result; // Reemplazar el verso seleccionado con la traducción
      console.log(newTexto);
      return newTexto; // Devolver el texto actualizado
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex flex-col border-neutral-400 rounded-md border">
        <div className="max-w-[390px] min-w-[250px] text-wrap px-3 py-2 bg-neutral-300 dark:bg-neutral-800 rounded-t-md justify-between flex flex-row">
          <div className="flex flex-col">
            <h1 className="font-thin">{nombre.split(".")[1].split("-")[0]}</h1>
            <h1 className="font-bold">{nombre.split("-")[1].replace("ccc", "cc")}</h1>
          </div>
          {iso !== "no" && (
            <div>
              <button onClick={() => handleTranslate(iso)}>
                <img className="mt-2 mr-1 w-6 h-6 dark:invert" src={TRANSLATE} alt="Translate"></img>
              </button>
            </div>
          )}
        </div>
        <div ref={containerRef} className={`p-3 overflow-y-auto no-scrollbar max-w-[390px] min-w-[250px] ${typeof texto === "string" ? "h-[50px]" : "h-[260px]"}`}>
          {typeof texto === "object" && texto !== null ? (
            Object.entries(texto)
              .sort(([keyA], [keyB]) => keyA - keyB)
              .map(([versiculo, contenido], index) => (
                <p
                  key={index}
                  data-verse={versiculo}
                  onClick={() => handleVerseClick(versiculo)}
                  style={{
                    cursor: "pointer",
                    marginBottom: "0.7rem",
                    color: parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? (theme === "light" ? "#0690c6" : "yellow") : "inherit",
                    fontWeight: parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? "bold" : "100",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{versiculo}: </span> {contenido}
                </p>
              ))
          ) : typeof texto === "string" ? (
            <div className="font-bold max-w-[390px] min-w-[250px w-full -ml-2 text-center text-[#ff0000] dark:text-orange-500">{texto}</div>
          ) : (
            <p>El texto no es un objeto o un string válido.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default VerseSingle;

VerseSingle.propTypes = {
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  nombre: PropTypes.string.isRequired,
  iso: PropTypes.string.isRequired,
};
