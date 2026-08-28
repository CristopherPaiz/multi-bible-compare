import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext";
import LanguageContext from "../context/LanguageContext";
import { getChapter } from "../services/bibleSource";
import { BIBLIAS } from "../data/biblias";
import { useBloquearScroll } from "../hooks/useBloquearScroll";
import { capitulosAPiezas } from "../components/book3d/prosa";
import { ULTIMO_LIBRO_AT, capitulosDe, capituloAnterior, capituloSiguiente, totalCapitulos } from "../data/canon";
import { aTextoPlano } from "../utils/textoPlano";
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
const CLAVE_ESCALA = "biblia3d_escala";

const VERSION_POR_DEFECTO = "034. Español - Biblia Reina Valera (1960)";

/**
 * A cuántas hojas del final se pide el capítulo siguiente.
 *
 * Ocho y no tres. En apaisado se ven dos hojas de golpe, así que ocho hojas son
 * cuatro vistas; y la fuente primaria es un backend en plan gratuito de Render,
 * que tarda entre treinta segundos y un minuto en despertar si llevaba rato
 * parado. Con margen corto, el lector se planta en la última hoja mirando el
 * hueco mientras la petición todavía va de camino.
 *
 * Pedir de más no cuesta: el capítulo se encadena detrás y, si el usuario no
 * llega, no ha molestado a nadie.
 */
const MARGEN_PRECARGA = 8;

/**
 * Cuántos capítulos puede llegar a tener la cadena.
 *
 * El encadenado no tenía tope: leyendo Salmos de corrido se acumulaban ciento
 * cincuenta capítulos en memoria, y como cada hoja lleva su copia del texto que
 * asoma en ella, el DOM crecía con ellos.
 *
 * Al llegar al tope la cadena no se corta a la brava: simplemente deja de
 * crecer, y pasar de la última hoja salta al capítulo siguiente por el mismo
 * camino que ya existe para cambiar de libro. Doce capítulos son más de lo que
 * se lee de una sentada, así que en la práctica el tope no se ve.
 */
const MAX_CAPITULOS_ENCADENADOS = 12;

/** Topes del ajuste manual del cuerpo de letra, en px sobre el tamaño automático. */
const ESCALA = { minimo: -3, maximo: 9, paso: 1 };

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

/**
 * Botón de la barra superior.
 *
 * Definido FUERA del componente. Dentro, cada render crearía un tipo de
 * componente nuevo y React desmontaría y volvería a montar los botones en cada
 * tecleo, perdiendo el foco y el estado del navegador.
 */
const Boton = ({ children, onClick, titulo, activo = false, clase = "" }) => (
  <button
    type="button"
    onClick={onClick}
    title={titulo}
    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
      activo ? "bg-[#a97109] text-white dark:bg-purple-500" : "bg-black/5 text-neutral-800 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-100 dark:hover:bg-white/20"
    } ${clase}`}
  >
    {children}
  </button>
);

Boton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func.isRequired,
  titulo: PropTypes.string,
  activo: PropTypes.bool,
  clase: PropTypes.string,
};

/** Botón de icono de la barra superior. */
const BotonIcono = ({ children, onClick, etiqueta, activo = false }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={etiqueta}
    title={etiqueta}
    aria-pressed={activo}
    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
      activo ? "bg-[#a97109] text-white dark:bg-purple-500" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
    }`}
  >
    {children}
  </button>
);

BotonIcono.propTypes = { children: PropTypes.node, onClick: PropTypes.func.isRequired, etiqueta: PropTypes.string, activo: PropTypes.bool };

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

  /*
   * Dónde está el lector y por dónde llegó.
   *
   * `entrada` viaja con la referencia y no aparte porque las dos cambian
   * siempre juntas y el libro necesita verlas a la vez: elegir un capítulo a
   * mano abre por la PORTADA, pero pasar de hoja al capítulo siguiente tiene
   * que caer en su primera hoja de texto, y retroceder al anterior en la
   * última. Separadas en dos props, el libro no sabría cuál de las dos llegó
   * primero.
   */
  const [referencia, setReferencia] = useState(() => {
    const guardada = leer(CLAVE_REFERENCIA, { bookId: 43, capitulo: "1" });
    return { bookId: guardada.bookId, capitulo: String(guardada.capitulo), entrada: "portada" };
  });

  const [selector, setSelector] = useState(null);
  const [mostrarStrong, setMostrarStrong] = useState(false);
  const [escala, setEscala] = useState(() => leer(CLAVE_ESCALA, 0));
  const [ajustes, setAjustes] = useState(false);
  const [copiado, setCopiado] = useState(false);

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
  const [encadenando, setEncadenando] = useState(false);
  const [error, setError] = useState(null);
  const [hoja, setHoja] = useState({ total: 0, actual: 0, capitulo: "", enPortada: true });

  // La función para pasar hoja vive dentro de `Book3D` (necesita su ref a la
  // librería). Se guarda aquí para que los botones y el teclado la puedan usar.
  const pasarRef = useRef(null);

  useBloquearScroll(true);

  useEffect(() => guardar(CLAVE_VERSION, version), [version]);
  useEffect(() => guardar(CLAVE_ESCALA, escala), [escala]);

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

  const idsDisponibles = useMemo(() => librosDisponibles.map(({ id }) => id), [librosDisponibles]);

  const capitulos = useMemo(() => capitulosDe(referencia.bookId), [referencia.bookId]);

  /** Referencia elegida por el usuario. Cambiarla descarta lo encadenado. */
  const ancla = `${version}|${referencia.bookId}|${referencia.capitulo}`;

  /** Lo que ve `Book3D`: adónde abrir y por qué lado entrar. */
  const destino = useMemo(() => ({ ancla, entrada: referencia.entrada }), [ancla, referencia.entrada]);

  // Al cambiar a una versión que no tiene el libro abierto, se salta al primero
  // que sí tenga en vez de dejar la pantalla en un error del que no se sale.
  useEffect(() => {
    if (librosDisponibles.some(({ id }) => id === referencia.bookId)) return;
    const primero = librosDisponibles[0];
    if (primero) setReferencia({ bookId: primero.id, capitulo: "1", entrada: "portada" });
  }, [librosDisponibles, referencia.bookId]);

  /*
   * Carga del capítulo de partida. Cualquier cambio de versión, libro o
   * capítulo elegido descarta lo encadenado y vuelve a empezar: el texto de
   * antes ya no tiene nada que ver con el que se va a leer.
   *
   * `entrada` NO está en las dependencias: dice por dónde abrir el libro, no
   * qué texto pedir, y meterla haría que volver de un capítulo al anterior
   * repitiera la petición.
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
  }, [version, referencia.bookId, referencia.capitulo, t]);

  /** El último capítulo de la cadena; de ahí sale todo lo que viene después. */
  const ultimoCargado = cargados[cargados.length - 1]?.numero ?? referencia.capitulo;

  /*
   * Adónde se sale por cada punta del libro.
   *
   * Hacia delante, desde el final de la CADENA: puede llevar varios capítulos
   * encadenados y lo que sigue es lo que va después del último, no del que se
   * eligió. Hacia atrás, desde el capítulo de partida, que es la primera hoja
   * de texto que existe.
   *
   * Ambos cruzan al libro contiguo cuando se acaba el actual: antes, llegar al
   * final de Juan era un callejón sin salida del que solo se salía abriendo el
   * selector.
   */
  const saltoSiguiente = useMemo(
    () => capituloSiguiente({ bookId: referencia.bookId, capitulo: ultimoCargado }, idsDisponibles),
    [referencia.bookId, ultimoCargado, idsDisponibles]
  );

  const saltoAnterior = useMemo(
    () => capituloAnterior({ bookId: referencia.bookId, capitulo: referencia.capitulo }, idsDisponibles),
    [referencia.bookId, referencia.capitulo, idsDisponibles]
  );

  /**
   * Capítulo que se puede encadenar detrás del último, o `null`.
   *
   * Solo DENTRO del mismo libro y hasta el tope de la cadena. Cruzar de libro
   * encadenando pondría el titulillo equivocado en las hojas del libro nuevo
   * —la cabecera es una sola para todo el volumen—, así que ese salto se hace
   * reanclando, que además reinicia la cadena y suelta la memoria.
   */
  const siguienteEncadenable = useMemo(() => {
    if (cargados.length >= MAX_CAPITULOS_ENCADENADOS) return null;
    const ultimo = cargados[cargados.length - 1]?.numero;
    if (!ultimo) return null;
    return Number(ultimo) < totalCapitulos(referencia.bookId) ? String(Number(ultimo) + 1) : null;
  }, [cargados, referencia.bookId]);

  /*
   * Encadenar el siguiente.
   *
   * `enVuelo` es una ref y no estado: solo evita pedir dos veces el mismo
   * capítulo, y como estado provocaría un render por cada cambio sin que nada
   * de lo que se ve dependa de él.
   */
  const enVuelo = useRef(null);

  /*
   * Espera tras un fallo, con la pausa creciendo a cada intento.
   *
   * Sin esto, una petición que falla suelta la marca y el siguiente giro de
   * hoja la vuelve a lanzar: con la red mal, pasar hojas adelante y atrás cerca
   * del final dispara una petición por giro contra un servidor que ya está
   * dando problemas.
   */
  const fallos = useRef({ marca: null, veces: 0, hasta: 0 });

  /** Petición encadenada en curso, para poder abortarla si el usuario se va. */
  const peticionCadena = useRef(null);

  /*
   * El ancla vigente, en una ref.
   *
   * La petición encadenada NO se cancela desde la limpieza de su propio efecto.
   * Ese efecto depende de la página actual, así que su limpieza corre en CADA
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

  // Irse a otra referencia sí aborta lo que venga de camino: ya no hace falta.
  useEffect(() => () => peticionCadena.current?.abort(), [ancla]);

  useEffect(() => {
    if (!siguienteEncadenable || cargando) return;

    const cerca = hoja.total > 0 && hoja.actual >= hoja.total - MARGEN_PRECARGA;
    if (!cerca) return;

    const marca = `${ancla}|${siguienteEncadenable}`;
    if (enVuelo.current === marca) return;
    if (fallos.current.marca === marca && Date.now() < fallos.current.hasta) return;

    enVuelo.current = marca;
    setEncadenando(true);

    const controlador = new AbortController();
    peticionCadena.current = controlador;

    getChapter({ legacyPath: version, bookId: referencia.bookId, chapter: Number(siguienteEncadenable), signal: controlador.signal })
      .then((versiculos) => {
        // El usuario pudo saltar a otro sitio mientras venía: entonces este
        // capítulo ya no va detrás de nada.
        if (anclaRef.current !== ancla) return;

        fallos.current = { marca: null, veces: 0, hasta: 0 };
        setCargados((previo) => (previo[previo.length - 1]?.numero === siguienteEncadenable ? previo : [...previo, { numero: siguienteEncadenable, versiculos }]));
      })
      .catch((fallo) => {
        if (fallo?.name === "AbortError") return;

        // Un capítulo que no se pudo traer no es un error de pantalla: el texto
        // que se está leyendo sigue ahí. Se suelta la marca para reintentar al
        // pasar otra hoja, pero no de inmediato. En el caso bueno la marca NO
        // se suelta: para cuando llega la respuesta `siguienteEncadenable` ya
        // avanzó, así que la marca siguiente es otra y esta vieja solo sirve de
        // tope contra un bucle.
        const veces = fallos.current.marca === marca ? fallos.current.veces + 1 : 1;
        fallos.current = { marca, veces, hasta: Date.now() + Math.min(30000, 2000 * 2 ** (veces - 1)) };
        if (enVuelo.current === marca) enVuelo.current = null;
      })
      .finally(() => {
        if (peticionCadena.current === controlador) peticionCadena.current = null;
        setEncadenando(false);
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
   * recorriendo los doce capítulos encadenados.
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

  /*
   * Se guarda el capítulo que se está LEYENDO, no el que se eligió.
   *
   * Con la cadena, alguien que abre Juan 1 y lee hasta Juan 9 tiene su sitio en
   * el 9. Guardando la referencia de partida, volver a entrar lo devolvía ocho
   * capítulos atrás.
   *
   * Se escribe directo a `localStorage` en vez de mover `referencia`: mover la
   * referencia cambiaría el ancla, y el ancla reinicia la cadena y devuelve el
   * libro a la portada en mitad de la lectura.
   */
  useEffect(() => {
    guardar(CLAVE_REFERENCIA, { bookId: referencia.bookId, capitulo: capituloVisible });
  }, [referencia.bookId, capituloVisible]);

  const elegir = (valor) => {
    if (selector === "version") setVersion(valor);
    if (selector === "libro") setReferencia({ bookId: valor, capitulo: "1", entrada: "portada" });
    if (selector === "capitulo") setReferencia((previo) => ({ ...previo, capitulo: String(valor), entrada: "portada" }));
    setSelector(null);
  };

  /*
   * Estable a propósito.
   *
   * `Selector3D` mete una entrada en el historial al abrirse, para que el gesto
   * "atrás" del móvil cierre el panel en vez de salirse del lector. Ese efecto
   * depende de esta función: como flecha en línea sería una función nueva en
   * cada render, el efecto se rearmaría sin parar y apilaría una entrada de
   * historial por render.
   */
  const cerrarSelector = useCallback(() => setSelector(null), []);

  // `useCallback` en las tres porque `Book3D` las tiene en dependencias de
  // efectos: una función nueva en cada render los dispararía en bucle.
  const alCambiarHoja = useCallback((estado) => setHoja(estado), []);

  const alRecibirControles = useCallback((pasar) => {
    pasarRef.current = pasar;
  }, []);

  /**
   * Se acabaron las hojas por un lado: se reancla en el capítulo contiguo.
   *
   * `entrada` es lo que hace que esto no se note como un salto: hacia delante
   * el libro abre en su primera hoja de texto y hacia atrás en la última, así
   * que la lectura continúa donde iba en vez de plantarse en la portada.
   */
  const alDesbordar = useCallback(
    (direccion) => {
      const salto = direccion === "adelante" ? saltoSiguiente : saltoAnterior;
      if (!salto) return;
      setReferencia({ ...salto, entrada: direccion === "adelante" ? "inicio" : "final" });
    },
    [saltoSiguiente, saltoAnterior]
  );

  const copiarCapitulo = useCallback(async () => {
    const capitulo = cargados.find(({ numero }) => numero === capituloVisible);
    if (!capitulo) return;

    const cuerpo = Object.keys(capitulo.versiculos)
      .sort((a, b) => Number(a) - Number(b))
      .map((verso) => `${verso} ${aTextoPlano(capitulo.versiculos[verso])}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(`${nombreLibro} ${capituloVisible} — ${tituloVersion}\n\n${cuerpo}`);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles (contexto no seguro, o el usuario lo negó)
      // no hay nada que hacer, y avisar de ello con un cartel rojo sobra.
    }
  }, [cargados, capituloVisible, nombreLibro, tituloVersion]);

  useEffect(() => {
    if (!copiado) return;
    const reloj = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(reloj);
  }, [copiado]);

  /*
   * Teclado.
   *
   * En escritorio, las flechas son lo primero que se prueba en algo que se
   * parece a un libro, y hasta ahora no hacían nada: la única forma de pasar
   * hoja con el ratón era acertarle a la esquina o darle al botón de la barra.
   *
   * Se llama a `pasarRef` y no a la librería directamente para que las flechas
   * hereden lo mismo que los botones, incluido el salto al capítulo siguiente
   * cuando se acaban las hojas.
   */
  useEffect(() => {
    if (selector) return;

    const alTeclear = (evento) => {
      if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey) return;

      // Si el foco está en un campo, las flechas son del campo.
      const foco = evento.target;
      if (foco instanceof HTMLElement && (foco.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName))) return;

      if (evento.key === "Escape") {
        navigate("/");
        return;
      }

      const hacia =
        evento.key === "ArrowLeft" || evento.key === "PageUp" ? "atras" : evento.key === "ArrowRight" || evento.key === "PageDown" || evento.key === " " ? "adelante" : null;

      if (!hacia) return;
      evento.preventDefault();
      pasarRef.current?.(hacia);
    };

    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [selector, navigate]);

  // El panel de tamaño de letra se cierra al tocar fuera, como cualquier menú.
  useEffect(() => {
    if (!ajustes) return;
    const alTocar = (evento) => {
      if (!evento.target.closest?.("[data-panel-ajustes]")) setAjustes(false);
    };
    document.addEventListener("pointerdown", alTocar);
    return () => document.removeEventListener("pointerdown", alTocar);
  }, [ajustes]);

  const puedeRetroceder = hoja.total > 0 && !(hoja.enPortada && !saltoAnterior);

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-white dark:bg-[#0b0a09]">
      <header className="flex shrink-0 items-center gap-1.5 border-b border-black/10 bg-[#FDD07A] px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-white/10 dark:bg-[#20123A] dark:text-white">
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

        {/* Antes esta barra era una tira con `overflow-x-auto`: en un móvil
            estrecho los botones se salían y había que descubrir, sin ninguna
            pista, que se podía arrastrar la barra de lado. Ahora el nombre de
            la versión es lo único elástico y se trunca; libro, capítulo y las
            herramientas tienen su sitio fijo y nada se sale. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Boton onClick={() => setSelector("version")} titulo={tituloVersion} clase="min-w-0 flex-1 !shrink">
            <span className="block truncate">{tituloVersion}</span>
          </Boton>
          <Boton onClick={() => setSelector("libro")} clase="max-w-[26vw]">
            <span className="block truncate">{nombreLibro}</span>
          </Boton>
          <Boton onClick={() => setSelector("capitulo")}>{capituloVisible}</Boton>
        </div>

        <div className="relative flex shrink-0 items-center gap-1" data-panel-ajustes>
          {hayAparato && (
            <Boton onClick={() => setMostrarStrong((previo) => !previo)} activo={mostrarStrong} titulo={t("Libro3D_Aparato")}>
              {"H/G"}
            </Boton>
          )}

          <BotonIcono onClick={copiarCapitulo} etiqueta={copiado ? t("Libro3D_Copiado") : t("Libro3D_Copiar")} activo={copiado}>
            {copiado ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="m20 6-11 11-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </BotonIcono>

          <BotonIcono onClick={() => setAjustes((previo) => !previo)} etiqueta={t("Libro3D_TamanoTexto")} activo={ajustes}>
            <span className="text-[13px] font-semibold leading-none">Aa</span>
          </BotonIcono>

          {ajustes && (
            <div
              role="group"
              aria-label={t("Libro3D_TamanoTexto")}
              className="absolute right-0 top-full z-10 mt-2 flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => setEscala((previo) => Math.max(ESCALA.minimo, previo - ESCALA.paso))}
                disabled={escala <= ESCALA.minimo}
                aria-label={t("Libro3D_TextoMenor")}
                className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 text-sm transition-colors hover:bg-black/10 disabled:opacity-30 dark:bg-white/10 dark:hover:bg-white/20"
              >
                A−
              </button>
              <span className="min-w-[3ch] text-center text-xs tabular-nums opacity-70">{escala > 0 ? `+${escala}` : escala}</span>
              <button
                type="button"
                onClick={() => setEscala((previo) => Math.min(ESCALA.maximo, previo + ESCALA.paso))}
                disabled={escala >= ESCALA.maximo}
                aria-label={t("Libro3D_TextoMayor")}
                className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 text-base transition-colors hover:bg-black/10 disabled:opacity-30 dark:bg-white/10 dark:hover:bg-white/20"
              >
                A+
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        {cargando && <p className="m-auto text-sm opacity-70 dark:text-white">{t("Cargando")}</p>}
        {!cargando && error && <p className="m-auto max-w-sm px-6 text-center text-sm opacity-80 dark:text-white">{error}</p>}
        {!cargando && !error && piezas.length > 0 && (
          <Book3D
            piezas={piezas}
            libro={nombreLibro}
            destino={destino}
            titulo={nombreLibro}
            version={tituloVersion}
            idioma={idioma}
            mostrarStrong={mostrarStrong}
            escalaTexto={escala}
            haySiguiente={Boolean(saltoSiguiente)}
            hayAnterior={Boolean(saltoAnterior)}
            onCambioHoja={alCambiarHoja}
            onControles={alRecibirControles}
            onDesbordar={alDesbordar}
          />
        )}
      </main>

      {/* Pasar hoja se hace desde aquí, con botones de verdad.
          Antes eran dos franjas invisibles sobre los bordes de la escena: en
          escritorio se adivinaban por el cursor, pero en un móvil no hay cursor
          y la franja izquierda además cae justo donde se apoya el pulgar, así
          que retroceder era imposible de descubrir y difícil de acertar.

          El relleno de abajo respeta `safe-area-inset-bottom`: sin él, en un
          iPhone los dos botones caen debajo de la barra de gestos. */}
      <footer className="flex shrink-0 items-center justify-center gap-5 border-t border-black/10 bg-[#fbefda] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#20123A] dark:text-white">
        <BotonBarra hacia="atras" etiqueta={t("Libro3D_HojaAnterior")} disabled={!puedeRetroceder} onClick={() => pasarRef.current?.("atras")} />

        <span className="flex min-w-[13ch] items-center justify-center gap-1.5 text-center text-xs tabular-nums opacity-70">
          {hoja.total > 0 ? `${nombreLibro} ${capituloVisible} · ${hoja.actual + 1}/${hoja.total}` : ""}
          {/* Mientras viene el capítulo siguiente, el total de hojas está a
              punto de crecer. Sin este aviso, el salto de "12/12" a "12/31"
              parece un fallo de cuentas. */}
          {encadenando && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />}
        </span>

        <BotonBarra hacia="adelante" etiqueta={t("Libro3D_HojaSiguiente")} disabled={hoja.total === 0} onClick={() => pasarRef.current?.("adelante")} />
      </footer>

      <Selector3D
        modo={selector ?? "version"}
        abierto={Boolean(selector)}
        onCerrar={cerrarSelector}
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
