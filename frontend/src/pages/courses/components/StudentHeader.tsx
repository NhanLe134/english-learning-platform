import React, { useEffect, useState } from 'react'
import {
  Layers,
  Bell,
  LogOut,
  Settings,
  Menu,
  X,
  BookOpen,
  Users,
  FileText,
  Compass,
} from 'lucide-react'
import type { StudentProfile } from '../student-courses-data'
import { getRoleHomePath, useAuth } from '../../auth/auth-context'
import { formatUserRoleVietnamese } from '../../auth/vietnamese-messages'

export type StudentNavActivePage = 'my-courses' | 'other-courses' | 'ebook' | 'workshop'

interface StudentHeaderProps {
  student?: StudentProfile
  onLogout?: () => void
  activePage?: StudentNavActivePage
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ student, onLogout, activePage = 'my-courses' }) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showDrawerNotifications, setShowDrawerNotifications] = useState(false)

  const { user, logout } = useAuth()
  const homeHref = getRoleHomePath(user?.role)

  const displayName = user?.fullName || student?.name || 'Học viên'
  const displayEmail = user?.email || student?.email || ''
  const displayRole = formatUserRoleVietnamese(user?.role || student?.role)
  const displayAvatar = student?.avatarUrl?.trim() || user?.avatarUrl?.trim() || null
  const showAvatarImage = Boolean(displayAvatar && failedAvatarUrl !== displayAvatar)

  // Close drawer on Escape key and lock background body scroll
  useEffect(() => {
    if (!drawerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawerOpen])

  const handleLogoutAction = async () => {
    setDrawerOpen(false)
    setShowProfileMenu(false)
    if (onLogout) {
      onLogout()
    } else {
      try {
        await logout()
      } catch {
        // ignore
      }
      window.location.replace('/login')
    }
  }

  const notifications = [
    {
      id: '1',
      title: 'Nhắc nhở học tập',
      message: 'Bạn có bài học tiếp theo trong khóa Ngữ pháp Tiếng Anh.',
      time: '15 phút trước',
      unread: true,
    },
    {
      id: '2',
      title: 'Phân tích AI hoàn tất',
      message: 'Đã cập nhật 3 điểm cần cải thiện trong phần phát âm.',
      time: '2 giờ trước',
      unread: true,
    },
    {
      id: '3',
      title: 'Kỷ lục chuỗi ngày',
      message: 'Chúc mừng bạn đã đạt chuỗi 14 ngày học liên tiếp!',
      time: 'Hôm qua',
      unread: false,
    },
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <>
      <header className="student-navbar">
        <div className="student-navbar-container">
          {/* Brand Logo */}
          <a href={homeHref} className="student-navbar-brand">
            <span className="student-navbar-logo-icon">
              <Layers size={18} strokeWidth={2.5} />
            </span>
            <span className="student-navbar-brand-name">Your English Voice</span>
          </a>

          {/* Desktop Center Nav Links */}
          <nav className="student-navbar-links" aria-label="Điều hướng chính">
            <a
              href="/my-courses"
              className={`student-nav-link${activePage === 'my-courses' ? ' active' : ''}`}
              aria-current={activePage === 'my-courses' ? 'page' : undefined}
            >
              {'Khóa học'}
            </a>
            <a
              href="/workshops"
              className={`student-nav-link${activePage === 'workshop' ? ' active' : ''}`}
              aria-current={activePage === 'workshop' ? 'page' : undefined}
            >
              Workshop
            </a>
            <a
              href="/ebooks"
              className={`student-nav-link${activePage === 'ebook' ? ' active' : ''}`}
              aria-current={activePage === 'ebook' ? 'page' : undefined}
            >
              Ebook
            </a>
            <a
              href="/course"
              className={`student-nav-link${activePage === 'other-courses' ? ' active' : ''}`}
              aria-current={activePage === 'other-courses' ? 'page' : undefined}
            >
              {'Các khóa học khác'}
            </a>
          </nav>

          {/* Desktop Right Actions */}
          <div className="student-navbar-actions">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                className="student-notification-btn"
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowProfileMenu(false)
                }}
                aria-label="Thông báo"
              >
                <Bell size={17} />
                {unreadCount > 0 && <span className="notification-unread-dot" />}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 px-1">
                    <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                      Thông báo mới
                    </h4>
                    <span className="text-[11px] text-brand-600 font-semibold cursor-pointer hover:underline">
                      Đánh dấu đã đọc
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl transition-colors ${
                          n.unread ? 'bg-brand-50/70' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-ink-900">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-ink-400 font-normal">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <div
                className="student-user-profile"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu)
                  setShowNotifications(false)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setShowProfileMenu(!showProfileMenu)
                  }
                }}
              >
                {showAvatarImage && displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="student-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedAvatarUrl(displayAvatar)}
                  />
                ) : (
                  <span className="student-avatar-img student-avatar-fallback" aria-label={displayName}>
                    {displayName.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                )}
                <div className="student-user-info">
                  <span className="student-user-name">{displayName}</span>
                  <span className="student-user-role">{displayRole}</span>
                </div>
              </div>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs font-bold text-ink-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-ink-500 truncate" title={displayEmail}>{displayEmail}</p>
                  </div>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Settings size={14} />
                    <span>Cài đặt tài khoản</span>
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                    onClick={handleLogoutAction}
                  >
                    <LogOut size={14} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="student-hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu điều hướng"
            aria-expanded={drawerOpen}
            aria-controls="student-mobile-drawer"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop */}
      <div
        className={`student-drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      <aside
        id="student-mobile-drawer"
        className={`student-mobile-drawer ${drawerOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        {/* Drawer Header */}
        <div className="student-drawer-header">
          <div className="student-drawer-header-brand">
            <span className="student-navbar-logo-icon">
              <Layers size={18} strokeWidth={2.5} />
            </span>
            <span className="student-navbar-brand-name">Your English Voice</span>
          </div>
          <button
            type="button"
            className="student-drawer-close-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="student-drawer-body">
          {/* Section A: User Account Profile */}
          <section className="student-drawer-profile-card" aria-label="Thông tin tài khoản">
            <div className="student-drawer-profile-main">
              {showAvatarImage && displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="student-drawer-avatar"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedAvatarUrl(displayAvatar)}
                />
              ) : (
                <span className="student-drawer-avatar student-drawer-avatar-fallback">
                  {displayName.trim().charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <div className="student-drawer-profile-meta">
                <span className="student-drawer-profile-name">{displayName}</span>
                <span className="student-drawer-role-badge">{displayRole}</span>
                {displayEmail && (
                  <span className="student-drawer-profile-email" title={displayEmail}>
                    {displayEmail}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Section B: Navigation Links */}
          <nav className="student-drawer-nav" aria-label="Menu chính">
            <div className="student-drawer-nav-group-title">Menu Điều Hướng</div>
            <a
              href="/my-courses"
              className={`student-drawer-nav-item ${activePage === 'my-courses' ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <BookOpen size={18} className="student-drawer-nav-icon" />
              <span className="student-drawer-nav-label">Khóa học</span>
              {activePage === 'my-courses' && <span className="student-drawer-active-pill" />}
            </a>
            <a
              href="/workshops"
              className={`student-drawer-nav-item ${activePage === 'workshop' ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Users size={18} className="student-drawer-nav-icon" />
              <span className="student-drawer-nav-label">Workshop</span>
              {activePage === 'workshop' && <span className="student-drawer-active-pill" />}
            </a>
            <a
              href="/ebooks"
              className={`student-drawer-nav-item ${activePage === 'ebook' ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <FileText size={18} className="student-drawer-nav-icon" />
              <span className="student-drawer-nav-label">Ebook</span>
              {activePage === 'ebook' && <span className="student-drawer-active-pill" />}
            </a>
            <a
              href="/course"
              className={`student-drawer-nav-item ${activePage === 'other-courses' ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Compass size={18} className="student-drawer-nav-icon" />
              <span className="student-drawer-nav-label">Các khóa học khác</span>
              {activePage === 'other-courses' && <span className="student-drawer-active-pill" />}
            </a>
          </nav>

          {/* Section C: Account Actions */}
          <section className="student-drawer-actions" aria-label="Tác vụ tài khoản">
            <div className="student-drawer-nav-group-title">Tài Khoản & Tiện Ích</div>

            {/* Notifications Toggle */}
            <button
              type="button"
              className="student-drawer-action-btn"
              onClick={() => setShowDrawerNotifications(!showDrawerNotifications)}
              aria-expanded={showDrawerNotifications}
            >
              <div className="student-drawer-action-left">
                <Bell size={18} className="student-drawer-action-icon" />
                <span>Thông báo</span>
              </div>
              {unreadCount > 0 && (
                <span className="student-drawer-unread-count">{unreadCount}</span>
              )}
            </button>

            {/* Notifications Drawer Sublist */}
            {showDrawerNotifications && (
              <div className="student-drawer-notifications-panel">
                <div className="student-drawer-notifications-header">
                  <span>Thông báo mới ({unreadCount})</span>
                </div>
                <div className="student-drawer-notifications-list">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`student-drawer-notification-item ${
                        item.unread ? 'unread' : ''
                      }`}
                    >
                      <div className="student-drawer-notification-top">
                        <span className="student-drawer-notification-title">{item.title}</span>
                        <span className="student-drawer-notification-time">{item.time}</span>
                      </div>
                      <p className="student-drawer-notification-msg">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <button
              type="button"
              className="student-drawer-action-btn"
              onClick={() => {
                setDrawerOpen(false)
              }}
            >
              <div className="student-drawer-action-left">
                <Settings size={18} className="student-drawer-action-icon" />
                <span>Cài đặt tài khoản</span>
              </div>
            </button>

            {/* Logout */}
            <button
              type="button"
              className="student-drawer-action-btn student-drawer-logout-btn"
              onClick={handleLogoutAction}
            >
              <div className="student-drawer-action-left">
                <LogOut size={18} className="student-drawer-action-icon" />
                <span>Đăng xuất</span>
              </div>
            </button>
          </section>
        </div>
      </aside>
    </>
  )
}
