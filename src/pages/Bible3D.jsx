import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { getChapter } from "../services/bibleSource";
import { BIBLIAS } from "../data/biblias";
import bibleData from "../assets/bibles/JSON_DATA/01. English - Amplified (2015).json";
import { useBloquearScroll } from "../hooks/useBloquearScroll";
import { capitulosAPiezas } from "../components/book3d/prosa";
import Book3D from "../components/book3d/Book3D";
import Selector3D from "../components/book3d/Selector3D";

/**
 * Lector en libro.
 *
 * Es una pantalla aparte, no un modo de `Comparar`: la comparación pone N
 * versiones en paralelo y esto pone UNA a pantalla completa. Comparten el
 * origen de datos (`getChapter`) y nada más; ni tocan el mismo estado ni se
 * estorban.
 *
 * Ocupa toda la ventana en lugar de vivir bajo la barra de navegación porque el
 * libro necesita saber cuánto espacio tiene para calcular el tamaño de la hoja,
 * y con las dos barras de la app (arriba y, en móvil, abajo) ese hueco depende
 * de cosas que cambian solas. A pantalla completa el hueco es la ventana.
 */

const CLAVE_VERSION = "biblia3d_version";
const CLAVE_REFERENCIA = "biblia3d_referencia";

const VERSION_POR_DEFECTO = "034. Español - Biblia Reina Valera (1960)";
const ULTIMO_LIBRO_AT = 39;

/**
 * A cuántas hojas del final se pide el capítulo siguiente.
 *
 * Tres y no una: en apaisado se ven dos hojas de golpe, así que con una sola de
 * margen el usuario ya estaría mirando la última cuando arranca la petición.
 */
const MARGEN_PRECARGA = 3;

/**
 * El nombre de la carpeta trae el idioma: "034. Español - Biblia ...".
 *
 * Hace falta como atributo `lang` del texto: Chrome solo parte palabras con
 * guion si sabe en qué idioma están, y sin partición una columna estrecha y
 * justificada se llena de huecos entre palabras.
 */
const ISO_POR_IDIOMA = { Español: "es", English: "en", Esperanto: "eo", Greek: "el", Hebrew: "he", Latin: "la" };

const idiomaDesdeRuta = (ruta) => ISO_POR_IDIOMA[ruta.split(". ")[1]?.split(" -")[0]] ?? "es";

/** Índice ruta -> título mostrable, armado una vez al cargar el módulo. */
const TITULO_POR_RUTA = Object.values(BIBLIAS).reduce((acc, porIdioma) => {
  for (const [titulo, datos] of Object.entries(porIdioma)) acc[datos.ruta] = titulo;
  return acc;
}, {});

/** Metadatos (`new` / `old`) por ruta, para saber qué libros tiene la versión. */
const DATOS_POR_RUTA = Object.values(BIBLIAS).reduce((acc, porIdioma) => {
  for (const datos of Object.values(porIdioma)) acc[datos.ruta] = datos;
  return acc;
}, {});

const leer = (clave, respaldo) => {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado ? JSON.parse(guardado) : respaldo;
  } catch {
    // Safari en modo privado lanza excepción al tocar localStorage.
    return respaldo;
  }
};

const guardar = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin persistencia, pero la sesión sigue funcionando.
  }
};

const capitulosDe = (bookId) => {
  const clave = `book${bookId}`;
  const libro = bibleData.NewTestament[clave] ?? bibleData.OldTestament[clave];
  return libro ? Object.keys(libro) : [];
};

/**
 * Botón de la barra superior.
 *
 * Definido FUERA del componente. Dentro, cada render crearía un tipo de
 * componente nuevo y React desmontaría y volvería a montar los tres botones en
 * cada tecleo, perdiendo el foco y el estado del navegador.
 */
const Boton = ({ children, onClick, titulo, activo = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={titulo}
    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
      activo ? "bg-[#a97109] text-white dark:bg-purple-500" : "bg-black/5 text-neutral-800 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
    }`}
  >
    {children}
  </button>
);

Boton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func.isRequired,
  titulo: PropTypes.string,
  activo: PropTypes.bool,
};

/** Botón redondo de la barra de abajo. */
const BotonBarra = ({ hacia, onClick, disabled, etiqueta }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={etiqueta}
    title={etiqueta}
    className="grid h-11 w-11 place-items-center rounded-full bg-black/5 transition-colors hover:bg-black/10 disabled:pointer-events-none disabled:opacity-25 dark:bg-white/10 dark:hover:bg-white/20"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d={hacia === "atras" ? "M15 19 8 12l7-7" : "m9 5 7 7-7 7"} />
    </svg>
  </button>
);

BotonBarra.propTypes = {
  hacia: PropTypes.oneOf(["atras", "adelante"]).isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  etiqueta: PropTypes.string,
};

const Bible3D = () => {
  const { t } = useContext(LanguageContext);
  const { libros } = useContext(DataContext);
  const navigate = useNavigate();

  const [version, setVersion] = useState(() => leer(CLAVE_VERSION, VERSION_POR_DEFECTO));
  const [referencia, setReferencia] = useState(() => leer(CLAVE_REFERENCIA, { bookId: 43, capitulo: "1" }));
  const [selector, setSelector] = useState(null);
  const [mostrarStrong, setMostrarStrong] = useState(false);

  /**
   * Capítulos ya traídos, en orden, empezando por el que eligió el usuario.
   *
   * El lector NO trabaja capítulo a capítulo: encadena. Cuando la lectura se
   * acerca al final, se pide el siguiente y se añade aquí; el texto crece por
   * detrás y el libro sigue de largo, sin volver a la portada ni cortar la
   * lectura con el nombre del libro por medio.
   */
  const [cargados, setCargados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [hoja, setHoja] = useState({ total: 0, actual: 0, capitulo: "" });

  // La función para pasar hoja vive dentro de `Book3D` (necesita su ref a la
  // librería). Se guarda aquí para que los botones de la barra la puedan usar.
  const pasarRef = useRef(null);

  useBloquearScroll(true);

  useEffect(() => guardar(CLAVE_VERSION, version), [version]);
  useEffect(() => guardar(CLAVE_REFERENCIA, referencia), [referencia]);

  /*
   * Libros que existen en ESTA versión. Muchas ediciones son solo Nuevo
   * Testamento (interlineales griegos, por ejemplo); ofrecer Génesis en una de
   * ellas lleva a una hoja de error en vez de a un texto.
   */
  const librosDisponibles = useMemo(() => {
    const datos = DATOS_POR_RUTA[version];
    const lista = [];
    for (let id = 1; id <= 66; id += 1) {
      const esAntiguo = id <= ULTIMO_LIBRO_AT;
      if (esAntiguo && datos?.old === false) continue;
      if (!esAntiguo && datos?.new === false) continue;
      lista.push({ id, nombre: libros[`book${id}`] ?? `book${id}` });
    }
    return lista;
  }, [version, libros]);

  const capitulos = useMemo(() => capitulosDe(referencia.bookId), [referencia.bookId]);

  /** Referencia elegida por el usuario. Cambiarla descarta lo encadenado. */
  const ancla = `${version}|${referencia.bookId}|${referencia.capitulo}`;

  // Al cambiar a una versión que no tiene el libro abierto, se salta al primero
  // que sí tenga en vez de dejar la pantalla en un error del que no se sale.
  useEffect(() => {
    if (librosDisponibles.some(({ id }) => id === referencia.bookId)) return;
    const primero = librosDisponibles[0];
    if (primero) setReferencia({ bookId: primero.id, capitulo: "1" });
  }, [librosDisponibles, referencia.bookId]);

  /*
   * Carga del capítulo de partida. Cualquier cambio de versión, libro o
   * capítulo elegido descarta lo encadenado y vuelve a empezar: el texto de
   * antes ya no tiene nada que ver con el que se va a leer.
   */
  useEffect(() => {
    const controlador = new AbortController();
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      setCargados([]);
      try {
        const versiculos = await getChapter({
          legacyPath: version,
          bookId: referencia.bookId,
          chapter: Number(referencia.capitulo),
          signal: controlador.signal,
        });
        if (!cancelado) setCargados([{ numero: String(referencia.capitulo), versiculos }]);
      } catch (fallo) {
        if (cancelado || fallo?.name === "AbortError") return;
        const testamento = referencia.bookId <= ULTIMO_LIBRO_AT ? t("AntiguoTestamento") : t("NuevoTestamento");
        setError(t("NoExisteVersiculoParte1") + testamento + t("NoExisteVersiculoParte2"));
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
      controlador.abort();
    };
  }, [version, referencia, t]);

  /** Capítulo que vendría después del último encadenado, o `null` si se acabó el libro. */
  const siguienteEncadenable = useMemo(() => {
    const ultimo = cargados[cargados.length - 1]?.numero;
    if (!ultimo) return null;
    const indice = capitulos.indexOf(ultimo);
    return indice >= 0 && indice < capitulos.length - 1 ? capitulos[indice + 1] : null;
  }, [cargados, capitulos]);

  /*
   * Encadenar el siguiente.
   *
   * `enVuelo` es una ref y no estado: solo evita pedir dos veces el mismo
   * capítulo, y como estado provocaría un render por cada cambio sin que nada
   * de lo que se ve dependa de él.
   */
  const enVuelo = useRef(null);

  /*
   * El ancla vigente, en una ref.
   *
   * La petición encadenada NO se cancela desde la limpieza del efecto. Ese
   * efecto depende de la página actual, así que su limpieza corre en CADA
   * cambio de hoja: cancelar ahí significaba que, si el usuario pasaba página
   * mientras venía el capítulo, la respuesta se tiraba a la basura y la marca
   * de "ya pedido" se quedaba puesta. El resultado era exactamente dos
   * capítulos y ni uno más, sin error por ningún lado.
   *
   * Lo que sí invalida una respuesta es que el usuario se haya ido a otra
   * versión, otro libro u otro capítulo. Eso es el ancla, y se consulta al
   * llegar la respuesta, no al desmontar el efecto.
   */
  const anclaRef = useRef(ancla);
  useEffect(() => {
    anclaRef.current = ancla;
  }, [ancla]);

  useEffect(() => {
    if (!siguienteEncadenable || cargando) return;

    const cerca = hoja.total > 0 && hoja.actual >= hoja.total - MARGEN_PRECARGA;
    if (!cerca) return;

    const marca = `${ancla}|${siguienteEncadenable}`;
    if (enVuelo.current === marca) return;
    enVuelo.current = marca;

    getChapter({ legacyPath: version, bookId: referencia.bookId, chapter: Number(siguienteEncadenable) })
      .then((versiculos) => {
        // El usuario pudo saltar a otro sitio mientras venía: entonces este
        // capítulo ya no va detrás de nada.
        if (anclaRef.current !== ancla) return;

        setCargados((previo) => (previo[previo.length - 1]?.numero === siguienteEncadenable ? previo : [...previo, { numero: siguienteEncadenable, versiculos }]));
      })
      .catch(() => {
        // Un capítulo que no se pudo traer no es un error de pantalla: el texto
        // que se está leyendo sigue ahí. Se suelta la marca para reintentar al
        // pasar otra hoja. En el caso bueno la marca NO se suelta: para cuando
        // llega la respuesta `siguienteEncadenable` ya avanzó, así que la marca
        // siguiente es otra y esta vieja solo sirve de tope contra un bucle.
        if (enVuelo.current === marca) enVuelo.current = null;
      });
  }, [siguienteEncadenable, hoja.total, hoja.actual, cargando, ancla, version, referencia.bookId]);

  const piezas = useMemo(() => capitulosAPiezas(cargados, mostrarStrong), [cargados, mostrarStrong]);

  /*
   * Si esta versión trae aparato crítico: Strong (`<sup>`), morfología (`<m>`)
   * o glosa (`<n>`).
   *
   * Se mira el TEXTO que llegó, no `CARACTERISTICAS_POR_BIBLIA`. Los metadatos
   * describen la versión entera, y el aparato no siempre está en todo el
   * volumen: hay ediciones que lo traen solo en el Nuevo Testamento. Mirando lo
   * que de verdad se está leyendo, el botón acierta también en esos libros. Es
   * lo mismo que hace `VerseSingle` para decidir si enseña la pestaña de glosa.
   *
   * `some` sobre `some` corta en cuanto encuentra uno, así que en una versión
   * con Strong se resuelve en el primer versículo del primer capítulo, no
   * recorriendo los veintiún capítulos encadenados.
   */
  const hayAparato = useMemo(
    () => cargados.some(({ versiculos }) => Object.values(versiculos).some((verso) => /<(sup|m|n)\b/i.test(verso))),
    [cargados]
  );

  // Al saltar a una versión sin aparato, el interruptor se apaga. Si se quedara
  // encendido a escondidas, volver a una que sí lo tiene la abriría con los
  // números puestos sin que nadie los haya pedido.
  useEffect(() => {
    if (!hayAparato) setMostrarStrong(false);
  }, [hayAparato]);

  const nombreLibro = libros[`book${referencia.bookId}`] ?? "";
  const tituloVersion = TITULO_POR_RUTA[version] ?? version;
  const idioma = idiomaDesdeRuta(version);

  // El capítulo que se muestra arriba es el que se está LEYENDO, que con el
  // encadenado no tiene por qué ser el que se eligió.
  const capituloVisible = hoja.capitulo || referencia.capitulo;

  const elegir = (valor) => {
    if (selector === "version") setVersion(valor);
    if (selector === "libro") setReferencia({ bookId: valor, capitulo: "1" });
    if (selector === "capitulo") setReferencia((previo) => ({ ...previo, capitulo: String(valor) }));
    setSelector(null);
  };

  // `useCallback` en ambas porque `Book3D` las tiene en dependencias de efectos:
  // una función nueva en cada render los dispararía en bucle.
  const alCambiarHoja = useCallback((estado) => setHoja(estado), []);
  const alRecibirControles = useCallback((pasar) => {
    pasarRef.current = pasar;
  }, []);

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-white dark:bg-[#0b0a09]">
      <header className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-black/10 bg-[#FDD07A] px-3 py-2 dark:border-white/10 dark:bg-[#20123A] dark:text-white">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label={t("Cerrar")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/15"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M15 19 8 12l7-7" />
          </svg>
        </button>

        <Boton onClick={() => setSelector("version")} titulo={tituloVersion}>
          <span className="block max-w-[34vw] truncate sm:max-w-xs">{tituloVersion}</span>
        </Boton>
        <Boton onClick={() => setSelector("libro")}>{nombreLibro}</Boton>
        <Boton onClick={() => setSelector("capitulo")}>{capituloVisible}</Boton>

        <div className="flex-1" />

        {hayAparato && (
          <Boton onClick={() => setMostrarStrong((previo) => !previo)} activo={mostrarStrong} titulo={t("Libro3D_Aparato")}>
            {"H/G"}
          </Boton>
        )}
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        {cargando && <p className="m-auto text-sm opacity-70 dark:text-white">{t("Cargando")}</p>}
        {!cargando && error && <p className="m-auto max-w-sm px-6 text-center text-sm opacity-80 dark:text-white">{error}</p>}
        {!cargando && !error && piezas.length > 0 && (
          <Book3D
            piezas={piezas}
            libro={nombreLibro}
            ancla={ancla}
            titulo={nombreLibro}
            version={tituloVersion}
            idioma={idioma}
            mostrarStrong={mostrarStrong}
            onCambioHoja={alCambiarHoja}
            onControles={alRecibirControles}
          />
        )}
      </main>

      {/* Pasar hoja se hace desde aquí, con botones de verdad.
          Antes eran dos franjas invisibles sobre los bordes de la escena: en
          escritorio se adivinaban por el cursor, pero en un móvil no hay cursor
          y la franja izquierda además cae justo donde se apoya el pulgar, así
          que retroceder era imposible de descubrir y difícil de acertar. */}
      <footer className="flex shrink-0 items-center justify-center gap-5 border-t border-black/10 bg-[#fbefda] px-3 py-2 dark:border-white/10 dark:bg-[#20123A] dark:text-white">
        <BotonBarra hacia="atras" etiqueta={t("Libro3D_HojaAnterior")} disabled={hoja.actual <= 0 && hoja.total === 0} onClick={() => pasarRef.current?.("atras")} />

        <span className="min-w-[11ch] text-center text-xs tabular-nums opacity-70">
          {hoja.total > 0 ? `${nombreLibro} ${capituloVisible} · ${hoja.actual + 1}/${hoja.total}` : ""}
        </span>

        <BotonBarra hacia="adelante" etiqueta={t("Libro3D_HojaSiguiente")} disabled={hoja.total === 0} onClick={() => pasarRef.current?.("adelante")} />
      </footer>

      <Selector3D
        modo={selector ?? "version"}
        abierto={Boolean(selector)}
        onCerrar={() => setSelector(null)}
        onElegir={elegir}
        actual={selector === "libro" ? referencia.bookId : capituloVisible}
        versionActual={version}
        libros={librosDisponibles}
        capitulos={capitulos}
      />
    </div>
  );
};

export default Bible3D;
