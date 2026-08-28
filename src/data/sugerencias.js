/**
 * Palabras de ejemplo del buscador.
 *
 * Antes eran siete, fijas y solo en español: quien abría la búsqueda con la app
 * en inglés veía "esperanza" y "sabiduría" como sugerencias de qué escribir, y
 * quien la abría dos veces veía exactamente lo mismo.
 *
 * Todas son términos que salen de verdad en el texto bíblico, no palabras
 * bonitas: una sugerencia que devuelve cero resultados enseña que el buscador
 * no funciona.
 *
 * No son traducciones una a una. Cada lista se escribió para su idioma, porque
 * lo que se busca en cada uno no es lo mismo: "righteousness" es una sola
 * palabra frecuente en inglés y en español se reparte entre "justicia" y
 * "rectitud".
 */

export const SUGERENCIAS = {
  es: [
    "amor", "paz", "fe", "esperanza", "gracia", "sabiduría", "luz", "verdad",
    "justicia", "misericordia", "perdón", "salvación", "alianza", "pacto",
    "oración", "alabanza", "gozo", "consuelo", "refugio", "pastor", "cordero",
    "siervo", "profeta", "discípulo", "apóstol", "templo", "altar", "sacrificio",
    "ofrenda", "arrepentimiento", "humildad", "paciencia", "bondad", "fidelidad",
    "santidad", "gloria", "reino", "espíritu", "corazón", "alma", "sangre",
    "cruz", "resurrección", "vida", "muerte", "pecado", "ley", "mandamiento",
    "bendición", "herencia",
  ],
  en: [
    "love", "peace", "faith", "hope", "grace", "wisdom", "light", "truth",
    "righteousness", "mercy", "forgiveness", "salvation", "covenant", "prayer",
    "praise", "joy", "comfort", "refuge", "shepherd", "lamb", "servant",
    "prophet", "disciple", "apostle", "temple", "altar", "sacrifice", "offering",
    "repentance", "humility", "patience", "kindness", "faithfulness", "holiness",
    "glory", "kingdom", "spirit", "heart", "soul", "blood", "cross",
    "resurrection", "life", "death", "sin", "law", "commandment", "blessing",
    "inheritance", "redemption",
  ],
};

/**
 * `cuantas` palabras al azar, sin repetir.
 *
 * Fisher-Yates sobre una copia. La alternativa perezosa —ordenar con
 * `sort(() => Math.random() - 0.5)`— no reparte por igual: el algoritmo de
 * ordenación no espera un comparador incoherente y deja los primeros elementos
 * cerca de donde estaban, así que "amor" y "paz" saldrían casi siempre.
 */
export const sugerenciasAlAzar = (idioma, cuantas = 7) => {
  const origen = SUGERENCIAS[idioma] ?? SUGERENCIAS.es;
  const copia = [...origen];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia.slice(0, cuantas);
};
