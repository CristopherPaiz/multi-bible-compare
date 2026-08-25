import { z } from 'zod'
import { BIBLE } from '@config/constants.js'

export const favoritesSchema = z.object({
  bibleIds: z
    .array(z.number().int().positive())
    .max(BIBLE.MAX_VERSIONS_PER_QUERY, `Máximo ${BIBLE.MAX_VERSIONS_PER_QUERY} favoritos.`)
})
export type FavoritesInput = z.infer<typeof favoritesSchema>

export const historyEntrySchema = z.object({
  bibleIds: z.array(z.number().int().positive()).min(1).max(BIBLE.MAX_VERSIONS_PER_QUERY),
  bookId: z.number().int().min(1).max(BIBLE.TOTAL_BOOKS),
  chapter: z.number().int().min(1).max(150),
  verse: z.number().int().min(1).max(200).nullable().optional()
})
export type HistoryEntryInput = z.infer<typeof historyEntrySchema>
