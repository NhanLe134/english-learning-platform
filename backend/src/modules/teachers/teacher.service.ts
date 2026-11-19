import { env } from '../../config/env.js'
import { createResendClient } from '../../config/resend.js'
import { AuthError } from '../auth/auth.errors.js'
import { teacherRepository } from './teacher.repository.js'
import type { UserStatus } from '../users/users.types.js'

export const TEACHER_RESET_MESSAGE = 'If an active teacher account exists for that address, a password reset link will be sent.'

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

export class TeacherService {
  private async sendLink(input: { email: string; name: string; token: string; kind: 'activate' | 'reset' }): Promise<boolean> {
    if (!env.resendApiKey || !env.emailFrom) return false
    const path = input.kind === 'activate' ? '/teacher/activate' : '/teacher/reset-password'
    const link = new URL(path, env.frontendUrl)
    link.searchParams.set('token', input.token)
    const safeName = htmlEscape(input.name)
    const safeLink = htmlEscape(link.toString())
    const isActivation = input.kind === 'activate'
    const subject = isActivation
      ? '[Your English Voice] Kích hoạt tài khoản giáo viên'
      : '[Your English Voice] Đặt lại mật khẩu giáo viên'
    const action = isActivation ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu'
    const { error } = await createResendClient().emails.send({
      from: env.emailFrom,
      to: input.email,
      subject,
      html: `<p>Xin chào ${safeName},</p><p>Nhấn liên kết dưới đây để ${action.toLowerCase()}. Liên kết có hiệu lực ${isActivation ? '24 giờ' : '1 giờ'} và chỉ dùng một lần.</p><p><a href="${safeLink}">${action}</a></p><p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>`,
      text: `Xin chào ${input.name},\n\n${action}: ${link.toString()}\n\nLiên kết chỉ dùng một lần và sẽ hết hạn.`,
    })
    if (error) throw new Error('Teacher account email could not be sent')
    return true
  }

  async create(input: { fullName: string; email: string; password: string; nickname?: string; phoneNumber?: string; avatarUrl?: string }): Promise<Awaited<ReturnType<typeof teacherRepository.create>>> {
    const fullName = input.fullName.trim()
    const email = input.email.trim().toLowerCase()
    if (!fullName) throw new AuthError('Full name is required', 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('A valid email address is required', 400)
    this.validatePassword(input.password)
    return teacherRepository.create({
      fullName, email, nickname: input.nickname?.trim() || null,
      password: input.password,
      phoneNumber: input.phoneNumber?.trim() || null, avatarUrl: input.avatarUrl?.trim() || null,
    })
  }

  async resendActivation(userId: string): Promise<boolean> {
    const issue = await teacherRepository.issueActivation(userId)
    if (!issue) return false
    return this.sendLink({ email: issue.user.email, name: issue.user.full_name, token: issue.token, kind: 'activate' })
  }

  async activate(token: string, password: string): Promise<boolean> {
    this.validatePassword(password)
    return teacherRepository.activate(token, password)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const issue = await teacherRepository.issuePasswordReset(email)
    if (!issue) return
    try {
      await this.sendLink({ email: issue.user.email, name: issue.user.full_name, token: issue.token, kind: 'reset' })
    } catch (error) {
      console.warn('[TeacherService] Password reset email delivery failed:', error instanceof Error ? error.name : 'UnknownError')
    }
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    this.validatePassword(password)
    return teacherRepository.resetPassword(token, password)
  }

  private validatePassword(password: string): void {
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new AuthError('Password must be at least 8 characters and no more than 72 UTF-8 bytes', 400)
    }
  }

  list(params: { search?: string; status?: string; page?: number; limit?: number }) {
    return teacherRepository.list(params)
  }

  findById(id: string) { return teacherRepository.findById(id) }

  async updateProfile(id: string, input: { fullName: string; nickname?: string; phoneNumber?: string }) {
    if (!input.fullName.trim()) throw new Error('Full name is required')
    return teacherRepository.updateProfile(id, {
      fullName: input.fullName.trim(), nickname: input.nickname?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
    })
  }

  async updateStatus(id: string, status: UserStatus) {
    if (!['active', 'locked', 'pending', 'deactivated'].includes(status)) throw new Error('Invalid teacher status')
    return teacherRepository.updateStatus(id, status)
  }
}

export const teacherService = new TeacherService()
