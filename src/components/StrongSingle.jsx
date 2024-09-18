import React, { useContext, useEffect, useState, useMemo } from "react";
import DataContext from "../context/DataContext";
import ThemeContext from "../context/ThemeContext";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const ImageUrls = useMemo(
    () => ({
      light: "https://raw.githubusercontent.com/CristopherPaiz/multi-bible-compare/main/public/light.webp",
      dark: "https://raw.githubusercontent.com/CristopherPaiz/multi-bible-compare/main/public/dark.webp",
    }),
    []
  );

  const currentImage = useMemo(() => ImageUrls[theme], [ImageUrls, theme]);

  // Precarga de imágenes
  useEffect(() => {
    const preloadImages = () => {
      Object.values(ImageUrls).forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    };
    preloadImages();
  }, [ImageUrls]);

  useEffect(() => {
    const loadResources = async () => {
      setIsLoading(true);

      // Cargar datos de Strong
      if (!cargandoStrong && strongData) {
        const obtenerStrong = () => strongData.find((obj) => obj.id === strong) || null;
        setStrongIndividual(obtenerStrong());
      }

      setIsLoading(false);
    };

    loadResources();
  }, [strongData, strong, cargandoStrong]);

  useEffect(() => {
    if (strongIndividual) {
      const audioFolder = strongIndividual.id.startsWith("H") ? "Audio_Hebreo" : "Audio_Griego";
      const audioNumber = strongIndividual.id.slice(1);
      const audioUrl = `https://music-fragments.s3.fr-par.scw.cloud/${audioFolder}/${audioNumber}.mp3`;

      fetch(audioUrl)
        .then((response) => {
          if (response.ok) {
            setAudio(new Audio(audioUrl));
          } else {
            setAudio(null);
          }
        })
        .catch(() => setAudio(null));
    }
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
        animation: "load89234 2s 2",
      },
      purple: { color: "#b300ff", fontWeight: 900 },
      red: { color: "#bb00ff", fontWeight: 900 },
      blue: { color: "#091cb0", fontWeight: 900 },
      green: { color: "#037932", fontWeight: 900 },
      orange: { color: "#ffbb00" },
      yellow: { color: "#f2ff00" },
    },
    dark: {
      slink: {
        background: "linear-gradient(120deg, #cc00ff 30%, #e683ff 38%, #e683ff 40%, #cc00ff 48%)",
        backgroundSize: "200% 100%",
        backgroundPosition: "100% 0",
        color: "white !important",
        padding: "2px 7px !important",
        borderRadius: "7px",
        fontWeight: 600,
        margin: "5px 2px",
        animation: "load89234 2s 1",
      },
      purple: { color: "#a6b3ff" },
      red: { color: "#9096ff" },
      blue: { color: "#ff7d7d", fontWeight: 700 },
      green: { color: "#15ff00" },
      orange: { color: "#ffdf87" },
      yellow: { color: "#f9ff8e" },
    },
  };

  const currentStyles = styles[theme];

  if (isLoading || !strongIndividual) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-white">
        <div className="flex flex-row gap-2">
          {[0.7, 0.3, 0.7].map((delay, index) => (
            <div key={index} className={`w-4 h-4 rounded-full bg-white animate-bounce`} style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
        <p className="text-black dark:text-white">Cargando texto...</p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes load89234 {
            100% { background-position: -100% 0; }
          }
        `}
      </style>
      <div className="z-[9999999] h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] text-black dark:text-white">
        <div className="animate-pop animate-duration-100 h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] justify-center items-center relative">
          <img src={currentImage} className="h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] -z-10 fixed" alt="Background" />
          <div className="fixed m-14 sm:ml-16 h-[315px] w-[260px] sm:h-[410px] sm:w-[380px] mt-24 sm:mt-28 overflow-y-scroll no-scrollbar">
            <div className="text-left mr-2">
              <h1 className="animate-slide-in-top animate-duration-100 animate-delay-0 text-2xl text-balance px-3 text-center justify-center font-bold mb-3">
                {strongIndividual.id} - {strongIndividual.le}
              </h1>
              <h2 className="animate-slide-in-top animate-duration-100 animate-delay-100 text-2xl text-balance px-3 text-center justify-center font-bold">
                {strongIndividual.pl} ({strongIndividual.ti})
              </h2>
              <p className="font-thin text-lg py-2 my-2 animate-slide-in-top animate-duration-100 animate-delay-200 flex items-center">
                Pronunciación: <strong className="font-bold text-xl ml-2">{strongIndividual.ps}</strong>
                {audio && (
                  <button
                    onClick={toggleAudio}
                    className="ml-2 w-6 h-6 text-center flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white outline-none select-none"
                    title={isPlaying ? "Detener audio" : "Reproducir audio"}
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
                )}
              </p>
              <p className="">Definición:</p>
              <div>
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
      <div className="fixed w-full h-full bg-black/40 z-[999999]"></div>
    </>
  );
};

export default StrongSingle;
