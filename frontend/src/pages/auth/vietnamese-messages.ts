const VIETNAMESE_DIACRITICS_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

const FIELD_LABELS_VI: Record<string, string> = {
  email: 'địa chỉ email',
  password: 'mật khẩu',
  confirmpassword: 'xác nhận mật khẩu',
  fullname: 'họ và tên',
  phonenumber: 'số điện thoại',
  dateofbirth: 'ngày sinh',
  otp: 'mã OTP',
  token: 'mã xác thực',
  courseid: 'khóa học',
  orderid: 'mã đơn hàng',
}

const EXACT_ERROR_MAP: ReadonlyArray<readonly [string, string]> = [
  ['failed to fetch', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'],
  ['load failed', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'],
  ['networkerror', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'],
  ['network request failed', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'],
  ['aborted', 'Yêu cầu đã bị hủy. Vui lòng thử lại.'],
  ['aborterror', 'Yêu cầu đã bị hủy. Vui lòng thử lại.'],

  ['invalid email or password', 'Email hoặc mật khẩu không chính xác.'],
  ['invalid login credentials', 'Email hoặc mật khẩu không chính xác.'],
  ['invalid or expired authentication token', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'],
  ['authentication is required', 'Vui lòng đăng nhập để tiếp tục.'],
  ['authentication required.', 'Vui lòng đăng nhập để tiếp tục.'],
  ['unauthorized', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'],
  ['an authenticated user is required.', 'Vui lòng đăng nhập để tiếp tục.'],
  ['an account with this email already exists', 'Email này đã được đăng ký tài khoản.'],
  ['email is already registered', 'Email này đã được đăng ký tài khoản.'],
  ['invalid email address', 'Địa chỉ email không hợp lệ.'],
  ['passwords do not match', 'Mật khẩu xác nhận không khớp.'],
  ['date of birth is required.', 'Vui lòng nhập ngày sinh.'],
  ['date of birth must use the yyyy-mm-dd format.', 'Ngày sinh không đúng định dạng (YYYY-MM-DD).'],
  ['date of birth must be a valid date in the past.', 'Ngày sinh phải là một ngày hợp lệ trong quá khứ.'],
  ['please enter a valid phone number.', 'Please enter a valid phone number.'],
  ['one or more selected courses are unavailable.', 'Một hoặc nhiều khóa học đã chọn hiện không khả dụng.'],
  ['complete course payment before logging in.', 'Vui lòng hoàn tất thanh toán khóa học trước khi đăng nhập.'],
  ['complete email verification before signing in with google.', 'Vui lòng hoàn tất xác minh email trước khi đăng nhập bằng Google.'],
  ['please confirm your email address before signing in.', 'Vui lòng xác nhận địa chỉ email trước khi đăng nhập.'],
  ['verify the existing email account before linking it to google.', 'Vui lòng xác minh tài khoản email hiện có trước khi liên kết với Google.'],
  ['this google identity is already linked to another account.', 'Tài khoản Google này đã được liên kết với một tài khoản khác.'],
  ['the google account does not match the registration email.', 'Tài khoản Google không khớp với email đăng ký.'],
  ['google login handoff is missing or expired.', 'Phiên đăng nhập Google không tồn tại hoặc đã hết hạn. Vui lòng thử lại.'],
  ['google oauth is not configured on the server.', 'Đăng nhập Google hiện chưa được cấu hình trên máy chủ.'],
  ['google token does not contain a stable account identifier.', 'Mã xác thực Google không hợp lệ.'],
  ['the supabase session is not linked to a google identity.', 'Phiên xác thực không được liên kết với tài khoản Google.'],
  ['unable to resolve the google identity to an account.', 'Không thể xác định tài khoản từ Google. Vui lòng thử lại sau.'],
  ['this account is not permitted to sign in through admin authentication.', 'Tài khoản này không được phép đăng nhập qua cổng Quản trị viên.'],
  ['request origin is not allowed', 'Yêu cầu không được phép từ nguồn hiện tại.'],
  ['if the account is registered, password recovery instructions have been sent to the email.', 'Nếu tài khoản đã được đăng ký, hướng dẫn khôi phục đã được gửi đến email.'],
  ['if an account exists for that address, a temporary password will be sent.', 'Nếu tài khoản đã được đăng ký, hướng dẫn khôi phục đã được gửi đến email.'],
  ['user not found', 'Không tìm thấy tài khoản.'],
  ['current password does not match', 'Mật khẩu hiện tại không chính xác.'],
  ['credentials not found', 'Không tìm thấy thông tin đăng nhập của tài khoản.'],
  ['rememberme must be a boolean', 'Tùy chọn ghi nhớ đăng nhập không hợp lệ.'],
  ['access_denied', 'Đăng nhập Google đã bị hủy hoặc không thành công.'],
  ['popup_closed_by_user', 'Đăng nhập Google đã bị hủy hoặc không thành công.'],

  ['published course not found.', 'Không tìm thấy khóa học hoặc khóa học không còn mở đăng ký.'],
  ['course not found.', 'Không tìm thấy khóa học hoặc khóa học không còn mở đăng ký.'],
  ['course not found or no longer available.', 'Không tìm thấy khóa học hoặc khóa học không còn mở đăng ký.'],
  ['course id or slug is invalid.', 'Mã khóa học không hợp lệ.'],
  ['course identifier is required.', 'Mã khóa học không hợp lệ.'],
  ['course id must be a uuid.', 'Mã khóa học không hợp lệ.'],
  ['the course catalog is not configured.', 'Danh mục khóa học hiện chưa sẵn sàng. Vui lòng thử lại sau.'],
  ['invalid student id.', 'Thông tin học viên không hợp lệ.'],
  ['selected course ids must be an array of uuids.', 'Danh sách khóa học đã chọn không hợp lệ.'],
  ['lesson not found.', 'Không tìm thấy bài giảng.'],
  ['lesson id must be a valid uuid.', 'Mã bài giảng không hợp lệ.'],
  ['answers array is required.', 'Dữ liệu câu trả lời không hợp lệ. Vui lòng thử lại.'],
  ['answers format is invalid.', 'Dữ liệu câu trả lời không hợp lệ. Vui lòng thử lại.'],
  ['quiz payload is required.', 'Dữ liệu bài kiểm tra không hợp lệ.'],
  ['quiz payload must be an object.', 'Dữ liệu bài kiểm tra không hợp lệ.'],

  ['valid courseid is required.', 'Khóa học thanh toán không hợp lệ.'],
  ['a valid verified registration email is required.', 'Vui lòng sử dụng địa chỉ email đăng ký đã được xác minh.'],
  ['verify the registration email before creating a payment order.', 'Vui lòng xác minh email đăng ký trước khi tạo đơn thanh toán.'],
  ['student account was not found.', 'Không tìm thấy tài khoản học viên.'],
  ['you are already enrolled in this course.', 'Bạn đã đăng ký khóa học này rồi.'],
  ['course price is invalid.', 'Học phí khóa học không hợp lệ.'],
  ['valid orderid is required.', 'Mã đơn hàng không hợp lệ.'],
  ['order id is required.', 'Mã đơn hàng không hợp lệ.'],
  ['order not found.', 'Không tìm thấy đơn hàng.'],
  ['not allowed to view this order.', 'Bạn không có quyền xem đơn hàng này.'],
  ['direct bank qr payments are not enabled.', 'Phương thức thanh toán chuyển khoản QR hiện chưa được bật.'],
  ['course order is not payable', 'Đơn hàng không còn khả dụng để thanh toán. Vui lòng tạo đơn mới.'],
]

const PREFIX_ERROR_MAP: ReadonlyArray<readonly [string, string]> = [
  ['password must be at least 8 characters', 'Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte UTF-8.'],
  ['full name is required', 'Vui lòng nhập họ và tên (tối đa 120 ký tự).'],
  ['unable to validate selected courses', 'Không thể kiểm tra khóa học đã chọn. Vui lòng thử lại sau.'],
  ['too many sign-in attempts', 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi một lát rồi thử lại.'],
  ['too many requests', 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'],
  ['password recovery email is unavailable', 'Dịch vụ gửi email khôi phục mật khẩu hiện tạm thời không khả dụng. Vui lòng thử lại sau.'],
  ['the temporary password could not be emailed', 'Không thể gửi email mật khẩu tạm thời lúc này. Vui lòng thử lại sau.'],
  ['the recovery email was sent', 'Email khôi phục đã được gửi nhưng hệ thống chưa thể hoàn tất cập nhật. Vui lòng liên hệ hỗ trợ.'],
  ['the admin password was updated and emailed', 'Mật khẩu đã được cập nhật và gửi email nhưng hệ thống chưa thể hoàn tất đồng bộ hồ sơ.'],
  ['unable to prepare email verification', 'Không thể chuẩn bị mã OTP xác minh email. Vui lòng thử lại sau.'],
  ['unable to verify the code', 'Không thể xác minh mã OTP lúc này. Vui lòng thử lại sau.'],
  ['email verification is unavailable', 'Dịch vụ gửi mã OTP xác minh email hiện tạm thời không khả dụng. Vui lòng thử lại sau.'],
  ['registration is unavailable', 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại sau.'],
  ['registration could not be completed', 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại sau.'],
  ['admin authentication provider is unavailable', 'Dịch vụ xác thực quản trị viên hiện không khả dụng. Vui lòng thử lại sau.'],
  ['admin login is not configured', 'Dịch vụ xác thực quản trị viên hiện không khả dụng. Vui lòng thử lại sau.'],
  ['unable to update admin email verification status', 'Dịch vụ xác thực quản trị viên hiện không khả dụng. Vui lòng thử lại sau.'],
  ['unable to look up this account', 'Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.'],
  ['authentication database is unavailable', 'Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.'],
  ['authentication session storage is unavailable', 'Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.'],
  ['authentication is unavailable', 'Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.'],
  ['video url is required', 'Đường dẫn video không hợp lệ.'],
  ['video url must be', 'Đường dẫn video không hợp lệ.'],
]

export function translateErrorMessageToVietnamese(
  rawMessage: string | null | undefined,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.',
): string {
  const trimmed = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  if (!trimmed) return fallback

  const normalized = trimmed.toLowerCase()

  for (const [key, translation] of EXACT_ERROR_MAP) {
    if (normalized === key) return translation
  }

  for (const [prefix, translation] of PREFIX_ERROR_MAP) {
    if (normalized.startsWith(prefix)) return translation
  }

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
  }

  const requiredMatch = normalized.match(/^([a-z0-9_]+) is required\.?$/)
  if (requiredMatch && requiredMatch[1]) {
    const fieldName = FIELD_LABELS_VI[requiredMatch[1]] ?? 'thông tin bắt buộc'
    return `Vui lòng nhập ${fieldName}.`
  }

  if (VIETNAMESE_DIACRITICS_REGEX.test(trimmed)) {
    return trimmed
  }

  return fallback
}

export function formatCourseLevelVietnamese(
  level: string | null | undefined,
  uppercase = false,
): string {
  const trimmed = typeof level === 'string' ? level.trim() : ''
  if (!trimmed) return ''

  let translated = trimmed
  switch (trimmed.toLowerCase()) {
    case 'beginner':
      translated = 'Cơ bản'
      break
    case 'intermediate':
      translated = 'Trung cấp'
      break
    case 'advanced':
      translated = 'Nâng cao'
      break
    case 'all':
      translated = 'Mọi trình độ'
      break
  }

  return uppercase ? translated.toLocaleUpperCase('vi') : translated
}

export function formatOrderStatusVietnamese(status: string | null | undefined): string {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'pending':
      return 'đang chờ thanh toán'
    case 'paid':
      return 'đã thanh toán'
    case 'failed':
      return 'thất bại'
    case 'expired':
      return 'đã hết hạn'
    case 'cancelled':
      return 'đã hủy'
    default:
      return 'không xác định'
  }
}

export function formatPaymentMethodVietnamese(method: string | null | undefined): string {
  const trimmed = typeof method === 'string' ? method.trim() : ''
  if (!trimmed) return 'Không có thông tin'

  switch (trimmed.toUpperCase()) {
    case 'BANK_TRANSFER':
      return 'Chuyển khoản ngân hàng qua SePay'
    case 'VIETQR':
      return 'Chuyển khoản VietQR qua SePay'
    case 'CARD':
      return 'Thẻ thanh toán'
    case 'WALLET':
      return 'Ví điện tử'
    default:
      return VIETNAMESE_DIACRITICS_REGEX.test(trimmed) ? trimmed : 'Chuyển khoản qua SePay'
  }
}

export function formatUserRoleVietnamese(role: string | null | undefined): string {
  switch ((role ?? '').trim().toUpperCase()) {
    case 'STUDENT':
    case 'MEMBER':
      return 'Học viên'
    case 'TEACHER':
      return 'Giảng viên'
    case 'ADMIN':
      return 'Quản trị viên'
    default:
      return 'Học viên'
  }
}
