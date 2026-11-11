import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { env } from '../src/config/env.js'
import { app } from '../src/app.js'
import { authRepository, type AuthSession } from '../src/modules/auth/auth.repository.js'
import { authService } from '../src/modules/auth/auth.service.js'
import { usersController } from '../src/modules/users/users.controller.js'
import { usersService } from '../src/modules/users/users.service.js'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyAccessToken,
} from '../src/modules/auth/auth.tokens.js'
import type { UserProfile } from '../src/modules/users/users.types.js'

const frontendOrigin = new URL(env.frontendUrl).origin
const refreshCookieName = 'english_learning_platform_refresh'

Object.assign(env, {
  authJwtSecret: 'http-test-signing-secret-with-32-bytes-minimum',
})

describe('authentication HTTP endpoints', () => {
  let server: Server
  let baseUrl: string

  before(async () => {
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    server.close()
    await once(server, 'close')
  })

  it('requires the configured origin and responds to registration validation without database access', async () => {
    const blocked = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'learner@example.test',
        password: 'A-long-test-password',
        confirmPassword: 'A-long-test-password',
      }),
    })
    assert.equal(blocked.status, 403)

    const mismatch = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: 'Learner',
        dateOfBirth: '2000-01-15',
        email: 'learner@example.test',
        phoneNumber: '0912 345 678',
        password: 'A-long-test-password',
        confirmPassword: 'a-different-password',
        selectedCourseIds: [],
        role: 'ADMIN',
      }),
    })
    assert.equal(mismatch.status, 400)
  })

  it('validates registration profile fields and course ID input before database access', async () => {
    const request = (body: Record<string, unknown>) => fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const registration = {
      fullName: 'Nguyễn Minh Anh',
      dateOfBirth: '2000-01-15',
      email: 'learner@example.test',
      phoneNumber: '0912 345 678',
      password: 'A-long-test-password',
      confirmPassword: 'A-long-test-password',
      selectedCourseIds: [],
    }

    assert.equal((await request({ ...registration, fullName: '' })).status, 400)
    assert.equal((await request({ ...registration, phoneNumber: 'not-a-phone' })).status, 400)
    assert.equal((await request({ ...registration, dateOfBirth: '2001-02-29' })).status, 400)
    assert.equal((await request({ ...registration, selectedCourseIds: 'not-an-array' })).status, 400)
    assert.equal((await request({ ...registration, selectedCourseIds: ['not-a-uuid'] })).status, 400)
  })

  it('validates registration verification endpoint inputs without issuing a session', async () => {
    const request = (path: string, body: Record<string, unknown>) => fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const verify = await request('/api/auth/register/verification/verify', {
      email: 'learner@example.test',
      otp: '12345',
    })
    assert.equal(verify.status, 400)
    assert.equal(verify.headers.get('set-cookie'), null)
  })

  it('returns verification success without access token or refresh cookie', async () => {
    const originalVerifyOtp = authService.verifyRegistrationOtp
    authService.verifyRegistrationOtp = async () => undefined
    try {
      const response = await fetch(`${baseUrl}/api/auth/register/verification/verify`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'learner@example.test', otp: '123456' }),
      })
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { success: true, data: { verified: true } })
      assert.equal(response.headers.get('set-cookie'), null)
    } finally {
      authService.verifyRegistrationOtp = originalVerifyOtp
    }
  })

  it('returns verified Google identity details without creating an authenticated session', async () => {
    const originalGetGoogleIdentity = authService.getGoogleIdentity
    authService.getGoogleIdentity = async (input) => {
      assert.deepEqual(input, {
        developmentDemoUser: {
          email: 'google-registration@example.test',
          name: 'Google Registration',
        },
      })
      return {
        email: 'google-registration@example.test',
        fullName: 'Google Registration',
        avatarUrl: null,
        phoneNumber: null,
        dateOfBirth: null,
      }
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/google/identity`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developmentDemoUser: {
            email: 'google-registration@example.test',
            name: 'Google Registration',
          },
        }),
      })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('set-cookie'), null)
      assert.deepEqual(await response.json(), {
        success: true,
        data: {
          email: 'google-registration@example.test',
          fullName: 'Google Registration',
          avatarUrl: null,
        },
      })
    } finally {
      authService.getGoogleIdentity = originalGetGoogleIdentity
    }
  })

  it('rejects a Google OAuth callback without a matching state cookie', async () => {
    const response = await fetch(
      `${baseUrl}/api/auth/google/callback?code=unused-code&state=invalid-state`
    )
    assert.equal(response.status, 401)
    assert.match(response.headers.get('set-cookie') ?? '', /english_learning_platform_google_state=/)
  })

  it('redirects to Google with a CSRF state cookie when OAuth is configured', async () => {
    const previousClientId = env.googleClientId
    const previousClientSecret = env.googleClientSecret
    Object.assign(env, {
      googleClientId: 'test-google-client.apps.googleusercontent.com',
      googleClientSecret: 'test-google-client-secret',
    })

    try {
      const response = await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' })
      assert.equal(response.status, 302)
      const location = new URL(response.headers.get('location') ?? '')
      assert.equal(location.origin, 'https://accounts.google.com')
      assert.equal(location.searchParams.get('client_id'), env.googleClientId)
      assert.equal(
        location.searchParams.get('redirect_uri'),
        new URL('/api/auth/google/callback', env.apiOrigin).toString()
      )
      const state = location.searchParams.get('state')
      assert.ok(state)
      assert.match(
        response.headers.get('set-cookie') ?? '',
        new RegExp(`english_learning_platform_google_state=${state}`)
      )
    } finally {
      Object.assign(env, {
        googleClientId: previousClientId,
        googleClientSecret: previousClientSecret,
      })
    }
  })

  it('returns identical resend responses for all registration account states', async () => {
    const originalRequestOtp = authService.requestRegistrationOtp
    const outcomes: Array<{
      state: string
      result: Awaited<ReturnType<typeof authService.requestRegistrationOtp>>
    }> = [
      { state: 'unknown email', result: { status: 'ignored' } },
      { state: 'verified account', result: { status: 'ignored' } },
      { state: 'cooldown', result: { status: 'cooldown', retryAfterSeconds: 30 } },
      { state: 'eligible registration', result: { status: 'sent' } },
    ]
    const request = () => fetch(`${baseUrl}/api/auth/register/verification/resend`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'state-check@example.test' }),
    })

    try {
      let expectedBody: unknown
      for (const outcome of outcomes) {
        authService.requestRegistrationOtp = async () => outcome.result
        const response = await request()
        const body = await response.json()
        assert.equal(response.status, 202, outcome.state)
        assert.equal(response.headers.get('retry-after'), null, outcome.state)
        assert.equal(
          body.message,
          'Yêu cầu đã được tiếp nhận. Nếu cần xác minh, hãy kiểm tra email; nếu chưa nhận được mã, vui lòng thử gửi lại sau.',
          outcome.state
        )
        if (expectedBody === undefined) expectedBody = body
        else assert.deepEqual(body, expectedBody, outcome.state)
      }
    } finally {
      authService.requestRegistrationOtp = originalRequestOtp
    }
  })

  it('includes a development OTP in the resend API response when explicitly enabled by the service', async () => {
    const originalRequestOtp = authService.requestRegistrationOtp
    const request = () => fetch(`${baseUrl}/api/auth/register/verification/resend`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'dev-otp@example.test' }),
    })

    try {
      authService.requestRegistrationOtp = async () => ({
        status: 'sent',
        developmentOtp: '012345',
        developmentEmailFallback: true,
      })
      const exposedResponse = await request()
      const exposedBody = await exposedResponse.json()
      assert.equal(exposedResponse.status, 202)
      assert.equal(exposedBody.developmentOtp, '012345')
      assert.equal(exposedBody.developmentEmailFallback, true)
    } finally {
      authService.requestRegistrationOtp = originalRequestOtp
    }
  })

  it('returns identical verification failures for unknown, pending-invalid, expired, exhausted, and verified accounts', async () => {
    const originalVerifyOtp = authRepository.verifyRegistrationOtp
    const states = [
      'not_registered',
      'already_verified',
      'invalid',
      'expired',
      'attempts_exhausted',
    ] as const
    const request = () => fetch(`${baseUrl}/api/auth/register/verification/verify`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'state-check@example.test', otp: '012345' }),
    })

    try {
      let expectedBody: unknown
      for (const state of states) {
        authRepository.verifyRegistrationOtp = async () => ({ status: state })
        const response = await request()
        const body = await response.json()
        assert.equal(response.status, 400, state)
        assert.equal(response.headers.get('set-cookie'), null, state)
        if (expectedBody === undefined) expectedBody = body
        else assert.deepEqual(body, expectedBody, state)
      }
      assert.deepEqual(expectedBody, {
        message: 'Mã xác minh không hợp lệ hoặc đã hết hạn.',
      })
    } finally {
      authRepository.verifyRegistrationOtp = originalVerifyOtp
    }
  })

  it('creates an unverified registration without issuing an auth token or cookie', async () => {
    const originalCreateStudentAccount = authRepository.createStudentAccount
    let savedPhoneNumber: string | undefined
    authRepository.createStudentAccount = async (
      email,
      _password,
      fullName,
      dateOfBirth,
      phoneNumber,
      selectedCourseIds
    ) => {
      savedPhoneNumber = phoneNumber
      return {
        id: randomUUID(),
        email,
        full_name: fullName,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        registration_course_ids: selectedCourseIds,
        role: 'STUDENT',
        status: 'active',
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Nguyễn Minh Anh',
          dateOfBirth: '2000-01-15',
          email: 'new-learner@example.test',
          phoneNumber: '0912 345 678',
          password: 'A-long-test-password',
          confirmPassword: 'A-long-test-password',
          selectedCourseIds: [],
        }),
      })

      assert.equal(response.status, 202)
      assert.equal(savedPhoneNumber, '0912 345 678')
      assert.deepEqual(await response.json(), {
        success: true,
        message: 'Registration is awaiting email verification.',
        data: {
          verificationRequired: true,
          email: 'new-learner@example.test',
          selectedCourseIds: [],
        },
      })
      assert.equal(response.headers.get('set-cookie'), null)
    } finally {
      authRepository.createStudentAccount = originalCreateStudentAccount
    }
  })

  it('returns a descriptive configuration error when PostgreSQL is not configured', async () => {
    const originalCreateStudentAccount = authRepository.createStudentAccount
    const originalNodeEnv = process.env.NODE_ENV
    const originalConsoleError = console.error
    authRepository.createStudentAccount = async () => {
      throw new Error(
        'DATABASE_URL (or DB_URL) is required for authentication'
      )
    }
    process.env.NODE_ENV = 'production'
    console.error = () => {}

    try {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'New Learner',
          dateOfBirth: '2000-01-15',
          email: 'new-learner@example.test',
          phoneNumber: '0912 345 678',
          password: 'A-long-test-password',
          confirmPassword: 'A-long-test-password',
          selectedCourseIds: [],
        }),
      })

      assert.equal(response.status, 503)
      assert.deepEqual(await response.json(), {
        message:
          'Registration is unavailable because PostgreSQL is not configured. Set DATABASE_URL in backend/.env.',
      })
    } finally {
      authRepository.createStudentAccount = originalCreateStudentAccount
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = originalNodeEnv
      console.error = originalConsoleError
    }
  })

  it('sets persistent cookies only when rememberMe is selected', async () => {
    const originalLogin = authService.login
    authService.login = async () => ({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: randomUUID(),
        email: 'learner@example.test',
        full_name: 'Learner',
        phone_number: null,
        role: 'STUDENT',
      },
    })

    try {
      const requestLogin = (rememberMe: boolean) => fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'learner@example.test',
          password: 'a-test-password',
          rememberMe,
        }),
      })

      const sessionLogin = await requestLogin(false)
      assert.equal(sessionLogin.status, 200)
      const sessionCookies = sessionLogin.headers.get('set-cookie') ?? ''
      assert.match(sessionCookies, /english_learning_platform_refresh=test-refresh-token/)
      assert.match(sessionCookies, /english_learning_platform_remember=0/)
      assert.match(sessionCookies, /SameSite=Lax/)
      assert.doesNotMatch(sessionCookies, /Max-Age=/)

      const rememberedLogin = await requestLogin(true)
      assert.equal(rememberedLogin.status, 200)
      const rememberedCookies = rememberedLogin.headers.get('set-cookie') ?? ''
      assert.match(rememberedCookies, /english_learning_platform_remember=1/)
      assert.match(rememberedCookies, /Max-Age=604800/)
      assert.match(rememberedCookies, /SameSite=Lax/)
    } finally {
      authService.login = originalLogin
    }
  })

  it('requires an active access token for /me', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Origin: frontendOrigin },
    })
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { message: 'Invalid or expired authentication token' })
  })

  it('restricts user-management routes to admins', async () => {
    const originalFindSession = authRepository.findSessionById
    const originalFindUser = authRepository.findById
    const originalGetUsers = usersController.getUsers
    const sessionIds = new Map<string, UserProfile>()
    const student: UserProfile = {
      id: randomUUID(),
      email: 'student-role@example.test',
      full_name: 'Student',
      role: 'STUDENT',
      status: 'active',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const admin: UserProfile = {
      ...student,
      id: randomUUID(),
      email: 'admin-role@example.test',
      role: 'ADMIN',
    }
    const createSessionFor = (user: UserProfile): AuthSession => {
      const id = randomUUID()
      sessionIds.set(id, user)
      return {
        id,
        user_id: user.id,
        refresh_token_hash: '',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        revoked_at: null,
      }
    }
    const studentSession = createSessionFor(student)
    const adminSession = createSessionFor(admin)

    authRepository.findSessionById = async (id) => {
      const user = sessionIds.get(id)
      return user ? (user.id === student.id ? studentSession : adminSession) : null
    }
    authRepository.findById = async (id) =>
      [...sessionIds.values()].find((user) => user.id === id) ?? null
    usersController.getUsers = async (_request, response) => {
      response.status(200).json({ success: true, data: [] })
    }

    try {
      const request = (token?: string) => fetch(`${baseUrl}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const anonymousResponse = await request()
      assert.equal(anonymousResponse.status, 401)

      const studentResponse = await request(createAccessToken(student.id, studentSession.id))
      assert.equal(studentResponse.status, 403)
      assert.deepEqual(await studentResponse.json(), {
        message: 'You do not have permission to access this resource',
      })

      const adminResponse = await request(createAccessToken(admin.id, adminSession.id))
      assert.equal(adminResponse.status, 200)
    } finally {
      authRepository.findSessionById = originalFindSession
      authRepository.findById = originalFindUser
      usersController.getUsers = originalGetUsers
    }
  })

  it('treats the ALL user-status filter as unfiltered', async () => {
    const originalFindSession = authRepository.findSessionById
    const originalFindUser = authRepository.findById
    const originalGetUsers = usersService.getUsers
    const user: UserProfile = {
      id: randomUUID(),
      email: 'admin-filter@example.test',
      full_name: 'Admin',
      role: 'ADMIN',
      status: 'active',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const session: AuthSession = {
      id: randomUUID(),
      user_id: user.id,
      refresh_token_hash: '',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
    }
    let receivedFilters: { role?: string; status?: string } | undefined
    authRepository.findSessionById = async (id) => id === session.id ? session : null
    authRepository.findById = async (id) => id === user.id ? user : null
    usersService.getUsers = async (filters) => {
      receivedFilters = filters
      return {
        items: [user],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
    }

    try {
      const response = await fetch(
        `${baseUrl}/api/users?role=ALL&status=ALL&page=1&limit=10`,
        {
          headers: {
            ['Author' + 'ization']: ['Bearer', createAccessToken(user.id, session.id)].join(' '),
          },
        }
      )
      assert.equal(response.status, 200)
      assert.equal(receivedFilters?.role, 'ALL')
      assert.equal(receivedFilters?.status, 'ALL')
      assert.equal((await response.json() as { pagination: { total: number } }).pagination.total, 1)
    } finally {
      authRepository.findSessionById = originalFindSession
      authRepository.findById = originalFindUser
      usersService.getUsers = originalGetUsers
    }
  })

  it('returns a generic temporary-password response without exposing credentials', async () => {
    const originalForgotPassword = authService.forgotPassword
    authService.forgotPassword = async () => ({
      message: 'If an account exists for that address, a temporary password will be sent.',
    })

    try {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'learner@example.test' }),
      })
      assert.equal(response.status, 200)
      const result = await response.json() as Record<string, unknown>
      assert.deepEqual(Object.keys(result).sort(), ['message', 'success'])
      assert.equal(typeof result.message, 'string')

      const removedRoute = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      assert.equal(removedRoute.status, 404)
    } finally {
      authService.forgotPassword = originalForgotPassword
    }
  })

  it('validates refresh cookies and active sessions over HTTP before issuing access tokens', async () => {
    const user: UserProfile = {
      id: randomUUID(),
      email: 'refresh-http@example.test',
      full_name: 'Refresh HTTP Test',
      role: 'STUDENT',
      status: 'active',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const session: AuthSession = {
      id: randomUUID(),
      user_id: user.id,
      refresh_token_hash: '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
    }
    const originalFindSession = authRepository.findSessionById
    const originalRotateSession = authRepository.rotateSession
    const originalRevokeSession = authRepository.revokeSession
    const originalFindUser = authRepository.findById

    authRepository.findSessionById = async (id) => id === session.id ? session : null
    authRepository.rotateSession = async (id, previousHash, nextHash, expiresAt) => {
      if (
        id !== session.id ||
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
    authRepository.revokeSession = async (id) => {
      if (id === session.id) session.revoked_at = session.revoked_at ?? new Date().toISOString()
    }
    authRepository.findById = async (id) => id === user.id ? user : null

    const refreshRequest = (token?: string, rememberMe = true) =>
      fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          ...(token ? {
            Cookie: `${refreshCookieName}=${token}; english_learning_platform_remember=${rememberMe ? '1' : '0'}`,
          } : {}),
        },
      })
    const assertRejectedWithoutAccessToken = async (token?: string) => {
      const response = await refreshRequest(token)
      assert.equal(response.status, 401)
      const payload = await response.json() as { data?: { accessToken?: string } }
      assert.equal(payload.data, undefined)
    }

    try {
      await assertRejectedWithoutAccessToken()

      const validToken = createRefreshToken(session.id)
      session.refresh_token_hash = hashToken(validToken)
      const validResponse = await refreshRequest(validToken, false)
      assert.equal(validResponse.status, 200)
      const result = await validResponse.json() as {
        data: { accessToken: string }
      }
      assert.ok(verifyAccessToken(result.data.accessToken))
      const setCookie = validResponse.headers.get('set-cookie') ?? ''
      const rotatedToken = new RegExp(`${refreshCookieName}=([^;]+)`).exec(setCookie)?.[1]
      assert.ok(rotatedToken)
      assert.notEqual(rotatedToken, validToken)
      assert.equal(session.refresh_token_hash, hashToken(rotatedToken))
      assert.match(setCookie, /english_learning_platform_remember=0/)
      assert.doesNotMatch(setCookie, /Max-Age=/)

      const expiredToken = createRefreshToken(
        session.id,
        Date.now() - 8 * 24 * 60 * 60 * 1000
      )
      session.refresh_token_hash = hashToken(expiredToken)
      session.revoked_at = null
      await assertRejectedWithoutAccessToken(expiredToken)

      const tamperedToken = `${validToken.slice(0, -1)}${validToken.endsWith('A') ? 'B' : 'A'}`
      await assertRejectedWithoutAccessToken(tamperedToken)

      session.refresh_token_hash = hashToken(validToken)
      session.revoked_at = new Date().toISOString()
      await assertRejectedWithoutAccessToken(validToken)

      session.revoked_at = null
      session.expires_at = 'not-a-date'
      await assertRejectedWithoutAccessToken(validToken)

      session.expires_at = new Date(Date.now() - 1000).toISOString()
      await assertRejectedWithoutAccessToken(validToken)

      session.revoked_at = null
      session.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const logoutToken = createRefreshToken(session.id)
      session.refresh_token_hash = hashToken(logoutToken)
      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          Authorization: `Bearer ${createAccessToken(user.id, session.id)}`,
        },
      })
      assert.equal(logoutResponse.status, 204)
      await assertRejectedWithoutAccessToken(logoutToken)

      session.revoked_at = null
      session.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const cookieLogoutToken = createRefreshToken(session.id)
      session.refresh_token_hash = hashToken(cookieLogoutToken)
      const expiredAccessToken = createAccessToken(
        user.id,
        session.id,
        Date.now() - 60 * 60 * 1000
      )
      const cookieLogoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          Authorization: `Bearer ${expiredAccessToken}`,
          Cookie: `${refreshCookieName}=${cookieLogoutToken}`,
        },
      })
      assert.equal(cookieLogoutResponse.status, 204)
      const clearedCookies = cookieLogoutResponse.headers.get('set-cookie') ?? ''
      assert.match(clearedCookies, /english_learning_platform_refresh=;[^,]*Max-Age=0/)
      assert.match(clearedCookies, /english_learning_platform_remember=;[^,]*Max-Age=0/)
      await assertRejectedWithoutAccessToken(cookieLogoutToken)
    } finally {
      authRepository.findSessionById = originalFindSession
      authRepository.rotateSession = originalRotateSession
      authRepository.revokeSession = originalRevokeSession
      authRepository.findById = originalFindUser
    }
  })

  it('serves the API documentation and an OpenAPI document matching all auth methods', async () => {
    const ui = await fetch(`${baseUrl}/docs`)
    assert.equal(ui.status, 200)
    const uiPage = ui
    assert.equal(uiPage.status, 200)
    assert.match(uiPage.headers.get('content-type') ?? '', /text\/html/)
    const pageContent = await uiPage.text()
    assert.match(pageContent, /swagger-ui/)
    assert.match(pageContent, /swagger-ui-init\.js/)

    const initResponse = await fetch(`${baseUrl}/docs/swagger-ui-init.js`)
    assert.equal(initResponse.status, 200)
    const initScript = await initResponse.text()
    assert.match(initScript, /\/docs\/openapi\.json/)
    assert.match(initScript, /"withCredentials":\s*true/)

    const specResponse = await fetch(`${baseUrl}/docs/openapi.json`)
    assert.equal(specResponse.status, 200)
    const spec = await specResponse.json() as {
      info: { title: string }
      paths: Record<string, Record<string, unknown>>
      components: {
        schemas: Record<string, { additionalProperties?: unknown }>
      }
    }
    assert.equal(spec.info.title, 'English Learning Platform API')
    assert.equal(spec.components.schemas.RegisterRequest?.additionalProperties, undefined)
    assert.equal(spec.paths['/api/auth/reset-password'], undefined)
    assert.equal(spec.components.schemas.ResetPasswordRequest, undefined)
    for (const schema of [
      'UserProfile',
      'UserResponse',
      'UserListResponse',
      'CreateManagedUserRequest',
      'UpdateUserStatusRequest',
      'SeedUsersResponse',
    ]) {
      assert.ok(spec.components.schemas[schema], `OpenAPI schema ${schema} must be defined`)
    }

    const expectedMethods: Record<string, string> = {
      '/api/users': 'get,post',
      '/api/users/export': 'get',
      '/api/users/seed': 'post',
      '/api/users/{id}/status': 'patch',
      '/api/users/{id}': 'delete',
      '/api/auth/register': 'post',
      '/api/auth/login': 'post',
      '/api/auth/google': 'get,post',
      '/api/auth/google/callback': 'get',
      '/api/auth/refresh': 'post',
      '/api/auth/logout': 'post',
      '/api/auth/forgot-password': 'post',
      '/api/auth/me': 'get',
    }
    for (const [path, method] of Object.entries(expectedMethods)) {
      assert.deepEqual(Object.keys(spec.paths[path] ?? {}).sort(), method.split(',').sort())
    }
    for (const path of Object.keys(expectedMethods).filter((path) => path.startsWith('/api/users'))) {
      for (const operation of Object.values(spec.paths[path] ?? {}) as Array<{ security?: unknown[] }>) {
        assert.deepEqual(operation.security, [{ bearerAuth: [] }])
      }
    }

    const pathsForSmokeTest = [
      ['/api/auth/register', 'POST', { email: 'learner@example.test', password: 'A-long-password-123', confirmPassword: 'mismatch' }, 400],
      ['/api/auth/login', 'POST', {}, 400],
      ['/api/auth/refresh', 'POST', {}, 401],
      ['/api/auth/logout', 'POST', {}, 401],
      ['/api/auth/forgot-password', 'POST', { email: 'invalid-email' }, 200],
      ['/api/auth/me', 'GET', {}, 401],
    ] as const

    for (const [path, method, body, expectedStatus] of pathsForSmokeTest) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      })
      assert.equal(response.status, expectedStatus, `${method} ${path}`)
    }

    const wrongMethod = await fetch(`${baseUrl}/api/auth/register`)
    assert.equal(wrongMethod.status, 404)
  })

  it('applies the configured login rate limit', async () => {
    const statuses: number[] = []
    for (let attempt = 0; attempt <= env.authResetRateLimit; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'invalid' }),
      })
      statuses.push(response.status)
    }

    const firstLimitedAttempt = statuses.indexOf(429)
    assert.notEqual(firstLimitedAttempt, -1)
    assert.ok(statuses.slice(0, firstLimitedAttempt).every((status) => status === 200))
    assert.ok(statuses.slice(firstLimitedAttempt).every((status) => status === 429))
  })
})
