import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { PaymentController } from './payments.controller.js'

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
})
