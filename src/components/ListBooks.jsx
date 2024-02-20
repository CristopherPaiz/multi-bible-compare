import { useState, useEffect, useRef, useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import A from "/A.webp";
import AN from "/AN.webp";
import N from "/N.webp";
import O from "/O.webp";
import ON from "/ON.webp";

const ListBooks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const { setBibliasSeleccionadas, setModalLibros } = useContext(DataContext);

  //ESTRELLA
  const [favoriteBooks, setFavoriteBooks] = useState([]);

  const handleBookToggle = (ruta) => {
    const newSelectedBooks = selectedBooks.includes(ruta)
      ? selectedBooks.filter((book) => book !== ruta)
      : [...selectedBooks, ruta];
    setSelectedBooks(newSelectedBooks);
  };

  const handleFavoriteToggle = (ruta) => {
    const newFavoriteBooks = favoriteBooks.includes(ruta)
      ? favoriteBooks.filter((book) => book !== ruta)
      : [...favoriteBooks, ruta];
    setFavoriteBooks(newFavoriteBooks);
  };
  // FIN ESTRELLA

  useEffect(() => {
    const selectedBooksString = localStorage.getItem("selectedBooks");
    if (selectedBooksString) {
      setSelectedBooks(JSON.parse(selectedBooksString));
    }

    const favoriteBooksString = localStorage.getItem("favoriteBooks");
    if (favoriteBooksString) {
      setFavoriteBooks(JSON.parse(favoriteBooksString));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedBooks", JSON.stringify(selectedBooks));
    localStorage.setItem("favoriteBooks", JSON.stringify(favoriteBooks));
  }, [selectedBooks, favoriteBooks]);

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

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    if (selectedBooks.length === 0) return alert(t("SeleccioneUnaBiblia"));
    setBibliasSeleccionadas(selectedBooks);
    setTimeout(() => {
      setModalLibros(true);
      closeModal();
    }, 150);
  };

  const getInitials = (book, year) => {
    if (book.new && book.old) {
      return (
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2">
          <h4 className="text-[10px] font-bold">{year}</h4>
          {idiomaNavegador === "es" ? <img src={AN} className="size-8" /> : <img src={ON} className="size-8" />}
        </div>
      );
    } else if (book.new) {
      return (
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2">
          <h4 className="text-[10px] font-bold">{year}</h4>
          <img src={N} className="size-8" />
        </div>
      );
    } else if (book.old) {
      return (
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2">
          <h4 className="text-[10px] font-bold">{year}</h4>
          {idiomaNavegador === "es" ? <img src={A} className="size-8" /> : <img src={O} className="size-8" />}
        </div>
      );
    }
  };

  const unmarkAll = () => {
    setSelectedBooks([]);
  };

  const BOOKS = {
    spanish: {
      "Biblia Español": { ruta: "61. Español - (1569)", new: true, old: true, year: 1569 },
      "Reina Valera [RVNT]": {
        ruta: "62. Español - Reina Valera Nueva Traduccción [RVNT] (1858)",
        new: true,
        old: false,
        year: 1858,
      },
      "Reina Valera [RV09]": { ruta: "65. Español - Reina Valera (1909)", new: true, old: true, year: 1909 },
      "Reina Valera [RV60]": { ruta: "75. Español - Reina Valera [RV60] (1960)", new: true, old: true, year: 1960 },
      "Reina Valera Revisada [RVR60]": {
        ruta: "72. Español - Reina Valera Revisada [RVR] (1960)",
        new: true,
        old: true,
        year: 1960,
      },
      "Biblia del Oso [BDO]": { ruta: "64. Español - Biblia del oso [BDO] (1973)", new: true, old: true, year: 1973 },
      "Biblia Español [BE89]": { ruta: "63. Español - (1989)", new: true, old: true, year: 1989 },
      "Reina Valera [RV95]": { ruta: "76. Español - Reina Valera [RV95] (1995)", new: true, old: true, year: 1995 },
      "Dios Habla Hoy [DHH]": { ruta: "69. Español - Dios Habla Hoy [DHH] (1996)", new: true, old: true, year: 1996 },
      "Biblia de la Américas [LBLA]": {
        ruta: "70. Español - La Biblia de Las Américas [LBLA] (1997)",
        new: true,
        old: true,
        year: 1997,
      },
      "Nueva Versión Iternacional [NVI]": {
        ruta: "71. Español - Nueva Versión Internacional  [NVI] (1999)",
        new: true,
        old: true,
        year: 1999,
      },
      "Biblia Textual [BT]": { ruta: "68. Español - La Biblia Textual (1999)", new: true, old: true, year: 1999 },
      "Traducción en lenguaje Actual [TLA]": {
        ruta: "77. Español - Traducción en lenguaje actual [TLA] (2000)",
        new: true,
        old: true,
        year: 2000,
      },
      "Reina Valera Gómez [RVG]": {
        ruta: "74. Español - Reina Valera Gómez [RVG] (2004)",
        new: true,
        old: true,
        year: 2004,
      },
      "Biblia Traducción Interconfesional [BTI]": {
        ruta: "67. Español - Biblia Traducción Interconfesional [BTI] (2008)",
        new: true,
        old: true,
        year: 2008,
      },
      "Biblia La Palabra [BLP]": {
        ruta: "66. Español - Biblia La Palabra [BLP] (2010)",
        new: true,
        old: true,
        year: 2010,
      },
      "Versión Biblia Gratis [VBG]": {
        ruta: "78. Español - Versión Biblia Gratis [VBG] (2018)",
        new: true,
        old: false,
        year: 2018,
      },
      "Reina Valera [RV20]": { ruta: "73. Español - Reina Valera [RV] (2020)", new: true, old: true, year: 2020 },
    },
    greek: {
      F35: { ruta: "26. Greek - F35 (1453)", new: true, old: false, year: 1453 },
      "Stephanus NT 1550": { ruta: "21. Greek - Stephanus NT (1550)", new: true, old: false, year: 1550 },
      "Elzevir 1624": { ruta: "25. Greek - Elzevir (1624)", new: true, old: false, year: 1624 },
      "Neophytos Vamvas 1770": {
        ruta: "22. Greek - Neophytos Vamvas Translation (1770)",
        new: true,
        old: true,
        year: 1770,
      },
      TR: { ruta: "37. Greek - TR (1894)", new: true, old: false, year: 1894 },
      BYZ04: { ruta: "23. Greek - BYZ04 (1904)", new: true, old: false, year: 1904 },
      GNT: { ruta: "28. Greek - GNT (1904)", new: true, old: false, year: 1904 },
      "Modern Bible": { ruta: "30. Greek - Modern Bible (1904)", new: true, old: true, year: 1904 },
      NTV: { ruta: "32. Greek - NTV (1967)", new: true, old: false, year: 1967 },
      FPB: { ruta: "27. Greek - FPB (1993)", new: true, old: true, year: 1993 },
      LMGNT: { ruta: "29. Greek - LMGNT (1994)", new: true, old: false, year: 1994 },
      "Modern Bible FPB": { ruta: "31. Greek - Modern Bible FPB (1994)", new: true, old: true, year: 1994 },
      TGV: { ruta: "35. Greek - TGV (1997)", new: true, old: true, year: 1997 },
      TCGNT: { ruta: "34. Greek - TCGNT (2005)", new: true, old: false, year: 2005 },
      SBLGNT: { ruta: "33. Greek - SBLGNT (2010)", new: true, old: false, year: 2010 },
      THGNT: { ruta: "36. Greek - THGNT (2018)", new: true, old: false, year: 2018 },
      BYZ18: { ruta: "24. Greek - BYZ18 (2018)", new: true, old: false, year: 2018 },
    },
    hebrew: {
      "Aleppo Codex Bible": { ruta: "39. Hebrew - Aleppo Codex Bible (920)", new: false, old: true, year: 920 },
      "Bible DHNT": { ruta: "38. Hebrew - Bible DHNT (1885)", new: true, old: false, year: 1885 },
      "Bible Modern": { ruta: "40. Hebrew - Bible Modern (1977)", new: true, old: true, year: 1977 },
      "Leningrad Codex": { ruta: "43. Hebrew - Leningrad Codex (1991)", new: false, old: true, year: 1991 },
      "Bible HHH": { ruta: "42. Hebrew - Bible HHH (2009)", new: true, old: false, year: 2009 },
      "Bible MHB": { ruta: "44. Hebrew - Bible MHB (2010)", new: true, old: true, year: 2010 },
      BSI: { ruta: "41. Hebrew - BSI (2017)", new: true, old: true, year: 2017 },
      TD: { ruta: "46. Hebrew - TD (2018)", new: true, old: true, year: 2018 },
      MHNT: { ruta: "45. Hebrew - MHNT (2020)", new: true, old: false, year: 2020 },
    },
    english: {
      Tyndale: { ruta: "18. English - Tyndale (1537)", new: true, old: true, year: 1537 },
      "Darby Translation": { ruta: "04. English - Darby (1890)", new: true, old: true, year: 1890 },
      "Young's Literal Translation 1898": {
        ruta: "19. English - Young's Literal Translation [YLT] (1898)",
        new: true,
        old: true,
        year: 1898,
      },
      "American Standard Version": {
        ruta: "02. English - American Standard Version [ASV] (1901)",
        new: true,
        old: true,
        year: 1901,
      },
      "New American Standard Bible": {
        ruta: "10. English - New American Standard Bible [NASB] (1971)",
        new: true,
        old: true,
        year: 1971,
      },
      "New International Version": {
        ruta: "14. English - New International Version [NIV] (1978)",
        new: true,
        old: true,
        year: 1978,
      },
      "New King James Version": { ruta: "15. English - New King James [NKJ] (1982)", new: true, old: true },
      "New American Standard Bible Updated": {
        ruta: "11. English - New American Standard Bible Updated [NASU] (1989)",
        new: true,
        old: true,
        year: 1989,
      },
      "New Revised Standard Version": {
        ruta: "17. English - New Revised Standard Version [NRSV] (1989)",
        new: true,
        old: true,
        year: 1989,
      },
      "God's Word": { ruta: "07. English - God's Word [GW] (1995)", new: true, old: true },
      "New International Reader's Version": {
        ruta: "13. English - New International Reader's Version [NIRV] (1996)",
        new: true,
        old: true,
        year: 1996,
      },
      "New Living Translation": {
        ruta: "16. English - New Living Translation [NLT] (1996)",
        new: true,
        old: true,
        year: 1996,
      },
      "Easy to Read Version": { ruta: "05. English - Easy to Read Version [ERV] (2006)", new: true, old: true },
      "Holman Christian Standard Bible": {
        ruta: "08. English - Holman Christian Standard Bible [HCSB] (2004)",
        new: true,
        old: true,
        year: 2004,
      },
      "King James Version": { ruta: "09. English - King James Version [KJV] (1611)", new: true, old: true },
      "New English Translation": {
        ruta: "12. English - New English Translation [NET] (2005)",
        new: true,
        old: true,
        year: 2005,
      },
      "Amplified Version": { ruta: "01. English - Amplified (2015)", new: true, old: true },
      "English Standard Version": {
        ruta: "06. English - English Standard Version [ESV] (2016)",
        new: true,
        old: true,
        year: 2016,
      },
      "Christian Standard Bible": {
        ruta: "03. English - Christian Standard Bible [CSB] (2017)",
        new: true,
        old: true,
        year: 2017,
      },
    },
    esperanto: {
      "Esperanto Version": { ruta: "20. Esperanto - Bible (1926)", new: true, old: true, year: 1926 },
    },
    kiche: {
      "Quiché [BK95]]": { ruta: "47. Quiché - (1995)", new: true, old: true, year: 1995 },
      "Quiché [BK97]]": { ruta: "49. Quiché - (1997)", new: true, old: false, year: 1997 },
      "Quiché QUCN": { ruta: "50. Quiché - QUCN (2011)", new: true, old: false, year: 2011 },
      "Quiché [BK22]": { ruta: "48. Quiché - (2022)", new: true, old: false, year: 2022 },
    },
    latin: {
      "Vulgate Version": { ruta: "51. Latin - Vulgate Version (405)", new: true, old: true, year: 405 },
      "Vulgata Sistina": { ruta: "55. Latin - Vulgata Sistina (1590)", new: true, old: true, year: 1590 },
      "Clementine Vulgata": { ruta: "53. Latin - Clementine Vulgata (1598)", new: true, old: true, year: 1598 },
      "Vulgata Clementina Hetzenauer Editore": {
        ruta: "52. Latin - Vulgata Clementina Hetzenauer Editore (1914)",
        new: true,
        old: true,
        year: 1914,
      },
      "Nova Vulgata": { ruta: "54. Latin - Nova Vulgata (1979)", new: true, old: true, year: 1979 },
    },
    nahuatl: {
      "Náhuatl NHE": { ruta: "59. Náhuatl - NHE (1985)", new: true, old: true, year: 1985 },
      "Náhuatl [N87]": { ruta: "58. Náhuatl - (1987)", new: true, old: false, year: 1987 },
      "Náhuatl [N12]": { ruta: "56. Náhuatl - (2012)", new: true, old: false, year: 2012 },
      "Náhuatl [N17]": { ruta: "57. Náhuatl - (2017)", new: true, old: false, year: 2017 },
    },
    queqchi: {
      "Q'eqchi": { ruta: "60. Q'eqchi - (2017)", new: true, old: true, year: 2017 },
    },
  };

  const translateLanguage = (language) => {
    switch (language) {
      case "spanish":
        return t("Espanol");
      case "greek":
        return t("Griego");
      case "hebrew":
        return t("Hebreo");
      case "english":
        return t("Ingles");
      case "esperanto":
        return t("Esperanto");
      case "kiche":
        return t("Kiche");
      case "latin":
        return t("Latin");
      case "nahuatl":
        return t("Nahuatl");
      case "queqchi":
        return t("Queqchi");
      default:
        return language;
    }
  };

  return (
    <>
      <div className="flex w-full justify-center my-4">
        <button
          onClick={openModal}
          className="bg-[#FDD07A] dark:bg-[#693BCC] dark:text-white p-3 rounded-md hover:cursor-pointer m-auto"
        >
          {t("SeleccionarBiblias")}
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div
            ref={modalRef}
            className="bg-white p-4 rounded shadow-md w-11/12 h-4/5 flex flex-col  dark:bg-black dark:text-white sm:w-[550px]"
          >
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4">{t("SeleccionarLibro")}</h1>
            <div className="flex gap-4 px-2 pb-5 m-auto" style={{ alignItems: "center" }}>
              <span className="p-2 bg-red-600 text-white text-[9px] h-7 justify-center text-center">
                {t("AntiguoTestamentoInicial")}
              </span>
              <p className="text-[14px]">{t("AntiguoTestamento")}</p>
              <span className="p-2 bg-blue-600 text-white text-[9px] h-7 justify-center text-center">
                {t("NuevoTestamentoInicial")}
              </span>
              <p className="text-[14px]">{t("NuevoTestamento")}</p>
            </div>
            <div className="flex flex-col flex-1 overflow-y-scroll no-scrollbar">
              {Object.entries(BOOKS).map(([language, books]) => (
                <div key={language} className="mb-4">
                  <h2 className="text-lg font-bold mb-2">{translateLanguage(language)}</h2>
                  <ul className="flex gap-1 flex-col">
                    {Object.entries(books).map(([bookTitle, book]) => (
                      <li key={bookTitle}>
                        <button
                          style={{ alignItems: "center" }}
                          className={`flex w-full h-14 rounded-lg text-left pl-2 flex-row justify-between ${
                            selectedBooks.includes(book.ruta)
                              ? "bg-green-300 dark:bg-green-800"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}
                          onClick={() => handleBookToggle(book.ruta)}
                        >
                          <div className="w-5 relative">
                            {!selectedBooks.includes(book.ruta) && (
                              <div className="ml-1 w-4 h-4 border border-gray-400 rounded-sm" />
                            )}
                            {selectedBooks.includes(book.ruta) && <span>✅</span>}
                          </div>
                          <div className="flex flex-1 pr-2" style={{ alignItems: "center" }}>
                            {getInitials(book, book.year)} {bookTitle}
                          </div>
                          {/* Estrella de favorito */}
                          <div>
                            <div
                              className="flex items-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation(); // Evitar que el clic en la estrella active/desactive el libro
                                handleFavoriteToggle(book.ruta);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-5 w-5 ${
                                  favoriteBooks.includes(book.ruta) ? "text-yellow-400" : "text-gray-400"
                                }`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 17.897l-4.095 1.28.785-4.54-3.31-3.22 4.57-.665L10 7.305l2.04 4.467 4.57.665-3.31 3.22.785 4.54L10 17.897z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-white justify-center flex pt-3 gap-3 dark:bg-black">
              <button className="p-2 bg-red-500 text-white rounded px-3 text-sm" onClick={unmarkAll}>
                {t("DesmarcarTodo")}
              </button>
              <button className="p-2 bg-blue-500 text-white rounded px-3 text-sm" onClick={handleConfirm}>
                {t("Continuar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListBooks;
