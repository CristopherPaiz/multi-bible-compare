/**
 * Diferencias léxicas entre versiones del mismo versículo.
 *
 * La app se llama "multi-bible-compare" y hasta ahora comparar consistía en
 * poner los textos uno al lado del otro y que el ojo hiciera el trabajo. Con
 * dos versiones y un versículo corto funciona; con seis versiones de Romanos
 * 8:28 no, porque las diferencias que importan son de una palabra dentro de
 * treinta que son iguales.
 *
 * Esto marca esas palabras.
 *
 * ---------------------------------------------------------------------------
 * Por qué se agrupa por idioma
 * ---------------------------------------------------------------------------
 * Comparar palabra a palabra una versión en español contra una interlineal
 * griega da que TODO es distinto, que es cierto y no dice nada. El contraste
 * útil es entre traducciones al mismo idioma: ahí "propiciación" frente a
 * "sacrificio de expiación" es una decisión de traducción visible.
 *
 * Así que cada idioma se compara con los de su idioma y nunca con los demás.
 * Una versión que se queda sola en su idioma no tiene con qué contrastarse y
 * sus palabras salen todas como comunes, que es lo mismo que no marcar nada.
 *
 * ---------------------------------------------------------------------------
 * Qué NO hace
 * ---------------------------------------------------------------------------
 * No es un diff de secuencia (Myers y compañía). Un alineamiento posicional
 * entre traducciones distintas es ruido: reordenan la frase entera. Lo que se
 * compara son CONJUNTOS de palabras, que es la pregunta real: ¿qué palabra usó
 * esta versión que las otras no usaron?
 */
import { aTextoPlano } from "./textoPlano";
import { idiomaDeVersion } from "./versiones";

/** Estados posibles de una palabra dentro de su grupo de idioma. */
export const ESTADOS = {
  COMUN: "comun",
  PARCIAL: "parcial",
  PROPIO: "propio",
};

/**
 * Palabra comparable: minúsculas, sin tildes y sin puntuación.
 *
 * Sin normalizar, "Dios," y "Dios" serían palabras distintas y media frase se
 * marcaría como diferencia por culpa de una coma.
 */
const normalizarPalabra = (palabra) =>
  palabra
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Palabras vacías que no aportan al contraste.
 *
 * Se excluyen del marcado, no del texto: que una versión diga "el" y otra "al"
 * es ortografía, no una decisión de traducción, y marcarlo llena el versículo
 * de subrayados que tapan lo que sí importa.
 */
const VACIAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "y", "e", "o", "u",
  "que", "en", "por", "para", "con", "sin", "su", "sus", "se", "lo", "le", "les", "es", "son", "fue",
  "the", "a", "an", "of", "and", "or", "to", "in", "for", "with", "is", "are", "was", "were", "that", "his", "her",
]);

/**
 * Estado de cada palabra, versión por versión.
 *
 * @param {Array<{biblia: string, texto: string}>} entradas texto del MISMO versículo en cada versión
 * @returns {Map<string, Map<string, string>>} biblia -> (palabra normalizada -> estado)
 */
export const compararVersiculos = (entradas) => {
  const porIdioma = new Map();

  for (const entrada of entradas) {
    const idioma = idiomaDeVersion(entrada.biblia);
    if (!porIdioma.has(idioma)) porIdioma.set(idioma, []);
    porIdioma.get(idioma).push(entrada);
  }

  const resultado = new Map();

  for (const grupo of porIdioma.values()) {
    // Con una sola versión en el idioma no hay contraste posible.
    if (grupo.length < 2) {
      for (const entrada of grupo) resultado.set(entrada.biblia, new Map());
      continue;
    }

    const conjuntos = grupo.map((entrada) => ({
      biblia: entrada.biblia,
      palabras: new Set(
        aTextoPlano(entrada.texto)
          .split(/\s+/)
          .map(normalizarPalabra)
          .filter((palabra) => palabra.length > 1 && !VACIAS.has(palabra))
      ),
    }));

    for (const actual of conjuntos) {
      const estados = new Map();

      for (const palabra of actual.palabras) {
        const cuantas = conjuntos.filter((otro) => otro.palabras.has(palabra)).length;
        if (cuantas === conjuntos.length) continue; // común: no se marca
        estados.set(palabra, cuantas === 1 ? ESTADOS.PROPIO : ESTADOS.PARCIAL);
      }

      resultado.set(actual.biblia, estados);
    }
  }

  return resultado;
};

/** Etiquetas cuyo contenido NO es texto bíblico y no debe marcarse. */
const OPACAS = new Set(["sup", "m", "f"]);

/**
 * Envuelve en `<mark>` las palabras marcadas, respetando el HTML del versículo.
 *
 * La alternativa —pasar el versículo a texto plano y marcarlo— era más simple y
 * costaba los números Strong: dejaban de ser clicables justo en el versículo
 * que el usuario está estudiando. Aquí se recorre el marcado y solo se tocan
 * los trozos de texto, así que `<sup>`, `<n>` y `<J>` siguen intactos.
 *
 * @param {string} html      versículo tal cual viene de la fuente
 * @param {Map<string,string>} estados palabra normalizada -> estado
 */
export const marcarDiferencias = (html, estados) => {
  if (!estados || estados.size === 0) return html;

  let salida = "";
  let profundidadOpaca = 0;

  // Cada coincidencia es o una etiqueta o un trozo de texto entre etiquetas.
  for (const parte of String(html ?? "").matchAll(/(<[^>]*>)|([^<]+)/g)) {
    const [, etiqueta, texto] = parte;

    if (etiqueta) {
      salida += etiqueta;
      const nombre = /^<\s*(\/?)\s*([a-zA-Z][\w-]*)/.exec(etiqueta);
      if (nombre && OPACAS.has(nombre[2].toLowerCase())) {
        // Una etiqueta que se auto-cierra no abre nada que haya que cerrar.
        if (nombre[1]) profundidadOpaca = Math.max(0, profundidadOpaca - 1);
        else if (!/\/\s*>$/.test(etiqueta)) profundidadOpaca += 1;
      }
      continue;
    }

    if (profundidadOpaca > 0) {
      salida += texto;
      continue;
    }

    // Se parte conservando los separadores para no perder espacios ni signos.
    salida += texto
      .split(/(\s+)/)
      .map((trozo) => {
        if (!trozo.trim()) return trozo;
        const estado = estados.get(normalizarPalabra(trozo));
        return estado ? `<mark class="dif-${estado}">${trozo}</mark>` : trozo;
      })
      .join("");
  }

  return salida;
};
