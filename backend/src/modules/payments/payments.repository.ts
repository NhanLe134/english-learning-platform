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
  constructor(private readonly clientFactory: typeof createSupabaseClient = createSupabaseClient) {}

  async findVerifiedStudentByEmail(email: string): Promise<{ id: string; fullName: string; email: string; phoneNumber: string | null } | null> {
    const { data, error } = await createSupabaseClient()
      .from('profiles')
      .select('id,email,full_name,phone_number,status,is_verified')
      .eq('email', email.trim().toLowerCase())
      .eq('is_verified', true)
      .in('status', ['pending', 'active'])
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve verified student details: ${error.message}`, { cause: error })
    if (!data) return null
    return {
      id: String(data.id),
      fullName: String(data.full_name ?? ''),
      email: String(data.email ?? ''),
      phoneNumber: typeof data.phone_number === 'string' ? data.phone_number : null,
    }
  }

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

  async findPendingOrderForStudentCourse(studentId: string, courseId: string): Promise<PaymentOrder | null> {
    const { data, error } = await this.clientFactory()
      .from('course_orders')
      .select(COURSE_ORDER_COLUMNS)
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('provider', 'sepay')
      .eq('status', 'pending')
      .gt('expired_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Unable to find an existing pending course order: ${error.message}`, { cause: error })
    if (!data) return null
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async findPublishedCourse(courseId: string): Promise<{
    id: string
    title: string
    slug: string
    description: string | null
    thumbnail_url: string | null
    price: number
    discounted_price: number | null
  } | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select('id,title,slug,description,thumbnail_url,price,discounted_price')
      .eq('id', courseId)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve course price: ${error.message}`, { cause: error })
    if (!data) return null
    return {
      id: String(data.id),
      title: String(data.title),
      slug: String(data.slug),
      description: typeof data.description === 'string' ? data.description : null,
      thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      price: Number(data.price),
      discounted_price: data.discounted_price === null ? null : Number(data.discounted_price),
    }
  }

  async findStudentSummary(studentId: string): Promise<{ id: string; fullName: string; email: string; phoneNumber: string | null } | null> {
    const { data, error } = await createSupabaseClient()
      .from('profiles')
      .select('id,full_name,email,phone_number')
      .eq('id', studentId)
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve student details: ${error.message}`, { cause: error })
    if (!data) return null
    return {
      id: String(data.id),
      fullName: String(data.full_name ?? ''),
      email: String(data.email ?? ''),
      phoneNumber: typeof data.phone_number === 'string' ? data.phone_number : null,
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

  async hasActiveEnrollment(studentId: string, courseId: string): Promise<boolean> {
    const { data, error } = await this.clientFactory()
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle()
    if (error) throw new Error(`Unable to verify course enrollment: ${error.message}`, { cause: error })
    return Boolean(data)
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

  async confirmVerifiedPayment(
    orderId: string,
    providerOrderId: string | null,
    providerTransactionId: string,
    amount: number,
  ): Promise<{ order: PaymentOrder; isNewlyPaid: boolean }> {
    console.info('[Payment] confirming verified payment atomically', {
      orderId: maskDiagnosticValue(orderId),
    })
    const { data, error } = await this.clientFactory().rpc('confirm_course_order_payment', {
      p_order_id: orderId,
      p_provider_order_id: providerOrderId,
      p_provider_transaction_id: providerTransactionId,
      p_amount: amount,
    })
    if (error) {
      console.error('[Payment] atomic confirmation RPC failed', {
        orderId: maskDiagnosticValue(orderId),
        databaseErrorCode: error.code,
      })
      throw new Error(`Unable to confirm paid course order and enrollment: ${error.message}`, { cause: error })
    }
    const result = data as { order?: PaymentOrderRow; isNewlyPaid?: boolean } | null
    if (!result?.order || result.order.status !== 'paid') {
      throw new Error('Payment confirmation RPC did not return a paid order.')
    }
    return { order: mapPaymentOrder(result.order), isNewlyPaid: result.isNewlyPaid === true }
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

}

function maskDiagnosticValue(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

export const paymentOrderRepository = new PaymentOrderRepository()
