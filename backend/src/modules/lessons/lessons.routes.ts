import { Router } from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { authorize } from '../../middlewares/authorize.js'
import { lessonsController } from './lessons.controller.js'

export const lessonsRouter = Router()

// Stream video Google Drive qua backend proxy (thẻ HTML5 <video> xác thực bằng signed stream token ngắn hạn)
lessonsRouter.get('/lessons/:lessonId/video-stream', (req, res, next) =>
  lessonsController.streamGoogleDriveVideo(req, res, next)
)

// Mọi endpoint bài giảng đều yêu cầu đăng nhập (ADMIN hoặc TEACHER được phân công)
lessonsRouter.use(authenticate)

// Cấp signed stream token ngắn hạn cho bài học Google Drive (kiểm tra quyền ghi danh khóa học)
lessonsRouter.post(
  '/lessons/:lessonId/video-stream-token',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.createVideoStreamToken(req, res, next)
)

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

// Tạo bài giảng KHÔNG chia chủ đề — tự gắn vào chủ đề mặc định "Bài giảng"
lessonsRouter.post(
  '/courses/:courseId/lessons',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.createLessonInCourse(req, res, next)
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

// Xóa bài giảng
lessonsRouter.delete(
  '/lessons/:lessonId',
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.deleteLesson(req, res, next)
)

// ============ QUIZ TRẮC NGHIỆM ============

// Lấy quiz của bài giảng (học viên: che đáp án đúng; admin/teacher: full)
lessonsRouter.get(
  '/lessons/:lessonId/quiz',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.getQuiz(req, res, next)
)

// Lưu/tạo quiz cho bài giảng
lessonsRouter.put(
  '/lessons/:lessonId/quiz',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  (req, res, next) => lessonsController.saveQuiz(req, res, next)
)

// Học viên nộp bài — chấm điểm server-side
lessonsRouter.post(
  '/lessons/:lessonId/quiz/submit',
  authenticate,
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.submitQuiz(req, res, next)
)

// Kiểm tra video (YouTube/Drive) có phát được cho học viên không — kể cả video riêng tư
lessonsRouter.get('/check-video', authorize('ADMIN', 'TEACHER'), (req, res, next) =>
  lessonsController.kiemTraVideo(req, res, next)
)

// Cập nhật tiến độ bài học của học viên khi xem video
lessonsRouter.put(
  '/lessons/:lessonId/progress',
  authorize('ADMIN', 'TEACHER', 'STUDENT'),
  (req, res, next) => lessonsController.updateProgress(req, res, next)
)
