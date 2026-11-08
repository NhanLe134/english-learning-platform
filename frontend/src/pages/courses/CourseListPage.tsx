import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  Laptop,
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Target,
  UserRound,
  X,
} from 'lucide-react'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { courseCatalogApi } from './services/courseCatalogApi'
import type { CourseReference } from './course-data'
import './course-list-page.css'

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

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

function CourseCard({ course }: { course: CourseReference }) {
  return (
    <article className="public-course-card">
      <a className="public-course-card-link" href={`/courses/${encodeURIComponent(course.slug)}`}>
        <div className="public-course-card-image">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt="" loading="lazy" />
            : <span aria-hidden="true"><BookOpen size={42} /></span>}
          <span className="public-course-category">{course.category}</span>
        </div>
        <div className="public-course-card-copy">
          <div className="public-course-meta"><span>{formatLevel(course.level)}</span><span>{course.totalLessons} bài học</span></div>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <span className="public-course-instructor"><UserRound size={14} /> {course.instructor}</span>
          <div className="public-course-card-bottom">
            <strong>{formatCurrency(course.price)}</strong>
            {course.originalPrice > course.price && <del>{formatCurrency(course.originalPrice)}</del>}
            <span className="public-course-detail-cta">Xem chi tiết <ArrowRight size={15} /></span>
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
  const [level, setLevel] = useState('all')
  const [goal, setGoal] = useState('all')
  const [format, setFormat] = useState('all')
  const [priceRange, setPriceRange] = useState('all')
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilter[]>(['ielts'])
  const [guaranteedOnly, setGuaranteedOnly] = useState(false)
  const [sort, setSort] = useState<CourseSort>('popular')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadCourses() {
    try {
      setCourses(await courseCatalogApi.list())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khóa học.')
      setCourses([])
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
        if (active) setCourses(loadedCourses)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khóa học.')
        setCourses([])
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
      case 'popular':
        return filtered
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

        <section className="public-course-filter-panel" aria-label="Bộ lọc khóa học">
          <div className="public-course-filter-grid">
            <label className="public-course-filter-field">
              <span><SlidersHorizontal size={14} /> Cấp độ học viên</span>
              <span className="public-course-select-wrap">
                <select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Cấp độ học viên">
                  <option value="all">Tất cả cấp độ</option>
                  {levels.map((item) => <option value={item} key={item}>{formatLevel(item)}</option>)}
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <label className="public-course-filter-field">
              <span><Target size={14} /> Mục tiêu học tập</span>
              <span className="public-course-select-wrap">
                <select value={goal} onChange={(event) => setGoal(event.target.value)} aria-label="Mục tiêu học tập">
                  <option value="all">Mọi mục tiêu</option>
                  {goals.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <label className="public-course-filter-field">
              <span><Laptop size={14} /> Hình thức đào tạo</span>
              <span className="public-course-select-wrap">
                <select value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Hình thức đào tạo">
                  <option value="all">Tất cả hình thức</option>
                  <option value="online">Học trực tuyến</option>
                  <option value="one-to-one">Kèm cặp 1-1</option>
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <label className="public-course-filter-field">
              <span><CircleDollarSign size={14} /> Mức học phí</span>
              <span className="public-course-select-wrap">
                <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)} aria-label="Mức học phí">
                  <option value="all">Tất cả mức giá</option>
                  <option value="under-1m">Dưới 1.000.000đ</option>
                  <option value="1m-3m">1.000.000đ – 3.000.000đ</option>
                  <option value="over-3m">Trên 3.000.000đ</option>
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
          </div>

          <div className="public-course-filter-footer">
            <div className="public-course-quick-filters">
              <strong>Bộ lọc phổ biến:</strong>
              {quickFilters.map((filter) => {
                const active = activeQuickFilters.includes(filter.id)
                return (
                  <button
                    className={`public-course-quick-tag${active ? ' active' : ''}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleQuickFilter(filter.id)}
                    key={filter.id}
                  >
                    {filter.id === 'certificate' && <Award size={13} />}
                    {filter.label}
                    {active && <X size={13} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            <div className="public-course-sort-controls">
              <label className="public-course-sort">
                <span><ArrowDownWideNarrow size={14} /> Sắp xếp:</span>
                <span className="public-course-select-wrap">
                  <select value={sort} onChange={(event) => setSort(event.target.value as CourseSort)} aria-label="Sắp xếp khóa học">
                    <option value="popular">Phổ biến nhất</option>
                    <option value="newest">Mới nhất</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                    <option value="title">Tên khóa học A–Z</option>
                  </select>
                  <ChevronDown size={14} />
                </span>
              </label>
              <button className="public-course-reset" type="button" onClick={resetFilters} disabled={!hasFilters}>
                <RotateCcw size={14} /> Đặt lại
              </button>
            </div>
          </div>
          <div className="public-course-filter-count" aria-live="polite">
            {visibleCourses.length} khóa học phù hợp
          </div>
        </section>

        {error && (
          <div className="public-course-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={retryLoadCourses}>Thử lại</button>
          </div>
        )}

        {loading ? (
          <div className="public-course-status" role="status"><LoaderCircle size={20} /> Đang tải khóa học…</div>
        ) : visibleCourses.length > 0 ? (
          <section className="public-course-grid" aria-label="Các khóa học hiện có">
            {visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </section>
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
