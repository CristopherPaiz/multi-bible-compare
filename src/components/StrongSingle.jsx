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
  const { strongData, cargandoStrong, strong, strongFun, setModalStrong, image, cargandoImagen } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const [strongIndividual, setStrongIndividual] = useState(null);

  useEffect(() => {
    if (!cargandoStrong && strongData) {
      const obtenerStrong = () => strongData.find((obj) => obj.id === strong) || null;
      setStrongIndividual(obtenerStrong());
    }
  }, [strongData, strong, cargandoStrong]);

  const processedHtml = useMemo(() => (strongIndividual?.df ? processText(strongIndividual.df, strongFun) : null), [strongIndividual, strongFun]);

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

  if (cargandoImagen || cargandoStrong || !strongIndividual) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-white">
        <div className="flex flex-row gap-2">
          {[0.7, 0.3, 0.7].map((delay, index) => (
            <div key={index} className={`w-4 h-4 rounded-full bg-white animate-bounce`} style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
        <p className="text-white">Cargando...</p>
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
          <img src={image} className="h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] -z-10 fixed" alt="Background" />
          <div className="fixed m-14 sm:ml-16 h-[315px] w-[260px] sm:h-[410px] sm:w-[380px] mt-24 sm:mt-28 overflow-y-scroll no-scrollbar">
            <div className="text-left mr-2">
              <h1 className="animate-slide-in-top animate-duration-100 animate-delay-0 text-2xl text-balance px-3 text-center justify-center font-bold mb-3">
                {strongIndividual.id} - {strongIndividual.le}
              </h1>
              <h2 className="animate-slide-in-top animate-duration-100 animate-delay-100 text-2xl text-balance px-3 text-center justify-center font-bold">
                {strongIndividual.pl} ({strongIndividual.ti})
              </h2>
              <p className="font-thin text-lg py-2 my-2 animate-slide-in-top animate-duration-100 animate-delay-200">
                Pronunciación: <strong className="font-bold text-xl">{strongIndividual.ps}</strong>
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
