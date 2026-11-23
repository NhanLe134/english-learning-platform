import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { PaymentWebhookError } from './payments.errors.js'
import { PaymentController } from './payments.controller.js'
import { paymentService } from './payments.service.js'

describe('SePay IPN authentication', () => {
  it('returns 401 when the X-Secret-Key header does not match the configured IPN secret', async () => {
    const previousSecret = env.sepayIpnSecretKey
    Object.assign(env, { sepayIpnSecretKey: 'test-ipn-secret' })

    let statusCode = 0
    let responseBody: unknown
    const response = {
      status(code: number) {
        statusCode = code
        return this
      },
      json(body: unknown) {
        responseBody = body
        return this
      },
    }
    const request = {
      header: () => 'wrong-secret',
    }

    try {
      await new PaymentController().sepayWebhook(
        request as unknown as Request,
        response as unknown as Response,
        (() => undefined) as NextFunction,
      )
    } finally {
      Object.assign(env, { sepayIpnSecretKey: previousSecret })
    }

    assert.equal(statusCode, 401)
    assert.deepEqual(responseBody, { success: false, message: 'Invalid IPN secret key.' })
  })

  it('rejects unauthenticated direct-bank webhook payloads before processing them', async () => {
    const previousSecret = env.sepayBankWebhookSecret
    const previousMode = env.sepayCheckoutMode
    Object.assign(env, { sepayBankWebhookSecret: 'test-bank-webhook-secret', sepayCheckoutMode: 'direct_qr' })
    let statusCode = 0
    let responseBody: unknown
    const response = {
      status(code: number) { statusCode = code; return this },
      json(body: unknown) { responseBody = body; return this },
    }
    const request = {
      rawBody: Buffer.from('{"id":1}'),
      body: { id: 1 },
      header: (name: string) => name === 'X-SePay-Timestamp' ? String(Math.floor(Date.now() / 1000)) : 'sha256=invalid',
      is: () => 'application/json',
    }
    try {
      await new PaymentController().sepayBankWebhook(
        request as unknown as Request,
        response as unknown as Response,
      )
    } finally {
      Object.assign(env, { sepayBankWebhookSecret: previousSecret, sepayCheckoutMode: previousMode })
    }
    assert.equal(statusCode, 401)
    assert.deepEqual(responseBody, { success: false, message: 'Invalid SePay webhook authentication.' })
  })

  it('returns 401 when the X-Secret-Key header is missing or has a different byte length', async () => {
    const previousSecret = env.sepayIpnSecretKey
    Object.assign(env, { sepayIpnSecretKey: 'test-ipn-secret' })
    let statusCode = 0
    let responseBody: unknown
    const response = {
      status(code: number) { statusCode = code; return this },
      json(body: unknown) { responseBody = body; return this },
    }
    const request = {
      header: () => 'short',
    }
    try {
      await new PaymentController().sepayWebhook(
        request as unknown as Request,
        response as unknown as Response,
        (() => undefined) as NextFunction,
      )
    } finally {
      Object.assign(env, { sepayIpnSecretKey: previousSecret })
    }
    assert.equal(statusCode, 401)
    assert.deepEqual(responseBody, { success: false, message: 'Invalid IPN secret key.' })
  })

  it('maps PaymentWebhookError thrown by paymentService.createOrder to HTTP JSON status without calling next', async () => {
    const originalCreateOrder = paymentService.createOrder
    paymentService.createOrder = async () => {
      throw new PaymentWebhookError('You are already enrolled in this course.', 409)
    }

    let statusCode = 0
    let responseBody: unknown
    let nextCalled = false
    const response = {
      locals: { authUser: { id: 'bae12d2f-0580-4669-8841-cc35cf671613' } },
      status(code: number) { statusCode = code; return this },
      json(body: unknown) { responseBody = body; return this },
    }
    const request = {
      body: { courseId: '2f0e53db-e138-4dd1-9314-b0045631cb36' },
    }

    try {
      await new PaymentController().createOrder(
        request as unknown as Request,
        response as unknown as Response,
        (() => { nextCalled = true }) as NextFunction,
      )
    } finally {
      paymentService.createOrder = originalCreateOrder
    }

    assert.equal(nextCalled, false)
    assert.equal(statusCode, 409)
    assert.deepEqual(responseBody, {
      success: false,
      message: 'You are already enrolled in this course.',
    })
  })

  it('includes paymentInformation in getOrder and getPublicOrderStatus for pending orders and null for paid orders', async () => {
    const orderId = 'e2c195be-c721-47eb-b323-99ab24e52d85'
    const studentId = 'bae12d2f-0580-4669-8841-cc35cf671613'
    const courseId = '2f0e53db-e138-4dd1-9314-b0045631cb36'
    const originalEnv = {
      mode: env.sepayCheckoutMode,
      bankCode: env.sepayBankCode,
      bankName: env.sepayBankName,
      accountNumber: env.sepayAccountNumber,
      accountName: env.sepayAccountName,
    }
    const originals = {
      getOrder: paymentService.getOrder,
      getCourseTitle: paymentService.getCourseTitle,
      getCourseDetails: paymentService.getCourseDetails,
      hasActiveEnrollment: paymentService.hasActiveEnrollment,
    }

    let currentStatus: 'pending' | 'paid' = 'pending'
    Object.assign(env, {
      sepayCheckoutMode: 'hosted',
      sepayBankCode: 'VCB',
      sepayBankName: 'Vietcombank',
      sepayAccountNumber: '0123456789',
      sepayAccountName: 'YOUR VOICE ENGLISH',
    })
    paymentService.getOrder = async () => ({
      id: orderId,
      student_id: studentId,
      course_id: courseId,
      amount: 75000,
      currency: 'VND',
      status: currentStatus,
      transfer_content: `DH${orderId}`,
      provider: 'sepay',
      provider_order_id: null,
      provider_transaction_id: null,
      paid_at: currentStatus === 'paid' ? new Date().toISOString() : null,
      expired_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    paymentService.getCourseTitle = async () => 'Test Course'
    paymentService.getCourseDetails = async () => null
    paymentService.hasActiveEnrollment = async () => false

    const makeResponse = (locals?: Record<string, unknown>) => {
      let statusCode = 0
      let body: { success?: boolean; data?: Record<string, unknown> } = {}
      return {
        locals: locals ?? {},
        setHeader() {},
        status(code: number) { statusCode = code; return this },
        json(payload: unknown) { body = payload as typeof body; return this },
        getResult: () => ({ statusCode, body }),
      }
    }

    try {
      const controller = new PaymentController()
      const authPendingRes = makeResponse({ authUser: { id: studentId } })
      await controller.getOrder(
        { params: { orderId } } as unknown as Request,
        authPendingRes as unknown as Response,
        (() => undefined) as NextFunction,
      )
      assert.equal(authPendingRes.getResult().statusCode, 200)
      assert.equal(authPendingRes.getResult().body.data?.status, 'pending')
      const authPaymentInfo = authPendingRes.getResult().body.data?.paymentInformation as Record<string, unknown> | null
      assert.ok(authPaymentInfo)
      assert.equal(authPaymentInfo.transferContent, `DH${orderId}`)
      assert.equal(authPaymentInfo.amount, 75000)

      const publicPendingRes = makeResponse()
      await controller.getPublicOrderStatus(
        { params: { orderId } } as unknown as Request,
        publicPendingRes as unknown as Response,
        (() => undefined) as NextFunction,
      )
      assert.equal(publicPendingRes.getResult().statusCode, 200)
      const publicPaymentInfo = publicPendingRes.getResult().body.data?.paymentInformation as Record<string, unknown> | null
      assert.ok(publicPaymentInfo)
      assert.equal(publicPaymentInfo.accountNumber, '0123456789')

      currentStatus = 'paid'
      const publicPaidRes = makeResponse()
      await controller.getPublicOrderStatus(
        { params: { orderId } } as unknown as Request,
        publicPaidRes as unknown as Response,
        (() => undefined) as NextFunction,
      )
      assert.equal(publicPaidRes.getResult().statusCode, 200)
      assert.equal(publicPaidRes.getResult().body.data?.status, 'paid')
      assert.equal(publicPaidRes.getResult().body.data?.paymentInformation, null)
    } finally {
      Object.assign(env, {
        sepayCheckoutMode: originalEnv.mode,
        sepayBankCode: originalEnv.bankCode,
        sepayBankName: originalEnv.bankName,
        sepayAccountNumber: originalEnv.accountNumber,
        sepayAccountName: originalEnv.accountName,
      })
      paymentService.getOrder = originals.getOrder
      paymentService.getCourseTitle = originals.getCourseTitle
      paymentService.getCourseDetails = originals.getCourseDetails
      paymentService.hasActiveEnrollment = originals.hasActiveEnrollment
    }
  })
})
