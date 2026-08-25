import { z } from 'zod'

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .max(32, 'El usuario no puede exceder 32 caracteres.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo se permiten letras, números, guion, guion bajo y punto.'),
  email: z.string().trim().email('Correo electrónico inválido.').optional(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña no puede exceder 128 caracteres.')
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es obligatorio.'),
  password: z.string().min(1, 'La contraseña es obligatoria.')
})
export type LoginInput = z.infer<typeof loginSchema>
