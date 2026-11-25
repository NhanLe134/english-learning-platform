import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'
import type { NextFunction, Request, Response } from 'express'
import { LessonRequestError } from './lessons.errors.js'
import { lessonsService } from './lessons.service.js'
import type { AuthenticatedUser } from './lessons.types.js'

const VALID_RANGE_HEADER = /^bytes=\d*-\d*$/i
const UPSTREAM_STREAM_TIMEOUT_MS = 25000

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
      res.status(201).json({
        success: true,
        data: { lesson: result.lesson, quiz_saved: result.quizSaved },
      })
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

  // Lấy quiz của bài giảng (học viên: che đáp án đúng)
  async getQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const quiz = await lessonsService.getQuizForLesson(lessonId, user)
      res.status(200).json({ success: true, data: quiz })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Lưu/tạo quiz cho bài giảng (ADMIN/TEACHER)
  async saveQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const result = await lessonsService.saveQuizForLesson(lessonId, user, req.body)
      res.status(200).json({ success: true, data: result })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Học viên nộp bài quiz — chấm điểm server-side
  async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const result = await lessonsService.submitQuiz(lessonId, user, req.body)
      res.status(200).json({ success: true, data: result })
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

  // Cấp signed stream token ngắn hạn để phát video Google Drive qua HTML5 <video>
  async createVideoStreamToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(res)
      const lessonId = String(req.params.lessonId || '')
      const result = await lessonsService.createGoogleDriveStreamToken(lessonId, user)
      res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      res.status(200).json({
        success: true,
        data: {
          token: result.token,
          expires_in_seconds: result.expiresInSeconds,
        },
      })
    } catch (error) {
      handleError(error, res, next)
    }
  }

  // Proxy luồng video Google Drive có hỗ trợ HTTP Range (206 Partial Content) cho HTML5 <video>
  async streamGoogleDriveVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), UPSTREAM_STREAM_TIMEOUT_MS)
    const onClientClose = () => {
      abortController.abort()
    }
    req.on('close', onClientClose)

    try {
      const lessonId = String(req.params.lessonId || '')
      const token = typeof req.query.token === 'string' ? req.query.token : ''
      const { downloadUrl } = await lessonsService.resolveGoogleDriveStream(lessonId, token)

      const rawRange = typeof req.headers.range === 'string' ? req.headers.range.trim() : ''
      const rangeHeader = rawRange && VALID_RANGE_HEADER.test(rawRange) ? rawRange : undefined

      const upstream = await fetch(downloadUrl, {
        method: 'GET',
        headers: rangeHeader ? { Range: rangeHeader } : undefined,
        redirect: 'follow',
        signal: abortController.signal,
      })

      clearTimeout(timeoutId)

      const rawContentType = (upstream.headers.get('content-type') || '').toLowerCase()
      const isInvalidHtml = rawContentType.includes('text/html')
      const isAcceptableStatus = upstream.status === 200 || upstream.status === 206

      if (!isAcceptableStatus || isInvalidHtml || !upstream.body) {
        await upstream.body?.cancel().catch(() => {})
        const status = upstream.status === 416 ? 416 : 502
        res.status(status).json({
          success: false,
          error:
            status === 416
              ? 'Requested byte range is not satisfiable.'
              : 'Google Drive hiện không cho phép phát trực tiếp tệp video này (tệp riêng tư, vượt giới hạn tải xuống, hoặc không phải tệp video hợp lệ).',
        })
        return
      }

      const contentType =
        rawContentType && !rawContentType.startsWith('application/octet-stream')
          ? upstream.headers.get('content-type')!
          : 'video/mp4'

      res.status(upstream.status === 206 ? 206 : 200)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes')
      res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      res.setHeader('X-Content-Type-Options', 'nosniff')

      const contentLength = upstream.headers.get('content-length')
      if (contentLength) {
        res.setHeader('Content-Length', contentLength)
      }
      const contentRange = upstream.headers.get('content-range')
      if (contentRange) {
        res.setHeader('Content-Range', contentRange)
      }

      const nodeStream = Readable.fromWeb(upstream.body as unknown as WebReadableStream)
      await pipeline(nodeStream, res)
    } catch (error) {
      clearTimeout(timeoutId)
      const errCode = (error as { code?: string; name?: string } | null)?.code
      const errName = (error as { name?: string } | null)?.name
      if (
        abortController.signal.aborted ||
        errCode === 'ERR_STREAM_PREMATURE_CLOSE' ||
        errName === 'AbortError'
      ) {
        return
      }
      if (!res.headersSent) {
        handleError(error, res, next)
      }
    } finally {
      clearTimeout(timeoutId)
      req.off('close', onClientClose)
    }
  }
}

export const lessonsController = new LessonsController()
