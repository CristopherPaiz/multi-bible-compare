import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { BIBLE } from '@config/constants.js'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

/**
 * Serializacion del capitulo.
 *
 * Los versiculos van en un solo string separados por US (\u001f) en vez de JSON.
 * Medido sobre las 140 versiones de Juan: las llaves JSON eran solo el 4.9% del
 * peso, asi que esto NO es la optimizacion importante — el gzip lo es. Pero de
 * paso simplifica el parseo y evita reconstruir un objeto por capitulo.
 *
 * El numero de versiculo es la POSICION en el array (base 1). Si una version se
 * salta un versiculo, el importador debe insertar un string vacio para no
 * desalinear la numeracion.
 */

export const encodeChapterBody = async (verses: string[]): Promise<Buffer> => {
  const joined = verses.join(BIBLE.VERSE_SEPARATOR)
  return gzipAsync(Buffer.from(joined, 'utf8'), { level: 9 })
}

export const decodeChapterBody = async (body: Buffer): Promise<string[]> => {
  const raw = await gunzipAsync(body)
  return raw.toString('utf8').split(BIBLE.VERSE_SEPARATOR)
}

/**
 * `@libsql/client` devuelve los BLOB como ArrayBuffer en Node, pero segun el
 * transporte (HTTP vs WebSocket) puede venir Uint8Array. Normalizamos.
 */
export const toBuffer = (value: unknown): Buffer | null => {
  if (value === null || value === undefined) return null
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return null
}

/**
 * Convierte el array de versiculos al objeto `{ "1": "...", "2": "..." }` que ya
 * consume la UI.
 *
 * Los versiculos vacios SI se incluyen. Algunas versiones traen claves con
 * cadena vacia en el JSON original (p. ej. Quiche, Genesis 1:15) y omitirlas
 * hacia que la respuesta de la API difiriera de la del CDN, rompiendo la
 * equivalencia entre ambas fuentes.
 */
export const versesToRecord = (verses: string[]): Record<string, string> => {
  const record: Record<string, string> = {}
  verses.forEach((text, index) => {
    record[String(index + 1)] = text
  })
  return record
}
