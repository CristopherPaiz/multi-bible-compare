import { Router } from 'express'
import { addHistory, clearHistory, getFavorites, getHistory, setFavorites } from '@controllers/user.controller.js'
import { getHighlights, getNotes, setHighlights, setNotes } from '@controllers/annotations.controller.js'
import { authMiddleware } from '@middlewares/auth.middleware.js'
import { validate } from '@middlewares/validate.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'
import { favoritesSchema, historyEntrySchema } from '@validators/user.schema.js'
import { highlightsSchema, notesSchema } from '@validators/annotation.schema.js'

const router: Router = Router()

// Todo lo de aquí es privado del usuario.
router.use(authMiddleware)

router.get('/favorites', asyncHandler(getFavorites))
router.put('/favorites', validate(favoritesSchema), asyncHandler(setFavorites))

// Resaltados y notas. Los PUT reemplazan el conjunto completo: el cliente es
// offline-first y sincroniza todo de una vez, no operacion por operacion.
router.get('/highlights', asyncHandler(getHighlights))
router.put('/highlights', validate(highlightsSchema), asyncHandler(setHighlights))

router.get('/notes', asyncHandler(getNotes))
router.put('/notes', validate(notesSchema), asyncHandler(setNotes))

router.get('/history', asyncHandler(getHistory))
router.post('/history', validate(historyEntrySchema), asyncHandler(addHistory))
router.delete('/history', asyncHandler(clearHistory))

export default router
