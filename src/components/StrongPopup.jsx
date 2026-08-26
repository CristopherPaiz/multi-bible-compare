import { useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { getStrongAudioUrl, getStrongBatch } from "../services/bibleSource";
import indexHebrew from "../assets/strongs/IndexHebrew.json";
import indexGreek from "../assets/strongs/IndexGreek.json";

const StrongPopup = () => {
  const { strongPopup, cerrarStrongPopup, abrirDefinicionStrong } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const [entryData, setEntryData] = useState(null);
  const [audio, setAudio] = useState(null);
  const [cargandoAudio, setCargandoAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "bottom" });

  const popupRef = useRef(null);

  const code = strongPopup?.code;
  const isHebrew = code?.startsWith("H");
  const isGreek = code?.startsWith("G");

  // Buscar información base inmediata desde los índices locales
  const fastEntry = useMemo(() => {
    if (!code) return null;
    if (isHebrew) {
      return indexHebrew.find((item) => item.id === code) || null;
    }
    if (isGreek) {
      return indexGreek.find((item) => item.id === code) || null;
    }
    return null;
  }, [code, isHebrew, isGreek]);

  // Cargar detalles extendidos si la API o CDN los tiene
  useEffect(() => {
    if (!code) {
      setEntryData(null);
      return;
    }

    let cancelado = false;
    const controller = new AbortController();

    // Empezamos con la info rápida local
    setEntryData(fastEntry);

    const cargarDetalle = async () => {
      try {
        const batch = await getStrongBatch({ code, signal: controller.signal });
        if (!cancelado && Array.isArray(batch) && batch.length > 0) {
          const found = batch.find((item) => item.id === code) || batch[0];
          if (found) setEntryData((prev) => ({ ...prev, ...found }));
        }
      } catch {
        // Si falla la red, conservamos la info básica de fastEntry
      }
    };

    cargarDetalle();

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [code, fastEntry]);

  // Carga y preparación del audio
  useEffect(() => {
    if (!code) {
      setAudio(null);
      setCargandoAudio(false);
      setIsPlaying(false);
      return;
    }

    const audioUrl = entryData?.audioUrl ?? getStrongAudioUrl(code);
    setCargandoAudio(true);
    setIsPlaying(false);

    let cancelado = false;
    const elemento = new Audio();
    elemento.preload = "metadata";

    const alCargar = () => {
      if (!cancelado) {
        setAudio(elemento);
        setCargandoAudio(false);
      }
    };
    const alFallar = () => {
      if (!cancelado) {
        setAudio(null);
        setCargandoAudio(false);
      }
    };

    elemento.addEventListener("loadedmetadata", alCargar, { once: true });
    elemento.addEventListener("canplaythrough", alCargar, { once: true });
    elemento.addEventListener("error", alFallar, { once: true });
    elemento.src = audioUrl;

    return () => {
      cancelado = true;
      elemento.removeEventListener("loadedmetadata", alCargar);
      elemento.removeEventListener("canplaythrough", alCargar);
      elemento.removeEventListener("error", alFallar);
      elemento.pause();
      elemento.src = "";
    };
  }, [code, entryData?.audioUrl]);

  useEffect(() => {
    if (audio) {
      const onEnded = () => setIsPlaying(false);
      audio.addEventListener("ended", onEnded);
      return () => audio.removeEventListener("ended", onEnded);
    }
  }, [audio]);

  const toggleAudio = useCallback(() => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    } else {
      audio.playbackRate = 1.05;
      audio.play();
      setIsPlaying(true);
    }
  }, [audio, isPlaying]);

  // Calcular posición inteligente del Popup según el elemento ancla
  useEffect(() => {
    if (!strongPopup) return;

    const anchor = strongPopup.anchorRect;
    const popupWidth = 320;
    const popupHeight = 175;
    const margin = 12;

    if (!anchor || window.innerWidth < 640) {
      setCoords({ top: 0, left: 0, placement: "bottom", arrowLeft: 160 });
      return;
    }

    const anchorCenterX = anchor.left + anchor.width / 2;
    let left = anchorCenterX - popupWidth / 2;

    // Evitar que se desborde a los bordes de la pantalla
    if (left < margin) {
      left = margin;
    } else if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }

    // Posición exacta de la flecha respecto al contenedor del popup
    const arrowLeft = Math.max(24, Math.min(popupWidth - 24, anchorCenterX - left));

    let top = anchor.bottom + 10;
    let placement = "bottom";

    // Si no cabe abajo y sí cabe arriba, ubicarlo encima del ancla
    if (top + popupHeight > window.innerHeight - margin && anchor.top - popupHeight - margin > 0) {
      top = anchor.top - popupHeight - 10;
      placement = "top";
    }

    setCoords({ top, left, placement, arrowLeft });
  }, [strongPopup]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") cerrarStrongPopup();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cerrarStrongPopup]);

  if (!strongPopup) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-stretch sm:block pointer-events-auto">
      {/* Backdrop transparente para capturar clics afuera */}
      <div className="fixed inset-0 bg-black/40 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none" onClick={cerrarStrongPopup} />

      <div
        ref={popupRef}
        style={
          !isMobile && coords.top > 0
            ? {
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transformOrigin: `${coords.arrowLeft}px ${coords.placement === "bottom" ? "top" : "bottom"}`,
              }
            : {}
        }
        className={`relative z-10 w-full sm:w-[320px] rounded-t-3xl sm:rounded-2xl sm:absolute border-2 border-amber-300/80 dark:border-purple-600/80 bg-white/95 dark:bg-[#1a0f26]/95 p-4 shadow-2xl backdrop-blur-md text-neutral-900 dark:text-neutral-100 transition-all animate-pop animate-duration-200 ${
          isMobile ? "max-h-[85vh] overflow-y-auto mb-0" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puntero de burbuja (flecha anclada directamente al número Strong) */}
        {!isMobile && coords.top > 0 && (
          <div
            style={{ left: `${coords.arrowLeft}px` }}
            className={`absolute -translate-x-1/2 w-4 h-4 rotate-45 bg-white dark:bg-[#1a0f26] z-20 ${
              coords.placement === "bottom"
                ? "-top-[9px] border-t-2 border-l-2 border-amber-300/80 dark:border-purple-600/80"
                : "-bottom-[9px] border-b-2 border-r-2 border-amber-300/80 dark:border-purple-600/80"
            }`}
          />
        )}

        {/* Encabezado: Código + Idioma + Botón cerrar */}
        <div className="relative z-30 flex items-center justify-between border-b border-gray-100 dark:border-purple-900/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-700 dark:text-purple-300 bg-amber-100 dark:bg-purple-950/70 px-2 py-0.5 rounded-md">
              {code}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {isHebrew ? t("Hebreo") : isGreek ? t("Griego") : "Strong"}
            </span>
          </div>

          <button
            onClick={cerrarStrongPopup}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-purple-900/40 dark:hover:text-gray-200 transition"
            title={t("Cerrar") || "Cerrar"}
          >
            &times;
          </button>
        </div>

        {/* Cuerpo: Palabra original + Transliteración + Audio */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold tracking-wide text-neutral-900 dark:text-white truncate">
              {entryData?.le || fastEntry?.le || "—"}
            </div>
            <div className="text-sm font-medium italic text-gray-600 dark:text-gray-300 truncate">
              {entryData?.pl || fastEntry?.pl || ""}
              {entryData?.ti ? ` (${entryData.ti})` : ""}
            </div>
          </div>

          {/* Botón de reproducción de audio */}
          <div>
            {cargandoAudio ? (
              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/80 text-white cursor-wait shadow-sm"
                title={t("CargandoAudio")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M15 8a5 5 0 0 1 0 8" />
                  <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                </svg>
                <span className="absolute inset-[-2px] rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              </div>
            ) : audio ? (
              <button
                onClick={toggleAudio}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                title={isPlaying ? t("DetenerPronunciacion") : t("ReproducirPronunciacion")}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M15 8a5 5 0 0 1 0 8" />
                    <path d="M17.7 5a9 9 0 0 1 0 14" />
                    <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                  </svg>
                )}
              </button>
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-800 text-gray-400 cursor-not-allowed"
                title={t("DefinicionNoDisponible")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9l-3 3h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v5" />
                  <path d="M12 12v7a.8 .8 0 0 1 -1.5 .5l-2.5 -3.5" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Botón de acción: Ver definición completa */}
        <button
          onClick={() => abrirDefinicionStrong(code)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 dark:from-purple-600 dark:to-purple-700 py-2 px-3 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 dark:hover:from-purple-700 dark:hover:to-purple-800 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-purple-400"
        >
          <span>{t("VerDefinicionCompleta") || "Ver definición completa"}</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StrongPopup;
