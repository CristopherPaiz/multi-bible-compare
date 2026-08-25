/**
 * Valida el entorno al arrancar.
 *
 * Regla: si falta algo REQUERIDO, el proceso muere de una vez (mejor fallar en el
 * deploy que a media peticion). Si falta algo OPCIONAL, solo se avisa y la feature
 * asociada queda desactivada.
 */

const REQUIRED_VARIABLES = [
  'PORT',
  'NODE_ENV',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'JWT_SECRET_KEY',
  'JWT_EXPIRATION_TIME',
  'SALT_ROUNDS'
] as const

/** Grupos opcionales: o estan completos, o la feature se apaga entera. */
const OPTIONAL_GROUPS: Record<string, readonly string[]> = {
  'Scaleway (audio Strong)': [
    'SCALEWAY_ENDPOINT',
    'SCALEWAY_REGION',
    'SCALEWAY_BUCKET_NAME',
    'SCALEWAY_ACCESS_KEY_ID',
    'SCALEWAY_SECRET_ACCESS_KEY',
    'SCALEWAY_PUBLIC_URL'
  ],
  'Cloudinary (imagenes)': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
}

const PLACEHOLDER_PATTERN = /^<RELLENAR/i

const isFilled = (name: string): boolean => {
  const value = process.env[name]
  return Boolean(value && value.trim() && !PLACEHOLDER_PATTERN.test(value.trim()))
}

export const validateEnv = (): void => {
  const missing = REQUIRED_VARIABLES.filter((name) => !isFilled(name))

  if (missing.length > 0) {
    console.error('ERROR CRÍTICO: faltan variables de entorno obligatorias:')
    missing.forEach((name) => console.error(`  - ${name}`))
    console.error('\nCopia api/.env.example como api/.env y rellena los valores marcados <RELLENAR>.')
    process.exit(1)
  }

  const secret = process.env.JWT_SECRET_KEY ?? ''
  if (secret.length < 32) {
    console.error('ERROR CRÍTICO: JWT_SECRET_KEY debe tener al menos 32 caracteres.')
    console.error('Genera uno con:  openssl rand -hex 48')
    process.exit(1)
  }

  for (const [feature, names] of Object.entries(OPTIONAL_GROUPS)) {
    const missingInGroup = names.filter((name) => !isFilled(name))
    if (missingInGroup.length > 0 && missingInGroup.length < names.length) {
      console.warn(`AVISO: ${feature} está a medio configurar. Faltan: ${missingInGroup.join(', ')}`)
      console.warn(`       La feature quedará DESACTIVADA hasta completarla.`)
    } else if (missingInGroup.length === names.length) {
      console.warn(`AVISO: ${feature} no configurado. La feature queda desactivada.`)
    }
  }
}

/** `true` si TODAS las variables del grupo estan presentes y sin placeholder. */
export const isFeatureEnabled = (feature: keyof typeof OPTIONAL_GROUPS): boolean => {
  const names = OPTIONAL_GROUPS[feature]
  return names !== undefined && names.every(isFilled)
}

export const isStorageEnabled = (): boolean => isFeatureEnabled('Scaleway (audio Strong)')
export const isCloudinaryEnabled = (): boolean => isFeatureEnabled('Cloudinary (imagenes)')
