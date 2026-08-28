import { Response } from 'express'
import { getDb, query } from '@database/connection.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { CACHE_CONTROL, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { HighlightsInput, NotesInput } from '@validators/annotation.schema.js'
import { AuthenticatedRequest, HighlightRecord, NoteRecord } from '@apptypes/index.js'

/**
 * Resaltados y notas del usuario.
 *
 * Los dos endpoints de escritura son PUT masivos que reemplazan el conjunto
 * completo. Es deliberado: el cliente guarda en localStorage y funciona sin
 * cuenta, asi que el servidor no es la fuente de verdad sino la copia que
 * sobrevive al cambio de dispositivo. Sincronizar el conjunto entero resuelve
 * altas, ediciones y borrados con una sola peticion y sin llevar la cuenta de
 * que cambio desde la ultima vez.
 *
 * El reemplazo va en un `batch` transaccional: un fallo a media escritura
 * dejaria al usuario sin sus notas, que es justo lo que no puede pasar con
 * datos que solo existen porque el los escribio.
 */

const requireUserId = (req: AuthenticatedRequest): number => {
  const userId = req.user?.userId
  if (!userId) throw new HttpError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED)
  return userId
}

/** GET /api/user/highlights */
export const getHighlights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)

  const rows = await query(
    `SELECT book_id, chapter, verse, color, updated_at
       FROM UserHighlights WHERE user_id = ?
      ORDER BY book_id, chapter, verse`,
    [userId]
  )

  const data: HighlightRecord[] = rows.map((row) => ({
    bookId: Number(row.book_id),
    chapter: Number(row.chapter),
    verse: Number(row.verse),
    color: String(row.color),
    updatedAt: String(row.updated_at)
  }))

  sendSuccess({ res, data, cache: CACHE_CONTROL.PRIVATE })
}

/** PUT /api/user/highlights — reemplaza el conjunto completo. */
export const setHighlights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)
  const { highlights } = req.body as HighlightsInput

  const db = await getDb()
  await db.batch(
    [
      { sql: 'DELETE FROM UserHighlights WHERE user_id = ?', args: [userId] },
      ...highlights.map((item) => ({
        sql: `INSERT INTO UserHighlights (user_id, book_id, chapter, verse, color)
              VALUES (?, ?, ?, ?, ?)`,
        args: [userId, item.bookId, item.chapter, item.verse, item.color]
      }))
    ],
    'write'
  )

  sendSuccess({ res, data: highlights.length, message: `${highlights.length} resaltado(s) guardado(s).` })
}

/** GET /api/user/notes */
export const getNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)

  const rows = await query(
    `SELECT id, book_id, chapter, verse, body, created_at, updated_at
       FROM UserNotes WHERE user_id = ?
      ORDER BY updated_at DESC`,
    [userId]
  )

  const data: NoteRecord[] = rows.map((row) => ({
    id: Number(row.id),
    bookId: Number(row.book_id),
    chapter: Number(row.chapter),
    verse: Number(row.verse),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }))

  sendSuccess({ res, data, cache: CACHE_CONTROL.PRIVATE })
}

/**
 * PUT /api/user/notes — reemplaza el conjunto completo.
 *
 * Las marcas de tiempo llegan del cliente cuando las tiene. Se respetan en vez
 * de poner `now()` porque una nota escrita hace tres meses en el telefono no
 * debe aparecer como recien creada al sincronizarla desde la laptop; ese orden
 * es justamente por lo que la lista se ordena.
 */
export const setNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)
  const { notes } = req.body as NotesInput

  const ahora = new Date().toISOString()

  const db = await getDb()
  await db.batch(
    [
      { sql: 'DELETE FROM UserNotes WHERE user_id = ?', args: [userId] },
      ...notes.map((note) => ({
        sql: `INSERT INTO UserNotes (user_id, book_id, chapter, verse, body, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, note.bookId, note.chapter, note.verse, note.body, note.createdAt ?? ahora, note.updatedAt ?? ahora]
      }))
    ],
    'write'
  )

  sendSuccess({ res, data: notes.length, message: `${notes.length} nota(s) guardada(s).` })
}
