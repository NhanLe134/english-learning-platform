import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Laptop,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from 'lucide-react'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { courseCatalogApi } from './services/courseCatalogApi'
import { DEFAULT_COURSES, type CourseReference } from './course-data'
import './course-list-page.css'

function formatLevel(level: string): string {
  const labels: Record<string, string> = {
    beginner: 'Cơ bản',
    intermediate: 'Trung cấp',
    advanced: 'Nâng cao',
  }
  return labels[level.toLocaleLowerCase('vi')] ?? level
}

type QuickFilter = 'ielts' | 'certificate' | 'native' | 'discount'
type CourseSort = 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'title'

const quickFilters: { id: QuickFilter; label: string }[] = [
  { id: 'ielts', label: 'IELTS Intensive' },
  { id: 'certificate', label: 'Khóa học có chứng chỉ' },
  { id: 'native', label: 'Giáo viên bản xứ' },
  { id: 'discount', label: 'Đang giảm giá' },
]

function courseMatchesQuickFilter(course: CourseReference, filter: QuickFilter): boolean {
  const text = `${course.title} ${course.category} ${course.description} ${course.details}`.toLocaleLowerCase('vi')
  switch (filter) {
    case 'ielts':
      return /ielts/i.test(text)
    case 'certificate':
      return /chứng chỉ|certificate|chứng nhận/i.test(text)
    case 'native':
      return /bản xứ|bản ngữ|native/i.test(`${text} ${course.instructor}`.toLocaleLowerCase('vi'))
    case 'discount':
      return course.originalPrice > course.price
  }
}

function courseMatchesFormat(course: CourseReference, format: string): boolean {
  if (format === 'all') return true
  const text = `${course.title} ${course.description} ${course.details}`.toLocaleLowerCase('vi')
  if (format === 'online') return /trực tuyến|online|học từ xa/i.test(text)
  return /1\s*[-–]?\s*1|kèm riêng|one[- ]to[- ]one|cá nhân hóa/i.test(text)
}

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
  const [courses, setCourses] = useState<CourseReference[]>(DEFAULT_COURSES)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [goal, setGoal] = useState('all')
  const [format, setFormat] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilter[]>([])
  const [guaranteedOnly, setGuaranteedOnly] = useState(false)
  const [sort, setSort] = useState<CourseSort>('popular')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadCourses() {
    try {
      const data = await courseCatalogApi.list()
      setCourses(data.length > 0 ? data : DEFAULT_COURSES)
    } catch {
      setCourses(DEFAULT_COURSES)
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
    let active = true
    courseCatalogApi.list()
      .then((loadedCourses) => {
        if (active) setCourses(loadedCourses.length > 0 ? loadedCourses : DEFAULT_COURSES)
      })
      .catch(() => {
        if (!active) return
        setCourses(DEFAULT_COURSES)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const goals = useMemo(
    () => [...new Set(courses.map((course) => course.targetAudience.trim()).filter(Boolean))].sort(),
    [courses],
  )
  const levels = useMemo(
    () => [...new Set(courses.map((course) => course.level.trim()).filter(Boolean))].sort(),
    [courses],
  )

  const visibleCourses = useMemo(() => {
    const normalizedQuery = submittedQuery.trim().toLocaleLowerCase('vi')
    const filtered = courses.filter((course) => {
      const text = `${course.title} ${course.category} ${course.instructor} ${course.description} ${course.details} ${course.targetAudience}`.toLocaleLowerCase('vi')
      if (normalizedQuery && !text.includes(normalizedQuery)) return false
      if (level !== 'all' && course.level !== level) return false
      if (goal !== 'all' && course.targetAudience !== goal) return false
      if (!courseMatchesFormat(course, format)) return false
      if (priceRange === 'under-1m' && course.price >= 1_000_000) return false
      if (priceRange === '1m-3m' && (course.price < 1_000_000 || course.price > 3_000_000)) return false
      if (priceRange === 'over-3m' && course.price <= 3_000_000) return false
      if (guaranteedOnly && !/cam kết|guarantee/i.test(`${course.description} ${course.targetAudience}`)) return false
      return activeQuickFilters.every((filter) => courseMatchesQuickFilter(course, filter))
    })

    switch (sort) {
      case 'newest':
        return filtered
      case 'popular': {
        const orderMap: Record<string, number> = {
          'phat-am-tieng-anh': 1,
          'tu-vung-tieng-anh': 2,
          'ngu-phap-tieng-anh': 3,
        }
        return [...filtered].sort((first, second) => (orderMap[first.slug] || 99) - (orderMap[second.slug] || 99))
      }
      case 'price-asc':
        return [...filtered].sort((first, second) => first.price - second.price)
      case 'price-desc':
        return [...filtered].sort((first, second) => second.price - first.price)
      case 'title':
        return [...filtered].sort((first, second) => first.title.localeCompare(second.title, 'vi'))
    }
  }, [activeQuickFilters, courses, format, goal, guaranteedOnly, level, priceRange, sort, submittedQuery])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedQuery(query)
  }

  function toggleQuickFilter(filter: QuickFilter) {
    setActiveQuickFilters((active) => active.includes(filter)
      ? active.filter((item) => item !== filter)
      : [...active, filter])
  }

  function resetFilters() {
    setQuery('')
    setSubmittedQuery('')
    setLevel('all')
    setGoal('all')
    setFormat('all')
    setPriceRange('all')
    setActiveQuickFilters([])
    setGuaranteedOnly(false)
    setSort('popular')
  }

  const hasFilters = Boolean(
    query || submittedQuery || level !== 'all' || goal !== 'all' || format !== 'all' ||
    priceRange !== 'all' || activeQuickFilters.length || guaranteedOnly || sort !== 'popular'
  )

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
            {courses.length ? 'Không tìm thấy khóa học phù hợp.' : 'Hiện chưa có khóa học nào được mở đăng ký.'}
          </div>
        ) : null}
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}
