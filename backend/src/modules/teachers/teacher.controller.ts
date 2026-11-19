import type { Request, Response, NextFunction } from 'express'
import { AuthError } from '../auth/auth.errors.js'
import { TEACHER_RESET_MESSAGE, teacherService } from './teacher.service.js'

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AuthError(`${field} is required`, 400)
  return value
}

export class TeacherController {
  async list(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const result = await teacherService.list({
        search: typeof request.query.search === 'string' ? request.query.search : undefined,
        status: typeof request.query.status === 'string' ? request.query.status : undefined,
        page: Number(request.query.page) || 1,
        limit: Number(request.query.limit) || 10,
      })
      response.status(200).json({ success: true, data: result.items, pagination: {
        page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages,
      } })
    } catch (error) { next(error) }
  }

  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const result = await teacherService.create({
        fullName: requiredString(request.body?.full_name, 'full_name'),
        email: requiredString(request.body?.email, 'email'),
        password: requiredString(request.body?.password, 'password'),
        nickname: typeof request.body?.nickname === 'string' ? request.body.nickname : undefined,
        phoneNumber: typeof request.body?.phone_number === 'string' ? request.body.phone_number : undefined,
        avatarUrl: typeof request.body?.avatar_url === 'string' ? request.body.avatar_url : undefined,
      })
      response.status(201).json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  async detail(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = await teacherService.findById(String(request.params.id))
      if (!user) { response.status(404).json({ success: false, message: 'Teacher not found' }); return }
      response.status(200).json({ success: true, data: user })
    } catch (error) { next(error) }
  }

  async update(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = await teacherService.updateProfile(String(request.params.id), {
        fullName: requiredString(request.body?.full_name, 'full_name'),
        nickname: typeof request.body?.nickname === 'string' ? request.body.nickname : undefined,
        phoneNumber: typeof request.body?.phone_number === 'string' ? request.body.phone_number : undefined,
      })
      if (!user) { response.status(404).json({ success: false, message: 'Teacher not found' }); return }
      response.status(200).json({ success: true, data: user })
    } catch (error) { next(error) }
  }

  async updateStatus(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const status = request.body?.status
      if (!['active', 'locked', 'pending', 'deactivated'].includes(status)) throw new AuthError('Invalid teacher status', 400)
      const id = String(request.params.id)
      const current = await teacherService.findById(id)
      if (!current) { response.status(404).json({ success: false, message: 'Teacher not found' }); return }
      if (status === 'active' && current.status === 'pending') {
        response.status(409).json({ success: false, message: 'Pending teachers must activate their account before it can be marked active' })
        return
      }
      if (status !== 'deactivated' && current.status === 'deactivated') {
        response.status(409).json({ success: false, message: 'Deactivated teacher accounts cannot be reactivated' })
        return
      }
      const user = await teacherService.updateStatus(id, status)
      if (!user) { response.status(404).json({ success: false, message: 'Teacher not found' }); return }
      response.status(200).json({ success: true, data: user })
    } catch (error) { next(error) }
  }

  async resendActivation(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const sent = await teacherService.resendActivation(String(request.params.id))
      if (!sent) { response.status(409).json({ success: false, message: 'Activation email could not be sent or account is not pending' }); return }
      response.status(202).json({ success: true, message: 'Activation link sent' })
    } catch (error) { next(error) }
  }

  async activate(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const activated = await teacherService.activate(
        requiredString(request.body?.token, 'token'), requiredString(request.body?.password, 'password')
      )
      if (!activated) { response.status(400).json({ success: false, message: 'Activation link is invalid, expired, or already used' }); return }
      response.status(200).json({ success: true, data: { activated: true } })
    } catch (error) { next(error) }
  }

  async requestReset(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requiredString(request.body?.email, 'email')
      await teacherService.requestPasswordReset(email)
      response.status(200).json({ success: true, message: TEACHER_RESET_MESSAGE })
    } catch (error) { next(error) }
  }

  async resetPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const changed = await teacherService.resetPassword(
        requiredString(request.body?.token, 'token'), requiredString(request.body?.password, 'password')
      )
      if (!changed) { response.status(400).json({ success: false, message: 'Password reset link is invalid, expired, or already used' }); return }
      response.status(200).json({ success: true, data: { passwordChanged: true } })
    } catch (error) { next(error) }
  }

  me(_request: Request, response: Response): void {
    const user = response.locals.authUser as { id: string; email: string; full_name: string; role: string }
    response.status(200).json({ success: true, data: user })
  }
}

export const teacherController = new TeacherController()
