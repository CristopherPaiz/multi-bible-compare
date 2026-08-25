import { Request, Response } from 'express'
import { query, placeholders } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { decodeChapterBody, toBuffer, versesToRecord } from '@utils/compress.helper.js'
import { CACHE_CONTROL, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { ChaptersQuery, VersesQuery, ChapterParams } from '@validators/bible.schema.js'
import { ChapterPayload, MultiChapterResponse, VersePayload } from '@apptypes/index.js'
import { Row } from '@libsql/client'

/**
 * Descomprime una fila de Chapters a su payload.
 *
 * El gunzip cuesta CPU, pero un capitulo son ~2 KB comprimidos: a esa escala es
 * ruido frente al round-trip de red que nos ahorramos.
 */
const rowToPayload = async (row: Row): Promise<ChapterPayload | null> => {
  const body = toBuffer(row.body)
  if (!body) return null

  const verses = await decodeChapterBody(body)

  return {
    bibleId: Number(row.bible_id),
    bookId: Number(row.book_id),
    chapter: Number(row.chapter),
    verseCount: Number(row.verse_count),
    verses: versesToRecord(verses)
  }
}

/**
 * GET /api/chapters?bibles=1,34,75&book=43&chapter=3
 *
 * ESTE es el endpoint que justifica todo el backend.
 *
 * Antes: la UI montaba un <VerseWindow> por version y cada uno hacia su propio
 * fetch a raw.githubusercontent -> 20 versiones = 20 round-trips con rate limit.
 * Ahora: un solo SELECT ... IN (...) resuelve las 20 de un golpe.
 *
 * El indice idx_chapters_lookup(book_id, chapter, bible_id) hace que las N
 * versiones caigan en un rango contiguo del indice en vez de N busquedas sueltas.
 */
export const getChapters = async (_req: Request, res: Response): Promise<void> => {
  const { bibles, book, chapter } = validated<ChaptersQuery>(res, 'query')

  const rows = await query(
    `SELECT bible_id, book_id, chapter, verse_count, body
       FROM Chapters
      WHERE book_id = ? AND chapter = ? AND bible_id IN (${placeholders(bibles.length)})`,
    [book, chapter, ...bibles]
  )

  const decoded = await Promise.all(rows.map(rowToPayload))
  const chapters = decoded.filter((item): item is ChapterPayload => item !== null)

  // Se mantiene el orden en que la UI pidió las versiones; SQLite devuelve en
  // orden de índice, que no tiene por qué coincidir.
  const byId = new Map(chapters.map((item) => [item.bibleId, item]))
  const ordered = bibles.map((id) => byId.get(id)).filter((item): item is ChapterPayload => item !== undefined)
  const missing = bibles.filter((id) => !byId.has(id))

  const payload: MultiChapterResponse = { bookId: book, chapter, chapters: ordered, missing }

  sendSuccess({ res, data: payload, cache: CACHE_CONTROL.IMMUTABLE, message: `${ordered.length} versión(es).` })
}

/** GET /api/chapters/:bibleId/:bookId/:chapter — una sola versión. */
export const getSingleChapter = async (_req: Request, res: Response): Promise<void> => {
  const { bibleId, bookId, chapter } = validated<ChapterParams>(res, 'params')

  const rows = await query(
    `SELECT bible_id, book_id, chapter, verse_count, body
       FROM Chapters
      WHERE book_id = ? AND chapter = ? AND bible_id = ?`,
    [bookId, chapter, bibleId]
  )

  if (rows.length === 0) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, MESSAGES.BIBLE.NOT_FOUND)
  }

  const payload = await rowToPayload(rows[0])
  if (!payload) throw new HttpError(HTTP_STATUS.NOT_FOUND, MESSAGES.BIBLE.NOT_FOUND)

  sendSuccess({ res, data: payload, cache: CACHE_CONTROL.IMMUTABLE })
}

/**
 * GET /api/verses?bibles=1,34&book=43&chapter=3&verse=16
 *
 * Mismo capitulo comprimido, pero recorta al versiculo pedido. Es lo que usa la
 * vista de comparación: un versículo, N traducciones.
 */
export const getVerses = async (_req: Request, res: Response): Promise<void> => {
  const { bibles, book, chapter, verse } = validated<VersesQuery>(res, 'query')

  const rows = await query(
    `SELECT bible_id, book_id, chapter, verse_count, body
       FROM Chapters
      WHERE book_id = ? AND chapter = ? AND bible_id IN (${placeholders(bibles.length)})`,
    [book, chapter, ...bibles]
  )

  const results: VersePayload[] = []

  for (const row of rows) {
    const body = toBuffer(row.body)
    if (!body) continue

    const verses = await decodeChapterBody(body)
    const text = verses[verse - 1]
    if (text === undefined || text === '') continue

    results.push({
      bibleId: Number(row.bible_id),
      bookId: Number(row.book_id),
      chapter: Number(row.chapter),
      verse,
      text
    })
  }

  const byId = new Map(results.map((item) => [item.bibleId, item]))
  const ordered = bibles.map((id) => byId.get(id)).filter((item): item is VersePayload => item !== undefined)

  sendSuccess({
    res,
    data: { bookId: book, chapter, verse, verses: ordered, missing: bibles.filter((id) => !byId.has(id)) },
    cache: CACHE_CONTROL.IMMUTABLE
  })
}
