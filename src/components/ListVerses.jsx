import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import LEFT_ICON from "/left.png";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";

const ListVerses = () => {
  const { modalVerses, setModalVerses, setModalLibros, setModalChapters, versiculoSeleccionado, setVersiculoSeleccionadoNumero } = useContext(DataContext);
  const [selectedVerse, setSelectedVerse] = useState("");
  const { t } = useContext(LanguageContext);
  const modalRef = useRef(null);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(modalVerses, () => setModalVerses(false));

  const closeModal = () => {
    setModalVerses(false);
    setModalLibros(false);
    setModalChapters(true);
    setSelectedVerse("");
  };

  const selectChapter = (key) => {
    setSelectedVerse(key);
    setVersiculoSeleccionadoNumero(key);
    setTimeout(() => {
      setModalVerses(false);
      setModalChapters(false);
      setModalLibros(false);
    }, 150);
  };

  return (
    <>
      {modalVerses && (
        <div className="animate-fade-in-right animate-duration-150 fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-[999999]">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-11/12 h-4/6 flex flex-col dark:bg-black dark:text-white sm:w-[550px]">
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4 text-center">{t("SeleccioneElVersiculo")}</h1>
            <div className="flex flex-wrap gap-2 justify-center overflow-y-scroll no-scrollbar flex-1" style={{ alignContent: "flex-start" }}>
              {versiculoSeleccionado.length > 0 &&
                versiculoSeleccionado.map((key) => (
                  <div
                    key={key}
                    onClick={() => selectChapter(key)}
                    className={`w-[52px] h-[58px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-4 px-2 dark:bg-neutral-900 cursor-pointer`}
                    style={{ backgroundColor: selectedVerse === key ? "#369fd3" : "" }}
                  >
                    {key}
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

export default ListVerses;
