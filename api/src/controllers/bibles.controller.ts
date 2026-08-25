import { Request, Response } from 'express'
import { query } from '@database/connection.js'
import { validated } from '@middlewares/validate.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { CACHE_CONTROL } from '@config/constants.js'
import { BiblesQuery } from '@validators/bible.schema.js'
import { BibleVersion, BookMeta } from '@apptypes/index.js'

/** GET /api/bibles — catálogo de versiones disponibles. */
export const listBibles = async (_req: Request, res: Response): Promise<void> => {
  const { language, searchable } = validated<BiblesQuery>(res, 'query')

  const conditions: string[] = []
  const args: (string | number)[] = []

  if (language) {
    conditions.push('language = ?')
    args.push(language)
  }
  if (searchable !== undefined) {
    conditions.push('searchable = ?')
    args.push(searchable ? 1 : 0)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query(
    `SELECT id, slug, name, language, year, has_strongs, has_old, has_new, searchable, sort_order, legacy_path
       FROM Bibles ${where}
      ORDER BY sort_order, name`,
    args
  )

  const data: BibleVersion[] = rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    language: String(row.language),
    year: row.year === null ? null : Number(row.year),
    hasStrongs: Number(row.has_strongs) === 1,
    hasOldTestament: Number(row.has_old) === 1,
    hasNewTestament: Number(row.has_new) === 1,
    searchable: Number(row.searchable) === 1,
    sortOrder: Number(row.sort_order),
    legacyPath: row.legacy_path === null ? null : String(row.legacy_path)
  }))

  sendSuccess({ res, data, cache: CACHE_CONTROL.CATALOG, message: `${data.length} versión(es).` })
}

/**
 * GET /api/books — metadata estructural de los 66 libros.
 * Los NOMBRES no vienen de aquí: ya están traducidos en la UI (i18n book1..book66).
 */
export const listBooks = async (_req: Request, res: Response): Promise<void> => {
  const rows = await query('SELECT id, testament, chapter_count FROM Books ORDER BY id')

  const data: BookMeta[] = rows.map((row) => ({
    id: Number(row.id),
    testament: String(row.testament) === 'old' ? 'old' : 'new',
    chapterCount: Number(row.chapter_count)
  }))

  sendSuccess({ res, data, cache: CACHE_CONTROL.CATALOG })
}
