import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getDatabasePool } from '../../config/database.js'
import { createSupabaseClient, createSupabasePublicClient } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import { logRegistrationFailure } from '../auth/registration-diagnostics.js'
import { AuthError } from '../auth/auth.errors.js'
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
    let userId: string | null = null

    try {
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name.trim() },
      })
      if (!error && data?.user) {
        userId = data.user.id
      } else if (error) {
        const providerMessage = error.message || ''
        if (
          error.code === 'email_exists' ||
          error.code === 'user_already_exists' ||
          /already (registered|exists)/i.test(providerMessage)
        ) {
          throw new Error('Email is already registered', { cause: error })
        }
        logRegistrationFailure('supabase_auth_create_user_fallback', error, sensitiveValues)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Email is already registered') {
        throw error
      }
      logRegistrationFailure('supabase_auth_create_user', error, sensitiveValues)
    }

    if (!userId) {
      userId = randomUUID()
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

    try {
      const passwordHash = await bcrypt.hash(password, 12)
      await getDatabasePool().query(
        `INSERT INTO public.auth_credentials (user_id, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
        [userId, passwordHash]
      )
    } catch (error) {
      logRegistrationFailure('auth_credentials_insert', error, sensitiveValues)
    }

    return this.mapRowToProfile(row)
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    if (!env.supabaseUrl || !env.supabasePublicKey) {
      throw new AuthError(
        'Admin login is not configured. Verify the Supabase URL and publishable key on the backend.',
        503,
        undefined,
        'AUTH_CONFIGURATION'
      )
    }

    type PasswordSignInResult = Awaited<ReturnType<ReturnType<typeof createSupabasePublicClient>['auth']['signInWithPassword']>>
    let result: PasswordSignInResult
    try {
      result = await createSupabasePublicClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
        ? cause.code
        : 'unknown'
      const status = cause && typeof cause === 'object' && 'status' in cause && typeof cause.status === 'number'
        ? cause.status
        : undefined
      console.warn('[AdminAuth] Supabase password sign-in request failed', { stage: 'provider_request', code, ...(status ? { status } : {}) })
      if (status === 429 || /rate.?limit/i.test(code)) {
        throw new AuthError('Too many sign-in attempts. Please wait and try again.', 429, cause, 'AUTH_RATE_LIMITED')
      }
      const errorType = cause instanceof Error ? cause.name : ''
      if (cause instanceof TypeError || /network|fetch|request_timeout/i.test(code) || /network|retryablefetch/i.test(errorType)) {
        throw new AuthError('Could not reach the authentication service. Check your connection and try again.', 503, cause, 'AUTH_NETWORK_ERROR')
      }
      throw new AuthError('The authentication service is unavailable. Please try again later.', 503, cause, 'AUTH_PROVIDER_UNAVAILABLE')
    }
    const { data, error } = result
    if (error) {
      const code = 'code' in error ? error.code : undefined
      const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined
      if (code === 'invalid_credentials') {
        // Keep provider diagnostics useful without logging the submitted email/password or keys.
        let projectHost = 'not-configured'
        try {
          projectHost = new URL(env.supabaseUrl).host
        } catch {
          // Configuration validation below reports missing/invalid setup separately.
        }
        console.warn('[AdminAuth] Supabase rejected password sign-in', {
          stage: 'provider_response',
          code,
          ...(status ? { status } : {}),
          projectHost,
        })
        return null
      }
      if (code === 'email_not_confirmed') {
        throw new AuthError('Please confirm your email address before signing in.', 403, error, 'EMAIL_NOT_CONFIRMED')
      }
      if (status === 429 || /rate.?limit/i.test(String(code ?? ''))) {
        throw new AuthError('Too many sign-in attempts. Please wait and try again.', 429, error, 'AUTH_RATE_LIMITED')
      }
      if (status === 0 || code === 'request_timeout') {
        throw new AuthError('Could not reach the authentication service. Check your connection and try again.', 503, error, 'AUTH_NETWORK_ERROR')
      }
      console.warn('[AdminAuth] Supabase rejected password sign-in', { stage: 'provider_response', code: typeof code === 'string' ? code : 'unknown', ...(status ? { status } : {}) })
      throw new AuthError('The authentication service is unavailable. Please try again later.', 503, error, 'AUTH_PROVIDER_UNAVAILABLE')
    }
    if (!data.user) {
      console.warn('[AdminAuth] Supabase accepted sign-in without returning a user', { stage: 'provider_response' })
      throw new AuthError('The authentication service returned an incomplete response.', 503, undefined, 'AUTH_PROVIDER_UNAVAILABLE')
    }

    if (!data.user.email) {
      throw new AuthError('Your account was authenticated, but its email is unavailable.', 503, undefined, 'ADMIN_PROFILE_LOOKUP_FAILED')
    }
    let profile: UserProfile | null
    try {
      profile = await this.findByEmail(data.user.email)
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string'
        ? cause.code
        : 'unknown'
      console.warn('[AdminAuth] Supabase sign-in succeeded but profile lookup failed', { stage: 'profile_lookup', code })
      throw new AuthError('Your account was authenticated, but the application profile could not be loaded.', 503, cause, 'ADMIN_PROFILE_LOOKUP_FAILED')
    }
    if (!profile) {
      console.warn('[AdminAuth] Supabase sign-in succeeded but no application profile was found', { stage: 'profile_lookup', result: 'missing' })
      throw new AuthError('Your account was authenticated, but its application profile is missing. Contact an administrator.', 403, undefined, 'ADMIN_PROFILE_MISSING')
    }
    if (profile.role !== 'ADMIN') {
      throw new AuthError('This account does not have Admin access.', 403, undefined, 'ADMIN_ROLE_REQUIRED')
    }
    return profile
  }

  async updatePassword(userId: string, email: string, password: string): Promise<void> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Supabase is not configured for password updates')
    }

    const client = createSupabaseClient()
    const { data: existingUser, error: lookupError } =
      await client.auth.admin.getUserById(userId)

    if (lookupError) {
      if (lookupError.status !== 404) {
        throw new Error('Unable to verify the Supabase Auth account before password recovery', {
          cause: lookupError,
        })
      }

      const { data: createdUser, error: createError } = await client.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      })
      if (!createError && createdUser.user) return

      if (!createError) {
        throw new Error('Supabase Auth did not return the recovered Admin account')
      }

      const duplicateEmail =
        ('code' in createError && (
          createError.code === 'email_exists' ||
          createError.code === 'user_already_exists'
        )) || /already (registered|exists)/i.test(createError.message)
      if (!duplicateEmail) {
        throw new Error('Unable to create the missing Supabase Auth account for Admin recovery', {
          cause: createError,
        })
      }

      const matchingUser = await this.findSupabaseAuthUserByEmail(client, email)
      if (!matchingUser) {
        throw new Error('Supabase reports the Admin email exists but could not find its Auth user', {
          cause: createError,
        })
      }
      const { error: updateError } = await client.auth.admin.updateUserById(matchingUser.id, {
        password,
        email_confirm: true,
      })
      if (updateError) {
        throw new Error('Unable to update the existing Supabase Auth password and confirm its email', {
          cause: updateError,
        })
      }
      return
    }

    if (!existingUser.user) {
      throw new Error('Supabase Auth returned no user for the Admin profile')
    }
    const { error } = await client.auth.admin.updateUserById(existingUser.user.id, {
      password,
      email_confirm: true,
    })
    if (error) {
      throw new Error('Unable to update the Supabase Auth password and confirm its email', {
        cause: error,
      })
    }
  }

  private async findSupabaseAuthUserByEmail(
    client: ReturnType<typeof createSupabaseClient>,
    email: string
  ): Promise<{ id: string } | null> {
    const normalizedEmail = email.trim().toLowerCase()
    const perPage = 1000
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage })
      if (error) {
        throw new Error('Unable to find the existing Supabase Auth account by email', {
          cause: error,
        })
      }
      const user = data.users.find(
        (candidate) => candidate.email?.toLowerCase() === normalizedEmail
      )
      if (user) return { id: user.id }
      if (data.users.length < perPage) return null
    }
    throw new Error('Supabase Auth account search exceeded its safe page limit')
  }

  async verifyEmail(userId: string): Promise<void> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Supabase is not configured for email verification')
    }

    const { data, error } = await createSupabaseClient()
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id')
      .maybeSingle()
    if (error) {
      throw new Error('Unable to verify the Supabase profile email', { cause: error })
    }
    if (!data) throw new Error('Supabase profile was not found for email verification')
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
