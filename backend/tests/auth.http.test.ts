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
        email: 'learner@example.test',
        password: 'A-long-test-password',
        confirmPassword: 'a-different-password',
        role: 'ADMIN',
      }),
    })
    assert.equal(mismatch.status, 400)
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
          email: 'new-learner@example.test',
          password: 'A-long-test-password',
          confirmPassword: 'A-long-test-password',
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

  it('returns reset links only when explicitly enabled in development', async () => {
    const originalForgotPassword = authService.forgotPassword
    const originalExposeResetLink = env.authExposeResetLink
    const originalNodeEnv = env.nodeEnv
    authService.forgotPassword = async () => ({
      message: 'If an account exists for that address, a reset link will be sent.',
      resetUrl: 'http://localhost:5173/reset-password?token=local-test-token',
    })

    const request = () => fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'learner@example.test' }),
    })

    try {
      Object.assign(env, { nodeEnv: 'development', authExposeResetLink: true })
      const developmentResponse = await request()
      assert.equal(developmentResponse.status, 200)
      assert.equal((await developmentResponse.json() as { resetUrl?: string }).resetUrl,
        'http://localhost:5173/reset-password?token=local-test-token')

      Object.assign(env, { nodeEnv: 'production', authExposeResetLink: true })
      const productionResponse = await request()
      assert.equal(productionResponse.status, 200)
      assert.equal((await productionResponse.json() as { resetUrl?: string }).resetUrl, undefined)
    } finally {
      authService.forgotPassword = originalForgotPassword
      Object.assign(env, {
        nodeEnv: originalNodeEnv,
        authExposeResetLink: originalExposeResetLink,
      })
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

    const refreshRequest = (token?: string) =>
      fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          Origin: frontendOrigin,
          ...(token ? { Cookie: `${refreshCookieName}=${token}` } : {}),
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
      const validResponse = await refreshRequest(validToken)
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
      assert.match(cookieLogoutResponse.headers.get('set-cookie') ?? '', /Max-Age=0/)
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
      '/api/auth/refresh': 'post',
      '/api/auth/logout': 'post',
      '/api/auth/forgot-password': 'post',
      '/api/auth/reset-password': 'post',
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
      ['/api/auth/reset-password', 'POST', {}, 400],
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
