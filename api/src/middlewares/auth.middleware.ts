import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { HTTP_STATUS, MESSAGES, SYSTEM } from '@config/constants.js'
import { AuthenticatedRequest, JwtPayload } from '@apptypes/index.js'
import { sendError } from '@utils/response.helper.js'

/** Token desde cookie httpOnly o header `Authorization: Bearer <token>`. */
const extractToken = (req: AuthenticatedRequest): string | null => {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[SYSTEM.COOKIE_NAME]
  if (cookieToken) return cookieToken

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)

  return null
}

const verify = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY as string) as JwtPayload
  } catch {
    return null
  }
}

/** Exige sesion valida. Corta con 401 si no hay. */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = extractToken(req)

  if (!token) {
    sendError({ res, status: HTTP_STATUS.UNAUTHORIZED, message: MESSAGES.AUTH.UNAUTHORIZED })
    return
  }

  const payload = verify(token)
  if (!payload) {
    sendError({ res, status: HTTP_STATUS.UNAUTHORIZED, message: MESSAGES.AUTH.INVALID_TOKEN })
    return
  }

  req.user = payload
  next()
}

/**
 * Adjunta el usuario si hay sesion, pero deja pasar si no.
 * Util para endpoints publicos que dan algo extra al usuario logueado.
 */
export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const token = extractToken(req)
  if (token) {
    const payload = verify(token)
    if (payload) req.user = payload
  }
  next()
}
