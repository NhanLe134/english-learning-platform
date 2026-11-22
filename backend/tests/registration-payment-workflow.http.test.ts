import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.js'
import { env } from '../src/config/env.js'
import {
  authRepository,
  type AuthSession,
} from '../src/modules/auth/auth.repository.js'
import { authService } from '../src/modules/auth/auth.service.js'
import {
  hashRegistrationOtp,
  registrationOtpMatches,
} from '../src/modules/auth/registration-otp.js'
import { courseService } from '../src/modules/courses/course.service.js'
import type { CourseCatalogEntry } from '../src/modules/courses/course.types.js'
import { paymentConfirmationEmailService } from '../src/modules/payments/payment-confirmation-email.service.js'
import { paymentOrderRepository } from '../src/modules/payments/payments.repository.js'
import type { PaymentOrder } from '../src/modules/payments/payments.types.js'
import { usersService } from '../src/modules/users/users.service.js'
import type { UserProfile } from '../src/modules/users/users.types.js'

interface StoredStudent extends UserProfile {
  password?: string
  date_of_birth?: string | null
  registration_course_ids?: string[]
  otp_hash?: string | null
  otp_expires_at?: string | null
  otp_attempts?: number
  otp_sent_at?: string | null
}

interface StoredEnrollment {
  id: string
  student_id: string
  course_id: string
  status: 'active' | 'completed' | 'cancelled'
}

const frontendOrigin = new URL(env.frontendUrl).origin
const refreshCookieName = 'english_learning_platform_refresh'

const COURSE_ID = '2f0e53db-e138-4dd1-9314-b0045631cb36'
const COURSE_CATALOG_ENTRY: CourseCatalogEntry = {
  id: COURSE_ID,
  title: 'IELTS Speaking Mastery',
  slug: 'ielts-speaking-mastery',
  description: 'Intensive speaking fluency program.',
  category: 'IELTS',
  level: 'intermediate',
  target_audience: 'Band 5.5+ learners',
  price: 100_000,
  discounted_price: 75_000,
  total_lessons: 12,
  thumbnail_url: 'https://example.test/course.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  teacher: {
    id: '0f0e53db-e138-4dd1-9314-b0045631cb11',
    full_name: 'Teacher Kim',
    avatar_url: null,
  },
  topics: [],
}

describe('End-to-end registration, OTP verification, SePay payment, and login workflow (HTTP)', () => {
  let server: Server
  let baseUrl: string

  const users = new Map<string, StoredStudent>()
  const sessions = new Map<string, AuthSession>()
  const orders = new Map<string, PaymentOrder>()
  const enrollments: StoredEnrollment[] = []
  const sentEmails: Array<{ to: string; html: string }> = []
  let confirmationEmailCalls = 0

  const previousEnv = {
    authJwtSecret: env.authJwtSecret,
    emailFrom: env.emailFrom,
    resendApiKey: env.resendApiKey,
    sepayCheckoutMode: env.sepayCheckoutMode,
    sepayEnv: env.sepayEnv,
    sepayMerchantId: env.sepayMerchantId,
    sepaySecretKey: env.sepaySecretKey,
    sepayIpnSecretKey: env.sepayIpnSecretKey,
    sepayBankWebhookSecret: env.sepayBankWebhookSecret,
    sepayBankCode: env.sepayBankCode,
    sepayBankName: env.sepayBankName,
    sepayAccountNumber: env.sepayAccountNumber,
    sepayAccountName: env.sepayAccountName,
  }

  const originals = {
    createStudentAccount: authRepository.createStudentAccount,
    issueRegistrationOtp: authRepository.issueRegistrationOtp,
    invalidateRegistrationOtp: authRepository.invalidateRegistrationOtp,
    verifyRegistrationOtp: authRepository.verifyRegistrationOtp,
    authenticatePassword: authRepository.authenticatePassword,
    findById: authRepository.findById,
    findByEmail: authRepository.findByEmail,
    createSession: authRepository.createSession,
    findSessionById: authRepository.findSessionById,
    revokeUserSessions: authRepository.revokeUserSessions,
    updatePasswordAndVerifyEmail: authRepository.updatePasswordAndVerifyEmail,
    validateSelectedCourseIds: courseService.validateSelectedCourseIds,
    getCourseForPaidOrder: courseService.getCourseForPaidOrder,
    getEnrolledCourses: courseService.getEnrolledCourses,
    findVerifiedStudentByEmail: paymentOrderRepository.findVerifiedStudentByEmail,
    findPublishedCourse: paymentOrderRepository.findPublishedCourse,
    findStudentSummary: paymentOrderRepository.findStudentSummary,
    hasActiveEnrollment: paymentOrderRepository.hasActiveEnrollment,
    createOrReusePendingOrder: paymentOrderRepository.createOrReusePendingOrder,
    findOrderById: paymentOrderRepository.findOrderById,
    findOrderByTransferContent: paymentOrderRepository.findOrderByTransferContent,
    findCourseTitle: paymentOrderRepository.findCourseTitle,
    confirmVerifiedPayment: paymentOrderRepository.confirmVerifiedPayment,
    markOrderExpired: paymentOrderRepository.markOrderExpired,
    releaseAfterEnrollmentAndSend: paymentConfirmationEmailService.releaseAfterEnrollmentAndSend,
    adminAuthenticatePassword: usersService.authenticatePassword,
    adminFindById: usersService.findById,
    sendVerificationEmail: (authService as unknown as { sendVerificationEmail: (email: { to: string; html: string }) => Promise<void> }).sendVerificationEmail,
  }

  function findStoredUserByEmail(email: string): StoredStudent | undefined {
    const normalized = email.trim().toLowerCase()
    return [...users.values()].find((item) => item.email.toLowerCase() === normalized)
  }

  before(async () => {
    Object.assign(env, {
      authJwtSecret: 'workflow-http-test-jwt-secret-32bytes!',
      emailFrom: 'no-reply@example.test',
      resendApiKey: 'test-resend-api-key',
      sepayCheckoutMode: 'hosted',
      sepayEnv: 'sandbox',
      sepayMerchantId: 'test-merchant-id',
      sepaySecretKey: 'test-merchant-secret',
      sepayIpnSecretKey: 'test-ipn-secret-key',
      sepayBankWebhookSecret: 'test-bank-webhook-secret',
      sepayBankCode: 'VCB',
      sepayBankName: 'Vietcombank',
      sepayAccountNumber: '0012345678',
      sepayAccountName: 'YOUR ENGLISH VOICE',
    })

    courseService.validateSelectedCourseIds = async (ids) => {
      const list = Array.isArray(ids) ? ids.map(String) : []
      return {
        courseIds: list.filter((id) => id === COURSE_ID),
        missingIds: list.filter((id) => id !== COURSE_ID),
      }
    }
    courseService.getCourseForPaidOrder = async (courseId) =>
      courseId === COURSE_ID ? COURSE_CATALOG_ENTRY : null
    courseService.getEnrolledCourses = async (studentId) =>
      enrollments
        .filter((item) => item.student_id === studentId && item.status === 'active' && item.course_id === COURSE_ID)
        .map((item) => ({
          id: item.id,
          course_id: COURSE_CATALOG_ENTRY.id,
          title: COURSE_CATALOG_ENTRY.title,
          slug: COURSE_CATALOG_ENTRY.slug,
          category: COURSE_CATALOG_ENTRY.category,
          level: COURSE_CATALOG_ENTRY.level,
          thumbnail_url: COURSE_CATALOG_ENTRY.thumbnail_url,
          total_lessons: COURSE_CATALOG_ENTRY.total_lessons,
          completed_lessons: 0,
          progress_percent: 0,
          status: 'in_progress' as const,
          enrolled_at: new Date().toISOString(),
          last_active: null,
          teacher: COURSE_CATALOG_ENTRY.teacher,
        }))

    ;(authService as unknown as { sendVerificationEmail: (email: { to: string; html: string }) => Promise<void> }).sendVerificationEmail = async (email) => {
      sentEmails.push({ to: email.to, html: email.html })
    }

    authRepository.createStudentAccount = async (
      email,
      password,
      fullName,
      dateOfBirth,
      phoneNumber,
      selectedCourseIds,
    ) => {
      const existing = findStoredUserByEmail(email)
      if (existing) {
        throw new Error('duplicate email')
      }
      const now = new Date().toISOString()
      const user: StoredStudent = {
        id: randomUUID(),
        email: email.trim().toLowerCase(),
        full_name: fullName,
        nickname: null,
        phone_number: phoneNumber,
        avatar_url: null,
        date_of_birth: dateOfBirth,
        registration_course_ids: selectedCourseIds,
        role: 'STUDENT',
        status: 'pending',
        is_verified: false,
        password,
        otp_hash: null,
        otp_expires_at: null,
        otp_attempts: 0,
        otp_sent_at: null,
        created_at: now,
        updated_at: now,
      }
      users.set(user.id, user)
      return user
    }

    authRepository.issueRegistrationOtp = async (email, otp, expiresAt, sentAt, cooldownMs) => {
      const user = findStoredUserByEmail(email)
      if (!user || user.status !== 'pending' || user.is_verified || !user.registration_course_ids) {
        return { status: 'not_eligible' }
      }
      if (user.otp_sent_at) {
        const elapsed = Date.parse(sentAt) - Date.parse(user.otp_sent_at)
        if (elapsed < cooldownMs) {
          return { status: 'cooldown', retryAfterSeconds: Math.ceil((cooldownMs - elapsed) / 1000) }
        }
      }
      user.otp_hash = hashRegistrationOtp(user.id, otp)
      user.otp_expires_at = expiresAt
      user.otp_attempts = 0
      user.otp_sent_at = sentAt
      return { status: 'issued', userId: user.id, email: user.email, fullName: user.full_name }
    }

    authRepository.invalidateRegistrationOtp = async (userId, otpHash) => {
      const user = users.get(userId)
      if (user && user.otp_hash === otpHash) {
        user.otp_hash = null
      }
    }

    authRepository.verifyRegistrationOtp = async (email, otp, now, maxAttempts) => {
      const user = findStoredUserByEmail(email)
      if (!user || user.status !== 'pending' || !user.registration_course_ids) {
        return { status: 'not_registered' }
      }
      if (user.is_verified) return { status: 'already_verified' }
      if (!user.otp_hash || !user.otp_expires_at) return { status: 'invalid' }
      if (Date.parse(user.otp_expires_at) <= Date.parse(now)) return { status: 'expired' }
      if ((user.otp_attempts ?? 0) >= maxAttempts) return { status: 'attempts_exhausted' }
      if (!registrationOtpMatches(user.id, otp, user.otp_hash)) {
        user.otp_attempts = (user.otp_attempts ?? 0) + 1
        return { status: 'invalid' }
      }
      user.is_verified = true
      user.status = 'pending'
      user.otp_hash = null
      user.otp_expires_at = null
      user.otp_attempts = 0
      user.updated_at = now
      return { status: 'verified', user }
    }

    authRepository.authenticatePassword = async (email, password) => {
      const user = findStoredUserByEmail(email)
      if (!user || user.password !== password) return null
      return user
    }
    authRepository.findById = async (id) => users.get(id) ?? null
    authRepository.findByEmail = async (email) => findStoredUserByEmail(email) ?? null
    authRepository.createSession = async (id, userId, refreshTokenHash, expiresAt) => {
      sessions.set(id, { id, user_id: userId, refresh_token_hash: refreshTokenHash, expires_at: expiresAt, revoked_at: null })
    }
    authRepository.findSessionById = async (id) => sessions.get(id) ?? null
    authRepository.revokeUserSessions = async (userId) => {
      for (const session of sessions.values()) {
        if (session.user_id === userId) session.revoked_at = new Date().toISOString()
      }
    }
    authRepository.updatePasswordAndVerifyEmail = async (id, password) => {
      const user = users.get(id)
      if (user) {
        user.password = password
        user.is_verified = true
      }
    }

    paymentOrderRepository.findVerifiedStudentByEmail = async (email) => {
      const user = findStoredUserByEmail(email)
      if (!user || user.role !== 'STUDENT' || !user.is_verified || !['pending', 'active'].includes(user.status)) {
        return null
      }
      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number ?? null,
      }
    }

    paymentOrderRepository.findPublishedCourse = async (courseId) =>
      courseId === COURSE_ID
        ? {
            id: COURSE_CATALOG_ENTRY.id,
            title: COURSE_CATALOG_ENTRY.title,
            slug: COURSE_CATALOG_ENTRY.slug,
            description: COURSE_CATALOG_ENTRY.description,
            thumbnail_url: COURSE_CATALOG_ENTRY.thumbnail_url,
            price: COURSE_CATALOG_ENTRY.price,
            discounted_price: COURSE_CATALOG_ENTRY.discounted_price,
          }
        : null

    paymentOrderRepository.findStudentSummary = async (studentId) => {
      const user = users.get(studentId)
      if (!user) return null
      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number ?? null,
      }
    }

    paymentOrderRepository.hasActiveEnrollment = async (studentId, courseId) =>
      enrollments.some(
        (item) =>
          item.student_id === studentId &&
          item.course_id === courseId &&
          (item.status === 'active' || item.status === 'completed'),
      )

    paymentOrderRepository.createOrReusePendingOrder = async (input) => {
      const existing = [...orders.values()].find(
        (item) =>
          item.student_id === input.studentId &&
          item.course_id === input.courseId &&
          item.status === 'pending' &&
          (!item.expired_at || Date.parse(item.expired_at) > Date.now()),
      )
      if (existing) return existing

      const now = new Date().toISOString()
      const created: PaymentOrder = {
        id: input.id,
        student_id: input.studentId,
        course_id: input.courseId,
        amount: input.amount,
        currency: 'VND',
        status: 'pending',
        transfer_content: input.transferContent,
        provider: 'sepay',
        provider_order_id: null,
        provider_transaction_id: null,
        paid_at: null,
        expired_at: input.expiredAt,
        created_at: now,
        updated_at: now,
      }
      orders.set(created.id, created)
      return created
    }

    paymentOrderRepository.findOrderById = async (orderId) => orders.get(orderId) ?? null
    paymentOrderRepository.findOrderByTransferContent = async (transferContent) =>
      [...orders.values()].find((item) => item.transfer_content === transferContent) ?? null
    paymentOrderRepository.findCourseTitle = async (courseId) =>
      courseId === COURSE_ID ? COURSE_CATALOG_ENTRY.title : null
    paymentOrderRepository.markOrderExpired = async (orderId) => {
      const order = orders.get(orderId)
      if (!order || order.status !== 'pending') return null
      order.status = 'expired'
      order.updated_at = new Date().toISOString()
      return order
    }

    paymentOrderRepository.confirmVerifiedPayment = async (
      orderId,
      providerOrderId,
      providerTransactionId,
      amount,
    ) => {
      const order = orders.get(orderId)
      if (!order) throw new Error('Order not found.')
      if (order.amount !== amount) throw new Error('Payment amount mismatch.')
      if (order.provider_order_id && order.provider_order_id !== providerOrderId) {
        throw new Error('Provider order reference mismatch.')
      }
      const wasPaid = order.status === 'paid'
      if (wasPaid) {
        if (order.provider_transaction_id !== providerTransactionId) {
          throw new Error('A different transaction has already paid this course order.')
        }
      } else {
        order.status = 'paid'
        order.provider_order_id = providerOrderId
        order.provider_transaction_id = providerTransactionId
        order.paid_at = new Date().toISOString()
        order.updated_at = order.paid_at
      }

      const existingEnrollment = enrollments.find(
        (item) => item.student_id === order.student_id && item.course_id === order.course_id,
      )
      if (existingEnrollment) {
        existingEnrollment.status = 'active'
      } else {
        enrollments.push({
          id: randomUUID(),
          student_id: order.student_id,
          course_id: order.course_id,
          status: 'active',
        })
      }

      const profile = users.get(order.student_id)
      if (profile && profile.status === 'pending') {
        profile.status = 'active'
        profile.updated_at = new Date().toISOString()
      }

      return { order: { ...order }, isNewlyPaid: !wasPaid }
    }

    paymentConfirmationEmailService.releaseAfterEnrollmentAndSend = async () => {
      confirmationEmailCalls += 1
    }

    usersService.authenticatePassword = async (email, password) => {
      const user = findStoredUserByEmail(email)
      if (!user || user.role !== 'ADMIN' || user.password !== password) return null
      return user
    }
    usersService.findById = async (id) => users.get(id) ?? null

    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    Object.assign(env, previousEnv)
    authRepository.createStudentAccount = originals.createStudentAccount
    authRepository.issueRegistrationOtp = originals.issueRegistrationOtp
    authRepository.invalidateRegistrationOtp = originals.invalidateRegistrationOtp
    authRepository.verifyRegistrationOtp = originals.verifyRegistrationOtp
    authRepository.authenticatePassword = originals.authenticatePassword
    authRepository.findById = originals.findById
    authRepository.findByEmail = originals.findByEmail
    authRepository.createSession = originals.createSession
    authRepository.findSessionById = originals.findSessionById
    authRepository.revokeUserSessions = originals.revokeUserSessions
    authRepository.updatePasswordAndVerifyEmail = originals.updatePasswordAndVerifyEmail
    courseService.validateSelectedCourseIds = originals.validateSelectedCourseIds
    courseService.getCourseForPaidOrder = originals.getCourseForPaidOrder
    courseService.getEnrolledCourses = originals.getEnrolledCourses
    paymentOrderRepository.findVerifiedStudentByEmail = originals.findVerifiedStudentByEmail
    paymentOrderRepository.findPublishedCourse = originals.findPublishedCourse
    paymentOrderRepository.findStudentSummary = originals.findStudentSummary
    paymentOrderRepository.hasActiveEnrollment = originals.hasActiveEnrollment
    paymentOrderRepository.createOrReusePendingOrder = originals.createOrReusePendingOrder
    paymentOrderRepository.findOrderById = originals.findOrderById
    paymentOrderRepository.findOrderByTransferContent = originals.findOrderByTransferContent
    paymentOrderRepository.findCourseTitle = originals.findCourseTitle
    paymentOrderRepository.confirmVerifiedPayment = originals.confirmVerifiedPayment
    paymentOrderRepository.markOrderExpired = originals.markOrderExpired
    paymentConfirmationEmailService.releaseAfterEnrollmentAndSend = originals.releaseAfterEnrollmentAndSend
    usersService.authenticatePassword = originals.adminAuthenticatePassword
    usersService.findById = originals.adminFindById
    ;(authService as unknown as { sendVerificationEmail: unknown }).sendVerificationEmail = originals.sendVerificationEmail

    server.close()
    await once(server, 'close')
  })

  it('completes real register -> OTP verify -> guest order -> SePay webhook activation -> post-payment login', async () => {
    const email = 'workflow.student@example.test'
    const password = 'StrongStudentPassword123!'

    // Phase 1.1 & 1.2: Register creates student with is_verified=false, status=pending and no tokens
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Nguyen Workflow',
        dateOfBirth: '2001-05-10',
        email,
        phoneNumber: '0912345678',
        password,
        confirmPassword: password,
        selectedCourseIds: [COURSE_ID],
      }),
    })
    assert.equal(registerRes.status, 202)
    assert.equal(registerRes.headers.get('set-cookie'), null)
    const student = findStoredUserByEmail(email)
    assert.ok(student)
    assert.equal(student.role, 'STUDENT')
    assert.equal(student.is_verified, false)
    assert.equal(student.status, 'pending')

    // Login rule: is_verified=false is forbidden (401)
    const unverifiedLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    assert.equal(unverifiedLoginRes.status, 401)

    // Unverified student cannot create guest order (DB check, no sessionStorage trust)
    const preOtpOrderRes = await fetch(`${baseUrl}/api/payment/orders/guest`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: COURSE_ID, email }),
    })
    assert.equal(preOtpOrderRes.status, 403)

    // Phase 1.3: Request OTP works for pending unverified student
    const resendRes = await fetch(`${baseUrl}/api/auth/register/verification/resend`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    assert.equal(resendRes.status, 202)
    const otpEmail = sentEmails.find((item) => item.to === email)
    assert.ok(otpEmail)
    const otpMatch = otpEmail.html.match(/\b(\d{6})\b/)
    assert.ok(otpMatch?.[1])
    const otpCode = otpMatch[1]

    // Invalid OTP stays rejected and does not verify or issue tokens
    const badOtpRes = await fetch(`${baseUrl}/api/auth/register/verification/verify`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: '000000' === otpCode ? '111111' : '000000' }),
    })
    assert.equal(badOtpRes.status, 400)
    assert.equal(badOtpRes.headers.get('set-cookie'), null)
    assert.equal(student.is_verified, false)

    // Phase 1.4: Valid OTP sets is_verified=true while keeping status=pending and NO auth session/tokens
    const verifyRes = await fetch(`${baseUrl}/api/auth/register/verification/verify`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: otpCode }),
    })
    assert.equal(verifyRes.status, 200)
    assert.equal(verifyRes.headers.get('set-cookie'), null)
    const verifyBody = (await verifyRes.json()) as { success: boolean; data: Record<string, unknown> }
    assert.equal(verifyBody.success, true)
    assert.deepEqual(verifyBody.data, { verified: true })
    assert.equal('accessToken' in verifyBody.data, false)
    assert.equal(student.is_verified, true)
    assert.equal(student.status, 'pending')

    // Login rule: verified but status=pending student is still forbidden (403) before payment
    const unpaidLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    assert.equal(unpaidLoginRes.status, 403)

    // Unpaid student cannot access enrolled courses endpoint without a valid session token
    const unpaidCoursesRes = await fetch(`${baseUrl}/api/courses/my-courses`)
    assert.equal(unpaidCoursesRes.status, 401)

    // Non-STUDENT profile cannot abuse guest checkout even if verified
    const teacherProfile: StoredStudent = {
      id: randomUUID(),
      email: 'verified.teacher@example.test',
      full_name: 'Teacher Kim',
      role: 'TEACHER',
      status: 'pending',
      is_verified: true,
      password: 'TeacherPassword123!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    users.set(teacherProfile.id, teacherProfile)
    const nonStudentGuestOrderRes = await fetch(`${baseUrl}/api/payment/orders/guest`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: COURSE_ID, email: teacherProfile.email }),
    })
    assert.equal(nonStudentGuestOrderRes.status, 403)

    // Phase 2.1 & 2.2: Verified pending student creates real order at discounted price (75,000 VND)
    const createOrderRes = await fetch(`${baseUrl}/api/payment/orders/guest`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: COURSE_ID, email }),
    })
    assert.equal(createOrderRes.status, 201)
    const createdPayload = (await createOrderRes.json()) as {
      success: boolean
      data: {
        orderId: string
        status: string
        amount: number
        transferContent: string
        checkoutMode: string
        checkoutUrl: string | null
        checkoutFields: Record<string, string | number> | null
        course: { price: number; originalPrice: number }
      }
    }
    assert.equal(createdPayload.success, true)
    assert.equal(createdPayload.data.status, 'pending')
    assert.equal(createdPayload.data.amount, 75_000)
    assert.equal(createdPayload.data.course.price, 75_000)
    assert.equal(createdPayload.data.course.originalPrice, 100_000)
    assert.equal(createdPayload.data.checkoutMode, 'hosted')
    assert.ok(createdPayload.data.checkoutUrl)
    assert.ok(createdPayload.data.checkoutFields)
    assert.equal(createdPayload.data.checkoutFields.order_invoice_number, createdPayload.data.transferContent)
    assert.equal(orders.size, 1)

    const orderId = createdPayload.data.orderId

    // Idempotent reuse of the existing pending order for same student + course
    const repeatCreateOrderRes = await fetch(`${baseUrl}/api/payment/orders/guest`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: COURSE_ID, email }),
    })
    assert.equal(repeatCreateOrderRes.status, 201)
    const repeatPayload = (await repeatCreateOrderRes.json()) as { data: { orderId: string } }
    assert.equal(repeatPayload.data.orderId, orderId)
    assert.equal(orders.size, 1)

    // Simulated return page check still reads real pending DB status (does not activate account)
    const pendingStatusRes = await fetch(`${baseUrl}/api/payment/orders/${orderId}/public`)
    assert.equal(pendingStatusRes.status, 200)
    const pendingStatusBody = (await pendingStatusRes.json()) as { data: { status: string; courseId: string } }
    assert.equal(pendingStatusBody.data.status, 'pending')
    assert.equal(pendingStatusBody.data.courseId, COURSE_ID)
    assert.equal(enrollments.length, 0)
    assert.equal(student.status, 'pending')

    // Phase 2.4: Reject unauthorized & declined/pending webhooks without mutating DB state
    const validWebhookPayload = {
      type: 'ORDER_PAID',
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: 'ORDER_PAID',
      order: {
        id: randomUUID(),
        order_id: 'sepay-gw-order-1',
        order_status: 'CAPTURED',
        order_currency: 'VND',
        order_amount: '75000',
        order_invoice_number: createdPayload.data.transferContent,
      },
      transaction: {
        id: 'tx-uuid-1',
        payment_method: 'BANK_TRANSFER',
        transaction_id: 'sepay-tx-9001',
        transaction_type: 'PAYMENT',
        transaction_date: new Date().toISOString(),
        transaction_status: 'APPROVED',
        transaction_amount: '75000',
        transaction_currency: 'VND',
      },
      customer: { id: 'cust-1', customer_id: student.id },
    }

    const unauthWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': 'wrong-secret' },
      body: JSON.stringify(validWebhookPayload),
    })
    assert.equal(unauthWebhookRes.status, 401)
    assert.equal(student.status, 'pending')
    assert.equal(enrollments.length, 0)

    const failedWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': env.sepayIpnSecretKey },
      body: JSON.stringify({
        ...validWebhookPayload,
        transaction: { ...validWebhookPayload.transaction, transaction_status: 'DECLINED' },
      }),
    })
    assert.equal(failedWebhookRes.status, 422)
    assert.equal(orders.get(orderId)?.status, 'pending')
    assert.equal(student.status, 'pending')
    assert.equal(enrollments.length, 0)

    // Phase 2.5: Verified SePay IPN marks order paid, keeps is_verified=true, updates status=active, creates enrollment
    const paidWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': env.sepayIpnSecretKey },
      body: JSON.stringify(validWebhookPayload),
    })
    assert.equal(paidWebhookRes.status, 200)
    const paidWebhookBody = (await paidWebhookRes.json()) as {
      success: boolean
      data: { orderId: string; status: string; isNewlyPaid: boolean }
    }
    assert.equal(paidWebhookBody.success, true)
    assert.equal(paidWebhookBody.data.status, 'paid')
    assert.equal(paidWebhookBody.data.isNewlyPaid, true)
    assert.equal(orders.get(orderId)?.status, 'paid')
    assert.equal(student.is_verified, true)
    assert.equal(student.status, 'active')
    assert.equal(enrollments.length, 1)
    assert.equal(enrollments[0]?.student_id, student.id)
    assert.equal(enrollments[0]?.course_id, COURSE_ID)
    assert.equal(enrollments[0]?.status, 'active')
    assert.equal(confirmationEmailCalls, 1)

    // Duplicate webhook replay stays idempotent
    const replayWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': env.sepayIpnSecretKey },
      body: JSON.stringify(validWebhookPayload),
    })
    assert.equal(replayWebhookRes.status, 200)
    const replayBody = (await replayWebhookRes.json()) as { data: { isNewlyPaid: boolean } }
    assert.equal(replayBody.data.isNewlyPaid, false)
    assert.equal(enrollments.length, 1)

    // Conflicting transaction ID against already-paid order fails without creating duplicate enrollment
    const conflictWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret-Key': env.sepayIpnSecretKey },
      body: JSON.stringify({
        ...validWebhookPayload,
        transaction: { ...validWebhookPayload.transaction, transaction_id: 'sepay-tx-different' },
      }),
    })
    assert.notEqual(conflictWebhookRes.status, 200)
    assert.equal(enrollments.length, 1)

    // Phase 2.6: Public order status endpoint returns real paid state & course details
    const publicPaidRes = await fetch(`${baseUrl}/api/payment/orders/${orderId}/public`)
    assert.equal(publicPaidRes.status, 200)
    const publicPaidBody = (await publicPaidRes.json()) as {
      data: { status: string; courseId: string; courseDetails: { slug: string } | null }
    }
    assert.equal(publicPaidBody.data.status, 'paid')
    assert.equal(publicPaidBody.data.courseId, COURSE_ID)
    assert.equal(publicPaidBody.data.courseDetails?.slug, COURSE_CATALOG_ENTRY.slug)

    // Post-payment login now succeeds with accessToken + refresh cookie
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    assert.equal(loginRes.status, 200)
    const loginBody = (await loginRes.json()) as {
      success: boolean
      data: {
        accessToken: string
        user: { email: string; status: string; is_verified: boolean; role: string }
      }
    }
    assert.equal(loginBody.success, true)
    assert.ok(loginBody.data.accessToken)
    assert.equal(loginBody.data.user.status, 'active')
    assert.equal(loginBody.data.user.is_verified, true)
    assert.equal(loginBody.data.user.role, 'STUDENT')
    assert.ok(loginRes.headers.get('set-cookie')?.includes(`${refreshCookieName}=`))

    // Authenticated order check confirms enrollmentExists === true
    const authOrderRes = await fetch(`${baseUrl}/api/payment/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    })
    assert.equal(authOrderRes.status, 200)
    const authOrderBody = (await authOrderRes.json()) as {
      data: { status: string; enrollmentExists: boolean }
    }
    assert.equal(authOrderBody.data.status, 'paid')
    assert.equal(authOrderBody.data.enrollmentExists, true)

    // Paid student can access enrolled courses endpoint and sees the purchased course
    const myCoursesRes = await fetch(`${baseUrl}/api/courses/my-courses`, {
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    })
    assert.equal(myCoursesRes.status, 200)
    const myCoursesBody = (await myCoursesRes.json()) as {
      success: boolean
      data: Array<{ course_id: string; slug: string }>
    }
    assert.equal(myCoursesBody.success, true)
    assert.equal(myCoursesBody.data.length, 1)
    assert.equal(myCoursesBody.data[0]?.course_id, COURSE_ID)
    assert.equal(myCoursesBody.data[0]?.slug, COURSE_CATALOG_ENTRY.slug)

    // Authenticated re-purchase of already enrolled course is rejected with 409 Conflict
    const duplicatePurchaseRes = await fetch(`${baseUrl}/api/payment/orders`, {
      method: 'POST',
      headers: {
        Origin: frontendOrigin,
        Authorization: `Bearer ${loginBody.data.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courseId: COURSE_ID }),
    })
    assert.equal(duplicatePurchaseRes.status, 409)

    // Preserve TEACHER and ADMIN authentication rules
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacherProfile.email, password: 'TeacherPassword123!' }),
    })
    assert.equal(teacherLoginRes.status, 200)

    const adminProfile: StoredStudent = {
      id: randomUUID(),
      email: 'admin.workflow@example.test',
      full_name: 'Platform Admin',
      role: 'ADMIN',
      status: 'active',
      is_verified: true,
      password: 'AdminPassword123!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    users.set(adminProfile.id, adminProfile)
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminProfile.email, password: 'AdminPassword123!' }),
    })
    assert.equal(adminLoginRes.status, 200)
  })

  it('activates a pending student through the signed direct_qr SePay bank webhook', async () => {
    const previousMode = env.sepayCheckoutMode
    Object.assign(env, { sepayCheckoutMode: 'direct_qr' })

    try {
      const student: StoredStudent = {
        id: randomUUID(),
        email: 'directqr.student@example.test',
        full_name: 'Direct QR Student',
        role: 'STUDENT',
        status: 'pending',
        is_verified: true,
        password: 'DirectQrPassword123!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      users.set(student.id, student)

      const guestOrderRes = await fetch(`${baseUrl}/api/payment/orders/guest`, {
        method: 'POST',
        headers: { Origin: frontendOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: COURSE_ID, email: student.email }),
      })
      assert.equal(guestOrderRes.status, 201)
      const guestOrderBody = (await guestOrderRes.json()) as {
        data: {
          orderId: string
          transferContent: string
          amount: number
          checkoutMode: string
          paymentInformation: { qrCodeUrl: string; transferContent: string } | null
        }
      }
      assert.equal(guestOrderBody.data.checkoutMode, 'direct_qr')
      assert.ok(guestOrderBody.data.paymentInformation?.qrCodeUrl)

      const rawPayload = JSON.stringify({
        id: 888999,
        gateway: 'Vietcombank',
        transactionDate: new Date().toISOString(),
        accountNumber: env.sepayAccountNumber,
        content: guestOrderBody.data.transferContent,
        transferType: 'in',
        transferAmount: guestOrderBody.data.amount,
        referenceCode: 'VCB-REF-888999',
      })
      const timestamp = String(Math.floor(Date.now() / 1000))
      const signature = `sha256=${createHmac('sha256', env.sepayBankWebhookSecret)
        .update(`${timestamp}.`)
        .update(Buffer.from(rawPayload, 'utf8'))
        .digest('hex')}`

      const bankWebhookRes = await fetch(`${baseUrl}/api/payment/sepay-bank-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SePay-Timestamp': timestamp,
          'X-SePay-Signature': signature,
        },
        body: rawPayload,
      })
      assert.equal(bankWebhookRes.status, 200)
      assert.equal(student.status, 'active')
      assert.equal(orders.get(guestOrderBody.data.orderId)?.status, 'paid')
    } finally {
      Object.assign(env, { sepayCheckoutMode: previousMode })
    }
  })
})
