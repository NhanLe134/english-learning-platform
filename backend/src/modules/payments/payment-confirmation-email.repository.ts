import { createSupabaseClient } from '../../config/supabase.js'
import type { PaymentConfirmationEmailData } from './payment-confirmation-email.js'

export interface PaymentConfirmationEmailJob extends PaymentConfirmationEmailData {
  status: 'waiting_for_enrollment' | 'pending' | 'sending' | 'sent' | 'failed' | 'needs_review'
  attempt_count: number
  first_attempt_at: string | null
  locked_at: string | null
  next_attempt_at: string
  last_error: string | null
}

const OUTBOX_COLUMNS =
  'order_id,email_to,customer_name,phone_number,date_of_birth,course_title,course_slug,course_description,course_level,course_lesson_count,course_count,amount,currency,payment_method,paid_at,status,attempt_count,first_attempt_at,locked_at,next_attempt_at,last_error'

function mapJob(row: Record<string, unknown>): PaymentConfirmationEmailJob {
  return {
    orderId: String(row.order_id),
    email: String(row.email_to ?? ''),
    customerName: String(row.customer_name ?? ''),
    phoneNumber: typeof row.phone_number === 'string' ? row.phone_number : null,
    dateOfBirth: typeof row.date_of_birth === 'string' ? row.date_of_birth : null,
    courseTitle: String(row.course_title ?? ''),
    courseSlug: typeof row.course_slug === 'string' ? row.course_slug : null,
    courseDescription: typeof row.course_description === 'string' ? row.course_description : null,
    courseLevel: typeof row.course_level === 'string' ? row.course_level : null,
    courseLessonCount: typeof row.course_lesson_count === 'number' ? row.course_lesson_count : null,
    courseCount: Number(row.course_count ?? 1),
    amount: Number(row.amount),
    currency: String(row.currency),
    paymentMethod: String(row.payment_method),
    paidAt: String(row.paid_at),
    status: String(row.status) as PaymentConfirmationEmailJob['status'],
    attempt_count: Number(row.attempt_count),
    first_attempt_at: typeof row.first_attempt_at === 'string' ? row.first_attempt_at : null,
    locked_at: typeof row.locked_at === 'string' ? row.locked_at : null,
    next_attempt_at: String(row.next_attempt_at),
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
  }
}

export class PaymentConfirmationEmailRepository {
  async releaseAfterEnrollment(orderId: string): Promise<boolean> {
    const now = new Date().toISOString()
    const { data, error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .update({ status: 'pending', next_attempt_at: now })
      .eq('order_id', orderId)
      .eq('status', 'waiting_for_enrollment')
      .select('order_id')
      .maybeSingle()
    if (error) throw new Error(`Unable to release payment email after enrollment: ${error.message}`, { cause: error })
    return data !== null
  }

  async findDueOrderIds(limit = 20): Promise<string[]> {
    const { data, error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .select('order_id')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(limit)

    if (error) throw new Error(`Unable to list payment emails: ${error.message}`, { cause: error })
    return (data ?? []).map((row) => String(row.order_id))
  }

  async recoverStaleJobs(): Promise<void> {
    const now = Date.now()
    const staleCutoff = new Date(now - 10 * 60 * 1000).toISOString()
    const { data, error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .select('order_id,first_attempt_at,attempt_count')
      .eq('status', 'sending')
      .lt('locked_at', staleCutoff)
      .limit(100)

    if (error) throw new Error(`Unable to recover interrupted payment emails: ${error.message}`, { cause: error })
    for (const row of data ?? []) {
      const firstAttemptAt = typeof row.first_attempt_at === 'string' ? row.first_attempt_at : ''
      const outsideProviderIdempotencyWindow = !firstAttemptAt || now - Date.parse(firstAttemptAt) >= 23 * 60 * 60 * 1000
      const outOfRetries = Number(row.attempt_count) >= 8
      const update = outsideProviderIdempotencyWindow || outOfRetries
        ? {
            status: 'needs_review',
            locked_at: null,
            last_error: 'Email delivery outcome is uncertain after the provider retry window; verify delivery before retrying.',
          }
        : {
            status: 'failed',
            locked_at: null,
            next_attempt_at: new Date(now).toISOString(),
            last_error: 'An interrupted email attempt will be retried with the same provider idempotency key.',
          }
      const { error: updateError } = await createSupabaseClient()
        .from('payment_confirmation_email_outbox')
        .update(update)
        .eq('order_id', row.order_id)
        .eq('status', 'sending')
        .eq('attempt_count', row.attempt_count)
      if (updateError) throw new Error(`Unable to recover payment email: ${updateError.message}`, { cause: updateError })
    }
  }

  async claim(orderId: string): Promise<PaymentConfirmationEmailJob | null> {
    const client = createSupabaseClient()
    const { data: current, error: readError } = await client
      .from('payment_confirmation_email_outbox')
      .select('status,attempt_count,first_attempt_at,next_attempt_at')
      .eq('order_id', orderId)
      .maybeSingle()
    if (readError) throw new Error(`Unable to read payment email job: ${readError.message}`, { cause: readError })
    if (!current || !['pending', 'failed'].includes(String(current.status))) return null

    const now = new Date()
    if (Date.parse(String(current.next_attempt_at)) > now.getTime()) return null
    const attemptCount = Number(current.attempt_count)
    const firstAttemptAt = typeof current.first_attempt_at === 'string'
      ? current.first_attempt_at
      : now.toISOString()
    const { data, error } = await client
      .from('payment_confirmation_email_outbox')
      .update({
        status: 'sending',
        attempt_count: attemptCount + 1,
        first_attempt_at: firstAttemptAt,
        locked_at: now.toISOString(),
        last_error: null,
      })
      .eq('order_id', orderId)
      .eq('status', current.status)
      .eq('attempt_count', attemptCount)
      .lte('next_attempt_at', now.toISOString())
      .select(OUTBOX_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to claim payment email job: ${error.message}`, { cause: error })
    return data ? mapJob(data as unknown as Record<string, unknown>) : null
  }

  async markSent(orderId: string, attemptCount: number): Promise<void> {
    const { data, error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString(), locked_at: null, last_error: null })
      .eq('order_id', orderId)
      .eq('status', 'sending')
      .eq('attempt_count', attemptCount)
      .select('order_id')
      .maybeSingle()
    if (error) throw new Error(`Unable to record payment email delivery: ${error.message}`, { cause: error })
    if (!data) throw new Error('Payment email job was no longer owned by this worker.')
  }

  async markFailed(orderId: string, attemptCount: number, errorMessage: string): Promise<void> {
    const delaysMinutes = [1, 5, 15, 60, 360, 720, 1440]
    const delayMinutes = delaysMinutes[Math.min(attemptCount - 1, delaysMinutes.length - 1)] ?? 1440
    const needsReview = attemptCount >= 8
    const { data, error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .update({
        status: needsReview ? 'needs_review' : 'failed',
        next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
        locked_at: null,
        last_error: errorMessage.slice(0, 500),
      })
      .eq('order_id', orderId)
      .eq('status', 'sending')
      .eq('attempt_count', attemptCount)
      .select('order_id')
      .maybeSingle()
    if (error) throw new Error(`Unable to record payment email failure: ${error.message}`, { cause: error })
    if (!data) throw new Error('Payment email job was no longer owned by this worker.')
  }

  async recordUncertainFailure(orderId: string, attemptCount: number): Promise<void> {
    const { error } = await createSupabaseClient()
      .from('payment_confirmation_email_outbox')
      .update({ last_error: 'Email provider request outcome is uncertain; automatic retry will use the same idempotency key.' })
      .eq('order_id', orderId)
      .eq('status', 'sending')
      .eq('attempt_count', attemptCount)
    if (error) throw new Error(`Unable to record uncertain payment email result: ${error.message}`, { cause: error })
  }
}

export const paymentConfirmationEmailRepository = new PaymentConfirmationEmailRepository()
