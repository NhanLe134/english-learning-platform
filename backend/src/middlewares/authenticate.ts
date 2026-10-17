import type { RequestHandler } from 'express'

export const authenticate: RequestHandler = (_request, response) => {
  response.status(501).json({ message: 'Authentication is not implemented yet' })
}
