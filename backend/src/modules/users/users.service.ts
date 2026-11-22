import { usersRepository } from './users.repository.js'
import type { CreateUserDto, PaginatedResult, UserProfile, UserQueryParams } from './users.types.js'
import { env } from '../../config/env.js'

export class UsersService {
  async setAvatarIfMissing(userId: string, avatarUrl: string): Promise<UserProfile | null> {
    return usersRepository.setAvatarIfMissing(userId, avatarUrl)
  }

  /**
   * Get list of users with filtering, search, and pagination
   */
  async getUsers(params: UserQueryParams): Promise<PaginatedResult<UserProfile>> {
    return usersRepository.findUsers(params)
  }

  /** Create a Teacher or Admin account through the configured auth provider. */
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

    if (dto.role !== 'ADMIN') {
      throw new Error('Teacher accounts must be created through the activation workflow')
    }

    const password = dto.password
    if (!password || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte')
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
    if (await usersRepository.findByEmail(normalizedEmail)) {
      throw new Error('Email đã được đăng ký trên hệ thống')
    }

    // Default avatar generator (styled UI avatar with user initials)
    const defaultAvatar =
      dto.avatar_url?.trim() ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        dto.full_name.trim()
      )}&background=F60005&color=fff&size=200&bold=true`

    const createdProfile = await usersRepository.createAuthAccount({
      full_name: dto.full_name.trim(),
      nickname: dto.nickname?.trim() ? (dto.nickname.startsWith('@') ? dto.nickname.trim() : `@${dto.nickname.trim()}`) : null,
      email: normalizedEmail,
      phone_number: dto.phone_number?.trim() || null,
      role: dto.role,
      avatar_url: defaultAvatar,
      status: 'active',
      is_verified: true,
    }, password)

    // Optional: Send a welcome email without including the account password.
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
              </div>
              <p>Vui lòng đăng nhập bằng mật khẩu đã được cấp.</p>
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
   * Cập nhật hồ sơ người dùng (mọi vai trò): họ tên, nickname, SĐT, avatar
   */
  async updateProfile(
    id: string,
    payload: Partial<Pick<UserProfile, 'full_name' | 'nickname' | 'phone_number' | 'avatar_url'>>
  ): Promise<UserProfile> {
    if (!id) throw new Error('Thiếu ID người dùng')
    const clean: typeof payload = {}
    if (payload.full_name !== undefined) {
      const fullName = payload.full_name.trim()
      if (!fullName || fullName.length > 120) {
        throw new Error('Họ và tên là bắt buộc và tối đa 120 ký tự')
      }
      clean.full_name = fullName
    }
    if (payload.nickname != null) {
      const nickname = payload.nickname.trim()
      if (nickname.length > 60) throw new Error('Nickname tối đa 60 ký tự')
      clean.nickname = nickname
    }
    if (payload.phone_number != null) {
      const phone = payload.phone_number.trim()
      if (phone && phone.length > 32) throw new Error('Số điện thoại tối đa 32 ký tự')
      clean.phone_number = phone
    }
    if (payload.avatar_url != null) {
      const avatarUrl = payload.avatar_url.trim()
      if (avatarUrl) {
        try {
          const parsed = new URL(avatarUrl)
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
        } catch {
          throw new Error('Avatar URL phải là liên kết http/https hợp lệ')
        }
      }
      clean.avatar_url = avatarUrl
    }
    return usersRepository.updateProfile(id, clean)
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
    
    const headers = ['ID', 'Họ và tên', 'Nickname', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Ngày tạo']
    
    const rows = items.map((u) => [
      `"${u.id}"`,
      `"${u.full_name.replace(/"/g, '""')}"`,
      `"${(u.nickname ?? '').replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phone_number ?? ''}"`,
      `"${u.role}"`,
      `"${u.status}"`,
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

  async createStudentAccount(email: string, password: string): Promise<UserProfile> {
    return usersRepository.createAuthAccount({
      email,
      full_name: email.split('@')[0] || 'Learner',
      nickname: null,
      phone_number: null,
      role: 'STUDENT',
      avatar_url: null,
      status: 'active',
      is_verified: false,
    }, password)
  }

  async rollbackStudentAccount(userId: string): Promise<void> {
    await usersRepository.deleteRegistrationAccount(userId)
  }

  async authenticatePassword(email: string, password: string): Promise<UserProfile | null> {
    return usersRepository.authenticatePassword(email, password)
  }

  async updatePassword(userId: string, email: string, password: string): Promise<void> {
    await usersRepository.updatePassword(userId, email, password)
  }

  async verifyEmail(userId: string): Promise<void> {
    await usersRepository.verifyEmail(userId)
  }

  async findById(userId: string): Promise<UserProfile | null> {
    return usersRepository.findById(userId)
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return usersRepository.findByEmail(email)
  }
}

export const usersService = new UsersService()
