import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'

export const REGISTRATION_OTP_LENGTH = 6
export const REGISTRATION_OTP_EXPIRY_MS = 10 * 60 * 1000
export const REGISTRATION_OTP_RESEND_COOLDOWN_MS = 60 * 1000
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5

export function generateRegistrationOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(REGISTRATION_OTP_LENGTH, '0')
}

export function hashRegistrationOtp(userId: string, otp: string): string {
  if (Buffer.byteLength(env.authJwtSecret, 'utf8') < 32) {
    throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes')
  }
  return createHmac('sha256', env.authJwtSecret)
    .update(`${userId}:${otp}`)
    .digest('hex')
}

export function registrationOtpMatches(userId: string, otp: string, storedHash: string): boolean {
  const expectedHash = Buffer.from(hashRegistrationOtp(userId, otp), 'hex')
  const actualHash = Buffer.from(storedHash, 'hex')
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash)
}

export function renderRegistrationVerificationEmail(fullName: string, otp: string): string {
  const safeName = fullName.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)

  return `<!doctype html>
<html lang="vi">
  <body style="margin:0;background:#f7f7f7;font-family:Arial,sans-serif;color:#1a1c1d">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:12px;padding:32px">
          <tr><td>
            <p style="margin:0 0 8px;color:#bc0002;font-weight:bold">ENGMASTER</p>
            <h1 style="margin:0 0 20px;font-size:24px">Xác minh địa chỉ email</h1>
            <p>Xin chào ${safeName},</p>
            <p>Vui lòng nhập mã xác minh bên dưới để hoàn tất đăng ký tài khoản EngMaster:</p>
            <p style="margin:28px 0;text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;color:#bc0002">${otp}</p>
            <p>Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần. Không chia sẻ mã này với bất kỳ ai.</p>
            <p>Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.</p>
            <p style="margin:28px 0 0;color:#777;font-size:13px">EngMaster – Học tiếng Anh theo lộ trình của bạn</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}
