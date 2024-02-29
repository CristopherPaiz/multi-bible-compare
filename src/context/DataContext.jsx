import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import LanguageContext from "./LanguageContext";
import bibleData from "../assets/bibles/JSON_DATA/01. English - Amplified (2015).json";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [bibliasSeleccionadas, setBibliasSeleccionadas] = useState([]);

  const [libroSeleccionado, setLibroSeleccionado] = useState("");
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(0);
  const [capituloSeleccionadoNumero, setCapituloSeleccionadoNumero] = useState(0);
  const [versiculoSeleccionado, setVersiculoSeleccionado] = useState(0);
  const [versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero] = useState(0);
  const [libros, setLibros] = useState({});
  const { t } = useContext(LanguageContext);
  const [tipoTraductor, setTipoTraductor] = useState("m?");
  const [paginaInicio, setPaginaInicio] = useState("/");
  const [history, setHistory] = useState([]);

  //STRONGS
  const [strong, strongFunc] = useState([]);
  const [modalStrong, setModalStrong] = useState(false);
  const [strongData, setStrongData] = useState({});
  const [cargandoStrong, setCargandoStrong] = useState(false);

  //useStateModals
  //----------------------------------------------------
  const [modalLibros, setModalLibros] = useState(false);
  //----------------------------------------------------
  const [modalChapters, setModalChapters] = useState(false);
  //----------------------------------------------------
  const [modalVerses, setModalVerses] = useState(false);

  //actualizar el idioma de los libros cuando cambia idioma
  useEffect(() => {
    setLibros({
      book1: t("book1"),
      book2: t("book2"),
      book3: t("book3"),
      book4: t("book4"),
      book5: t("book5"),
      book6: t("book6"),
      book7: t("book7"),
      book8: t("book8"),
      book9: t("book9"),
      book10: t("book10"),
      book11: t("book11"),
      book12: t("book12"),
      book13: t("book13"),
      book14: t("book14"),
      book15: t("book15"),
      book16: t("book16"),
      book17: t("book17"),
      book18: t("book18"),
      book19: t("book19"),
      book20: t("book20"),
      book21: t("book21"),
      book22: t("book22"),
      book23: t("book23"),
      book24: t("book24"),
      book25: t("book25"),
      book26: t("book26"),
      book27: t("book27"),
      book28: t("book28"),
      book29: t("book29"),
      book30: t("book30"),
      book31: t("book31"),
      book32: t("book32"),
      book33: t("book33"),
      book34: t("book34"),
      book35: t("book35"),
      book36: t("book36"),
      book37: t("book37"),
      book38: t("book38"),
      book39: t("book39"),
      book40: t("book40"),
      book41: t("book41"),
      book42: t("book42"),
      book43: t("book43"),
      book44: t("book44"),
      book45: t("book45"),
      book46: t("book46"),
      book47: t("book47"),
      book48: t("book48"),
      book49: t("book49"),
      book50: t("book50"),
      book51: t("book51"),
      book52: t("book52"),
      book53: t("book53"),
      book54: t("book54"),
      book55: t("book55"),
      book56: t("book56"),
      book57: t("book57"),
      book58: t("book58"),
      book59: t("book59"),
      book60: t("book60"),
      book61: t("book61"),
      book62: t("book62"),
      book63: t("book63"),
      book64: t("book64"),
      book65: t("book65"),
      book66: t("book66"),
    });
  }, [t]);

  //USE EFFECT QUE SELECCIONA EL LIBRO Y SUS CAPITULOS COMO VERSÍCULOS
  const [SubBook, setSubBook] = useState(null);
  const [Chapters, setChapters] = useState(null);

  useEffect(() => {
    if (!libroSeleccionado) return;
    const findBookAndChapters = (bookNumber) => {
      const bookKey = bookNumber;

      // Buscar el libro en el NewTestament y OldTestament
      if (bibleData.NewTestament[bookKey]) {
        setSubBook(bookKey);
        setChapters(bibleData.NewTestament[bookKey]);
      } else if (bibleData.OldTestament[bookKey]) {
        setSubBook(bookKey);
        setChapters(bibleData.OldTestament[bookKey]);
      } else {
        // Si el libro no se encuentra, establecer "NotFound" en ambos estados
        setSubBook("NotFound");
        setChapters("NotFound");
        console.error(`El libro ${bookKey} no se encontró.`);
      }
    };
    findBookAndChapters(libroSeleccionado);
  }, [libroSeleccionado]);

  //intercambiar tipoTraductor, guardar en localStorage y cargar al inicio
  const handleTipoTraductor = () => {
    if (tipoTraductor === "m?") {
      setTipoTraductor("?");
      localStorage.setItem("tipoTraductor", "?");
    } else {
      setTipoTraductor("m?");
      localStorage.setItem("tipoTraductor", "m?");
    }
  };

  const handlePaginaInicio = () => {
    if (paginaInicio === "/") {
      setPaginaInicio("/compare");
      localStorage.setItem("paginaInicio", "/compare");
    } else {
      setPaginaInicio("/");
      localStorage.setItem("paginaInicio", "/");
    }
  };

  useEffect(() => {
    const tipoTraductorGuardado = localStorage.getItem("tipoTraductor");
    const paginaInicio = localStorage.getItem("paginaInicio");
    if (tipoTraductorGuardado) {
      setTipoTraductor(tipoTraductorGuardado);
    }
    if (paginaInicio) {
      setPaginaInicio(paginaInicio);
    }
  }, []);

  //Cuando se seleccione un versiculoSeleccionadoNumero guardaremos un objeto con todos los datos en el LocalStorage
  useEffect(() => {
    // Recuperar historial del LocalStorage al montar el componente
    const storedHistory = localStorage.getItem("history");
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      setHistory(parsedHistory);
    }
  }, []);

  useEffect(() => {
    if (versiculoSeleccionadoNumero > 0) {
      // Recuperar historial actual del LocalStorage
      let history = localStorage.getItem("history");
      if (!history) {
        history = [];
      } else {
        history = JSON.parse(history);
      }

      // Crear nuevo objeto de datos
      const newData = {
        bibliasSeleccionadas,
        libroSeleccionado,
        capituloSeleccionadoNumero,
        versiculoSeleccionadoNumero,
      };

      // Agregar nuevo dato al historial
      history.push(newData);

      // Verificar si hay más de 10 elementos en el historial
      if (history.length > 20) {
        // Eliminar el elemento más antiguo
        history.shift();
      }

      // Guardar historial actualizado en el LocalStorage
      localStorage.setItem("history", JSON.stringify(history));
    }
  }, [versiculoSeleccionadoNumero]);

  //Eliminar elemento del hisotrial del LS
  const eliminarElementoHistorial = (index) => {
    const newHistory = history.filter((item, i) => i !== index);
    setHistory(newHistory);
    localStorage.setItem("history", JSON.stringify(newHistory));
  };

  //Setear bibliasSeleecionadas, acpituloSeleccionadoNumero, libroSeleccionado, versiculoSeleccionadoNumero
  const setearHistorial = (data) => {
    setBibliasSeleccionadas(data.bibliasSeleccionadas);
    setLibroSeleccionado(data.libroSeleccionado);
    setCapituloSeleccionadoNumero(data.capituloSeleccionadoNumero);
    setVersiculoSeleccionadoNumero(data.versiculoSeleccionadoNumero);
  };

  //USEFFECT QUE CAMBIARA EL STRONG SELECCIONADO
  useEffect(() => {
    if (strong.length > 0) {
      setModalStrong(true);
    } else {
      setModalStrong(false);
    }
  }, [strong, strongFunc, modalStrong, setModalStrong]);

  useEffect(() => {
    const conseguirStrong = async () => {
      console.log("Cambio a:", strong);
      if (strong.length > 0) {
        const ruta = "https://raw.githubusercontent.com/CristopherPaiz/multi-bible-compare/main/src/assets/strongs";
        setCargandoStrong(true);
        try {
          if (strong.includes("H")) {
            const Tipo = strong.split("H")[1];
            const rango = Math.floor(Tipo / 150) * 150 + 1;
            const casiRango = rango.toString().padStart(4, "0");
            const url = `${ruta}/Hebreo/${casiRango}.json`;

            const res = await fetch(url);
            const data = await res.json();
            setStrongData(data);
            setCargandoStrong(false);
          } else if (strong.includes("G")) {
            const Tipo = strong.split("G")[1];
            const rango = Math.floor(Tipo / 150) * 150 + 1;
            const casiRango = rango.toString().padStart(4, "0");
            const url = `${ruta}/Griego/${casiRango}.json`;

            const res = await fetch(url);
            const data = await res.json();
            setStrongData(data);
            setCargandoStrong(false);
          }
        } catch (error) {
          console.log(error);
        }
      }
    };
    conseguirStrong();
  }, [strong]);

  // funciones que rotornamos para que puedan usarse en otros lados
  return (
    <DataContext.Provider
      value={{
        bibliasSeleccionadas,
        setBibliasSeleccionadas,
        setLibros,
        libros,
        libroSeleccionado,
        setLibroSeleccionado,
        capituloSeleccionado,
        setCapituloSeleccionado,
        SubBook,
        Chapters,
        versiculoSeleccionado,
        setVersiculoSeleccionado,
        versiculoSeleccionadoNumero,
        setVersiculoSeleccionadoNumero,
        capituloSeleccionadoNumero,
        setCapituloSeleccionadoNumero,
        tipoTraductor,
        handleTipoTraductor,
        paginaInicio,
        handlePaginaInicio,
        history,
        eliminarElementoHistorial,
        setearHistorial,
        setHistory,
        strong,
        strongFunc,
        modalStrong,
        setModalStrong,
        strongData,
        cargandoStrong,
        //return modals
        //------------
        modalLibros,
        setModalLibros,
        //------------
        modalChapters,
        setModalChapters,
        //------------
        modalVerses,
        setModalVerses,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
