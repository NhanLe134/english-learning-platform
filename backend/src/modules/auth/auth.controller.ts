import type { Request, Response, NextFunction } from 'express'
import { env } from '../../config/env.js'
import { AuthError } from './auth.errors.js'
import { authService, GENERIC_FORGOT_MESSAGE } from './auth.service.js'
import { REFRESH_TOKEN_LIFETIME_MS } from './auth.tokens.js'

const REFRESH_COOKIE = 'english_learning_platform_refresh'

function setRefreshCookie(response: Response, token: string): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${token}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(REFRESH_TOKEN_LIFETIME_MS / 1000)}${secure}`
  )
}

function clearRefreshCookie(response: Response): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`
  )
}

function refreshCookie(request: Request): string | undefined {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return undefined

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== REFRESH_COOKIE) continue
    return cookie.slice(separator + 1).trim() || undefined
  }

  return undefined
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.get('authorization') ?? ''
  return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1]
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new AuthError(`${field} is required`, 400)
  return value
}

function respondWithTokens(response: Response, tokens: Awaited<ReturnType<typeof authService.login>>): void {
  setRefreshCookie(response, tokens.refreshToken)
  response.status(200).json({
    success: true,
    data: { accessToken: tokens.accessToken, user: tokens.user },
  })
}

export class AuthController {
  async register(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const password = requireString(request.body?.password, 'password')
      const confirmPassword = requireString(request.body?.confirmPassword, 'confirmPassword')
      if (password !== confirmPassword) throw new AuthError('Passwords do not match', 400)
      const tokens = await authService.register(email, password, confirmPassword)
      setRefreshCookie(response, tokens.refreshToken)
      response.status(201).json({
        success: true,
        data: { accessToken: tokens.accessToken, user: tokens.user },
      })
    } catch (error) {
      next(error)
    }
  }

  async login(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const password = requireString(request.body?.password, 'password')
      const tokens = await authService.login(email, password)
      respondWithTokens(response, tokens)
    } catch (error) {
      next(error)
    }
  }

  async refresh(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(refreshCookie(request))
      respondWithTokens(response, tokens)
    } catch (error) {
      clearRefreshCookie(response)
      next(error)
    }
  }

  async logout(request: Request, response: Response, next: NextFunction): Promise<void> {
    clearRefreshCookie(response)
    try {
      await authService.logout(bearerToken(request), refreshCookie(request))
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  }

  async forgotPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const result = await authService.forgotPassword(email)
      response.status(200).json({
        success: true,
        message: result.message || GENERIC_FORGOT_MESSAGE,
        ...(env.nodeEnv === 'development' && env.authExposeResetLink && result.resetUrl
          ? { resetUrl: result.resetUrl }
          : {}),
      })
    } catch (error) {
      next(error)
    }
  }

  async resetPassword(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const token = requireString(request.body?.token, 'token')
      const newPassword = requireString(request.body?.newPassword, 'newPassword')
      const confirmPassword = requireString(request.body?.confirmPassword, 'confirmPassword')
      if (newPassword !== confirmPassword) throw new AuthError('Passwords do not match', 400)
      await authService.resetPassword(token, newPassword, confirmPassword)
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  }

  me(_request: Request, response: Response, next: NextFunction): void {
    const user = response.locals.authUser
    if (!user) {
      next(new AuthError('Authentication is required', 401))
      return
    }

    response.status(200).json({
      success: true,
      data: { id: user.id, email: user.email, role: user.role },
    })
  }
}

export const authController = new AuthController()
