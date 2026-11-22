import type { NextFunction, Request, Response } from 'express'
import { LessonRequestError } from './lessons.errors.js'
import { lessonsService } from './lessons.service.js'
import type { AuthenticatedUser } from './lessons.types.js'

function getAuthUser(response: Response): AuthenticatedUser {
  const user = response.locals.authUser as { id?: unknown; role?: unknown } | undefined
  if (!user?.id || !user?.role) {
    throw new LessonRequestError('An authenticated user is required.', 401)
  }
  return {
    id: String(user.id),
    role: user.role as AuthenticatedUser['role'],
  }
}

// Map LessonRequestError sang status code tương ứng; lỗi khác đưa cho errorHandler
function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof LessonRequestError) {
    res.status(error.status).json({ success: false, error: error.message })
    return
  }
  next(error)
}

export class LessonsController {
  async getTopicsForCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const topics = await lessonsService.getTopicsForCourse(String(req.params.courseId || ''), user)
      res.status(200).json({ success: true, data: topics })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  async getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lesson = await lessonsService.getLesson(String(req.params.lessonId || ''), user)
      res.status(200).json({ success: true, data: lesson })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  async createTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const courseId = String(req.params.courseId || '')
      const topic = await lessonsService.createTopic(courseId, user, req.body)
      res.status(201).json({ success: true, data: topic })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Tạo bài giảng KHÔNG chia chủ đề — tự gắn vào chủ đề mặc định của khóa
  async createLessonInCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const courseId = String(req.params.courseId || '')
      const result = await lessonsService.createLessonInCourse(courseId, user, req.body)
      res.status(201).json({ success: true, data: { lesson: result.lesson } })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  async createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const topicId = String(req.params.topicId || '')
      const result = await lessonsService.createLesson(topicId, user, req.body)
      res.status(201).json({ success: true, data: { topic: result.topic, lesson: result.lesson } })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Cập nhật bài giảng — mọi trường, kể cả chuyển chủ đề và đổi thứ tự
  async updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const result = await lessonsService.updateLesson(lessonId, user, req.body)
      res.status(200).json({ success: true, data: result })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Xóa bài giảng
  async deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const deleted = await lessonsService.deleteLesson(lessonId, user)
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài giảng' })
        return
      }
      res.status(200).json({
        success: true,
        message: 'Đã xóa bài giảng',
        data: { id: lessonId },
      })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Kiểm tra video (YouTube/Drive/other) có PHÁT ĐƯỢC cho học viên không
  async kiemTraVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      getAuthUser(res)
      const result = await lessonsService.kiemTraVideo({ url: req.query.url })
      res.status(200).json({ success: true, data: result })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Cập nhật tiến độ xem video bài học của học viên
  async updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const result = await lessonsService.updateLessonProgress(lessonId, user, req.body)
      res.status(200).json({ success: true, data: result })
    } catch (error) {
      handleError(error, res, next)
    }
  }
}

export const lessonsController = new LessonsController()
