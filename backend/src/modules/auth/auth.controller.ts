import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { env } from '../../config/env.js'
import { AuthError } from './auth.errors.js'
import { authService, GENERIC_FORGOT_MESSAGE } from './auth.service.js'
import { REFRESH_TOKEN_LIFETIME_MS } from './auth.tokens.js'
import {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
} from './google-oauth.js'

const REFRESH_COOKIE = 'english_learning_platform_refresh'
const REMEMBER_COOKIE = 'english_learning_platform_remember'
const GOOGLE_STATE_COOKIE = 'english_learning_platform_google_state'
const GOOGLE_ACCESS_HANDOFF_COOKIE = 'english_learning_platform_google_access_handoff'

function appendGoogleStateCookie(response: Response, state: string): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${GOOGLE_STATE_COOKIE}=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  )
}

function clearGoogleStateCookie(response: Response): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${GOOGLE_STATE_COOKIE}=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  )
}

function setGoogleAccessHandoffCookie(response: Response, accessToken: string): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${GOOGLE_ACCESS_HANDOFF_COOKIE}=${encodeURIComponent(accessToken)}; Path=/api/auth/google/session; HttpOnly; SameSite=Lax; Max-Age=60${secure}`
  )
}

function clearGoogleAccessHandoffCookie(response: Response): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  response.append(
    'Set-Cookie',
    `${GOOGLE_ACCESS_HANDOFF_COOKIE}=; Path=/api/auth/google/session; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  )
}

function googleStateCookie(request: Request): string | undefined {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return undefined

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== GOOGLE_STATE_COOKIE) continue
    return cookie.slice(separator + 1).trim() || undefined
  }
  return undefined
}

function googleAccessHandoffCookie(request: Request): string | undefined {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return undefined
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== GOOGLE_ACCESS_HANDOFF_COOKIE) continue
    const value = cookie.slice(separator + 1).trim()
    if (!value) return undefined
    try {
      return decodeURIComponent(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

function matchesGoogleState(expected: string | undefined, actual: unknown): boolean {
  if (!expected || typeof actual !== 'string') return false
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

function setRefreshCookie(response: Response, token: string, rememberMe = true): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  const maxAge = rememberMe
    ? `; Max-Age=${Math.floor(REFRESH_TOKEN_LIFETIME_MS / 1000)}`
    : ''
  response.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${token}; Path=/api/auth; HttpOnly; SameSite=Lax${maxAge}${secure}`
  )
  response.append(
    'Set-Cookie',
    `${REMEMBER_COOKIE}=${rememberMe ? '1' : '0'}; Path=/api/auth; HttpOnly; SameSite=Lax${maxAge}${secure}`
  )
}

function clearRefreshCookie(response: Response): void {
  const secure = env.nodeEnv === 'production' ? '; Secure' : ''
  const expiration = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  response.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; ${expiration}${secure}`
  )
  response.append(
    'Set-Cookie',
    `${REMEMBER_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; ${expiration}${secure}`
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

function shouldRememberLogin(request: Request): boolean {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return true

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== REMEMBER_COOKIE) continue
    return cookie.slice(separator + 1).trim() !== '0'
  }

  return true
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.get('authorization') ?? ''
  return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1]
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new AuthError(`${field} is required`, 400)
  return value
}

function respondWithTokens(
  response: Response,
  tokens: Awaited<ReturnType<typeof authService.login>>,
  rememberMe = true
): void {
  setRefreshCookie(response, tokens.refreshToken, rememberMe)
  response.status(200).json({
    success: true,
    data: { accessToken: tokens.accessToken, user: tokens.user },
  })
}

export class AuthController {
  googleRedirect(_request: Request, response: Response, next: NextFunction): void {
    try {
      const state = randomBytes(32).toString('base64url')
      appendGoogleStateCookie(response, state)
      response.redirect(302, createGoogleAuthorizationUrl(state))
    } catch (error) {
      next(error)
    }
  }

  async googleCallback(request: Request, response: Response, next: NextFunction): Promise<void> {
    clearGoogleStateCookie(response)
    try {
      if (request.query.error) {
        throw new AuthError('Đăng nhập Google đã bị hủy hoặc bị từ chối.', 401)
      }
      if (!matchesGoogleState(googleStateCookie(request), request.query.state)) {
        throw new AuthError('Trạng thái OAuth không hợp lệ hoặc đã hết hạn.', 401)
      }
      const code = request.query.code
      if (typeof code !== 'string' || !code) {
        throw new AuthError('Google không trả về mã xác thực.', 400)
      }

      const accessToken = await exchangeGoogleAuthorizationCode(code)
      const tokens = await authService.loginWithGoogle({ accessToken })
      setRefreshCookie(response, tokens.refreshToken, true)
      setGoogleAccessHandoffCookie(response, tokens.accessToken)
      response.redirect(
        302,
        new URL('/auth/callback?provider=google', env.frontendUrl).toString()
      )
    } catch (error) {
      next(error)
    }
  }

  async register(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await authService.register({
        fullName: requireString(request.body?.fullName, 'fullName'),
        dateOfBirth: typeof request.body?.dateOfBirth === 'string' ? request.body.dateOfBirth : '',
        email: requireString(request.body?.email, 'email'),
        phoneNumber: requireString(request.body?.phoneNumber, 'phoneNumber'),
        password: requireString(request.body?.password, 'password'),
        confirmPassword: requireString(request.body?.confirmPassword, 'confirmPassword'),
        selectedCourseIds: request.body?.selectedCourseIds,
        googleAccessToken: typeof request.body?.googleAccessToken === 'string' ? request.body.googleAccessToken : undefined,
      })
      response.status(202).json({
        success: true,
        message: 'Registration is awaiting email verification.',
        data: registration,
      })
    } catch (error) {
      next(error)
    }
  }

  async resendRegistrationOtp(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const result = await authService.requestRegistrationOtp(email)
      response.status(202).json({
        success: true,
        message: 'Yêu cầu đã được tiếp nhận. Nếu cần xác minh, hãy kiểm tra email; nếu chưa nhận được mã, vui lòng thử gửi lại sau.',
        ...(result.developmentOtp ? { developmentOtp: result.developmentOtp } : {}),
        ...(result.developmentEmailFallback ? { developmentEmailFallback: true } : {}),
      })
    } catch (error) {
      next(error)
    }
  }

  async verifyRegistrationOtp(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const otp = requireString(request.body?.otp, 'otp')
      await authService.verifyRegistrationOtp(email, otp)
      response.status(200).json({ success: true, data: { verified: true } })
    } catch (error) {
      next(error)
    }
  }

  async login(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const email = requireString(request.body?.email, 'email')
      const password = requireString(request.body?.password, 'password')
      const rememberMe = request.body?.rememberMe
      if (rememberMe !== undefined && typeof rememberMe !== 'boolean') {
        throw new AuthError('rememberMe must be a boolean', 400)
      }
      const tokens = await authService.login(email, password)
      respondWithTokens(response, tokens, typeof rememberMe === 'boolean' ? rememberMe : true)
    } catch (error) {
      next(error)
    }
  }

  async google(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.loginWithGoogle(request.body ?? {})
      respondWithTokens(response, tokens, true)
    } catch (error) {
      next(error)
    }
  }

  async consumeGoogleLogin(request: Request, response: Response, next: NextFunction): Promise<void> {
    const accessToken = googleAccessHandoffCookie(request)
    clearGoogleAccessHandoffCookie(response)
    try {
      if (!accessToken) throw new AuthError('Google login handoff is missing or expired.', 401)
      const user = await authService.authenticateAccessToken(accessToken)
      response.status(200).json({
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone_number: user.phone_number,
            role: user.role,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async googleIdentity(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await authService.getGoogleIdentity(request.body ?? {})
      response.status(200).json({ success: true, data: identity })
    } catch (error) {
      next(error)
    }
  }

  async refresh(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(refreshCookie(request))
      respondWithTokens(response, tokens, shouldRememberLogin(request))
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
      })
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
