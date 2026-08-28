import { Request, Response } from 'express'
import { query, queryOne } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { decodeChapterBody, toBuffer } from '@utils/compress.helper.js'
import { packRef, unpackRef } from '@utils/reference.helper.js'
import { CACHE_CONTROL } from '@config/constants.js'
import { CrossRefsQuery, OccurrencesQuery, StrongParams } from '@validators/bible.schema.js'
import { CrossRefItem, OccurrenceItem, Paginated } from '@apptypes/index.js'

/**
 * Aparato de estudio: referencias cruzadas y concordancia inversa de Strong.
 *
 * Las dos tablas que consulta (`CrossRefs`, `StrongOccurrences`) las llenan
 * comandos de `migrate.mjs`, que son opcionales. En una base que no haya pasado
 * por el `schema` nuevo las tablas NO EXISTEN, y ahi SQLite no devuelve cero
 * filas: lanza `no such table`, que sin tratar sale como un 500.
 *
 * Un 500 dice "el servidor esta roto" cuando lo cierto es "esta funcion no esta
 * instalada". Se distingue: si falta la tabla se responde lista vacia, la UI
 * dice que no hay datos y el resto de la app sigue igual. Cualquier OTRO error
 * de base sube como error de verdad, que es lo que debe hacer.
 */

/** `true` solo para el fallo de tabla ausente, no para cualquier fallo de SQL. */
const esTablaAusente = (error: unknown): boolean =>
  error instanceof Error && /no such table/i.test(error.message)

/**
 * GET /api/crossrefs?book=43&chapter=3&verse=16
 *
 * El indice `idx_crossrefs_from(from_ref, votes DESC)` cubre la consulta
 * entera: se entra por igualdad en `from_ref` y el orden por votos ya viene
 * dado, asi que no hay ordenacion en memoria aunque el versiculo tenga
 * cientos de referencias.
 */
export const getCrossRefs = async (_req: Request, res: Response): Promise<void> => {
  const { book, chapter, verse, limit } = validated<CrossRefsQuery>(res, 'query')

  let rows
  try {
    rows = await query(
      `SELECT to_ref, to_end, votes
         FROM CrossRefs
        WHERE from_ref = ?
        ORDER BY votes DESC
        LIMIT ?`,
      [packRef(book, chapter, verse), limit]
    )
  } catch (error) {
    if (!esTablaAusente(error)) throw error
    sendSuccess({ res, data: [], cache: CACHE_CONTROL.PRIVATE, message: 'Referencias cruzadas no instaladas.' })
    return
  }

  const data: CrossRefItem[] = rows.map((row) => {
    const destino = unpackRef(Number(row.to_ref))
    const finCrudo = row.to_end === null || row.to_end === undefined ? null : Number(row.to_end)
    return {
      ...destino,
      end: finCrudo === null ? null : unpackRef(finCrudo),
      votes: Number(row.votes)
    }
  })

  sendSuccess({ res, data, cache: CACHE_CONTROL.IMMUTABLE, message: `${data.length} referencia(s).` })
}

/**
 * GET /api/strongs/:code/occurrences?bible=75&page=1&limit=25
 *
 * La concordancia sale de recorrer una sola vez el markup `<sup>` que ya vivia
 * dentro del texto, asi que "donde mas aparece G26" no costo datos nuevos.
 *
 * El texto de cada versiculo es OPCIONAL y va detras de `bible`: adjuntarlo
 * obliga a descomprimir un capitulo por resultado. Con el tope de 50 por pagina
 * eso son 50 gunzip de ~2 KB, que es asumible; sin tope no lo seria.
 */
export const getStrongOccurrences = async (_req: Request, res: Response): Promise<void> => {
  const { code } = validated<StrongParams>(res, 'params')
  const { bible, page, limit } = validated<OccurrencesQuery>(res, 'query')

  let total: number
  let rows
  try {
    total = Number((await queryOne('SELECT COUNT(*) AS n FROM StrongOccurrences WHERE code = ?', [code]))?.n ?? 0)

    rows = await query(
      `SELECT ref, hits FROM StrongOccurrences
        WHERE code = ?
        ORDER BY ref
        LIMIT ? OFFSET ?`,
      [code, limit, (page - 1) * limit]
    )
  } catch (error) {
    if (!esTablaAusente(error)) throw error
    sendSuccess({
      res,
      data: { data: [], pagination: { page, limit, total: 0, totalPages: 1 } },
      cache: CACHE_CONTROL.PRIVATE,
      message: 'Concordancia no instalada.'
    })
    return
  }

  const items: OccurrenceItem[] = rows.map((row) => ({
    ...unpackRef(Number(row.ref)),
    hits: Number(row.hits)
  }))

  if (bible && items.length > 0) {
    /*
     * Se piden los capitulos DISTINTOS, no uno por resultado. Una concordancia
     * suele traer varios versiculos del mismo capitulo (Salmo 119 aparece
     * entero para codigos comunes), y sin deduplicar se descomprimiria el mismo
     * blob una y otra vez.
     */
    const claves = new Map<string, { bookId: number; chapter: number }>()
    for (const item of items) claves.set(`${item.bookId}:${item.chapter}`, { bookId: item.bookId, chapter: item.chapter })

    const condiciones = [...claves.values()].map(() => '(book_id = ? AND chapter = ?)').join(' OR ')
    const args = [...claves.values()].flatMap((clave) => [clave.bookId, clave.chapter])

    const capitulos = await query(
      `SELECT book_id, chapter, body FROM Chapters WHERE bible_id = ? AND (${condiciones})`,
      [bible, ...args]
    )

    const textos = new Map<string, string[]>()
    for (const fila of capitulos) {
      const body = toBuffer(fila.body)
      if (!body) continue
      textos.set(`${Number(fila.book_id)}:${Number(fila.chapter)}`, await decodeChapterBody(body))
    }

    for (const item of items) {
      const versiculos = textos.get(`${item.bookId}:${item.chapter}`)
      const texto = versiculos?.[item.verse - 1]
      if (texto) item.text = texto
    }
  }

  const payload: Paginated<OccurrenceItem> = {
    data: items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  }

  sendSuccess({ res, data: payload, cache: CACHE_CONTROL.IMMUTABLE, message: `${total} aparición(es).` })
}
