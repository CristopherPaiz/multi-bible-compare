import { v2 as cloudinary } from 'cloudinary'
import { isCloudinaryEnabled } from '@config/env.validator.js'

/** Cloudinary para imagenes (avatares, tarjeta de versiculo para compartir). Opcional. */
export const configureCloudinary = (): void => {
  if (!isCloudinaryEnabled()) return

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  })
}

export const getCloudinaryFolder = (): string => process.env.CLOUDINARY_FOLDER ?? 'biblian'

export { cloudinary }
