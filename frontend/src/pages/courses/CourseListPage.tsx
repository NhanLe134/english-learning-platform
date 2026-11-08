import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Award,
  Briefcase,
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
    if (index === 1) return <Users size={15} />
    return <MessageSquareText size={15} />
  }

  return (
    <article className={`public-course-card${course.isPopular ? ' is-popular' : ''}`}>
      <a className="public-course-card-link" href={`/courses/${encodeURIComponent(course.slug)}`}>
        {course.thumbnailUrl ? (
          <div className={`public-course-card-image ${getCourseTheme(course)}`}>
            <img src={course.thumbnailUrl} alt="" loading="lazy" />
            <span className="public-course-category">{course.category}</span>
          </div>
        ) : null}
        <div className="public-course-card-copy">
          <div className="public-course-card-header-row">
            <span className="public-course-tag-pill">{course.category}</span>
            <span className="public-course-corner-icon">{cornerIcon()}</span>
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
          <div className="public-course-card-bottom-action">
            <span className="public-course-btn-primary">Xem chi tiết</span>
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
        <header className="public-course-heading">
          <span className="public-course-eyebrow"><GraduationCap size={15} /> CHƯƠNG TRÌNH ĐÀO TẠO</span>
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
        </header>

        {error && (
          <div className="public-course-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={retryLoadCourses}>Thử lại</button>
          </div>
        )}

        {loading ? (
          <div className="public-course-status" role="status"><LoaderCircle size={20} /> Đang tải khóa học…</div>
        ) : visibleCourses.length > 0 ? (
          <>
            <div className="public-course-section-header">
              <div>
                <span className="public-course-eyebrow">CHƯƠNG TRÌNH ĐÀO TẠO</span>
                <h2 className="public-course-section-title">Các khóa học hiện tại</h2>
              </div>
              <a href="#all-courses" className="public-course-view-all">
                Xem tất cả khóa học <ArrowRight size={16} />
              </a>
            </div>
            <section className="public-course-grid" aria-label="Các khóa học hiện có">
              {visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}
            </section>
          </>
        ) : !error ? (
          <div className="public-course-status">
            {submittedQuery || guaranteedOnly ? 'Không tìm thấy khóa học phù hợp với bộ lọc.' : 'Hiện chưa có khóa học nào được mở đăng ký.'}
          </div>
        ) : null}
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}
