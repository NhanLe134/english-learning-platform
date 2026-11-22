import { Router } from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { authorize } from '../../middlewares/authorize.js'
import { lessonsController } from './lessons.controller.js'

export const lessonsRouter = Router()

// Mọi endpoint bài giảng đều yêu cầu đăng nhập (ADMIN hoặc TEACHER được phân công)
lessonsRouter.use(authenticate)

// Danh sách chủ đề + bài giảng của một khóa học
lessonsRouter.get(
  '/courses/:courseId/topics',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.getTopicsForCourse(req, res, next)
)

// Chi tiết một bài giảng
lessonsRouter.get(
  '/lessons/:lessonId',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.getLesson(req, res, next)
)

// Tạo chủ đề mới trong khóa học
lessonsRouter.post(
  '/courses/:courseId/topics',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.createTopic(req, res, next)
)

// Tạo bài giảng mới trong một chủ đề
lessonsRouter.post(
  '/topics/:topicId/lessons',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.createLesson(req, res, next)
)

// Cập nhật bài giảng — mọi trường, kể cả chuyển chủ đề và đổi thứ tự
lessonsRouter.patch(
  '/lessons/:lessonId',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.updateLesson(req, res, next)
)

// Cập nhật tiến độ bài học của học viên khi xem video
lessonsRouter.put(
  '/lessons/:lessonId/progress',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.updateProgress(req, res, next)
)
