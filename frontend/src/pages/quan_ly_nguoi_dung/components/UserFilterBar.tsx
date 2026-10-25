import React, { useEffect, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import type { UserFilterState, UserRole, UserStatus } from '../types'

interface UserFilterBarProps {
  filters: UserFilterState
  totalUsers: number
  onFilterChange: (updates: Partial<UserFilterState>) => void
}

export const UserFilterBar: React.FC<UserFilterBarProps> = ({
  filters,
  totalUsers,
  onFilterChange,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Listen for Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="user-filter-bar">
      {/* Search Input */}
      <div className="filter-search-wrapper">
        <Search className="search-icon" size={18} />
        <input
          ref={searchInputRef}
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
          placeholder="Tìm kiếm theo Tên, Email, SĐT, Nickname..."
          className="search-input"
        />
      </div>

      {/* Role Dropdown */}
      <div className="filter-select-wrapper">
        <select
          value={filters.role}
          onChange={(e) =>
            onFilterChange({ role: e.target.value as 'ALL' | UserRole, page: 1 })
          }
          className="filter-select"
        >
          <option value="ALL">Tất cả vai trò</option>
          <option value="STUDENT">Học viên</option>
          <option value="TEACHER">Giáo viên</option>
          <option value="ADMIN">Admin</option>
        </select>
        <ChevronDown className="select-arrow" size={16} />
      </div>

      {/* Status Dropdown */}
      <div className="filter-select-wrapper">
        <select
          value={filters.status}
          onChange={(e) =>
            onFilterChange({ status: e.target.value as 'ALL' | UserStatus, page: 1 })
          }
          className="filter-select"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Bị khóa / Vi phạm</option>
          <option value="pending">Chờ kích hoạt</option>
        </select>
        <ChevronDown className="select-arrow" size={16} />
      </div>

      {/* Total user counter */}
      <div className="filter-counter">
        <span className="counter-divider"></span>
        <span className="counter-text">
          <strong>{totalUsers.toLocaleString()}</strong> người dùng
        </span>
      </div>
    </div>
  )
}
