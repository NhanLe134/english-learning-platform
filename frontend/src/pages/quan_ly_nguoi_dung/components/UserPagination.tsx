import React from 'react'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationInfo } from '../types'

interface UserPaginationProps {
  pagination: PaginationInfo
  onPageChange: (newPage: number) => void
  onExportCsv: () => void
  exporting?: boolean
}

export const UserPagination: React.FC<UserPaginationProps> = ({
  pagination,
  onPageChange,
  onExportCsv,
  exporting,
}) => {
  const { page, limit, total, totalPages } = pagination

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, total)

  // Generate pagination numbers with ellipsis (e.g., 1, 2, 3, ..., 128)
  const renderPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page, '...', totalPages)
      }
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
            ...
          </span>
        )
      }

      const pageNum = Number(p)
      const isActive = pageNum === page

      return (
        <button
          key={`page-${pageNum}`}
          type="button"
          onClick={() => onPageChange(pageNum)}
          className={`pagination-num-btn ${isActive ? 'active' : ''}`}
        >
          {pageNum}
        </button>
      )
    })
  }

  return (
    <div className="table-footer-bar">
      {/* Left: summary info and Export button */}
      <div className="footer-left-group">
        <span className="footer-count-text">
          Hiển thị <strong>{startRecord} - {endRecord}</strong> trên tổng số{' '}
          <strong>{total.toLocaleString()}</strong> người dùng
        </span>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exporting}
          className="export-csv-btn"
        >
          <Download size={15} className="export-icon" />
          <span>{exporting ? 'Đang xuất file...' : 'Xuất Excel / CSV'}</span>
        </button>
      </div>

      {/* Right: pagination buttons */}
      <div className="footer-right-pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="pagination-nav-btn prev-btn"
        >
          <ChevronLeft size={16} />
          <span>Trước</span>
        </button>

        <div className="pagination-numbers-list">{renderPageNumbers()}</div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="pagination-nav-btn next-btn"
        >
          <span>Kế tiếp</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
