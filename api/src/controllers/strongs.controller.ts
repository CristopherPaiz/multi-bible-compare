import { Request, Response } from 'express'
import { placeholders, query, queryOne } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { buildPublicUrl, STORAGE_PREFIXES } from '@config/storage.config.js'
import { CACHE_CONTROL, HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { StrongParams, StrongQuery, StrongsSearchQuery } from '@validators/bible.schema.js'
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

/**
 * GET /api/strongs/:code?lang=es|en  — ej. /api/strongs/G2424?lang=en
 *
 * La palabra (lema, transliteracion, pronunciacion, audio) sale de `Strongs`,
 * porque es la misma se lea en el idioma que se lea. Solo la DEFINICION viene
 * de `StrongsI18n`.
 *
 * Si el idioma pedido no tiene esa entrada, se responde en espanol y se dice en
 * `definitionLang`. Devolver la ficha sin definicion seria peor: la palabra ya
 * es util, y el cliente puede avisar de que el texto no esta traducido.
 */
export const getStrong = async (_req: Request, res: Response): Promise<void> => {
  const { code } = validated<StrongParams>(res, 'params')
  const { lang } = validated<StrongQuery>(res, 'query')

  const row = await queryOne(
    `SELECT code, language, number, title, lemma, transliteration, pronunciation, definition, audio_key
       FROM Strongs WHERE code = ?`,
    [code]
  )

  if (!row) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, MESSAGES.STRONGS.NOT_FOUND)
  }

  /*
   * Se piden las DOS de golpe (la del idioma y la de respaldo) en una sola
   * consulta: pedir primero una y, si falla, la otra, seria un segundo viaje a
   * la base justo en el caso en que el usuario ya esta esperando.
   *
   * La tabla puede no existir todavia si no se ha corrido `strongs-i18n`; en
   * ese caso se usa la definicion que `Strongs` sigue teniendo.
   */
  let traducciones: Awaited<ReturnType<typeof query>> = []
  try {
    traducciones = await query('SELECT lang, definition, derivation, kjv_def FROM StrongsI18n WHERE code = ? AND lang IN (?, ?)', [code, lang, 'es'])
  } catch (error) {
    if (!(error instanceof Error && /no such table/i.test(error.message))) throw error
  }

  const pedida = traducciones.find((fila) => String(fila.lang) === lang)
  const respaldo = traducciones.find((fila) => String(fila.lang) === 'es')
  const elegida = pedida ?? respaldo

  const language = String(row.language) === 'greek' ? 'greek' : 'hebrew'
  const audioKey = row.audio_key === null ? null : String(row.audio_key)

  const data: StrongEntry = {
    code: String(row.code),
    language,
    number: Number(row.number),
    lemma: row.lemma === null ? null : String(row.lemma),
    transliteration: row.transliteration === null ? null : String(row.transliteration),
    pronunciation: row.pronunciation === null ? null : String(row.pronunciation),
    definition: elegida ? String(elegida.definition) : row.definition === null ? null : String(row.definition),
    definitionLang: pedida ? lang : 'es',
    derivation: elegida?.derivation === null || elegida?.derivation === undefined ? null : String(elegida.derivation),
    kjvDef: elegida?.kjv_def === null || elegida?.kjv_def === undefined ? null : String(elegida.kjv_def),
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
 * Debe coincidir con `codigoARowid` en migrate.mjs:
 *
 *     rowid = idiomaLectura * 1e6 + (G=1|H=2) * 1e5 + numero
 *
 * Dos ejes en un entero. FTS5 contentless solo devuelve un rowid, asi que el
 * rowid ES la clave: no hay tabla contra la que hacer JOIN.
 */
const STRONG_ESPACIO = 100000
const STRONG_ESPACIO_LANG = 1000000

/** Se descarta el idioma de lectura: el codigo es el mismo en todos. */
const rowidACodigo = (rowid: number): string => {
  const sinIdioma = rowid % STRONG_ESPACIO_LANG
  return `${Math.floor(sinIdioma / STRONG_ESPACIO) === 1 ? 'G' : 'H'}${sinIdioma % STRONG_ESPACIO}`
}

/**
 * Rango [desde, hasta) que cubre un idioma de lectura y, si se indica, solo su
 * parte griega o hebrea.
 *
 * Filtrar por rango es lo que hace que las dos dimensiones salgan gratis: sin
 * el empaquetado haria falta una tabla auxiliar que el indice no tiene.
 */
const rangoRowid = (lang: 'es' | 'en', original?: 'greek' | 'hebrew'): [number, number] => {
  const base = (lang === 'en' ? 2 : 1) * STRONG_ESPACIO_LANG
  if (!original) return [base, base + STRONG_ESPACIO_LANG]
  const desde = base + (original === 'greek' ? 1 : 2) * STRONG_ESPACIO
  return [desde, desde + STRONG_ESPACIO]
}

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
  const { q, language, lang, page, limit } = validated<StrongsSearchQuery>(res, 'query')

  const expresion = aExpresionFts(q)
  if (!expresion) {
    sendSuccess({ res, data: { data: [], pagination: { page, limit, total: 0, totalPages: 1 } } })
    return
  }

  /*
   * El rango SIEMPRE acota el idioma de lectura, aunque no se filtre por
   * griego/hebreo: sin eso, buscar "amor" devolveria la misma entrada dos
   * veces, una por cada idioma en que esta indexada.
   */
  const [desde, hasta] = rangoRowid(lang, language)
  const filtro = 'AND rowid >= ? AND rowid < ?'
  const argsRango = [desde, hasta]

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

  /*
   * La definicion se saca de la tabla por idioma con un LEFT JOIN, y se cae a
   * la de `Strongs` cuando falta. Un INNER JOIN escondería resultados que el
   * indice SI encontro, que es la peor forma de fallar: el contador diria 40 y
   * la lista mostraria 37.
   */
  const entradas = await query(
    `SELECT s.code, s.language, s.number, s.title, s.lemma, s.transliteration, s.pronunciation,
            COALESCE(i.definition, s.definition) AS definition,
            CASE WHEN i.definition IS NULL THEN 'es' ELSE ? END AS definition_lang
       FROM Strongs s
       LEFT JOIN StrongsI18n i ON i.code = s.code AND i.lang = ?
      WHERE s.code IN (${placeholders(codigos.length)})`,
    [lang, lang, ...codigos]
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
      // Puede no coincidir con lo pedido: 21 entradas del diccionario original
      // no traen texto y se sirven en español.
      definitionLang: String(fila.definition_lang) === 'en' ? ('en' as const) : ('es' as const),
      audioUrl: null
    }))

  sendSuccess({
    res,
    data: { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
    cache: CACHE_CONTROL.IMMUTABLE,
    message: `${total} entrada(s).`
  })
}
