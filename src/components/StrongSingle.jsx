import { useContext, useEffect, useState, createElement } from "react";
import DataContext from "../context/DataContext";
import "../styles/Strongs.css";

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
  const { strongData, cargandoStrong, strong, strongFun, setModalStrong } = useContext(DataContext);
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
      <div className="z-[9999999] h-[50%] w-[80%] border border-yellow-500 dark:border-purple-500 bg-yellow-300 dark:bg-purple-300 text-black dark:text-white overflow-y-scroll no-scrollbar">
        {cargandoStrong ? (
          <p>Cargando...</p>
        ) : (
          <div className="">
            <h1 className="font-semibold inline-flex mr-2">ID:</h1> <span> {strongIndividual.id}</span>
            <br />
            <h1 className="font-semibold inline-flex mr-2">LEXEMA:</h1> <span> {strongIndividual.le}</span>
            <br />
            <h1 className="font-semibold inline-flex mr-2">TRANSLITERACIÓN:</h1> <span> {strongIndividual.pl}</span>
            <br />
            <h1 className="font-semibold inline-flex mr-2">PRONUNCIACIÓN:</h1> <span> {strongIndividual.ps}</span>
            <br />
            <h1 className="font-semibold inline-flex mr-2">TÍTULO:</h1> <span> {strongIndividual.ti}</span>
            <br />
            <h1 className="font-semibold inline-flex mr-2">DEFINICIÓN:</h1> <span> {processedHtml}</span>
            <br />
            <button
              className="px-5 py-2 bg-slate-500 text-white m-auto rounded-md"
              onClick={() => {
                setModalStrong(false);
                strongFun("");
              }}
            >
              Cerrar modal
            </button>
          </div>
        )}
      </div>
      {/* BACKGROUND MODAL */}
      <div className="fixed w-full h-full bg-black/40 z-[999999]"></div>
    </>
  );
};

export default StrongSingle;
