import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationInfo } from '../types'

interface OrderPaginationProps {
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export const OrderPagination: React.FC<OrderPaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
}) => {
  const { page, total, totalPages, limit } = pagination

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return
    onPageChange(targetPage)
  }

  if (totalPages <= 1) return null

  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  // Build page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: Array<number | string> = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    const left = Math.max(1, page - 2)
    const right = Math.min(totalPages, page + 2)

    pages.push(1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    pages.push(totalPages)

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="order-pagination">
      <div className="pagination-info">
        Hiển thị {startItem}–{endItem} trong tổng số {total.toLocaleString('vi-VN')} đơn hàng
      </div>

      {onPageSizeChange && (
        <div className="pagination-page-size">
          <span>Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>đơn/trang</span>
        </div>
      )}

      <div className="pagination-controls">
        <button
          type="button"
          disabled={page <= 1}
          className="pagination-btn pagination-btn-prev"
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft size={16} /> Trang trước
        </button>

        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={idx} className="pagination-ellipsis">
                …
              </span>
            )
          }
          return (
            <button
              key={p}
              type="button"
              className={`pagination-btn ${p === page ? 'pagination-btn active' : ''}`}
              onClick={() => goToPage(p as number)}
            >
              {p}
            </button>
          )
        })}

        <button
          type="button"
          disabled={page >= totalPages}
          className="pagination-btn pagination-btn-next"
          onClick={() => goToPage(page + 1)}
        >
          Trang sau <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
