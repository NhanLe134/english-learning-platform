import { useState } from 'react'
import {
  AudioLines,
  Check,
  Flame,
  Layers3,
  Play,
  UserRound,
  Zap,
} from 'lucide-react'
import { useAuth } from './auth-context'

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? ' brand-mark-small' : ''}`} aria-hidden="true">
      <Layers3 size={small ? 16 : 19} strokeWidth={2.5} />
    </span>
  )
}

export function SiteHeader() {
  const { user, logout, reportError } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

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
        <a className="brand" href="/" aria-label="EngMaster - Trang chủ">
          <BrandMark />
          <span>EngMaster</span>
        </a>

        <nav className="header-nav" aria-label="Điều hướng chính">
          <a href="/">Trang chủ</a>
          <a href="#ve-chung-toi">Về chúng tôi</a>
          <a href="#khoa-hoc">Khóa học</a>
          <a href="#ebook">Ebook</a>
          <a href="#lien-he">Liên hệ</a>
        </nav>

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
      </div>
    </header>
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
