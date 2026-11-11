import type { Request, Response, NextFunction } from 'express'
import { WorkshopRequestError, workshopService } from './workshop.service.js'

export class WorkshopController {
  async listLatestWorkshops(
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const workshops = await workshopService.listLatestWorkshops(
        request.query as Record<string, unknown>
      )
      response.status(200).json({ success: true, data: workshops })
    } catch (error) {
      if (error instanceof WorkshopRequestError) {
        response.status(error.statusCode).json({ success: false, message: error.message })
        return
      }
      next(error)
    }
  }
}

export const workshopController = new WorkshopController()
