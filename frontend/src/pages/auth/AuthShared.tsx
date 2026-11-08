import { useState } from 'react'
import {
  AudioLines,
  Check,
  Flame,
  GraduationCap,
  Layers3,
  Menu,
  Play,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from './auth-context'
import './auth-shared.css'

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? ' brand-mark-small' : ''}`} aria-hidden="true">
      <Layers3 size={small ? 16 : 19} strokeWidth={2.5} />
    </span>
  )
}

export interface SiteNavigationItem {
  label: string
  href: string
}

interface SiteHeaderProps {
  brandName?: string
  navigationItems?: SiteNavigationItem[]
}

const defaultNavigationItems: SiteNavigationItem[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Các khóa học', href: '/courses' },
  { label: 'Ebook', href: '/#ebook' },
  { label: 'Workshop', href: '/#workshop' },
  { label: 'Liên hệ', href: '/#lien-he' },
]

export function SiteHeader({
  brandName = 'Your English Voice',
  navigationItems = defaultNavigationItems,
}: SiteHeaderProps) {
  const { user, logout, reportError } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleAccountClick() {
    if (!user) {
      window.location.assign('/login')
      return
    }

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
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label={`${brandName} - Trang chủ`}>
          <BrandMark />
          <span>{brandName}</span>
        </a>

        <nav id="site-navigation" className={`header-nav${menuOpen ? ' is-open' : ''}`} aria-label="Điều hướng chính">
          {navigationItems.map((item) => (
            <a href={item.href} key={item.label}>{item.label}</a>
          ))}
          {!user && <a className="header-mobile-register" href="/register">Đăng ký</a>}
        </nav>

        {!user && <a className="header-register-link" href="/register">Đăng ký</a>}
        <button
          type="button"
          className="avatar-button"
          aria-label={user ? 'Đăng xuất' : 'Tài khoản'}
          title={user ? `Đăng xuất ${user.email}` : 'Tài khoản'}
          onClick={() => void handleAccountClick()}
          disabled={loggingOut}
        >
          <UserRound size={16} />
        </button>
        <button
          type="button"
          className="header-menu-button"
          aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}

export function GoogleAuthButton({
  onClick,
  disabled = false,
  loading = false,
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      className="google-login-button"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <img className="google-login-image" src="/google-g-logo.png" alt="" aria-hidden="true" />
      {loading ? 'Đang kết nối Google…' : 'Tiếp tục với Gmail'}
    </button>
  )
}

export function LoginVisual() {
  return (
    <section className="login-visual" aria-label="Your English Voice">
      <div className="visual-brand">
        <span className="visual-brand-icon"><GraduationCap size={21} strokeWidth={2.2} /></span>
        <span>
          <strong>Your English Voice</strong>
        </span>
      </div>

      <div className="visual-content">
        <div className="visual-program-tag">
          <Check size={12} strokeWidth={3} />
          Lộ trình CEFR &amp; IELTS chuẩn hóa
        </div>
        <p className="visual-quote">
          “Nâng tầm phản xạ giao tiếp &amp; tư duy học thuật toàn diện.”
        </p>
        <div className="visual-social-proof">
          <div className="student-avatars" aria-hidden="true">
            <span>VK</span><span>UI</span><span>US</span>
          </div>
          <span>Hơn <strong>12.500+</strong> học viên tích cực trên toàn quốc</span>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter({ brandName = 'Your English Voice' }: { brandName?: string }) {
  return (
    <footer className="auth-site-footer">
      <div className="auth-footer-inner">
        <div className="auth-footer-brand">
          <a className="brand" href="/" aria-label={`${brandName} - Trang chủ`}>
            <BrandMark small />
            <span>{brandName}</span>
          </a>
          <p>Đưa tiếng nói của người Việt ra thế giới.</p>
        </div>
        <div>
          <h2>Thông tin liên hệ</h2>
          <a href="#lien-he">Liên hệ với chúng tôi</a>
          <a href="#ho-tro">Hỗ trợ học viên</a>
        </div>
        <div>
          <h2>Chương trình</h2>
          <a href="#phat-am">Phát âm tiếng Anh</a>
          <a href="#tu-vung">Từ vựng tiếng Anh</a>
          <a href="#ngu-phap">Ngữ pháp tiếng Anh</a>
        </div>
        <div>
          <h2>Hỗ trợ &amp; Pháp lý</h2>
          <a href="/about">Về chúng tôi</a>
          <a href="#chinh-sach-bao-mat">Chính sách bảo mật</a>
          <a href="#dieu-khoan">Điều khoản sử dụng</a>
        </div>
      </div>
    </footer>
  )
}

export function LearningIllustration() {
  return (
    <div className="learning-illustration" aria-label="Minh họa hành trình học tiếng Anh">
      <span className="illustration-soft-square" />

      <div className="lesson-bubble">
        <strong>“Bứt Phá Phản Xạ”</strong>
        <span>Từ vựng • Ngữ pháp • Nói tự nhiên</span>
      </div>

      <div className="score-widget">
        <span className="widget-check"><Check size={12} strokeWidth={3} /></span>
        <span><strong>IELTS 8.5</strong><small>Mục tiêu đạt được</small></span>
      </div>

      <div className="pronunciation-widget">
        <span className="play-icon"><Play size={10} fill="currentColor" /></span>
        <AudioLines size={17} className="sound-icon" />
        <span>Âm chuẩn bản ngữ</span>
      </div>

      <svg className="open-book" viewBox="0 0 150 92" role="img" aria-label="Sách đang mở">
        <path d="M75 16C55 5 27 8 7 15v57c21-7 46-9 68 1V16Z" />
        <path d="M75 16c20-11 48-8 68-1v57c-21-7-46-9-68 1V16Z" />
        <path d="M75 17v55" />
        <path d="M74 72v13l6 6V72" className="book-ribbon" />
        <path d="M20 34h37M20 44h37M93 34h37M93 44h37" className="book-lines" />
      </svg>

      <div className="streak-widget">
        <strong>Chuỗi học tập</strong>
        <span><Flame size={12} fill="currentColor" /> 45 Ngày liên tục</span>
      </div>
    </div>
  )
}

export function AuthIntro() {
  return (
    <section className="intro-column" aria-labelledby="intro-title">
      <LearningIllustration />
      <div className="program-badge">
        <span />
        CHƯƠNG TRÌNH ĐÀO TẠO CHUẨN QUỐC TẾ
      </div>
      <h1 id="intro-title">
        Chinh Phục Tiếng Anh
        <span>Tự Tin &amp; Đột Phá.</span>
      </h1>
      <p className="intro-description">
        Phương pháp phản xạ bản ngữ chuẩn quốc tế dành cho người bận rộn. Xây dựng sự tự tin và bứt phá mục tiêu ngôn ngữ của bạn.
      </p>
      <ul className="feature-list">
        <li><Check size={13} /> Cam kết chuẩn CEFR (A1 – C2)</li>
        <li><AudioLines size={13} /> Luyện phát âm chuẩn bản ngữ</li>
        <li><Zap size={13} /> Lộ trình cá nhân hóa tinh gọn</li>
      </ul>
    </section>
  )
}
