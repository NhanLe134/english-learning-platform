import React from 'react'
import { Bell, ChevronRight } from 'lucide-react'

export const TopHeader: React.FC = () => {
  return (
    <header className="engmaster-top-header">
      {/* Breadcrumb navigation */}
      <div className="header-breadcrumb">
        <span className="breadcrumb-parent">Hệ thống</span>
        <ChevronRight size={14} className="breadcrumb-arrow" />
        <span className="breadcrumb-current">Quản lý người dùng</span>
      </div>

      {/* Header right: Notifications & Admin Profile */}
      <div className="header-actions">
        {/* Notification Bell */}
        <button
          type="button"
          className="header-notification-btn"
          title="Thông báo"
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        {/* Current Admin User Profile */}
        <div className="header-admin-profile">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
            alt="Nguyễn Thanh Tùng"
            className="admin-avatar"
          />
          <div className="admin-info">
            <span className="admin-name">Nguyễn Thanh Tùng</span>
            <span className="admin-role">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
