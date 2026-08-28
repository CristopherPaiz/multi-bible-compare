import { Request } from 'express'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface JwtPayload {
  userId: number
  username: string
}

/** Request con el usuario ya resuelto por `authMiddleware`. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload
}

export interface UserRecord {
  id: number
  username: string
  email: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------

export interface BibleVersion {
  id: number
  slug: string
  name: string
  language: string
  year: number | null
  hasStrongs: boolean
  hasOldTestament: boolean
  hasNewTestament: boolean
  searchable: boolean
  sortOrder: number
  /**
   * Nombre de la carpeta original ("034. Espanol - ..."). La UI identifica las
   * versiones por este valor: vive en el localStorage de los usuarios y en el
   * catalogo de ListBooks. Sirve de puente para alternar entre Turso y el CDN
   * de GitHub sin migrar nada.
   */
  legacyPath: string | null
}

export interface BookMeta {
  id: number
  testament: 'old' | 'new'
  chapterCount: number
}

// ---------------------------------------------------------------------------
// Texto biblico
// ---------------------------------------------------------------------------

/** Un capitulo de UNA version. `verses` va indexado por numero de versiculo. */
export interface ChapterPayload {
  bibleId: number
  bookId: number
  chapter: number
  verseCount: number
  /**
   * Texto por numero de versiculo, TAL CUAL se muestra: incluye el markup
   * `<sup>NNNN </sup>` en las versiones interlineales, que la UI usa para abrir
   * el diccionario Strong al hacer clic.
   */
  verses: Record<string, string>
}

/** Respuesta multi-version: lo que la UI pide de un solo golpe. */
export interface MultiChapterResponse {
  bookId: number
  chapter: number
  /** Versiones que si existian y trajeron texto. */
  chapters: ChapterPayload[]
  /** Versiones pedidas que no tienen ese capitulo (ej. NT en una biblia solo-AT). */
  missing: number[]
}

export interface VersePayload {
  bibleId: number
  bookId: number
  chapter: number
  verse: number
  text: string
}

// ---------------------------------------------------------------------------
// Busqueda
// ---------------------------------------------------------------------------

export interface SearchHit {
  bibleId: number
  bookId: number
  chapter: number
  verse: number
  /** Fragmento con `<mark>` alrededor de las coincidencias. */
  snippet: string
}

export interface Paginated<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Strong
// ---------------------------------------------------------------------------

export interface StrongEntry {
  code: string
  language: 'greek' | 'hebrew'
  number: number
  lemma: string | null
  transliteration: string | null
  pronunciation: string | null
  title: string | null
  definition: string | null
  /**
   * Idioma en que viene la definicion servida.
   *
   * Puede NO ser el que se pidio: si falta la traduccion se responde en
   * espanol, y el cliente necesita saberlo para poder avisar en vez de dar por
   * hecho que lo que ve es lo que pidio.
   */
  definitionLang: 'es' | 'en'
  /** Solo la fuente inglesa las trae por separado; en espanol van dentro de `definition`. */
  derivation?: string | null
  kjvDef?: string | null
  /** URL publica directa al mp3. `null` si no hay audio o falta configurar storage. */
  audioUrl: string | null
}

// ---------------------------------------------------------------------------
// Sync de usuario
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: number
  bibleIds: number[]
  bookId: number
  chapter: number
  verse: number | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Anotaciones del usuario
// ---------------------------------------------------------------------------

export interface HighlightRecord {
  bookId: number
  chapter: number
  verse: number
  /** Nombre de color de la paleta cerrada, no un hex. Ver COLORES. */
  color: string
  updatedAt: string
}

export interface NoteRecord {
  id: number
  bookId: number
  chapter: number
  verse: number
  body: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Aparato de estudio (referencias cruzadas y concordancia Strong)
// ---------------------------------------------------------------------------

/** Un destino de referencia cruzada. `end` solo viene cuando es un rango. */
export interface CrossRefItem {
  bookId: number
  chapter: number
  verse: number
  end: { bookId: number; chapter: number; verse: number } | null
  /**
   * Votos del dataset original (TSK / openbible.info): cuanta gente considero
   * buena la relacion. Sirve para ordenar, no es una medida de autoridad.
   */
  votes: number
}

/** Un versiculo donde aparece un codigo Strong. */
export interface OccurrenceItem {
  bookId: number
  chapter: number
  verse: number
  /** Veces que el codigo aparece dentro de ESE versiculo. */
  hits: number
  /** Texto del versiculo. Solo viene si la consulta indico una version. */
  text?: string
}
