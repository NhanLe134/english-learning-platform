import { Router } from 'express'
import { authorize } from '../../middlewares/authorize.js'
import { env } from '../../config/env.js'
import { authenticate, requireTrustedOrigin } from '../auth/auth.middleware.js'
import { authRateLimit } from '../auth/auth.rate-limit.js'
import { teacherController } from './teacher.controller.js'

export const teacherRouter = Router()

teacherRouter.post('/activation/complete', requireTrustedOrigin, authRateLimit(env.authResetRateLimit), (req, res, next) => teacherController.activate(req, res, next))
teacherRouter.post('/password-reset/request', requireTrustedOrigin, authRateLimit(env.authResetRateLimit), (req, res, next) => teacherController.requestReset(req, res, next))
teacherRouter.post('/password-reset/complete', requireTrustedOrigin, authRateLimit(env.authResetRateLimit), (req, res, next) => teacherController.resetPassword(req, res, next))

teacherRouter.use('/admin', authenticate, authorize('ADMIN'))
teacherRouter.get('/admin', (req, res, next) => teacherController.list(req, res, next))
teacherRouter.post('/admin', requireTrustedOrigin, (req, res, next) => teacherController.create(req, res, next))
teacherRouter.get('/admin/:id', (req, res, next) => teacherController.detail(req, res, next))
teacherRouter.patch('/admin/:id', requireTrustedOrigin, (req, res, next) => teacherController.update(req, res, next))
teacherRouter.patch('/admin/:id/status', requireTrustedOrigin, (req, res, next) => teacherController.updateStatus(req, res, next))
teacherRouter.post('/admin/:id/activation/resend', requireTrustedOrigin, (req, res, next) => teacherController.resendActivation(req, res, next))

teacherRouter.get('/me', authenticate, authorize('TEACHER'), (req, res) => teacherController.me(req, res))
