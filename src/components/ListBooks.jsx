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
      "Reina Valera [RV60]": { ruta: "75. Español - Reina Valera [RV60] (1960)", new: true, old: true, year: 1960 },
      "Biblia al día": {
        ruta: "001. Español - Biblia al día (1989)",
        new: true,
        old: true,
        year: "1989",
      },
      "Biblia Biblia Corona de Jerusalen": {
        ruta: "002. Español - Biblia Biblia Corona de Jerusalen (1937)",
        new: true,
        old: true,
        year: "1937",
      },
      "Biblia Bizantino Español-Griego": {
        ruta: "003. Español - Biblia Bizantino Español-Griego (1551)",
        new: true,
        old: false,
        year: "1551",
      },
      "Biblia Brit Xadasha Judia Ortodoxa": {
        ruta: "004. Español - Biblia Brit Xadasha Judia Ortodoxa (1999)",
        new: true,
        old: false,
        year: "1999",
      },
      "Biblia Castilian": {
        ruta: "005. Español - Biblia Castilian (2003)",
        new: true,
        old: true,
        year: "2003",
      },
      "Biblia de Jerusalem": {
        ruta: "006. Español - Biblia de Jerusalem (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia de Jerusalén": {
        ruta: "007. Español - Biblia de Jerusalén (1998)",
        new: true,
        old: true,
        year: "1998",
      },
      "Biblia de Jerusalén 3ra Edición": {
        ruta: "008. Español - Biblia de Jerusalén 3ra Edición (2013)",
        new: true,
        old: true,
        year: "2013",
      },
      "Biblia de las Américas": {
        ruta: "009. Español - Biblia de las Américas (1997)",
        new: true,
        old: true,
        year: "1997",
      },
      "Biblia de nuestro Pueblo": {
        ruta: "010. Español - Biblia de nuestro Pueblo (2005)",
        new: true,
        old: true,
        year: "2005",
      },
      "Biblia del Oso": {
        ruta: "011. Español - Biblia del Oso (1569)",
        new: true,
        old: true,
        year: "1569",
      },
      "Biblia del Siglo de Oro": {
        ruta: "012. Español - Biblia del Siglo de Oro (2009)",
        new: true,
        old: true,
        year: "2009",
      },
      "Biblia El Codigo Real": {
        ruta: "013. Español - Biblia El Codigo Real (2019)",
        new: true,
        old: false,
        year: "2019",
      },
      "Biblia El Libro del Pueblo de Dios": {
        ruta: "014. Español - Biblia El Libro del Pueblo de Dios (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "Biblia Jünemann Septuaginta": {
        ruta: "015. Español - Biblia Jünemann Septuaginta (1928)",
        new: true,
        old: true,
        year: "1928",
      },
      "Biblia Kadosh Israelita Mesiánica": {
        ruta: "016. Español - Biblia Kadosh Israelita Mesiánica (2014)",
        new: true,
        old: true,
        year: "2014",
      },
      "Biblia La Palabra de Dios para Todos": {
        ruta: "017. Español - Biblia La Palabra de Dios para Todos (2012)",
        new: true,
        old: true,
        year: "2012",
      },
      "Biblia La Palabra Española": {
        ruta: "018. Español - Biblia La Palabra Española (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia La Palabra Hispanoamericana": {
        ruta: "019. Español - Biblia La Palabra Hispanoamericana (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia Latinoamericana": {
        ruta: "020. Español - Biblia Latinoamericana (1995)",
        new: true,
        old: true,
        year: "1995",
      },
      "Biblia Lenguaje Sencillo": {
        ruta: "021. Español - Biblia Lenguaje Sencillo (2000)",
        new: true,
        old: false,
        year: "2000",
      },
      "Biblia Martin Nieto": {
        ruta: "022. Español - Biblia Martin Nieto (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "Biblia Nestle-Aland 27 Español-Griego": {
        ruta: "023. Español - Biblia Nestle-Aland 27 Español-Griego (2009)",
        new: true,
        old: false,
        year: "2009",
      },
      "Biblia Nueva Reina Valera": {
        ruta: "024. Español - Biblia Nueva Reina Valera (2015)",
        new: true,
        old: true,
        year: "2015",
      },
      "Biblia Nueva Reina Valera Adventista": {
        ruta: "025. Español - Biblia Nueva Reina Valera Adventista (1990)",
        new: true,
        old: true,
        year: "1990",
      },
      "Biblia Nueva Traducción Viviente": {
        ruta: "027. Español - Biblia Nueva Traducción Viviente (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia Palabla de Dios para ti": {
        ruta: "028. Español - Biblia Palabla de Dios para ti (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "Biblia para todos": {
        ruta: "029. Español - Biblia para todos (2003)",
        new: true,
        old: true,
        year: "2003",
      },
      "Biblia Peshita": {
        ruta: "030. Español - Biblia Peshita (1600)",
        new: true,
        old: false,
        year: "1600",
      },
      "Biblia Reina Valera": {
        ruta: "040. Español - Biblia Reina Valera (2020)",
        new: true,
        old: true,
        year: "2020",
      },
      "Biblia Reina Valera Actualizada": {
        ruta: "042. Español - Biblia Reina Valera Actualizada (2015)",
        new: true,
        old: true,
        year: "2015",
      },
      "Biblia Reina Valera Antigua": {
        ruta: "043. Español - Biblia Reina Valera Antigua (1602)",
        new: true,
        old: true,
        year: "1602",
      },
      "Biblia Reina Valera Contemporánea": {
        ruta: "044. Español - Biblia Reina Valera Contemporánea (2011)",
        new: true,
        old: true,
        year: "2011",
      },
      "Biblia Reina Valera Gómez": {
        ruta: "046. Español - Biblia Reina Valera Gómez (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia Reina Valera Independiente": {
        ruta: "047. Español - Biblia Reina Valera Independiente (2012)",
        new: true,
        old: true,
        year: "2012",
      },
      "Biblia Reina Valera Purificada": {
        ruta: "048. Español - Biblia Reina Valera Purificada (1602)",
        new: true,
        old: true,
        year: "1602",
      },
      "Biblia Reina Valera Revisada": {
        ruta: "049. Español - Biblia Reina Valera Revisada (1960)",
        new: true,
        old: true,
        year: "1960",
      },
      "Biblia Reina Valera Sociedad Trinitaria": {
        ruta: "050. Español - Biblia Reina Valera Sociedad Trinitaria (2023) (",
        new: true,
        old: false,
        year: "2023",
      },
      "Biblia Sagradas Escrituras": {
        ruta: "051. Español - Biblia Sagradas Escrituras (1569)",
        new: true,
        old: true,
        year: "1569",
      },
      "Biblia Sagradas Escrituras Version Antigua": {
        ruta: "052. Español - Biblia Sagradas Escrituras Version Antigua (2001)",
        new: true,
        old: true,
        year: "2001",
      },
      "Biblia Según el Texto Bizantino": {
        ruta: "053. Español - Biblia Según el Texto Bizantino (2005)",
        new: true,
        old: false,
        year: "2005",
      },
      "Biblia Septuaginta al Español [LXX]": {
        ruta: "054. Español - Biblia Septuaginta al Español [LXX] (2009)",
        new: true,
        old: true,
        year: "2009",
      },
      "Biblia Serafín de Ausejo": {
        ruta: "055. Español - Biblia Serafín de Ausejo (1975)",
        new: true,
        old: true,
        year: "1975",
      },
      "Biblia Textual": {
        ruta: "056. Español - Biblia Textual (1999)",
        new: true,
        old: true,
        year: "1999",
      },
      "Biblia Textual 3a Edicion": {
        ruta: "057. Español - Biblia Textual 3a Edicion (2010)",
        new: true,
        old: true,
        year: "2010",
      },
      "Biblia Textual IV edición": {
        ruta: "058. Español - Biblia Textual IV edición (2015)",
        new: true,
        old: true,
        year: "2015",
      },
      "Biblia Tischendorf Español-Griego": {
        ruta: "059. Español - Biblia Tischendorf Español-Griego (1874)",
        new: true,
        old: false,
        year: "1874",
      },
      "Biblia Version Moderna": {
        ruta: "060. Español - Biblia Version Moderna (1929)",
        new: true,
        old: true,
        year: "1929",
      },
      "Biblia Versión Israelita Nazarena": {
        ruta: "062. Español - Biblia Versión Israelita Nazarena (2023)",
        new: true,
        old: true,
        year: "2023",
      },
      "Biblia Westcott y Hort Español-Griego": {
        ruta: "063. Español - Biblia Westcott y Hort Español-Griego (2014)",
        new: true,
        old: false,
        year: "2014",
      },
      "Bilbia Sagradas Escrituras": {
        ruta: "064. Español - Bilbia Sagradas Escrituras (1975)",
        new: true,
        old: true,
        year: "1975",
      },
      "La Santa Biblia": {
        ruta: "065. Español - La Santa Biblia (2008)",
        new: true,
        old: true,
        year: "2008",
      },
      "Nueva Biblia de las Américas": {
        ruta: "066. Español - Nueva Biblia de las Américas (1986)",
        new: true,
        old: true,
        year: "1986",
      },
      "Nueva Biblia Española": {
        ruta: "067. Español - Nueva Biblia Española (1975)",
        new: true,
        old: true,
        year: "1975",
      },
      "Nueva Biblia Viva": {
        ruta: "068. Español - Nueva Biblia Viva (2006)",
        new: true,
        old: true,
        year: "2006",
      },
      "Nueva Versión Internacional": {
        ruta: "069. Español - Nueva Versión Internacional (2015)",
        new: true,
        old: true,
        year: "2015",
      },
      "Nueva Versión Internacional Castellano": {
        ruta: "070. Español - Nueva Versión Internacional Castellano (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "Nueva Versión Internacional Simplificada": {
        ruta: "071. Español - Nueva Versión Internacional Simplificada (2019)",
        new: true,
        old: false,
        year: "2019",
      },
      "Sagrada Biblia ": {
        ruta: "072. Español - Sagrada Biblia - Versión de la LXX (1986)",
        new: true,
        old: true,
        year: "1986",
      },
      "Versión Biblia Libre": {
        ruta: "073. Español - Versión Biblia Libre (2022)",
        new: true,
        old: true,
        year: "2022",
      },
    },
    guatemala: {
      "Biblia Chuj San Sebastian": {
        ruta: "093. Guatemala - Biblia Chuj San Sebastian (1999)",
        new: true,
        old: true,
        year: "1999",
      },
      "Biblia en Chuj de San Mateo Ixtatán": {
        ruta: "094. Guatemala - Biblia en Chuj de San Mateo Ixtatán (2007)",
        new: true,
        old: true,
        year: "2007",
      },
      "Biblia en Poqomchí Santo Laj Huuj": {
        ruta: "095. Guatemala - Biblia en Poqomchí Santo Laj Huuj (2009)",
        new: true,
        old: true,
        year: "2009",
      },
      "Biblia Mam de Huehuetenango": {
        ruta: "097. Guatemala - Biblia Mam de Huehuetenango (2011)",
        new: true,
        old: true,
        year: "2011",
      },
      "Biblia Mam de Quetzaltenango ": {
        ruta: "098. Guatemala - Biblia Mam de Quetzaltenango - Ostuncalco (1999)",
        new: true,
        old: true,
        year: "1999",
      },
      "Biblia Mam de Todos Santos": {
        ruta: "099. Guatemala - Biblia Mam de Todos Santos (2002)",
        new: true,
        old: false,
        year: "2002",
      },
      "Biblia Q'anjob'al": {
        ruta: "100. Guatemala - Biblia Q'anjob'al (1989)",
        new: true,
        old: true,
        year: "1989",
      },
      "Biblia Q'eqchi": {
        ruta: "102. Guatemala - Biblia Q'eqchi (2005)",
        new: true,
        old: true,
        year: "2005",
      },
      "Biblia Quiché": {
        ruta: "103. Guatemala - Biblia Quiché (1995)",
        new: true,
        old: true,
        year: "1995",
      },
    },
    greek: {
      "Analytic Septuagint": {
        ruta: "074. Greek - Analytic Septuagint (2014)",
        new: false,
        old: true,
        year: "2014",
      },
      "Apostolic Bible Polyglot": {
        ruta: "075. Greek - Apostolic Bible Polyglot (2015)",
        new: true,
        old: true,
        year: "2015",
      },
      "Berean Greek Bible": {
        ruta: "076. Greek - Berean Greek Bible (2019)",
        new: true,
        old: false,
        year: "2019",
      },
      "Berean Interlinear": {
        ruta: "077. Greek - Berean Interlinear (2016)",
        new: true,
        old: false,
        year: "2016",
      },
      BHP: {
        ruta: "078. Greek - BHP (2019)",
        new: true,
        old: false,
        year: "2019",
      },
      "BHP Medieval": {
        ruta: "079. Greek - BHP Medieval (2019)",
        new: true,
        old: false,
        year: "2019",
      },
      "Bible combine Textus Receptus, Scrivener, Byzantine Majority, Alexandrian-Critical": {
        ruta: "080. Greek - Bible combine Textus Receptus, Scrivener, Byzantine Majority, Alexandrian-Critical (2014)",
        new: true,
        old: false,
        year: "2014",
      },
      Byzantine: {
        ruta: "081. Greek - Byzantine (2005)",
        new: true,
        old: false,
        year: "2005",
      },
      "Byzantine + Nestle-Aland": {
        ruta: "082. Greek - Byzantine + Nestle-Aland (2005)",
        new: true,
        old: false,
        year: "2005",
      },
      "Byzantine F35": {
        ruta: "083. Greek - Byzantine F35 (2015)",
        new: true,
        old: false,
        year: "2015",
      },
      "Codex Alexandrinus": {
        ruta: "084. Greek - Codex Alexandrinus (1782)",
        new: true,
        old: false,
        year: "1782",
      },
      "Codex Sinaiticus": {
        ruta: "085. Greek - Codex Sinaiticus (1862)",
        new: true,
        old: false,
        year: "1862",
      },
      "Critical NT text": {
        ruta: "086. Greek - Critical NT text (2014)",
        new: true,
        old: false,
        year: "2014",
      },
      "F35 with Notes": {
        ruta: "087. Greek - F35 with Notes (2015)",
        new: true,
        old: false,
        year: "2015",
      },
      "Filos Pergamos": {
        ruta: "088. Greek - Filos Pergamos (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "King James Textus Receptus": {
        ruta: "089. Greek - King James Textus Receptus (2014)",
        new: true,
        old: false,
        year: "2014",
      },
      Nestle: {
        ruta: "090. Greek - Nestle (1904)",
        new: true,
        old: false,
        year: "1904",
      },
      Stephanus: {
        ruta: "091. Greek - Stephanus (1550)",
        new: true,
        old: false,
        year: "1550",
      },
      "Wescott and Hort": {
        ruta: "092. Greek - Wescott and Hort (1885)",
        new: true,
        old: false,
        year: "1885",
      },
    },
    hebrew: {
      "Delitzsch's": {
        ruta: "105. Hebrew - Delitzsch's (1885)",
        new: true,
        old: false,
        year: "1885",
      },
      "Delitzsch's Consonants": {
        ruta: "106. Hebrew - Delitzsch's Consonants (1885)",
        new: true,
        old: false,
        year: "1885",
      },
      "Delitzsch's Consonats": {
        ruta: "107. Hebrew - Delitzsch's Consonats (1877)",
        new: true,
        old: false,
        year: "1877",
      },
      "Habrit Hakhadasha ": {
        ruta: "108. Hebrew - Habrit Hakhadasha - Haderekh (2009)",
        new: true,
        old: false,
        year: "2009",
      },
      "Leningrad Codex": {
        ruta: "109. Hebrew - Leningrad Codex (1976)",
        new: true,
        old: true,
        year: "1976",
      },
      "Open Scriptures": {
        ruta: "111. Hebrew - Open Scriptures (1998)",
        new: false,
        old: true,
        year: "1998",
      },
      "Stuttgartensia [Strongs]": {
        ruta: "112. Hebrew - Stuttgartensia [Strongs] (2022)",
        new: true,
        old: true,
        year: "2022",
      },
      "Tanach and Delitzsch's": {
        ruta: "113. Hebrew - Tanach and Delitzsch's (2021)",
        new: true,
        old: true,
        year: "2021",
      },
      "Tanach and Modern": {
        ruta: "114. Hebrew - Tanach and Modern (2017)",
        new: true,
        old: true,
        year: "2017",
      },
      "Tanah Aleppo Codex": {
        ruta: "115. Hebrew - Tanah Aleppo Codex (920)",
        new: false,
        old: true,
        year: "920",
      },
      "Westminster Leningrad Codex with vowels": {
        ruta: "119. Hebrew - Westminster Leningrad Codex with vowels (2017)",
        new: false,
        old: true,
        year: "2017",
      },
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
      case "guatemala":
        return t("Guatemala");
      default:
        return language;
    }
  };

  //timeout 2 seconds
  const [ocultar, setOcultar] = useState("opacity-1");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOcultar("opacity-0");
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

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

            <div className="flex flex-col flex-1 overflow-y-scroll no-scrollbar">
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
            <div className="flex flex-col pt-5 gap-3 relative z-[99999]">
              <div
                className={`-mt-12 -ml-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${ocultar}`}
              >
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
