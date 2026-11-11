import {
  AudioLines,
  Check,
  Flame,
  GraduationCap,
  Layers3,
  Play,
  Zap,
} from 'lucide-react'
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

export { SiteHeader, type SiteHeaderProps } from '../../components/layout/SiteHeader'
export { SiteFooter } from '../../components/layout/SiteFooter'

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
