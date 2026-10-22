import crypto from 'node:crypto'
import { createSupabaseClient } from '../../config/supabase.js'
import { env } from '../../config/env.js'
import type { PaginatedResult, UserProfile, UserQueryParams, UserRole, UserStatus } from './users.types.js'

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
  private mapRowToProfile(row: Record<string, any>): UserProfile {
    return {
      id: String(row.id),
      email: String(row.email || ''),
      password_hash: String(row.password_hash || ''),
      full_name: String(row.full_name || ''),
      nickname: row.nickname ? String(row.nickname) : null,
      phone_number: row.phone_number ? String(row.phone_number) : (row.phone ? String(row.phone) : null),
      role: (String(row.role || 'STUDENT').toUpperCase()) as UserRole,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      status: (String(row.status || 'active').toLowerCase()) as UserStatus,
      is_verified: Boolean(row.is_verified || (String(row.role || '').toUpperCase() === 'TEACHER')),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
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
    let query = client.from('profiles').select('*', { count: 'exact' })

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
      .select('*')
      .ilike('email', email.trim().toLowerCase())
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
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Lỗi tìm người dùng trên Supabase: ${error.message}`)
    }

    return data ? this.mapRowToProfile(data) : null
  }

  /**
   * Create new user in Supabase profiles
   */
  async create(user: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<UserProfile> {
    if (!this.hasSupabaseConfig()) {
      throw new Error('Chưa cấu hình Supabase trong backend/.env')
    }

    const client = createSupabaseClient()
    const newRecord = {
      id: user.id || crypto.randomUUID(),
      email: user.email.toLowerCase().trim(),
      password_hash: user.password_hash,
      full_name: user.full_name.trim(),
      nickname: user.nickname?.trim() || null,
      phone_number: user.phone_number?.trim() || null,
      role: user.role,
      avatar_url: user.avatar_url || null,
      status: user.status || 'active',
      is_verified: user.is_verified || false,
    }

    const { data, error } = await client
      .from('profiles')
      .insert(newRecord)
      .select()
      .single()

    if (error) {
      throw new Error(`Lỗi thêm người dùng vào bảng "profiles" Supabase: ${error.message}`)
    }

    return this.mapRowToProfile(data)
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
        password_hash: '$2b$12$e8K9rT3vM0zWqY7uX1oP5aXp',
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
        password_hash: '$2b$12$Z1x9uV4tP2qW8kY0nE7r4pWs',
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
        password_hash: '$2b$12$K8m1sD9rT4yW2uP6oQ8e9bQz',
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
        password_hash: '$2b$12$V3n0pL7kR9mQ2sT4wY1x0dRt',
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
        password_hash: '$2b$12$N7x8uK5vM3yQ1sT9wP4e8yLm',
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
