import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import PropTypes from "prop-types";
import HTMLFlipBook from "react-pageflip";
import { usePaginator } from "./usePaginator";
import "../../styles/Book3D.css";
import "../../styles/BibleMarkup.css";

/**
 * El libro.
 *
 * Reparto de responsabilidades:
 *
 *   `react-pageflip`  el giro: curvatura, sombra que sigue al dedo, arrastre
 *                     desde la esquina, orientación apaisada/retrato.
 *   `usePaginator`    dónde corta cada hoja.
 *   este archivo      el tamaño del libro y el armado de las hojas.
 *   `Book3D.css`      que parezca papel.
 */

/**
 * Proporción de una hoja (alto ÷ ancho).
 *
 * Apaisado usa 1.45, el formato de un libro de bolsillo. En retrato la hoja se
 * estira a 1.62: una pantalla de móvil es mucho más alta que ancha y con 1.45
 * el libro flotaba en medio dejando un palmo de fondo muerto arriba y abajo.
 * 1.62 sigue siendo una proporción de libro real (las biblias de bolsillo son
 * justo así de esbeltas), no una hoja deformada para rellenar.
 */
const PROPORCION = { apaisado: 1.45, retrato: 1.62 };

/** Por debajo de este ancho por hoja no se abre a doble página. */
const ANCHO_MINIMO_HOJA = 330;

const ANCHO_MAXIMO_HOJA = 470;

/**
 * Márgenes de la caja de texto, en fracción del tamaño de la hoja.
 *
 * El margen del lomo es mayor que el exterior porque ahí el papel se curva
 * hacia dentro: con márgenes iguales, el texto pegado a la costura se ve
 * comido. Es la misma asimetría que usa cualquier libro impreso.
 */
const MARGEN = { exterior: 0.1, lomo: 0.132, vertical: 0.072 };

/**
 * Duración del giro, en ms. La corta es para `prefers-reduced-motion`.
 *
 * 420 y no 520: es el único número que separa "pasar hoja" de "esperar a que
 * pase la hoja". Sigue siendo un giro con cuerpo —por debajo de ~300 el papel
 * deja de leerse como papel— pero encadenar varias ya no se hace largo.
 */
const GIRO = { normal: 420, reducido: 120 };

/**
 * Cuántos giros se guardan si el lector va más deprisa que la animación.
 *
 * `page-flip` IGNORA `flipNext()` mientras hay un giro en marcha: no encola ni
 * avisa, simplemente no pasa nada. Pulsando cinco veces seguidas se pasaba una
 * hoja, y eso es justo lo que se siente como que el libro va lento — no lo está,
 * es que se están tirando las pulsaciones.
 *
 * El tope es bajo a propósito: guardar veinte convertiría un manotazo en medio
 * minuto de animación de la que ya no se puede salir.
 */
const MAX_GIROS_EN_COLA = 3;

/** Objeto estable: `HTMLFlipBook` está memoizado y un literal nuevo por render lo invalidaría. */
const SIN_ESTILO = {};

/**
 * Cuántas hojas a cada lado de la actual llevan su texto puesto.
 *
 * Cuatro cubre de sobra lo que se puede llegar a ver: en apaisado se ven dos
 * hojas y durante el giro asoma la siguiente, y el arrastre desde la esquina no
 * alcanza más allá de la contigua. El resto son hojas vacías con su titulillo y
 * su folio.
 */
const RADIO_VENTANA = 4;

/**
 * Qué hojas tienen que materializar su texto.
 *
 * ---------------------------------------------------------------------------
 * Por qué esto no puede ser una prop normal
 * ---------------------------------------------------------------------------
 * `page-flip` SACA los hijos del div que React le dio y los mete en su propio
 * `.stf__block`, y su `updateItems` hace `innerHTML = ""` sobre ese bloque. Por
 * eso la lista de páginas está memoizada: en cuanto la librería ve una lista
 * nueva llama a `updateItems` y la siguiente reconciliación de React revienta
 * con `NotFoundError`.
 *
 * O sea que no se puede pasar "qué hoja es la actual" hacia abajo: cambiar una
 * prop de las hojas cambia la lista. La salida es que cada hoja se SUSCRIBA a
 * este almacén: la lista de elementos no se toca nunca, y `useSyncExternalStore`
 * solo re-renderiza aquellas cuyo booleano cambió —dos o tres por giro, no las
 * ochenta.
 *
 * ---------------------------------------------------------------------------
 * Por qué hace falta
 * ---------------------------------------------------------------------------
 * Cada hoja lleva `dangerouslySetInnerHTML` con el capítulo entero que asoma en
 * ella, recortado por `overflow`. Con doce capítulos encadenados eso son unas
 * ochenta hojas, cada una con su copia completa de un capítulo: decenas de
 * miles de nodos. `page-flip` esconde las que no se ven con `display: none`, así
 * que no cuestan pintado —pero sí cuestan construirlas, y el libro se reconstruye
 * entero cada vez que se encadena un capítulo. Justo mientras se pasa hoja.
 */
const crearVentana = () => {
  let rango = { desde: -1, hasta: -1 };
  const oyentes = new Set();

  return {
    fijar(desde, hasta) {
      if (desde === rango.desde && hasta === rango.hasta) return;
      rango = { desde, hasta };
      for (const oyente of oyentes) oyente();
    },
    contiene: (indice) => indice >= rango.desde && indice <= rango.hasta,
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };
};

const calcularDimensiones = (anchoLibre, altoLibre) => {
  const cabenDos = anchoLibre >= ANCHO_MINIMO_HOJA * 2;
  const proporcion = cabenDos ? PROPORCION.apaisado : PROPORCION.retrato;

  let ancho = Math.min(cabenDos ? anchoLibre / 2 : anchoLibre, ANCHO_MAXIMO_HOJA);
  let alto = ancho * proporcion;

  // Si el libro no cabe de alto manda el alto y se recalcula el ancho, no al
  // revés: un libro más ancho que alto deja de parecer un libro.
  if (alto > altoLibre) {
    alto = altoLibre;
    ancho = alto / proporcion;
  }

  return { ancho: Math.floor(ancho), alto: Math.floor(alto), cabenDos };
};

/** Estilo de la caja de texto de una hoja, según de qué lado del pliegue cae. */
const estiloContenido = (caja, izquierda) => ({
  paddingTop: caja.padVertical,
  paddingBottom: caja.padVertical,
  paddingLeft: izquierda ? caja.padExterior : caja.padLomo,
  paddingRight: izquierda ? caja.padLomo : caja.padExterior,
  fontSize: caja.cuerpo,
  lineHeight: 1.62,
});

/** `true` si el usuario pidió al sistema que se reduzca la animación. */
const useMovimientoReducido = () => {
  const [reducido, setReducido] = useState(() => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));

  useEffect(() => {
    const consulta = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!consulta) return;

    const alCambiar = (evento) => setReducido(evento.matches);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return reducido;
};

/**
 * Una hoja.
 *
 * `forwardRef` no es opcional: `react-pageflip` hace `cloneElement` sobre cada
 * hijo para inyectarle una `ref` y quedarse con el nodo real del DOM. Un
 * componente de función sin `forwardRef` se traga esa ref, la librería recibe
 * una lista vacía de hojas y el libro se queda en blanco sin dar ningún error.
 */
const Hoja = forwardRef(function Hoja(
  { html, desplazamiento, altura, folio, libro, capitulo, caja, izquierda, mostrarStrong, idioma, ventana, indice },
  ref
) {
  /*
   * El texto solo se materializa si la hoja está cerca de la que se está
   * mirando. La suscripción devuelve un booleano, así que React descarta el
   * re-render de las hojas cuya respuesta no cambió: un giro re-renderiza dos o
   * tres, no la ochenta.
   *
   * El armazón (titulillo, recorte con su alto, folio) se pinta siempre: es lo
   * que hace que la hoja vacía mida y pese lo mismo que la llena, y que al
   * entrar en la ventana el texto aparezca sin mover nada.
   */
  const visible = useSyncExternalStore(ventana.suscribir, () => ventana.contiene(indice));

  return (
    <div className={`hoja ${izquierda ? "hoja--izq" : "hoja--der"}`} ref={ref} data-density="soft">
      <div className="hoja__contenido" style={estiloContenido(caja, izquierda)}>
        <div className="hoja__titulillo">
          <span>{libro}</span>
          <span>{capitulo}</span>
        </div>
        <div className="hoja__ventana">
          <div className="hoja__recorte" style={{ height: altura }}>
            {visible && (
              <div
                lang={idioma}
                className={`hoja__flujo texto-biblico ${mostrarStrong ? "" : "hoja__flujo--limpio"}`}
                style={{ marginTop: -desplazamiento }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </div>
        <div className="hoja__folio">{folio}</div>
      </div>
    </div>
  );
});

Hoja.propTypes = {
  html: PropTypes.string.isRequired,
  desplazamiento: PropTypes.number.isRequired,
  altura: PropTypes.number.isRequired,
  folio: PropTypes.number.isRequired,
  libro: PropTypes.string,
  capitulo: PropTypes.string,
  caja: PropTypes.object.isRequired,
  izquierda: PropTypes.bool,
  mostrarStrong: PropTypes.bool,
  idioma: PropTypes.string,
  /** Almacén de qué hojas materializan su texto. Estable durante toda la vida del libro. */
  ventana: PropTypes.object.isRequired,
  indice: PropTypes.number.isRequired,
};

/** Tapa. Se marca `hard` para que gire rígida y ocupe una página entera. */
const Tapa = forwardRef(function Tapa({ titulo, version }, ref) {
  return (
    <div className="hoja" ref={ref} data-density="hard">
      <div className="portada">
        <div className="portada__filete" />
        <h1 className="portada__titulo">{titulo}</h1>
        <div className="portada__adorno" />
        <p className="portada__version">{version}</p>
      </div>
    </div>
  );
});

Tapa.propTypes = { titulo: PropTypes.string, version: PropTypes.string };

/**
 * Hoja de cortesía: la página lisa que hay entre la tapa y el texto.
 *
 * Existe por una razón mecánica, no decorativa, y SOLO en apaisado. Con la tapa
 * contada como página suelta los pares son [tapa], [1,2], [3,4]...; sin esta
 * hoja, la primera de texto caería en el lado IZQUIERDO del primer par y el
 * libro abriría con la mano derecha vacía.
 *
 * En retrato no hay pares que cuadrar: se ve una página cada vez. Ahí la hoja
 * de cortesía no arregla nada y es un toque de más entre la tapa y el texto,
 * así que no se pone.
 *
 * Es papel liso a propósito. Antes llevaba un jaspeado de guarda y quedaba como
 * un manchón de color en medio de una lectura sobria; en blanco pasa
 * desapercibida, que es lo que hace una hoja de cortesía de verdad.
 */
const Cortesia = forwardRef(function Cortesia(_props, ref) {
  return (
    <div className="hoja hoja--der" ref={ref} data-density="soft">
      <div className="hoja__contenido" />
    </div>
  );
});

/**
 * Envoltorio de `HTMLFlipBook` que se limpia al desmontarse.
 *
 * `react-pageflip` crea su instancia de `PageFlip` y no la destruye nunca: no
 * registra ningún efecto de limpieza. Cada instancia deja puesto un listener de
 * `resize` en `window`. Como aquí el libro se reconstruye al encadenar capítulo
 * o al cambiar de tamaño, sin esto se irían acumulando.
 */
const Libro = forwardRef(function Libro({ children, ...props }, ref) {
  const propia = useRef(null);

  useEffect(
    () => () => {
      try {
        propia.current?.pageFlip?.()?.destroy?.();
      } catch {
        // Destruir dos veces, o antes de que llegara a inicializarse, no es un
        // error que deba tumbar el desmontaje.
      }
    },
    []
  );

  return (
    <HTMLFlipBook
      {...props}
      ref={(nodo) => {
        propia.current = nodo;
        if (typeof ref === "function") ref(nodo);
        else if (ref) ref.current = nodo;
      }}
    >
      {children}
    </HTMLFlipBook>
  );
});

Libro.propTypes = { children: PropTypes.node };

const Book3D = ({
  piezas = [],
  libro,
  destino,
  titulo,
  version,
  idioma = "es",
  mostrarStrong = false,
  escalaTexto = 0,
  haySiguiente = false,
  hayAnterior = false,
  onCambioHoja,
  onControles,
  onDesbordar,
}) => {
  const escenaRef = useRef(null);
  const ventanaRef = useRef(null);
  const flipRef = useRef(null);

  /** Giros pedidos mientras el libro estaba girando. Positivo = adelante. */
  const cola = useRef(0);

  const [libre, setLibre] = useState({ ancho: 0, alto: 0 });
  const [ventana, setVentana] = useState({ ancho: 0, alto: 0 });

  /*
   * Página de la librería (tapa incluida). Sirve para colocar el canto y la
   * sombra, y para volver al mismo sitio cuando el libro se reconstruye al
   * encadenar el capítulo siguiente.
   *
   * Además del número admite dos avisos, `"inicio"` y `"final"`, que se
   * resuelven más abajo. Al saltar al capítulo siguiente hay que caer en la
   * PRIMERA hoja de texto y al retroceder al anterior en la ÚLTIMA, y ninguna
   * de las dos se sabe aquí: dependen de una paginación que todavía no existe
   * en el momento de pedir el salto.
   */
  const [pagina, setPagina] = useState(0);

  const movimientoReducido = useMovimientoReducido();

  /** Estable durante toda la vida del componente: las hojas se suscriben a ella. */
  const ventanaHojas = useMemo(crearVentana, []);

  const { ancho, alto, cabenDos } = useMemo(() => calcularDimensiones(libre.ancho, libre.alto), [libre]);

  const caja = useMemo(
    () => ({
      padExterior: Math.round(ancho * MARGEN.exterior),
      padLomo: Math.round(ancho * MARGEN.lomo),
      padVertical: Math.round(alto * MARGEN.vertical),
      // El cuerpo de letra sigue al ancho de la hoja para que la medida de
      // línea se mantenga en torno a los 60-70 caracteres, que es donde el ojo
      // deja de perder el renglón. Los topes evitan que en pantallas muy
      // grandes o muy chicas se vaya a un extremo ilegible; `escalaTexto` es el
      // ajuste manual del lector, que puede empujar más allá del tope de
      // arriba porque quien lo sube sabe lo que quiere.
      cuerpo: Math.max(13, Math.min(30, Math.round(ancho * 0.043) + escalaTexto)),
    }),
    [ancho, alto, escalaTexto]
  );

  // El área disponible se mide con ResizeObserver y no con `window.innerHeight`
  // porque encima hay una barra de navegación y debajo una de controles: lo que
  // importa es el hueco que queda entre ambas, no la pantalla entera.
  useLayoutEffect(() => {
    const nodo = escenaRef.current;
    if (!nodo) return;

    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setLibre({ ancho: width, alto: height });
    });

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  /*
   * La caja de texto se MIDE, no se calcula.
   *
   * Restarle a mano al alto de la hoja los márgenes, el titulillo y el folio
   * daría un número que hay que mantener a mano cada vez que cambie un
   * `font-size` o un `padding` del CSS, y cuando se desincroniza el síntoma es
   * texto cortado en el borde de la hoja. La sonda es una hoja real, oculta:
   * su `.hoja__ventana` ya trae el alto que sobra después de todo lo demás.
   *
   * Depende del nombre del libro porque el titulillo es lo único de la hoja
   * cuyo alto puede cambiar solo: "Primera de Corintios" en una hoja estrecha
   * se parte en dos renglones y le come una línea a la caja de texto.
   */
  useLayoutEffect(() => {
    const nodo = ventanaRef.current;
    if (!nodo || !ancho || !alto) return;

    const { width, height } = nodo.getBoundingClientRect();
    setVentana((previo) => (previo.ancho === width && previo.alto === height ? previo : { ancho: width, alto: height }));
  }, [ancho, alto, caja, libro]);

  /** Todo lo que cambia CÓMO se maqueta el texto, y por tanto invalida lo medido. */
  const firmaMaqueta = `${caja.cuerpo}|${mostrarStrong}|${idioma}`;

  const { cortes, altoContenido, marcas, medidorRef, listo: paginado } = usePaginator(piezas, ventana.ancho, ventana.alto, firmaMaqueta);

  const hojas = useMemo(() => {
    if (!paginado || !ancho || !marcas.length) return [];

    /*
     * Qué piezas necesita cada hoja, memoizado por tramo.
     *
     * Hojas seguidas casi siempre necesitan el mismo tramo de capítulos, y
     * pegar las piezas es copiar cadenas de varios KB. Sin esto, repaginar un
     * capítulo encadenado rehace ochenta concatenaciones para producir dos o
     * tres cadenas distintas.
     */
    const tramos = new Map();
    const tramo = (desde, hasta) => {
      const llave = `${desde}-${hasta}`;
      let texto = tramos.get(llave);
      if (texto === undefined) {
        texto = piezas.slice(desde, hasta + 1).join("");
        tramos.set(llave, texto);
      }
      return texto;
    };

    /*
     * Un solo recorrido, hoja por hoja, arrastrando en qué capítulo vamos.
     *
     * `marcas` trae el `top` de cada capítulo dentro del flujo completo, en
     * orden. Como las hojas también van en orden, basta con ir empujando el
     * índice hacia delante: nunca retrocede.
     *
     * Esa monotonía no es un ahorro, es lo que da la garantía. Buscando el
     * capítulo de cada hoja por separado, cualquier medida a medio hacer podía
     * devolver la lista de marcas corta y la hoja se anunciaba como del
     * capítulo 1 estando en el 13. Empujando un índice, la cabecera solo puede
     * quedarse quieta o avanzar.
     */
    let actual = 0;

    return cortes.map((desplazamiento, indice) => {
      // Cada hoja recorta justo hasta donde empieza la siguiente. La última no
      // tiene siguiente, así que llega hasta el final del texto maquetado.
      const altura = (cortes[indice + 1] ?? altoContenido) - desplazamiento;

      // El margen de 1px es porque el corte cae en el PIE del renglón anterior
      // y la marca en el TECHO del siguiente: entre ambos hay redondeo
      // subpíxel, y sin holgura el titulillo se queda un renglón atrás justo en
      // la hoja donde empieza el capítulo.
      while (actual + 1 < marcas.length && marcas[actual + 1].top <= desplazamiento + 1) actual += 1;

      // Hasta qué pieza asoma en esta hoja.
      let ultima = actual;
      while (ultima + 1 < marcas.length && marcas[ultima + 1].top < desplazamiento + altura) ultima += 1;

      return {
        html: tramo(actual, ultima),
        // Los cortes se midieron sobre el flujo completo, así que son
        // distancias desde el principio de TODO. La hoja solo pinta su tramo,
        // que empieza en `marcas[actual].top`: hay que rebajarlo.
        desplazamiento: desplazamiento - marcas[actual].top,
        folio: indice + 1,
        altura,
        capitulo: marcas[actual].capitulo,
      };
    });
  }, [cortes, altoContenido, marcas, piezas, ancho, paginado]);

  /*
   * Con `showCover`, la primera página va sola y la ÚLTIMA también, pero solo
   * si le toca quedarse sin pareja. El reparto es [tapa], [1,2], [3,4]..., o
   * sea que la contratapa cae sola cuando el total es impar. Total = tapa +
   * cortesía + hojas + contratapa = hojas + 3, impar cuando las hojas son
   * pares. Si son impares se añade una en blanco, como haría una imprenta.
   *
   * En retrato no hay pares, así que tampoco hay nada que cuadrar.
   */
  const hojasConRelleno = useMemo(() => (cabenDos && hojas.length % 2 === 1 ? [...hojas, null] : hojas), [hojas, cabenDos]);

  /*
   * Cuántas páginas de la librería van ANTES de la primera hoja de texto: la
   * tapa siempre, y la cortesía solo en apaisado. Se usa para traducir entre el
   * índice de la librería y el número de hoja que ve el usuario.
   */
  const preliminares = cabenDos ? 2 : 1;
  const totalPaginas = hojasConRelleno.length + preliminares + 1;

  /*
   * El aviso convertido en número, ahora que ya se sabe cuántas hojas hay.
   *
   * Se resuelve aquí y no en el efecto que lo pidió porque `startPage` solo se
   * lee al MONTAR la librería, y ese montaje ocurre —con la `key` de `firma`—
   * en el mismo render en que aparece la paginación nueva. Guardado como aviso,
   * el número correcto está listo justo a tiempo; calculado antes, habría sido
   * siempre el del capítulo anterior.
   */
  const paginaResuelta =
    pagina === "inicio" ? preliminares : pagina === "final" ? Math.max(preliminares, preliminares + hojas.length - 1) : pagina;

  const paginaActual = Math.max(0, Math.min(paginaResuelta, Math.max(0, totalPaginas - 1)));

  const paginas = useMemo(
    () => [
      <Tapa key="tapa" titulo={titulo} version={version} />,
      ...(cabenDos ? [<Cortesia key="cortesia" />] : []),
      ...hojasConRelleno.map((hoja, indice) =>
        hoja === null ? (
          <Cortesia key={`blanco-${indice}`} />
        ) : (
          <Hoja
            key={`hoja-${indice}`}
            html={hoja.html}
            desplazamiento={hoja.desplazamiento}
            altura={hoja.altura}
            folio={hoja.folio}
            libro={libro}
            capitulo={hoja.capitulo}
            caja={caja}
            // Con la tapa suelta al principio los pares son [1,2], [3,4]..., o
            // sea que el índice IMPAR de la librería cae a la izquierda del
            // pliegue. En retrato no hay pliegue que valga: se ve una página
            // sola, cosida por la izquierda, así que todas van como derechas.
            izquierda={cabenDos && (indice + preliminares) % 2 === 1}
            mostrarStrong={mostrarStrong}
            idioma={idioma}
            ventana={ventanaHojas}
            indice={indice}
          />
        )
      ),
      <Tapa key="contratapa" titulo={titulo} version={version} />,
    ],
    [hojasConRelleno, libro, caja, titulo, version, idioma, mostrarStrong, cabenDos, preliminares, ventanaHojas]
  );

  /*
   * La ventana sigue a la página actual.
   *
   * `useLayoutEffect` y no `useEffect`: si se ajustara después de pintar, el
   * primer fotograma tras remontar el libro saldría con las hojas vacías y el
   * texto entraría de golpe justo después. Aquí se coloca antes de que se vea
   * nada.
   */
  useLayoutEffect(() => {
    const centro = paginaActual - preliminares;
    ventanaHojas.fijar(centro - RADIO_VENTANA, centro + RADIO_VENTANA);
  }, [ventanaHojas, paginaActual, preliminares]);

  /*
   * Dónde abrir cuando el usuario cambia de sitio a propósito.
   *
   * `destino.ancla` es la referencia elegida (versión, libro, capítulo de
   * partida); `destino.entrada` dice por dónde se llega. Al encadenar el
   * capítulo siguiente el texto crece y el libro se remonta, pero el ancla no
   * se mueve y la página guardada sigue valiendo, porque el texto nuevo se
   * añade DETRÁS sin desplazar un solo renglón del anterior.
   *
   * Las dos van juntas en un objeto memoizado, y no como dos props, para que
   * este efecto pueda depender de ambas sin dispararse de más: `entrada` nunca
   * cambia sin que cambie el ancla.
   */
  useEffect(() => {
    setPagina(destino?.entrada === "inicio" ? "inicio" : destino?.entrada === "final" ? "final" : 0);
  }, [destino]);

  /*
   * Pasar hoja, y qué hacer cuando ya no quedan.
   *
   * Al llegar al final del texto encadenado, seguir adelante NO es quedarse
   * mirando la contratapa: es el capítulo (o el libro) siguiente. Igual hacia
   * atrás desde la portada. Solo se avisa si hay adónde ir; si no, se deja que
   * la librería enseñe la tapa, que ahí sí es el final de verdad.
   */
  const pasar = useCallback(
    (direccion) => {
      const control = flipRef.current?.pageFlip?.();
      if (!control) return;

      /*
       * Girando: se apunta la intención y se atiende al terminar.
       *
       * Los sentidos opuestos se restan, que es lo que uno espera: adelante y
       * atrás seguidos dejan el libro donde estaba en vez de encolar dos giros.
       */
      if (control.getState?.() !== "read") {
        const paso = direccion === "adelante" ? 1 : -1;
        cola.current = Math.max(-MAX_GIROS_EN_COLA, Math.min(MAX_GIROS_EN_COLA, cola.current + paso));
        return;
      }

      if (direccion === "adelante") {
        const enUltimaHoja = paginaActual >= preliminares + hojas.length - 1;
        if (enUltimaHoja && haySiguiente) {
          onDesbordar?.("adelante");
          return;
        }
        control.flipNext();
        return;
      }

      if (paginaActual <= 0 && hayAnterior) {
        onDesbordar?.("atras");
        return;
      }
      control.flipPrev();
    },
    [paginaActual, preliminares, hojas.length, haySiguiente, hayAnterior, onDesbordar]
  );

  useEffect(() => {
    onControles?.(pasar);
  }, [onControles, pasar]);

  /*
   * El `pasar` de AHORA, para el giro encolado.
   *
   * El de la clausura de `alTerminarGiro` lleva dentro el `paginaActual` que
   * había cuando empezó el giro, o sea uno atrasado. Con él, el último giro de
   * la cola al final del texto comparaba contra la hoja equivocada y se quedaba
   * mirando la contratapa en vez de saltar al capítulo siguiente.
   */
  const pasarActual = useRef(pasar);
  pasarActual.current = pasar;

  /*
   * Se vacía la cola al terminar cada giro.
   *
   * Se drena de uno en uno y volviendo a pasar por `pasar` —en vez de saltar
   * directo con `turnToPage`— para que los giros encolados hereden lo mismo que
   * los normales: al llegar a la última hoja, el último de la cola salta al
   * capítulo siguiente en vez de estrellarse contra la contratapa.
   *
   * El `requestAnimationFrame` es porque `onFlip` se emite en el mismo tick en
   * que la librería vuelve a `read`: encadenar ahí mismo puede colarse antes de
   * que termine de asentar su estado. De paso, para entonces React ya aplicó el
   * `setPagina` y `pasarActual` apunta al `pasar` correcto.
   *
   * Estable (`[]`): es la `onFlip` de la librería, y una función nueva por
   * render la haría re-renderizar en cada giro sin necesidad.
   */
  const alTerminarGiro = useCallback((evento) => {
    setPagina(evento.data);
    if (cola.current === 0) return;

    const direccion = cola.current > 0 ? "adelante" : "atras";
    cola.current -= cola.current > 0 ? 1 : -1;
    requestAnimationFrame(() => pasarActual.current(direccion));
  }, []);


  // Se avisa del estado en cada cambio de página Y cada vez que se repagina:
  // el total cambia al encadenar capítulo, y la barra de abajo lo muestra.
  useEffect(() => {
    if (!hojas.length) return;
    const indice = Math.max(0, Math.min(hojas.length - 1, paginaActual - preliminares));
    onCambioHoja?.({ total: hojas.length, actual: indice, capitulo: hojas[indice]?.capitulo ?? "", enPortada: paginaActual <= 0 });
  }, [hojas, paginaActual, preliminares, onCambioHoja]);

  const anchoBloque = cabenDos ? ancho * 2 : ancho;
  const listo = Boolean(piezas.length && ancho && ventana.alto && paginado && hojas.length);

  /*
   * Firma del contenido del libro. Todo lo que define las hojas queda resumido
   * aquí, y `cortes` resume la paginación entera.
   *
   * Sirve para dos cosas a la vez, y las dos son obligatorias:
   *
   * 1. Es la `key` del libro. `react-pageflip` construye su `PageFlip` UNA sola
   *    vez y luego ignora los cambios de `width`/`height`; remontarlo es la
   *    única forma de reconfigurarlo.
   *
   * 2. Es lo que mantiene ESTABLE la lista de hijos. `page-flip` SACA los hijos
   *    del div que React le dio y los mete en su propio `.stf__block`, y su
   *    `updateItems` hace `innerHTML = ""` sobre ese bloque. A partir de ahí
   *    React tiene fibras apuntando a nodos que ya no cuelgan de donde cree, y
   *    la siguiente reconciliación revienta con `NotFoundError: The node to be
   *    removed is not a child of this node`, tumbando la pantalla entera. Con
   *    los hijos memoizados, `react-pageflip` no ve nunca una lista nueva y no
   *    llama a `updateItems`; cuando el contenido cambia de verdad cambia la
   *    firma y el libro se remonta limpio.
   */
  const firma = [ancho, alto, cabenDos, libro, version, firmaMaqueta, piezas.length, cortes.length, cortes[cortes.length - 1] ?? 0].join("|");

  // Cambiar de capítulo o de tamaño remonta el libro; una cola de giros de la
  // maqueta anterior ya no significa nada. Va DESPUÉS de `firma`: declarada más
  // arriba, el efecto la leía dentro de su zona muerta temporal y reventaba con
  // un ReferenceError en cada render.
  useEffect(() => {
    cola.current = 0;
  }, [firma]);

  /*
   * Dónde está el cuerpo del libro dentro del bloque.
   *
   * En apaisado el bloque mide dos hojas, pero el libro no siempre las ocupa:
   * con la tapa cerrada se apoya en la mitad DERECHA y con la contratapa en la
   * IZQUIERDA. El canto y la sombra van pegados a ese cuerpo, así que
   * dibujados siempre sobre el bloque entero quedarían flotando en el vacío.
   *
   * Además, de un libro cerrado solo se ve UN canto: el opuesto al lomo. Los
   * dos a la vez solo existen con el libro abierto.
   */
  const cerrado = cabenDos && paginaActual === 0;
  const enContratapa = cabenDos && paginaActual >= totalPaginas - 1;

  const cuerpo = {
    izquierda: cerrado ? ancho : 0,
    derecha: enContratapa ? ancho : anchoBloque,
  };

  return (
    <div ref={escenaRef} className="escena-libro flex-1 w-full overflow-hidden">
      {/* Sonda: una hoja real fuera de pantalla. Da el alto útil de la caja de
          texto y, de paso, es el medidor del paginador.

          El div del medidor va VACÍO a propósito: su contenido lo pone y lo
          quita `usePaginator` capítulo a capítulo con `innerHTML`. Antes React
          pintaba aquí el flujo entero, o sea una segunda copia completa del
          texto encadenado viva en el DOM todo el rato para no enseñarla nunca. */}
      {Boolean(ancho) && (
        <div className="hoja" style={{ position: "fixed", left: -99999, top: 0, width: ancho, height: alto, visibility: "hidden", pointerEvents: "none" }}>
          <div className="hoja__contenido" style={estiloContenido(caja, true)}>
            <div className="hoja__titulillo">
              <span>{libro}</span>
              <span>&nbsp;</span>
            </div>
            <div className="hoja__ventana" ref={ventanaRef}>
              <div ref={medidorRef} lang={idioma} className={`hoja__flujo texto-biblico ${mostrarStrong ? "" : "hoja__flujo--limpio"}`} />
            </div>
            <div className="hoja__folio">0</div>
          </div>
        </div>
      )}

      {listo && (
        <div className="libro-envoltorio" style={{ width: anchoBloque, transform: `translateX(${(cerrado ? -1 : enContratapa ? 1 : 0) * (ancho / 2)}px)` }}>
          <div className="sombra-suelo" style={{ left: cuerpo.izquierda + ancho * 0.06, right: anchoBloque - cuerpo.derecha + ancho * 0.06 }} />
          {!cerrado && <div className="canto-hojas canto-hojas--izq" style={{ left: cuerpo.izquierda - 12 }} />}
          {!enContratapa && <div className="canto-hojas canto-hojas--der" style={{ left: cuerpo.derecha - 1, right: "auto" }} />}

          <Libro
            key={firma}
            ref={flipRef}
            width={ancho}
            height={alto}
            size="fixed"
            // El libro se remonta al encadenar capítulo; sin esto volvería a la
            // portada en mitad de la lectura.
            startPage={paginaActual}
            showCover
            usePortrait
            maxShadowOpacity={0.45}
            flippingTime={movimientoReducido ? GIRO.reducido : GIRO.normal}
            drawShadow={!movimientoReducido}
            mobileScrollSupport={false}
            /*
             * `disableFlipByClick` NO se puede activar aquí, aunque suene a lo
             * que uno querría.
             *
             * Esa opción parece limitar los clics del usuario, pero se aplica
             * dentro de `Flip.flip()`, que es por donde pasan TAMBIÉN
             * `flipNext()` y `flipPrev()`. Las llamadas programáticas fabrican
             * un punto falso y lo hacen pasar por la misma comprobación de
             * "¿está en una esquina?".
             *
             * `flipNext()` fabrica su punto a partir de `pageWidth * 2`, que en
             * apaisado y en retrato cae en la esquina de la derecha y cuela.
             * `flipPrev()` usa un `x: 10` fijo: en apaisado el libro empieza en
             * x=0 y cuela, pero en RETRATO la librería coloca su origen en
             * `-pageWidth` (la página izquierda queda fuera de pantalla), así
             * que ese 10 acaba en mitad de la hoja, no en la esquina, y la
             * comprobación lo rechaza. Resultado: en móvil el botón de
             * retroceder no hacía absolutamente nada, sin error ni aviso.
             *
             * Con la opción quitada, además, el toque en la hoja pasa página:
             * a la izquierda atrás, a la derecha adelante. Es lo que hace
             * cualquier lector y es la forma natural de retroceder con el dedo.
             * A cambio se pierde seleccionar texto dentro del libro, porque la
             * librería hace `preventDefault()` en `mousedown`; para eso está el
             * botón de copiar capítulo de la barra de arriba.
             */
            showPageCorners
            className="libro"
            style={SIN_ESTILO}
            onFlip={alTerminarGiro}
          >
            {paginas}
          </Libro>
        </div>
      )}
    </div>
  );
};

Book3D.propTypes = {
  /** Un HTML por capítulo encadenado, en orden. */
  piezas: PropTypes.arrayOf(PropTypes.string),
  libro: PropTypes.string,
  /**
   * Dónde abrir: `ancla` es la referencia elegida y `entrada` por dónde se
   * llega (`portada` al elegirla a mano, `inicio` al pasar al capítulo
   * siguiente, `final` al retroceder al anterior).
   */
  destino: PropTypes.shape({ ancla: PropTypes.string, entrada: PropTypes.oneOf(["portada", "inicio", "final"]) }),
  titulo: PropTypes.string,
  version: PropTypes.string,
  idioma: PropTypes.string,
  mostrarStrong: PropTypes.bool,
  /** Ajuste manual del cuerpo de letra, en px sobre el tamaño automático. */
  escalaTexto: PropTypes.number,
  /** Si hay capítulo al que seguir; sin él, el final del texto es el final. */
  haySiguiente: PropTypes.bool,
  hayAnterior: PropTypes.bool,
  onCambioHoja: PropTypes.func,
  /** Recibe la función para pasar hoja, y así la barra de abajo puede llamarla. */
  onControles: PropTypes.func,
  /** Se llama al intentar pasar de la última hoja o de la portada. */
  onDesbordar: PropTypes.func,
};

export default Book3D;
