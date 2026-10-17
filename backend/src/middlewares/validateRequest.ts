import type { RequestHandler } from 'express'

export type RequestValidator = (request: Parameters<RequestHandler>[0]) => string | undefined

export function validateRequest(validate: RequestValidator): RequestHandler {
  return (request, response, next) => {
    const validationError = validate(request)

    if (validationError) {
      response.status(400).json({ message: validationError })
      return
    }

    next()
  }
}
