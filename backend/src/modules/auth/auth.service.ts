import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { createResendClient } from '../../config/resend.js'
import type { UserProfile } from '../users/users.types.js'
import { AuthError } from './auth.errors.js'
import { usersService } from '../users/users.service.js'
import {
  authRepository,
  type RegistrationOtpIssueResult,
  type RegistrationOtpVerifyResult,
} from './auth.repository.js'
import type { AuthSession } from './auth.repository.js'
import { CourseRequestError, courseService } from '../courses/course.service.js'
import {
  generateRegistrationOtp,
  hashRegistrationOtp,
  REGISTRATION_OTP_EXPIRY_MS,
  REGISTRATION_OTP_MAX_ATTEMPTS,
  REGISTRATION_OTP_RESEND_COOLDOWN_MS,
  renderRegistrationVerificationEmail,
} from './registration-otp.js'
import {
  generateTemporaryPassword,
  renderTemporaryPasswordEmail,
} from './temporary-password.js'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_LIFETIME_MS,
  verifyAccessToken,
  verifyRefreshToken,
} from './auth.tokens.js'
import type { GoogleAuthInput } from './google.types.js'
import { getGoogleRegistrationDetails, verifyGoogleAuthInput } from './google.verifier.js'

interface UserService {
  createStudentAccount(
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string | null,
    phoneNumber: string,
    selectedCourseIds: string[],
    googleDetails?: { phoneNumber: string | null; dateOfBirth: string | null; avatarUrl: string | null; googleId: string }
  ): Promise<UserProfile>
  createGoogleAccount(email: string, fullName: string, avatarUrl: string | null): Promise<UserProfile>
  rollbackStudentAccount(userId: string): Promise<void>
  authenticatePassword(email: string, password: string): Promise<UserProfile | null>
  updatePasswordAndVerifyEmail(id: string, password: string): Promise<void>
  findById(id: string): Promise<UserProfile | null>
  findByEmail(email: string): Promise<UserProfile | null>
}

interface AdminAuthProvider {
  authenticatePassword(email: string, password: string): Promise<UserProfile | null>
  findByEmail(email: string): Promise<UserProfile | null>
  findById(id: string): Promise<UserProfile | null>
  updatePassword(id: string, email: string, password: string): Promise<void>
  verifyEmail(id: string): Promise<void>
}

interface AuthStore {
  createSession(id: string, userId: string, refreshTokenHash: string, expiresAt: string): Promise<void>
  findSessionById(id: string): Promise<AuthSession | null>
  rotateSession(id: string, previousHash: string, nextHash: string, expiresAt: string): Promise<boolean>
  revokeSession(id: string): Promise<void>
  revokeUserSessions(userId: string): Promise<void>
  issueRegistrationOtp(
    email: string,
    otp: string,
    expiresAt: string,
    sentAt: string,
    cooldownMs: number
  ): Promise<RegistrationOtpIssueResult>
  invalidateRegistrationOtp(userId: string, otpHash: string): Promise<void>
  verifyRegistrationOtp(
    email: string,
    otp: string,
    now: string,
    maxAttempts: number
  ): Promise<RegistrationOtpVerifyResult>
}

interface AuthEmail {
  from: string
  to: string
  subject: string
  html: string
  text?: string
}

interface CourseSelectionService {
  validateSelectedCourseIds(ids: unknown): Promise<{ courseIds: string[]; missingIds: string[] }>
}

type AuthEmailSender = (email: AuthEmail) => Promise<void>

export interface RegistrationInput {
  fullName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
  selectedCourseIds?: string[]
  googleAccessToken?: string
}

export interface RegistrationResult {
  verificationRequired: true
  email: string
  selectedCourseIds: string[]
}

export interface RegistrationOtpRequestResult {
  status: 'sent' | 'ignored' | 'cooldown'
  retryAfterSeconds?: number
  developmentOtp?: string
  developmentEmailFallback?: boolean
}

export const GENERIC_FORGOT_MESSAGE =
  'If an account exists for that address, a temporary password will be sent.'

export interface ForgotPasswordResult {
  message: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  user: Pick<UserProfile, 'id' | 'email' | 'full_name' | 'phone_number' | 'role'>
}

function publicUser(user: UserProfile): TokenPair['user'] {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone_number: user.phone_number ?? null,
    role: user.role,
  }
}

function genericCredentialsError(): AuthError {
  return new AuthError('Invalid email or password', 401)
}

function invalidTokenError(): AuthError {
  return new AuthError('Invalid or expired authentication token', 401)
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): void {
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new AuthError('Password must be at least 8 characters and no more than 72 UTF-8 bytes', 400)
  }
}

function validateDateOfBirth(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AuthError('Date of birth must use the YYYY-MM-DD format.', 400)
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== value ||
    parsedDate.getTime() > Date.now()
  ) {
    throw new AuthError('Date of birth must be a valid date in the past.', 400)
  }

  return value
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

function missingAuthSchemaError(cause: unknown, includeOtpMigration = false): AuthError {
  const otpMigration = includeOtpMigration
    ? ' and supabase/migrations/20261031031000_add_registration_email_otps.sql'
    : ''
  return new AuthError(
    `Authentication database schema is incomplete. Apply supabase/migrations/20261025003000_database_url_auth.sql and supabase/migrations/20261031024400_add_private_registration_details.sql${otpMigration}, then restart the backend.`,
    503,
    cause
  )
}

export class AuthService {
  constructor(
    private readonly users: UserService = authRepository,
    private readonly store: AuthStore = authRepository,
    private readonly sendTemporaryPasswordEmail: AuthEmailSender = async (email) => {
      const { error } = await createResendClient().emails.send(email)
      if (error) throw new Error('Resend rejected the temporary password email')
    },
    private readonly courses: CourseSelectionService = courseService,
    private readonly sendVerificationEmail: AuthEmailSender = async (email) => {
      const { error } = await createResendClient().emails.send(email)
      if (error) throw new Error('Resend rejected the verification email')
    },
    private readonly adminAuth: AdminAuthProvider = usersService
  ) {}

  private assertSigningSecretConfigured(): void {
    if (Buffer.byteLength(env.authJwtSecret, 'utf8') < 32) {
      throw new AuthError(
        'Authentication is unavailable. Set AUTH_JWT_SECRET to a random value of at least 32 bytes.',
        503
      )
    }
  }

  async register(input: RegistrationInput): Promise<RegistrationResult> {
    const fullName = input.fullName.trim()
    if (!fullName || fullName.length > 120) {
      throw new AuthError('Full name is required and must be at most 120 characters.', 400)
    }
    let googleDetails: Awaited<ReturnType<typeof getGoogleRegistrationDetails>> | null = null
    if (input.googleAccessToken) {
      googleDetails = await getGoogleRegistrationDetails(input.googleAccessToken)
      if (googleDetails.email !== input.email.trim().toLowerCase()) {
        throw new AuthError('The Google account does not match the registration email.', 400)
      }
    }
    const dateOfBirth = input.dateOfBirth ? validateDateOfBirth(input.dateOfBirth) : null
    if (!dateOfBirth && !input.googleAccessToken) {
      throw new AuthError('Date of birth is required.', 400)
    }
    const normalizedEmail = input.email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) throw new AuthError('Invalid email address', 400)
    const phoneNumber = input.phoneNumber.trim()
    const phoneDigits = phoneNumber.replace(/\D/g, '').length
    if (!phoneNumber && !input.googleAccessToken) {
      throw new AuthError('Please enter a valid phone number.', 400)
    }
    if (phoneNumber && (
      phoneNumber.length > 32 ||
      !/^\+?[\d\s().-]+$/.test(phoneNumber) ||
      phoneDigits < 7 ||
      phoneDigits > 15
    )) {
      throw new AuthError('Please enter a valid phone number.', 400)
    }
    if (input.password !== input.confirmPassword) {
      throw new AuthError('Passwords do not match', 400)
    }
    validatePassword(input.password)

    let selectedCourseIds: string[]
    try {
      const validatedCourses = await this.courses.validateSelectedCourseIds(
        input.selectedCourseIds ?? []
      )
      if (validatedCourses.missingIds.length > 0) {
        throw new AuthError('One or more selected courses are unavailable.', 400)
      }
      selectedCourseIds = validatedCourses.courseIds
    } catch (error) {
      if (error instanceof AuthError) throw error
      if (error instanceof CourseRequestError) {
        throw new AuthError(error.message, error.statusCode, error)
      }
      throw new AuthError('Unable to validate selected courses. Please try again later.', 503, error)
    }

    try {
      const user = await this.users.createStudentAccount(
        normalizedEmail,
        input.password,
        fullName,
        dateOfBirth ?? googleDetails?.dateOfBirth ?? null,
        phoneNumber || googleDetails?.phoneNumber || '',
        selectedCourseIds,
        googleDetails ? {
          phoneNumber: googleDetails.phoneNumber,
          dateOfBirth: googleDetails.dateOfBirth,
          avatarUrl: googleDetails.avatarUrl,
          googleId: googleDetails.googleId,
        } : undefined
      )
      return {
        verificationRequired: true,
        email: user.email,
        selectedCourseIds,
      }
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('already registered')) {
        throw new AuthError('An account with this email already exists', 409)
      }
      if (error instanceof Error && error.message.startsWith('Invalid email')) {
        throw new AuthError('Invalid email address', 400)
      }
      if (error instanceof AuthError) throw error
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error, true)

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

  async requestRegistrationOtp(email: string): Promise<RegistrationOtpRequestResult> {
    this.assertSigningSecretConfigured()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) throw new AuthError('Invalid email address', 400)
    if (!env.emailFrom || !env.resendApiKey) {
      throw new AuthError(
        'Email verification is unavailable. Configure RESEND_API_KEY and EMAIL_FROM.',
        503
      )
    }

    const otp = generateRegistrationOtp()
    const now = new Date()
    let issue: RegistrationOtpIssueResult
    try {
      issue = await this.store.issueRegistrationOtp(
        normalizedEmail,
        otp,
        new Date(now.getTime() + REGISTRATION_OTP_EXPIRY_MS).toISOString(),
        now.toISOString(),
        REGISTRATION_OTP_RESEND_COOLDOWN_MS
      )
    } catch (error) {
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error, true)
      throw new AuthError('Unable to prepare email verification. Please try again later.', 503, error)
    }

    if (issue.status === 'not_registered') return { status: 'ignored' }
    if (issue.status === 'cooldown') {
      return { status: 'cooldown', retryAfterSeconds: issue.retryAfterSeconds }
    }

    const userOtpHash = hashRegistrationOtp(issue.userId, otp)
    try {
      await this.sendVerificationEmail({
        from: env.emailFrom,
        to: issue.email,
        subject: 'Mã xác minh đăng ký EngMaster',
        html: renderRegistrationVerificationEmail(issue.fullName, otp),
      })
    } catch (deliveryError) {
      if (env.nodeEnv === 'development' && env.authExposeRegistrationOtp) {
        console.warn('[Auth] Verification email unavailable; using development OTP fallback')
        return {
          status: 'sent',
          developmentOtp: otp,
          developmentEmailFallback: true,
        }
      }

      try {
        await this.store.invalidateRegistrationOtp(issue.userId, userOtpHash)
      } catch {
        console.error('[Auth] Undelivered verification code cleanup failed')
      }
      console.error('[Auth] Verification email delivery failed', {
        name: deliveryError instanceof Error ? deliveryError.name : 'UnknownError',
      })
      throw new AuthError(
        'Hệ thống chưa gửi được email xác minh. Vui lòng bấm gửi lại mã hoặc liên hệ hỗ trợ.',
        503,
        deliveryError
      )
    }

    return {
      status: 'sent',
      ...(env.nodeEnv === 'development' && env.authExposeRegistrationOtp
        ? { developmentOtp: otp }
        : {}),
    }
  }

  async verifyRegistrationOtp(email: string, otp: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) throw new AuthError('Invalid email address', 400)
    if (!/^\d{6}$/.test(otp)) {
      throw new AuthError('Mã xác minh phải gồm đúng 6 chữ số.', 400)
    }

    let result: RegistrationOtpVerifyResult
    try {
      result = await this.store.verifyRegistrationOtp(
        normalizedEmail,
        otp,
        new Date().toISOString(),
        REGISTRATION_OTP_MAX_ATTEMPTS
      )
    } catch (error) {
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error)
      throw new AuthError('Unable to verify the code. Please try again later.', 503, error)
    }

    switch (result.status) {
      case 'not_registered':
      case 'already_verified':
      case 'invalid':
      case 'expired':
      case 'attempts_exhausted':
        throw new AuthError('Mã xác minh không hợp lệ hoặc đã hết hạn.', 400)
      case 'verified':
        return
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
    let storedUser: UserProfile | null = null
    let databaseLookupError: unknown
    try {
      storedUser = await this.users.findByEmail(email.trim().toLowerCase())
    } catch (error) {
      databaseLookupError = error
    }

    let adminProfile: UserProfile | null = null
    let adminLookupError: unknown
    if (!storedUser || storedUser.role === 'ADMIN' || databaseLookupError) {
      try {
        adminProfile = await this.adminAuth.findByEmail(email.trim().toLowerCase())
      } catch (error) {
        adminLookupError = error
      }
    }

    if ((!adminProfile || adminProfile.role !== 'ADMIN') && databaseLookupError) {
      throw new AuthError(
        'Unable to look up this account. Verify PostgreSQL and Supabase connectivity.',
        503,
        new AggregateError(
          [databaseLookupError, ...(adminLookupError ? [adminLookupError] : [])],
          'Authentication account lookup failed'
        )
      )
    }
    if (storedUser?.role === 'ADMIN' && adminLookupError) {
      throw new AuthError('Admin authentication provider is unavailable.', 503, adminLookupError)
    }

    if (!adminProfile || adminProfile.role !== 'ADMIN') {
      return this.loginWithDatabasePassword(email, password)
    }

    let user: UserProfile | null
    try {
      user = await this.adminAuth.authenticatePassword(email.trim().toLowerCase(), password)
    } catch (error) {
      if (
        error instanceof Error &&
        /SUPABASE_PUBLISHABLE_KEY/.test(error.message)
      ) {
        throw new AuthError(
          'Admin login is not configured. Set SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in backend/.env and restart the backend.',
          503,
          error
        )
      }
      throw new AuthError('Admin authentication provider is unavailable.', 503, error)
    }
    if (!user || user.status !== 'active') throw genericCredentialsError()
    try {
      await this.adminAuth.verifyEmail(user.id)
    } catch (error) {
      throw new AuthError('Unable to update Admin email verification status.', 503, error)
    }
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

  private async loginWithDatabasePassword(email: string, password: string): Promise<TokenPair> {
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
    if (!user || user.is_verified !== true) {
      throw genericCredentialsError()
    }
    if (user.status === 'pending') {
      throw new AuthError('Complete course payment before logging in.', 403)
    }
    if (user.status !== 'active') throw genericCredentialsError()
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

  async loginWithGoogle(input: GoogleAuthInput): Promise<TokenPair> {
    this.assertSigningSecretConfigured()
    const userInfo = await verifyGoogleAuthInput(input, env.googleClientId)
    if (!userInfo.emailVerified) {
      throw new AuthError('Địa chỉ email Google chưa được xác minh.', 400)
    }

    let user: UserProfile | null
    try {
      user = await this.users.findByEmail(userInfo.email)
    } catch (error) {
      if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error)
      throw new AuthError('Không thể kiểm tra tài khoản Google trong cơ sở dữ liệu.', 503, error)
    }

    if (!user) {
      try {
        const admin = await this.adminAuth.findByEmail(userInfo.email)
        if (admin?.role === 'ADMIN') user = admin
      } catch (error) {
        throw new AuthError('Không thể kiểm tra tài khoản Google trong cơ sở dữ liệu.', 503, error)
      }
    }

    if (!user) {
      try {
        user = await this.users.createGoogleAccount(
          userInfo.email,
          userInfo.name,
          userInfo.avatarUrl
        )
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('already registered')) {
          try {
            user = await this.users.findByEmail(userInfo.email)
          } catch (lookupError) {
            throw new AuthError(
              'Không thể kiểm tra tài khoản Google trong cơ sở dữ liệu.',
              503,
              lookupError
            )
          }
          if (!user) {
            throw new AuthError('Không thể tạo tài khoản Google trong cơ sở dữ liệu.', 503, error)
          }
        } else {
          if (hasMissingAuthSchema(error)) throw missingAuthSchemaError(error)
          throw new AuthError('Không thể tạo tài khoản Google trong cơ sở dữ liệu.', 503, error)
        }
      }
    }
    if (user.status === 'pending') {
      throw new AuthError('Complete course payment before logging in.', 403)
    }
    if (user.status !== 'active') {
      throw new AuthError('Tài khoản này đã bị khóa hoặc ngừng hoạt động.', 403)
    }

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

  async getGoogleIdentity(input: GoogleAuthInput): Promise<{
    email: string
    fullName: string
    avatarUrl: string | null
    phoneNumber: string | null
    dateOfBirth: string | null
  }> {
    const userInfo = input.accessToken
      ? await getGoogleRegistrationDetails(input.accessToken)
      : { ...(await verifyGoogleAuthInput(input, env.googleClientId)), phoneNumber: null, dateOfBirth: null }
    if (!userInfo.emailVerified) {
      throw new AuthError('Địa chỉ email Google chưa được xác minh.', 400)
    }
    return {
      email: userInfo.email,
      fullName: userInfo.name,
      avatarUrl: userInfo.avatarUrl,
      phoneNumber: userInfo.phoneNumber,
      dateOfBirth: userInfo.dateOfBirth,
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

    const user = await this.findSessionUser(session.user_id)
    if (!user || user.status !== 'active' || user.is_verified !== true) {
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

    const user = await this.findSessionUser(claims.sub)
    if (!user || user.status !== 'active' || user.is_verified !== true) {
      await this.store.revokeSession(session.id)
      throw invalidTokenError()
    }
    return user
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) return { message: GENERIC_FORGOT_MESSAGE }
    if (!env.emailFrom || !env.resendApiKey) {
      throw new AuthError('Password recovery email is unavailable. Please try again later.', 503)
    }
    let storedUser: UserProfile | null = null
    let databaseLookupError: unknown
    try {
      storedUser = await this.users.findByEmail(normalizedEmail)
    } catch (error) {
      databaseLookupError = error
    }

    let user = storedUser
    let recoveryWithAdminProvider = false
    let adminLookupError: unknown
    if (!storedUser || storedUser.role === 'ADMIN' || databaseLookupError) {
      let adminProfile: UserProfile | null = null
      try {
        adminProfile = await this.adminAuth.findByEmail(normalizedEmail)
      } catch (error) {
        adminLookupError = error
      }
      if (adminProfile?.role === 'ADMIN') {
        user = adminProfile
        recoveryWithAdminProvider = true
      }
    }
    if ((!user || user.role !== 'ADMIN') && databaseLookupError) {
      throw new AuthError(
        'Unable to look up this account. Verify PostgreSQL and Supabase connectivity.',
        503,
        new AggregateError(
          [databaseLookupError, ...(adminLookupError ? [adminLookupError] : [])],
          'Password recovery account lookup failed'
        )
      )
    }
    if (storedUser?.role === 'ADMIN' && adminLookupError) {
      throw new AuthError('Admin authentication provider is unavailable.', 503, adminLookupError)
    }
    if (!user || user.status !== 'active') return { message: GENERIC_FORGOT_MESSAGE }

    const temporaryPassword = generateTemporaryPassword()
    try {
      await this.sendTemporaryPasswordEmail({
        from: env.emailFrom,
        to: user.email,
        ...renderTemporaryPasswordEmail(
          temporaryPassword,
          new URL('/login', env.frontendUrl).toString()
        ),
      })
    } catch (error) {
      console.error(
        '[Auth] Temporary password email delivery failed',
        error instanceof Error ? error.name : 'UnknownError'
      )
      throw new AuthError(
        'The temporary password could not be emailed. Please try the request again later.',
        503,
        error
      )
    }
    if (recoveryWithAdminProvider) {
      try {
        await this.adminAuth.updatePassword(user.id, user.email, temporaryPassword)
      } catch (error) {
        throw new AuthError(
          'The recovery email was sent, but Supabase could not update the Admin password and confirm its email. Check the Supabase service-role configuration.',
          503,
          error
        )
      }
      try {
        await this.adminAuth.verifyEmail(user.id)
      } catch (error) {
        throw new AuthError(
          'The Admin password was updated and emailed, but the application profile could not be marked verified. Use the emailed password after the profile is fixed.',
          503,
          error
        )
      }
    } else {
      try {
        await this.users.updatePasswordAndVerifyEmail(user.id, temporaryPassword)
      } catch (error) {
        throw new AuthError(
          'The recovery email was sent, but the account password could not be updated. Please contact support.',
          503,
          error
        )
      }
    }
    try {
      await this.store.revokeUserSessions(user.id)
    } catch (error) {
      throw new AuthError(
        'The recovery email was sent and the password was updated, but existing sessions could not be revoked. You can sign in with the emailed password; check PostgreSQL connectivity.',
        503,
        error
      )
    }
    return { message: GENERIC_FORGOT_MESSAGE }
  }

  private async findSessionUser(userId: string): Promise<UserProfile | null> {
    const databaseUser = await this.users.findById(userId)
    if (databaseUser && databaseUser.role !== 'ADMIN') return databaseUser
    const adminUser = await this.adminAuth.findById(userId)
    if (adminUser?.role === 'ADMIN') return adminUser
    return databaseUser
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
