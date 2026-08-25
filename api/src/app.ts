import express, { Application, NextFunction, Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { errorMiddleware } from '@middlewares/error.middleware.js'
import { HTTP_STATUS } from '@config/constants.js'
import bibleRoutes from '@routes/bible.routes.js'
import authRoutes from '@routes/auth.routes.js'
import userRoutes from '@routes/user.routes.js'
import systemRoutes from '@routes/system.routes.js'
import uploadRoutes from '@routes/upload.routes.js'

const app: Application = express()

// Render/Netlify van detrás de proxy: sin esto, el rate limit ve una sola IP.
app.set('trust proxy', 1)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// Los capítulos salen de la BD ya en gzip, se descomprimen para armar el JSON
// y este middleware los vuelve a comprimir para el cable. A ~2 KB por capítulo
// el costo es ruido frente al round-trip que se ahorra.
app.use(compression())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, intente de nuevo más tarde.'
  }
})
app.use('/api', limiter)

const parseOrigins = (raw?: string): string[] =>
  (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const allowedOrigins = [...parseOrigins(process.env.FRONTEND_URL), ...parseOrigins(process.env.CORS_ORIGINS)]
const corsOrigins = allowedOrigins.length > 0 ? Array.from(new Set(allowedOrigins)) : ['http://localhost:5173']

app.use(
  cors({
    origin: (origin, callback) => {
      // Sin Origin = curl/Postman/apps nativas: se permite.
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origen no permitido por CORS: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/api', bibleRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/upload', uploadRoutes)

// Varios alias: algunos bloqueadores (Brave, uBlock) filtran rutas llamadas
// /health, así que la UI puede reintentar contra /ping o /status.
app.get(['/health', '/ping', '/status'], (_req, res) => {
  res.status(HTTP_STATUS.OK).json({ success: true, status: 'ok' })
})

app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    data: null
  })
})

// Los errores de multer (archivo muy grande, tipo inválido) son culpa del
// cliente: se contestan con 400 en vez de caer al 500 genérico.
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message, data: null })
    return
  }
  next(err)
})

app.use(errorMiddleware)

export default app
