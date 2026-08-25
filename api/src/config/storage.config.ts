import { S3Client } from '@aws-sdk/client-s3'
import { isStorageEnabled } from '@config/env.validator.js'

/**
 * Scaleway Object Storage (S3-compatible) para el audio MP3 del diccionario Strong.
 * Misma cuenta/bucket que music-api si asi lo prefieres.
 *
 * IMPORTANTE: el bucket debe ser PUBLICO para este uso. El audio de `G2424` nunca
 * cambia, asi que lo servimos con URL directa + cache inmutable. Firmar cada URL
 * (presigned) rompe el cacheo del CDN porque el query string cambia en cada peticion.
 */

let client: S3Client | null = null

export const getStorageClient = (): S3Client | null => {
  if (!isStorageEnabled()) return null
  if (client) return client

  client = new S3Client({
    endpoint: process.env.SCALEWAY_ENDPOINT,
    region: process.env.SCALEWAY_REGION,
    credentials: {
      accessKeyId: process.env.SCALEWAY_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.SCALEWAY_SECRET_ACCESS_KEY as string
    }
  })

  return client
}

export const getBucketName = (): string => process.env.SCALEWAY_BUCKET_NAME ?? ''

/** Base publica del bucket, sin slash final. */
export const getPublicBaseUrl = (): string => (process.env.SCALEWAY_PUBLIC_URL ?? '').replace(/\/+$/, '')

export const STORAGE_PREFIXES = {
  audioGreek: process.env.STORAGE_AUDIO_GREEK_PREFIX ?? 'strongs/audio/greek',
  audioHebrew: process.env.STORAGE_AUDIO_HEBREW_PREFIX ?? 'strongs/audio/hebrew'
} as const

/** Construye la URL publica de un objeto. `null` si storage no esta configurado. */
export const buildPublicUrl = (key: string): string | null => {
  const base = getPublicBaseUrl()
  if (!base) return null
  return `${base}/${key.replace(/^\/+/, '')}`
}
