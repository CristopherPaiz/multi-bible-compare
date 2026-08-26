/**
 * Convierte el HTML de un versículo en texto plano legible.
 *
 * Los textos traen marcado del formato XML de Beblia. Hay que distinguir dos
 * grupos, y ahí estaba el fallo de la versión anterior:
 *
 *   - Etiquetas cuyo CONTENIDO no es texto bíblico y sobra al copiar:
 *     `<sup>2424</sup>` (número Strong), `<m>V-AAI-3S</m>` (morfología) y
 *     `<f>ⓐ</f>` (marca de nota al pie).
 *
 *   - Etiquetas que solo dan formato y cuyo contenido SÍ es el versículo:
 *     `<J>` (palabras de Jesús), `<n>` (glosa), `<t>` (línea de poesía),
 *     `<e>`, `<i>`, `<b>`, `<pb/>`.
 *
 * La regla anterior era `/<[^>]+>.*?<\/[^>]+>/gs`, que borraba el contenido de
 * CUALQUIER par de etiquetas. Resultado medido:
 *
 *   - `<J>versículo entero</J>`  ->  cadena VACÍA (9 versiones)
 *   - interlineal                ->  "ουτως γαρ" (se perdía la glosa)
 *   - `<t>texto<f>ⓐ</f></t>`     ->  "."
 *   - `<pb/>` se quedaba visible en el texto copiado
 */
export const aTextoPlano = (html) =>
  String(html ?? "")
    .replace(/<sup>[\s\S]*?<\/sup>/gi, " ")
    .replace(/<m>[\s\S]*?<\/m>/gi, " ")
    .replace(/<f>[\s\S]*?<\/f>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** Aplica `aTextoPlano` a cada versículo de un capítulo. */
export const capituloATextoPlano = (capitulo) =>
  Object.fromEntries(Object.entries(capitulo ?? {}).map(([clave, valor]) => [clave, aTextoPlano(valor)]));
