import { useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

const VerseSingle = ({ texto, nombre }) => {
  const { versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);

  const containerRef = useRef(null);

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

  return (
    <>
      <div className="flex flex-col  border-neutral-400 rounded-md border">
        <div className="max-w-[390px] min-w-[300px] w-[390px] text-wrap px-3 py-2 bg-neutral-300 dark:bg-neutral-800 rounded-t-md">
          <h1 className="font-thin">{nombre.split(".")[1].split("-")[0]}</h1>
          <h1 className="font-bold">{nombre.split("-")[1].replace("ccc", "cc")}</h1>
        </div>
        <div
          ref={containerRef}
          className={`p-3 overflow-y-auto no-scrollbar max-w-[390px] min-w-[300px] w-[390px] ${typeof texto === "string" ? "h-[50px]" : "h-[260px]"}`}
        >
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
            <div className="font-bold min-w-[390px] max-w-[390px] w-[390px] -ml-2 text-center text-[#ff0000] dark:text-orange-500">{texto}</div>
          ) : (
            <p>El texto no es un objeto o un string válido.</p>
          )}
        </div>
      </div>
    </>
  );
};

VerseSingle.propTypes = {
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  nombre: PropTypes.string.isRequired,
};

export default VerseSingle;
