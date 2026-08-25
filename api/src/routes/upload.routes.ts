import { Router } from 'express'
import { uploadImage } from '@controllers/upload.controller.js'
import { imageUpload } from '@middlewares/upload.middleware.js'
import { authMiddleware } from '@middlewares/auth.middleware.js'
import { asyncHandler } from '@middlewares/error.middleware.js'

const router: Router = Router()

router.post('/image', authMiddleware, imageUpload.single('image'), asyncHandler(uploadImage))

export default router
