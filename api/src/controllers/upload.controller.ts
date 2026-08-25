import { Response } from 'express'
import sharp from 'sharp'
import { UploadApiResponse } from 'cloudinary'
import { cloudinary, getCloudinaryFolder } from '@config/cloudinary.config.js'
import { isCloudinaryEnabled } from '@config/env.validator.js'
import { HttpError } from '@middlewares/error.middleware.js'
import { sendSuccess } from '@utils/response.helper.js'
import { HTTP_STATUS, MESSAGES } from '@config/constants.js'
import { AuthenticatedRequest } from '@apptypes/index.js'

/**
 * POST /api/upload/image
 *
 * Opcional: si Cloudinary no está configurado, responde 503 y el resto de la API
 * sigue funcionando. La app no depende de esto para leer la Biblia.
 */
export const uploadImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!isCloudinaryEnabled()) {
    throw new HttpError(HTTP_STATUS.SERVICE_UNAVAILABLE, MESSAGES.UPLOAD.DISABLED)
  }

  const file = req.file
  if (!file) throw new HttpError(HTTP_STATUS.BAD_REQUEST, MESSAGES.UPLOAD.NO_FILE)

  // Se re-codifica con sharp antes de subir: normaliza a WebP, recorta el tamaño
  // y de paso descarta metadata EXIF (puede traer geolocalización del usuario).
  const optimized = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${getCloudinaryFolder()}/${req.user?.userId ?? 'anon'}`, resource_type: 'image', format: 'webp' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary no devolvió resultado.'))
          return
        }
        resolve(result)
      }
    )
    stream.end(optimized)
  })

  sendSuccess({
    res,
    status: HTTP_STATUS.CREATED,
    message: 'Imagen subida correctamente.',
    data: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes
    }
  })
}
