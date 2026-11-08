import { createSupabaseClient } from '../../config/supabase.js'
import type { CreatePaymentOrderInput, PaymentOrder, PaymentOrderRow } from './payments.types.js'

const COURSE_ORDER_COLUMNS =
  'id,student_id,course_id,amount,currency,status,transfer_content,provider,provider_transaction_id,paid_at,expired_at,created_at,updated_at'

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
    providerTransactionId: string | null,
    amount: number,
  ): Promise<{ order: PaymentOrder; isNewlyPaid: boolean }> {
    const existing = await this.findOrderById(orderId)
    if (!existing) {
      throw new Error(`Course order ${orderId} not found`)
    }
    if (existing.status === 'paid') {
      return { order: existing, isNewlyPaid: false }
    }

    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .update({
        status: 'paid',
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