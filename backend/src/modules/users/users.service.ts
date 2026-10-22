import bcrypt from 'bcryptjs'
import { usersRepository } from './users.repository.js'
import type { CreateUserDto, PaginatedResult, UserProfile, UserQueryParams } from './users.types.js'
import { env } from '../../config/env.js'

export class UsersService {
  /**
   * Get list of users with filtering, search, and pagination
   */
  async getUsers(params: UserQueryParams): Promise<PaginatedResult<UserProfile>> {
    return usersRepository.findUsers(params)
  }

  /**
   * Create a new Teacher or Admin user with bcrypt password hashing
   */
  async createUser(dto: CreateUserDto): Promise<UserProfile> {
    // 1. Validation
    if (!dto.full_name || !dto.full_name.trim()) {
      throw new Error('Họ và tên không được để trống')
    }

    if (!dto.email || !dto.email.trim()) {
      throw new Error('Email không được để trống')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(dto.email.trim())) {
      throw new Error('Định dạng email không hợp lệ')
    }

    if (!dto.role || (dto.role !== 'TEACHER' && dto.role !== 'ADMIN')) {
      throw new Error('Vai trò cấp quyền phải là TEACHER hoặc ADMIN')
    }

    const rawPassword = dto.password?.trim() || 'EngMaster@2025#Temp'
    if (rawPassword.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự')
    }

    // 2. Check email duplication
    const existing = await usersRepository.findByEmail(dto.email.trim())
    if (existing) {
      throw new Error(`Email "${dto.email.trim()}" đã được đăng ký trên hệ thống`)
    }

    // 3. Hash password using bcrypt (12 rounds)
    const saltRounds = 12
    const password_hash = await bcrypt.hash(rawPassword, saltRounds)

    // 4. Default avatar generator (styled UI avatar with user initials)
    const defaultAvatar =
      dto.avatar_url?.trim() ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        dto.full_name.trim()
      )}&background=F60005&color=fff&size=200&bold=true`

    // 5. Create profile in database
    const createdProfile = await usersRepository.create({
      full_name: dto.full_name.trim(),
      nickname: dto.nickname?.trim() ? (dto.nickname.startsWith('@') ? dto.nickname.trim() : `@${dto.nickname.trim()}`) : null,
      email: dto.email.trim().toLowerCase(),
      phone_number: dto.phone_number?.trim() || null,
      role: dto.role,
      password_hash,
      avatar_url: defaultAvatar,
      status: 'active',
      is_verified: dto.role === 'TEACHER', // Auto verify teachers as in Figma
    })

    // 6. Optional: Send welcome email via Resend if credentials are set
    if (env.resendApiKey && env.emailFrom) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(env.resendApiKey)
        await resend.emails.send({
          from: env.emailFrom,
          to: createdProfile.email,
          subject: 'Tài khoản EngMaster của bạn đã được khởi tạo',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #F60005;">Chào mừng đến với EngMaster!</h2>
              <p>Xin chào <strong>${createdProfile.full_name}</strong>,</p>
              <p>Bạn đã được cấp quyền truy cập vào hệ thống EngMaster với vai trò <strong>${
                createdProfile.role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên'
              }</strong>.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Tài khoản:</strong> ${createdProfile.email}</p>
                <p style="margin: 4px 0;"><strong>Mật khẩu khởi tạo:</strong> <code>${rawPassword}</code></p>
              </div>
              <p style="color: #dc2626;"><em>Lưu ý: Vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên để bảo mật tài khoản.</em></p>
            </div>
          `,
        })
      } catch (emailErr) {
        console.warn('[UsersService] Resend notification failed (non-blocking):', emailErr)
      }
    }

    return createdProfile
  }

  /**
   * Update user status (lock/unlock)
   */
  async updateStatus(id: string, status: UserProfile['status']): Promise<UserProfile> {
    const updated = await usersRepository.updateStatus(id, status)
    if (!updated) {
      throw new Error('Không tìm thấy người dùng để cập nhật trạng thái')
    }
    return updated
  }

  /**
   * Delete user profile
   */
  async deleteUser(id: string): Promise<boolean> {
    const success = await usersRepository.delete(id)
    if (!success) {
      throw new Error('Không tìm thấy người dùng để xóa')
    }
    return true
  }

  /**
   * Export users list as UTF-8 CSV with BOM for Excel compatibility
   */
  async exportCsv(params: UserQueryParams): Promise<string> {
    const { items } = await usersRepository.findUsers({ ...params, limit: 10000, page: 1 })
    
    const headers = ['ID', 'Họ và tên', 'Nickname', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Hash Mật khẩu', 'Ngày tạo']
    
    const rows = items.map((u) => [
      `"${u.id}"`,
      `"${u.full_name.replace(/"/g, '""')}"`,
      `"${(u.nickname ?? '').replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phone_number ?? ''}"`,
      `"${u.role}"`,
      `"${u.status}"`,
      `"${u.password_hash}"`,
      `"${new Date(u.created_at).toLocaleString('vi-VN')}"`,
    ])

    // Include UTF-8 BOM (\uFEFF) so Excel properly decodes Vietnamese characters
    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  }

  /**
   * Seed initial mock users into Supabase
   */
  async seedUsers(): Promise<{ inserted: number; message: string }> {
    return usersRepository.seedInitialData()
  }
}

export const usersService = new UsersService()

