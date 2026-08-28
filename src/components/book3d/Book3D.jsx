import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

/** Objeto estable: `HTMLFlipBook` está memoizado y un literal nuevo por render lo invalidaría. */
const SIN_ESTILO = {};

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

/**
 * Una hoja.
 *
 * `forwardRef` no es opcional: `react-pageflip` hace `cloneElement` sobre cada
 * hijo para inyectarle una `ref` y quedarse con el nodo real del DOM. Un
 * componente de función sin `forwardRef` se traga esa ref, la librería recibe
 * una lista vacía de hojas y el libro se queda en blanco sin dar ningún error.
 */
const Hoja = forwardRef(function Hoja({ html, desplazamiento, altura, folio, libro, capitulo, caja, izquierda, mostrarStrong, idioma }, ref) {
  return (
    <div className={`hoja ${izquierda ? "hoja--izq" : "hoja--der"}`} ref={ref} data-density="soft">
      <div className="hoja__contenido" style={estiloContenido(caja, izquierda)}>
        <div className="hoja__titulillo">
          <span>{libro}</span>
          <span>{capitulo}</span>
        </div>
        <div className="hoja__ventana">
          <div className="hoja__recorte" style={{ height: altura }}>
            <div
              lang={idioma}
              className={`hoja__flujo texto-biblico ${mostrarStrong ? "" : "hoja__flujo--limpio"}`}
              style={{ marginTop: -desplazamiento }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
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

const Book3D = ({ piezas = [], libro, ancla, titulo, version, idioma = "es", mostrarStrong = false, onCambioHoja, onControles }) => {
  /*
   * El flujo completo. Solo lo usa el MEDIDOR: es el texto de corrido del que
   * salen los cortes de página. Las hojas no lo pintan; cada una se queda con
   * las piezas que le tocan (ver `hojas`).
   */
  const html = useMemo(() => piezas.join(""), [piezas]);

  const escenaRef = useRef(null);
  const ventanaRef = useRef(null);
  const flipRef = useRef(null);

  const [libre, setLibre] = useState({ ancho: 0, alto: 0 });
  const [ventana, setVentana] = useState({ ancho: 0, alto: 0 });
  // Índice de página de la librería (tapa incluida). Sirve para colocar el
  // canto y la sombra, y para volver al mismo sitio cuando el libro se
  // reconstruye al encadenar el capítulo siguiente.
  const [pagina, setPagina] = useState(0);

  /*
   * El libro no se monta hasta que las serifas web están cargadas.
   *
   * EB Garamond tiene otras métricas que la serifa de respaldo, así que la
   * primera paginación (hecha con la de respaldo) da un número de hojas
   * distinto del definitivo, y corregirlo después obliga a reconstruir el libro
   * entero delante del usuario.
   */
  const [fuentesListas, setFuentesListas] = useState(() => !document.fonts?.ready);
  useEffect(() => {
    let vigente = true;
    document.fonts?.ready.then(() => vigente && setFuentesListas(true));
    return () => {
      vigente = false;
    };
  }, []);

  const { ancho, alto, cabenDos } = useMemo(() => calcularDimensiones(libre.ancho, libre.alto), [libre]);

  const caja = useMemo(
    () => ({
      padExterior: Math.round(ancho * MARGEN.exterior),
      padLomo: Math.round(ancho * MARGEN.lomo),
      padVertical: Math.round(alto * MARGEN.vertical),
      // El cuerpo de letra sigue al ancho de la hoja para que la medida de
      // línea se mantenga en torno a los 60-70 caracteres, que es donde el ojo
      // deja de perder el renglón. Los topes evitan que en pantallas muy
      // grandes o muy chicas se vaya a un extremo ilegible.
      cuerpo: Math.max(15, Math.min(21, Math.round(ancho * 0.043))),
    }),
    [ancho, alto]
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
   */
  useLayoutEffect(() => {
    const nodo = ventanaRef.current;
    if (!nodo || !ancho || !alto) return;

    const { width, height } = nodo.getBoundingClientRect();
    setVentana((previo) => (previo.ancho === width && previo.alto === height ? previo : { ancho: width, alto: height }));
  }, [ancho, alto, caja, html, mostrarStrong]);

  const { cortes, altoContenido, marcas, medidorRef } = usePaginator(html, ventana.ancho, ventana.alto, `${caja.cuerpo}-${mostrarStrong}`);

  const hojas = useMemo(() => {
    if (!html || !ancho) return [];

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

      /*
       * Qué piezas necesita esta hoja y desde dónde.
       *
       * Los cortes se calcularon sobre el flujo completo, así que el
       * desplazamiento es una distancia desde el principio de TODO. Si la hoja
       * pinta solo un trozo, hay que rebajarlo hasta donde empieza la primera
       * pieza que lleva; de ahí la resta con `marcas`.
       *
       * Sin marcas (aún no se ha medido, o hay un solo capítulo) se cae al
       * flujo entero, que siempre es correcto aunque pese más.
       */
      let ultima = actual;
      while (ultima + 1 < marcas.length && marcas[ultima + 1].top < desplazamiento + altura) ultima += 1;

      const trozo =
        marcas.length < 2
          ? { html, desplazamiento }
          : { html: piezas.slice(actual, ultima + 1).join(""), desplazamiento: desplazamiento - marcas[actual].top };

      return { ...trozo, folio: indice + 1, altura, capitulo: marcas[actual]?.capitulo ?? "" };
    });
  }, [cortes, altoContenido, marcas, piezas, html, ancho]);

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
  const firma = [ancho, alto, cabenDos, libro, version, idioma, mostrarStrong, caja.cuerpo, html.length, cortes.length, cortes[cortes.length - 1] ?? 0].join("|");

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
          />
        )
      ),
      <Tapa key="contratapa" titulo={titulo} version={version} />,
    ],
    [hojasConRelleno, libro, caja, titulo, version, idioma, mostrarStrong, cabenDos, preliminares]
  );

  /*
   * Volver a la portada solo cuando el usuario cambia de sitio a propósito.
   *
   * `ancla` es la referencia que eligió (versión, libro, capítulo de partida).
   * Al encadenar el capítulo siguiente el texto crece y el libro se remonta,
   * pero el ancla no se mueve, y la página guardada sigue siendo válida porque
   * el texto nuevo se añade DETRÁS sin desplazar un solo renglón del anterior.
   */
  useEffect(() => {
    setPagina(0);
  }, [ancla]);

  const pasar = useCallback((direccion) => {
    const control = flipRef.current?.pageFlip?.();
    if (!control) return;
    if (direccion === "adelante") control.flipNext();
    else control.flipPrev();
  }, []);

  useEffect(() => {
    onControles?.(pasar);
  }, [onControles, pasar]);

  // Se avisa del estado en cada cambio de página Y cada vez que se repagina:
  // el total cambia al encadenar capítulo, y la barra de abajo lo muestra.
  useEffect(() => {
    const indice = Math.max(0, Math.min(hojas.length - 1, pagina - preliminares));
    onCambioHoja?.({ total: hojas.length, actual: indice, capitulo: hojas[indice]?.capitulo ?? "" });
  }, [hojas, pagina, preliminares, onCambioHoja]);

  const anchoBloque = cabenDos ? ancho * 2 : ancho;
  const listo = Boolean(html && ancho && ventana.alto && fuentesListas);

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
  const totalPaginas = hojasConRelleno.length + preliminares + 1;
  const cerrado = cabenDos && pagina === 0;
  const enContratapa = cabenDos && pagina >= totalPaginas - 1;

  const cuerpo = {
    izquierda: cerrado ? ancho : 0,
    derecha: enContratapa ? ancho : anchoBloque,
  };

  return (
    <div ref={escenaRef} className="escena-libro flex-1 w-full overflow-hidden">
      {/* Sonda: una hoja real fuera de pantalla. Da el alto útil de la caja de
          texto y, de paso, es el medidor de renglones del paginador. */}
      {Boolean(ancho) && (
        <div className="hoja" style={{ position: "fixed", left: -99999, top: 0, width: ancho, height: alto, visibility: "hidden", pointerEvents: "none" }}>
          <div className="hoja__contenido" style={estiloContenido(caja, true)}>
            <div className="hoja__titulillo">
              <span>{libro}</span>
              <span>&nbsp;</span>
            </div>
            <div className="hoja__ventana" ref={ventanaRef}>
              <div
                ref={medidorRef}
                lang={idioma}
                className={`hoja__flujo texto-biblico ${mostrarStrong ? "" : "hoja__flujo--limpio"}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
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
            startPage={Math.min(pagina, totalPaginas - 1)}
            showCover
            usePortrait
            maxShadowOpacity={0.45}
            flippingTime={720}
            drawShadow
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
             * librería hace `preventDefault()` en `mousedown`; para copiar y
             * compartir está la pantalla de comparación.
             */
            showPageCorners
            className="libro"
            style={SIN_ESTILO}
            onFlip={(evento) => setPagina(evento.data)}
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
  /** Referencia elegida por el usuario. Al cambiar, el libro vuelve a la portada. */
  ancla: PropTypes.string,
  titulo: PropTypes.string,
  version: PropTypes.string,
  idioma: PropTypes.string,
  mostrarStrong: PropTypes.bool,
  onCambioHoja: PropTypes.func,
  /** Recibe la función para pasar hoja, y así la barra de abajo puede llamarla. */
  onControles: PropTypes.func,
};

export default Book3D;
