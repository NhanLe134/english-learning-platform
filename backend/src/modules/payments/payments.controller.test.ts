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
})
