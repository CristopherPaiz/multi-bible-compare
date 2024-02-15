import { useState, useRef, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";

const ListSubBooks = () => {
  const { libros, setLibroSeleccionado, libroSeleccionado, modalLibros, setModalLibros } = useContext(DataContext);
  const [selectedBook, setSelectedBook] = useState(libroSeleccionado);
  const { t } = useContext(LanguageContext);

  const modalRef = useRef(null);

  const closeModal = () => {
    setModalLibros(false);
  };

  const selectBook = (key, index) => {
    setSelectedBook(key);
    setLibroSeleccionado(`book${index + 1}`);
  };

  return (
    <>
      {modalLibros && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-11/12 h-4/5 flex flex-col dark:bg-black dark:text-white sm:w-[550px]">
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4 m-auto">{t("SeleccioneLibro")}</h1>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-scroll no-scrollbar">
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
                        value.length > 16 ? "col-span-3" : value.length > 11 ? "col-span-2" : "col-span-1"
                      } ${selectedBook === key ? "bg-green-200 border-green-500 dark:bg-green-500 dark:border-green-500" : ""}`}
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
                        value.length > 16 ? "col-span-3" : value.length > 11 ? "col-span-2" : "col-span-1"
                      } ${selectedBook === key ? "bg-green-200 border-green-500 dark:bg-green-500 dark:border-green-500" : ""}`}
                    >
                      <p>{value}</p>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListSubBooks;
