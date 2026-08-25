import { z } from 'zod'
import { BIBLE, SEARCH } from '@config/constants.js'

/**
 * Lista "1,34,75" -> [1, 34, 75].
 *
 * Se valida el formato con regex ANTES de convertir, para que un valor basura
 * dé un 400 claro en vez de colarse como NaN hasta el SQL. Después se deduplica
 * y se topa el tamaño: sin ese tope, alguien puede pedir 5000 versiones y
 * convertir un `IN (...)` en un escaneo carísimo.
 */
const bibleIdList = z
  .string()
  .trim()
  .regex(/^\d+(,\d+)*$/, 'Formato inválido. Use una lista como "1,34,75".')
  .transform((raw) => Array.from(new Set(raw.split(',').map((part) => Number(part)))))
  .refine((ids) => ids.every((id) => id > 0), 'Los identificadores de versión deben ser positivos.')
  .refine((ids) => ids.length > 0, 'Debe indicar al menos una versión.')
  .refine(
    (ids) => ids.length <= BIBLE.MAX_VERSIONS_PER_QUERY,
    `Máximo ${BIBLE.MAX_VERSIONS_PER_QUERY} versiones por consulta.`
  )

const bookId = z.coerce.number().int().min(1).max(BIBLE.TOTAL_BOOKS)
const chapterNumber = z.coerce.number().int().min(1).max(150)
const verseNumber = z.coerce.number().int().min(1).max(200)

export const chaptersQuerySchema = z.object({
  bibles: bibleIdList,
  book: bookId,
  chapter: chapterNumber
})
export type ChaptersQuery = z.infer<typeof chaptersQuerySchema>

export const versesQuerySchema = z.object({
  bibles: bibleIdList,
  book: bookId,
  chapter: chapterNumber,
  verse: verseNumber
})
export type VersesQuery = z.infer<typeof versesQuerySchema>

export const chapterParamsSchema = z.object({
  bibleId: z.coerce.number().int().positive(),
  bookId,
  chapter: chapterNumber
})
export type ChapterParams = z.infer<typeof chapterParamsSchema>

export const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH.MIN_QUERY_LENGTH, `Mínimo ${SEARCH.MIN_QUERY_LENGTH} caracteres.`).max(200),
  bibles: bibleIdList.optional(),
  book: bookId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(SEARCH.MAX_LIMIT).default(SEARCH.DEFAULT_LIMIT)
})
export type SearchQuery = z.infer<typeof searchQuerySchema>

/** Código Strong: G2424 / H0430. Se normaliza a mayúscula. */
export const strongParamsSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[GHgh]\d{1,5}$/, 'Formato inválido. Use G2424 o H0430.')
    .transform((value) => value.toUpperCase())
})
export type StrongParams = z.infer<typeof strongParamsSchema>

export const biblesQuerySchema = z.object({
  language: z.string().trim().min(2).max(40).optional(),
  searchable: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true'))
})
export type BiblesQuery = z.infer<typeof biblesQuerySchema>
