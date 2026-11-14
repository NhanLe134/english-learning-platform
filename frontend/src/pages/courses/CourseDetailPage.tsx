import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Clock3,
  Download,
  Headphones,
  Play,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { createRegistrationUrl, type CourseReference } from './course-data'
import { courseCatalogApi } from './services/courseCatalogApi'
import './course-detail-page.css'

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`

export function CourseDetailPage({ identifier }: { identifier: string }) {
  const [expandedModules, setExpandedModules] = useState<number[]>([])
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void courseCatalogApi.get(identifier)
      .then((loadedCourse) => {
        if (active) setCourse(loadedCourse)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setCourse(null)
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải thông tin khóa học.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [identifier])

  function toggleModule(index: number) {
    setExpandedModules((expanded) => expanded.includes(index)
      ? expanded.filter((item) => item !== index)
      : [...expanded, index])
  }

  function register() {
    if (course) window.location.assign(createRegistrationUrl(course))
  }

  return (
    <div className="course-detail-page">
      <SiteHeader activeTab="courses" />

      <main className="course-detail-main">
        <nav className="course-detail-breadcrumb" aria-label="Điều hướng đường dẫn">
          <a href="/">Trang chủ</a><span>›</span><a href="/courses">Khóa học</a>
          <span>›</span><span>{course?.title ?? 'Chi Tiết Khóa Học'}</span>
        </nav>

        {error && <div className="course-detail-error" role="alert">{error}</div>}
        {loading && <div className="course-detail-loading" role="status">Đang tải thông tin khóa học…</div>}
        {!loading && !course && (
          <div className="course-detail-error" role="alert">
            Không tìm thấy khóa học hoặc khóa học không còn mở đăng ký. <a href="/courses">Quay lại danh sách khóa học</a>
          </div>
        )}

        {course && (() => {
          const discount = Math.max(0, course.originalPrice - course.price)
          const modules = course.modules
          return (
        <div className="course-detail-layout">
          <div className="course-detail-content">
            <header className="course-detail-hero">
              <h1>{course.title}</h1>
              <p>{course.description}</p>
              <div className="course-detail-instructor">
                <span className="course-instructor-avatar" aria-hidden="true"><UserRound size={25} /></span>
                <div>
                  <strong>{course.instructor}</strong>
                  <span>Giảng viên khóa học</span>
                  <p>{course.targetAudience}</p>
                </div>
                <small><BadgeCheck size={13} /> {course.category} · {course.level}</small>
              </div>
            </header>

            <section className="course-detail-goals" aria-labelledby="course-goals-heading">
              <div className="course-detail-section-heading">
                <div><span>THÔNG TIN KHÓA HỌC</span><h2 id="course-goals-heading">Lộ trình học tập của bạn</h2></div>
                <CircleCheck size={22} />
              </div>
              <div className="course-goals-grid">
                {[
                  [`Chủ đề: ${course.category}`, course.description],
                  [`Trình độ: ${course.level}`, `Lộ trình phù hợp với ${course.targetAudience.toLocaleLowerCase('vi')}.`],
                  [`${course.totalLessons} bài học`, 'Học theo tiến độ của bạn với nội dung được sắp xếp theo từng chủ đề.'],
                  ['Học trực tuyến', 'Truy cập nội dung khóa học sau khi đăng ký thành công.'],
                ].map(([title, description]) => (
                  <article className="course-goal-card" key={title}>
                    <CheckCircle2 size={15} />
                    <div><h3>{title}</h3><p>{description}</p></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="course-curriculum" aria-labelledby="course-curriculum-heading">
              <div className="course-detail-section-heading course-curriculum-heading">
                <div><span>GIÁO TRÌNH CHUYÊN SÂU</span><h2 id="course-curriculum-heading">Nội dung chương trình</h2></div>
                <p>{modules.length} chủ đề · {course.totalLessons} bài học</p>
              </div>
              {modules.length > 0 ? <div className="course-module-list">
                {modules.map((module, index) => {
                  const expanded = expandedModules.includes(index)
                  return (
                    <article className={`course-module${expanded ? ' expanded' : ''}`} key={module.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggleModule(index)}
                      >
                        <span className="course-module-number">{String(index + 1).padStart(2, '0')}</span>
                        <span className="course-module-copy"><strong>{module.title}</strong><small>{module.description || `${module.lessons.length} bài học`}</small></span>
                        <ChevronDown size={16} />
                      </button>
                      {expanded && (
                        <div className="course-module-details">
                          {module.lessons.length > 0
                            ? <ul>{module.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul>
                            : <p>{module.description || 'Nội dung chủ đề sẽ được cập nhật.'}</p>}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
                : <p className="course-curriculum-empty">Chương trình chi tiết sẽ được cập nhật.</p>}
            </section>
          </div>

          <aside className="course-purchase-card" aria-label="Thông tin đăng ký khóa học">
            <div className="course-preview-art" aria-label={`Khóa học ${course.title}`}>
              {course.thumbnailUrl && <img src={course.thumbnailUrl} alt="" />}
              <div className="course-preview-board"><BookOpen size={42} /><span>{course.category}<br />COURSE</span></div>
              <span className="course-preview-play"><Play size={21} fill="currentColor" /></span>
              <small>Xem video preview</small>
            </div>
            <div className="course-purchase-prices">
              <strong>{formatCurrency(course.price)}</strong>
              {course.originalPrice > course.price && <del>{formatCurrency(course.originalPrice)}</del>}
              {discount > 0 && <span>-{Math.round(discount / course.originalPrice * 100)}%</span>}
            </div>
            {discount > 0 && <p className="course-purchase-promo"><Clock3 size={13} /> Ưu đãi đang áp dụng cho khóa học</p>}
            <button type="button" className="course-register-button" onClick={register}>
              <UserRound size={14} /> Đăng Ký Khóa Ngay
            </button>
            <button type="button" className="course-free-consultation" onClick={() => window.location.assign('mailto:hello@yourenglishvoice.vn')}>
              <Headphones size={14} /> Nhận Tư Vấn Lộ Trình Miễn Phí
            </button>
            <p className="course-purchase-guarantee">
              Đội ngũ hỗ trợ đồng hành trong suốt quá trình học tập
            </p>
            <div className="course-includes">
              <strong>Khóa học này bao gồm:</strong>
              <span><CheckCircle2 size={14} /> Truy cập nội dung khóa học và tài liệu đi kèm</span>
              <span><ShieldCheck size={14} /> Lộ trình gồm {course.totalLessons} bài học được sắp xếp theo chủ đề</span>
              <span><UserRound size={14} /> Học cùng giảng viên: {course.instructor}</span>
              <span><Download size={14} /> Tài liệu học tập phù hợp với chủ đề {course.category}</span>
            </div>
          </aside>
        </div>
          )
        })()}
      </main>

      <SiteFooter />
    </div>
  )
}
