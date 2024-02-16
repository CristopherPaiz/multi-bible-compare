import { useState, useEffect, useRef, useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";

const ListBooks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const { t } = useContext(LanguageContext);
  const { setBibliasSeleccionadas, setModalLibros } = useContext(DataContext);

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

  const handleBookToggle = (bookUrl) => {
    setSelectedBooks((prevSelectedBooks) =>
      prevSelectedBooks.includes(bookUrl) ? prevSelectedBooks.filter((selectedBook) => selectedBook !== bookUrl) : [...prevSelectedBooks, bookUrl]
    );
  };

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

  const getInitials = (book) => {
    if (book.new && book.old) {
      return (
        <div className="flex gap-x-1 mx-2 pr-2">
          <span className="p-2 bg-red-600 text-white text-[9px] h-7 justify-center text-center">{t("AntiguoTestamentoInicial")}</span>
          <span className="p-2 bg-blue-600 text-white text-[9px] h-7 justify-center text-center">{t("NuevoTestamentoInicial")}</span>
        </div>
      );
    } else if (book.new) {
      return (
        <div className="flex gap-x-1 mx-2 pr-2">
          <span className="p-2 bg-transparent text-transparent text-[9px] h-7 justify-center text-center">{t("AntiguoTestamentoInicial")}</span>
          <span className="p-2 bg-blue-600 text-white text-[9px] h-7 justify-center text-center">{t("NuevoTestamentoInicial")}</span>
        </div>
      );
    } else if (book.old) {
      return (
        <div className="flex gap-x-1 mx-2 pr-2">
          <span className="p-2 bg-red-600 text-white text-[9px] h-7 justify-center text-center">{t("AntiguoTestamentoInicial")}</span>
          <span className="p-2 bg-transparent text-transparent text-[9px] h-7 justify-center text-center">{t("NuevoTestamentoInicial")}</span>
        </div>
      );
    }
    return (
      <div className="flex gap-x-1 mx-2 pr-2">
        <span className="p-2 bg-transparent text-transparent text-[9px] h-7 justify-center text-center">O</span>
        <span className="p-2 bg-transparent text-transparent text-[9px] h-7 justify-center text-center">N</span>
      </div>
    );
  };

  const unmarkAll = () => {
    setSelectedBooks([]);
  };

  const BOOKS = {
    spanish: {
      "Biblia Español 1569": { ruta: "61. Español - (1569)", new: true, old: true },
      "Reina Valera Nueva Traducción 1858": { ruta: "62. Español - Reina Valera Nueva Traduccción [RVNT] (1858)", new: true, old: false },
      "Reina Valera 1909": { ruta: "65. Español - Reina Valera (1909)", new: true, old: true },
      "Reina Valera 1960": { ruta: "75. Español - Reina Valera [RV60] (1960)", new: true, old: true },
      "Reina Valera Revisada 1960": { ruta: "72. Español - Reina Valera Revisada [RVR] (1960)", new: true, old: true },
      "Biblia del Oso 1973": { ruta: "64. Español - Biblia del oso [BDO] (1973)", new: true, old: true },
      "Biblia Español 1989": { ruta: "63. Español - (1989)", new: true, old: true },
      "Reina Valera 1995": { ruta: "76. Español - Reina Valera [RV95] (1995)", new: true, old: true },
      "Dios Habla Hoy 1996": { ruta: "69. Español - Dios Habla Hoy [DHH] (1996)", new: true, old: true },
      "Biblia de la Américas 1997": { ruta: "70. Español - La Biblia de Las Américas [LBLA] (1997)", new: true, old: true },
      "Nueva Versión Iternacional 1999": { ruta: "71. Español - Nueva Versión Internacional  [NVI] (1999)", new: true, old: true },
      "Biblia Textual 1999": { ruta: "68. Español - La Biblia Textual (1999)", new: true, old: true },
      "Traducción en lenguaje Actual 2000": { ruta: "77. Español - Traducción en lenguaje actual [TLA] (2000)", new: true, old: true },
      "Reina Valera Gómez 2004": { ruta: "74. Español - Reina Valera Gómez [RVG] (2004)", new: true, old: true },
      "Biblia Traducción Interconfesional 2008": { ruta: "67. Español - Biblia Traducción Interconfesional [BTI] (2008)", new: true, old: true },
      "Biblia La Palabra 2010": { ruta: "66. Español - Biblia La Palabra [BLP] (2010)", new: true, old: true },
      "Versión Biblia Gratis 2018": { ruta: "78. Español - Versión Biblia Gratis [VBG] (2018)", new: true, old: false },
      "Reina Valera 2020": { ruta: "73. Español - Reina Valera [RV] (2020)", new: true, old: true },
    },
    greek: {
      "F35 1453": { ruta: "26. Greek - F35 (1453)", new: true, old: false },
      "Stephanus NT 1550": { ruta: "21. Greek - Stephanus NT (1550)", new: true, old: false },
      "Elzevir 1624": { ruta: "25. Greek - Elzevir (1624)", new: true, old: false },
      "Neophytos Vamvas 1770": { ruta: "22. Greek - Neophytos Vamvas Translation (1770)", new: true, old: true },
      "TR 1894": { ruta: "37. Greek - TR (1894)", new: true, old: false },
      "BYZ04 1904": { ruta: "23. Greek - BYZ04 (1904)", new: true, old: false },
      "GNT 1904": { ruta: "28. Greek - GNT (1904)", new: true, old: false },
      "Modern Bible 1904": { ruta: "30. Greek - Modern Bible (1904)", new: true, old: true },
      "NTV 1967": { ruta: "32. Greek - NTV (1967)", new: true, old: false },
      "FPB 1993": { ruta: "27. Greek - FPB (1993)", new: true, old: true },
      "LMGNT 1994": { ruta: "29. Greek - LMGNT (1994)", new: true, old: false },
      "Modern Bible FPB 1994": { ruta: "31. Greek - Modern Bible FPB (1994)", new: true, old: true },
      "TGV 1997": { ruta: "35. Greek - TGV (1997)", new: true, old: true },
      "TCGNT 2005": { ruta: "34. Greek - TCGNT (2005)", new: true, old: false },
      "SBLGNT 2010": { ruta: "33. Greek - SBLGNT (2010)", new: true, old: false },
      "THGNT 2018": { ruta: "36. Greek - THGNT (2018)", new: true, old: false },
      "BYZ18 2018": { ruta: "24. Greek - BYZ18 (2018)", new: true, old: false },
    },
    hebrew: {
      "Aleppo Codex Bible 920": { ruta: "39. Hebrew - Aleppo Codex Bible (920)", new: false, old: true },
      "Bible DHNT 1885": { ruta: "38. Hebrew - Bible DHNT (1885)", new: true, old: false },
      "Bible Modern 1977": { ruta: "40. Hebrew - Bible Modern (1977)", new: true, old: true },
      "Leningrad Codex 1991": { ruta: "43. Hebrew - Leningrad Codex (1991)", new: false, old: true },
      "Bible HHH 2009": { ruta: "42. Hebrew - Bible HHH (2009)", new: true, old: false },
      "Bible MHB 2010": { ruta: "44. Hebrew - Bible MHB (2010)", new: true, old: true },
      "BSI 2017": { ruta: "41. Hebrew - BSI (2017)", new: true, old: true },
      "TD 2018": { ruta: "46. Hebrew - TD (2018)", new: true, old: true },
      "MHNT 2020": { ruta: "45. Hebrew - MHNT (2020)", new: true, old: false },
    },
    english: {
      "Tyndale 1537": { ruta: "18. English - Tyndale (1537)", new: true, old: true },
      "Darby Translation 1890": { ruta: "04. English - Darby (1890)", new: true, old: true },
      "Young's Literal Translation 1898": { ruta: "19. English - Young's Literal Translation [YLT] (1898)", new: true, old: true },
      "American Standard Version 1901": { ruta: "02. English - American Standard Version [ASV] (1901)", new: true, old: true },
      "New American Standard Bible 1971": { ruta: "10. English - New American Standard Bible [NASB] (1971)", new: true, old: true },
      "New International Version 1978": { ruta: "14. English - New International Version [NIV] (1978)", new: true, old: true },
      "New King James Version 1982": { ruta: "15. English - New King James [NKJ] (1982)", new: true, old: true },
      "New American Standard Bible Updated 1989": { ruta: "11. English - New American Standard Bible Updated [NASU] (1989)", new: true, old: true },
      "New Revised Standard Version 1989": { ruta: "17. English - New Revised Standard Version [NRSV] (1989)", new: true, old: true },
      "God's Word 1995": { ruta: "07. English - God's Word [GW] (1995)", new: true, old: true },
      "New International Reader's Version 1996": { ruta: "13. English - New International Reader's Version [NIRV] (1996)", new: true, old: true },
      "New Living Translation 1996": { ruta: "16. English - New Living Translation [NLT] (1996)", new: true, old: true },
      "Easy to Read Version 2006": { ruta: "05. English - Easy to Read Version [ERV] (2006)", new: true, old: true },
      "Holman Christian Standard Bible 2004": { ruta: "08. English - Holman Christian Standard Bible [HCSB] (2004)", new: true, old: true },
      "King James Version 2004": { ruta: "09. English - King James Version [KJV] (1611)", new: true, old: true },
      "New English Translation 2005": { ruta: "12. English - New English Translation [NET] (2005)", new: true, old: true },
      "Amplified Version 2015": { ruta: "01. English - Amplified (2015)", new: true, old: true },
      "English Standard Version 2016": { ruta: "06. English - English Standard Version [ESV] (2016)", new: true, old: true },
      "Christian Standard Bible 2017": { ruta: "03. English - Christian Standard Bible [CSB] (2017)", new: true, old: true },
    },
    esperanto: {
      "Esperanto Version 1926": { ruta: "20. Esperanto - Bible (1926)", new: true, old: true },
    },
    kiche: {
      "Quiché 1995": { ruta: "47. Quiché - (1995)", new: true, old: true },
      "Quiché 1997": { ruta: "49. Quiché - (1997)", new: true, old: false },
      "Quiché QUCN 2011": { ruta: "50. Quiché - QUCN (2011)", new: true, old: false },
      "Quiché 2022": { ruta: "48. Quiché - (2022)", new: true, old: false },
    },
    latin: {
      "Vulgate Version 405": { ruta: "51. Latin - Vulgate Version (405)", new: true, old: true },
      "Vulgata Sistina 1590": { ruta: "55. Latin - Vulgata Sistina (1590)", new: true, old: true },
      "Clementine Vulgata 1598": { ruta: "53. Latin - Clementine Vulgata (1598)", new: true, old: true },
      "Vulgata Clementina Hetzenauer Editore 1914": { ruta: "52. Latin - Vulgata Clementina Hetzenauer Editore (1914)", new: true, old: true },
      "Nova Vulgata 1979": { ruta: "54. Latin - Nova Vulgata (1979)", new: true, old: true },
    },
    nahuatl: {
      "Náhuatl NHE 1985": { ruta: "59. Náhuatl - NHE (1985)", new: true, old: true },
      "Náhuatl 1987": { ruta: "58. Náhuatl - (1987)", new: true, old: false },
      "Náhuatl 2012": { ruta: "56. Náhuatl - (2012)", new: true, old: false },
      "Náhuatl 2017": { ruta: "57. Náhuatl - (2017)", new: true, old: false },
    },
    queqchi: {
      "Q'eqchi 2017": { ruta: "60. Q'eqchi - (2017)", new: true, old: true },
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
        <button onClick={openModal} className="bg-yellow-300 dark:bg-blue-700 dark:text-white p-3 rounded-md hover:cursor-pointer m-auto">
          {t("SeleccionarBiblias")}
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-11/12 h-4/5 flex flex-col  dark:bg-black dark:text-white sm:w-[550px]">
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4">{t("SeleccionarLibro")}</h1>
            <div className="flex gap-4 px-2 pb-5" style={{ alignItems: "center" }}>
              <span className="p-2 bg-red-600 text-white text-[9px] h-7 justify-center text-center">{t("AntiguoTestamentoInicial")}</span>
              <p className="text-[14px]">{t("AntiguoTestamento")}</p>
              <span className="p-2 bg-blue-600 text-white text-[9px] h-7 justify-center text-center">{t("NuevoTestamentoInicial")}</span>
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
                          className={`flex w-full h-14 text-left pr-3 flex-row justify-between ${
                            selectedBooks.includes(book.ruta) ? "bg-green-300 dark:bg-green-800" : "bg-gray-100 dark:bg-gray-800"
                          }`}
                          onClick={() => handleBookToggle(book.ruta)}
                        >
                          <div className="flex flex-1 pr-2" style={{ alignItems: "center" }}>
                            {getInitials(book)} {bookTitle}
                          </div>
                          <div className="w-5">{selectedBooks.includes(book.ruta) && <span>✔️</span>}</div>
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
