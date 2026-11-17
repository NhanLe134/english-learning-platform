import React, { useState } from 'react'
import { Layers, Bell, LogOut, Settings } from 'lucide-react'
import type { StudentProfile } from '../student-courses-data'
import { useAuth } from '../../auth/auth-context'

interface StudentHeaderProps {
  student?: StudentProfile
  onLogout?: () => void
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ student, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { user, logout } = useAuth()

  const displayName = user?.fullName || student?.name || 'Sarah'
  const displayEmail = user?.email || student?.email || 'sarah.student@yev.edu.vn'
  const displayRole = user?.role === 'STUDENT' ? 'Member' : (user?.role || student?.role || 'Member')
  const displayAvatar = student?.avatarUrl || '/giaovien.jpg'

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

  return (
    <header className="student-navbar">
      <div className="student-navbar-container">
        {/* Brand Logo */}
        <a href="/" className="student-navbar-brand">
          <span className="student-navbar-logo-icon">
            <Layers size={18} strokeWidth={2.5} />
          </span>
          <span className="student-navbar-brand-name">Your English Voice</span>
        </a>

        {/* Center Nav Links */}
        <nav className="student-navbar-links">
          <a href="/my-courses" className="student-nav-link active">
            Khóa học
          </a>
          <a href="/workshops" className="student-nav-link">
            Workshop
          </a>
        </nav>

        {/* Right Actions */}
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
              <span className="notification-unread-dot" />
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
                        n.unread ? 'bg-rose-50/60' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-ink-900">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-ink-400 font-normal">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-600 mt-0.5 leading-snug">
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
              <img
                src={displayAvatar}
                alt={displayName}
                className="student-avatar-img"
              />
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  onClick={async () => {
                    setShowProfileMenu(false)
                    if (onLogout) {
                      onLogout()
                    } else {
                      try {
                        await logout()
                      } catch {
                        // ignore
                      }
                      window.location.assign('/login')
                    }
                  }}
                >
                  <LogOut size={14} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
