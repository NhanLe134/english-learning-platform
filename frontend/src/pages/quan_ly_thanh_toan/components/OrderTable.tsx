import React from 'react'
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

const getStatusLabel = (status: PaymentOrderStatus) => {
  const labels: Record<PaymentOrderStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    expired: 'Expired',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  }
  return labels[status]
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
              <th className="th-course">SẢN PHẨM</th>
              <th className="th-amount">SỐ TIỀN (VND)</th>
              <th className="th-date">THỜI GIAN</th>
              <th className="th-status">TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isSelected = selectedOrderIds.has(order.orderId)
              return (
                <tr
                  key={order.orderId}
                  className={`order-row ${isSelected ? 'bg-brand-50' : ''}`}
                  tabIndex={0}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('input, button, a')) return
                    onViewDetail(order)
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onViewDetail(order)
                    }
                  }}
                >
                  {/* 1. Checkbox */}
                  <td className="td-checkbox text-center">
                    <input
                      type="checkbox"
                      className="checkbox-all"
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(e) => onSelectOrder?.(order.orderId, e.target.checked)}
                    />
                  </td>

                  {/* 2. Order ID */}
                  <td className="td-order">
                    <div className="order-info-group">
                      <span className="order-id">
                        {order.orderId}
                      </span>
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

                  {/* Date */}
                  <td className="td-date">
                    {formatDateTime(order.createdAt)}
                  </td>

                  <td className="td-status">
                    <span className={`order-status-label status-${order.status}`}>
                      {getStatusLabel(order.status)}
                    </span>
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
