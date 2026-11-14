import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PaymentConfirmationEmailService,
} from './payment-confirmation-email.service.js'
import type { PaymentConfirmationEmailJob } from './payment-confirmation-email.repository.js'
import { renderPaymentConfirmationEmail } from './payment-confirmation-email.js'
import { PaymentService } from './payments.service.js'
import type { PaymentOrder, SePayWebhookEvent } from './payments.types.js'

function makeJob(): PaymentConfirmationEmailJob {
  return {
    orderId: 'order-1',
    email: 'student@example.com',
    customerName: 'Nguyễn An',
    phoneNumber: '0900000000',
    dateOfBirth: '2000-03-12',
    courseTitle: 'IELTS Foundation',
    courseSlug: 'ielts-foundation',
    courseDescription: 'Build core English skills.',
    courseLevel: 'beginner',
    courseLessonCount: 12,
    courseCount: 1,
    amount: 3000,
    currency: 'VND',
    paymentMethod: 'BANK_TRANSFER',
    paidAt: '2026-11-10T09:00:00.000Z',
    status: 'pending',
    attempt_count: 0,
    first_attempt_at: null,
    locked_at: null,
    next_attempt_at: new Date(0).toISOString(),
    last_error: null,
  }
}

function makeRepository() {
  let status: PaymentConfirmationEmailJob['status'] = 'waiting_for_enrollment'
  let attemptCount = 0
  const job = makeJob()
  const repository = {
    releaseAfterEnrollment: async () => {
      if (status === 'waiting_for_enrollment') status = 'pending'
      return status === 'pending'
    },
    claim: async () => {
      if (!['pending', 'failed'].includes(status)) return null
      status = 'sending'
      attemptCount += 1
      return { ...job, status, attempt_count: attemptCount }
    },
    markSent: async () => { status = 'sent' },
    markFailed: async () => { status = 'failed' },
    recordUncertainFailure: async () => undefined,
    recoverStaleJobs: async () => undefined,
    findDueOrderIds: async () => ['pending', 'failed'].includes(status) ? [job.orderId] : [],
  }
  return { repository, getStatus: () => status, getAttempts: () => attemptCount }
}

describe('payment confirmation email', () => {
  it('sends once per order even when duplicate IPNs enqueue the same email', async () => {
    const test = makeRepository()
    const keys: string[] = []
    const service = new PaymentConfirmationEmailService(test.repository as never, async (_job, key) => {
      keys.push(key)
      return { accepted: true }
    })

    await service.releaseAfterEnrollmentAndSend('order-1')
    await service.releaseAfterEnrollmentAndSend('order-1')

    assert.equal(test.getStatus(), 'sent')
    assert.equal(test.getAttempts(), 1)
    assert.deepEqual(keys, ['payment-confirmation/order-1'])
  })

  it('records provider failures and retries the pending email job', async () => {
    const test = makeRepository()
    let sendAttempts = 0
    const idempotencyKeys: string[] = []
    const service = new PaymentConfirmationEmailService(test.repository as never, async (_job, key) => {
      sendAttempts += 1
      idempotencyKeys.push(key)
      return { accepted: sendAttempts > 1 }
    })

    await service.releaseAfterEnrollmentAndSend('order-1')
    assert.equal(test.getStatus(), 'failed')

    await service.processDueJobs()
    assert.equal(test.getStatus(), 'sent')
    assert.equal(sendAttempts, 2)
    assert.deepEqual(idempotencyKeys, ['payment-confirmation/order-1', 'payment-confirmation/order-1'])
  })

  it('records uncertain provider failures without throwing into payment processing', async () => {
    const test = makeRepository()
    const service = new PaymentConfirmationEmailService(test.repository as never, async () => {
      throw new Error('network unavailable')
    })

    await assert.doesNotReject(service.releaseAfterEnrollmentAndSend('order-1'))
    assert.equal(test.getStatus(), 'sending')
  })

  it('keeps a verified order paid when the email provider is unavailable', async () => {
    let order: PaymentOrder = {
      id: 'e2c195be-c721-47eb-b323-99ab24e52d85',
      student_id: 'bae12d2f-0580-4669-8841-cc35cf671613',
      course_id: '2f0e53db-e138-4dd1-9314-b0045631cb36',
      amount: 3000,
      currency: 'VND',
      status: 'pending',
      transfer_content: 'DH55af97da-8bbf-4bfd-b7e2-a9f804080de1',
      provider: 'sepay',
      provider_order_id: null,
      provider_transaction_id: null,
      paid_at: null,
      expired_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const paymentRepository = {
      findOrderByTransferContent: async () => order,
      confirmVerifiedPayment: async (_orderId: string, providerOrderId: string, transactionId: string) => {
        order = { ...order, status: 'paid', provider_order_id: providerOrderId, provider_transaction_id: transactionId, paid_at: new Date().toISOString() }
        return { order, isNewlyPaid: true }
      },
    }
    const emailRepository = makeRepository()
    const emailService = new PaymentConfirmationEmailService(emailRepository.repository as never, async () => ({ accepted: false }))
    const service = new PaymentService(paymentRepository as never, emailService)
    const event: SePayWebhookEvent = {
      type: 'ORDER_PAID',
      timestamp: Math.floor(Date.now() / 1000),
      notification_type: 'ORDER_PAID',
      order: {
        id: 'b8125a23-6a66-4f20-a379-22c4c8846df1',
        order_id: 'PAY52286AF1E9A6580DA',
        order_status: 'CAPTURED',
        order_currency: 'VND',
        order_amount: '3000.00',
        order_invoice_number: 'DH55af97da-8bbf-4bfd-b7e2-a9f804080de1',
        custom_data: [],
        user_agent: 'test',
        ip_address: '127.0.0.1',
        order_description: 'Course payment',
      },
      transaction: {
        id: 'sepay-transaction-id',
        payment_method: 'BANK_TRANSFER',
        transaction_id: 'sepay-transaction-id',
        transaction_type: 'PAYMENT',
        transaction_date: new Date().toISOString(),
        transaction_status: 'APPROVED',
        transaction_amount: '3000',
        transaction_currency: 'VND',
        authentication_status: '',
        card_number: '',
        card_holder_name: '',
        card_expiry: '',
        card_funding_method: '',
        card_brand: '',
      },
      customer: { id: '', customer_id: '' },
      raw: {},
    }

    const result = await service.handleSePayWebhook(event)

    assert.equal(result.status, 'paid')
    assert.equal(order.status, 'paid')
    assert.equal(emailRepository.getStatus(), 'failed')
  })

  it('escapes customer and course data in the HTML email', () => {
    const email = renderPaymentConfirmationEmail({
      ...makeJob(),
      customerName: '<script>alert(1)</script>',
      courseTitle: '<img src=x>',
      courseDescription: '<script>not trusted</script>',
    }, 'https://example.com/courses/course')

    assert.match(email.subject, /Xác nhận thanh toán thành công/)
    assert.doesNotMatch(email.html, /<script>/)
    assert.match(email.html, /&lt;img src=x&gt;/)
    assert.match(email.html, /1\. Thông tin đăng ký/)
    assert.match(email.html, /student@example\.com/)
    assert.match(email.html, /Ngày sinh/)
    assert.match(email.html, /Điện thoại/)
    assert.match(email.html, /2\. Thông tin khóa học/)
    assert.match(email.html, /Số khóa học[\s\S]*>1</)
    assert.match(email.html, /3\. Thông tin thanh toán/)
    assert.match(email.html, /3\.000/)
    assert.match(email.html, /Đã thanh toán/)
  })

  it('omits optional birth date and shows when telephone is unavailable', () => {
    const email = renderPaymentConfirmationEmail({
      ...makeJob(),
      dateOfBirth: null,
      phoneNumber: null,
      courseDescription: null,
      courseLevel: null,
      courseLessonCount: null,
    }, 'https://example.com/courses/course')

    assert.doesNotMatch(email.html, /Ngày sinh/)
    assert.match(email.html, /Điện thoại[\s\S]*Chưa cập nhật/)
  })
})
