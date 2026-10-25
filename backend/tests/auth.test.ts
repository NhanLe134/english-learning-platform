import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { env } from '../src/config/env.js'
import { AuthError } from '../src/modules/auth/auth.errors.js'
import {
  AuthService,
  type TokenPair,
} from '../src/modules/auth/auth.service.js'
import type { AuthSession } from '../src/modules/auth/auth.repository.js'
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
  emailFrom: 'no-reply@english-learning-platform.test',
  frontendUrl: 'https://english-learning-platform.test',
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

  async createStudentAccount(email: string, password: string): Promise<UserProfile> {
    if ([...this.users.values()].some((user) => user.email === email)) {
      throw new Error('Email is already registered')
    }
    assert.equal(password.length >= 12, true)
    const user = { ...sampleUser, id: randomUUID(), email }
    this.createdRole = user.role
    this.users.set(user.id, user)
    return user
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    return password === 'Correct-Horse-Password!' &&
      [...this.users.values()].find((user) => user.email === email)
      ? [...this.users.values()].find((user) => user.email === email) ?? null
      : null
  }

  async updatePassword(id: string, password: string): Promise<void> {
    assert.equal(this.users.has(id), true)
    this.updatedPassword = password
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null
  }
}

class FakeStore {
  sessions = new Map<string, AuthSession>()
  resetTokens = new Map<string, { userId: string; expiresAt: string; used: boolean }>()

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

  async issuePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<void> {
    this.resetTokens.set(tokenHash, { userId, expiresAt, used: false })
  }

  async consumePasswordResetToken(tokenHash: string): Promise<string | null> {
    const resetToken = this.resetTokens.get(tokenHash)
    if (!resetToken || resetToken.used || Date.parse(resetToken.expiresAt) <= Date.now()) {
      return null
    }
    resetToken.used = true
    return resetToken.userId
  }
}

function setup(sendEmail?: (email: { from: string; to: string; subject: string; html: string }) => Promise<void>) {
  const users = new FakeUsers()
  const store = new FakeStore()
  const service = new AuthService(users, store, sendEmail)
  return { users, store, service }
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

  before(() => {
    originalConsoleError = console.error
  })

  after(() => {
    console.error = originalConsoleError
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

  it('registers a normalized student and issues a 30-minute access token and 7-day session', async () => {
    const { users, store, service } = setup()
    const tokens = await service.register(
      'New.Learner@Example.test',
      'A-very-long-test-password',
      'A-very-long-test-password'
    )
    const claims = verifyAccessToken(tokens.accessToken)
    const sessionId = refreshSessionId(tokens.refreshToken)
    const session = store.sessions.get(sessionId)
    const refreshClaims = verifyRefreshToken(tokens.refreshToken)

    assert.equal(tokens.user.email, 'new.learner@example.test')
    assert.equal(tokens.user.role, 'STUDENT')
    assert.equal(users.createdRole, 'STUDENT')
    assert.deepEqual(Object.keys(tokens.user).sort(), ['email', 'id', 'role'])
    assert.equal(claims?.sub, tokens.user.id)
    assert.equal(claims?.exp && claims.iat ? claims.exp - claims.iat : 0, 30 * 60)
    assert.equal(Date.parse(session?.expires_at ?? '') - Date.now() <= 7 * 24 * 60 * 60 * 1000, true)
    assert.equal(refreshClaims?.exp, Math.floor(Date.parse(session?.expires_at ?? '') / 1000))
    assert.equal(session?.refresh_token_hash, hashToken(tokens.refreshToken))
  })

  it('rejects mismatched confirmations, invalid emails, weak passwords, and duplicate registration', async () => {
    const { service } = setup()
    await expectAuthError(
      () => service.register('new@example.test', 'A-long-password-123', 'does-not-match'),
      400
    )
    await expectAuthError(
      () => service.register('not-an-email', 'A-long-password-123', 'A-long-password-123'),
      400
    )
    await expectAuthError(
      () => service.register('new@example.test', 'short', 'short'),
      400
    )
    await expectAuthError(
      () => service.register(sampleUser.email, 'A-long-password-123', 'A-long-password-123'),
      409
    )
  })

  it('returns a descriptive configuration error for a missing PostgreSQL URL', async () => {
    const { service, users } = setup()
    users.createStudentAccount = async () => {
      throw new Error('DATABASE_URL (or DB_URL) is required for authentication')
    }

    const error = await expectAuthError(
      () => service.register('new@example.test', 'A-long-password-123', 'A-long-password-123'),
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
      () => service.register('new@example.test', 'A-long-password-123', 'A-long-password-123'),
      503
    )

    assert.match(error.message, /20261025003000_database_url_auth\.sql/)
  })

  it('allows only one concurrent registration for the same normalized email', async () => {
    const { service, store } = setup()
    const outcomes = await Promise.allSettled([
      service.register('concurrent@example.test', 'A-long-password-123', 'A-long-password-123'),
      service.register('CONCURRENT@example.test', 'Another-long-password-456', 'Another-long-password-456'),
    ])
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1)
    assert.equal(store.sessions.size, 1)
  })

  it('accepts valid credentials and returns one generic error for bad credentials', async () => {
    const { service } = setup()
    const tokens = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    assert.equal(tokens.user.id, sampleUser.id)
    await expectAuthError(
      () => service.login(sampleUser.email, 'wrong-password'),
      401
    )
    await expectAuthError(
      () => service.login('unknown@example.test', 'wrong-password'),
      401
    )
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

  it('rejects expired access tokens and invalidates a session on password reset', async () => {
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

    const emitted: string[] = []
    const resetService = new AuthService(users, store, async (email) => {
      emitted.push(email.html)
    })
    await resetService.forgotPassword(sampleUser.email)
    assert.equal(emitted.length, 1)
    const emailHtml = emitted[0]
    if (!emailHtml) throw new Error('Expected the reset email to be sent')
    const tokenMatch = /[?&]token=([A-Za-z0-9_-]+)/.exec(emailHtml)
    if (!tokenMatch?.[1]) throw new Error('Expected the reset email to contain a token')
    const token = tokenMatch[1]

    const resetTokenHash = hashToken(token)
    const resetRecord = store.resetTokens.get(resetTokenHash)
    if (!resetRecord) throw new Error('Expected reset token to be stored')
    assert.equal(
      Math.round((Date.parse(resetRecord.expiresAt) - Date.now()) / 1000),
      10 * 60
    )
    await expectAuthError(
      () => resetService.resetPassword(token, 'Another-long-test-password', 'Mismatch-password'),
      400
    )
    await resetService.resetPassword(token, 'Another-long-test-password', 'Another-long-test-password')
    assert.equal(users.updatedPassword, 'Another-long-test-password')
    assert.ok(store.sessions.get(sessionId)?.revoked_at)
    assert.ok(store.sessions.get(secondSessionId)?.revoked_at)
    await expectAuthError(() => service.authenticateAccessToken(tokens.accessToken), 401)
    await expectAuthError(() => service.refresh(tokens.refreshToken), 401)
    await expectAuthError(
      () => resetService.resetPassword(token, 'Yet-another-long-password', 'Yet-another-long-password'),
      400
    )
  })

  it('rejects expired password-reset tokens without changing the password', async () => {
    const { service, store, users } = setup(async () => undefined)
    let emailHtml = ''
    const resetService = new AuthService(users, store, async (email) => {
      emailHtml = email.html
    })
    await resetService.forgotPassword(sampleUser.email)
    const tokenMatch = /[?&]token=([A-Za-z0-9_-]+)/.exec(emailHtml)
    if (!tokenMatch?.[1]) throw new Error('Expected the reset email to contain a token')
    const token = tokenMatch[1]
    const resetRecord = store.resetTokens.get(hashToken(token))
    if (!resetRecord) throw new Error('Expected reset token to be stored')
    resetRecord.expiresAt = new Date(Date.now() - 1000).toISOString()

    await expectAuthError(
      () => resetService.resetPassword(token, 'Another-long-test-password', 'Another-long-test-password'),
      400
    )
    assert.equal(users.updatedPassword, undefined)
  })

  it('uses an indistinguishable forgot-password result and handles Resend errors safely', async () => {
    const { service, store } = setup(async () => {
      throw new Error('provider failure')
    })
    console.error = () => undefined

    const existingAccountMessage = await service.forgotPassword(sampleUser.email)
    assert.equal(store.resetTokens.size, 1)
    const nonexistentAccountMessage = await service.forgotPassword('unknown@example.test')
    assert.equal(existingAccountMessage.message, nonexistentAccountMessage.message)
    const invalidEmailMessage = await service.forgotPassword('not-a-valid-email')
    assert.equal(existingAccountMessage.message, invalidEmailMessage.message)
    assert.equal(store.resetTokens.size, 1)
  })

  it('exposes a reset link only when explicitly enabled in development', async () => {
    const originalExposeResetLink = env.authExposeResetLink
    const originalNodeEnv = env.nodeEnv
    const { users, store } = setup(async () => undefined)
    const resetService = new AuthService(users, store, async () => undefined)

    try {
      Object.assign(env, { authExposeResetLink: false, nodeEnv: 'development' })
      const hidden = await resetService.forgotPassword(sampleUser.email)
      assert.equal(hidden.resetUrl, undefined)

      Object.assign(env, { authExposeResetLink: true, nodeEnv: 'production' })
      const production = await resetService.forgotPassword(sampleUser.email)
      assert.equal(production.resetUrl, undefined)

      Object.assign(env, { authExposeResetLink: true, nodeEnv: 'development' })
      const visible = await resetService.forgotPassword(sampleUser.email)
      assert.match(visible.resetUrl ?? '', /^https:\/\/english-learning-platform\.test\/reset-password\?token=/)
      assert.equal(store.resetTokens.size, 3)
    } finally {
      Object.assign(env, {
        authExposeResetLink: originalExposeResetLink,
        nodeEnv: originalNodeEnv,
      })
    }
  })

  it('atomically allows only one concurrent password-reset consumption', async () => {
    const { service, store, users } = setup()
    let resetLink = ''
    const resetService = new AuthService(users, store, async (email) => {
      resetLink = email.html
    })
    await resetService.forgotPassword(sampleUser.email)
    const tokenMatch = /[?&]token=([A-Za-z0-9_-]+)/.exec(resetLink)
    if (!tokenMatch?.[1]) throw new Error('Expected the reset email to contain a token')
    const token = tokenMatch[1]

    const results = await Promise.allSettled([
      resetService.resetPassword(token, 'First-new-password-123', 'First-new-password-123'),
      resetService.resetPassword(token, 'Second-new-password-456', 'Second-new-password-456'),
    ])
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1)
  })

  it('rejects malformed and tampered access tokens', async () => {
    const { service } = setup()
    assert.equal(verifyAccessToken('invalid'), null)
    const tokens: TokenPair = await service.login(sampleUser.email, 'Correct-Horse-Password!')
    const tampered = `${tokens.accessToken.slice(0, -5)}x${tokens.accessToken.slice(-4)}`
    await expectAuthError(() => service.authenticateAccessToken(tampered), 401)
  })
})
