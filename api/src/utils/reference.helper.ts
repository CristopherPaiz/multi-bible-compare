/**
 * Codificacion de la referencia biblica en el rowid del indice FTS5.
 *
 * El indice es `contentless`, asi que un resultado solo devuelve un rowid. En vez
 * de mantener una tabla de mapeo (que costaria mas espacio que el propio indice),
 * el rowid ES la referencia:
 *
 *     rowid = (bible_id << 24) | (book_id << 16) | (chapter << 8) | verse
 *
 * Cada campo ocupa 8 bits, salvo bible_id que se lleva el resto. Los limites
 * reales caben de sobra: 66 libros, 150 capitulos maximo, y el versiculo mas alto
 * de toda la Biblia es Salmo 119:176.
 *
 * Bonus: los versiculos de una misma biblia quedan contiguos, asi que filtrar por
 * version es `rowid BETWEEN lo AND hi` — un rango, no un escaneo.
 */

const VERSE_BITS = 8
const CHAPTER_BITS = 8
const BOOK_BITS = 8

const MAX_FIELD = 255

export interface BibleReference {
  bibleId: number
  bookId: number
  chapter: number
  verse: number
}

export class ReferenceOverflowError extends Error {
  constructor(ref: BibleReference) {
    super(`Referencia fuera de rango: biblia ${ref.bibleId} libro ${ref.bookId} ${ref.chapter}:${ref.verse}`)
    this.name = 'ReferenceOverflowError'
  }
}

export const encodeReference = ({ bibleId, bookId, chapter, verse }: BibleReference): number => {
  if (bookId > MAX_FIELD || chapter > MAX_FIELD || verse > MAX_FIELD || bookId < 0 || chapter < 0 || verse < 0) {
    throw new ReferenceOverflowError({ bibleId, bookId, chapter, verse })
  }
  // Se usa multiplicacion y no `<<` a proposito: los operadores de bits de
  // JavaScript truncan a 32 bits con signo, y aqui se pasa de ese rango.
  return bibleId * 2 ** (BOOK_BITS + CHAPTER_BITS + VERSE_BITS) + bookId * 2 ** (CHAPTER_BITS + VERSE_BITS) + chapter * 2 ** VERSE_BITS + verse
}

export const decodeReference = (rowid: number): BibleReference => {
  const verse = rowid % 2 ** VERSE_BITS
  const afterVerse = Math.floor(rowid / 2 ** VERSE_BITS)
  const chapter = afterVerse % 2 ** CHAPTER_BITS
  const afterChapter = Math.floor(afterVerse / 2 ** CHAPTER_BITS)
  const bookId = afterChapter % 2 ** BOOK_BITS
  const bibleId = Math.floor(afterChapter / 2 ** BOOK_BITS)
  return { bibleId, bookId, chapter, verse }
}

/** Rango [lo, hi] que cubre todos los versiculos de una version. */
export const bibleRowidRange = (bibleId: number): { lo: number; hi: number } => {
  const span = 2 ** (BOOK_BITS + CHAPTER_BITS + VERSE_BITS)
  return { lo: bibleId * span, hi: bibleId * span + span - 1 }
}

/**
 * Quita el markup `<sup>NNNN </sup>` y normaliza espacios.
 *
 * El indice se llena con ESTE texto, no con el original: si no, los numeros
 * Strong quedan pegados entre palabras y rompen la tokenizacion.
 */
export const stripStrongMarkup = (text: string): string =>
  text
    .replace(/<sup>[\s\S]*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
