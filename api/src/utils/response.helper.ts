import { Response } from 'express'
import { HTTP_STATUS } from '@config/constants.js'

interface SuccessResponseParams<T> {
  res: Response
  status?: number
  message?: string
  data?: T
  /** Valor de Cache-Control. Ver CACHE_CONTROL en constants. */
  cache?: string
}

interface ErrorResponseParams {
  res: Response
  status?: number
  message: string
}

export const sendSuccess = <T>({
  res,
  status = HTTP_STATUS.OK,
  message = 'Operación exitosa',
  data,
  cache
}: SuccessResponseParams<T>): void => {
  if (cache) res.setHeader('Cache-Control', cache)
  res.status(status).json({ success: true, message, data: data ?? null })
}

export const sendError = ({
  res,
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  message
}: ErrorResponseParams): void => {
  res.status(status).json({ success: false, message, data: null })
}
