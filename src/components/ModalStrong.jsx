import PropTypes from "prop-types";
import Tabs from "./Tabs";
import { useContext, useRef, useEffect, useState, useMemo, useCallback } from "react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import { useBloquearScroll } from "../hooks/useBloquearScroll";
import StrongSingle from "./StrongSingle";
import "../styles/Strongs.css";

const ModalStrong = ({ isOpen, onClose, anchorRect }) => {
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  const { modalStrong } = useContext(DataContext);
  useBloquearScroll(isOpen);

  // Calcular el punto exacto de la pantalla donde se encuentra la burbuja flotante
  const transformOrigin = useMemo(() => {
    if (!anchorRect || typeof window === "undefined") {
      return "90% 22%";
    }
    const bubbleCenterX = anchorRect.left + anchorRect.width / 2;
    const bubbleCenterY = anchorRect.top + anchorRect.height / 2;

    const percentX = Math.max(2, Math.min(98, (bubbleCenterX / window.innerWidth) * 100));
    const percentY = Math.max(2, Math.min(98, (bubbleCenterY / window.innerHeight) * 100));

    return `${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;
  }, [anchorRect]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsAnimating(true), 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsRendered(false), 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  /*
   * `useCallback` para poder entrar como dependencia del efecto de abajo sin
   * volver a suscribir el oyente de teclado en cada render. Se cierra con
   * retardo para que la animacion de salida termine antes de desmontar.
   */
  const handleCerrarConAnimacion = useCallback(() => {
    setIsAnimating(false);
    setTimeout(onClose, 240);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !modalStrong) {
        handleCerrarConAnimacion();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, modalStrong, handleCerrarConAnimacion]);

  if (!isRendered) return null;

  return (
    <div className="z-[9999] fixed inset-0 overflow-y-auto flex justify-center items-center">
      {/* Backdrop con fade-in / fade-out */}
      <div
        className={`absolute z-40 inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleCerrarConAnimacion}
      />

      <div className="absolute z-50 flex justify-center items-center inset-0 pointer-events-none">
        {/* MODAL PRINCIPAL con animación orientada dinámicamente al punto del botón flotante */}
        <div
          ref={modalRef}
          style={{ transformOrigin }}
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto relative bg-yellow-50 w-[90%] min-w-[200px] sm:min-w-[300px] sm:w-[500px] h-[85%] sm:h-[85%] p-2 rounded-2xl shadow-2xl dark:bg-[#1c0330] dark:text-white overflow-y-scroll overscroll-contain no-scrollbar transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-[0.08] translate-y-[-10px] pointer-events-none"
          }`}
        >
          <div className="absolute top-0 right-0 z-40">
            <button
              onClick={handleCerrarConAnimacion}
              className="bg-gray-200 text-gray-600 rounded-full w-8 h-8 mt-3 mr-3 flex items-center justify-center hover:bg-gray-300 focus:outline-none focus:ring focus:ring-gray-400 dark:bg-neutral-800 dark:text-gray-300 transition"
            >
              &times;
            </button>
          </div>
          <div className="min-w-full w-full pl-4 pr-3">
            <div className="mb-3 mt-2">
              <h2 className="text-xl font-bold">{t("DiccionarioStrong")}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t("DiccionarioStrongSubtitulo")}</p>
            </div>
            <Tabs />
          </div>
          <div className="bg-yellow-50 h-6 dark:bg-[#1c0330] dark:text-white sticky ml-4 -bottom-4 w-[92%] sm:w-[95%] sm:ml-[14px] border-1 border-t m-auto border-gray-300 dark:border-gray-600 "></div>
        </div>
      </div>
      {/* OTRO MODAL */}
      {modalStrong && <StrongSingle />}
    </div>
  );
};

ModalStrong.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  anchorRect: PropTypes.shape({
    left: PropTypes.number,
    top: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
};

export default ModalStrong;
