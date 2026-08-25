import { Router } from 'express'
import { listBibles, listBooks } from '@controllers/bibles.controller.js'
import { getChapters, getSingleChapter, getVerses } from '@controllers/chapters.controller.js'
import { search } from '@controllers/search.controller.js'
import { getStrong, getStrongAudio } from '@controllers/strongs.controller.js'
import { validateQuery, validateParams } from '@middlewares/validate.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'
import {
  biblesQuerySchema,
  chapterParamsSchema,
  chaptersQuerySchema,
  searchQuerySchema,
  strongParamsSchema,
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
router.get('/strongs/:code', validateParams(strongParamsSchema), asyncHandler(getStrong))
router.get('/strongs/:code/audio', validateParams(strongParamsSchema), asyncHandler(getStrongAudio))

export default router
