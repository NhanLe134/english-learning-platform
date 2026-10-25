import { createSupabaseClient, createSupabasePublicClient } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { logRegistrationFailure } from '../auth/registration-diagnostics.js'
import type { PaginatedResult, UserProfile, UserQueryParams, UserRole, UserStatus } from './users.types.js'

const USER_COLUMNS =
  'id,email,full_name,nickname,phone_number,role,avatar_url,status,is_verified,created_at,updated_at'

function isoDate(value: unknown): string {
  const dateValue = typeof value === 'string' || typeof value === 'number' || value instanceof Date
    ? value
    : Number.NaN
  const date = new Date(dateValue)
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()
}

export class UsersRepository {
  /**
   * Check if Supabase environment variables are provided
   */
  hasSupabaseConfig(): boolean {
    return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey)
  }

  /**
   * Helper to map Supabase database row to UserProfile
   */
  private mapRowToProfile(row: Record<string, unknown>): UserProfile {
    return {
      id: String(row.id),
      email: String(row.email || ''),
      full_name: String(row.full_name || ''),
      nickname: row.nickname ? String(row.nickname) : null,
      phone_number: row.phone_number ? String(row.phone_number) : (row.phone ? String(row.phone) : null),
      role: (String(row.role || 'STUDENT').toUpperCase()) as UserRole,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      status: (String(row.status || 'active').toLowerCase()) as UserStatus,
      is_verified: Boolean(row.is_verified || (String(row.role || '').toUpperCase() === 'TEACHER')),
      created_at: isoDate(row.created_at),
      updated_at: isoDate(row.updated_at),
    }
  }

  /**
   * Find users from Supabase PostgreSQL database
   */
  async findUsers(params: UserQueryParams): Promise<PaginatedResult<UserProfile>> {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10))
    const offset = (page - 1) * limit

    if (!this.hasSupabaseConfig()) {
      throw new Error(
        'Chưa cấu hình Supabase! Vui lòng điền SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY vào file backend/.env để lấy dữ liệu từ Supabase.'
      )
    }

    const client = createSupabaseClient()
    let query = client.from('profiles').select(USER_COLUMNS, { count: 'exact' })

    if (params.search && params.search.trim()) {
      const s = params.search.trim()
      query = query.or(
        `full_name.ilike.%${s}%,email.ilike.%${s}%,phone_number.ilike.%${s}%,nickname.ilike.%${s}%`
      )
    }

    if (params.role && params.role !== 'ALL') {
      query = query.eq('role', params.role)
    }

    if (params.status && params.status !== 'ALL') {
      query = query.eq('status', params.status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      throw new Error(`Lỗi truy vấn bảng "profiles" trên Supabase: ${error.message} (Code: ${error.code || 'UNKNOWN'})`)
    }

    const items = (data || []).map((row) => this.mapRowToProfile(row))
    const total = count ?? items.length

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  }

  /**
   * Find user by email in Supabase
   */
  async findByEmail(email: string): Promise<UserProfile | null> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select(USER_COLUMNS)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (error) {
      throw new Error(`Lỗi kiểm tra email trên Supabase: ${error.message}`)
    }

    return data ? this.mapRowToProfile(data) : null
  }

  /**
   * Find user by ID in Supabase
   */
  async findById(id: string): Promise<UserProfile | null> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select(USER_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Lỗi tìm người dùng trên Supabase: ${error.message}`)
    }

    return data ? this.mapRowToProfile(data) : null
  }

  async createAuthAccount(
    user: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>,
    password: string
  ): Promise<UserProfile> {
    if (!this.hasSupabaseConfig()) {
      throw new Error(
        'Supabase is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
      )
    }

    const client = createSupabaseClient()
    const email = user.email.trim().toLowerCase()
    const sensitiveValues = [email, password]
    let userId: string

    try {
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name.trim() },
      })
      if (error) throw error
      if (!data.user) throw new Error('Supabase Auth did not return a user')
      userId = data.user.id
    } catch (error) {
      const providerMessage =
        error && typeof error === 'object' && 'message' in error
          ? error.message
          : undefined
      if (
        (error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'email_exists' || error.code === 'user_already_exists')) ||
        (typeof providerMessage === 'string' && /already (registered|exists)/i.test(providerMessage))
      ) {
        throw new Error('Email is already registered', { cause: error })
      }
      logRegistrationFailure('supabase_auth_create_user', error, sensitiveValues)
      throw new Error('Unable to create authentication account', { cause: error })
    }

    const profile = {
      id: userId,
      email,
      full_name: user.full_name.trim(),
      nickname: user.nickname?.trim() || null,
      phone_number: user.phone_number?.trim() || null,
      role: user.role,
      avatar_url: user.avatar_url || null,
      status: user.status || 'active',
      is_verified: user.is_verified || false,
    }

    let row: Record<string, unknown>
    try {
      const result = await client
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select(USER_COLUMNS)
        .single()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Supabase profile upsert returned no row')
      row = result.data
    } catch (error) {
      logRegistrationFailure('profile_upsert', error, sensitiveValues)
      await this.cleanupRegistrationAccount(client, userId, sensitiveValues)
      throw new Error('Unable to create user profile', { cause: error })
    }

    try {
      const { error } = await client.from('user_roles').upsert(
        { user_id: userId, role: user.role.toLowerCase() },
        { onConflict: 'user_id,role' }
      )
      if (error) throw error
    } catch (error) {
      logRegistrationFailure('role_upsert', error, sensitiveValues)
      await this.cleanupRegistrationAccount(client, userId, sensitiveValues, true)
      throw new Error('Unable to assign user role', { cause: error })
    }

    return this.mapRowToProfile(row)
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    if (!env.supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is required')
    }

    const { data, error } = await createSupabasePublicClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      const code = 'code' in error ? error.code : undefined
      if (code === 'invalid_credentials' || code === 'email_not_confirmed') return null
      throw new Error('Unable to authenticate with Supabase Auth', { cause: error })
    }
    if (!data.user) return null

    return this.findById(data.user.id)
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Supabase is not configured for password updates')
    }

    const { error } = await createSupabaseClient().auth.admin.updateUserById(userId, {
      password,
    })
    if (error) {
      throw new Error('Unable to update the Supabase Auth password', { cause: error })
    }
  }

  async deleteRegistrationAccount(userId: string): Promise<void> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Supabase is not configured for registration cleanup')
    }

    await this.cleanupRegistrationAccount(createSupabaseClient(), userId, [], true)
  }

  private async cleanupRegistrationAccount(
    client: ReturnType<typeof createSupabaseClient>,
    userId: string,
    sensitiveValues: readonly string[],
    removeRole = false
  ): Promise<void> {
    if (removeRole) {
      try {
        const { error } = await client.from('user_roles').delete().eq('user_id', userId)
        if (error) throw error
      } catch (error) {
        logRegistrationFailure('registration_cleanup', error, sensitiveValues)
      }
    }

    try {
      const { error } = await client.from('profiles').delete().eq('id', userId)
      if (error) throw error
    } catch (error) {
      logRegistrationFailure('registration_cleanup', error, sensitiveValues)
    }

    try {
      const { error } = await client.auth.admin.deleteUser(userId)
      if (error) throw error
    } catch (error) {
      logRegistrationFailure('registration_cleanup', error, sensitiveValues)
    }
  }

  /**
   * Update user status (lock / unlock) in Supabase
   */
  async updateStatus(id: string, status: UserProfile['status']): Promise<UserProfile> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const now = new Date().toISOString()

    const { data, error } = await client
      .from('profiles')
      .update({ status, updated_at: now })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Lỗi cập nhật trạng thái người dùng trên Supabase: ${error.message}`)
    }

    return this.mapRowToProfile(data)
  }

  /**
   * Delete user from Supabase profiles
   */
  async delete(id: string): Promise<boolean> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const { error } = await client.from('profiles').delete().eq('id', id)

    if (error) {
      throw new Error(`Lỗi xóa người dùng trên Supabase: ${error.message}`)
    }

    return true
  }

  /**
   * Seed sample data into Supabase if table is empty
   */
  async seedInitialData(): Promise<{ inserted: number; message: string }> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const { count, error: countErr } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countErr) {
      throw new Error(`Không thể kiểm tra bảng profiles: ${countErr.message}`)
    }

    if (count && count > 0) {
      return { inserted: 0, message: `Bảng profiles đã có ${count} bản ghi. Không cần seed thêm.` }
    }

    const seeds = [
      {
        id: crypto.randomUUID(),
        full_name: 'Trần Đinh Minh Khang',
        nickname: '@MinhEng99',
        email: 'minhkhang.ielts@gmail.com',
        phone_number: '0987.412.389',
        role: 'STUDENT',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        is_verified: false,
      },
      {
        id: crypto.randomUUID(),
        full_name: 'Ms. Hoàng Lan Hương',
        nickname: '@Huong_IELTS_85',
        email: 'lanhuong.engmaster@edu.vn',
        phone_number: '0912.899.701',
        role: 'TEACHER',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        is_verified: true,
      },
      {
        id: crypto.randomUUID(),
        full_name: 'Vũ Quốc Cường',
        nickname: '@CuongAdminSys',
        email: 'cuong.vq@engmaster.io',
        phone_number: '0978.552.198',
        role: 'ADMIN',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        is_verified: false,
      },
      {
        id: crypto.randomUUID(),
        full_name: 'Lê Tuấn Hùng',
        nickname: '@TuanHung_SpamViolate',
        email: 'tuanhung.le98@yahoo.com',
        phone_number: '0903.654.218',
        role: 'STUDENT',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        status: 'locked',
        is_verified: false,
      },
      {
        id: crypto.randomUUID(),
        full_name: 'Đặng Ngọc Khánh Linh',
        nickname: '@LinhDan_VSTEP',
        email: 'khanhlinh.dang@gmail.com',
        phone_number: '0934.112.987',
        role: 'STUDENT',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        status: 'active',
        is_verified: false,
      },
    ]

    const { error: insertErr } = await client.from('profiles').insert(seeds)
    if (insertErr) {
      throw new Error(`Lỗi seed dữ liệu vào Supabase: ${insertErr.message}`)
    }

    return { inserted: seeds.length, message: `Đã seed thành công ${seeds.length} người dùng vào Supabase!` }
  }
}

export const usersRepository = new UsersRepository()
