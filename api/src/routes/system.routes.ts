import { Router } from 'express'
import { getStats, getStatus, getTime } from '@controllers/system.controller.js'
import { asyncHandler } from '@middlewares/error.middleware.js'

const router: Router = Router()

router.get('/time', getTime)
router.get('/status', asyncHandler(getStatus))
router.get('/stats', asyncHandler(getStats))

export default router
