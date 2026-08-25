import { Response } from 'express'
import { getDb, query } from '@database/connection.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { CACHE_CONTROL, HISTORY, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { FavoritesInput, HistoryEntryInput } from '@validators/user.schema.js'
import { AuthenticatedRequest, HistoryEntry } from '@apptypes/index.js'

const requireUserId = (req: AuthenticatedRequest): number => {
  const userId = req.user?.userId
  if (!userId) throw new HttpError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED)
  return userId
}

/**
 * GET /api/user/favorites
 * Hoy los favoritos mueren en localStorage. Con esto sobreviven al cambio de
 * dispositivo, que es media razón de tener backend.
 */
export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)

  const rows = await query('SELECT bible_id FROM UserFavorites WHERE user_id = ? ORDER BY sort_order', [userId])

  sendSuccess({ res, data: rows.map((row) => Number(row.bible_id)), cache: CACHE_CONTROL.PRIVATE })
}

/**
 * PUT /api/user/favorites — reemplaza la lista completa.
 *
 * Se hace en un `batch` transaccional: si algo falla a media escritura, el
 * usuario no se queda sin favoritos.
 */
export const setFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)
  const { bibleIds } = req.body as FavoritesInput

  const db = await getDb()
  await db.batch(
    [
      { sql: 'DELETE FROM UserFavorites WHERE user_id = ?', args: [userId] },
      ...bibleIds.map((bibleId, index) => ({
        sql: 'INSERT INTO UserFavorites (user_id, bible_id, sort_order) VALUES (?, ?, ?)',
        args: [userId, bibleId, index]
      }))
    ],
    'write'
  )

  sendSuccess({ res, data: bibleIds, message: 'Favoritos actualizados.' })
}

/** GET /api/user/history */
export const getHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)

  const rows = await query(
    `SELECT id, bible_ids, book_id, chapter, verse, created_at
       FROM UserHistory WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?`,
    [userId, HISTORY.MAX_ENTRIES]
  )

  const data: HistoryEntry[] = rows.map((row) => ({
    id: Number(row.id),
    bibleIds: String(row.bible_ids)
      .split(',')
      .map(Number)
      .filter(Number.isFinite),
    bookId: Number(row.book_id),
    chapter: Number(row.chapter),
    verse: row.verse === null ? null : Number(row.verse),
    createdAt: String(row.created_at)
  }))

  sendSuccess({ res, data, cache: CACHE_CONTROL.PRIVATE })
}

/** POST /api/user/history */
export const addHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)
  const { bibleIds, bookId, chapter, verse } = req.body as HistoryEntryInput

  const db = await getDb()
  const result = await db.execute({
    sql: 'INSERT INTO UserHistory (user_id, bible_ids, book_id, chapter, verse) VALUES (?, ?, ?, ?, ?)',
    args: [userId, bibleIds.join(','), bookId, chapter, verse ?? null]
  })

  // Poda: se conservan las últimas MAX_ENTRIES entradas y se borra el resto,
  // para que la tabla no crezca sin techo.
  await db.execute({
    sql: `DELETE FROM UserHistory
           WHERE user_id = ?
             AND id NOT IN (SELECT id FROM UserHistory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)`,
    args: [userId, userId, HISTORY.MAX_ENTRIES]
  })

  sendSuccess({ res, status: HTTP_STATUS.CREATED, data: { id: Number(result.lastInsertRowid) } })
}

/** DELETE /api/user/history */
export const clearHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = requireUserId(req)

  const db = await getDb()
  await db.execute({ sql: 'DELETE FROM UserHistory WHERE user_id = ?', args: [userId] })

  sendSuccess({ res, message: 'Historial borrado.' })
}
