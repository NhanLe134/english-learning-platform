import { env } from '../../config/env.js'
import { createResendClient } from '../../config/resend.js'
import {
  paymentConfirmationEmailRepository,
  type PaymentConfirmationEmailJob,
  type PaymentConfirmationEmailRepository,
} from './payment-confirmation-email.repository.js'
import { renderPaymentConfirmationEmail } from './payment-confirmation-email.js'

interface EmailSendResult {
  accepted: boolean
  failureMessage?: string
}

type PaymentConfirmationEmailSender = (
  job: PaymentConfirmationEmailJob,
  idempotencyKey: string,
) => Promise<EmailSendResult>

async function sendWithResend(
  job: PaymentConfirmationEmailJob,
  idempotencyKey: string,
): Promise<EmailSendResult> {
  if (!env.resendApiKey || !env.emailFrom || !job.email) {
    return { accepted: false, failureMessage: 'RESEND_API_KEY, EMAIL_FROM, or the registered student email is missing.' }
  }

  const coursePath = job.courseSlug
    ? `/courses/${encodeURIComponent(job.courseSlug)}`
    : '/courses'
  const courseUrl = new URL(coursePath, env.frontendUrl).toString()
  const email = renderPaymentConfirmationEmail(job, courseUrl)
  const { error } = await createResendClient().emails.send({
    from: env.emailFrom,
    to: job.email,
    subject: email.subject,
    html: email.html,
  }, { idempotencyKey })
  return error
    ? { accepted: false, failureMessage: `Resend rejected the email (${error.name}, HTTP ${error.statusCode ?? 'unknown'}).` }
    : { accepted: true }
}

export class PaymentConfirmationEmailService {
  private processingDueJobs = false

  constructor(
    private readonly repository: PaymentConfirmationEmailRepository = paymentConfirmationEmailRepository,
    private readonly sender: PaymentConfirmationEmailSender = sendWithResend,
  ) {}

  async releaseAfterEnrollmentAndSend(orderId: string): Promise<void> {
    await this.repository.releaseAfterEnrollment(orderId)
    await this.sendOne(orderId)
  }

  async processDueJobs(): Promise<void> {
    if (this.processingDueJobs) return
    this.processingDueJobs = true
    try {
      await this.repository.recoverStaleJobs()
      const orderIds = await this.repository.findDueOrderIds()
      for (const orderId of orderIds) await this.sendOne(orderId)
    } catch (error) {
      console.error('[PaymentEmail] Retry worker failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      })
    } finally {
      this.processingDueJobs = false
    }
  }

  private async sendOne(orderId: string): Promise<void> {
    let job: PaymentConfirmationEmailJob | null
    try {
      job = await this.repository.claim(orderId)
    } catch (error) {
      console.error('[PaymentEmail] Unable to claim email job', {
        orderId,
        name: error instanceof Error ? error.name : 'UnknownError',
      })
      return
    }
    if (!job) return

    const idempotencyKey = `payment-confirmation/${job.orderId}`
    if (!job.email) {
      await this.recordKnownFailure(job, 'The registered account has no email address.')
      return
    }

    let result: EmailSendResult
    try {
      result = await this.sender(job, idempotencyKey)
    } catch (error) {
      // A transport error can happen after Resend accepted the message. Keep the
      // job locked so recovery retries with the same provider idempotency key.
      try {
        await this.repository.recordUncertainFailure(job.orderId, job.attempt_count)
      } catch (recordError) {
        console.error('[PaymentEmail] Could not record uncertain delivery result', {
          orderId: job.orderId,
          name: recordError instanceof Error ? recordError.name : 'UnknownError',
        })
      }
      console.warn('[PaymentEmail] Delivery result is uncertain', {
        orderId: job.orderId,
        name: error instanceof Error ? error.name : 'UnknownError',
      })
      return
    }

    if (!result.accepted) {
      await this.recordKnownFailure(job, result.failureMessage ?? 'Resend did not accept the confirmation email.')
      return
    }

    try {
      await this.repository.markSent(job.orderId, job.attempt_count)
    } catch (error) {
      // The provider has accepted the email. If recording success fails, stale
      // job recovery will retry only with the same idempotency key.
      console.error('[PaymentEmail] Resend accepted email but delivery state could not be saved', {
        orderId: job.orderId,
        name: error instanceof Error ? error.name : 'UnknownError',
      })
    }
  }

  private async recordKnownFailure(job: PaymentConfirmationEmailJob, message: string): Promise<void> {
    try {
      await this.repository.markFailed(job.orderId, job.attempt_count, message)
    } catch (error) {
      console.error('[PaymentEmail] Could not record delivery failure', {
        orderId: job.orderId,
        name: error instanceof Error ? error.name : 'UnknownError',
      })
    }
    console.warn('[PaymentEmail] Confirmation email was not accepted', { orderId: job.orderId })
  }
}

export const paymentConfirmationEmailService = new PaymentConfirmationEmailService()
