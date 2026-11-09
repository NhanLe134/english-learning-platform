import { createSupabaseClient } from '../../config/supabase.js'
import type { CreatePaymentOrderInput, PaymentOrder, PaymentOrderRow } from './payments.types.js'

const COURSE_ORDER_COLUMNS =
  'id,student_id,course_id,amount,currency,status,transfer_content,provider,provider_order_id,provider_transaction_id,paid_at,expired_at,created_at,updated_at'

function mapPaymentOrder(row: PaymentOrderRow): PaymentOrder {
  return {
    ...row,
    amount: Number(row.amount),
  }
}

export class PaymentOrderRepository {
  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder> {
    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .insert({
        id: input.id,
        student_id: input.studentId,
        course_id: input.courseId,
        amount: input.amount,
        currency: 'VND',
        status: 'pending',
        transfer_content: input.transferContent,
        provider: 'sepay',
        expired_at: input.expiredAt,
      })
      .select(COURSE_ORDER_COLUMNS)
      .single()

    if (error) throw new Error(`Unable to create course order: ${error.message}`, { cause: error })
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async findPublishedCourse(courseId: string): Promise<{ id: string; title: string; price: number; discounted_price: number | null } | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select('id,title,price,discounted_price')
      .eq('id', courseId)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve course price: ${error.message}`, { cause: error })
    if (!data) return null
    return {
      id: String(data.id),
      title: String(data.title),
      price: Number(data.price),
      discounted_price: data.discounted_price === null ? null : Number(data.discounted_price),
    }
  }

  async findCourseTitle(courseId: string): Promise<string | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve course title: ${error.message}`, { cause: error })
    return data ? String(data.title) : null
  }

  async findOrderById(orderId: string): Promise<PaymentOrder | null> {
    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .select(COURSE_ORDER_COLUMNS)
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw new Error(`Unable to fetch course order: ${error.message}`, { cause: error })
    if (!data) return null
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async findOrderByTransferContent(transferContent: string): Promise<PaymentOrder | null> {
    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .select(COURSE_ORDER_COLUMNS)
      .eq('transfer_content', transferContent)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Unable to fetch course order: ${error.message}`, { cause: error })
    if (!data) return null
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async markOrderPaid(
    orderId: string,
    providerOrderId: string,
    providerTransactionId: string | null,
    amount: number,
  ): Promise<{ order: PaymentOrder; isNewlyPaid: boolean }> {
    const existing = await this.findOrderById(orderId)
    if (!existing) {
      throw new Error(`Course order ${orderId} not found`)
    }
    if (existing.provider_order_id && existing.provider_order_id !== providerOrderId) {
      throw new Error('SePay order reference does not match the stored payment reference.')
    }
    if (existing.status === 'paid') {
      if (existing.provider_order_id) return { order: existing, isNewlyPaid: false }

      // Older paid rows may predate persistence of SePay's generated reference.
      // Bind the authenticated repeat notification once, then require it on future retries.
      const { error: bindError } = await createSupabaseClient()
        .from('course_orders')
        .update({ provider_order_id: providerOrderId })
        .eq('id', orderId)
        .eq('status', 'paid')
        .is('provider_order_id', null)
      if (bindError) throw new Error(`Unable to persist SePay order reference: ${bindError.message}`, { cause: bindError })
      const refreshed = await this.findOrderById(orderId)
      if (!refreshed) throw new Error(`Course order ${orderId} not found after reference update`)
      if (refreshed.provider_order_id !== providerOrderId) {
        throw new Error('SePay order reference does not match the stored payment reference.')
      }
      return { order: refreshed, isNewlyPaid: false }
    }

    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .update({
        status: 'paid',
        provider_order_id: providerOrderId,
        provider_transaction_id: providerTransactionId ?? existing.provider_transaction_id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending') // only transition from pending
      .select(COURSE_ORDER_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to mark course order paid: ${error.message}`, { cause: error })

    if (!data) {
      // Order may have been updated concurrently; re-fetch
      const refreshed = await this.findOrderById(orderId)
      if (!refreshed) throw new Error(`Course order ${orderId} not found after update`)
      if (refreshed.provider_order_id !== providerOrderId) {
        throw new Error('SePay order reference does not match the stored payment reference.')
      }
      return { order: refreshed, isNewlyPaid: refreshed.status === 'paid' }
    }

    return { order: mapPaymentOrder(data as unknown as PaymentOrderRow), isNewlyPaid: true }
  }

  async markOrderExpired(orderId: string): Promise<PaymentOrder | null> {
    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select(COURSE_ORDER_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to expire course order: ${error.message}`, { cause: error })
    if (!data) return null
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async createEnrollment(studentId: string, courseId: string): Promise<{ created: boolean }> {
    const { data, error } = await createSupabaseClient()
      .from('course_enrollments')
      .insert({ student_id: studentId, course_id: courseId, status: 'active' })
      .select('id')
      .maybeSingle()

    if (error) {
      // Duplicate enrollment (unique constraint) is not an error — access already granted
      if (String(error.code) === '23505') {
        return { created: false }
      }
      throw new Error(`Unable to create course enrollment: ${error.message}`, { cause: error })
    }

    return { created: data !== null }
  }
}

export const paymentOrderRepository = new PaymentOrderRepository()
