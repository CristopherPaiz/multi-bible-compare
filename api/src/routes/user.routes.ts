import { Router } from 'express'
import { addHistory, clearHistory, getFavorites, getHistory, setFavorites } from '@controllers/user.controller.js'
import { authMiddleware } from '@middlewares/auth.middleware.js'
import { validate } from '@middlewares/validate.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'
import { favoritesSchema, historyEntrySchema } from '@validators/user.schema.js'

const router: Router = Router()

// Todo lo de aquí es privado del usuario.
router.use(authMiddleware)

router.get('/favorites', asyncHandler(getFavorites))
router.put('/favorites', validate(favoritesSchema), asyncHandler(setFavorites))

router.get('/history', asyncHandler(getHistory))
router.post('/history', validate(historyEntrySchema), asyncHandler(addHistory))
router.delete('/history', asyncHandler(clearHistory))

export default router
