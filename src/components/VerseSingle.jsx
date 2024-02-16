import { useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import DataContext from "../context/DataContext";
import { useContext } from "react";

const VerseSingle = ({ texto }) => {
  const { versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero } = useContext(DataContext);

  const containerRef = useRef(null);

  const handleVerseClick = useCallback(
    (versiculo) => {
      setVersiculoSeleccionadoNumero(versiculo);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize")); // Actualizar todas las ventanas
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
    <div
      ref={containerRef}
      className={`overflow-y-auto no-scrollbar w-11/12 max-w-[400px] m-auto border-cyan-400 border p-4 align-middle ${typeof texto === "string" ? "h-50" : "h-[250px]"}`}
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
                color: parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? "yellow" : "inherit",
                fontWeight: parseInt(versiculo) === parseInt(versiculoSeleccionadoNumero) ? "bold" : "100",
              }}
            >
              <span style={{ fontWeight: "bold" }}>{versiculo}: </span> {contenido}
            </p>
          ))
      ) : typeof texto === "string" ? (
        <div style={{ color: "red", textAlign: "center" }}>{texto}</div>
      ) : (
        <p>El texto no es un objeto o un string válido.</p>
      )}
    </div>
  );
};

VerseSingle.propTypes = {
  texto: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
};

export default VerseSingle;
