import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import LanguageContext from "./LanguageContext";
import { mapaDeLibro } from "../data/canon";
import { getStrongBatch } from "../services/bibleSource";
import { aTextoPlano, capituloATextoPlano } from "../utils/textoPlano";
import { compararVersiculos } from "../utils/diffVersiones";
import { versionDeTrabajo } from "../utils/versiones";

const DataContext = createContext();

// Por defecto la glosa se muestra y la morfología no: los códigos tipo
// `V-AAI-3S` son lo que más estorba al leer. Vive fuera del componente para no
// recrearse en cada render y poder ser dependencia estable de los useCallback.
const MARCADO_POR_DEFECTO = { morfologia: false, glosa: true };

const MAX_HISTORIAL = 40;

const claveReferencia = (item) => `${item.libroSeleccionado}:${item.capituloSeleccionadoNumero}`;

/**
 * Normaliza y agrupa entradas históricas por Libro + Capítulo,
 * consolidando todos los versículos visitados en ese capítulo.
 */
const normalizarHistorial = (lista) => {
  if (!Array.isArray(lista)) return [];
  const mapa = new Map();

  for (const item of lista) {
    if (!item || !item.libroSeleccionado || !item.capituloSeleccionadoNumero) continue;

    const id = `${item.libroSeleccionado}:${item.capituloSeleccionadoNumero}`;
    const numVersiculo = Number(item.versiculoSeleccionadoNumero) || 1;
    const versiculosPrevios = Array.isArray(item.versiculos)
      ? item.versiculos.map(Number).filter((n) => n > 0)
      : [numVersiculo];

    if (mapa.has(id)) {
      const existente = mapa.get(id);
      existente.visitas = (existente.visitas || 1) + (item.visitas || 1);
      existente.visitadoEn = Math.max(existente.visitadoEn || 0, item.visitadoEn || 0);
      existente.versiculos = Array.from(
        new Set([...existente.versiculos, ...versiculosPrevios, numVersiculo])
      ).sort((a, b) => a - b);

      if ((item.visitadoEn || 0) >= (existente.visitadoEn || 0)) {
        existente.versiculoSeleccionadoNumero = numVersiculo;
        if (Array.isArray(item.bibliasSeleccionadas) && item.bibliasSeleccionadas.length > 0) {
          existente.bibliasSeleccionadas = item.bibliasSeleccionadas;
        }
      }
    } else {
      mapa.set(id, {
        id,
        libroSeleccionado: item.libroSeleccionado,
        capituloSeleccionadoNumero: Number(item.capituloSeleccionadoNumero),
        versiculoSeleccionadoNumero: numVersiculo,
        versiculos: Array.from(new Set(versiculosPrevios)).sort((a, b) => a - b),
        visitadoEn: item.visitadoEn ?? 0,
        visitas: item.visitas ?? 1,
        bibliasSeleccionadas: Array.isArray(item.bibliasSeleccionadas) ? item.bibliasSeleccionadas : [],
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => (b.visitadoEn || 0) - (a.visitadoEn || 0));
};

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
  // `idiomaNavegador` se usa para elegir la versión de trabajo por defecto: con
  // la app en español, la previsualización debe salir en español y no en la
  // interlineal griega que resulte estar primera en el catálogo.
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const [paginaInicio, setPaginaInicio] = useState("/");
  const [history, setHistory] = useState([]);
  const [modoCompacto, setModoCompacto] = useState(false);

  /*
   * Marcado interlineal (morfología y glosa) en DOS niveles.
   *
   *   `marcadoGlobal`       lo que se ve por defecto en todas las versiones.
   *   `preferenciasMarcado` la excepción de una versión concreta.
   *
   * Hacen falta los dos. El global responde a "no quiero ver códigos
   * gramaticales en ningún sitio", que es una decisión que se toma una vez; el
   * de por versión responde a "en la interlineal griega sí, en la española de
   * al lado no", que es de la versión y no del usuario.
   *
   * Una versión con excepción guardada IGNORA el global mientras la tenga. Por
   * eso existe `restablecerMarcado`: sin él, tocar una vez el marcado de una
   * versión la dejaba sorda al ajuste general para siempre, sin manera de
   * deshacerlo desde la interfaz.
   */
  const [marcadoGlobal, setMarcadoGlobal] = useState(() => {
    try {
      const crudo = localStorage.getItem("marcadoGlobal");
      const valor = crudo ? JSON.parse(crudo) : null;
      return valor && typeof valor === "object" ? { ...MARCADO_POR_DEFECTO, ...valor } : MARCADO_POR_DEFECTO;
    } catch {
      return MARCADO_POR_DEFECTO;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("marcadoGlobal", JSON.stringify(marcadoGlobal));
    } catch {
      // Sin persistencia; aplica en esta sesión.
    }
  }, [marcadoGlobal]);

  const alternarMarcadoGlobal = useCallback((tipo) => {
    setMarcadoGlobal((previo) => ({ ...previo, [tipo]: !previo[tipo] }));
  }, []);

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
    (biblia) => ({ ...marcadoGlobal, ...(preferenciasMarcado[biblia] ?? {}) }),
    [marcadoGlobal, preferenciasMarcado]
  );

  const alternarMarcado = useCallback(
    (biblia, tipo) => {
      setPreferenciasMarcado((previo) => {
        const actual = { ...marcadoGlobal, ...(previo[biblia] ?? {}) };
        return { ...previo, [biblia]: { ...actual, [tipo]: !actual[tipo] } };
      });
    },
    [marcadoGlobal]
  );

  /** Cuántas versiones llevan una excepción guardada. */
  const versionesConMarcadoPropio = Object.keys(preferenciasMarcado).length;

  /** Borra todas las excepciones y devuelve el mando al ajuste global. */
  const restablecerMarcado = useCallback(() => setPreferenciasMarcado({}), []);

  //STRONGS
  const [strong, strongFun] = useState([]);
  const [modalStrong, setModalStrong] = useState(false);
  const [strongData, setStrongData] = useState({});
  const [cargandoStrong, setCargandoStrong] = useState(false);

  // Popup rápido de Strong al hacer clic en números del versículo
  const [strongPopup, setStrongPopup] = useState(null);

  const mostrarStrongPopup = useCallback((code, anchorRect = null) => {
    setStrongPopup({ code, anchorRect });
  }, []);

  const cerrarStrongPopup = useCallback(() => {
    setStrongPopup(null);
  }, []);

  const abrirDefinicionStrong = useCallback((code) => {
    setStrongPopup(null);
    strongFun(code);
  }, [strongFun]);

  /*
   * Concordancia inversa: en qué otros versículos aparece este mismo código.
   *
   * Vive aquí y no dentro del popup porque el popup es una burbuja pequeña
   * anclada a la palabra, y una lista de apariciones es larga y se navega. Se
   * abre como pantalla propia, igual que la definición completa.
   */
  const [concordanciaStrong, setConcordanciaStrong] = useState(null);

  const abrirConcordancia = useCallback((code) => {
    setStrongPopup(null);
    setConcordanciaStrong(code);
  }, []);

  const cerrarConcordancia = useCallback(() => setConcordanciaStrong(null), []);

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
    const findBookAndChapters = (bookKey) => {
      // El mapa { "1": [1..N], ... } se fabrica desde la tabla del canon. Antes
      // salía de buscar la clave en un JSON de 91 KB que se limitaba a tener
      // esas mismas listas escritas una por una.
      const capitulos = mapaDeLibro(bookKey);

      if (capitulos) {
        setSubBook(bookKey);
        setChapters(capitulos);
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
      const capId = `${libroSeleccionado}:${capituloSeleccionadoNumero}`;
      const numVersiculo = Number(versiculoSeleccionadoNumero);

      setHistory((previo) => {
        const anterior = previo.find((item) => item.id === capId);
        const versiculosPrevios = anterior && Array.isArray(anterior.versiculos) ? anterior.versiculos : [];
        const versiculosActualizados = Array.from(new Set([...versiculosPrevios, numVersiculo])).sort((a, b) => a - b);

        const entrada = {
          id: capId,
          libroSeleccionado,
          capituloSeleccionadoNumero: Number(capituloSeleccionadoNumero),
          versiculoSeleccionadoNumero: numVersiculo,
          versiculos: versiculosActualizados,
          visitadoEn: Date.now(),
          visitas: (anterior?.visitas ?? 0) + 1,
          bibliasSeleccionadas,
        };

        const lista = [entrada, ...previo.filter((item) => item.id !== capId)].slice(0, MAX_HISTORIAL);
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

  /**
   * Mete el historial del servidor en el que ya hay, sin perder ninguno.
   *
   * Lo llama `useSync` al iniciar sesión. Antes esa fusión se hacía escribiendo
   * localStorage a espaldas de React, con dos fallos: la lista en pantalla se
   * quedaba vieja hasta recargar, y el `slice(-40)` se quedaba con las ÚLTIMAS
   * cuarenta entradas de un arreglo ordenado más-reciente-primero, o sea con
   * las más viejas — tirando justo lo que el usuario acababa de leer.
   *
   * Aquí se delega en `normalizarHistorial`, que ya sabe agrupar por capítulo,
   * unir los versículos vistos, quedarse con la visita más reciente y ordenar.
   */
  const fusionarHistorial = useCallback((entradas) => {
    if (!Array.isArray(entradas) || entradas.length === 0) return;

    setHistory((previo) => {
      const lista = normalizarHistorial([...previo, ...entradas]).slice(0, MAX_HISTORIAL);
      try {
        localStorage.setItem("history", JSON.stringify(lista));
      } catch {
        // Safari privado: se mantiene en memoria durante la sesión.
      }
      return lista;
    });
  }, []);

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
        // El diccionario se pide en el idioma de la interfaz; si esa entrada
        // no está traducida, el backend responde en español y lo indica.
        const data = await getStrongBatch({ code: strong, lang: idiomaNavegador, signal: controller.signal });
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
  }, [strong, idiomaNavegador]);



  /*
   * -------------------------------------------------------------------------
   * Comparación palabra a palabra
   * -------------------------------------------------------------------------
   * Cada `<VerseWindow>` descarga su capítulo por su cuenta, así que ninguno
   * sabe qué dicen los demás. Para contrastar hace falta verlos juntos, y ese
   * es el único sitio donde están todos: cada panel deja aquí su texto y aquí
   * se calcula, una sola vez, qué palabra es propia de cada versión.
   *
   * Calcularlo en cada panel sería el mismo trabajo repetido N veces y con N
   * respuestas que podrían no coincidir entre sí.
   */
  const [modoDiferencias, setModoDiferencias] = useState(() => {
    try {
      return localStorage.getItem("modoDiferencias") === "true";
    } catch {
      return false;
    }
  });

  const alternarModoDiferencias = useCallback(() => {
    setModoDiferencias((previo) => {
      try {
        localStorage.setItem("modoDiferencias", String(!previo));
      } catch {
        // Sin persistencia; aplica en esta sesión.
      }
      return !previo;
    });
  }, []);

  const [textosPorBiblia, setTextosPorBiblia] = useState({});

  /*
   * El capítulo cargado se guarda en un ref ADEMÁS del estado.
   *
   * `registrarTexto` la llaman los paneles desde su efecto de carga. Si la
   * función dependiera del estado para comparar, cambiaría de identidad en cada
   * registro y volvería a disparar los efectos de todos los paneles: N paneles
   * registrando provocarían N² ejecuciones. Con el ref la función es estable.
   */
  const textosRef = useRef({});

  const registrarTexto = useCallback((biblia, capitulo) => {
    const anterior = textosRef.current[biblia];
    if (anterior === capitulo) return;
    textosRef.current = { ...textosRef.current, [biblia]: capitulo };
    setTextosPorBiblia(textosRef.current);
  }, []);

  // Al cambiar de pasaje lo cargado deja de valer: si no se limpia, el primer
  // panel que responda se compararía contra los textos del capítulo anterior.
  useEffect(() => {
    textosRef.current = {};
    setTextosPorBiblia({});
  }, [libroSeleccionado, capituloSeleccionadoNumero]);

  const diferenciasPorBiblia = useMemo(() => {
    if (!modoDiferencias || !versiculoSeleccionadoNumero) return null;

    const entradas = bibliasSeleccionadas
      .map((biblia) => ({ biblia, texto: textosPorBiblia[biblia]?.[String(versiculoSeleccionadoNumero)] }))
      .filter((entrada) => typeof entrada.texto === "string" && entrada.texto.trim() !== "");

    // Con menos de dos textos no hay nada que contrastar.
    if (entradas.length < 2) return null;

    return compararVersiculos(entradas);
  }, [modoDiferencias, versiculoSeleccionadoNumero, bibliasSeleccionadas, textosPorBiblia]);

  /*
   * -------------------------------------------------------------------------
   * Versión de trabajo
   * -------------------------------------------------------------------------
   * Hay tres cosas que necesitan UNA sola versión aunque haya seis abiertas:
   * la previsualización de las referencias cruzadas, la lectura en voz alta y
   * la exportación. Las tres cogían `bibliasSeleccionadas[0]`, y ese "primero"
   * es el orden del CATÁLOGO, no una preferencia del usuario: con una griega y
   * una española abiertas mandaba la griega, y seguía mandando después de
   * añadir la española porque el orden no había cambiado.
   *
   * Ahora hay una elección explícita, compartida por los tres paneles y con un
   * valor por defecto que acierta solo (ver `versionDeTrabajo`). Se guarda
   * porque es una preferencia de lectura, no algo que apetezca repetir en cada
   * sesión.
   */
  const [versionPreferida, setVersionPreferidaEstado] = useState(() => {
    try {
      return localStorage.getItem("versionTrabajo") ?? null;
    } catch {
      return null;
    }
  });

  const setVersionPreferida = useCallback((ruta) => {
    setVersionPreferidaEstado(ruta);
    try {
      if (ruta) localStorage.setItem("versionTrabajo", ruta);
      else localStorage.removeItem("versionTrabajo");
    } catch {
      // Sin persistencia; aplica en esta sesión.
    }
  }, []);

  /*
   * La preferencia guardada NO se usa a ciegas: si esa versión ya no está
   * abierta, se cae al valor por defecto. Respetarla igualmente dejaría los
   * paneles apuntando a un texto que el usuario ya cerró.
   */
  const versionTrabajo = useMemo(
    () => versionDeTrabajo(bibliasSeleccionadas, versionPreferida, idiomaNavegador),
    [bibliasSeleccionadas, versionPreferida, idiomaNavegador]
  );

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
  /*
   * El ancho de la ventana ya NO es un `max-width` por panel: los paneles viven
   * en una rejilla y todos miden lo mismo, así que lo que se elige aquí es el
   * ancho MÍNIMO de columna. La rejilla decide cuántas caben.
   */
  const ANCHOS_COLUMNA = { 1: 300, 2: 440, 3: 680 };
  const ALTOS_PANEL = { 1: "h-[280px]", 2: "h-[420px]", 3: "h-[620px]" };

  /*
   * Tamaño del texto bíblico.
   *
   * Las clases van escritas enteras porque Tailwind analiza el código como
   * TEXTO: una clase compuesta en tiempo de ejecución no llega al CSS generado
   * y en producción el tamaño no cambiaría, aunque en desarrollo sí.
   *
   * Se aplica al CONTENEDOR y no a cada versículo: así el marcado interlineal
   * (glosa, morfología), que hereda en `em`, escala en proporción en vez de
   * quedarse fijo mientras el texto crece.
   */
  const TAMANOS_TEXTO = { 1: "text-[13px]", 2: "text-[15px]", 3: "text-[17px]", 4: "text-[20px]", 5: "text-[24px]" };

  const [anchoVentana, setAnchoVentana] = useState("1");
  const [altoVentana, setAltoVentana] = useState("1");

  /*
   * Se derivan del número en vez de guardarse aparte. Antes se persistían las
   * clases de Tailwind ya resueltas en localStorage, así que cambiar un tamaño
   * en el código no le llegaba a nadie que ya hubiera abierto la app: seguía
   * leyendo las clases viejas de su navegador.
   */
  const [tamanoTexto, setTamanoTexto] = useState("2");

  const anchoColumna = ANCHOS_COLUMNA[anchoVentana] ?? ANCHOS_COLUMNA[1];
  const tamanioVerseAlto = ALTOS_PANEL[altoVentana] ?? ALTOS_PANEL[1];
  const claseTamanoTexto = TAMANOS_TEXTO[tamanoTexto] ?? TAMANOS_TEXTO[2];

  /** Pasos disponibles, para que el panel no tenga que conocer el mapa. */
  const TAMANOS_TEXTO_MAX = Object.keys(TAMANOS_TEXTO).length;

  const cambiarTamanoTexto = (paso) => {
    setTamanoTexto((previo) => {
      const siguiente = Math.min(TAMANOS_TEXTO_MAX, Math.max(1, Number(previo) + paso));
      const valor = String(siguiente);
      try {
        localStorage.setItem("tamanoTexto", valor);
      } catch {
        // Sin persistencia; aplica en esta sesión.
      }
      return valor;
    });
  };

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("tamanoTexto");
      if (guardado && TAMANOS_TEXTO[guardado]) setTamanoTexto(guardado);
    } catch {
      // Sin persistencia.
    }
    // Solo al montar: después manda lo que elija el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarAnchoVentana = (tamanio) => {
    setAnchoVentana(ANCHOS_COLUMNA[tamanio] ? tamanio : "1");
  };

  const cambiarAltoVentana = (tamanio) => {
    setAltoVentana(ALTOS_PANEL[tamanio] ? tamanio : "1");
  };

  // Solo se recupera el número elegido; el resto se calcula.
  useEffect(() => {
    const anchoGuardado = localStorage.getItem("tamanioAnchoNumero");
    if (anchoGuardado) setAnchoVentana(JSON.parse(anchoGuardado));

    const altoGuardado = localStorage.getItem("tamanioAltoNumero");
    if (altoGuardado) setAltoVentana(JSON.parse(altoGuardado));
  }, []);

  useEffect(() => {
    localStorage.setItem("tamanioAnchoNumero", JSON.stringify(anchoVentana));
  }, [anchoVentana]);

  useEffect(() => {
    localStorage.setItem("tamanioAltoNumero", JSON.stringify(altoVentana));
  }, [altoVentana]);

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
        fusionarHistorial,
        setearHistorial,
        setHistory,
        strong,
        strongFun,
        modalStrong,
        setModalStrong,
        strongData,
        setCargandoStrong,
        cargandoStrong,
        modoCompacto,
        setModoCompacto,
        leerMarcado,
        alternarMarcado,
        // Marcado: global con excepciones por versión
        marcadoGlobal,
        alternarMarcadoGlobal,
        versionesConMarcadoPropio,
        restablecerMarcado,
        // Tamaño del texto bíblico
        tamanoTexto,
        cambiarTamanoTexto,
        claseTamanoTexto,
        TAMANOS_TEXTO_MAX,
        setCompartir,
        compartir,
        setCompartirVerse,
        textoCompartir,
        textoCompartirTraducido,
        versiculoCompartir,
        nombreBibliaCompartir,
        // Versión de trabajo (referencias, audio y exportar)
        versionTrabajo,
        versionPreferida,
        setVersionPreferida,
        // Comparación palabra a palabra
        modoDiferencias,
        alternarModoDiferencias,
        registrarTexto,
        textosPorBiblia,
        diferenciasPorBiblia,
        cambiarAnchoVentana,
        cambiarAltoVentana,
        anchoColumna,
        tamanioVerseAlto,
        anchoVentana,
        altoVentana,
        // Popup rápido de Strong
        strongPopup,
        mostrarStrongPopup,
        cerrarStrongPopup,
        abrirDefinicionStrong,
        // Concordancia inversa
        concordanciaStrong,
        abrirConcordancia,
        cerrarConcordancia,
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
