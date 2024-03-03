import { useContext, useEffect, useState, createElement } from "react";
import DataContext from "../context/DataContext";

const processText = (html, strongFun) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allNodes = Array.from(doc.body.childNodes);

  const processedHtml = [];

  const generateKey = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}-${random}`;
  };

  for (const node of allNodes) {
    const key = node.nodeType === Node.TEXT_NODE ? node.textContent : generateKey();

    if (node.nodeType === Node.TEXT_NODE) {
      processedHtml.push(<span key={key}>{escapeHTML(node.textContent)}</span>);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "SPAN") {
        const onclickAttr = node.getAttribute("onclick");
        if (onclickAttr && onclickAttr.startsWith("strongFun(")) {
          const arg = onclickAttr.match(/strongFun\('(.*)'\)/)[1];
          processedHtml.push(
            <span
              key={key}
              onClick={() => strongFun(arg)}
              style={{ color: node.style.color, cursor: node.style.cursor }}
              className={"Slink"}
            >
              {processText(node.innerHTML, strongFun)}
            </span>
          );
        } else {
          processedHtml.push(
            createElement(node.tagName.toLowerCase(), { ...node.attributes }, processText(node.innerHTML, strongFun))
          );
        }
      } else {
        const attributes = Array.from(node.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {});
        processedHtml.push(
          createElement(
            node.tagName.toLowerCase(),
            attributes,
            node.hasChildNodes() ? processText(node.innerHTML, strongFun) : null
          )
        );
      }
    }
  }

  return processedHtml;
};

const escapeHTML = (str) =>
  str.replace(/[&<>"'/]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));

const StrongSingle = () => {
  const { strongData, cargandoStrong, strong, strongFun, setModalStrong, image, cargandoImagen } =
    useContext(DataContext);
  const [strongIndividual, setStrongIndividual] = useState("");

  useEffect(() => {
    if (!cargandoStrong) {
      const obtenerStrong = () => {
        const strongObj = strongData.find((obj) => obj.id === strong);
        return strongObj ? strongObj : "";
      };
      setStrongIndividual(obtenerStrong);
    }
  }, [strongData, strong, cargandoStrong]);

  const processedHtml = processText(strongIndividual.df, strongFun);

  return (
    <>
      <div className="z-[9999999] h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] text-black dark:text-white">
        {!cargandoImagen ? (
          <>
            {cargandoStrong ? (
              <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-white">
                <div className="flex flex-row gap-2">
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.7s]"></div>
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.3s]"></div>
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.7s]"></div>
                </div>
                <p className="text-white">Cargando...</p>
              </div>
            ) : (
              <div className="animate-pop animate-duration-100 h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] justify-center items-center relative">
                <img src={image} className="h-[530px] w-[350px] sm:w-[500px] sm:h-[680px] -z-10 fixed" />
                <div className="fixed m-14 sm:ml-16 h-[315px] w-[260px] sm:h-[410px] sm:w-[380px] mt-24 sm:mt-28 overflow-y-scroll no-scrollbar">
                  <div className="text-left mr-2">
                    <table>
                      <tr className="animate-slide-in-top animate-duration-100 animate-delay-0 flex text-2xl text-balance px-3 text-center justify-center font-bold -ml-4 mb-3">
                        {strongIndividual.id} - {strongIndividual.le}
                      </tr>
                      <tr className="animate-slide-in-top animate-duration-100 animate-delay-100 flex text-2xl text-balance px-3 text-center justify-center font-bold -ml-4">
                        {strongIndividual.pl} ({strongIndividual.ti})
                      </tr>
                      <br />
                      <tr className="font-thin text-lg py-4 my-4 animate-slide-in-top animate-duration-100 animate-delay-200">
                        Pronunciación: <b className="font-bold text-xl">{strongIndividual.ps}</b>
                      </tr>
                      <br />
                      <tr className="py-4 my-4">Definición:</tr>
                      <tr className="">{processedHtml}</tr>
                    </table>
                  </div>
                </div>
                <button
                  className="px-5 py-2 bg-red-500 text-white m-auto text-2xl  size-14 sm:size-16 bottom-[55px] left-[153px] sm:left-[230px] sm:bottom-[60px] text-center absolute rounded-full"
                  onClick={() => {
                    setModalStrong(false);
                    strongFun("");
                  }}
                >
                  X
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-white">
            <div className="flex flex-row gap-2">
              <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.7s]"></div>
              <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.3s]"></div>
              <div className="w-4 h-4 rounded-full bg-white dark:bg-white animate-bounce [animation-delay:.7s]"></div>
            </div>
            <p className="text-white">Cargando...</p>
          </div>
        )}
      </div>
      {/* BACKGROUND MODAL */}
      <div className="fixed w-full h-full bg-black/40 z-[999999]"></div>
    </>
  );
};

export default StrongSingle;
