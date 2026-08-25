import multer from 'multer'

/**
 * Imágenes en memoria (avatares, tarjeta de versículo para compartir).
 * El audio Strong NO pasa por aquí: se sube una sola vez con el script de
 * migración directo a Scaleway, no por endpoint.
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Tipo de archivo no permitido. Use JPEG, PNG, WebP o GIF.'))
  }
})
