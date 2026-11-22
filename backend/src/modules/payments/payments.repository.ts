import { createSupabaseClient } from '../../config/supabase.js'
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderQueryParams,
  AdminOrderStatus,
  CreatePaymentOrderInput,
  PaymentOrder,
  PaymentOrderRow,
  PaymentStatistics,
} from './payments.types.js'

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
    const { data, error } = await this.clientFactory()
      .from('profiles')
      .select('id,email,full_name,phone_number,role,status,is_verified')
      .eq('email', email.trim().toLowerCase())
      .eq('role', 'STUDENT')
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

  async createOrReusePendingOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder> {
    const { data, error } = await this.clientFactory().rpc('create_or_reuse_pending_course_order', {
      p_order_id: input.id,
      p_student_id: input.studentId,
      p_course_id: input.courseId,
      p_amount: input.amount,
      p_transfer_content: input.transferContent,
      p_expired_at: input.expiredAt,
    })
    if (error) throw new Error(`Unable to create or reuse pending course order: ${error.message}`, { cause: error })
    const result = data as { order?: PaymentOrderRow } | null
    if (!result?.order || result.order.status !== 'pending') {
      throw new Error('Pending course order operation did not return a pending order')
    }
    return mapPaymentOrder(result.order)
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
    const { data, error } = await this.clientFactory()
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
    const { data, error } = await this.clientFactory()
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
    const { data, error } = await this.clientFactory()
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
    const { data, error } = await this.clientFactory()
      .from('course_orders')
      .select(COURSE_ORDER_COLUMNS)
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw new Error(`Unable to fetch course order: ${error.message}`, { cause: error })
    if (!data) return null
    return mapPaymentOrder(data as unknown as PaymentOrderRow)
  }

  async findOrderByTransferContent(transferContent: string): Promise<PaymentOrder | null> {
    const { data, error } = await this.clientFactory()
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
    const { data, error } = await this.clientFactory()
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

  /* ============================================================
     Admin Payment Management repository methods
     ============================================================ */

  private statisticsCache: { data: PaymentStatistics; expiresAt: number } | null = null

  async findAdminOrders(params: AdminOrderQueryParams): Promise<{
    items: AdminOrderListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20))
    const offset = (page - 1) * limit

    const client = createSupabaseClient()
    let query = client
      .from('course_orders')
      .select(`
        id, student_id, course_id, amount, currency, status, transfer_content,
        provider, provider_order_id, provider_transaction_id, paid_at, expired_at,
        created_at, updated_at,
        profiles!inner (id, full_name, email, phone_number),
        courses!inner (id, title, slug)
      `, { count: 'exact' })

    if (params.search && params.search.trim()) {
      const s = params.search.trim()
      query = query.or(
        `profiles.full_name.ilike.%${s}%,profiles.email.ilike.%${s}%,courses.title.ilike.%${s}%,transfer_content.ilike.%${s}%`
      )
    }

    if (params.status && params.status !== 'ALL') {
      query = query.eq('status', params.status)
    }

    // Enrollment filter is applied in-memory after fetching enrollments
    // because course_enrollments has no direct FK to course_orders.

    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom)
    }
    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo)
    }

    const sortColumn = params.sortBy ?? 'created_at'
    const sortOrder = params.sortOrder ?? 'desc'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) {
      throw new Error(`Unable to fetch admin payment orders: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    }

    const rows = (data || []) as unknown as Record<string, unknown>[]

    // Fetch enrollments separately since course_enrollments has no FK to course_orders.
    // Match by student_id + course_id combination for current rows only (fast index lookup).
    const enrollmentMap: Record<string, Array<{ id: string; status: string }>> = {}
    if (rows.length > 0) {
      const studentIds = [...new Set(rows.map((r) => String(r.student_id)).filter(Boolean))]
      const courseIds = [...new Set(rows.map((r) => String(r.course_id)).filter(Boolean))]

      if (studentIds.length > 0 && courseIds.length > 0) {
        const { data: enrollments, error: enrollmentError } = await createSupabaseClient()
          .from('course_enrollments')
          .select('id, student_id, course_id, status, enrolled_at')
          .in('student_id', studentIds)
          .in('course_id', courseIds)

        if (!enrollmentError && enrollments) {
          for (const enrollment of enrollments) {
            const key = `${String(enrollment.student_id)}:${String(enrollment.course_id)}`
            if (!enrollmentMap[key]) enrollmentMap[key] = []
            enrollmentMap[key].push({
              id: String(enrollment.id),
              status: String(enrollment.status),
            })
          }
        }
      }
    }

    const items = rows.map((row) => this.mapAdminOrderListItem(row, enrollmentMap))
    let total = count ?? items.length

    // Apply enrollment filter in-memory if requested
    let filteredItems = items
    if (params.enrollment && params.enrollment !== 'ALL') {
      if (params.enrollment === 'missing_enrollment') {
        filteredItems = items.filter((item) => !item.enrollmentId)
      } else if (params.enrollment === 'has_enrollment') {
        filteredItems = items.filter((item) => Boolean(item.enrollmentId))
      }
      total = filteredItems.length
    }

    return {
      items: filteredItems,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  }

  async findAdminOrderById(orderId: string): Promise<AdminOrderDetail | null> {
    const client = createSupabaseClient()
    const { data, error } = await client
      .from('course_orders')
      .select(`
        id, student_id, course_id, amount, currency, status, transfer_content,
        provider, provider_order_id, provider_transaction_id, paid_at, expired_at,
        created_at, updated_at,
        profiles!inner (id, full_name, email, phone_number),
        courses!inner (id, title, slug)
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw new Error(`Unable to fetch admin order detail: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    if (!data) return null

    // Fetch enrollment separately
    const row = data as unknown as Record<string, unknown>
    const enrollmentMap: Record<string, Array<{ id: string; status: string }>> = {}
    const { data: enrollments } = await createSupabaseClient()
      .from('course_enrollments')
      .select('id, student_id, course_id, status, enrolled_at')
      .eq('student_id', row.student_id)
      .eq('course_id', row.course_id)

    if (enrollments) {
      for (const enrollment of enrollments) {
        const key = `${String(enrollment.student_id)}:${String(enrollment.course_id)}`
        if (!enrollmentMap[key]) enrollmentMap[key] = []
        enrollmentMap[key].push({
          id: String(enrollment.id),
          status: String(enrollment.status),
        })
      }
    }

    return this.mapAdminOrderDetail(row, enrollmentMap)
  }

  async getPaymentStatistics(): Promise<PaymentStatistics> {
    const now = Date.now()
    if (this.statisticsCache && this.statisticsCache.expiresAt > now) {
      return this.statisticsCache.data
    }

    const { data, error } = await createSupabaseClient()
      .from('course_orders')
      .select('status, amount')

    if (error) {
      if (this.statisticsCache) {
        return this.statisticsCache.data
      }
      throw new Error(`Unable to fetch payment statistics: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    }

    const rows = (data || []) as unknown as Array<{ status: string; amount: number | string }>

    let totalOrders = 0
    let totalPaid = 0
    let totalPending = 0
    let totalFailed = 0
    let totalAmount = 0

    for (const row of rows) {
      totalOrders++
      const amount = Number(row.amount ?? 0)
      totalAmount += amount
      switch (row.status) {
        case 'paid':
          totalPaid++
          break
        case 'pending':
          totalPending++
          break
        case 'failed':
        case 'expired':
        case 'cancelled':
          totalFailed++
          break
      }
    }

    const stats: PaymentStatistics = {
      totalOrders,
      totalPaid,
      totalPending,
      totalFailed,
      totalAmount,
    }

    this.statisticsCache = {
      data: stats,
      expiresAt: now + 30_000,
    }

    return stats
  }

  async findEnrollmentByStudentCourse(studentId: string, courseId: string): Promise<{ id: string; status: string } | null> {
    const { data, error } = await createSupabaseClient()
      .from('course_enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (error) throw new Error(`Unable to check enrollment: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    if (!data) return null
    return { id: String(data.id), status: String(data.status) }
  }

  async createEnrollment(studentId: string, courseId: string): Promise<{ id: string; status: string }> {
    const { data, error } = await createSupabaseClient()
      .from('course_enrollments')
      .insert({ student_id: studentId, course_id: courseId, status: 'active' })
      .select('id, status')
      .single()

    if (error) throw new Error(`Unable to create enrollment: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    if (!data) throw new Error('Enrollment creation returned no row')
    return { id: String(data.id), status: String(data.status) }
  }

  async logAdminPaymentAction(
    adminId: string,
    orderId: string,
    action: 'view' | 'reconcile_enrollment' | 'export',
    details: Record<string, unknown> | null
  ): Promise<void> {
    const { error } = await createSupabaseClient()
      .from('admin_payment_actions')
      .insert({ admin_id: adminId, order_id: orderId, action, details })
    if (error) {
      console.error('[AdminPayment] Unable to log admin payment action:', error.message)
      // Do not throw — audit logging must not block the admin action itself
    }
  }

  /* ============================================================ */

  private mapAdminOrderListItem(
    row: Record<string, unknown>,
    enrollmentMap: Record<string, Array<{ id: string; status: string }>>
  ): AdminOrderListItem {
    const profilesRow = row.profiles as Record<string, unknown> | null
    const coursesRow = row.courses as Record<string, unknown> | null

    const studentId = String(row.student_id)
    const courseId = String(row.course_id)
    const enrollmentKey = `${studentId}:${courseId}`
    const enrollments = enrollmentMap[enrollmentKey]

    let enrollmentStatus: 'active' | 'completed' | 'cancelled' | null = null
    let enrollmentId: string | null = null

    if (enrollments && enrollments.length > 0) {
      const first = enrollments[0]
      if (first) {
        enrollmentId = first.id
        enrollmentStatus = first.status as 'active' | 'completed' | 'cancelled'
      }
    }

    const status = String(row.status ?? 'pending') as AdminOrderStatus
    const needsAttention = status === 'paid' && !enrollmentId

    return {
      orderId: String(row.id),
      studentId,
      studentName: String(profilesRow?.full_name ?? ''),
      studentEmail: String(profilesRow?.email ?? ''),
      studentPhone: typeof profilesRow?.phone_number === 'string' ? profilesRow.phone_number : null,
      courseId,
      courseTitle: String(coursesRow?.title ?? ''),
      courseSlug: typeof coursesRow?.slug === 'string' ? coursesRow.slug : null,
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? 'VND'),
      status,
      transferContent: String(row.transfer_content ?? ''),
      provider: typeof row.provider === 'string' ? row.provider : 'sepay',
      providerTransactionId: typeof row.provider_transaction_id === 'string' ? row.provider_transaction_id : null,
      paidAt: typeof row.paid_at === 'string' ? row.paid_at : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      enrollmentStatus,
      enrollmentId,
      needsAttention,
    }
  }

  private mapAdminOrderDetail(
    row: Record<string, unknown>,
    enrollmentMap: Record<string, Array<{ id: string; status: string }>>
  ): AdminOrderDetail {
    const base = this.mapAdminOrderListItem(row, enrollmentMap)
    return {
      ...base,
      providerOrderId: typeof row.provider_order_id === 'string' ? row.provider_order_id : null,
      expiredAt: typeof row.expired_at === 'string' ? row.expired_at : null,
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    }
  }

}

function maskDiagnosticValue(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

export const paymentOrderRepository = new PaymentOrderRepository()
