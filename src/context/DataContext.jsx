import { createContext, useContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import LanguageContext from "./LanguageContext";
import bibleData from "../assets/bibles/JSON_DATA/01. English - Amplified (2015).json";
import ThemeContext from "./ThemeContext";
import { getStrongBatch } from "../services/bibleSource";
import { aTextoPlano, capituloATextoPlano } from "../utils/textoPlano";

const DataContext = createContext();

// Por defecto la glosa se muestra y la morfología no: los códigos tipo
// `V-AAI-3S` son lo que más estorba al leer. Vive fuera del componente para no
// recrearse en cada render y poder ser dependencia estable de los useCallback.
const MARCADO_POR_DEFECTO = { morfologia: false, glosa: true };

const MAX_HISTORIAL = 40;

const claveReferencia = (item) => `${item.libroSeleccionado}:${item.capituloSeleccionadoNumero}:${item.versiculoSeleccionadoNumero}`;

/** Entradas viejas no tienen `id` ni fecha; se les completa al cargar. */
const normalizarHistorial = (lista) =>
  (Array.isArray(lista) ? lista : [])
    .filter((item) => item && item.libroSeleccionado && item.versiculoSeleccionadoNumero)
    .map((item) => ({
      ...item,
      id: item.id ?? claveReferencia(item),
      visitadoEn: item.visitadoEn ?? 0,
      visitas: item.visitas ?? 1,
      bibliasSeleccionadas: Array.isArray(item.bibliasSeleccionadas) ? item.bibliasSeleccionadas : [],
    }));

export const DataProvider = ({ children }) => {
  const [bibliasSeleccionadas, setBibliasSeleccionadas] = useState(() => {
    try {
      const guardado = localStorage.getItem("selectedBooks");
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar errores de acceso
    }
    return ["75. Español - Reina Valera [RV60] (1960)"];
  });

  useEffect(() => {
    if (Array.isArray(bibliasSeleccionadas) && bibliasSeleccionadas.length > 0) {
      try {
        localStorage.setItem("selectedBooks", JSON.stringify(bibliasSeleccionadas));
      } catch {
        // Ignorar errores
      }
    }
  }, [bibliasSeleccionadas]);

  const [libroSeleccionado, setLibroSeleccionado] = useState("");
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(0);
  const [capituloSeleccionadoNumero, setCapituloSeleccionadoNumero] = useState(0);
  const [versiculoSeleccionado, setVersiculoSeleccionado] = useState(0);
  const [versiculoSeleccionadoNumero, setVersiculoSeleccionadoNumero] = useState(0);
  const [libros, setLibros] = useState({});
  const { t } = useContext(LanguageContext);
  const [paginaInicio, setPaginaInicio] = useState("/");
  const [history, setHistory] = useState([]);
  const [modoCompacto, setModoCompacto] = useState(false);

  // Preferencias de marcado interlineal (morfología y glosa), POR BIBLIA.
  //
  // Son por panel a propósito: alguien puede querer la morfología en la
  // interlineal griega y no en la española que tiene al lado. Un interruptor
  // global obligaba a decidir lo mismo para todas.
  //
  // Forma: { "034. Español - ...": { morfologia: false, glosa: true } }
  const [preferenciasMarcado, setPreferenciasMarcado] = useState(() => {
    try {
      const crudo = localStorage.getItem("preferenciasMarcado");
      const valor = crudo ? JSON.parse(crudo) : null;
      return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("preferenciasMarcado", JSON.stringify(preferenciasMarcado));
    } catch {
      // Safari privado: sin persistir, pero aplica en esta sesión.
    }
  }, [preferenciasMarcado]);

  const leerMarcado = useCallback(
    (biblia) => ({ ...MARCADO_POR_DEFECTO, ...(preferenciasMarcado[biblia] ?? {}) }),
    [preferenciasMarcado]
  );

  const alternarMarcado = useCallback((biblia, tipo) => {
    setPreferenciasMarcado((previo) => {
      const actual = { ...MARCADO_POR_DEFECTO, ...(previo[biblia] ?? {}) };
      return { ...previo, [biblia]: { ...actual, [tipo]: !actual[tipo] } };
    });
  }, []);

  //STRONGS
  const [strong, strongFun] = useState([]);
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

  //cargar modoCompacto al inicio
  useEffect(() => {
    const modoCompactoGuardado = localStorage.getItem("modoCompacto");
    if (modoCompactoGuardado) {
      setModoCompacto(JSON.parse(modoCompactoGuardado));
    }
  }, []);

  //guardar modoCompacto en localStorage al cambiar
  useEffect(() => {
    localStorage.setItem("modoCompacto", JSON.stringify(modoCompacto));
  }, [modoCompacto]);

  //actualizar el idioma de los libros cuando cambia idioma
  useEffect(() => {
    if (modoCompacto) {
      setLibros({
        book1: t("bookshort1"),
        book2: t("bookshort2"),
        book3: t("bookshort3"),
        book4: t("bookshort4"),
        book5: t("bookshort5"),
        book6: t("bookshort6"),
        book7: t("bookshort7"),
        book8: t("bookshort8"),
        book9: t("bookshort9"),
        book10: t("bookshort10"),
        book11: t("bookshort11"),
        book12: t("bookshort12"),
        book13: t("bookshort13"),
        book14: t("bookshort14"),
        book15: t("bookshort15"),
        book16: t("bookshort16"),
        book17: t("bookshort17"),
        book18: t("bookshort18"),
        book19: t("bookshort19"),
        book20: t("bookshort20"),
        book21: t("bookshort21"),
        book22: t("bookshort22"),
        book23: t("bookshort23"),
        book24: t("bookshort24"),
        book25: t("bookshort25"),
        book26: t("bookshort26"),
        book27: t("bookshort27"),
        book28: t("bookshort28"),
        book29: t("bookshort29"),
        book30: t("bookshort30"),
        book31: t("bookshort31"),
        book32: t("bookshort32"),
        book33: t("bookshort33"),
        book34: t("bookshort34"),
        book35: t("bookshort35"),
        book36: t("bookshort36"),
        book37: t("bookshort37"),
        book38: t("bookshort38"),
        book39: t("bookshort39"),
        book40: t("bookshort40"),
        book41: t("bookshort41"),
        book42: t("bookshort42"),
        book43: t("bookshort43"),
        book44: t("bookshort44"),
        book45: t("bookshort45"),
        book46: t("bookshort46"),
        book47: t("bookshort47"),
        book48: t("bookshort48"),
        book49: t("bookshort49"),
        book50: t("bookshort50"),
        book51: t("bookshort51"),
        book52: t("bookshort52"),
        book53: t("bookshort53"),
        book54: t("bookshort54"),
        book55: t("bookshort55"),
        book56: t("bookshort56"),
        book57: t("bookshort57"),
        book58: t("bookshort58"),
        book59: t("bookshort59"),
        book60: t("bookshort60"),
        book61: t("bookshort61"),
        book62: t("bookshort62"),
        book63: t("bookshort63"),
        book64: t("bookshort64"),
        book65: t("bookshort65"),
        book66: t("bookshort66"),
      });
    } else {
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
    }
  }, [t, modoCompacto]);

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
    const paginaInicio = localStorage.getItem("paginaInicio");
    if (paginaInicio) {
      setPaginaInicio(paginaInicio);
    }
  }, []);

  /**
   * Historial de versículos visitados.
   *
   * Se guarda MÁS RECIENTE PRIMERO y deduplicado por referencia. Antes cada
   * visita hacía `push`, así que ir a 3:14 → 3:16 → 3:14 dejaba tres entradas
   * con una repetida; ahora la tercera visita solo sube 3:14 al tope y le
   * actualiza la fecha.
   *
   * Además el efecto anterior escribía en localStorage pero nunca llamaba a
   * `setHistory`, así que la lista en pantalla se quedaba vieja hasta recargar.
   */
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("history");
      if (!guardado) return;
      const lista = normalizarHistorial(JSON.parse(guardado));
      // Las entradas viejas venían más antiguas primero; se invierte una sola
      // vez para dejar el orden nuevo (más reciente arriba).
      const yaOrdenado = lista.some((item) => item.visitadoEn > 0);
      setHistory(yaOrdenado ? lista : lista.reverse());
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!(versiculoSeleccionadoNumero > 0) || !libroSeleccionado || !capituloSeleccionadoNumero) return;

    // Pequeño retardo: al recorrer versículos seguidos no tiene sentido grabar
    // cada uno por el que se pasa, solo aquel donde el usuario se detiene.
    const id = setTimeout(() => {
      const entrada = {
        bibliasSeleccionadas,
        libroSeleccionado,
        capituloSeleccionadoNumero,
        versiculoSeleccionadoNumero,
        visitadoEn: Date.now(),
        visitas: 1,
      };
      entrada.id = claveReferencia(entrada);

      setHistory((previo) => {
        const anterior = previo.find((item) => item.id === entrada.id);
        if (anterior) entrada.visitas = (anterior.visitas ?? 1) + 1;

        const lista = [entrada, ...previo.filter((item) => item.id !== entrada.id)].slice(0, MAX_HISTORIAL);
        try {
          localStorage.setItem("history", JSON.stringify(lista));
        } catch {
          // Safari privado: se mantiene en memoria durante la sesión.
        }
        return lista;
      });
    }, 900);

    return () => clearTimeout(id);
  }, [versiculoSeleccionadoNumero, libroSeleccionado, capituloSeleccionadoNumero, bibliasSeleccionadas]);

  /** Se borra por `id`, no por índice: la lista se pinta y el índice no coincidía. */
  const eliminarElementoHistorial = (id) => {
    setHistory((previo) => {
      const lista = previo.filter((item) => item.id !== id);
      try {
        localStorage.setItem("history", JSON.stringify(lista));
      } catch {
        // sin persistencia
      }
      return lista;
    });
  };

  const limpiarHistorial = () => {
    setHistory([]);
    try {
      localStorage.removeItem("history");
    } catch {
      // sin persistencia
    }
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
  }, [strong, strongFun]);

  useEffect(() => {
    strongFun("");
  }, [setModalStrong]);

  useEffect(() => {
    if (strong.length === 0) return;

    const controller = new AbortController();
    let cancelado = false;

    const conseguirStrong = async () => {
      setCargandoStrong(true);
      try {
        // La fuente decide de dónde sale: el CDN sirve lotes de 150 entradas y
        // Turso una sola, pero ambas devuelven un arreglo y StrongSingle busca
        // dentro por id. Así este componente no sabe cuál está activa.
        const data = await getStrongBatch({ code: strong, signal: controller.signal });
        if (!cancelado) setStrongData(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelado && error?.name !== "AbortError") {
          console.error("Error al cargar Strong:", error);
          setStrongData([]);
        }
      } finally {
        if (!cancelado) setCargandoStrong(false);
      }
    };

    conseguirStrong();

    return () => {
      cancelado = true;
      controller.abort();
    };
  }, [strong]);

  //TEMA STRONG SINGLE
  const [image, setImage] = useState(null);
  const [cargandoImagen, setCargandoImagen] = useState(true);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const cambiarEstiloStrong = async () => {
      const ImageUrls = {
        light: "/light.webp",
        dark: "/dark.webp",
      };

      const imageUrl = ImageUrls[theme];
      setCargandoImagen(true);

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error("Failed to load image");
        }

        setImage(imageUrl);
        setCargandoImagen(false);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    };

    cambiarEstiloStrong();
  }, [theme]);

  const [compartir, setCompartir] = useState(false);
  const [textoCompartir, setTextoCompartir] = useState("");
  const [versiculoCompartir, setVersiculoCompartir] = useState("");
  const [nombreBibliaCompartir, setNombreBibliaCompartir] = useState("");

  const [textoCompartirTraducido, setTextoCompartirTraducido] = useState(null);

  /**
   * @param texto      capítulo original (con marcado)
   * @param versiculo  número del versículo
   * @param nombre     nombre de la versión
   * @param traducido  traducción de ESE versículo, si el usuario la pidió.
   *                   Cuando llega, el modal ofrece elegir cuál compartir.
   */
  const setCompartirVerse = (texto, versiculo, nombre, traducido = null) => {
    setTextoCompartir(capituloATextoPlano(texto));
    setTextoCompartirTraducido(traducido ? aTextoPlano(traducido) : null);
    setVersiculoCompartir(versiculo);
    setCompartir(true);
    setNombreBibliaCompartir(nombre);
  };

  //TAMAÑOS VERSESINGLE
  const tamaniosAncho = {
    small: {
      min: "min-w-[250px]",
      max: "max-w-[390px]",
    },
    medium: {
      min: "min-w-[250px]",
      max: "max-w-[600px]",
    },
    large: {
      min: "min-w-[250px]",
      max: "max-w-[1000px]",
    },
  };

  const tamaniosAlto = {
    small: {
      def: "h-[260px]",
    },
    medium: {
      def: "h-[400px]",
    },
    large: {
      def: "h-[600px]",
    },
  };

  const [tamanioVerseAncho, setTamanioVerseAncho] = useState(tamaniosAncho.small);
  const [tamanioVerseAlto, setTamanioVerseAlto] = useState(tamaniosAlto.small);
  const [anchoVentana, setAnchoVentana] = useState("1");
  const [altoVentana, setAltoVentana] = useState("1");

  const cambiarAnchoVentana = (tamanio) => {
    if (tamanio === "1") {
      setAnchoVentana("1");
      setTamanioVerseAncho(tamaniosAncho.small);
    } else if (tamanio === "2") {
      setAnchoVentana("2");
      setTamanioVerseAncho(tamaniosAncho.medium);
    } else {
      setAnchoVentana("3");
      setTamanioVerseAncho(tamaniosAncho.large);
    }
  };

  const cambiarAltoVentana = (tamanio) => {
    if (tamanio === "1") {
      setAltoVentana("1");
      setTamanioVerseAlto(tamaniosAlto.small);
    } else if (tamanio === "2") {
      setAltoVentana("2");
      setTamanioVerseAlto(tamaniosAlto.medium);
    } else {
      setAltoVentana("3");
      setTamanioVerseAlto(tamaniosAlto.large);
    }
  };

  // Recupera y asigna el ancho correctamente desde localStorage
  useEffect(() => {
    const tamanioAnchoGuardado = localStorage.getItem("tamanioAncho");
    const tamanioAnchoNumeroGuardado = localStorage.getItem("tamanioAnchoNumero");

    if (tamanioAnchoGuardado && tamanioAnchoNumeroGuardado) {
      const tamanioAnchoParsed = JSON.parse(tamanioAnchoGuardado);
      const tamanioAnchoNumeroParsed = JSON.parse(tamanioAnchoNumeroGuardado);
      setTamanioVerseAncho(tamanioAnchoParsed);
      setAnchoVentana(tamanioAnchoNumeroParsed);
    }
  }, []);

  // Recupera y asigna el alto correctamente desde localStorage
  useEffect(() => {
    const tamanioAltoGuardado = localStorage.getItem("tamanioAlto");
    const tamanioAltoNumeroGuardado = localStorage.getItem("tamanioAltoNumero");

    if (tamanioAltoGuardado && tamanioAltoNumeroGuardado) {
      const tamanioAltoParsed = JSON.parse(tamanioAltoGuardado);
      const tamanioAltoNumeroParsed = JSON.parse(tamanioAltoNumeroGuardado);
      setTamanioVerseAlto(tamanioAltoParsed);
      setAltoVentana(tamanioAltoNumeroParsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tamanioAncho", JSON.stringify(tamanioVerseAncho));
    localStorage.setItem("tamanioAnchoNumero", JSON.stringify(anchoVentana));
  }, [tamanioVerseAncho, anchoVentana]);

  useEffect(() => {
    localStorage.setItem("tamanioAlto", JSON.stringify(tamanioVerseAlto));
    localStorage.setItem("tamanioAltoNumero", JSON.stringify(altoVentana));
  }, [tamanioVerseAlto, altoVentana]);

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
        paginaInicio,
        handlePaginaInicio,
        history,
        eliminarElementoHistorial,
        limpiarHistorial,
        setearHistorial,
        setHistory,
        strong,
        strongFun,
        modalStrong,
        setModalStrong,
        strongData,
        setCargandoStrong,
        cargandoStrong,
        image,
        cargandoImagen,
        modoCompacto,
        setModoCompacto,
        leerMarcado,
        alternarMarcado,
        setCompartir,
        compartir,
        setCompartirVerse,
        textoCompartir,
        textoCompartirTraducido,
        versiculoCompartir,
        nombreBibliaCompartir,
        cambiarAnchoVentana,
        cambiarAltoVentana,
        tamanioVerseAncho,
        tamanioVerseAlto,
        anchoVentana,
        altoVentana,
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
