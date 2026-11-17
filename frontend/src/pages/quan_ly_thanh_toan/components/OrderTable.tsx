import React from 'react'
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
} from 'lucide-react'
import type { AdminPaymentOrder, PaymentOrderStatus } from '../types'

interface OrderTableProps {
  orders: AdminPaymentOrder[]
  loading?: boolean
  startIndex?: number
  onViewDetail: (order: AdminPaymentOrder) => void
  onSelectAll?: (checked: boolean) => void
  onSelectOrder?: (orderId: string, checked: boolean) => void
  selectedOrderIds: Set<string>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

const renderPaymentStatusBadge = (status: PaymentOrderStatus) => {
  const config: Record<
    PaymentOrderStatus,
    { label: string; icon: React.FC<{ size?: number }> }
  > = {
    pending: { label: 'Chưa thanh toán', icon: Clock },
    paid: { label: 'Đã thanh toán', icon: CheckCircle2 },
    failed: { label: 'Thất bại', icon: Clock },
    expired: { label: 'Thất bại', icon: Clock },
    cancelled: { label: 'Đã hủy', icon: Clock },
    refunded: { label: 'Đã hoàn tiền', icon: Clock },
  }
  const Icon = config[status]?.icon || Clock
  const badgeClass =
    status === 'paid'
      ? 'order-status-badge status-paid'
      : status === 'pending'
        ? 'order-status-badge status-pending'
        : status === 'failed' || status === 'expired'
          ? 'order-status-badge status-failed'
          : 'order-status-badge status-refunded'
  return (
    <span className={badgeClass}>
      <span className="status-icon"><Icon size={12} /></span>
      {config[status]?.label || status}
    </span>
  )
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  onViewDetail,
  onSelectAll,
  onSelectOrder,
  selectedOrderIds,
}) => {
  const isAllSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.orderId))

  if (loading) {
    return (
      <div className="order-table-card">
        <div className="table-loading-cell">
          <span>Đang tải danh sách đơn hàng thanh toán…</span>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="order-table-card">
        <div className="table-empty-cell">
          <p>Không tìm thấy đơn hàng thanh toán nào phù hợp với bộ lọc.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="order-table-card">
      <div className="table-responsive">
        <table className="order-table">
          <thead>
            <tr>
              <th className="th-checkbox text-center">
                <input
                  type="checkbox"
                  className="checkbox-all"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                />
              </th>
              <th className="th-order">MÃ ĐƠN HÀNG</th>
              <th className="th-student">HỌC VIÊN</th>
              <th className="th-course">KHÓA HỌC</th>
              <th className="th-amount">SỐ TIỀN (VND)</th>
              <th className="th-method">CỔNG THANH TOÁN</th>
              <th className="th-date">THỜI GIAN</th>
              <th className="th-status">TRẠNG THÁI</th>
              <th className="th-actions text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isSelected = selectedOrderIds.has(order.orderId)
              return (
                <tr
                  key={order.orderId}
                  className={`order-row ${isSelected ? 'bg-brand-50' : ''}`}
                >
                  {/* 1. Checkbox */}
                  <td className="td-checkbox text-center">
                    <input
                      type="checkbox"
                      className="checkbox-all"
                      checked={isSelected}
                      onChange={(e) => onSelectOrder?.(order.orderId, e.target.checked)}
                    />
                  </td>

                  {/* 2. Order ID */}
                  <td className="td-order">
                    <div className="order-info-group">
                      <span
                        className="order-id cursor-pointer hover:underline hover:text-brand-600 transition-colors"
                        onClick={() => onViewDetail(order)}
                        role="button"
                        tabIndex={0}
                        title="Xem chi tiết đơn hàng"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            onViewDetail(order)
                          }
                        }}
                      >
                        {order.orderId}
                      </span>
                      <span className="order-transfer">Mã: {order.transferContent}</span>
                    </div>
                  </td>

                  {/* 3. Student */}
                  <td className="td-student">
                    <div className="student-info-group">
                      <span className="student-name">{order.studentName}</span>
                      <span className="student-email">{order.studentEmail}</span>
                    </div>
                  </td>

                  {/* 4. Course */}
                  <td className="td-course">
                    <div className="course-info-group">
                      <span className="course-title">{order.courseTitle}</span>
                    </div>
                  </td>

                  {/* 5. Amount */}
                  <td className="td-amount">
                    <span className="order-amount">{formatCurrency(order.amount)}</span>
                  </td>

                  {/* 6. Payment Method */}
                  <td className="td-method">
                    <span className="payment-method">
                      {order.providerTransactionId ? (
                        <>
                          <FileText size={12} className="method-icon" />
                          SePay
                        </>
                      ) : (
                        <>
                          <FileText size={12} className="method-icon" />
                          Chuyển khoản
                        </>
                      )}
                    </span>
                  </td>

                  {/* 7. Date */}
                  <td className="td-date">
                    {formatDateTime(order.createdAt)}
                  </td>

                  {/* 8. Payment Status */}
                  <td className="td-status">
                    {renderPaymentStatusBadge(order.status)}
                  </td>

                  {/* 9. Actions */}
                  <td className="td-actions text-center align-middle">
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="action-btn-icon"
                        title="Xem chi tiết đơn hàng"
                        onClick={() => onViewDetail(order)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        className="action-btn-icon"
                        title="Xem thông tin giao dịch"
                      >
                        <FileText size={16} />
                      </button>

                      <button
                        type="button"
                        className="action-btn-icon"
                        title="Thao tác thêm"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
