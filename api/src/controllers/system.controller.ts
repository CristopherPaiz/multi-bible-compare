import { Request, Response } from 'express'
import { queryOne } from '@database/connection.js'
import { sendSuccess } from '@utils/response.helper.js'
import { getServerTimeInfo } from '@utils/datetime.helper.js'
import { isCloudinaryEnabled, isStorageEnabled } from '@config/env.validator.js'
import { CACHE_CONTROL, MESSAGES } from '@config/constants.js'

/** GET /api/system/time — Regla 11: el reloj de referencia es Guatemala. */
export const getTime = (_req: Request, res: Response): void => {
  sendSuccess({ res, data: getServerTimeInfo(), cache: CACHE_CONTROL.PRIVATE })
}

/**
 * GET /api/system/status — health check con verificación real de BD.
 *
 * Sirve además para despertar el servicio: en el plan free de Render el proceso
 * se duerme y el primer request tarda 30-60s. La UI lo llama al arrancar.
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  const startedAt = Date.now()
  const row = await queryOne('SELECT COUNT(*) AS total FROM Bibles')
  const dbLatencyMs = Date.now() - startedAt

  sendSuccess({
    res,
    message: MESSAGES.SERVER.HEALTHY,
    cache: CACHE_CONTROL.PRIVATE,
    data: {
      status: 'ok',
      database: 'connected',
      dbLatencyMs,
      bibleCount: row ? Number(row.total) : 0,
      features: {
        audioStorage: isStorageEnabled(),
        imageUploads: isCloudinaryEnabled()
      },
      time: getServerTimeInfo()
    }
  })
}

/** GET /api/system/stats — tamaño real de lo importado. Útil durante la migración. */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const bibles = await queryOne('SELECT COUNT(*) AS total FROM Bibles')
  const chapters = await queryOne('SELECT COUNT(*) AS total, SUM(LENGTH(body)) AS bytes FROM Chapters')
  const strongs = await queryOne('SELECT COUNT(*) AS total FROM Strongs')
  const searchable = await queryOne('SELECT COUNT(*) AS total FROM SearchVerses')

  const bytes = chapters?.bytes === null || chapters?.bytes === undefined ? 0 : Number(chapters.bytes)

  sendSuccess({
    res,
    cache: CACHE_CONTROL.PRIVATE,
    data: {
      bibles: bibles ? Number(bibles.total) : 0,
      chapters: chapters ? Number(chapters.total) : 0,
      chapterBytes: bytes,
      chapterMegabytes: Number((bytes / 1048576).toFixed(2)),
      strongsEntries: strongs ? Number(strongs.total) : 0,
      indexedVerses: searchable ? Number(searchable.total) : 0
    }
  })
}
