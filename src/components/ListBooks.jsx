import { useState, useEffect, useRef } from "react";

const ListBooks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const modalRef = useRef(null);

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
    console.log("Rutas seleccionadas:", selectedBooks);
    closeModal();
  };

  // Función para agregar las iniciales "N" y "O" según la existencia de las carpetas
  const getInitials = (book) => {
    let initials = "";
    if (book.new && book.old) {
      initials = "N O";
    } else if (book.new) {
      initials = "N";
    } else if (book.old) {
      initials = "O";
    }
    return initials;
  };

  const BOOKS = {
    english: {
      "Tyndale 1537": { ruta: "../assets/bibles/18. English - Tyndale (1537)", new: true, old: true },
      "Darby Translation 1890": { ruta: "../assets/bibles/04. English - Darby (1890)", new: true, old: true },
      "Young's Literal Translation 1898": { ruta: "../assets/bibles/19. English - Young's Literal Translation [YLT] (1898)", new: true, old: true },
      "American Standard Version 1901": { ruta: "../assets/bibles/02. English - American Standard Version [ASV] (1901)", new: true, old: true },
      "New American Standard Bible 1971": { ruta: "../assets/bibles/10. English - New American Standard Bible [NASB] (1971)", new: true, old: true },
      "New International Version 1978": { ruta: "../assets/bibles/14. English - New International Version [NIV] (1978)", new: true, old: true },
      "New King James Version 1982": { ruta: "../assets/bibles/15. English - New King James [NKJ] (1982)", new: true, old: true },
      "New American Standard Bible Updated 1989": { ruta: "../assets/bibles/11. English - New American Standard Bible Updated [NASU] (1989)", new: true, old: true },
      "New Revised Standard Version 1989": { ruta: "../assets/bibles/17. English - New Revised Standard Version [NRSV] (1989)", new: true, old: true },
      "God's Word 1995": { ruta: "../assets/bibles/07. English - God's Word [GW] (1995)", new: true, old: true },
      "New International Reader's Version 1996": { ruta: "../assets/bibles/13. English - New International Reader's Version [NIRV] (1996)", new: true, old: true },
      "New Living Translation 1996": { ruta: "../assets/bibles/16. English - New Living Translation [NLT] (1996)", new: true, old: true },
      "Easy to Read Version 2006": { ruta: "../assets/bibles/05. English - Easy-to-Read Version [ERV] (2006)", new: true, old: true },
      "Holman Christian Standard Bible 2004": { ruta: "../assets/bibles/08. English - Holman Christian Standard Bible [HCSB] (2004)", new: true, old: true },
      "King James Version 2004": { ruta: "../assets/bibles/09. English - King James Version [KJV] (1611)", new: true, old: true },
      "New English Translation 2005": { ruta: "../assets/bibles/12. English - New English Translation [NET] (2005)", new: true, old: true },
      "Amplified Version 2015": { ruta: "../assets/bibles/01. English - Amplified (2015)", new: true, old: true },
      "English Standard Version 2016": { ruta: "../assets/bibles/06. English - English Standard Version [ESV] (2016)", new: true, old: true },
      "Christian Standard Bible 2017": { ruta: "../assets/bibles/03. English - Christian Standard Bible [CSB] (2017)", new: true, old: true },
    },
    esperanto: {
      "Esperanto Version 1926": { ruta: "../assets/bibles/20. Esperanto - Bible (1926)", new: true, old: true },
    },
    greek: {
      "F35 1453": { ruta: "../assets/bibles/26. Greek - F35 (1453)", new: true, old: false },
      "Stephanus NT 1550": { ruta: "../assets/bibles/21. Greek - Stephanus NT (1550)", new: true, old: false },
      "Elzevir 1624": { ruta: "../assets/bibles/25. Greek - Elzevir (1624)", new: true, old: false },
      "Neophytos Vamvas 1770": { ruta: "../assets/bibles/22. Greek - Neophytos Vamvas Translation (1770)", new: true, old: true },
      "TR 1894": { ruta: "../assets/bibles/37. Greek - TR (1894)", new: true, old: false },
      "BYZ04 1904": { ruta: "../assets/bibles/23. Greek - BYZ04 (1904)", new: true, old: false },
      "GNT 1904": { ruta: "../assets/bibles/28. Greek - GNT (1904)", new: true, old: false },
      "Modern Bible 1904": { ruta: "../assets/bibles/30. Greek - Modern Bible (1904)", new: true, old: true },
      "NTV 1967": { ruta: "../assets/bibles/32. Greek - NTV (1967)", new: true, old: false },
      "FPB 1993": { ruta: "../assets/bibles/27. Greek - FPB (1993)", new: true, old: true },
      "LMGNT 1994": { ruta: "../assets/bibles/29. Greek - LMGNT (1994)", new: true, old: false },
      "Modern Bible FPB 1994": { ruta: "../assets/bibles/31. Greek - Modern Bible FPB (1994)", new: true, old: true },
      "TGV 1997": { ruta: "../assets/bibles/35. Greek - TGV (1997)", new: true, old: true },
      "TCGNT 2005": { ruta: "../assets/bibles/34. Greek - TCGNT (2005)", new: true, old: false },
      "SBLGNT 2010": { ruta: "../assets/bibles/33. Greek - SBLGNT (2010)", new: true, old: false },
      "THGNT 2018": { ruta: "../assets/bibles/36. Greek - THGNT (2018)", new: true, old: false },
      "BYZ18 2018": { ruta: "../assets/bibles/24. Greek - BYZ18 (2018)", new: true, old: false },
    },
    hebrew: {
      "Aleppo Codex Bible 920": { ruta: "../assets/bibles/39. Hebrew - Aleppo Codex Bible (920)", new: false, old: true },
      "Bible DHNT 1885": { ruta: "../assets/bibles/38. Hebrew - Bible DHNT (1885)", new: true, old: false },
      "Bible Modern 1977": { ruta: "../assets/bibles/40. Hebrew - Bible Modern (1977)", new: true, old: true },
      "Leningrad Codex 1991": { ruta: "../assets/bibles/43. Hebrew - Leningrad Codex (1991)", new: false, old: true },
      "Bible HHH 2009": { ruta: "../assets/bibles/42. Hebrew - Bible HHH (2009)", new: true, old: false },
      "Bible MHB 2010": { ruta: "../assets/bibles/44. Hebrew - Bible MHB (2010)", new: true, old: true },
      "BSI 2017": { ruta: "../assets/bibles/41. Hebrew - BSI (2017)", new: true, old: true },
      "TD 2018": { ruta: "../assets/bibles/46. Hebrew - TD (2018)", new: true, old: true },
      "MHNT 2020": { ruta: "../assets/bibles/45. Hebrew - MHNT (2020)", new: true, old: false },
    },
    kiche: {
      "Quiché 1995": { ruta: "../assets/bibles/47. Quiché - (1995)", new: true, old: true },
      "Quiché 1997": { ruta: "../assets/bibles/49. Quiché - (1997)", new: true, old: false },
      "Quiché QUCN 2011": { ruta: "../assets/bibles/50. Quiché - QUCN (2011)", new: true, old: false },
      "Quiché 2022": { ruta: "../assets/bibles/48. Quiché - (2022)", new: true, old: false },
    },
    latin: {
      "Vulgate Version 405": { ruta: "../assets/bibles/51. Latin - Vulgate Version (405)", new: true, old: true },
      "Vulgata Sistina 1590": { ruta: "../assets/bibles/55. Latin - Vulgata Sistina (1590)", new: true, old: true },
      "Clementine Vulgata 1598": { ruta: "../assets/bibles/53. Latin - Clementine Vulgata (1598)", new: true, old: true },
      "Vulgata Clementina Hetzenauer Editore 1914": { ruta: "../assets/bibles/52. Latin - Vulgata Clementina Hetzenauer Editore (1914)", new: true, old: true },
      "Nova Vulgata 1979": { ruta: "../assets/bibles/54. Latin - Nova Vulgata (1979)", new: true, old: true },
    },
    nahuatl: {
      "Náhuatl NHE 1985": { ruta: "../assets/bibles/59. Náhuatl - NHE (1985)", new: true, old: true },
      "Náhuatl 1987": { ruta: "../assets/bibles/58. Náhuatl - (1987)", new: true, old: false },
      "Náhuatl 2012": { ruta: "../assets/bibles/56. Náhuatl - (2012)", new: true, old: false },
      "Náhuatl 2017": { ruta: "../assets/bibles/57. Náhuatl - (2017)", new: true, old: false },
    },
    queqchi: {
      "Q'eqchi 2017": { ruta: "../assets/bibles/60. Q'eqchi - (2017)", new: true, old: true },
    },
    spanish: {
      "Biblia Español 1569": { ruta: "../assets/bibles/61. Español - (1569)", new: true, old: true },
      "Reina Valera Nueva Traducción 1858": { ruta: "../assets/bibles/62. Español - Reina Valera Nueva Traduccción [RVNT] (1858)", new: true, old: false },
      "Reina Valera 1909": { ruta: "../assets/bibles/65. Español - Reina Valera (1909)", new: true, old: true },
      "Reina Valera 1960": { ruta: "../assets/bibles/75. Español - Reina Valera [RV60] (1960)", new: true, old: true },
      "Reina Valera Revisada 1960": { ruta: "../assets/bibles/72. Español - Reina Valera Revisada [RVR] (1960)", new: true, old: true },
      "Biblia del Oso 1973": { ruta: "../assets/bibles/64. Español - Biblia del oso [BDO] (1973)", new: true, old: true },
      "Biblia Español 1989": { ruta: "../assets/bibles/63. Español - (1989)", new: true, old: true },
      "Reina Valera 1995": { ruta: "../assets/bibles/76. Español - Reina Valera [RV95] (1995)", new: true, old: true },
      "Dios Habla Hoy 1996": { ruta: "../assets/bibles/69. Español - Dios Habla Hoy [DHH] (1996)", new: true, old: true },
      "Biblia de la Américas 1997": { ruta: "../assets/bibles/70. Español - La Biblia de Las Américas [LBLA] (1997)", new: true, old: true },
      "Nueva Versión Iternacional 1999": { ruta: "../assets/bibles/71. Español - Nueva Versión Internacional  [NVI] (1999)", new: true, old: true },
      "Biblia Textual 1999": { ruta: "../assets/bibles/68. Español - La Biblia Textual (1999)", new: true, old: true },
      "Traducción en lenguaje Actual 2000": { ruta: "../assets/bibles/77. Español - Traducción en lenguaje actual [TLA] (2000)", new: true, old: true },
      "Reina Valera Gómez 2004": { ruta: "../assets/bibles/74. Español - Reina Valera Gómez [RVG] (2004)", new: true, old: true },
      "Biblia Traducción Interconfesional 2008": { ruta: "../assets/bibles/67. Español - Biblia Traducción Interconfesional [BTI] (2008)", new: true, old: true },
      "Biblia La Palabra 2010": { ruta: "../assets/bibles/66. Español - Biblia La Palabra [BLP] (2010)", new: true, old: true },
      "Versión Biblia Gratis 2018": { ruta: "../assets/bibles/78. Español - Versión Biblia Gratis [VBG] (2018)", new: true, old: false },
      "Reina Valera 2020": { ruta: "../assets/bibles/73. Español - Reina Valera [RV] (2020)", new: true, old: true },
    },
  };

  return (
    <>
      <button onClick={openModal}>Abrir Modal</button>
      {isModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div ref={modalRef} className="bg-white p-4 rounded shadow-md w-80 h-3/5 overflow-y-scroll flex flex-col">
            <button className="absolute top-2 right-2" onClick={closeModal}>
              X
            </button>
            <h1 className="text-xl font-bold mb-4">Selecciona libros</h1>
            <div className="flex flex-col flex-1 overflow-y-auto">
              {Object.entries(BOOKS).map(([language, books]) => (
                <div key={language} className="mb-4">
                  <h2 className="text-lg font-bold mb-2">{language}</h2>
                  <ul>
                    {Object.entries(books).map(([bookTitle, book]) => (
                      <li key={bookTitle}>
                        <button
                          className={`p-2 text-left w-full ${selectedBooks.includes(book.ruta) ? "bg-gray-300" : "bg-gray-100"}`}
                          onClick={() => handleBookToggle(book.ruta)}
                        >
                          {bookTitle} {getInitials(book)}
                          {selectedBooks.includes(book.ruta) && <span className="float-right">✔️</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button className="p-2 bg-blue-500 text-white rounded" onClick={handleConfirm}>
              Confirmar selección
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ListBooks;
