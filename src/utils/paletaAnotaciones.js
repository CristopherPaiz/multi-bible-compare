/**
 * Paleta de resaltado.
 *
 * Vive fuera del contexto porque lo consumen componentes que no son el
 * proveedor —la barra de estudio, el panel del versículo, la página de notas—
 * y un archivo que exporta a la vez un componente y constantes rompe el
 * recargado en caliente de Vite: al tocar cualquiera de las dos cosas se
 * remonta el árbol entero y se pierde el estado.
 *
 * ---------------------------------------------------------------------------
 * Por qué nombres y no colores
 * ---------------------------------------------------------------------------
 * Lo que se guarda —en localStorage y en el servidor— es "amarillo", nunca
 * "#fff9c4". La app tiene tema claro y oscuro: un tono elegido de día queda
 * ilegible de noche. Guardando el nombre, cada tema resuelve su propio tono y
 * un resaltado hecho en cualquiera de los dos se ve bien en el otro.
 */

/** Debe coincidir con COLORES en api/src/validators/annotation.schema.ts */
export const COLORES = ["amarillo", "verde", "azul", "rosa", "naranja", "morado"];

/**
 * Fondo del versículo resaltado, por tema.
 *
 * Las clases van escritas enteras y no compuestas (`bg-${color}-200`) porque
 * Tailwind analiza el código como TEXTO: una clase armada en tiempo de
 * ejecución no aparece en el CSS generado y el resaltado saldría sin fondo en
 * producción, aunque en desarrollo se viera bien.
 */
export const CLASES_COLOR = {
  amarillo: "bg-amber-200/70 dark:bg-amber-500/25",
  verde: "bg-emerald-200/70 dark:bg-emerald-500/25",
  azul: "bg-sky-200/70 dark:bg-sky-500/25",
  rosa: "bg-pink-200/70 dark:bg-pink-500/25",
  naranja: "bg-orange-200/70 dark:bg-orange-500/25",
  morado: "bg-violet-200/70 dark:bg-violet-500/25",
};

/** Muestra sólida para los botones de la paleta y los puntos de la lista. */
export const PUNTOS_COLOR = {
  amarillo: "bg-amber-400",
  verde: "bg-emerald-400",
  azul: "bg-sky-400",
  rosa: "bg-pink-400",
  naranja: "bg-orange-400",
  morado: "bg-violet-400",
};
