import { Router } from 'express'
import { authorize } from '../../middlewares/authorize.js'
import { authenticate } from '../auth/auth.middleware.js'
import { courseController } from './course.controller.js'

export const coursesRouter = Router()

coursesRouter.get('/catalog', (request, response, next) =>
  courseController.listPublishedCourses(request, response, next)
)

coursesRouter.get('/', (request, response, next) =>
  courseController.getSelectedCourses(request, response, next)
)

coursesRouter.use('/admin', authenticate, authorize('ADMIN'))
coursesRouter.get('/admin', (request, response, next) =>
  courseController.listManagedCourses(request, response, next)
)
coursesRouter.post('/admin', (request, response, next) =>
  courseController.createManagedCourse(request, response, next)
)
coursesRouter.patch('/admin/:id', (request, response, next) =>
  courseController.updateManagedCourse(request, response, next)
)
coursesRouter.patch('/admin/:id/status', (request, response, next) =>
  courseController.updateManagedCourseStatus(request, response, next)
)
coursesRouter.delete('/admin/:id', (request, response, next) =>
  courseController.deleteManagedCourse(request, response, next)
)

coursesRouter.get('/:identifier', (request, response, next) =>
  courseController.getPublishedCourse(request, response, next)
)
