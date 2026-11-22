import React, { useCallback } from 'react'
import { Search, Calendar } from 'lucide-react'
import type { PaymentFilterState, PaymentOrderStatus } from '../types'

interface OrderFilterBarProps {
  filters: PaymentFilterState
  onFilterChange: (updates: Partial<PaymentFilterState>) => void
}

const STATUS_OPTIONS: { value: PaymentOrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'pending', label: 'Chưa thanh toán' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ search: event.target.value, page: 1 })
    },
    [onFilterChange]
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      onFilterChange({ status: value as PaymentFilterState['status'], page: 1 })
    },
    [onFilterChange]
  )

  const handleCourseChange = useCallback(
    (value: string) => {
      onFilterChange({ courseId: value || undefined, page: 1 })
    },
    [onFilterChange]
  )

  const handleDateChange = useCallback(
    (field: 'dateFrom' | 'dateTo') => {
      return (event: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ [field]: event.target.value, page: 1 })
      }
    },
    [onFilterChange]
  )

  return (
    <div className="filter-section">
      {/* Row 1: Main filters */}
      <div className="filter-row-1">
        {/* Search */}
        <div className="filter-group">
          <label className="filter-label">Tìm kiếm</label>
          <div className="filter-search-wrapper">
            <Search size={18} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, tên học viên, email..."
              value={filters.search}
              onChange={handleSearchChange}
              className="filter-search-input"
            />
          </div>
        </div>

        {/* Payment Status */}
        <div className="filter-group">
          <label className="filter-label">Trạng thái thanh toán</label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="filter-select"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Product */}
        <div className="filter-group">
          <label className="filter-label">Sản phẩm (ebook, khóa học, workshop)</label>
          <select
            value={filters.courseId ?? ''}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả sản phẩm</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="filter-group">
          <label className="filter-label">Thời gian</label>
          <div className="filter-date-wrapper">
            <Calendar size={18} className="filter-date-icon" />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={handleDateChange('dateFrom')}
              className="filter-date-input"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

