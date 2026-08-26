import React, { useContext, useEffect, useState, useMemo } from "react";
import DataContext from "../context/DataContext";
import { getStrongAudioUrl } from "../services/bibleSource";
import ThemeContext from "../context/ThemeContext";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const processText = (html, strongFun) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allNodes = Array.from(doc.body.childNodes);

  const generateKey = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const processNode = (node) => {
    const key = node.nodeType === Node.TEXT_NODE ? node.textContent : generateKey();

    if (node.nodeType === Node.TEXT_NODE) {
      return <span key={key}>{escapeHTML(node.textContent)}</span>;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const attributes = Array.from(node.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});

      if (node.tagName === "SPAN") {
        const onclickAttr = node.getAttribute("onclick");
        if (onclickAttr?.startsWith("strongFun(")) {
          const arg = onclickAttr.match(/strongFun\('(.*)'\)/)?.[1];
          return (
            <span key={key} onClick={() => strongFun(arg)} style={{ color: node.style.color, cursor: "pointer" }} className="Slink">
              {Array.from(node.childNodes).map(processNode)}
            </span>
          );
        }
      }

      return React.createElement(node.tagName.toLowerCase(), { key, ...attributes }, Array.from(node.childNodes).map(processNode));
    }
    return null;
  };

  return allNodes.map(processNode);
};

const escapeHTML = (str) => str.replace(/[&<>"'/]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));

const StrongSingle = () => {
  const { strongData, cargandoStrong, strong, strongFun, setModalStrong } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const [strongIndividual, setStrongIndividual] = useState(null);
  const [audio, setAudio] = useState(null);
  const [cargandoAudio, setCargandoAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageIsLoaded, setImageIsLoaded] = useState(false);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(strongIndividual, () => setModalStrong(false));

  //cerrar modal si se presiona por fuera
  const handleOutsideClick = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      setModalStrong(false);
      strongFun("");
    }
  };

  const ImageUrls = useMemo(
    () => ({
      light: "/light.webp",
      dark: "/dark.webp",
    }),
    []
  );

  const currentImage = useMemo(() => ImageUrls[theme], [ImageUrls, theme]);

  // Precarga de imágenes
  useEffect(() => {
    const preloadImages = () => {
      setImageIsLoaded(false);
      Object.values(ImageUrls).forEach((url) => {
        const img = new Image();
        img.src = url;
        img.onload = () => setImageIsLoaded(true);
      });
    };
    preloadImages();
  }, [ImageUrls]);

  useEffect(() => {
    const loadResources = async () => {
      if (!cargandoStrong && strongData) {
        const obtenerStrong = () => strongData.find((obj) => obj.id === strong) || null;
        setStrongIndividual(obtenerStrong());
      }
    };

    loadResources();
  }, [strongData, strong, cargandoStrong]);

  useEffect(() => {
    if (!strongIndividual) {
      setAudio(null);
      setCargandoAudio(false);
      return;
    }

    const audioUrl = strongIndividual.audioUrl ?? getStrongAudioUrl(strongIndividual.id);
    setCargandoAudio(true);
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
      elemento.src = "";
    };
  }, [strongIndividual]);

  const processedHtml = useMemo(() => (strongIndividual?.df ? processText(strongIndividual.df, strongFun) : null), [strongIndividual, strongFun]);

  useEffect(() => {
    if (audio) {
      audio.addEventListener("ended", () => setIsPlaying(false));
      return () => {
        audio.removeEventListener("ended", () => setIsPlaying(false));
      };
    }
  }, [audio]);

  const toggleAudio = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      } else {
        audio.play();
        //change pitch
        audio.playbackRate = 1.1;
        setIsPlaying(true);
      }
    }
  };

  const styles = {
    light: {
      slink: {
        background: "linear-gradient(120deg, #fae100 30%, #ffffff 38%, #ffffff 40%, #fae100 48%)",
        backgroundSize: "200% 100%",
        backgroundPosition: "100% 0",
        color: "black !important",
        padding: "2px 7px !important",
        borderRadius: "7px",
        fontWeight: 600,
        margin: "5px 1px",
        animation: "load89234 2s 4",
      },
      purple: { color: "#9a00db", fontSize: "1.2em" },
      red: { color: "#bb00ff" },
      blue: { color: "#091cb0", fontWeight: 900 },
      green: { color: "#60ab49", fontSize: "1.5em" },
      orange: { color: "#ffbb00" },
      yellow: { color: "#f2ff00" },
    },
    dark: {
      slink: {
        background: "linear-gradient(120deg, #dd57ff 30%, #eea8ff 38%, #eea8ff 40%, #dd57ff 48%)",
        backgroundSize: "200% 100%",
        backgroundPosition: "100% 0",
        color: "white !important",
        padding: "2px 7px !important",
        borderRadius: "7px",
        fontWeight: 600,
        margin: "5px 2px",
        animation: "load89234 2s 4",
      },
      purple: { color: "#b3e5fc", fontSize: "1.2em" },
      red: { color: "#e58080" },
      blue: { color: "#ffb400", fontWeight: 700 },
      green: { color: "#25ff1a", fontSize: "1.5em" },
      orange: { color: "#ff5733" },
      yellow: { color: "#ffe600" },
    },
  };

  const currentStyles = styles[theme];

  const renderLoadingState = () => (
    <div className="fixed inset-0 z-[999999999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/95 px-8 py-7 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 dark:border-purple-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 dark:border-t-purple-400 animate-spin"></div>
          <span className="font-mono text-xs font-bold text-amber-400 dark:text-purple-300">
            {strong || "..."}
          </span>
        </div>

        <p className="text-base font-semibold text-white tracking-wide">Cargando definición...</p>
        <p className="mt-1 text-xs text-gray-400">Consultando diccionario Strong</p>
      </div>
    </div>
  );

  const renderContent = () => (
    <>
      <style>
        {`
          @keyframes load89234 {
            100% { background-position: -100% 0; }
          }
        `}
      </style>
      <div className="z-[9999999] h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] text-black dark:text-white " onClick={(e) => e.stopPropagation()}>
        <div className="animate-pop animate-duration-100 h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] justify-center items-center relative ">
          <img src={currentImage} className="h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] -z-10 fixed" alt="Background" />
          <div className="fixed m-14 sm:ml-16 h-[315px] w-[260px] sm:h-[410px] sm:w-[380px] mt-24 sm:mt-28 overflow-y-scroll no-scrollbar px-2">
            <div className="text-left mr-2">
              <h1 className="animate-slide-in-top animate-duration-100 animate-delay-0 text-2xl text-balance px-3 text-center justify-center font-bold mb-3">
                {strongIndividual.id} - {strongIndividual.le}
              </h1>
              <h2 className="animate-slide-in-top animate-duration-100 animate-delay-100 text-2xl text-balance px-3 text-center justify-center font-bold">
                {strongIndividual.pl} ({strongIndividual.ti})
              </h2>
              <p className="font-base text-lg mt-2 animate-slide-in-top animate-duration-100 animate-delay-200 flex items-center">Pronunciación:</p>
              <p className="font-thin text-lg mb-2 animate-slide-in-top animate-duration-100 animate-delay-200 flex items-center">
                <strong className="font-bold text-xl mt-1">{strongIndividual.ps}</strong>
                {cargandoAudio ? (
                  <span
                    className="relative ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/80 text-white select-none shadow-sm cursor-wait"
                    title="Cargando audio..."
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-50"
                    >
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M15 8a5 5 0 0 1 0 8" />
                      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
                    </svg>
                    <span className="absolute inset-[-2px] rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                  </span>
                ) : audio ? (
                  <button
                    onClick={toggleAudio}
                    className="ml-2 w-6 h-6 text-center flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white outline-none transition shadow-sm select-none"
                    title={isPlaying ? "Detener audio" : "Reproducir audio"}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                        <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
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
                ) : null}
              </p>
              <p className="font-base text-lg animate-slide-in-top animate-duration-100 animate-delay-200 flex items-center">Definición:</p>
              <div className="mb-8">
                {React.Children.map(processedHtml, (child) => {
                  if (child.props.className === "Slink") {
                    return React.cloneElement(child, { style: { ...child.props.style, ...currentStyles.slink } });
                  }
                  if (child.props.color) {
                    const colorStyle = currentStyles[child.props.color.toLowerCase().replace("%color_", "").replace("%", "")];
                    return React.cloneElement(child, { style: { ...child.props.style, ...colorStyle } });
                  }
                  return child;
                })}
              </div>
            </div>
          </div>
          <button
            className="px-5 py-2 bg-red-500 text-white m-auto text-2xl size-14 sm:size-16 bottom-[55px] left-[153px] sm:left-[230px] sm:bottom-[60px] text-center absolute rounded-full"
            onClick={() => {
              setModalStrong(false);
              strongFun("");
            }}
          >
            X
          </button>
        </div>
      </div>
      <div className="fixed w-full h-full bg-black/40 z-[999999] modal-overlay" onClick={handleOutsideClick}></div>
    </>
  );

  const renderNotFound = () => (
    <div
      className="z-[9999999] h-auto max-w-[90%] w-[380px] rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold">Definición no disponible</h3>
      <p className="mt-1 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">{strong}</p>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        Este número no se encuentra en el índice de la concordancia clásica de James Strong (H1–H8674 / G1–G5624).
      </p>
      <button
        onClick={() => {
          setModalStrong(false);
          strongFun("");
        }}
        className="mt-5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow transition hover:bg-amber-700"
      >
        Cerrar
      </button>
    </div>
  );

  if (cargandoStrong || !imageIsLoaded) {
    return renderLoadingState();
  }

  if (!strongIndividual) {
    return (
      <div className="z-[9999] fixed inset-0 flex items-center justify-center">
        <div className="fixed w-full h-full bg-black/40 z-[999999] modal-overlay" onClick={handleOutsideClick}></div>
        <div className="z-[9999999] relative">{renderNotFound()}</div>
      </div>
    );
  }

  return renderContent();
};

export default StrongSingle;
