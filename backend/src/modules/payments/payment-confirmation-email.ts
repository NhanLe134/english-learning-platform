export interface PaymentConfirmationEmailData {
  orderId: string
  customerName: string
  email: string
  phoneNumber: string | null
  dateOfBirth: string | null
  courseTitle: string
  courseSlug: string | null
  courseDescription: string | null
  courseLevel: string | null
  courseLessonCount: number | null
  courseCount: number
  amount: number
  currency: string
  paymentMethod: string
  paidAt: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function renderPaymentConfirmationEmail(
  data: PaymentConfirmationEmailData,
  courseUrl: string,
): { subject: string; html: string } {
  const name = escapeHtml(data.customerName || 'bạn')
  const title = escapeHtml(data.courseTitle)
  const orderId = escapeHtml(data.orderId)
  const paymentDate = escapeHtml(new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(data.paidAt)))
  const dateOfBirth = data.dateOfBirth
    ? escapeHtml(new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'long',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(`${data.dateOfBirth.slice(0, 10)}T12:00:00+07:00`)))
    : null
  const amount = escapeHtml(new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: data.currency,
    maximumFractionDigits: 0,
  }).format(data.amount))
  const paymentMethod = escapeHtml(data.paymentMethod === 'BANK_TRANSFER'
    ? 'Chuyển khoản ngân hàng qua SePay'
    : data.paymentMethod)
  const safeCourseUrl = escapeHtml(courseUrl)
  const courseDetails = [
    data.courseLevel ? `Trình độ: ${escapeHtml(data.courseLevel)}` : null,
    data.courseLessonCount !== null ? `${data.courseLessonCount} bài học` : null,
  ].filter(Boolean).join(' · ')
  const courseDescription = data.courseDescription
    ? escapeHtml(data.courseDescription).replace(/\r?\n/g, '<br>')
    : ''

  return {
    subject: '[Your English Voice] Xác nhận thanh toán thành công',
    html: `
      <!doctype html>
      <html lang="vi">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;background:#f9fafb;color:#17181c;font-family:Arial,'Segoe UI',sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Thanh toán khóa học của bạn đã được xác nhận.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f9fafb;">
            <tr><td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                <tr><td style="padding:24px 28px;background:#c8102e;color:#fff;font-size:20px;font-weight:700;">Your English Voice</td></tr>
                <tr><td style="padding:30px 28px 12px;">
                  <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#eaf7ef;color:#16834a;font-size:12px;font-weight:700;">THANH TOÁN THÀNH CÔNG</div>
                  <h1 style="margin:16px 0 8px;font-size:25px;line-height:1.3;color:#17181c;">Cảm ơn ${name}!</h1>
                  <p style="margin:0;color:#3d4046;font-size:15px;line-height:1.7;">Your English Voice đã xác nhận thanh toán. Đăng ký khóa học của bạn đã hoàn tất và khóa học đã được kích hoạt trong tài khoản.</p>
                </td></tr>
                <tr><td style="padding:18px 28px 8px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;">
                    <tr><td colspan="2" style="padding:16px 16px 10px;font-size:17px;font-weight:700;color:#17181c;">1. Thông tin đăng ký</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Họ và tên</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;">${name}</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Email</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;word-break:break-word;">${escapeHtml(data.email)}</td></tr>
                    ${dateOfBirth ? `<tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Ngày sinh</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;">${dateOfBirth}</td></tr>` : ''}
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Điện thoại</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;">${data.phoneNumber ? escapeHtml(data.phoneNumber) : 'Chưa cập nhật'}</td></tr>
                    <tr><td colspan="2" style="padding:18px 16px 8px;font-size:16px;font-weight:700;color:#17181c;">2. Thông tin khóa học</td></tr>
                    <tr><td colspan="2" style="padding:8px 16px;color:#17181c;font-size:14px;font-weight:600;">${title}</td></tr>
                    ${courseDetails ? `<tr><td colspan="2" style="padding:4px 16px;color:#6b7076;font-size:12px;">${courseDetails}</td></tr>` : ''}
                    ${courseDescription ? `<tr><td colspan="2" style="padding:4px 16px;color:#3d4046;font-size:13px;line-height:1.6;">${courseDescription}</td></tr>` : ''}
                    <tr><td style="padding:8px 16px 16px;color:#6b7076;font-size:13px;">Số khóa học</td><td style="padding:8px 16px 16px;text-align:right;color:#17181c;font-size:13px;">${data.courseCount}</td></tr>
                    <tr><td colspan="2" style="padding:18px 16px 8px;font-size:16px;font-weight:700;color:#17181c;">3. Thông tin thanh toán</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Mã đơn hàng</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;font-weight:600;word-break:break-all;">${orderId}</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Số tiền</td><td style="padding:8px 16px;text-align:right;color:#c8102e;font-size:15px;font-weight:700;">${amount}</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Thời gian</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;">${paymentDate}</td></tr>
                    <tr><td style="padding:8px 16px;color:#6b7076;font-size:13px;">Phương thức</td><td style="padding:8px 16px;text-align:right;color:#17181c;font-size:13px;">${paymentMethod}</td></tr>
                    <tr><td style="padding:8px 16px 16px;color:#6b7076;font-size:13px;">Trạng thái</td><td style="padding:8px 16px 16px;text-align:right;color:#16834a;font-size:13px;font-weight:700;">Đã thanh toán</td></tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:20px 28px 12px;">
                  <a href="${safeCourseUrl}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#c8102e;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Truy cập khóa học</a>
                </td></tr>
                <tr><td style="padding:12px 28px 28px;color:#6b7076;font-size:13px;line-height:1.7;">Nếu cần hỗ trợ, vui lòng gọi <a href="tel:18006889" style="color:#c8102e;font-weight:700;">1800 6889</a>.<br>Chúc bạn học tập hiệu quả,<br><strong style="color:#17181c;">Đội ngũ Your English Voice</strong></td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  }
}
