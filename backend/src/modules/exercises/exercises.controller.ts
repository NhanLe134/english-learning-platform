import type { NextFunction, Request, Response } from 'express'
import { ExerciseRequestError } from './exercises.errors.js'
import { exercisesService } from './exercises.service.js'
import type { AuthenticatedExerciseUser } from './exercises.types.js'

function getAuthUser(response: Response): AuthenticatedExerciseUser {
  const user = response.locals.authUser as AuthenticatedExerciseUser | undefined
  if (!user) {
    throw new ExerciseRequestError('Yêu cầu đăng nhập.', 401)
  }
  return user
}

function handleError(error: unknown, response: Response, next: NextFunction): void {
  if (error instanceof ExerciseRequestError) {
    response.status(error.status).json({ success: false, message: error.message })
    return
  }
  next(error)
}

export class ExercisesController {
  async listByCourse(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const courseId = String(request.params.courseId ?? '')
      const data = await exercisesService.listExercisesForCourse(courseId, user)
      response.status(200).json({ success: true, data })
    } catch (error) {
      handleError(error, response, next)
    }
  }

  async getDetail(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const exerciseId = String(request.params.exerciseId ?? '')
      const data = await exercisesService.getExerciseDetail(exerciseId, user)
      response.status(200).json({ success: true, data })
    } catch (error) {
      handleError(error, response, next)
    }
  }

  async createForCourse(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const courseId = String(request.params.courseId ?? '')
      const data = await exercisesService.createCourseExercise(courseId, user, request.body)
      response.status(201).json({ success: true, data })
    } catch (error) {
      handleError(error, response, next)
    }
  }

  async updateExercise(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const exerciseId = String(request.params.exerciseId ?? '')
      const data = await exercisesService.updateCourseExercise(exerciseId, user, request.body)
      response.status(200).json({ success: true, data })
    } catch (error) {
      handleError(error, response, next)
    }
  }

  async deleteExercise(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const exerciseId = String(request.params.exerciseId ?? '')
      await exercisesService.deleteCourseExercise(exerciseId, user)
      response.status(200).json({ success: true, message: 'Đã xóa bài tập.' })
    } catch (error) {
      handleError(error, response, next)
    }
  }

  async submitExercise(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = getAuthUser(response)
      const exerciseId = String(request.params.exerciseId ?? '')
      const data = await exercisesService.submitCourseExercise(exerciseId, user, request.body)
      response.status(200).json({ success: true, data })
    } catch (error) {
      handleError(error, response, next)
    }
  }
}

export const exercisesController = new ExercisesController()
