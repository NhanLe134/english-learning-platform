import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { createResendClient } from '../../config/resend.js'
import type { UserProfile } from '../users/users.types.js'
import { AuthError } from './auth.errors.js'
import { authRepository } from './auth.repository.js'
import type { AuthSession } from './auth.repository.js'
import {
  createAccessToken,
  createRefreshToken,
  createResetToken,
  hashToken,
  REFRESH_TOKEN_LIFETIME_MS,
  RESET_TOKEN_LIFETIME_MS,
  verifyAccessToken,
  verifyRefreshToken,
} from './auth.tokens.js'

interface UserService {
  createStudentAccount(email: string, password: string): Promise<UserProfile>
  rollbackStudentAccount(userId: string): Promise<void>
  authenticatePassword(email: string, password: string): Promise<UserProfile | null>
  updatePassword(id: string, password: string): Promise<void>
  findById(id: string): Promise<UserProfile | null>
  findByEmail(email: string): Promise<UserProfile | null>
}

interface AuthStore {
  createSession(id: string, userId: string, refreshTokenHash: string, expiresAt: string): Promise<void>
  findSessionById(id: string): Promise<AuthSession | null>
  rotateSession(id: string, previousHash: string, nextHash: string, expiresAt: string): Promise<boolean>
  revokeSession(id: string): Promise<void>
  issuePasswordResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<void>
  consumePasswordResetToken(tokenHash: string): Promise<string | null>
  revokeUserSessions(userId: string): Promise<void>
}

interface ResetEmail {
  from: string
  to: string
  subject: string
  html: string
}

type ResetEmailSender = (email: ResetEmail) => Promise<void>

export const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that address, a reset link will be sent.'

export interface ForgotPasswordResult {
  message: string
  resetUrl?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  user: Pick<UserProfile, 'id' | 'email' | 'role'>
}

function publicUser(user: UserProfile): TokenPair['user'] {
  return { id: user.id, email: user.email, role: user.role }
}

function genericCredentialsError(): AuthError {
  return new AuthError('Invalid email or password', 401)
}

function invalidTokenError(): AuthError {
  return new AuthError('Invalid or expired authentication token', 401)
}

function canExposeDevelopmentResetLink(): boolean {
  return env.nodeEnv === 'development' && env.authExposeResetLink
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): void {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new AuthError('Password must be at least 12 characters and no more than 72 UTF-8 bytes', 400)
  }
}

function hasMissingAuthSchema(error: unknown, seen = new Set<unknown>()): boolean {
  if (!error || typeof error !== 'object' || seen.has(error)) return false
  seen.add(error)

  if ('code' in error && (error.code === '42P01' || error.code === '42703')) return true
  if ('cause' in error && hasMissingAuthSchema(error.cause, seen)) return true
  if (error instanceof AggregateError) {
    return [...error.errors].some((nestedError) => hasMissingAuthSchema(nestedError, seen))
  }
  return false
}

function missingAuthSchemaError(cause: unknown): AuthError {
  return new AuthError(
    'Authentication database tables are missing. Apply supabase/migrations/20261025003000_database_url_auth.sql, then restart the backend.',
    503,
    cause
  )
}

function makeResetUrl(token: string): string {
  let frontendUrl: URL
  try {
    frontendUrl = new URL(env.frontendUrl)
  } catch {
    throw new Error('FRONTEND_URL must be a valid URL')
  }

  if (
    !['https:', 'http:'].includes(frontendUrl.protocol) ||
    frontendUrl.username ||
    frontendUrl.password ||
    (env.nodeEnv === 'production' && frontendUrl.protocol !== 'https:')
  ) {
    throw new Error('FRONTEND_URL must be a secure web origin')
  }

  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, frontendUrl).toString()
}

export class AuthService {
  constructor(
    private readonly users: UserService = authRepository,
    private readonly store: AuthStore = authRepository,
    private readonly sendResetEmail: ResetEmailSender = async (email) => {
      const { error } = await createResendClient().emails.send(email)
      if (error) throw new Error('Resend rejected the password reset email')
    }
  ) {}

  private assertSigningSecretConfigured(): void {
    if (Buffer.byteLength(env.authJwtSecret, 'utf8') < 32) {
      throw new AuthError(
        'Authentication is unavailable. Set AUTH_JWT_SECRET to a random value of at least 32 bytes.',
        503
      )
    }
  }

  async register(email: string, password: string, confirmPassword: string): Promise<TokenPair> {
    this.assertSigningSecretConfigured()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) throw new AuthError('Invalid email address', 400)
    if (password !== confirmPassword) throw new AuthError('Passwords do not match', 400)
    validatePassword(password)

    let createdUser: UserProfile | undefined
    try {
      const user = await this.users.createStudentAccount(normalizedEmail, password)
      createdUser = user
      return await this.createSession(user)
    } catch (error) {
      if (createdUser) {
        await this.users.rollbackStudentAccount(createdUser.id)
      }
      if (error instanceof Error && error.message.toLowerCase().includes('already registered')) {
        throw new AuthError('An account with this email already exists', 409)
      }
      if (error instanceof Error && error.message.startsWith('Invalid email')) {
        throw new AuthError('Invalid email address', 400)
      }
      if (error instanceof AuthError) throw error
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error)

      const missingDatabaseConfig =
        error instanceof Error &&
        error.message.includes('DATABASE_URL (or DB_URL)')
      throw new AuthError(
        missingDatabaseConfig
          ? 'Registration is unavailable because PostgreSQL is not configured. Set DATABASE_URL in backend/.env.'
          : 'Registration could not be completed because the authentication service is unavailable. Please try again later.',
        503,
        error
      )
    }
  }

  async login(email: string, password: string): Promise<TokenPair> {
    this.assertSigningSecretConfigured()
    if (
      !isValidEmail(email.trim()) ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      throw genericCredentialsError()
    }
    let user: UserProfile | null
    try {
      user = await this.users.authenticatePassword(email.trim().toLowerCase(), password)
    } catch (error) {
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error)
      throw new AuthError(
        'Authentication database is unavailable. Verify DATABASE_URL and PostgreSQL connectivity.',
        503,
        error
      )
    }
    if (!user || user.status !== 'active') throw genericCredentialsError()
    try {
      return await this.createSession(user)
    } catch (error) {
      throw new AuthError(
        'Authentication session storage is unavailable. Verify PostgreSQL access and apply the auth database migration.',
        503,
        error
      )
    }
  }

  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    this.assertSigningSecretConfigured()
    if (!refreshToken) throw invalidTokenError()
    const tokenInfo = verifyRefreshToken(refreshToken)
    if (!tokenInfo) throw invalidTokenError()

    const session = await this.store.findSessionById(tokenInfo.sessionId)
    if (!session) throw invalidTokenError()

    const oldHash = hashToken(refreshToken)
    const sessionExpiry = Date.parse(session.expires_at)
    if (session.refresh_token_hash !== oldHash) {
      await this.store.revokeSession(session.id)
      throw invalidTokenError()
    }
    if (session.revoked_at || !Number.isFinite(sessionExpiry) || sessionExpiry <= Date.now()) {
      throw invalidTokenError()
    }

    const user = await this.users.findById(session.user_id)
    if (!user || user.status !== 'active') {
      await this.store.revokeSession(session.id)
      throw invalidTokenError()
    }

    const now = Date.now()
    const nextRefresh = createRefreshToken(session.id, now)
    const expiresAt = new Date(now + REFRESH_TOKEN_LIFETIME_MS).toISOString()
    const rotated = await this.store.rotateSession(
      session.id,
      oldHash,
      hashToken(nextRefresh),
      expiresAt
    )
    if (!rotated) {
      await this.store.revokeSession(session.id)
      throw invalidTokenError()
    }

    const accessToken = createAccessToken(user.id, session.id)
    return { accessToken, refreshToken: nextRefresh, user: publicUser(user) }
  }

  async logout(accessToken: string | undefined, refreshToken?: string): Promise<void> {
    this.assertSigningSecretConfigured()
    if (accessToken) {
      const claims = verifyAccessToken(accessToken)
      if (claims) {
        const session = await this.store.findSessionById(claims.sid)
        if (!session || session.user_id !== claims.sub) throw invalidTokenError()
        await this.store.revokeSession(claims.sid)
        return
      }
    }

    if (refreshToken) {
      const tokenInfo = verifyRefreshToken(refreshToken)
      if (!tokenInfo) throw invalidTokenError()
      const session = await this.store.findSessionById(tokenInfo.sessionId)
      if (
        !session ||
        session.revoked_at ||
        session.refresh_token_hash !== hashToken(refreshToken) ||
        Date.parse(session.expires_at) <= Date.now()
      ) {
        throw invalidTokenError()
      }
      await this.store.revokeSession(session.id)
      return
    }

    throw invalidTokenError()
  }

  async authenticateAccessToken(accessToken: string | undefined): Promise<UserProfile> {
    this.assertSigningSecretConfigured()
    if (!accessToken) throw invalidTokenError()
    const claims = verifyAccessToken(accessToken)
    if (!claims) throw invalidTokenError()

    const session = await this.store.findSessionById(claims.sid)
    const sessionExpiry = session ? Date.parse(session.expires_at) : Number.NaN
    if (
      !session ||
      session.user_id !== claims.sub ||
      session.revoked_at ||
      !Number.isFinite(sessionExpiry) ||
      sessionExpiry <= Date.now()
    ) {
      throw invalidTokenError()
    }

    const user = await this.users.findById(claims.sub)
    if (!user || user.status !== 'active') throw invalidTokenError()
    return user
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    this.assertSigningSecretConfigured()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) return { message: GENERIC_FORGOT_MESSAGE }
    const user = await this.users.findByEmail(normalizedEmail)
    if (!user || user.status !== 'active') return { message: GENERIC_FORGOT_MESSAGE }

    const token = createResetToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS).toISOString()
    await this.store.issuePasswordResetToken(user.id, hashToken(token), expiresAt)

    let resetUrl: string | undefined
    try {
      resetUrl = makeResetUrl(token)
      if (!env.emailFrom) throw new Error('EMAIL_FROM is not configured')
      await this.sendResetEmail({
        from: env.emailFrom,
        to: user.email,
        subject: 'Reset your English Learning Platform password',
        html: `<p>A password reset was requested for your English Learning Platform account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
      })
    } catch (error) {
      console.error('[Auth] Password-reset email delivery failed', error instanceof Error ? error.name : 'UnknownError')
    }
    return {
      message: GENERIC_FORGOT_MESSAGE,
      ...(canExposeDevelopmentResetLink() && resetUrl ? { resetUrl } : {}),
    }
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<void> {
    this.assertSigningSecretConfigured()
    if (!token || token.length > 256) {
      throw new AuthError('Invalid or expired reset token', 400)
    }
    if (newPassword !== confirmPassword) throw new AuthError('Passwords do not match', 400)
    validatePassword(newPassword)
    const userId = await this.store.consumePasswordResetToken(hashToken(token))
    if (!userId) throw new AuthError('Invalid or expired reset token', 400)
    await this.users.updatePassword(userId, newPassword)
    await this.store.revokeUserSessions(userId)
  }

  private async createSession(user: UserProfile): Promise<TokenPair> {
    const sessionId = randomUUID()
    const now = Date.now()
    const refreshToken = createRefreshToken(sessionId, now)
    const accessToken = createAccessToken(user.id, sessionId, now)
    const expiresAt = new Date(now + REFRESH_TOKEN_LIFETIME_MS).toISOString()
    await this.store.createSession(
      sessionId,
      user.id,
      hashToken(refreshToken),
      expiresAt
    )

    return { accessToken, refreshToken, user: publicUser(user) }
  }
}

export const authService = new AuthService()
