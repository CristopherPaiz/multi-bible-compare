import { Request, Response } from 'express'
import { placeholders, query, queryOne } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { buildPublicUrl, STORAGE_PREFIXES } from '@config/storage.config.js'
import { CACHE_CONTROL, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { StrongParams, StrongsSearchQuery } from '@validators/bible.schema.js'
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

/**
 * Codigo Strong <-> rowid del indice de busqueda.
 *
 * Debe coincidir con `codigoARowid` en migrate.mjs. FTS5 contentless solo
 * devuelve un rowid, asi que el rowid ES la clave: la primera cifra dice el
 * idioma y el resto es el numero.
 */
const STRONG_ESPACIO = 100000

const rowidACodigo = (rowid: number): string =>
  `${Math.floor(rowid / STRONG_ESPACIO) === 1 ? 'G' : 'H'}${rowid % STRONG_ESPACIO}`

/**
 * Convierte lo escrito en una consulta FTS5 segura.
 *
 * Igual que en la busqueda biblica: cada termino se cita para que la sintaxis
 * propia de FTS5 (`AND`, `NEAR`, `*`, `-`) no rompa la consulta cuando alguien
 * escribe `amor "de`.
 *
 * El ultimo termino lleva `*` para que la busqueda encuentre resultados
 * mientras se escribe: con "amo" ya salen "amor" y "amoroso". Solo el ultimo,
 * porque los anteriores son palabras que el usuario ya termino de escribir.
 */
const aExpresionFts = (crudo: string): string => {
  const terminos = crudo.split(/\s+/).filter(Boolean)
  return terminos
    .map((termino, indice) => {
      const citado = `"${termino.replace(/"/g, '""')}"`
      return indice === terminos.length - 1 ? `${citado}*` : citado
    })
    .join(' ')
}

/**
 * GET /api/strongs?q=amor&language=greek&page=1
 *
 * Busca en titulo, lema, transliteracion y definicion a la vez: al usuario le
 * da igual de que campo salio la coincidencia.
 *
 * Si el indice no esta construido (`migrate.mjs strongs-search`) se responde
 * lista vacia en vez de 500: la funcion no esta instalada, el servidor no esta
 * roto, y la UI puede decirlo.
 */
export const searchStrongs = async (_req: Request, res: Response): Promise<void> => {
  const { q, language, page, limit } = validated<StrongsSearchQuery>(res, 'query')

  const expresion = aExpresionFts(q)
  if (!expresion) {
    sendSuccess({ res, data: { data: [], pagination: { page, limit, total: 0, totalPages: 1 } } })
    return
  }

  /*
   * El filtro por idioma es un rango de rowid, no un JOIN: como la primera
   * cifra del rowid codifica el idioma, todas las entradas griegas caen en
   * [100000, 200000) y las hebreas en [200000, 300000).
   */
  const rango = language ? (language === 'greek' ? [STRONG_ESPACIO, 2 * STRONG_ESPACIO] : [2 * STRONG_ESPACIO, 3 * STRONG_ESPACIO]) : null
  const filtro = rango ? 'AND rowid >= ? AND rowid < ?' : ''
  const argsRango = rango ?? []

  let total: number
  let filas
  try {
    total = Number(
      (await queryOne(`SELECT COUNT(*) AS n FROM StrongsIndex WHERE StrongsIndex MATCH ? ${filtro}`, [expresion, ...argsRango]))?.n ?? 0
    )

    filas = await query(
      `SELECT rowid FROM StrongsIndex
        WHERE StrongsIndex MATCH ? ${filtro}
        ORDER BY rank
        LIMIT ? OFFSET ?`,
      [expresion, ...argsRango, limit, (page - 1) * limit]
    )
  } catch (error) {
    // Indice ausente: la busqueda por definicion no esta instalada.
    if (error instanceof Error && /no such table/i.test(error.message)) {
      sendSuccess({ res, data: { data: [], pagination: { page, limit, total: 0, totalPages: 1 } }, message: 'Búsqueda de diccionario no instalada.' })
      return
    }
    // Sintaxis FTS5 que se nos escapo: es culpa de lo escrito, no del servidor.
    if (error instanceof Error && /fts5|syntax/i.test(error.message)) {
      throw new HttpError(HTTP_STATUS.BAD_REQUEST, MESSAGES.SEARCH.QUERY_TOO_SHORT)
    }
    throw error
  }

  const codigos = filas.map((fila) => rowidACodigo(Number(fila.rowid)))

  if (codigos.length === 0) {
    sendSuccess({ res, data: { data: [], pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } })
    return
  }

  const entradas = await query(
    `SELECT code, language, number, title, lemma, transliteration, pronunciation, definition
       FROM Strongs WHERE code IN (${placeholders(codigos.length)})`,
    codigos
  )

  // Se devuelve en el orden del RANKING de FTS5, no en el que SQLite entregue
  // las filas: el mejor resultado tiene que salir primero.
  const porCodigo = new Map(entradas.map((fila) => [String(fila.code), fila]))

  const data = codigos
    .map((code) => porCodigo.get(code))
    .filter((fila): fila is NonNullable<typeof fila> => fila !== undefined)
    .map((fila) => ({
      code: String(fila.code),
      language: String(fila.language) === 'greek' ? ('greek' as const) : ('hebrew' as const),
      number: Number(fila.number),
      title: fila.title === null ? null : String(fila.title),
      lemma: fila.lemma === null ? null : String(fila.lemma),
      transliteration: fila.transliteration === null ? null : String(fila.transliteration),
      pronunciation: fila.pronunciation === null ? null : String(fila.pronunciation),
      definition: fila.definition === null ? null : String(fila.definition),
      audioUrl: null
    }))

  sendSuccess({
    res,
    data: { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
    cache: CACHE_CONTROL.IMMUTABLE,
    message: `${total} entrada(s).`
  })
}
