import { Request, Response } from 'express'
import { queryOne } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { buildPublicUrl, STORAGE_PREFIXES } from '@config/storage.config.js'
import { CACHE_CONTROL, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { StrongParams } from '@validators/bible.schema.js'
import { StrongEntry } from '@apptypes/index.js'

/**
 * URL pública del mp3.
 *
 * A diferencia de music-api, aquí NO se firma la URL: el audio de `G2424` es
 * público e inmutable. Una presigned URL cambia su query string en cada
 * petición, lo que impide que el CDN y el navegador la cacheen, y obliga a un
 * round-trip extra a la API antes de poder reproducir.
 */
const resolveAudioUrl = (language: string, audioKey: string | null): string | null => {
  if (!audioKey) return null
  const prefix = language === 'greek' ? STORAGE_PREFIXES.audioGreek : STORAGE_PREFIXES.audioHebrew
  return buildPublicUrl(`${prefix}/${audioKey}`)
}

/** GET /api/strongs/:code  — ej. /api/strongs/G2424 */
export const getStrong = async (_req: Request, res: Response): Promise<void> => {
  const { code } = validated<StrongParams>(res, 'params')

  const row = await queryOne(
    `SELECT code, language, number, title, lemma, transliteration, pronunciation, definition, audio_key
       FROM Strongs WHERE code = ?`,
    [code]
  )

  if (!row) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, MESSAGES.STRONGS.NOT_FOUND)
  }

  const language = String(row.language) === 'greek' ? 'greek' : 'hebrew'
  const audioKey = row.audio_key === null ? null : String(row.audio_key)

  const data: StrongEntry = {
    code: String(row.code),
    language,
    number: Number(row.number),
    lemma: row.lemma === null ? null : String(row.lemma),
    transliteration: row.transliteration === null ? null : String(row.transliteration),
    pronunciation: row.pronunciation === null ? null : String(row.pronunciation),
    definition: row.definition === null ? null : String(row.definition),
    title: row.title === null ? null : String(row.title),
    audioUrl: resolveAudioUrl(language, audioKey)
  }

  sendSuccess({ res, data, cache: CACHE_CONTROL.IMMUTABLE })
}

/**
 * GET /api/strongs/:code/audio — redirect 302 al mp3 público.
 *
 * La UI normalmente usa el `audioUrl` que ya viene en `getStrong` (cero saltos).
 * Este endpoint existe como URL estable por si el bucket cambia de dominio.
 */
export const getStrongAudio = async (_req: Request, res: Response): Promise<void> => {
  const { code } = validated<StrongParams>(res, 'params')

  const row = await queryOne('SELECT language, audio_key FROM Strongs WHERE code = ?', [code])
  if (!row) throw new HttpError(HTTP_STATUS.NOT_FOUND, MESSAGES.STRONGS.NOT_FOUND)

  const language = String(row.language) === 'greek' ? 'greek' : 'hebrew'
  const audioKey = row.audio_key === null ? null : String(row.audio_key)
  const url = resolveAudioUrl(language, audioKey)

  if (!url) {
    throw new HttpError(
      HTTP_STATUS.NOT_FOUND,
      audioKey ? MESSAGES.STRONGS.STORAGE_DISABLED : MESSAGES.STRONGS.AUDIO_NOT_FOUND
    )
  }

  res.setHeader('Cache-Control', CACHE_CONTROL.IMMUTABLE)
  res.redirect(302, url)
}
