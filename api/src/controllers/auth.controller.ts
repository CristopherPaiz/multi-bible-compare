import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb, queryOne } from '@database/connection.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { HTTP_STATUS, MESSAGES, SYSTEM, CACHE_CONTROL } from '@config/constants.js'
import { LoginInput, RegisterInput } from '@validators/auth.schema.js'
import { AuthenticatedRequest, JwtPayload, UserRecord } from '@apptypes/index.js'
import type { CookieOptions } from 'express'

const getSaltRounds = (): number => {
  const parsed = Number(process.env.SALT_ROUNDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SYSTEM.DEFAULT_SALT_ROUNDS
}

const signToken = (payload: JwtPayload): string =>
  jwt.sign(
    payload,
    process.env.JWT_SECRET_KEY as string,
    {
      expiresIn: process.env.JWT_EXPIRATION_TIME ?? SYSTEM.DEFAULT_JWT_EXPIRATION
    } as jwt.SignOptions
  )

const cookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === SYSTEM.ENV_PRODUCTION
  return {
    httpOnly: true,
    // La UI y la API viven en dominios distintos (Netlify + Render), así que en
    // producción la cookie tiene que ser SameSite=None, y eso exige Secure.
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  }
}

/** POST /api/auth/register */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body as RegisterInput

  const existing = await queryOne('SELECT id FROM Users WHERE username = ? OR (email IS NOT NULL AND email = ?)', [
    username,
    email ?? ''
  ])
  if (existing) throw new HttpError(HTTP_STATUS.CONFLICT, MESSAGES.AUTH.USER_EXISTS)

  const passwordHash = await bcrypt.hash(password, getSaltRounds())

  const db = await getDb()
  const result = await db.execute({
    sql: 'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)',
    args: [username, email ?? null, passwordHash]
  })

  const userId = Number(result.lastInsertRowid)
  const token = signToken({ userId, username })

  res.cookie(SYSTEM.COOKIE_NAME, token, cookieOptions())

  const data: { user: UserRecord; token: string } = {
    user: { id: userId, username, email: email ?? null, createdAt: new Date().toISOString() },
    token
  }

  sendSuccess({ res, status: HTTP_STATUS.CREATED, message: MESSAGES.AUTH.REGISTER_SUCCESS, data })
}

/** POST /api/auth/login */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as LoginInput

  const row = await queryOne(
    'SELECT id, username, email, password_hash, created_at FROM Users WHERE username = ? OR email = ?',
    [username, username]
  )

  // Mismo mensaje y mismo costo si el usuario no existe o la clave no coincide:
  // así la respuesta no revela qué usuarios están registrados.
  const storedHash = row
    ? String(row.password_hash)
    : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO'
  const matches = await bcrypt.compare(password, storedHash)

  if (!row || !matches) {
    throw new HttpError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS)
  }

  const user: UserRecord = {
    id: Number(row.id),
    username: String(row.username),
    email: row.email === null ? null : String(row.email),
    createdAt: String(row.created_at)
  }

  const token = signToken({ userId: user.id, username: user.username })
  res.cookie(SYSTEM.COOKIE_NAME, token, cookieOptions())

  sendSuccess({ res, message: MESSAGES.AUTH.LOGIN_SUCCESS, data: { user, token } })
}

/** POST /api/auth/logout */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(SYSTEM.COOKIE_NAME, { ...cookieOptions(), maxAge: undefined })
  sendSuccess({ res, message: MESSAGES.AUTH.LOGOUT_SUCCESS })
}

/** GET /api/auth/me */
export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) throw new HttpError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED)

  const row = await queryOne('SELECT id, username, email, created_at FROM Users WHERE id = ?', [userId])
  if (!row) throw new HttpError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN)

  const data: UserRecord = {
    id: Number(row.id),
    username: String(row.username),
    email: row.email === null ? null : String(row.email),
    createdAt: String(row.created_at)
  }

  sendSuccess({ res, data, cache: CACHE_CONTROL.PRIVATE })
}
