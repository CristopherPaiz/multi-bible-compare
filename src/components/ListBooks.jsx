import { useState, useEffect, useRef, useContext } from "react";
import LanguageContext from "../context/LanguageContext";
import DataContext from "../context/DataContext";
import A from "/A.webp";
import AN from "/AN.webp";
import N from "/N.webp";
import O from "/O.webp";
import ON from "/ON.webp";
import Scroll from "./Scroll";
import ReadMore from "./ReadMore";

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
    const favoriteBooksString = localStorage.getItem("favoriteBooks");

    if (selectedBooksString) {
      setSelectedBooks(JSON.parse(favoriteBooksString));
    }

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
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2 w-12">
          <h4 className="text-[10px] font-bold">{year}</h4>
          {idiomaNavegador === "es" ? <img src={AN} className="size-8" /> : <img src={ON} className="size-8" />}
        </div>
      );
    } else if (book.new) {
      return (
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2 w-12">
          <h4 className="text-[10px] font-bold">{year}</h4>
          <img src={N} className="size-8" />
        </div>
      );
    } else if (book.old) {
      return (
        <div className="flex flex-col items-center gap-x-1 mx-2 pr-2 w-12">
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
      "Biblia Peshitta": { ruta: "80. Español - Peshitta [BP] (1600)", new: true, old: false, year: 1600 },
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
      "King James Version": { ruta: "09. English - King James Version [KJV] (1611)", new: true, old: true, year: 1611 },
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
      "New King James Version": { ruta: "15. English - New King James [NKJ] (1982)", new: true, old: true, year: 1982 },
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
      "God's Word": { ruta: "07. English - God's Word [GW] (1995)", new: true, old: true, year: 1995 },
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
      "Easy to Read Version": {
        ruta: "05. English - Easy to Read Version [ERV] (2006)",
        new: true,
        old: true,
        year: 2006,
      },
      "Holman Christian Standard Bible": {
        ruta: "08. English - Holman Christian Standard Bible [HCSB] (2004)",
        new: true,
        old: true,
        year: 2004,
      },
      "New English Translation": {
        ruta: "12. English - New English Translation [NET] (2005)",
        new: true,
        old: true,
        year: 2005,
      },
      "Amplified Version": { ruta: "01. English - Amplified (2015)", new: true, old: true, year: 2015 },
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
    aramaic: {
      "Peshitta Version": { ruta: "79. Aramaic - Aramaic Peshitta [1905]", new: true, old: false, year: 1905 },
    },
    esperanto: {
      "Esperanto Version": { ruta: "20. Esperanto - Bible (1926)", new: true, old: true, year: 1926 },
    },
    kiche: {
      "Quiché [BK95]": { ruta: "47. Quiché - (1995)", new: true, old: true, year: 1995 },
      "Quiché [BK97]": { ruta: "49. Quiché - (1997)", new: true, old: false, year: 1997 },
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
      case "aramaic":
        return t("Arameo");
      default:
        return language;
    }
  };

  return (
    <>
      <div className="flex w-full justify-center mt-9">
        <ReadMore openModal={openModal} />
      </div>
      {isModalOpen && (
        <div className="z-[9999999] fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center">
          <div
            ref={modalRef}
            className="bg-white p-4 rounded shadow-md z-[9999] w-11/12 h-[85%] sm:h-[95%] flex flex-col  dark:bg-neutral-950 dark:text-white sm:w-[500px]"
          >
            <button className="absolute top-5 right-7 font-bold text-white text-4xl font-mono" onClick={closeModal}>
              X
            </button>
            <h1 className="text-2xl text-center font-bold mb-4">{t("SeleccionarLibro")}</h1>

            <div className="flex flex-col flex-1 overflow-y-scroll no-scrollbar z-[9999]">
              <div className="gap-2">
                <details>
                  <summary
                    style={{ listStyle: "none" }}
                    className="bg-yellow-500 dark:bg-yellow-700 px-4 py-2 w-[85%] sm:w-1/2 m-auto text-center mb-4 rounded-md cursor-pointer"
                  >
                    <span className="font-bold mb-3">{t("ANSignificado")}</span>
                  </summary>
                  <div className="p-2 bg-orange-100 dark:bg-yellow-950 rounded-md mb-4">
                    <div className="flex gap-2 px-2 m-auto justify-center" style={{ alignItems: "center" }}>
                      <span className="p-2 bg-red-600 text-white text-[10px] justify-center text-center">
                        {t("AntiguoTestamentoInicial")}
                      </span>
                      <p className="text-[13px] font-semibold">{t("AntiguoTestamento")}</p>
                      <span className="p-2 bg-blue-600 text-white text-[10px] justify-center text-center">
                        {t("NuevoTestamentoInicial")}
                      </span>
                      <p className="text-[13px] font-semibold text-black dark:text-white">{t("NuevoTestamento")}</p>
                    </div>
                    <h3 className="mt-3 mx-2 opacity-40 text-balance mb-2 text-[11px] text-black text-center dark:text-white">
                      {t("ANExplicacion")}
                    </h3>
                  </div>
                </details>
                <details>
                  <summary
                    style={{ listStyle: "none" }}
                    className="bg-cyan-500 dark:bg-cyan-700 px-4 py-2 w-[85%] sm:w-1/2 m-auto text-center mb-4 rounded-md cursor-pointer"
                  >
                    <span className="font-bold mb-3">{t("Recomendaciones")}</span>
                  </summary>
                  <article className="p-2 bg-cyan-100 dark:bg-cyan-950 rounded-md mb-8">
                    <div className="flex flex-col sm:flex-row w-full px-2 m-auto gap-2">
                      <div className="w-full sm:w-1/2 text-sm">
                        <h3 className="text-base font-bold my-3 text-center sm:text-left">{t("PrecisionTeologica")}</h3>
                        <ol className="font-thin">
                          <li>1. Vulgate Version (405)</li>
                          <li>2. King James Version (1611)</li>
                          <li>3. Aleppo Codex Bible (920)</li>
                          <li>4. Biblia Español (1569)</li>
                          <li>5. Reina Valera (1960)</li>
                        </ol>
                      </div>
                      <div className="w-full sm:w-1/2 text-sm">
                        <h3 className="text-base font-bold my-3 text-center sm:text-left">
                          {t("PrecisionTraduccion")}
                        </h3>
                        <ol className="font-thin">
                          <li>1. Vulgate Version (405)</li>
                          <li>2. Aleppo Codex Bible (920)</li>
                          <li>3. King James Version (1611)</li>
                          <li>4. Tyndale (1537)</li>
                          <li>5. Biblia Español (1569)</li>
                        </ol>
                      </div>
                    </div>
                    <h3 className="text-[10px] opacity-50 mt-5 mb-2 text-center text-pretty">
                      {t("PreferencaiUsuario")}
                    </h3>
                  </article>
                </details>
              </div>

              {Object.entries(BOOKS).map(([language, books]) => (
                <div key={language} className="mb-8">
                  <h2 className="text-xl uppercase font-bold mb-2">{translateLanguage(language)}</h2>
                  <ul className="flex gap-2 flex-col">
                    {Object.entries(books).map(([bookTitle, book]) => (
                      <li key={bookTitle}>
                        <button
                          style={{ alignItems: "center" }}
                          className={`flex w-full items-center py-2 rounded-lg text-left pl-2 flex-row justify-between ${
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
                            {selectedBooks.includes(book.ruta) && (
                              <span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-6 h-6"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-1 pr-2" style={{ alignItems: "center" }}>
                            {getInitials(book, book.year)} <span className="flex-1">{bookTitle}</span>
                          </div>
                          {/* Estrella de favorito */}
                          <div
                            className="flex items-center cursor-pointer mr-3"
                            onClick={() => {
                              handleFavoriteToggle(book.ruta);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`w-6 h-6 ${
                                favoriteBooks.includes(book.ruta) ? "text-yellow-500" : "text-gray-400"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex flex-col pt-5 gap-3 relative">
              <div className="-mt-12 -ml-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Scroll />
              </div>
              <div className="bg-white justify-center flex flex-row pt-1 gap-3 dark:bg-neutral-950">
                <button
                  className="p-2 bg-red-500 w-1/2 text-white rounded px-3 text-[11px] flex items-center gap-1 justify-center"
                  onClick={unmarkAll}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  {t("DesmarcarTodo")}
                </button>
                <button
                  className="p-2 bg-blue-500 w-1/2 text-white rounded px-3 text-sm flex items-center gap-1 justify-center"
                  onClick={handleConfirm}
                >
                  {t("Continuar")}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListBooks;
