import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { env } from '../src/config/env.js'
import { AuthError } from '../src/modules/auth/auth.errors.js'
import {
  AuthService,
  GENERIC_FORGOT_MESSAGE,
  type TokenPair,
} from '../src/modules/auth/auth.service.js'
import type { AuthSession } from '../src/modules/auth/auth.repository.js'
import type {
  RegistrationOtpIssueResult,
  RegistrationOtpVerifyResult,
} from '../src/modules/auth/auth.repository.js'
import {
  generateRegistrationOtp,
  hashRegistrationOtp,
  REGISTRATION_OTP_EXPIRY_MS,
  REGISTRATION_OTP_MAX_ATTEMPTS,
  REGISTRATION_OTP_RESEND_COOLDOWN_MS,
  registrationOtpMatches,
  renderRegistrationVerificationEmail,
} from '../src/modules/auth/registration-otp.js'
import {
  generateTemporaryPassword,
  renderTemporaryPasswordEmail,
} from '../src/modules/auth/temporary-password.js'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/modules/auth/auth.tokens.js'
import { sanitizeRegistrationDiagnosticMessage } from '../src/modules/auth/registration-diagnostics.js'
import type { UserProfile } from '../src/modules/users/users.types.js'

Object.assign(env, {
  authJwtSecret: 'unit-test-signing-secret-with-32-bytes-minimum',
  resendApiKey: 're_test_registration_otp',
  emailFrom: 'no-reply@english-learning-platform.test',
  frontendUrl: 'https://english-learning-platform.test',
})

it('validates and stores a student phone number with the registration profile', async () => {
  const { service, users } = setup()
  const registration = await register(
    service,
    'phone-registration@example.test',
    'A-long-password-123',
    undefined,
    { phoneNumber: '+84 912 345 678' }
  )
  const user = [...users.users.values()].find((item) => item.email === registration.email)
  assert.ok(user)
  assert.equal(user.phone_number, '+84 912 345 678')
  assert.equal(users.createdRegistrationDetails?.phoneNumber, '+84 912 345 678')

  await expectAuthError(
    () => register(
      service,
      'invalid-phone@example.test',
      'A-long-password-123',
      undefined,
      { phoneNumber: 'phone number' }
    ),
    400
  )
})

const NOW = Date.now()
const sampleUser: UserProfile = {
  id: 'd9101527-381f-45cb-8c6e-ea724eeb34a4',
  email: 'learner@example.test',
  full_name: 'Learner',
  role: 'STUDENT',
  status: 'active',
  is_verified: true,
  created_at: new Date(NOW).toISOString(),
  updated_at: new Date(NOW).toISOString(),
}

class FakeUsers {
  users = new Map([[sampleUser.id, sampleUser]])
  createdRole: string | undefined
  updatedPassword: string | undefined
  passwords = new Map([[sampleUser.id, 'Correct-Horse-Password!']])
  createdRegistrationDetails: {
    fullName: string
    dateOfBirth: string
    phoneNumber: string
    selectedCourseIds: string[]
  } | undefined
  registrationDetails = new Map<string, {
    fullName: string
    dateOfBirth: string
    phoneNumber: string
    selectedCourseIds: string[]
  }>()

  async createStudentAccount(
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string,
    phoneNumber: string,
    selectedCourseIds: string[]
  ): Promise<UserProfile> {
    if ([...this.users.values()].some((user) => user.email === email)) {
      throw new Error('Email is already registered')
    }
    assert.equal(password.length >= 8, true)
    const user = {
      ...sampleUser,
      id: randomUUID(),
      email,
      full_name: fullName,
      phone_number: phoneNumber,
      status: 'pending',
      is_verified: false,
    }
    this.createdRegistrationDetails = { fullName, dateOfBirth, phoneNumber, selectedCourseIds }
    this.registrationDetails.set(user.id, this.createdRegistrationDetails)
    this.createdRole = user.role
    this.users.set(user.id, user)
    return user
  }

  async createGoogleAccount(
    email: string,
    fullName: string,
    avatarUrl: string | null
  ): Promise<UserProfile> {
    const normalizedEmail = email.trim().toLowerCase()
    if ([...this.users.values()].some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('Email is already registered')
    }
    const user: UserProfile = {
      ...sampleUser,
      id: randomUUID(),
      email: normalizedEmail,
      full_name: fullName,
      avatar_url: avatarUrl,
      status: 'pending',
      is_verified: true,
    }
    this.createdRole = user.role
    this.users.set(user.id, user)
    return user
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    const user = [...this.users.values()].find((item) => item.email === email)
    return user && this.passwords.get(user.id) === password ? user : null
  }

  async updatePasswordAndVerifyEmail(id: string, password: string): Promise<void> {
    assert.equal(this.users.has(id), true)
    this.updatedPassword = password
    this.passwords.set(id, password)
    const user = this.users.get(id)
    if (user) user.is_verified = true
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null
  }

  async rollbackStudentAccount(userId: string): Promise<void> {
    this.users.delete(userId)
    this.registrationDetails.delete(userId)
  }
}

class FakeCourses {
  readonly availableCourseIds = new Set([
    'c0a80101-0000-4000-8000-000000000001',
    'c0a80101-0000-4000-8000-000000000002',
  ])

  async validateSelectedCourseIds(ids: unknown): Promise<{
    courseIds: string[]
    missingIds: string[]
  }> {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new Error('Selected course IDs must be an array of UUIDs.')
    }
    const courseIds = [...new Set(ids as string[])]
    return {
      courseIds,
      missingIds: courseIds.filter((id) => !this.availableCourseIds.has(id)),
    }
  }
}

class FakeStore {
  sessions = new Map<string, AuthSession>()
  registrationOtps = new Map<string, {
    otpHash: string
    expiresAt: string
    attemptCount: number
    lastSentAt: number
    consumed: boolean
  }>()

  constructor(private readonly users: FakeUsers) {}

  async issueRegistrationOtp(
    email: string,
    otp: string,
    expiresAt: string,
    sentAt: string,
    cooldownMs: number
  ): Promise<RegistrationOtpIssueResult> {
    const user = [...this.users.users.values()].find((item) => item.email === email)
    if (!user || user.is_verified || !this.users.registrationDetails.has(user.id)) {
      return { status: 'not_registered' }
    }
    const existing = this.registrationOtps.get(user.id)
    const elapsedMs = existing ? Date.parse(sentAt) - existing.lastSentAt : cooldownMs
    const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000)
    if (existing && retryAfterSeconds > 0) {
      return { status: 'cooldown', retryAfterSeconds }
    }
    this.registrationOtps.set(user.id, {
      otpHash: hashRegistrationOtp(user.id, otp),
      expiresAt,
      attemptCount: 0,
      lastSentAt: Date.parse(sentAt),
      consumed: false,
    })
    return {
      status: 'issued',
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
    }
  }

  async invalidateRegistrationOtp(userId: string, otpHash: string): Promise<void> {
    if (this.registrationOtps.get(userId)?.otpHash === otpHash) {
      this.registrationOtps.delete(userId)
    }
  }

  async verifyRegistrationOtp(
    email: string,
    otp: string,
    now: string,
    maxAttempts: number
  ): Promise<RegistrationOtpVerifyResult> {
    const user = [...this.users.users.values()].find((item) => item.email === email)
    if (!user || !this.users.registrationDetails.has(user.id)) return { status: 'not_registered' }
    if (user.is_verified) return { status: 'already_verified' }
    const stored = this.registrationOtps.get(user.id)
    if (!stored) return { status: 'invalid' }
    if (stored.attemptCount >= maxAttempts) return { status: 'attempts_exhausted' }
    if (stored.consumed) return { status: 'invalid' }
    if (Date.parse(stored.expiresAt) <= Date.parse(now)) {
      stored.consumed = true
      return { status: 'expired' }
    }
    if (!registrationOtpMatches(user.id, otp, stored.otpHash)) {
      stored.attemptCount += 1
      if (stored.attemptCount >= maxAttempts) stored.consumed = true
      return {
        status: stored.attemptCount >= maxAttempts ? 'attempts_exhausted' : 'invalid',
      }
    }
    stored.consumed = true
    user.is_verified = true
    return { status: 'verified', user }
  }

  async createSession(
    id: string,
    userId: string,
    refreshTokenHash: string,
    expiresAt: string
  ): Promise<void> {
    this.sessions.set(id, {
      id,
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      revoked_at: null,
    })
  }

  async findSessionById(id: string): Promise<AuthSession | null> {
    return this.sessions.get(id) ?? null
  }

  async rotateSession(
    id: string,
    previousHash: string,
    nextHash: string,
    expiresAt: string
  ): Promise<boolean> {
    const session = this.sessions.get(id)
    if (
      !session ||
      session.refresh_token_hash !== previousHash ||
      session.revoked_at ||
      Date.parse(session.expires_at) <= Date.now()
    ) {
      return false
    }
    session.refresh_token_hash = nextHash
    session.expires_at = expiresAt
    return true
  }

  async revokeSession(id: string): Promise<void> {
    const session = this.sessions.get(id)
    if (session) session.revoked_at = session.revoked_at ?? new Date().toISOString()
  }

  async revokeUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.user_id === userId) {
        session.revoked_at = session.revoked_at ?? new Date().toISOString()
      }
    }
  }

}

function setup(
  sendEmail?: (email: { from: string; to: string; subject: string; html: string }) => Promise<void>,
  courses = new FakeCourses(),
  sendVerificationEmail?: (email: { from: string; to: string; subject: string; html: string }) => Promise<void>
) {
  const users = new FakeUsers()
  const store = new FakeStore(users)
  const adminAuth = {
    async authenticatePassword() { return null },
    async findByEmail() { return null },
    async findById() { return null },
    async updatePassword(_id: string, _email: string, _password: string) {},
    async verifyEmail() {},
  }
  const service = new AuthService(
    users,
    store,
    sendEmail,
    courses,
    sendVerificationEmail,
    adminAuth
  )
  return { users, store, service, courses }
}

function register(
  service: AuthService,
  email: string,
  password: string,
  confirmPassword = password,
  overrides: Partial<{
    fullName: string
    dateOfBirth: string
    phoneNumber: string
    selectedCourseIds: string[]
  }> = {}
) {
  return service.register({
    fullName: 'Nguyễn Minh Anh',
    dateOfBirth: '2000-01-15',
    phoneNumber: '0912 345 678',
    email,
    password,
    confirmPassword,
    ...overrides,
  })
}

function refreshSessionId(token: string): string {
  const sessionId = token.split('.')[0]
  if (!sessionId) throw new Error('Refresh token has no session identifier')
  return sessionId
}

async function expectAuthError(
  work: () => Promise<unknown>,
  statusCode: number
): Promise<AuthError> {
  let caught: unknown
  try {
    await work()
  } catch (error) {
    caught = error
  }
  assert.ok(caught instanceof AuthError)
  assert.equal(caught.statusCode, statusCode)
  return caught
}

describe('authentication service', () => {
  let originalConsoleError: typeof console.error
  let originalAuthExposeRegistrationOtp: boolean

  before(() => {
    originalConsoleError = console.error
    originalAuthExposeRegistrationOtp = env.authExposeRegistrationOtp
    Object.assign(env, { authExposeRegistrationOtp: false })
  })

  after(() => {
    console.error = originalConsoleError
    Object.assign(env, { authExposeRegistrationOtp: originalAuthExposeRegistrationOtp })
  })

  it('redacts sensitive values from registration diagnostic messages', () => {
    const sanitized = sanitizeRegistrationDiagnosticMessage(
      'email=test@example.test password=secret-value Authorization: Bearer abc123 ' +
      'https://project.supabase.co/rest/v1/profiles eyJhbGci.eyJzdWI.abc123 sensitive-password',
      ['sensitive-password']
    )

    assert.doesNotMatch(
      sanitized,
      /test@example\.test|secret-value|abc123|project\.supabase\.co|sensitive-password/
    )
    assert.match(sanitized, /redacted-email/)
    assert.match(sanitized, /redacted-url/)
    assert.match(sanitized, /redacted-token/)
  })

  it('generates six-digit OTPs and stores only a keyed hash', () => {
    const userId = randomUUID()
    const otp = generateRegistrationOtp()
    const otpHash = hashRegistrationOtp(userId, otp)

    assert.match(otp, /^\d{6}$/)
    assert.match(otpHash, /^[a-f0-9]{64}$/)
    assert.notEqual(otpHash, otp)
    assert.equal(registrationOtpMatches(userId, otp, otpHash), true)
    assert.equal(registrationOtpMatches(userId, '000000', otpHash), otp === '000000')
    assert.match(
      renderRegistrationVerificationEmail('<Learner>', otp),
      /&lt;Learner&gt;/
    )
  })

  it('sends a Vietnamese verification email and enforces the resend cooldown', async () => {
    let deliveredEmail: { from: string; to: string; subject: string; html: string } | undefined
    const { service, store } = setup(undefined, new FakeCourses(), async (email) => {
      deliveredEmail = email
    })
    await register(service, 'otp-send@example.test', 'A-long-password-123')

    assert.deepEqual(await service.requestRegistrationOtp('OTP-SEND@example.test'), {
      status: 'sent',
    })
    assert.equal(deliveredEmail?.to, 'otp-send@example.test')
    assert.match(deliveredEmail?.subject ?? '', /Mã xác minh/)
    assert.match(deliveredEmail?.html ?? '', /lang="vi"/)
    const code = deliveredEmail?.html.match(/font-size:32px[^>]*>(\d{6})</)?.[1]
    assert.ok(code)
    const user = [...store.registrationOtps.entries()][0]
    assert.ok(user)
    assert.notEqual(user[1].otpHash, code)
    assert.equal(user[1].expiresAt, new Date(user[1].lastSentAt + REGISTRATION_OTP_EXPIRY_MS).toISOString())

    assert.deepEqual(await service.requestRegistrationOtp('otp-send@example.test'), {
      status: 'cooldown',
      retryAfterSeconds: REGISTRATION_OTP_RESEND_COOLDOWN_MS / 1000,
    })
  })

  it('exposes the OTP only when the development environment and explicit flag are both enabled', async () => {
    const originalNodeEnv = env.nodeEnv
    const originalExposeOtp = env.authExposeRegistrationOtp
    const issueOtp = async (nodeEnv: string, exposeOtp: boolean, email: string) => {
      let deliveredHtml = ''
      const { service } = setup(undefined, new FakeCourses(), async (message) => {
        deliveredHtml = message.html
      })
      await register(service, email, 'A-long-password-123')
      Object.assign(env, { nodeEnv, authExposeRegistrationOtp: exposeOtp })
      const result = await service.requestRegistrationOtp(email)
      const deliveredOtp = deliveredHtml.match(/font-size:32px[^>]*>(\d{6})</)?.[1]
      assert.ok(deliveredOtp)
      return { result, deliveredOtp }
    }

    try {
      const developmentEnabled = await issueOtp(
        'development',
        true,
        'otp-dev-enabled@example.test'
      )
      assert.equal(developmentEnabled.result.developmentOtp, developmentEnabled.deliveredOtp)

      const developmentDisabled = await issueOtp(
        'development',
        false,
        'otp-dev-disabled@example.test'
      )
      assert.equal('developmentOtp' in developmentDisabled.result, false)

      const productionEnabled = await issueOtp(
        'production',
        true,
        'otp-production-enabled@example.test'
      )
      assert.equal('developmentOtp' in productionEnabled.result, false)
    } finally {
      Object.assign(env, {
        nodeEnv: originalNodeEnv,
        authExposeRegistrationOtp: originalExposeOtp,
      })
    }
  })

  it('rejects expired OTPs and limits incorrect attempts', async () => {
    let emailHtml = ''
    const { service, store, users } = setup(
      undefined,
      new FakeCourses(),
      async (email) => { emailHtml = email.html }
    )
    await register(service, 'otp-limits@example.test', 'A-long-password-123')
    await service.requestRegistrationOtp('otp-limits@example.test')
    const [userId, otpRecord] = [...store.registrationOtps.entries()][0]!
    const user = users.users.get(userId)
    assert.ok(user)

    otpRecord.expiresAt = new Date(Date.now() - 1).toISOString()
    const expired = await expectAuthError(
      () => service.verifyRegistrationOtp(user.email, '123456'),
      400
    )
    assert.match(expired.message, /không hợp lệ hoặc đã hết hạn/)
    assert.equal(user.is_verified, false)

    otpRecord.lastSentAt = Date.now() - REGISTRATION_OTP_RESEND_COOLDOWN_MS - 1
    await service.requestRegistrationOtp(user.email)
    const correctCode = emailHtml.match(/font-size:32px[^>]*>(\d{6})</)?.[1]
    assert.ok(correctCode)
    const incorrectCode = correctCode === '000000' ? '000001' : '000000'
    for (let attempt = 1; attempt < REGISTRATION_OTP_MAX_ATTEMPTS; attempt += 1) {
      await expectAuthError(
        () => service.verifyRegistrationOtp(user.email, incorrectCode),
        400
      )
    }
    await expectAuthError(
      () => service.verifyRegistrationOtp(user.email, incorrectCode),
      400
    )
    await expectAuthError(
      () => service.verifyRegistrationOtp(user.email, incorrectCode),
      400
    )
    assert.equal(user.is_verified, false)
    assert.equal(store.sessions.size, 0)
  })

  it('verifies OTP without creating a session; login creates the session afterward', async () => {
    let emailHtml = ''
    const { service, store, users } = setup(
      undefined,
      new FakeCourses(),
      async (email) => { emailHtml = email.html }
    )
    const registration = await register(service, 'otp-success@example.test', 'A-long-password-123')
    const user = [...users.users.values()].find((item) => item.email === registration.email)
    assert.ok(user)
    assert.equal(store.sessions.size, 0)

    await service.requestRegistrationOtp(user.email)
    const code = emailHtml.match(/font-size:32px[^>]*>(\d{6})</)?.[1]
    assert.ok(code)
    await service.verifyRegistrationOtp(user.email, code)
    assert.equal(user.is_verified, true)
    assert.equal(store.sessions.size, 0)

    await expectAuthError(() => service.login(user.email, 'A-long-password-123'), 403)
    assert.equal(store.sessions.size, 0)
    user.status = 'active' // Simulate the verified payment callback activating the account.
    const tokens = await service.login(user.email, 'A-long-password-123')
    assert.equal(tokens.user.id, user.id)
    assert.equal(store.sessions.size, 1)
    assert.equal(verifyAccessToken(tokens.accessToken)?.sub, user.id)

    await expectAuthError(() => service.verifyRegistrationOtp(user.email, code), 400)
    assert.equal(store.sessions.size, 1)
  })

  it('serializes concurrent verification without issuing a session', async () => {
    let emailHtml = ''
    const { service, store } = setup(
      undefined,
      new FakeCourses(),
      async (email) => { emailHtml = email.html }
    )
    await register(service, 'otp-race@example.test', 'A-long-password-123')
    await service.requestRegistrationOtp('otp-race@example.test')
    const code = emailHtml.match(/font-size:32px[^>]*>(\d{6})</)?.[1]
    assert.ok(code)

    const results = await Promise.allSettled([
      service.verifyRegistrationOtp('otp-race@example.test', code),
      service.verifyRegistrationOtp('otp-race@example.test', code),
    ])
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1)
    assert.equal(store.sessions.size, 0)
  })

  it('reports Resend failures, keeps registration recoverable, and does not log the OTP', async () => {
    let code = ''
    const log: unknown[][] = []
    const originalConsoleError = console.error
    const { service, store, users } = setup(
      undefined,
      new FakeCourses(),
      async (email) => {
        code = email.html.match(/font-size:32px[^>]*>(\d{6})</)?.[1] ?? ''
        throw new Error(`provider failure containing ${code}`)
      }
    )
    console.error = (...args: unknown[]) => { log.push(args) }
    try {
      await register(service, 'otp-provider-failure@example.test', 'A-long-password-123')
      const error = await expectAuthError(
        () => service.requestRegistrationOtp('otp-provider-failure@example.test'),
        503
      )
      assert.match(error.message, /chưa gửi được email xác minh/)
      const user = [...users.users.values()].find(
        (item) => item.email === 'otp-provider-failure@example.test'
      )
      assert.ok(user)
      assert.equal(user.is_verified, false)
      assert.equal(store.registrationOtps.has(user.id), false)
      assert.ok(code)
      assert.equal(JSON.stringify(log).includes(code), false)
      assert.equal(users.registrationDetails.has(user.id), true)
    } finally {
      console.error = originalConsoleError
    }
  })

  it('returns a usable development OTP when email delivery fails and the explicit development flag is enabled', async () => {
    const originalNodeEnv = env.nodeEnv
    const originalExposeOtp = env.authExposeRegistrationOtp
    const originalConsoleWarn = console.warn
    let deliveredCode = ''
    const { service, store, users } = setup(
      undefined,
      new FakeCourses(),
      async (email) => {
        deliveredCode = email.html.match(/font-size:32px[^>]*>(\d{6})</)?.[1] ?? ''
        throw new Error('test delivery failure')
      }
    )
    Object.assign(env, { nodeEnv: 'development', authExposeRegistrationOtp: true })
    console.warn = () => undefined

    try {
      await register(service, 'otp-dev-fallback@example.test', 'A-long-password-123')
      const result = await service.requestRegistrationOtp('otp-dev-fallback@example.test')
      const developmentOtp = result.developmentOtp
      assert.equal(developmentOtp, deliveredCode)
      assert.match(developmentOtp ?? '', /^\d{6}$/)
      assert.equal(result.developmentEmailFallback, true)
      assert.ok(developmentOtp)
      const user = [...users.users.values()].find(
        (item) => item.email === 'otp-dev-fallback@example.test'
      )
      assert.ok(user)
      assert.equal(store.registrationOtps.has(user.id), true)
      await service.verifyRegistrationOtp(user.email, developmentOtp)
      assert.equal(store.sessions.size, 0)
    } finally {
      Object.assign(env, {
        nodeEnv: originalNodeEnv,
        authExposeRegistrationOtp: originalExposeOtp,
      })
      console.warn = originalConsoleWarn
    }
  })

  it('creates an unverified profile with selected courses but no authenticated session', async () => {
    const { users, store, service } = setup()
    const registration = await register(
      service,
      'New.Learner@Example.test',
      'A-very-long-test-password',
      undefined,
      {
        fullName: 'Nguyễn Minh Anh',
        dateOfBirth: '2000-01-15',
        selectedCourseIds: [
          'c0a80101-0000-4000-8000-000000000002',
          'c0a80101-0000-4000-8000-000000000001',
        ],
      }
    )
    const user = [...users.users.values()].find((item) => item.email === registration.email)
    assert.ok(user)
    assert.equal(registration.email, 'new.learner@example.test')
    assert.equal(registration.verificationRequired, true)
    assert.deepEqual(registration.selectedCourseIds, [
      'c0a80101-0000-4000-8000-000000000002',
      'c0a80101-0000-4000-8000-000000000001',
    ])
    assert.equal(users.createdRole, 'STUDENT')
    assert.equal(user.full_name, 'Nguyễn Minh Anh')
    assert.deepEqual(users.createdRegistrationDetails, {
      fullName: 'Nguyễn Minh Anh',
      dateOfBirth: '2000-01-15',
      phoneNumber: '0912 345 678',
      selectedCourseIds: registration.selectedCourseIds,
    })
    assert.equal(user.is_verified, false)
    assert.equal(store.sessions.size, 0)
    assert.equal('accessToken' in registration, false)
    assert.equal('refreshToken' in registration, false)
  })

  it('verifies an unverified account through email-based password recovery', async () => {
    const { users, service } = setup(async () => undefined)
    const registration = await register(
      service,
      'recovery@example.test',
      'A-long-password-123'
    )
    const user = [...users.users.values()].find((item) => item.email === registration.email)
    assert.ok(user)
    assert.equal(user.is_verified, false)

    await service.forgotPassword(registration.email)

    assert.ok(users.updatedPassword)
    assert.equal(user.is_verified, true)
    const session = await service.login(registration.email, users.updatedPassword)
    assert.equal(session.user.email, registration.email)
  })

  it('uses Supabase Auth to recover and authenticate Admin accounts', async () => {
    const { users, store } = setup(async () => undefined)
    const adminProfile: UserProfile = {
      ...sampleUser,
      id: randomUUID(),
      email: 'admin@example.test',
      role: 'ADMIN',
      is_verified: false,
    }
    const passwords = new Map([[adminProfile.id, 'Original-Admin-Password!']])
    const adminAuth = {
      async authenticatePassword(email: string, password: string) {
        return email === adminProfile.email && passwords.get(adminProfile.id) === password
          ? adminProfile
          : null
      },
      async findByEmail(email: string) {
        return email === adminProfile.email ? adminProfile : null
      },
      async findById(id: string) {
        return id === adminProfile.id ? adminProfile : null
      },
      async updatePassword(id: string, email: string, password: string) {
        assert.equal(id, adminProfile.id)
        assert.equal(email, adminProfile.email)
        passwords.set(id, password)
      },
      async verifyEmail(id: string) {
        assert.equal(id, adminProfile.id)
        adminProfile.is_verified = true
      },
    }
    users.findByEmail = async () => {
      throw new Error('PostgreSQL connection unavailable')
    }
    users.findById = async () => null

    let deliveredPassword = ''
    const service = new AuthService(
      users,
      store,
      async (email) => {
        deliveredPassword =
          email.text?.match(/MẬT KHẨU TẠM THỜI:\r?\n([^\r\n]+)/)?.[1] ?? ''
      },
      undefined,
      undefined,
      adminAuth
    )

    await service.forgotPassword(adminProfile.email)
    assert.equal(passwords.get(adminProfile.id), deliveredPassword)
    assert.equal(adminProfile.is_verified, true)

    const session = await service.login(adminProfile.email, deliveredPassword)
    assert.equal(session.user.role, 'ADMIN')
    assert.equal((await service.authenticateAccessToken(session.accessToken)).id, adminProfile.id)
  })

  it('rejects invalid registration fields and duplicate email addresses', async () => {
    const { service } = setup()
    await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123', 'does-not-match'),
      400
    )
    await expectAuthError(
      () => register(service, 'not-an-email', 'A-long-password-123'),
      400
    )
    await expectAuthError(
      () => register(service, 'new@example.test', 'short'),
      400
    )
    await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123', undefined, { fullName: ' ' }),
      400
    )
    await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123', undefined, { dateOfBirth: '2001-02-29' }),
      400
    )
    await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123', undefined, { dateOfBirth: '2999-01-01' }),
      400
    )
    await register(service, 'eight-chars@example.test', '12345678')
    await expectAuthError(
      () => register(service, sampleUser.email, 'A-long-password-123'),
      409
    )
  })

  it('rejects malformed or unavailable course IDs before creating a profile', async () => {
    const { service, users } = setup()
    await expectAuthError(
      () => register(service, 'bad-course@example.test', 'A-long-password-123', undefined, {
        selectedCourseIds: ['not-a-uuid'],
      }),
      400
    )
    await expectAuthError(
      () => register(service, 'missing-course@example.test', 'A-long-password-123', undefined, {
        selectedCourseIds: ['c0a80101-0000-4000-8000-000000000003'],
      }),
      400
    )
    assert.equal([...users.users.values()].some((user) => user.email === 'bad-course@example.test'), false)
    assert.equal([...users.users.values()].some((user) => user.email === 'missing-course@example.test'), false)
  })

  it('returns a descriptive configuration error for a missing PostgreSQL URL', async () => {
    const { service, users } = setup()
    users.createStudentAccount = async () => {
      throw new Error('DATABASE_URL (or DB_URL) is required for authentication')
    }

    const error = await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123'),
      503
    )

    assert.match(error.message, /DATABASE_URL/)
    assert.ok(error.cause instanceof Error)
  })

  it('explains when the PostgreSQL auth migration has not been applied', async () => {
    const { service, users } = setup()
    users.createStudentAccount = async () => {
      throw new Error('Unable to create authentication account in PostgreSQL', {
        cause: Object.assign(new Error('relation does not exist'), { code: '42P01' }),
      })
    }

    const error = await expectAuthError(
      () => register(service, 'new@example.test', 'A-long-password-123'),
      503
    )

    assert.match(error.message, /20261025003000_database_url_auth\.sql/)
  })

  it('allows only one concurrent registration for the same normalized email', async () => {
    const { service, store, users } = setup()
    const outcomes = await Promise.allSettled([
      register(service, 'concurrent@example.test', 'A-long-password-123'),
      register(service, 'CONCURRENT@example.test', 'Another-long-password-456'),
    ])
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1)
    assert.equal(store.sessions.size, 0)
    assert.equal([...users.users.values()].filter((user) => user.email === 'concurrent@example.test').length, 1)
  })

  it('accepts valid credentials and returns one generic error for bad credentials', async () => {
    const { service } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    assert.equal(tokens.user.id, sampleUser.id)
    assert.equal(tokens.user.full_name, sampleUser.full_name)
    assert.equal(tokens.user.phone_number, null)
    await expectAuthError(
      () => service.login(sampleUser.email, 'wrong-password'),
      401
    )
    await expectAuthError(
      () => service.login('unknown@example.test', 'wrong-password'),
      401
    )
  })

  it('rejects login for an inactive account', async () => {
    const { service, users, store } = setup()
    users.users.set(sampleUser.id, { ...sampleUser, status: 'locked' })

    await expectAuthError(
      () => service.login(sampleUser.email, 'Correct-Horse-Password!'),
      401
    )
    assert.equal(store.sessions.size, 0)
  })

  it('does not authenticate an unverified registration or retain its legacy sessions', async () => {
    const { service, users, store } = setup()
    const registration = await register(
      service,
      'awaiting-verification@example.test',
      'A-long-password-123'
    )
    const user = [...users.users.values()].find((item) => item.email === registration.email)
    assert.ok(user)

    await expectAuthError(
      () => service.login(registration.email, 'Correct-Horse-Password!'),
      401
    )

    const refreshSessionId = randomUUID()
    const refreshToken = createRefreshToken(refreshSessionId)
    await store.createSession(
      refreshSessionId,
      user.id,
      hashToken(refreshToken),
      new Date(Date.now() + 60_000).toISOString()
    )
    await expectAuthError(() => service.refresh(refreshToken), 401)
    assert.ok(store.sessions.get(refreshSessionId)?.revoked_at)

    const accessSessionId = randomUUID()
    await store.createSession(
      accessSessionId,
      user.id,
      hashToken(createRefreshToken(accessSessionId)),
      new Date(Date.now() + 60_000).toISOString()
    )
    const accessToken = createAccessToken(user.id, accessSessionId)
    await expectAuthError(() => service.authenticateAccessToken(accessToken), 401)
    assert.ok(store.sessions.get(accessSessionId)?.revoked_at)
  })

  it('rotates refresh tokens and rejects/revokes a reused token', async () => {
    const { service, store } = setup()
    const initial = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    assert.ok(verifyRefreshToken(initial.refreshToken))
    const rotated = await service.refresh(initial.refreshToken)
    const sessionId = refreshSessionId(initial.refreshToken)
    assert.notEqual(rotated.refreshToken, initial.refreshToken)
    assert.ok(verifyAccessToken(rotated.accessToken))
    assert.ok(verifyRefreshToken(rotated.refreshToken))
    assert.equal(
      store.sessions.get(sessionId)?.refresh_token_hash,
      hashToken(rotated.refreshToken)
    )
    await expectAuthError(() => service.refresh(initial.refreshToken), 401)
    assert.ok(store.sessions.get(sessionId)?.revoked_at)
    await expectAuthError(() => service.refresh(rotated.refreshToken), 401)
  })

  it('rejects expired and tampered refresh tokens before issuing access tokens', async () => {
    const { service, store } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const sessionId = refreshSessionId(tokens.refreshToken)
    const session = store.sessions.get(sessionId)
    if (!session) throw new Error('Expected an active test session')

    const expiredToken = createRefreshToken(sessionId, Date.now() - 8 * 24 * 60 * 60 * 1000)
    session.refresh_token_hash = hashToken(expiredToken)
    assert.equal(verifyRefreshToken(expiredToken), null)
    await expectAuthError(() => service.refresh(expiredToken), 401)
    assert.equal(session.refresh_token_hash, hashToken(expiredToken))
    assert.equal(session.revoked_at, null)

    const signatureTampered = `${tokens.refreshToken.slice(0, -1)}${tokens.refreshToken.endsWith('A') ? 'B' : 'A'}`
    assert.equal(verifyRefreshToken(signatureTampered), null)
    await expectAuthError(() => service.refresh(signatureTampered), 401)
    assert.equal(session.refresh_token_hash, hashToken(expiredToken))
  })

  it('rejects expired and revoked refresh sessions', async () => {
    const { service, store } = setup()
    const expired = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const expiredId = refreshSessionId(expired.refreshToken)
    const expiredSession = store.sessions.get(expiredId)
    if (!expiredSession) throw new Error('Expected an active test session')
    expiredSession.expires_at = new Date(Date.now() - 1000).toISOString()
    await expectAuthError(() => service.refresh(expired.refreshToken), 401)

    const revoked = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const revokedId = refreshSessionId(revoked.refreshToken)
    await store.revokeSession(revokedId)
    await expectAuthError(() => service.refresh(revoked.refreshToken), 401)
  })

  it('revokes a session on logout and tolerates repeated logout', async () => {
    const { service, store } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const sessionId = refreshSessionId(tokens.refreshToken)
    const currentUser = await service.authenticateAccessToken(tokens.accessToken)
    assert.equal(currentUser.id, sampleUser.id)
    await service.logout(tokens.accessToken)
    await service.logout(tokens.accessToken)
    assert.ok(store.sessions.get(sessionId)?.revoked_at)
    await expectAuthError(() => service.authenticateAccessToken(tokens.accessToken), 401)
    await expectAuthError(() => service.refresh(tokens.refreshToken), 401)
  })

  it('logs out using a valid refresh token when the access token has expired', async () => {
    const { service, store } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const sessionId = refreshSessionId(tokens.refreshToken)
    const expiredAccessToken = createAccessToken(
      sampleUser.id,
      sessionId,
      Date.now() - 60 * 60 * 1000
    )

    await service.logout(expiredAccessToken, tokens.refreshToken)

    assert.ok(store.sessions.get(sessionId)?.revoked_at)
    await expectAuthError(() => service.refresh(tokens.refreshToken), 401)
  })

  it('rejects expired access tokens and invalidates all sessions after recovery', async () => {
    const { service, store, users } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const sessionId = refreshSessionId(tokens.refreshToken)
    const secondSession = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const secondSessionId = refreshSessionId(secondSession.refreshToken)
    const expiredAccessToken = createAccessToken(
      sampleUser.id,
      sessionId,
      Date.now() - 60 * 60 * 1000
    )
    await expectAuthError(
      () => service.authenticateAccessToken(expiredAccessToken),
      401
    )

    let deliveredPassword = ''
    let emailSentBeforeUpdate = false
    const recoveryService = new AuthService(users, store, async (email) => {
      emailSentBeforeUpdate = users.updatedPassword === undefined
      const emailText = email.text ?? ''
      deliveredPassword =
        emailText.match(/MẬT KHẨU TẠM THỜI:\r?\n([^\r\n]+)/)?.[1] ?? ''
      assert.ok(email.to === sampleUser.email)
    })
    const response = await recoveryService.forgotPassword(sampleUser.email)

    assert.equal(response.message, GENERIC_FORGOT_MESSAGE)
    assert.equal(deliveredPassword.length, 20)
    assert.equal(users.updatedPassword === deliveredPassword, true)
    assert.equal(emailSentBeforeUpdate, true)
    assert.ok(/[A-Z]/.test(deliveredPassword))
    assert.ok(/[a-z]/.test(deliveredPassword))
    assert.ok(/[0-9]/.test(deliveredPassword))
    assert.ok(/[^A-Za-z0-9]/.test(deliveredPassword))
    assert.equal(Object.hasOwn(response, 'temporaryPassword'), false)
    assert.ok(store.sessions.get(sessionId)?.revoked_at)
    assert.ok(store.sessions.get(secondSessionId)?.revoked_at)
    await expectAuthError(() => service.authenticateAccessToken(tokens.accessToken), 401)
    await expectAuthError(() => service.refresh(tokens.refreshToken), 401)
    await expectAuthError(() => service.login(sampleUser.email, 'Correct-Horse-Password!'), 401)
    const newSession = await service.login(sampleUser.email, deliveredPassword)
    assert.equal(newSession.user.email, sampleUser.email)
  })

  it('generates temporary passwords with required character classes', () => {
    for (let index = 0; index < 32; index += 1) {
      const password = generateTemporaryPassword()
      assert.equal(password.length, 20)
      assert.ok(/[A-Z]/.test(password))
      assert.ok(/[a-z]/.test(password))
      assert.ok(/[0-9]/.test(password))
      assert.ok(/[^A-Za-z0-9]/.test(password))
    }
  })

  it('renders the Vietnamese password recovery email with a login link', () => {
    const email = renderTemporaryPasswordEmail(
      'Safe&Password123!',
      'https://example.test/login'
    )

    assert.equal(
      email.subject,
      '[Your English Voice] Yêu cầu cấp lại mật khẩu cho tài khoản của bạn'
    )
    assert.match(email.html, /Safe&amp;Password123!/)
    assert.match(email.html, /href="https:\/\/example\.test\/login"/)
    assert.match(email.text, /Safe&Password123!/)
    assert.match(email.html, /MẬT KHẨU TẠM THỜI/)
    assert.match(email.text, /MẬT KHẨU TẠM THỜI:\r?\nSafe&Password123!/)
    assert.match(email.text, /https:\/\/example\.test\/login/)
    assert.match(email.text, /Đội ngũ Your English Voice/)
  })

  it('does not send temporary passwords for unknown or invalid email addresses', async () => {
    let emailCount = 0
    const { service } = setup(async () => {
      emailCount += 1
    })
    const existing = await service.forgotPassword(sampleUser.email)
    const unknown = await service.forgotPassword('unknown@example.test')
    const invalid = await service.forgotPassword('not-a-valid-email')

    assert.equal(existing.message, unknown.message)
    assert.equal(existing.message, invalid.message)
    assert.equal(emailCount, 1)
  })

  it('surfaces Resend failures without changing the existing password', async () => {
    const { service, users } = setup(async () => {
      throw new Error('provider failure')
    })
    console.error = () => undefined

    await expectAuthError(() => service.forgotPassword(sampleUser.email), 503)
    assert.equal(users.updatedPassword, undefined)
    assert.equal((await service.login(sampleUser.email, 'Correct-Horse-Password!')).user.email, sampleUser.email)
  })

  it('rejects malformed and tampered access tokens', async () => {
    const { service } = setup()
    assert.equal(verifyAccessToken('invalid'), null)
    const tokens: TokenPair = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const char = tokens.accessToken.slice(-5, -4)
    const replacement = char === 'x' ? 'y' : 'x'
    const tampered = `${tokens.accessToken.slice(0, -5)}${replacement}${tokens.accessToken.slice(-4)}`
    await expectAuthError(() => service.authenticateAccessToken(tampered), 401)
  })

  it('blocks Google login for a new identity until payment activates the account', async () => {
    const { service, users } = setup()
    const result = await service.loginWithGoogle({
      developmentDemoUser: {
        email: sampleUser.email,
        name: 'Google Student',
        avatarUrl: 'https://example.test/avatar.png',
      },
    })
    assert.equal(result.user.email, sampleUser.email)
    assert.equal(result.user.role, 'STUDENT')
    assert.ok(result.accessToken)
    assert.ok(result.refreshToken)

    const secondLogin = await service.loginWithGoogle({
      developmentDemoUser: {
        email: sampleUser.email,
        name: 'Google Student',
      },
    })
    assert.equal(secondLogin.user.id, result.user.id)
    assert.equal(users.users.size, 1)

    await expectAuthError(() => service.loginWithGoogle({
      developmentDemoUser: {
        email: 'new-google@example.test',
        name: 'New Google Learner',
        avatarUrl: 'https://example.test/new-avatar.png',
      },
    }), 403)
    assert.equal(users.users.size, 2)
    const newAccount = [...users.users.values()].find((user) => user.email === 'new-google@example.test')
    assert.equal(newAccount?.avatar_url, 'https://example.test/new-avatar.png')
    assert.equal(newAccount?.status, 'pending')
  })

  it('returns verified Google profile details for the registration form', async () => {
    const { service } = setup()
    const identity = await service.getGoogleIdentity({
      developmentDemoUser: {
        email: 'new-google@example.test',
        name: 'New Google User',
      },
    })
    assert.deepEqual(identity, {
      email: 'new-google@example.test',
      fullName: 'New Google User',
      avatarUrl: null,
    })
  })
})
