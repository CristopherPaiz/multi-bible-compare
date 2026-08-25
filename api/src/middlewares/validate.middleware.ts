import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { HTTP_STATUS } from '@config/constants.js'

type Source = 'body' | 'query' | 'params'

const runValidation =
  (schema: z.ZodType, source: Source) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Datos de entrada inválidos.',
        errors
      })
      return
    }

    // `req.query` y `req.params` son getters de solo lectura en Express 5 y en
    // algunas versiones de 4.x. Guardamos el resultado parseado aparte para no
    // pelear con el prototipo.
    if (source === 'body') {
      req.body = result.data
    } else {
      res.locals[source] = result.data
    }
    next()
  }

type Validator = (req: Request, res: Response, next: NextFunction) => void

/** Valida `req.body` y lo reemplaza por el dato ya saneado. */
export const validate = (schema: z.ZodType): Validator => runValidation(schema, 'body')

/** Valida `req.query`. El resultado queda en `res.locals.query`. */
export const validateQuery = (schema: z.ZodType): Validator => runValidation(schema, 'query')

/** Valida `req.params`. El resultado queda en `res.locals.params`. */
export const validateParams = (schema: z.ZodType): Validator => runValidation(schema, 'params')

/** Lee el dato ya validado con el tipo correcto. */
export const validated = <T>(res: Response, source: Exclude<Source, 'body'>): T => res.locals[source] as T
