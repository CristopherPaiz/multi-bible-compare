import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, logout, me, register } from '@controllers/auth.controller.js'
import { validate } from '@middlewares/validate.middleware.js'
import { authMiddleware } from '@middlewares/auth.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'
import { loginSchema, registerSchema } from '@validators/auth.schema.js'

const router: Router = Router()

// Límite específico y agresivo para credenciales: el limitador global de /api
// (300 req / 15 min) es demasiado holgado para frenar fuerza bruta.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Espere unos minutos.' }
})

router.post('/register', credentialsLimiter, validate(registerSchema), asyncHandler(register))
router.post('/login', credentialsLimiter, validate(loginSchema), asyncHandler(login))
router.post('/logout', logout)
router.get('/me', authMiddleware, asyncHandler(me))

export default router
