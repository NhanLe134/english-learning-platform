import { Router } from 'express'
import { authorize } from '../../middlewares/authorize.js'
import { authenticate } from '../auth/auth.middleware.js'
import { exercisesController } from './exercises.controller.js'

export const exercisesRouter = Router()

exercisesRouter.use(authenticate)

// Danh sách bài tập cấp khóa học (lesson_id IS NULL)
exercisesRouter.get(
  '/courses/:courseId',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => exercisesController.listByCourse(req, res, next)
)

// Tạo bài tập mới cho khóa học
exercisesRouter.post(
  '/courses/:courseId',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => exercisesController.createForCourse(req, res, next)
)

// Chi tiết 1 bài tập + danh sách câu hỏi
exercisesRouter.get(
  '/:exerciseId',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => exercisesController.getDetail(req, res, next)
)

// Cập nhật bài tập và câu hỏi
exercisesRouter.patch(
  '/:exerciseId',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => exercisesController.updateExercise(req, res, next)
)

// Xóa bài tập cấp khóa học
exercisesRouter.delete(
  '/:exerciseId',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => exercisesController.deleteExercise(req, res, next)
)

// Nộp bài và chấm điểm tự động
exercisesRouter.post(
  '/:exerciseId/submit',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => exercisesController.submitExercise(req, res, next)
)
