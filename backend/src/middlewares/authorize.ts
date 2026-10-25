import type { RequestHandler } from 'express'
import { AuthError } from '../modules/auth/auth.errors.js'
import type { UserRole } from '../modules/users/users.types.js'

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  if (allowedRoles.length === 0) {
    throw new Error('At least one role must be allowed')
  }

  return (_request, response, next) => {
    const user = response.locals.authUser as { role?: UserRole } | undefined
    if (!user) {
      next(new AuthError('Authentication is required', 401))
      return
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      next(new AuthError('You do not have permission to access this resource', 403))
      return
    }

    next()
  }
}
