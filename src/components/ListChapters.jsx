import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import LEFT_ICON from "/left.png";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ListChapters = () => {
  const { modalChapters, setModalChapters, Chapters, setModalLibros, setModalVerses, setVersiculoSeleccionado, setCapituloSeleccionadoNumero } =
    useContext(DataContext);
  const [selectedChapter, setSelectedChapter] = useState("");
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(modalChapters, () => setModalChapters(false));

  const closeModal = () => {
    setModalChapters(false);
    setModalLibros(true);
    setSelectedChapter("");
  };

  const selectChapter = (key) => {
    setSelectedChapter(key[0]);
    setVersiculoSeleccionado(key[1]);
    setCapituloSeleccionadoNumero(key[0]);
    setTimeout(() => {
      setModalVerses(true);
      setModalChapters(false);
      setModalLibros(false);
    }, 150);
  };

  return (
    <>
      {modalChapters && (
        <div className="animate-fade-in-left animate-duration-150 fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-[999999]">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-11/12 h-4/5 flex flex-col dark:bg-black dark:text-white sm:w-[550px]">
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4 text-center">{t("SeleccionarCapitulo")}</h1>
            <div className="flex flex-wrap gap-2 justify-center overflow-y-scroll no-scrollbar flex-1" style={{ alignContent: "flex-start" }}>
              {Object.entries(Chapters).map((key, index) => (
                <div
                  key={key}
                  onClick={() => selectChapter(key, index)}
                  className={`w-[52px] h-[58px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-4 px-2 dark:bg-neutral-900 cursor-pointer`}
                  style={{ backgroundColor: selectedChapter === key[0] ? "#d3c836" : "" }}
                >
                  {key[0]}
                </div>
              ))}
            </div>
            <div className="bg-white justify-center flex pt-3 gap-3 dark:bg-black">
              <button className="p-2 bg-red-500 text-white rounded text-sm flex flex-row gap-2 px-7 py-3" onClick={closeModal}>
                <img className="h-4 mt-1 invert" src={LEFT_ICON} />
                {t("Regresar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListChapters;
