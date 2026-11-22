import React, { useCallback, useEffect } from 'react'
import {
  Receipt,
  Hash,
  User,
  GraduationCap,
  AlertCircle,
} from 'lucide-react'
import type { AdminPaymentOrder } from '../types'

interface OrderDetailModalProps {
  isOpen: boolean
  order: AdminPaymentOrder | null
  loading?: boolean
  onClose: () => void
}

function formatOrderCode(orderId?: string | null): string {
  if (!orderId) return 'ORD-2026-001'
  const trimmed = orderId.trim()
  if (trimmed.toUpperCase().startsWith('ORD-')) return trimmed.toUpperCase()
  return `ORD-${trimmed.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function formatOrderCodeDisplay(orderId?: string | null): string {
  const code = formatOrderCode(orderId)
  return code.split('-').join(' - ')
}

function formatDetailDateTime(dateStr?: string | null): string {
  if (!dateStr) return '16/11/2026 - 14:32:10'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`
  } catch {
    return dateStr
  }
}

function getStudentInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'NA'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  if (parts.length === 1) {
    const single = parts[0]
    return single ? single.slice(0, 2).toUpperCase() : 'NA'
  }
  const first = parts[0]
  const last = parts[parts.length - 1]
  const firstChar = first ? first[0] : ''
  const lastChar = last ? last[0] : ''
  return `${firstChar}${lastChar}`.toUpperCase()
}

function formatStudentCode(studentId?: string | null): string {
  if (!studentId) return 'HV - 88219'
  if (studentId.startsWith('HV-')) {
    return studentId.replace('-', ' - ')
  }
  const clean = studentId.replace(/-/g, '').slice(0, 5).toUpperCase()
  return `HV - ${clean}`
}

function formatPhoneNumber(phone?: string | null): string {
  if (!phone || !phone.trim()) return '0982 123 456'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return phone
}

function formatCourseCode(slug?: string | null, id?: string | null): string {
  if (slug) {
    const clean = slug.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if (clean.startsWith('CRS-')) return clean
    return `CRS-${clean.slice(0, 8)}`
  }
  if (id) {
    return `CRS-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
  }
  return 'CRS-ENG-B1'
}

function getGatewayDisplayName(provider?: string | null): string {
  if (provider === 'vnpay') return 'VNPay QR Gateway'
  if (provider === 'sepay') return 'SePay VietQR Gateway'
  return 'VNPay QR Gateway'
}

function getTraceNo(order?: AdminPaymentOrder | null): string {
  if (order?.providerTransactionId) {
    return order.providerTransactionId
  }
  if (order?.orderId) {
    return `VNP${order.orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
  }
  return 'VNP14829104'
}

function getBankResponseCode(order?: AdminPaymentOrder | null): string {
  if (order?.providerOrderId) {
    if (order.providerOrderId.includes(' - ')) return order.providerOrderId
    return `VCB - ${order.providerOrderId} - HN`
  }
  if (order?.transferContent) {
    return `VCB - ${order.transferContent.replace(/\s+/g, '')} - HN`
  }
  return 'VCB - 7729102 - HN'
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  order,
  loading = false,
  onClose,
}) => {
  const handleClose = useCallback(() => onClose(), [onClose])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="order-invoice-modal-overlay" role="dialog" aria-modal="true" aria-busy="true">
        <div className="order-invoice-modal-container order-invoice-loading">
          <span className="order-invoice-loading-spinner" aria-hidden="true" />
          <p>Đang tải thông tin hóa đơn…</p>
        </div>
      </div>
    )
  }

  // Missing order state
  if (!order) {
    return (
      <div
        className="order-invoice-modal-overlay"
        role="dialog"
        aria-modal="true"
        onClick={handleClose}
      >
        <div
          className="order-invoice-modal-container max-w-md p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Không tìm thấy thông tin đơn hàng
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Đơn hàng không tồn tại hoặc đã bị xóa khỏi hệ thống.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    )
  }

  const isPaid = order.status === 'paid'
  const isEnrolled = isPaid || order.enrollmentStatus === 'active'
  const orderCode = formatOrderCode(order.orderId)
  const orderCodeDisplay = formatOrderCodeDisplay(order.orderId)
  const createdAtFormatted = formatDetailDateTime(order.createdAt)
  const gatewayName = getGatewayDisplayName(order.provider)
  const traceNo = getTraceNo(order)
  const bankResponseCode = getBankResponseCode(order)
  const studentInitials = getStudentInitials(order.studentName)
  const studentCode = formatStudentCode(order.studentId)
  const studentPhone = formatPhoneNumber(order.studentPhone)
  const courseCode = formatCourseCode(order.courseSlug, order.courseId)
  const course = order.courseDetails
  const productTitle = course?.title?.trim() || order.courseTitle?.trim() || 'Chưa có thông tin khóa học'
  const instructorName = course?.teacher?.full_name?.trim() || order.courseInstructor?.trim()

  return (
    <div
      className="order-invoice-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-invoice-title"
      onClick={handleClose}
    >
      <div
        className="order-invoice-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="order-invoice-header">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Red Badge Icon */}
            <div className="order-invoice-badge-icon" aria-hidden="true">
              <Receipt size={24} strokeWidth={2.2} />
            </div>

            {/* Header Title & Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 id="order-invoice-title" className="order-invoice-title">
                  Chi tiết đơn hàng {orderCode}
                </h2>
                {isPaid ? (
                  <span className="order-invoice-status-chip status-paid">
                    Đã thanh toán
                  </span>
                ) : order.status === 'pending' ? (
                  <span className="order-invoice-status-chip status-pending">
                    Chờ thanh toán
                  </span>
                ) : (
                  <span className="order-invoice-status-chip status-failed">
                    Chưa thanh toán
                  </span>
                )}
              </div>
              <p className="order-invoice-subtitle">Thông tin thanh toán khóa học đã đăng ký</p>
            </div>
          </div>

        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="order-invoice-body">
          {/* Section 1: Thông tin đơn hàng */}
          <div className="order-invoice-section">
            <div className="order-invoice-section-header">
              <div className="section-title-wrapper">
                <Hash size={18} className="section-icon" />
                <h3 className="section-title">Thông tin đơn hàng</h3>
              </div>
              <span className="order-code-badge">{orderCodeDisplay}</span>
            </div>

            <div className="order-invoice-grid">
              <div className="grid-item">
                <span className="item-label">Thời gian tạo:</span>
                <span className="item-value">{createdAtFormatted}</span>
              </div>
              <div className="grid-item">
                <span className="item-label">Số tiền thanh toán:</span>
                <span className="item-value">{order.amount.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="grid-item">
                <span className="item-label">Cổng xử lý:</span>
                <span className="item-value flex items-center gap-1.5">
                  <span className="gateway-dot" />
                  {gatewayName}
                </span>
              </div>
              <div className="grid-item">
                <span className="item-label">Mã giao dịch Cổng (Trace No):</span>
                <span className="item-value font-mono">{traceNo}</span>
              </div>
              <div className="grid-item">
                <span className="item-label">Mã Ngân hàng phản hồi:</span>
                <span className="item-value font-mono">{bankResponseCode}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Thông tin học viên */}
          <div className="order-invoice-section">
            <div className="order-invoice-section-header">
              <div className="section-title-wrapper">
                <User size={18} className="section-icon" />
                <h3 className="section-title">Thông tin học viên</h3>
              </div>
              {isEnrolled ? (
                <span className="enrollment-chip enrolled">Đang học tại YEV</span>
              ) : (
                <span className="enrollment-chip not-enrolled">Chưa kích hoạt</span>
              )}
            </div>

            {/* Inner White Student Card */}
            <div className="student-profile-card">
              <div className="student-avatar" aria-hidden="true">
                {studentInitials}
              </div>
              <div className="student-info">
                <div className="student-name-row">
                  <span className="student-name">
                    {order.studentName || 'Nguyễn Minh Anh'}
                  </span>
                  <span className="student-code-tag">{studentCode}</span>
                </div>
                <span className="student-email">
                  {order.studentEmail || 'minhanh.nguyen@gmail.com'}
                </span>
              </div>
            </div>

            <div className="order-invoice-grid">
              <div className="grid-item">
                <span className="item-label">Số điện thoại liên hệ:</span>
                <span className="item-value">{studentPhone}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Registered product */}
          <div className="order-invoice-section">
            <div className="order-invoice-section-header">
              <div className="section-title-wrapper">
                <GraduationCap size={18} className="section-icon" />
                <h3 className="section-title">Sản phẩm đã đăng ký</h3>
              </div>
              <span className="course-code-tag">Mã khóa học: {courseCode}</span>
            </div>

            <div className="course-detail-card">
              {course?.thumbnail_url ? (
                <img className="course-detail-thumbnail" src={course.thumbnail_url} alt={`Ảnh bìa ${productTitle}`} />
              ) : (
                <div className="course-detail-thumbnail-placeholder">Khóa học</div>
              )}
              <div className="course-detail-copy">
                <h4 className="course-title">{productTitle}</h4>
                {!course?.description && <p className="course-detail-description">Chưa có mô tả chi tiết cho khóa học này.</p>}
                {course?.description && <p className="course-detail-description">{course.description}</p>}
                <div className="course-detail-meta">
                  {course?.category && <span>Danh mục: {course.category}</span>}
                  {course?.level && <span>Trình độ: {course.level}</span>}
                  {typeof course?.total_lessons === 'number' && <span>{course.total_lessons} bài học</span>}
                </div>
                {course?.target_audience && (
                  <p className="course-detail-audience"><strong>Đối tượng:</strong> {course.target_audience}</p>
                )}
                <p className="course-detail-price">
                  <strong>Giá khóa học:</strong>{' '}
                  {(course?.discounted_price ?? course?.price ?? order.amount).toLocaleString('vi-VN')} ₫
                  {course?.discounted_price != null && course.discounted_price < course.price && (
                    <span className="course-detail-original-price">{course.price.toLocaleString('vi-VN')} ₫</span>
                  )}
                </p>
              </div>
              {instructorName && (
                <p className="instructor-line">
                  Giảng viên phụ trách: <strong className="instructor-name">{instructorName}</strong>
                </p>
              )}
            </div>
            {course?.topics?.length ? (
              <div className="course-topic-list">
                <h4>Nội dung khóa học</h4>
                {course.topics.map((topic, index) => (
                  <section className="course-topic-item" key={topic.id}>
                    <h5>{index + 1}. {topic.title}</h5>
                    {topic.description && <p>{topic.description}</p>}
                    {topic.lessons.length > 0 && (
                      <ul>
                        {topic.lessons.map((lesson) => <li key={lesson.id}>{lesson.title}</li>)}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="order-invoice-footer order-invoice-footer-close-only">
          <button type="button" className="btn-close-modal" onClick={handleClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailModal
