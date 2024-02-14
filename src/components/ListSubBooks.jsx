import { useState, useRef, useEffect, useContext } from "react";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";

const ListSubBooks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState("");
  const { libros, setLibroSeleccionado } = useContext(DataContext);
  const { t } = useContext(LanguageContext);

  const modalRef = useRef(null);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const selectBook = (libroKey) => {
    console.log("Libro seleccionado:", libroKey);
    setLibroSeleccionado(libroKey);
    closeModal(); // Cierra el modal después de seleccionar un libro
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <>
      <div className="flex w-full justify-center my-4">
        <button onClick={openModal} className="bg-yellow-300 dark:bg-blue-700 dark:text-white p-3 rounded-md hover:cursor-pointer m-auto">
          Seleccionar libro
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-11/12 h-4/5 flex flex-col dark:bg-black dark:text-white sm:w-[550px]">
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4">{t("SeleccionarLibro")}</h1>
            <div className="grid grid-cols-2 gap-2 overflow-y-scroll">
              {Object.entries(libros).map(([key, value]) => (
                <div key={key} onClick={() => selectBook(key)} className="rounded-xl border-2 border-slate-400/10 bg-neutral-100 p-4 dark:bg-neutral-900 cursor-pointer">
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListSubBooks;
