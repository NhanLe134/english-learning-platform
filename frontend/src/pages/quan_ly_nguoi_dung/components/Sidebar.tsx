import React from 'react'
import { Users, BookOpen, GraduationCap, BarChart3, Layers, CreditCard, CalendarDays } from 'lucide-react'

interface SidebarProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'quan_ly_nguoi_dung',
  onTabChange,
}) => {
  const menuItems: {
    id: string
    label: string
    icon: typeof Users
    badgeDot: boolean
    href?: string
  }[] = [
    {
      id: 'quan_ly_nguoi_dung',
      label: 'Quản lý người dùng',
      icon: Users,
      badgeDot: true,
      href: '/admin/users',
    },
    {
      id: 'khoa_hoc_bai_tap',
      label: 'Khoá học & Bài tập',
      icon: BookOpen,
      badgeDot: false,
      href: '/admin/courses',
    },
    {
      id: 'daily_word',
      label: 'Daily Word & Lịch đăng',
      icon: CalendarDays,
      badgeDot: false,
      href: '/admin/daily-word',
    },
    {
      id: 'lop_hoc_giang_day',
      label: 'Lớp học & Giảng dạy',
      icon: GraduationCap,
      badgeDot: false,
      // Chưa có trang — chưa gắn href
    },
    {
      id: 'bao_cao_thong_ke',
      label: 'Báo cáo & Thống kê',
      icon: BarChart3,
      badgeDot: false,
      // Chưa có trang — chưa gắn href
    },
    {
      id: 'thanh_toan',
      label: 'Quản lý thanh toán',
      icon: CreditCard,
      badgeDot: false,
      href: '/admin/payments',
    },
  ]

  return (
    <aside className="engmaster-sidebar">
      {/* Brand Logo */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <Layers size={22} className="logo-svg-icon" />
        </div>
        <span className="brand-title">EngMaster</span>
      </div>

      {/* Navigation section */}
      <div className="sidebar-nav-section">
        <div className="nav-section-title">HỆ THỐNG QUẢN TRỊ</div>
        <nav className="nav-items-list">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (item.href) window.location.assign(item.href)
                  onTabChange?.(item.id)
                }}
              >
                <div className="nav-item-left">
                  <Icon size={18} className="nav-item-icon" />
                  <span className="nav-item-label">{item.label}</span>
                </div>
                {item.badgeDot && <span className="nav-item-red-dot" />}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
