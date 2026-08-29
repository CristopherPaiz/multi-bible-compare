import { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { buscar, buscarStrongs, listarBiblias, LARGO_MINIMO } from "../services/searchSource";
import { getDataSource, onDataSourceChange, setDataSource, SOURCES } from "../config/dataSource";
import { aTextoPlano } from "../utils/textoPlano";
import { MAX_VERSIONES_COMPARADAS, nombreIdioma, versionDeReferencia } from "../utils/versiones";
import ModalVersionAusente from "../components/ModalVersionAusente";
import { sugerenciasAlAzar } from "../data/sugerencias";

const POR_PAGINA = 25;
const RETARDO_MS = 350;
const CLAVE_STORAGE_BIBLIA = "biblia_busqueda_id";


const Search = () => {
  const { t, idiomaNavegador } = useContext(LanguageContext);
  const {
    libros,
    setLibroSeleccionado,
    setCapituloSeleccionadoNumero,
    setVersiculoSeleccionadoNumero,
    bibliasSeleccionadas,
    setBibliasSeleccionadas,
    destacarVersion,
    strongFun,
  } = useContext(DataContext);
  const navigate = useNavigate();

  /*
   * `?q=` en la dirección arranca la búsqueda ya escrita.
   *
   * Lo usa la paleta de comandos: lo que se teclea ahí y no es una referencia
   * se manda aquí. También hace la búsqueda compartible, que antes no lo era.
   *
   * Se lee solo como valor INICIAL: a partir de ahí manda el campo de texto, y
   * mantener los dos sincronizados en ambos sentidos solo serviría para que se
   * pisaran mientras el usuario escribe.
   */
  const [parametros] = useSearchParams();
  const consultaInicial = parametros.get("q") ?? "";

  const [texto, setTexto] = useState(consultaInicial);
  const [termino, setTermino] = useState(consultaInicial.trim());
  const [bibliaId, setBibliaId] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE_BIBLIA);
      return guardado ? Number(guardado) : null;
    } catch {
      return null;
    }
  });
  /*
   * Qué se está buscando: el TEXTO BÍBLICO o el DICCIONARIO Strong.
   *
   * Son dos índices distintos y dos formas de resultado, pero una sola
   * pregunta del usuario —dónde sale esta palabra— y un solo campo donde
   * escribirla. Partirlo en dos pantallas obligaría a saber de antemano en cuál
   * buscar, que es justo lo que no se sabe.
   *
   * El selector de versión y el filtro por libro solo se pintan en modo
   * bíblico: el diccionario no tiene ni libros ni versiones.
   */
  const [modo, setModo] = useState("biblia");
  const [resultadosStrong, setResultadosStrong] = useState(null);

  const [libroFiltro, setLibroFiltro] = useState("");
  const [catalogo, setCatalogo] = useState([]);
  const [resultados, setResultados] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  /*
   * Semilla de las sugerencias.
   *
   * Se baraja al montar, al cambiar de idioma y al limpiar la búsqueda —los
   * tres momentos en que el usuario vuelve a mirar la pantalla vacía—. Rebarajar
   * en cada render las cambiaría mientras las lee.
   */
  const [semillaSugerencias, setSemillaSugerencias] = useState(0);

  const sugerencias = useMemo(
    () => sugerenciasAlAzar(idiomaNavegador, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idiomaNavegador, semillaSugerencias]
  );

  const [fuente, setFuente] = useState(getDataSource);
  useEffect(() => onDataSourceChange(setFuente), []);
  const disponible = fuente === SOURCES.TURSO;

  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce para no saturar la búsqueda por cada tecla
  useEffect(() => {
    const id = setTimeout(() => {
      setTermino(texto.trim());
      setPagina(1);
    }, RETARDO_MS);
    return () => clearTimeout(id);
  }, [texto]);

  // Catálogo de versiones para el selector
  useEffect(() => {
    if (!disponible) return;
    const controller = new AbortController();

    listarBiblias({ signal: controller.signal })
      .then((lista) => {
        setCatalogo(lista);
        setBibliaId((actual) => {
          // 1. Si ya tiene un ID válido en estado o en localStorage y existe en la lista, respetarlo
          if (actual && lista.some((b) => b.id === actual)) {
            return actual;
          }
          try {
            const guardado = localStorage.getItem(CLAVE_STORAGE_BIBLIA);
            if (guardado) {
              const guardadoNum = Number(guardado);
              if (lista.some((b) => b.id === guardadoNum)) return guardadoNum;
            }
          } catch {
            // Ignorar errores de acceso a localStorage
          }

          // 2. Preseleccionar la que el usuario ya tenga en 'Comparar'
          const preferida = lista.find((b) => bibliasSeleccionadas?.includes(b.legacyPath));
          const idFinal = preferida?.id ?? lista[0]?.id ?? null;

          if (idFinal) {
            try {
              localStorage.setItem(CLAVE_STORAGE_BIBLIA, String(idFinal));
            } catch {
              // Ignore storage errors
            }
          }
          return idFinal;
        });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e.message);
      });

    return () => controller.abort();
  }, [disponible, bibliasSeleccionadas]);

  /*
   * Al CAMBIAR de idioma, la versión de referencia de ese idioma.
   *
   * Español → Reina-Valera 1960; inglés → King James. No es un juicio sobre
   * cuál es mejor: son las que todo el mundo reconoce, y buscar "love" en una
   * Biblia en español no devuelve nada, así que dejar la anterior convierte el
   * cambio de idioma en un buscador roto.
   *
   * Solo al CAMBIAR, no al montar: la primera vez manda lo que el usuario
   * eligiera la última vez, que sigue guardado. Por eso el `ref` con el idioma
   * anterior — sin él, este efecto pisaría esa elección en cada visita.
   */
  const idiomaPrevio = useRef(idiomaNavegador);

  useEffect(() => {
    if (idiomaPrevio.current === idiomaNavegador) return;
    idiomaPrevio.current = idiomaNavegador;

    if (catalogo.length === 0) return;

    const referencia = versionDeReferencia(catalogo, idiomaNavegador);
    if (!referencia) return;

    setBibliaId(referencia.id);
    setPagina(1);
    setSemillaSugerencias((previo) => previo + 1);
    try {
      localStorage.setItem(CLAVE_STORAGE_BIBLIA, String(referencia.id));
    } catch {
      // Sin persistencia; aplica en esta sesión.
    }
  }, [idiomaNavegador, catalogo]);

  // Manejo de cambio de versión con persistencia en localStorage
  const handleCambiarBiblia = useCallback((nuevoId) => {
    const idNum = Number(nuevoId);
    setBibliaId(idNum);
    setPagina(1);
    try {
      localStorage.setItem(CLAVE_STORAGE_BIBLIA, String(idNum));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Efecto de búsqueda principal
  useEffect(() => {
    if (modo !== "biblia" || !disponible || termino.length < LARGO_MINIMO || !bibliaId) {
      setResultados(null);
      return;
    }

    const controller = new AbortController();
    setCargando(true);
    setError(null);

    const opciones = {
      q: termino,
      bibles: [bibliaId],
      page: pagina,
      limit: POR_PAGINA,
      signal: controller.signal,
    };

    if (libroFiltro) {
      opciones.book = Number(libroFiltro);
    }

    buscar(opciones)
      .then(setResultados)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setError(e.message);
        setResultados(null);
      })
      .finally(() => setCargando(false));

    return () => controller.abort();
  }, [modo, termino, bibliaId, libroFiltro, pagina, disponible]);

  /*
   * Búsqueda en el diccionario Strong.
   *
   * Va aparte del efecto anterior y no dentro de un `if`: son dos peticiones a
   * endpoints distintos, con su propia cancelación y su propia paginación.
   * Mezcladas, cambiar de modo dejaría en pantalla los resultados del otro
   * mientras llega la respuesta nueva.
   */
  useEffect(() => {
    if (modo !== "strong" || !disponible || termino.length < LARGO_MINIMO) {
      setResultadosStrong(null);
      return;
    }

    const controller = new AbortController();
    setCargando(true);
    setError(null);

    buscarStrongs({ q: termino, lang: idiomaNavegador, pagina, limite: POR_PAGINA, signal: controller.signal })
      .then(setResultadosStrong)
      .catch((fallo) => {
        if (fallo?.name === "AbortError") return;
        setError(fallo.message);
        setResultadosStrong(null);
      })
      .finally(() => setCargando(false));

    return () => controller.abort();
  }, [modo, termino, pagina, disponible, idiomaNavegador]);

  // Al cambiar de modo se vuelve a la primera página: la 3 de un buscador no
  // significa nada en el otro.
  useEffect(() => {
    setPagina(1);
  }, [modo]);

  /*
   * El catálogo agrupado por idioma.
   *
   * Eran 162 versiones en una lista plana: para dar con una en inglés había que
   * pasar por delante de las 76 en español, y sin ningún encabezado que dijera
   * dónde empieza cada idioma. Con `<optgroup>` el desplegable nativo los
   * separa, y en móvil la rueda del sistema los muestra con su título.
   *
   * El idioma de la interfaz va PRIMERO, y el resto por número de versiones.
   * Quien tiene la app en español busca casi siempre en español; dejarlo en el
   * orden del catálogo sería ordenar por un criterio que a nadie le sirve.
   */
  const catalogoPorIdioma = useMemo(() => {
    const grupos = new Map();
    for (const biblia of catalogo) {
      const idioma = biblia.language || "—";
      if (!grupos.has(idioma)) grupos.set(idioma, []);
      grupos.get(idioma).push(biblia);
    }

    const propio = idiomaNavegador === "en" ? "English" : "Español";

    return [...grupos.entries()]
      .map(([idioma, versiones]) => ({ idioma, versiones }))
      .sort((a, b) => {
        if (a.idioma === propio) return -1;
        if (b.idioma === propio) return 1;
        return b.versiones.length - a.versiones.length;
      });
  }, [catalogo, idiomaNavegador]);

  const bibliaSeleccionadaObj = useMemo(() => {
    return catalogo.find((b) => b.id === bibliaId) ?? null;
  }, [catalogo, bibliaId]);

  const nombreBiblia = useMemo(() => {
    if (!bibliaSeleccionadaObj) return "";
    // Con el idioma delante: con 13 idiomas en el selector, el nombre solo no
    // dice en cual se esta buscando.
    const idioma = nombreIdioma(bibliaSeleccionadaObj.language, t);
    const anio = bibliaSeleccionadaObj.year ? ` (${bibliaSeleccionadaObj.year})` : "";
    return `${idioma} · ${bibliaSeleccionadaObj.name}${anio}`;
    // `t` entra porque el nombre del idioma se traduce: sin ella, cambiar de
    // idioma dejaba el encabezado con el nombre anterior hasta recargar.
  }, [bibliaSeleccionadaObj, t]);

  /*
   * ---------------------------------------------------------------------------
   * De un resultado al pasaje
   * ---------------------------------------------------------------------------
   * El resultado sale de UNA versión, pero Comparar enseña todas las abiertas.
   * Hay dos casos y no se pueden tratar igual:
   *
   *   - La versión YA está abierta. Se navega y se destaca su panel: sin eso,
   *     con seis columnas enseñando el mismo versículo, no hay forma de saber
   *     cuál dio el resultado.
   *
   *   - La versión NO está abierta. Antes se colaba al principio de la lista sin
   *     avisar, lo que cambiaba solo una comparación que el usuario había
   *     montado a mano —y con el tope lleno, empujaba fuera a otra en silencio.
   *     Ahora se pregunta (ver `ModalVersionAusente`).
   */

  /** Resultado en espera de que el usuario decida qué hacer con su versión. */
  const [versionPendiente, setVersionPendiente] = useState(null);

  const abrirEnComparar = useCallback(
    (hit, rutaBiblia, seleccionNueva) => {
      if (seleccionNueva) setBibliasSeleccionadas(seleccionNueva);

      setLibroSeleccionado(`book${hit.bookId}`);
      setCapituloSeleccionadoNumero(Number(hit.chapter));
      setVersiculoSeleccionadoNumero(Number(hit.verse));

      // La señal se pide ANTES de navegar: el panel se monta ya sabiendo que le
      // toca desplazarse y destellar, sin un fotograma quieto por medio.
      destacarVersion(rutaBiblia ?? null);
      navigate("/compare");
    },
    [navigate, destacarVersion, setBibliasSeleccionadas, setLibroSeleccionado, setCapituloSeleccionadoNumero, setVersiculoSeleccionadoNumero]
  );

  const irAlVersiculo = useCallback(
    (hit) => {
      const rutaBiblia = catalogo.find((b) => b.id === hit.bibleId)?.legacyPath ?? null;
      const abiertas = Array.isArray(bibliasSeleccionadas) ? bibliasSeleccionadas : [];

      // Sin versión reconocible se navega igual: el pasaje importa más que
      // señalar la columna, y preguntar por algo que no se sabe nombrar sería
      // peor que no preguntar.
      if (!rutaBiblia) {
        abrirEnComparar(hit, null);
        return;
      }

      // Sin nada abierto no hay comparación que romper ni a quién reemplazar.
      if (abiertas.length === 0) {
        abrirEnComparar(hit, rutaBiblia, [rutaBiblia]);
        return;
      }

      if (abiertas.includes(rutaBiblia)) {
        abrirEnComparar(hit, rutaBiblia);
        return;
      }

      setVersionPendiente({ hit, ruta: rutaBiblia });
    },
    [catalogo, bibliasSeleccionadas, abrirEnComparar]
  );

  /** Añade la versión pendiente, reemplazando a `rutaFuera` si el tope está lleno. */
  const resolverAgregando = useCallback(
    (rutaFuera) => {
      if (!versionPendiente) return;
      const { hit, ruta } = versionPendiente;
      const abiertas = Array.isArray(bibliasSeleccionadas) ? bibliasSeleccionadas : [];

      const base = rutaFuera ? abiertas.filter((item) => item !== rutaFuera) : abiertas;
      // El corte es una red de seguridad: si el tope llegara lleno sin haber
      // pasado por la pantalla de reemplazo, se recorta en vez de mandar al
      // backend una consulta que va a rechazar con un 400.
      const nueva = [...base, ruta].slice(0, MAX_VERSIONES_COMPARADAS);

      setVersionPendiente(null);
      abrirEnComparar(hit, ruta, nueva);
    },
    [versionPendiente, bibliasSeleccionadas, abrirEnComparar]
  );

  const resolverSoloEsta = useCallback(() => {
    if (!versionPendiente) return;
    const { hit, ruta } = versionPendiente;
    setVersionPendiente(null);
    abrirEnComparar(hit, ruta, [ruta]);
  }, [versionPendiente, abrirEnComparar]);

  const copiarVersiculo = useCallback(
    async (evento, hit) => {
      evento.stopPropagation();
      const nombreLibro = libros?.[`book${hit.bookId}`] ?? `Libro ${hit.bookId}`;
      const textoLimpio = aTextoPlano(hit.snippet).replace(/\\par\b/gi, " ");
      const referencia = `${nombreLibro} ${hit.chapter}:${hit.verse}`;
      const textoFinal = `"${textoLimpio}"\n— ${referencia} (${nombreBiblia})`;

      try {
        await navigator.clipboard.writeText(textoFinal);
        const hitKey = `${hit.bibleId}-${hit.bookId}-${hit.chapter}-${hit.verse}`;
        setCopiadoId(hitKey);
        setTimeout(() => setCopiadoId(null), 2000);
      } catch (err) {
        console.error("Error al copiar versículo:", err);
      }
    },
    [libros, nombreBiblia]
  );

  const limpiarBusqueda = () => {
    setTexto("");
    setTermino("");
    // Otras palabras al volver a la pantalla vacía: si fueran las mismas, la
    // segunda búsqueda parecería la misma pantalla que la primera.
    setSemillaSugerencias((previo) => previo + 1);
    inputRef.current?.focus();
  };

  // Limpiar posibles códigos RTF \par en snippets
  const limpiarSnippet = useCallback((rawSnippet) => {
    return String(rawSnippet ?? "")
      .replace(/\\par\b/gi, " ")
      .trim();
  }, []);

  // --- La búsqueda no existe en el CDN: se explica en vez de fallar ---
  if (!disponible) {
    return (
      <div className="animate-fade-in mx-auto mt-12 w-11/12 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-md dark:border-amber-900/50 dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{t("Buscar")}</h1>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{t("BuscarNoDisponible")}</p>
        <button
          onClick={() => setDataSource(SOURCES.TURSO)}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t("BuscarActivarApi")}
        </button>
      </div>
    );
  }

  const total = resultados?.pagination?.total ?? 0;
  const totalPaginas = resultados?.pagination?.totalPages ?? 0;

  return (
    <div className="animate-fade-in mx-auto mt-4 w-11/12 max-w-4xl pb-24">
      {/* La decisión sobre la versión del resultado. Solo aparece cuando esa
          versión no está entre las abiertas; ver `ModalVersionAusente`. */}
      {versionPendiente && (
        <ModalVersionAusente
          version={versionPendiente.ruta}
          seleccionadas={bibliasSeleccionadas}
          onCancelar={() => setVersionPendiente(null)}
          onSoloEsta={resolverSoloEsta}
          onAgregar={resolverAgregando}
        />
      )}

      {/* Qué se busca. Va lo primero porque decide qué significa todo lo demás
          de la pantalla: en modo diccionario no hay versión ni libro. */}
      <div role="tablist" className="mx-auto mb-4 flex max-w-sm gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10">
        {[
          ["biblia", "BuscarModoBiblia"],
          ["strong", "BuscarModoStrong"],
        ].map(([valor, clave]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => setModo(valor)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              modo === valor
                ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t(clave)}
          </button>
        ))}
      </div>

      {/* Encabezado y configuración de versión bíblica */}
      <div className={`mb-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 ${modo === "strong" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {t("BuscarVersionActual")}
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
              {nombreBiblia || t("BuscarSeleccionarBiblia")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="selector-biblia-busqueda" className="sr-only">
              {t("BuscarSeleccionarBiblia")}
            </label>
            <select
              id="selector-biblia-busqueda"
              value={bibliaId ?? ""}
              onChange={(e) => handleCambiarBiblia(e.target.value)}
              aria-label={t("BuscarSeleccionarBiblia")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:w-auto sm:max-w-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
            >
              {catalogo.length === 0 ? (
                <option value="">{t("Cargando")}</option>
              ) : (
                catalogoPorIdioma.map(({ idioma, versiones }) => (
                  <optgroup key={idioma} label={`${nombreIdioma(idioma, t)} (${versiones.length})`}>
                    {versiones.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.year ? `(${b.year})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda principal y filtros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3 md:flex-row">
          {/* Campo de búsqueda con icono y botón de limpieza */}
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t("BuscarPlaceholder")}
              aria-label={t("Buscar")}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2.5 pl-10 pr-10 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-amber-400 dark:focus:bg-neutral-800"
            />
            {texto && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title={t("BuscarLimpiarFiltros")}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtro por Libro (Opcional). El diccionario no tiene libros. */}
          <div className={`min-w-[180px] ${modo === "strong" ? "hidden" : ""}`}>
            <label htmlFor="filtro-libro-busqueda" className="sr-only">
              {t("BuscarFiltrarLibro")}
            </label>
            <select
              id="filtro-libro-busqueda"
              value={libroFiltro}
              onChange={(e) => {
                setLibroFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800 shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-gray-200"
            >
              <option value="">{t("BuscarTodosLosLibros")}</option>
              {Array.from({ length: 66 }).map((_, i) => {
                const bookNum = i + 1;
                const bookKey = `book${bookNum}`;
                const bookName = libros?.[bookKey] ?? `Libro ${bookNum}`;
                return (
                  <option key={bookKey} value={bookNum}>
                    {bookName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Indicador de longitud mínima */}
        {texto.trim().length > 0 && texto.trim().length < LARGO_MINIMO && (
          <p className="mt-2.5 text-xs text-amber-600 dark:text-amber-400">
            {t("BuscarMinimo", { min: LARGO_MINIMO })}
          </p>
        )}
      </div>

      {/* Estado de error */}
      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      )}

      {/* Estado inicial / sugerencias cuando no hay búsqueda activa */}
      {!cargando && ((modo === "biblia" && !resultados) || (modo === "strong" && !resultadosStrong) || termino.length < LARGO_MINIMO) && (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{t("BuscarTipsTitulo")}</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-gray-600 dark:text-gray-400">{t("BuscarTip1")}</p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {sugerencias.map((sug) => (
              <button
                key={sug}
                onClick={() => setTexto(sug)}
                className="rounded-full border border-gray-300 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:border-amber-500 dark:hover:bg-neutral-700"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Esqueleto de carga animado */}
      {cargando && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-neutral-800"></div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-amber-200/60 dark:bg-amber-900/40"></div>
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-neutral-800"></div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-neutral-800"></div>
            </div>
          ))}
        </div>
      )}

      {/*
        Resultados del diccionario.
        Al tocar uno se abre el modal de Strong, que es la ficha completa con
        definición y audio: repetir aquí lo que ese modal ya hace mejor sería
        mantener dos vistas del mismo dato.
      */}
      {!cargando && modo === "strong" && resultadosStrong && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("BuscarResultadosStrong", { total: resultadosStrong.pagination.total })}
            </p>
            {resultadosStrong.pagination.total > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pagina} / {Math.max(1, resultadosStrong.pagination.totalPages)}
              </span>
            )}
          </div>

          {resultadosStrong.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-neutral-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("BuscarSinResultados", { termino })}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {resultadosStrong.data.map((entrada) => (
                <li key={entrada.code}>
                  <button
                    type="button"
                    onClick={() => strongFun(entrada.code)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/20"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{entrada.code}</span>
                      <span className="text-base font-semibold text-gray-900 dark:text-white">{entrada.lemma}</span>
                      {entrada.transliteration && <span className="text-sm italic text-gray-500 dark:text-gray-400">{entrada.transliteration}</span>}
                    </div>
                    {entrada.definition && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{aTextoPlano(entrada.definition)}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {resultadosStrong.pagination.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPagina((previo) => Math.max(1, previo - 1))}
                disabled={pagina <= 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-200"
              >
                {t("BuscarAnterior")}
              </button>
              <button
                type="button"
                onClick={() => setPagina((previo) => Math.min(resultadosStrong.pagination.totalPages, previo + 1))}
                disabled={pagina >= resultadosStrong.pagination.totalPages}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-200"
              >
                {t("BuscarSiguiente")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lista de resultados */}
      {!cargando && modo === "biblia" && resultados && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("BuscarResultados", { total, biblia: nombreBiblia })}
            </p>
            {total > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pagina} / {Math.max(1, totalPaginas)}
              </span>
            )}
          </div>

          <ul className="flex flex-col gap-3">
            {resultados.data.map((hit) => {
              const hitKey = `${hit.bibleId}-${hit.bookId}-${hit.chapter}-${hit.verse}`;
              const estaCopiado = copiadoId === hitKey;
              const nombreLibro = libros?.[`book${hit.bookId}`] ?? `Libro ${hit.bookId}`;

              return (
                <li
                  key={hitKey}
                  onClick={() => irAlVersiculo(hit)}
                  className="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      {nombreLibro} {hit.chapter}:{hit.verse}
                    </span>

                    {/* Botones de acción rápida */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => copiarVersiculo(e, hit)}
                        title={t("BuscarCopiarVersiculo")}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
                      >
                        {estaCopiado ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {t("BuscarVersiculoCopiado")}
                          </span>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          irAlVersiculo(hit);
                        }}
                        title={t("BuscarIrAlPasaje")}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-neutral-800 dark:hover:text-amber-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p
                    className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200 [&_mark]:rounded-sm [&_mark]:bg-amber-200/90 [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:font-medium [&_mark]:text-amber-950 dark:[&_mark]:bg-amber-500/30 dark:[&_mark]:text-amber-200"
                    dangerouslySetInnerHTML={{ __html: limpiarSnippet(hit.snippet) }}
                  ></p>
                </li>
              );
            })}
          </ul>

          {/* Estado sin resultados */}
          {total === 0 && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-neutral-800">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("BuscarSinResultados")}</p>
            </div>
          )}

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t("BuscarAnterior")}
              </button>

              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {pagina} / {totalPaginas}
              </span>

              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700"
              >
                {t("BuscarSiguiente")}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
