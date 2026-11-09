import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Search,
  Users,
} from 'lucide-react'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { courseCatalogApi } from './services/courseCatalogApi'
import { type CourseReference } from './course-data'
import './course-list-page.css'

function getCourseTheme(course: CourseReference): string {
  const subject = `${course.category} ${course.title}`.toLocaleLowerCase('vi')
  if (/ielts/.test(subject)) return 'course-theme-ielts'
  if (/giao tiếp|communication/.test(subject)) return 'course-theme-conversation'
  if (/phát âm|pronunciation/.test(subject)) return 'course-theme-pronunciation'
  if (/toeic/.test(subject)) return 'course-theme-toeic'
  if (/mất gốc|beginner/.test(subject)) return 'course-theme-beginner'
  if (/business|doanh nghiệp/.test(subject)) return 'course-theme-business'
  return 'course-theme-default'
}

function CourseCard({ course }: { course: CourseReference }) {
  const courseLink = `/courses/${encodeURIComponent(course.slug)}`

  const cornerIcon = () => {
    switch (course.iconType) {
      case 'users':
        return <Users size={20} />
      case 'briefcase':
        return <Briefcase size={20} />
      case 'award':
      default:
        return <Award size={20} />
    }
  }

  const highlightIcon = (index: number) => {
    if (index === 0) return <Clock3 size={15} />
    if (index === 1) return <Clock3  size={15} />
    return <Clock3 size={15} />
  }

  const instructorInitials = course.instructor
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join('')

  const price = `${course.price.toLocaleString('vi-VN')}đ`
  const originalPrice = `${course.originalPrice.toLocaleString('vi-VN')}đ`

  return (
    <article className="public-course-card">
      <a className="public-course-card-link" href={courseLink} aria-label={`Xem chi tiết khóa học ${course.title}`}>
        <div className={`public-course-card-image ${getCourseTheme(course)}`}>
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <span className="public-course-cover-icon" aria-hidden="true">{cornerIcon()}</span>
          )}
          <div className="public-course-cover-badges">
            {course.isPopular && <span className="public-course-status-badge">BÁN CHẠY</span>}
            <span className="public-course-category">{course.category}</span>
          </div>
        </div>
        <div className="public-course-card-copy">
          <div className="public-course-meta">
            <span>{course.level || course.category}</span>
            <span className="public-course-lesson-count"><CalendarDays size={14} /> {course.totalLessons} buổi học</span>
          </div>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          {course.highlights && course.highlights.length > 0 && (
            <ul className="public-course-highlights" aria-label="Đặc điểm khóa học">
              {course.highlights.map((item, idx) => (
                <li key={idx} className="public-course-highlight-item">
                  {highlightIcon(idx)}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="public-course-instructor-row">
            <span className="public-course-instructor-avatar" aria-hidden="true">{instructorInitials}</span>
            <span className="public-course-instructor-name">{course.instructor}</span>
          </div>
          <div className="public-course-card-bottom">
            <span className="public-course-price-group">
              {course.originalPrice > course.price && <del>{originalPrice}</del>}
              <strong>{price}</strong>
            </span>
            <span className="public-course-btn-primary">Xem chi tiết <ArrowRight size={15} /></span>
          </div>
        </div>
      </a>
    </article>
  )
}

export function CourseListPage() {
  const [courses, setCourses] = useState<CourseReference[]>([])
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [guaranteedOnly, setGuaranteedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadCourses() {
    try {
      const data = await courseCatalogApi.list()
      setCourses(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách khóa học.')
    } finally {
      setLoading(false)
    }
  }

  function retryLoadCourses() {
    setLoading(true)
    setError('')
    void loadCourses()
  }

  useEffect(() => {
    void loadCourses()
  }, [])

  const visibleCourses = useMemo(() => {
    const normalizedQuery = submittedQuery.trim().toLocaleLowerCase('vi')
    return courses.filter((course) => {
      const text = `${course.title} ${course.category} ${course.instructor} ${course.description} ${course.details} ${course.targetAudience}`.toLocaleLowerCase('vi')
      if (normalizedQuery && !text.includes(normalizedQuery)) return false
      if (guaranteedOnly && !/cam kết|guarantee/i.test(`${course.description} ${course.targetAudience}`)) return false
      return true
    })
  }, [courses, guaranteedOnly, submittedQuery])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedQuery(query)
  }

  return (
    <div className="public-course-page">
      <SiteHeader />
      <main className="public-course-main">
        <section className="public-course-hero">
          <div className="public-course-container">
            <span className="public-course-eyebrow"><GraduationCap size={16} /> CHƯƠNG TRÌNH ĐÀO TẠO</span>
            <h1>Danh Sách Khóa Học</h1>
            <p>Chọn lộ trình phù hợp và bắt đầu hành trình chinh phục tiếng Anh của bạn.</p>
            <form className="public-course-search" onSubmit={submitSearch}>
            <label className="public-course-search-field">
              <Search size={18} />
              <span className="public-course-visually-hidden">Tìm khóa học</span>
              <input
                type="search"
                placeholder="Tìm khóa học IELTS, Giao tiếp, TOEIC, Ngữ pháp..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={`public-course-guarantee${guaranteedOnly ? ' active' : ''}`}
              aria-pressed={guaranteedOnly}
              onClick={() => setGuaranteedOnly((active) => !active)}
            >
              <CheckCircle2 size={15} /> Bảo đảm đầu ra
            </button>
            <button className="public-course-search-button" type="submit">Tìm Kiếm <ArrowRight size={17} /></button>
            </form>
          </div>
        </section>

        {error && (
          <div className="public-course-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={retryLoadCourses}>Thử lại</button>
          </div>
        )}

        <section className="public-course-results public-course-container" id="all-courses" aria-label="Danh sách khóa học">
          <div className="public-course-section-header">
            <div>
              <span className="public-course-eyebrow">CHƯƠNG TRÌNH ĐÀO TẠO</span>
              <h2 className="public-course-section-title">Danh Sách Khóa Học</h2>
            </div>
            {!loading && <span className="public-course-result-count">{visibleCourses.length} khóa học</span>}
          </div>
          {loading ? (
            <div className="public-course-status" role="status"><LoaderCircle size={20} /> Đang tải khóa học…</div>
          ) : visibleCourses.length > 0 ? (
            <div className="public-course-grid">
              {visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}
            </div>
          ) : !error ? (
            <div className="public-course-status public-course-empty">
              {submittedQuery || guaranteedOnly ? 'Không tìm thấy khóa học phù hợp với bộ lọc.' : 'Hiện chưa có khóa học nào được mở đăng ký.'}
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}
