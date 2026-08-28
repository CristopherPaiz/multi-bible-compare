/**
 * Convierte los capítulos que devuelve `getChapter` en un solo bloque de prosa.
 *
 * La API entrega `{ "1": "<html>", "2": "<html>", ... }`: un versículo por
 * clave. La vista de comparación pinta cada uno como su propia fila, que es lo
 * correcto para comparar. Un libro impreso hace lo contrario: el capítulo es un
 * texto corrido y el número de versículo es una marca volada dentro del
 * párrafo. Aquí se hace esa segunda lectura.
 *
 * Y se hace con VARIOS capítulos seguidos, no con uno. Encadenados en un mismo
 * flujo, al llegar al pie de un capítulo el siguiente empieza en la misma hoja
 * y la lectura no se interrumpe con una portada de por medio.
 */

/**
 * `<pb/>` marca inicio de párrafo, pero en HTML una etiqueta desconocida NO
 * puede autocerrarse: el navegador parsea `<pb/>A<pb/>B` como
 * `<pb>A<pb>B</pb></pb>`, anidando y arrastrando el resto del versículo dentro.
 * Se sustituye por un <span> vacío, que la hoja de estilos convierte en salto.
 *
 * Es la misma normalización que hace `VerseSingle`; se repite en vez de
 * importarse porque allí es una constante privada del componente.
 */
const normalizarMarcado = (html) =>
  String(html ?? "")
    .replace(/^(?:\s|\\par\b|<pb\s*\/?>)+/i, "")
    .replace(/\\par\b/gi, '<span class="salto-parrafo"></span>')
    .replace(/<pb\s*\/?>/gi, '<span class="salto-parrafo"></span>');

/**
 * Aparato crítico: códigos Strong (`<sup>`), morfología (`<m>`) y glosa (`<n>`).
 *
 * Cuando está apagado se QUITA del HTML, no se esconde con CSS. En una versión
 * con Strong, como la Reina Valera 1960, esas etiquetas son la mayor parte del
 * marcado del versículo, y aquí el texto no se pinta una vez: cada hoja lleva
 * su copia de los capítulos que asoman en ella. Escondiéndolo con `display:
 * none` se pagaría ese peso en cada hoja para no enseñarlo nunca.
 */
const RE_APARATO = /<(sup|m|n)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Un capítulo: marca medible + numeral capitular + versículos corridos. */
const capituloAProsa = (numero, versiculos, esPrimero, conAparato) => {
  if (typeof versiculos !== "object" || versiculos === null) return "";

  // Las claves llegan como texto ("1", "2", "10"). Ordenadas como texto, el 10
  // se cuela entre el 1 y el 2.
  const numeros = Object.keys(versiculos).sort((a, b) => Number(a) - Number(b));
  if (!numeros.length) return "";

  const limpiar = (html) => (conAparato ? html : html.replace(RE_APARATO, ""));

  const cuerpo = numeros
    .map((verso) => `<span class="num-vers">${verso}</span>${limpiar(normalizarMarcado(versiculos[verso]))}`)
    // El separador es un espacio real y no un salto de línea: dentro de un
    // bloque justificado cualquier espacio en blanco cuenta como uno solo, pero
    // un salto entre etiquetas inline puede colarse como espacio de más al
    // copiar el texto.
    .join(" ");

  /*
   * La marca es un bloque de altura cero del que el paginador saca el
   * `offsetTop` del capítulo, y así el titulillo de cada hoja sabe en qué
   * capítulo está.
   *
   * `clear: both` (en el CSS) no es un detalle: el numeral capitular del
   * capítulo anterior es un `float`, y si su último párrafo es corto el float
   * sigue vivo cuando empieza el capítulo siguiente y se le monta encima.
   */
  const marca = `<span class="marca-capitulo${esPrimero ? "" : " marca-capitulo--separada"}" data-capitulo="${numero}"></span>`;

  // El numeral del capítulo hace de capitular. Es lo que hace una biblia
  // impresa: la letra grande al abrir capítulo es el número, no la inicial.
  return `${marca}<span class="capitular">${numero}</span>${cuerpo}`;
};

/**
 * Un HTML POR CAPÍTULO, no uno solo pegado.
 *
 * Concatenadas dan el flujo completo, que es lo que se mide. Pero cada hoja
 * solo pinta las piezas que asoman en ella, y por eso se devuelven sueltas: si
 * cada hoja llevara el flujo entero, encadenar veinte capítulos significaría
 * doscientas hojas con veinte capítulos de HTML cada una. Troceado, una hoja
 * carga uno o dos capítulos y da igual cuánto se siga leyendo.
 *
 * El troceo es seguro porque cada pieza empieza con un bloque `clear: both`:
 * ninguna arrastra flotantes ni renglones a medias de la anterior, así que una
 * pieza suelta se maqueta EXACTAMENTE igual que dentro del flujo completo. Es
 * la condición de la que depende que los cortes de página sigan cuadrando.
 *
 * @param {Array<{numero: string, versiculos: Record<string, string>}>} capitulos
 * @param {boolean} conAparato Si se conservan Strong, morfología y glosa.
 * @returns {string[]} Una pieza de HTML por capítulo, en orden.
 */
export const capitulosAPiezas = (capitulos, conAparato = false) =>
  capitulos.map(({ numero, versiculos }, indice) => capituloAProsa(numero, versiculos, indice === 0, conAparato));
