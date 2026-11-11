import { randomInt } from 'node:crypto'

const PASSWORD_LENGTH = 20
const CHARACTER_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*()-_=+[]{}?',
]
const ALL_CHARACTERS = CHARACTER_GROUPS.join('')

export function generateTemporaryPassword(): string {
  const characters = CHARACTER_GROUPS.map((group) => group[randomInt(group.length)])
    .filter((character): character is string => character !== undefined)

  while (characters.length < PASSWORD_LENGTH) {
    const character = ALL_CHARACTERS[randomInt(ALL_CHARACTERS.length)]
    if (character) characters.push(character)
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = characters[index]
    const swap = characters[swapIndex]
    if (current !== undefined && swap !== undefined) {
      characters[index] = swap
      characters[swapIndex] = current
    }
  }

  return characters.join('')
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return character
    }
  })
}

export function renderTemporaryPasswordEmail(password: string, loginUrl: string): {
  subject: string
  html: string
  text: string
} {
  const safePassword = escapeHtml(password)
  const safeLoginUrl = escapeHtml(loginUrl)

  return {
    subject: '[Your English Voice] Yêu cầu cấp lại mật khẩu cho tài khoản của bạn',
    html: `
      <div style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,sans-serif;color:#27272a">
        <div style="max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px">
          <h1 style="margin:0 0 24px;color:#dc2626;font-size:22px">Your English Voice</h1>
          <p>Chào bạn,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>Your English Voice</strong> liên kết với email này.</p>
          <div style="margin:24px 0;padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;text-align:center">
            <p style="margin:0 0 10px;color:#7f1d1d;font-size:13px;font-weight:bold;letter-spacing:1px">MẬT KHẨU TẠM THỜI</p>
            <p style="margin:0;color:#18181b;font-family:Consolas,'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:1px;overflow-wrap:anywhere">${safePassword}</p>
          </div>
          <p>Hãy sao chép chính xác chuỗi mật khẩu trong khung trên để đăng nhập. Không nhập nhãn “MẬT KHẨU TẠM THỜI” hoặc thêm dấu cách ở đầu/cuối.</p>
          <p>Vui lòng sử dụng mật khẩu này để đăng nhập vào hệ thống tại:
            <a href="${safeLoginUrl}" style="color:#dc2626">Đăng nhập Your English Voice</a>.
            Để đảm bảo bảo mật, chúng tôi khuyến khích bạn đổi lại mật khẩu ngay sau khi đăng nhập thành công.
          </p>
          <p>Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này hoặc liên hệ ngay với bộ phận hỗ trợ của chúng tôi để được trợ giúp.</p>
          <p style="margin-top:24px;color:#71717a;font-size:13px"><em>Lưu ý: Đây là email tự động, vui lòng không phản hồi lại email này.</em></p>
          <p>Trân trọng,<br><strong>Đội ngũ Your English Voice</strong></p>
        </div>
      </div>
    `,
    text: `Chào bạn,

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Your English Voice liên kết với email này.

MẬT KHẨU TẠM THỜI:
${password}

Hãy sao chép chính xác dòng mật khẩu ở trên, không thêm dấu cách ở đầu/cuối.

Vui lòng sử dụng mật khẩu này để đăng nhập vào hệ thống tại: ${loginUrl}
Để đảm bảo bảo mật, chúng tôi khuyến khích bạn đổi lại mật khẩu ngay sau khi đăng nhập thành công.

Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này hoặc liên hệ ngay với bộ phận hỗ trợ của chúng tôi để được trợ giúp.

Lưu ý: Đây là email tự động, vui lòng không phản hồi lại email này.

Trân trọng,
Đội ngũ Your English Voice`,
  }
}
