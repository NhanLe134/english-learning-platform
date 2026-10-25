import React, { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../../auth/auth-context'

export const TopHeader: React.FC = () => {
  const { user, logout, reportError } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const email = user?.email ?? ''
  const displayName = email
    ? (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
    : 'Quản trị viên'

  useEffect(() => {
    if (!profileMenuOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileMenuOpen])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      window.location.assign('/login')
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Đăng xuất không thành công.')
    } finally {
      setLoggingOut(false)
    }
  }

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
          aria-label="Thông báo"
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div className="header-profile-menu" ref={profileRef}>
          <button
            type="button"
            className="admin-profile-trigger"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            aria-label="Mở menu tài khoản"
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <span className="admin-avatar admin-avatar-initial" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="admin-info">
              <span className="admin-name">{displayName}</span>
              <span className="admin-role">{user?.role ?? 'ADMIN'}</span>
            </span>
            <ChevronDown size={15} className="profile-menu-chevron" aria-hidden="true" />
          </button>

          {profileMenuOpen && (
            <div className="profile-menu" role="menu" aria-label="Tài khoản">
              <div className="profile-menu-details">
                <span className="profile-menu-name">{displayName}</span>
                <span className="profile-menu-email">{email || 'Chưa có email'}</span>
                <span className="profile-menu-role">{user?.role ?? 'ADMIN'}</span>
              </div>
              <button
                type="button"
                className="profile-menu-logout"
                role="menuitem"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                <span>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
