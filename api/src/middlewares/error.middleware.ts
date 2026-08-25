import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS, MESSAGES, SYSTEM } from '@config/constants.js'
import { DatabaseService } from '@database/connection.js'

/** Error con status HTTP propio, para cortar desde un controller. */
export class HttpError extends Error {
  public readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export const errorMiddleware = async (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Un HttpError es una respuesta esperada (404, 400...), no un fallo del servidor:
  // se contesta y no se ensucia el log de errores.
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message, data: null })
    return
  }

  let errorId: number | null = null

  try {
    const db = await DatabaseService.getInstance().getClient()
    const result = await db.execute({
      sql: 'INSERT INTO ErrorLogs (endpoint, method, error_message, stack_trace) VALUES (?, ?, ?, ?)',
      args: [req.originalUrl, req.method, err.message, err.stack ?? '']
    })
    errorId = Number(result.lastInsertRowid)
  } catch (dbError) {
    console.error('Error crítico: no se pudo registrar el error en BD', dbError)
  }

  console.error(`[${req.method}] ${req.originalUrl}`, err)

  const isProduction = process.env.NODE_ENV === SYSTEM.ENV_PRODUCTION

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: isProduction ? MESSAGES.SERVER.ERROR : err.message,
    errorId,
    data: null
  })
}

/**
 * Envuelve un handler async para que un reject llegue a `next(error)`.
 * Evita repetir try/catch en cada controller.
 */
export const asyncHandler =
  <T extends Request>(handler: (req: T, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req as T, res, next).catch(next)
  }
