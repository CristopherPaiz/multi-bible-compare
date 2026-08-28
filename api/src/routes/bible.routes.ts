import { Router } from 'express'
import { listBibles, listBooks } from '@controllers/bibles.controller.js'
import { getChapters, getSingleChapter, getVerses } from '@controllers/chapters.controller.js'
import { search } from '@controllers/search.controller.js'
import { getStrong, getStrongAudio, searchStrongs } from '@controllers/strongs.controller.js'
import { getCrossRefs, getStrongOccurrences } from '@controllers/study.controller.js'
import { validateQuery, validateParams } from '@middlewares/validate.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'
import {
  biblesQuerySchema,
  chapterParamsSchema,
  chaptersQuerySchema,
  crossRefsQuerySchema,
  occurrencesQuerySchema,
  searchQuerySchema,
  strongParamsSchema,
  strongQuerySchema,
  strongsSearchQuerySchema,
  versesQuerySchema
} from '@validators/bible.schema.js'

const router: Router = Router()

// Catálogo
router.get('/bibles', validateQuery(biblesQuerySchema), asyncHandler(listBibles))
router.get('/books', asyncHandler(listBooks))

// Texto — el endpoint multi-versión es el que reemplaza los N fetch de la UI
router.get('/chapters', validateQuery(chaptersQuerySchema), asyncHandler(getChapters))
router.get('/chapters/:bibleId/:bookId/:chapter', validateParams(chapterParamsSchema), asyncHandler(getSingleChapter))
router.get('/verses', validateQuery(versesQuerySchema), asyncHandler(getVerses))

// Búsqueda full-text
router.get('/search', validateQuery(searchQuerySchema), asyncHandler(search))

// Diccionario Strong
// La busqueda va ANTES que /strongs/:code: son rutas distintas (una sin
// parametro), pero declararla primero deja claro que no compiten.
router.get('/strongs', validateQuery(strongsSearchQuerySchema), asyncHandler(searchStrongs))
router.get('/strongs/:code', validateParams(strongParamsSchema), validateQuery(strongQuerySchema), asyncHandler(getStrong))
router.get('/strongs/:code/audio', validateParams(strongParamsSchema), asyncHandler(getStrongAudio))

// Concordancia inversa: en que versiculos aparece el codigo.
router.get(
  '/strongs/:code/occurrences',
  validateParams(strongParamsSchema),
  validateQuery(occurrencesQuerySchema),
  asyncHandler(getStrongOccurrences)
)

// Referencias cruzadas (Treasury of Scripture Knowledge)
router.get('/crossrefs', validateQuery(crossRefsQuerySchema), asyncHandler(getCrossRefs))

export default router
