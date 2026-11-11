import { Router } from 'express'
import { workshopController } from './workshop.controller.js'

export const workshopsRouter = Router()

workshopsRouter.get('/', (request, response, next) =>
  workshopController.listLatestWorkshops(request, response, next)
)
