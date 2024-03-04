import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import LEFT_ICON from "/left.png";

const ListSubBooks = () => {
  const {
    libros,
    setLibroSeleccionado,
    libroSeleccionado,
    modalLibros,
    setModalLibros,
    setModalChapters,
    modoCompacto,
    setModoCompacto,
  } = useContext(DataContext);
  const [selectedBook, setSelectedBook] = useState(libroSeleccionado);
  const { t } = useContext(LanguageContext);

  const modalRef = useRef(null);

  const closeModal = () => {
    setModalLibros(false);
    setSelectedBook("");
  };

  const selectBook = (key, index) => {
    setSelectedBook(key);
    setLibroSeleccionado(`book${index + 1}`);
    setTimeout(() => {
      setModalChapters(true);
      setModalLibros(false);
    }, 150);
  };

  //CHANGE SWITCH
  const handleModoCompacto = () => {
    setModoCompacto(!modoCompacto);
  };

  return (
    <>
      {modalLibros && (
        <div className="animate-slide-in-top animate-duration-100 fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-[99999999]">
          <div
            ref={modalRef}
            className="z-[99999999] bg-white p-4 rounded shadow-md w-11/12 h-[85%] sm:h-[95%] flex flex-col dark:bg-black dark:text-white sm:w-[550px]"
          >
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4 m-auto">{t("SeleccioneLibro")}</h1>
            <label>
              <input type="checkbox" checked={modoCompacto} onChange={handleModoCompacto} />{" "}
              <span className="slider">Modo compacto</span>
            </label>

            {modoCompacto ? (
              <>
                <div className="z-[99999999] grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-scroll no-scrollbar">
                  <div className="col-span-full mb-1">
                    <h2 className="text-lg font-semibold">{t("AntiguoTestamento")}</h2>
                  </div>
                  {Object.entries(libros).map(
                    ([key, value], index) =>
                      index <= 38 && (
                        <div
                          key={key}
                          onClick={() => selectBook(key, index)}
                          className={`text-[12px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-2 px-2 dark:bg-neutral-900 cursor-pointer ${
                            value.length > 3 ? "col-span-1" : value.length > 1 ? "col-span-1" : "col-span-1"
                          }`}
                          style={{ backgroundColor: selectedBook === key ? "#34D399" : "" }}
                        >
                          <p>{value}</p>
                        </div>
                      )
                  )}
                  <div className="col-span-full mb-1">
                    <h2 className="text-lg font-semibold">{t("NuevoTestamento")}</h2>
                  </div>
                  {Object.entries(libros).map(
                    ([key, value], index) =>
                      index > 38 && (
                        <div
                          key={key}
                          onClick={() => selectBook(key, index)}
                          className={`text-[12px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-2 px-2 dark:bg-neutral-900 cursor-pointer ${
                            value.length > 3 ? "col-span-1" : value.length > 1 ? "col-span-1" : "col-span-1"
                          }`}
                          style={{ backgroundColor: selectedBook === key ? "#34D399" : "" }}
                        >
                          <p>{value}</p>
                        </div>
                      )
                  )}
                </div>
              </>
            ) : (
              <>
                {/* MODO NORMAL */}
                <div className="z-[99999999] grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-scroll no-scrollbar">
                  <div className="col-span-full mb-2">
                    <h2 className="text-lg font-semibold">{t("AntiguoTestamento")}</h2>
                  </div>

                  {Object.entries(libros).map(
                    ([key, value], index) =>
                      index <= 38 && (
                        <div
                          key={key}
                          onClick={() => selectBook(key, index)}
                          className={`text-[12px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-4 px-2 dark:bg-neutral-900 cursor-pointer ${
                            value.length > 14 ? "col-span-3" : value.length > 12 ? "col-span-2" : "col-span-1"
                          }`}
                          style={{ backgroundColor: selectedBook === key ? "#34D399" : "" }}
                        >
                          <p>{value}</p>
                        </div>
                      )
                  )}
                  <div className="col-span-full mb-2">
                    <h2 className="text-lg font-semibold">{t("NuevoTestamento")}</h2>
                  </div>
                  {Object.entries(libros).map(
                    ([key, value], index) =>
                      index > 38 && (
                        <div
                          key={key}
                          onClick={() => selectBook(key, index)}
                          className={`text-[12px] text-center rounded-xl border-2 border-slate-400/10 bg-neutral-100 py-4 px-2 dark:bg-neutral-900 cursor-pointer ${
                            value.length > 14 ? "col-span-3" : value.length > 13 ? "col-span-2" : "col-span-1"
                          }`}
                          style={{ backgroundColor: selectedBook === key ? "#34D399" : "" }}
                        >
                          <p>{value}</p>
                        </div>
                      )
                  )}
                </div>
              </>
            )}
            <div className="bg-white justify-center flex pt-3 gap-3 dark:bg-black">
              <button
                className="p-2 bg-red-500 text-white rounded text-sm flex flex-row gap-2 px-7 py-3"
                onClick={closeModal}
              >
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

export default ListSubBooks;
