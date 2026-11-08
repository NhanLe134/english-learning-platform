import type { Request, Response, NextFunction } from 'express'
import { CourseRequestError, courseService } from './course.service.js'

export class CourseController {
  async listPublishedCourses(
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const courses = await courseService.listPublishedCourses()
      response.status(200).json({ success: true, data: courses })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async getPublishedCourse(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const course = await courseService.getPublishedCourse(String(request.params.identifier))
      if (!course) {
        response.status(404).json({ success: false, message: 'Published course not found.' })
        return
      }
      response.status(200).json({ success: true, data: course })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async listManagedCourses(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await courseService.listManagedCourses(
        request.query as Record<string, unknown>
      )
      response.status(200).json({ success: true, data: result.items, pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      } })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async createManagedCourse(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = response.locals.authUser as { id?: unknown } | undefined
      const course = await courseService.createManagedCourse(request.body, String(user?.id ?? ''))
      response.status(201).json({ success: true, data: course })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async updateManagedCourse(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const course = await courseService.updateManagedCourse(String(request.params.id), request.body)
      response.status(200).json({ success: true, data: course })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async updateManagedCourseStatus(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const course = await courseService.updateManagedCourseStatus(
        String(request.params.id),
        request.body
      )
      response.status(200).json({ success: true, data: course })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async deleteManagedCourse(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await courseService.deleteManagedCourse(String(request.params.id))
      response.status(200).json({ success: true, message: 'Course deleted.' })
    } catch (error) {
      this.handleError(error, response, next)
    }
  }

  async getSelectedCourses(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { courses, missingIds } = await courseService.getSelectedCourses(request.query.ids)
      if (missingIds.length > 0) {
        response.status(404).json({
          success: false,
          message: 'One or more selected courses are unavailable.',
          missingIds,
        })
        return
      }

      response.status(200).json({ success: true, data: courses })
    } catch (error) {
      if (error instanceof CourseRequestError) {
        response.status(error.statusCode).json({
          success: false,
          message: error.message,
          ...(error.missingIds ? { missingIds: error.missingIds } : {}),
        })
        return
      }
      next(error)
    }
  }

  private handleError(error: unknown, response: Response, next: NextFunction): void {
    if (error instanceof CourseRequestError) {
      response.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.missingIds ? { missingIds: error.missingIds } : {}),
      })
      return
    }
    next(error)
  }
}

export const courseController = new CourseController()
