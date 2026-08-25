import { Request, Response } from 'express'
import { query } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { decodeChapterBody, toBuffer } from '@utils/compress.helper.js'
import { bibleRowidRange, decodeReference, stripStrongMarkup } from '@utils/reference.helper.js'
import { CACHE_CONTROL, SEARCH } from '@config/constants.js'
import { SearchQuery } from '@validators/bible.schema.js'
import { Paginated, SearchHit } from '@apptypes/index.js'

/**
 * Convierte lo que escribe el usuario en una consulta FTS5 segura.
 *
 * FTS5 tiene sintaxis propia (`AND`, `OR`, `NEAR`, `*`, `"..."`, `-`). Pasar el
 * texto crudo hace que alguien que escriba `amor "de` provoque un error de
 * sintaxis de SQLite. Se cita cada termino: quedan literales y se exigen todos.
 */
const toMatchExpression = (raw: string): string =>
  raw
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(' ')

/** Quita acentos y baja a minusculas, igual que hace el tokenizer del indice. */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * Arma el fragmento con `<mark>` alrededor de las coincidencias.
 *
 * El indice es contentless, asi que `snippet()` de FTS5 no esta disponible — no
 * guarda el texto. Se genera aqui a partir del versiculo real.
 */
const buildSnippet = (text: string, terms: string[]): string => {
  const folded = fold(text)
  const positions = terms
    .map((term) => folded.indexOf(fold(term)))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)

  const CONTEXT = 90
  const start = positions.length > 0 ? Math.max(0, positions[0] - CONTEXT / 2) : 0
  const end = Math.min(text.length, start + CONTEXT * 2)

  let fragment = text.slice(start, end)
  if (start > 0) fragment = `…${fragment}`
  if (end < text.length) fragment = `${fragment}…`

  // Se marca sobre el fragmento ya recortado, comparando sin acentos para que
  // buscar "corazon" resalte "corazón".
  const foldedFragment = fold(fragment)

  // FTS5 empareja tokens completos, asi que el resaltado tiene que hacer lo
  // mismo. Sin este chequeo, buscar "de" marcaba "en<mark>de</mark>rece".
  const isWordChar = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char)

  const ranges: Array<[number, number]> = []
  for (const term of terms) {
    const needle = fold(term)
    if (!needle) continue
    let from = 0
    for (;;) {
      const at = foldedFragment.indexOf(needle, from)
      if (at < 0) break
      const end = at + needle.length
      if (!isWordChar(foldedFragment[at - 1]) && !isWordChar(foldedFragment[end])) {
        ranges.push([at, end])
      }
      from = at + 1
    }
  }
  if (ranges.length === 0) return fragment

  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1])
    } else {
      merged.push([range[0], range[1]])
    }
  }

  let output = ''
  let cursor = 0
  for (const [from, to] of merged) {
    output += fragment.slice(cursor, from) + '<mark>' + fragment.slice(from, to) + '</mark>'
    cursor = to
  }
  return output + fragment.slice(cursor)
}

/**
 * GET /api/search?q=amor&bibles=34&book=43&page=1
 *
 * Flujo:
 *  1. FTS5 devuelve rowids rankeados por bm25.
 *  2. El rowid YA es la referencia (biblia/libro/capitulo/versiculo) — sin JOIN.
 *  3. Se traen solo los capitulos de la pagina actual y se recorta el versiculo.
 *
 * Filtrar por una version es un rango de rowid (`BETWEEN`), no un escaneo.
 */
export const search = async (_req: Request, res: Response): Promise<void> => {
  const { q, bibles, book, page, limit } = validated<SearchQuery>(res, 'query')

  const terms = q.split(/\s+/).filter(Boolean)
  const match = toMatchExpression(q)

  const conditions: string[] = ['SearchIndex MATCH ?']
  const args: (string | number)[] = [match]

  if (bibles && bibles.length > 0) {
    const ranges = bibles.map(() => '(rowid BETWEEN ? AND ?)')
    conditions.push(`(${ranges.join(' OR ')})`)
    for (const bibleId of bibles) {
      const { lo, hi } = bibleRowidRange(bibleId)
      args.push(lo, hi)
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const countRows = await query(`SELECT COUNT(*) AS total FROM SearchIndex ${where}`, args)
  const rawTotal = countRows[0] ? Number(countRows[0].total) : 0

  // El filtro por libro no se puede expresar como rango de rowid (los libros de
  // una biblia no son contiguos para un MATCH dado), asi que se aplica despues.
  // Se pide un margen extra para que la pagina se llene igual.
  const needsBookFilter = book !== undefined
  const fetchLimit = needsBookFilter ? Math.min(SEARCH.MAX_LIMIT * 20, rawTotal) : limit
  const offset = needsBookFilter ? 0 : (page - 1) * limit

  const rows = await query(
    `SELECT rowid AS ref, bm25(SearchIndex) AS score
       FROM SearchIndex ${where}
      ORDER BY bm25(SearchIndex)
      LIMIT ? OFFSET ?`,
    [...args, fetchLimit, offset]
  )

  let refs = rows.map((row) => decodeReference(Number(row.ref)))
  if (needsBookFilter) refs = refs.filter((ref) => ref.bookId === book)

  const total = needsBookFilter ? refs.length : rawTotal
  const pageRefs = needsBookFilter ? refs.slice((page - 1) * limit, page * limit) : refs

  // Se agrupan por capitulo: varios resultados suelen caer en el mismo, y asi se
  // lee cada BLOB una sola vez.
  const wanted = new Map<string, { bibleId: number; bookId: number; chapter: number }>()
  for (const ref of pageRefs) {
    wanted.set(`${ref.bibleId}:${ref.bookId}:${ref.chapter}`, ref)
  }

  const texts = new Map<string, string[]>()
  const chapterList = Array.from(wanted.values())

  if (chapterList.length > 0) {
    const tuples = chapterList.map(() => '(bible_id = ? AND book_id = ? AND chapter = ?)').join(' OR ')
    const tupleArgs: number[] = []
    for (const item of chapterList) tupleArgs.push(item.bibleId, item.bookId, item.chapter)

    const chapterRows = await query(
      `SELECT bible_id, book_id, chapter, body FROM Chapters WHERE ${tuples}`,
      tupleArgs
    )

    for (const row of chapterRows) {
      const body = toBuffer(row.body)
      if (!body) continue
      texts.set(`${Number(row.bible_id)}:${Number(row.book_id)}:${Number(row.chapter)}`, await decodeChapterBody(body))
    }
  }

  const hits: SearchHit[] = pageRefs.map((ref) => {
    const verses = texts.get(`${ref.bibleId}:${ref.bookId}:${ref.chapter}`)
    const raw = verses?.[ref.verse - 1] ?? ''
    return {
      bibleId: ref.bibleId,
      bookId: ref.bookId,
      chapter: ref.chapter,
      verse: ref.verse,
      snippet: buildSnippet(stripStrongMarkup(raw), terms)
    }
  })

  const data: Paginated<SearchHit> = {
    data: hits,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }

  sendSuccess({ res, data, cache: CACHE_CONTROL.CATALOG, message: `${total} resultado(s).` })
}
