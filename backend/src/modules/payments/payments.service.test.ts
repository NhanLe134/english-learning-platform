import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PaymentService } from './payments.service.js'
import type { PaymentOrder, SePayWebhookEvent } from './payments.types.js'

const ORDER_ID = 'e2c195be-c721-47eb-b323-99ab24e52d85'
const STUDENT_ID = 'bae12d2f-0580-4669-8841-cc35cf671613'
const COURSE_ID = '2f0e53db-e138-4dd1-9314-b0045631cb36'

function createOrder(status: PaymentOrder['status'] = 'pending'): PaymentOrder {
  return {
    id: ORDER_ID,
    student_id: STUDENT_ID,
    course_id: COURSE_ID,
    amount: 50000,
    currency: 'VND',
    status,
    transfer_content: `DH${ORDER_ID}`,
    provider: 'sepay',
    provider_order_id: status === 'paid' ? 'sepay-order-1' : null,
    provider_transaction_id: status === 'paid' ? 'sepay-tx-1' : null,
    paid_at: status === 'paid' ? new Date().toISOString() : null,
    expired_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function createEvent(overrides: Partial<SePayWebhookEvent> = {}): SePayWebhookEvent {
  return {
    type: 'ORDER_PAID',
    timestamp: Math.floor(Date.now() / 1000),
    notification_type: 'ORDER_PAID',
    order: {
      id: ORDER_ID,
      order_id: 'sepay-order-1',
      order_status: 'CAPTURED',
      order_currency: 'VND',
      order_amount: '50000.00',
      order_invoice_number: `DH${ORDER_ID}`,
      custom_data: [],
      user_agent: 'test',
      ip_address: '127.0.0.1',
      order_description: 'Course payment',
    },
    transaction: {
      id: 'sepay-transaction-uuid',
      payment_method: 'BANK_TRANSFER',
      transaction_id: 'sepay-tx-1',
      transaction_type: 'PAYMENT',
      transaction_date: new Date().toISOString(),
      transaction_status: 'APPROVED',
      transaction_amount: '50000',
      transaction_currency: 'VND',
      authentication_status: '',
      card_number: '',
      card_holder_name: '',
      card_expiry: '',
      card_funding_method: '',
      card_brand: '',
    },
    customer: { id: 'customer-1', customer_id: STUDENT_ID },
    raw: {},
    ...overrides,
  }
}

function setup(
  status: PaymentOrder['status'] = 'pending',
  lookup: 'found' | 'missing' | 'database-error' = 'found',
) {
  let order = createOrder(status)
  let enrollmentAttempts = 0
  const repository = {
    findOrderByTransferContent: async () => {
      if (lookup === 'database-error') throw new Error('database unavailable')
      return lookup === 'missing' ? null : order
    },
    markOrderPaid: async (_orderId: string, providerOrderId: string) => {
      if (order.status === 'paid') return { order, isNewlyPaid: false }
      order = { ...order, status: 'paid', provider_order_id: providerOrderId, provider_transaction_id: 'sepay-tx-1' }
      return { order, isNewlyPaid: true }
    },
    createEnrollment: async () => {
      enrollmentAttempts += 1
      return { created: enrollmentAttempts === 1 }
    },
  }
  return {
    service: new PaymentService(repository as never),
    getOrder: () => order,
    getEnrollmentAttempts: () => enrollmentAttempts,
  }
}

describe('SePay payment confirmation', () => {
  it('marks a valid pending order paid and creates its course enrollment', async () => {
    const test = setup()

    const result = await test.service.handleSePayWebhook(createEvent({
      order: { ...createEvent().order, id: 'e2c195be-c721-47eb-b323-99ab24e52d86' },
    }))

    assert.equal(result.status, 'paid')
    assert.equal(result.isNewlyPaid, true)
    assert.equal(test.getOrder().status, 'paid')
    assert.equal(test.getOrder().provider_order_id, 'sepay-order-1')
    assert.equal(test.getEnrollmentAttempts(), 1)
  })

  it('rejects a SePay order reference that differs from the stored reference', async () => {
    const test = setup('paid')
    await assert.rejects(
      test.service.handleSePayWebhook(createEvent({
        order: { ...createEvent().order, order_id: 'different-sepay-order' },
      })),
      /payment reference does not match/,
    )
    assert.equal(test.getEnrollmentAttempts(), 0)
  })

  it('handles duplicate IPN delivery without duplicating enrollment', async () => {
    const test = setup()
    await test.service.handleSePayWebhook(createEvent())

    const result = await test.service.handleSePayWebhook(createEvent())

    assert.equal(result.status, 'paid')
    assert.equal(result.isNewlyPaid, false)
    assert.equal(test.getEnrollmentAttempts(), 2)
  })

  it('keeps an already-paid order paid and retries idempotent enrollment', async () => {
    const test = setup('paid')

    const result = await test.service.handleSePayWebhook(createEvent())

    assert.equal(result.status, 'paid')
    assert.equal(result.isNewlyPaid, false)
    assert.equal(test.getEnrollmentAttempts(), 1)
  })

  it('rejects an unknown payment reference', async () => {
    const test = setup('pending', 'missing')
    await assert.rejects(test.service.handleSePayWebhook(createEvent()), /Course order not found/)
    assert.equal(test.getEnrollmentAttempts(), 0)
  })

  it('propagates database failures so the webhook responds with a retryable server error', async () => {
    const test = setup('pending', 'database-error')
    await assert.rejects(test.service.handleSePayWebhook(createEvent()), /database unavailable/)
    assert.equal(test.getEnrollmentAttempts(), 0)
  })

  for (const status of ['expired', 'failed', 'cancelled'] as const) {
    it(`rejects payment for a ${status} order`, async () => {
      const test = setup(status)
      await assert.rejects(test.service.handleSePayWebhook(createEvent()), /no longer payable/)
      assert.equal(test.getOrder().status, status)
      assert.equal(test.getEnrollmentAttempts(), 0)
    })
  }

  it('rejects mismatched amounts, currencies, and unapproved state', async () => {
    const amountTest = setup()
    const amountEvent = createEvent({
      transaction: { ...createEvent().transaction, transaction_amount: '49999' },
    })
    await assert.rejects(amountTest.service.handleSePayWebhook(amountEvent), /Amount mismatch/)

    const currencyTest = setup()
    const currencyEvent = createEvent({
      transaction: { ...createEvent().transaction, transaction_currency: 'USD' },
    })
    await assert.rejects(currencyTest.service.handleSePayWebhook(currencyEvent), /Unsupported payment currency/)

    const orderCurrencyTest = setup()
    Object.assign(orderCurrencyTest.getOrder(), { currency: 'USD' })
    await assert.rejects(orderCurrencyTest.service.handleSePayWebhook(createEvent()), /Unsupported payment currency/)

    const stateTest = setup()
    const stateEvent = createEvent({
      transaction: { ...createEvent().transaction, transaction_status: 'DECLINED' },
    })
    await assert.rejects(stateTest.service.handleSePayWebhook(stateEvent), /approved payment/)
  })
})
