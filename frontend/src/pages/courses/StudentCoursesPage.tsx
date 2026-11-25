import React, { useEffect, useMemo, useState } from 'react'
import { Search, BookOpen, LoaderCircle } from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import { MyCourseCard } from './components/MyCourseCard'
import { OtherCourseCard } from './components/OtherCourseCard'
import { StudentDailyWordPopup } from '../../components/daily-word/StudentDailyWordPopup'
import { useAuth } from '../auth/auth-context'
import type {
  MyCourse,
  OtherCourse,
  StudentProfile,
} from './student-courses-data'
import {
  courseCatalogApi,
  type BackendEnrolledCourse,
} from './services/courseCatalogApi'
import type { CourseReference } from './course-data'
import { buildCheckoutPageUrl, savePaymentReturnPath } from '../checkout/payment-navigation'
import {
  formatCourseLevelVietnamese,
  formatUserRoleVietnamese,
  translateErrorMessageToVietnamese,
} from '../auth/vietnamese-messages'
import './student-courses.css'

function mapCatalogToOtherCourse(course: CourseReference): OtherCourse {
  const discountPercent =
    course.originalPrice > course.price
      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
      : 0

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    tagBadge: (course.category || 'Tổng quát').toUpperCase(),
    levelBadge: formatCourseLevelVietnamese(course.level, true),
    levelBadgeColor:
      course.level === 'beginner'
        ? 'blue'
        : course.level === 'intermediate'
        ? 'rose'
        : 'emerald',
    lessonsCount: course.totalLessons || 0,
    totalHours: 0,
    instructor: course.instructor || '',
    instructorRole: '',
    thumbnailUrl: course.thumbnailUrl || '',
    features: course.highlights && course.highlights.length > 0 ? course.highlights : [],
    price: course.price,
    originalPrice: course.originalPrice,
    discountPercent,
  }
}

function mapBackendEnrolledCourse(item: BackendEnrolledCourse): MyCourse {
  const isCompleted = item.status === 'completed'
  return {
    id: item.id || item.course_id,
    title: item.title,
    slug: item.slug,
    levelBadge: formatCourseLevelVietnamese(item.level),
    instructor: item.teacher?.full_name || '',
    thumbnailUrl: item.thumbnail_url || '',
    status: isCompleted ? 'completed' : 'in_progress',
    statusLabel: isCompleted ? 'Đã Hoàn Thành' : 'Đang Học',
    lastActive: item.last_active || '',
    totalLessons: item.total_lessons,
    completedLessons: item.completed_lessons,
    progressPercent: item.progress_percent,
  }
}

export const StudentCoursesPage: React.FC = () => {
  const { user, accessToken } = useAuth()
  const studentId = user?.id
  const isOtherCoursesPage = window.location.pathname === '/course'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [sortBy, _setSortBy] = useState<'recent' | 'progress' | 'title'>('recent')
  const [myCoursesLoading, setMyCoursesLoading] = useState(false)
  const [myCoursesError, setMyCoursesError] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [myCourses, setMyCourses] = useState<MyCourse[]>([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([])
  const [catalogCourses, setCatalogCourses] = useState<OtherCourse[]>([])

  // Fetch real catalog courses and enrolled courses
  useEffect(() => {
    let active = true

    // 1. Fetch catalog courses currently available on platform
    setCatalogLoading(true)
    setCatalogError(null)
    void courseCatalogApi
      .list()
      .then((list) => {
        if (!active) return
        if (Array.isArray(list)) {
          const mapped = list.map(mapCatalogToOtherCourse)
          setCatalogCourses(mapped)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        setCatalogError(
          translateErrorMessageToVietnamese(
            err instanceof Error ? err.message : '',
            'Không thể tải danh sách khóa học.',
          ),
        )
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })

    // 2. Fetch enrolled courses for the logged-in student via API
    const fetchMyCourses = (showLoading: boolean) => {
      if (!studentId || !accessToken) {
        setMyCourses([])
        setEnrolledCourseIds([])
        setMyCoursesLoading(false)
        setMyCoursesError(null)
        return
      }
      if (showLoading) {
        setMyCourses([])
        setEnrolledCourseIds([])
        setMyCoursesLoading(true)
      }
      setMyCoursesError(null)
      void courseCatalogApi
        .getMyCourses(accessToken)
        .then((backendEnrolled) => {
          if (!active) return
          if (Array.isArray(backendEnrolled)) {
            const mappedEnrolled = backendEnrolled.map(mapBackendEnrolledCourse)
            setMyCourses(mappedEnrolled)
            setEnrolledCourseIds(
              backendEnrolled
                .map((item) => item.course_id || item.id)
                .filter((id): id is string => Boolean(id))
            )
          }
        })
        .catch((err: unknown) => {
          if (!active) return
          console.error('[StudentCoursesPage] getMyCourses failed:', err)
          if (showLoading) {
            setMyCoursesError('Không thể tải danh sách khóa học. Vui lòng thử lại.')
          }
        })
        .finally(() => {
          if (active && showLoading) setMyCoursesLoading(false)
        })
    }

    fetchMyCourses(true)

    // Re-sync progress when returning to /my-courses via browser Back (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        fetchMyCourses(false)
      }
    }
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      active = false
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [studentId, accessToken])

  // Logged in student profile
  const studentProfile: StudentProfile = useMemo(
    () => ({
      name: user?.fullName || 'Học viên',
      email: user?.email || '',
      role: formatUserRoleVietnamese(user?.role),
      avatarUrl: user?.avatarUrl ?? null,
      streakDays: 0,
      weeklyGoalPercent: 0,
    }),
    [user]
  )

  // Filter & sort My Courses
  const filteredMyCourses = useMemo(() => {
    let result = [...myCourses]

    // Filter by status tab
    if (statusFilter !== 'all') {
      result = result.filter((course) => course.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (course) =>
          course.title.toLowerCase().includes(q) ||
          course.instructor.toLowerCase().includes(q) ||
          course.levelBadge.toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortBy === 'progress') {
      result.sort((a, b) => b.progressPercent - a.progressPercent)
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    }

    return result
  }, [myCourses, searchQuery, statusFilter, sortBy])

  // Count badges
  const totalCount = myCourses.length
  const inProgressCount = myCourses.filter((c) => c.status === 'in_progress').length
  const completedCount = myCourses.filter((c) => c.status === 'completed').length

  const isEnrolledLoading = Boolean(studentId && accessToken && myCoursesLoading)
  const isOtherCoursesLoading = catalogLoading || isEnrolledLoading
  const otherCoursesError = catalogError || (studentId && accessToken ? myCoursesError : null)

  const enrolledCourseIdSet = useMemo(() => new Set(enrolledCourseIds), [enrolledCourseIds])

  // Filter "Các Khóa Học Khác" to show ONLY unenrolled courses (matched by course ID).
  // Wait until student enrollment finishes loading to prevent enrolled courses from flashing.
  const displayedOtherCourses = useMemo(() => {
    if (isOtherCoursesLoading) return []

    const query = searchQuery.trim().toLocaleLowerCase('vi')

    return catalogCourses.filter((course) => {
      // Hide all courses the student has already enrolled in
      if (enrolledCourseIdSet.has(course.id)) {
        return false
      }

      if (!query) return true

      return `${course.title} ${course.tagBadge} ${course.instructor}`
        .toLocaleLowerCase('vi')
        .includes(query)
    })
  }, [catalogCourses, enrolledCourseIdSet, isOtherCoursesLoading, searchQuery])

  const handleContinueCourse = (course: MyCourse) => {
    window.location.assign(`/student/courses/${encodeURIComponent(course.slug || course.id)}`)
  }

  const handleReviewCourse = (course: MyCourse) => {
    window.location.assign(`/student/courses/${encodeURIComponent(course.slug || course.id)}`)
  }

  const handleViewOtherCourseDetail = (selectedCourse: OtherCourse) => {
    window.location.assign(`/courses/${encodeURIComponent(selectedCourse.slug || selectedCourse.id)}`)
  }

  const handleEnrollOtherCourse = (selectedCourse: OtherCourse) => {
    const returnTo = `${window.location.pathname}${window.location.search}`
    const courseIdentifier = selectedCourse.id || selectedCourse.slug
    if (courseIdentifier) {
      savePaymentReturnPath(`course:${courseIdentifier}`, returnTo)
    }
    window.location.assign(
      buildCheckoutPageUrl(courseIdentifier, selectedCourse.slug, returnTo)
    )
  }

  return (
    <div className="student-portal-page">
      {/* Header */}
      <StudentHeader student={studentProfile} activePage={isOtherCoursesPage ? 'other-courses' : 'my-courses'} />

      {/* Main Container */}
      <main className="student-portal-content">
        <div className="student-portal-layout">
          {/* Main Content Area */}
          <div className="student-portal-main-col">
            {/* Section 1: Khóa Học Của Tôi */}
            {!isOtherCoursesPage && (
              <section aria-labelledby="my-courses-heading">
                <div className="section-header-row">
                  <div className="section-title-group">
                    <h2 id="my-courses-heading">Khóa Học Của Tôi</h2>
                  </div>

                  <div className="section-controls-group">
                    {/* Search Input */}
                    <div className="search-input-wrapper">
                      <Search size={14} className="search-input-icon" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm khóa học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="course-search-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="filter-tabs-row" role="tablist">
                  <button
                    type="button"
                    className={`filter-tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                    role="tab"
                    aria-selected={statusFilter === 'all'}
                  >
                    <span className="filter-tab-label">Tất Cả</span>
                    <span className="filter-tab-count">({totalCount})</span>
                  </button>
                  <button
                    type="button"
                    className={`filter-tab-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('in_progress')}
                    role="tab"
                    aria-selected={statusFilter === 'in_progress'}
                  >
                    <span className="filter-tab-label">Đang Học</span>
                    <span className="filter-tab-count">({inProgressCount})</span>
                  </button>
                  <button
                    type="button"
                    className={`filter-tab-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('completed')}
                    role="tab"
                    aria-selected={statusFilter === 'completed'}
                  >
                    <span className="filter-tab-label">Đã Hoàn Thành</span>
                    <span className="filter-tab-count">({completedCount})</span>
                  </button>
                </div>

                {/* Course Cards Stack */}
                <div className="course-cards-stack">
                  {myCoursesLoading ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-500 text-sm">
                      <div className="mx-auto mb-3 w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      <p>Đang tải danh sách khóa học…</p>
                    </div>
                  ) : myCoursesError ? (
                    <div className="bg-white rounded-2xl border border-red-100 p-8 text-center text-red-600 text-sm">
                      <BookOpen size={32} className="mx-auto mb-2 text-red-400" />
                      <p>{myCoursesError}</p>
                      <button
                        type="button"
                        className="mt-3 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700"
                        onClick={() => window.location.reload()}
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : myCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-600">
                      <BookOpen size={40} className="mx-auto mb-3 text-brand-600 opacity-80" />
                      <h3 className="text-base font-bold text-ink-900 mb-1">
                        Bạn chưa đăng ký khóa học nào
                      </h3>
                      <p className="text-sm text-ink-500 max-w-md mx-auto mb-4">
                        Khám phá danh sách các khóa học để bắt đầu lộ trình học tập của bạn nhé!
                      </p>
                      <a
                        href="/course"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/20"
                      >
                        Khám phá khóa học ngay
                      </a>
                    </div>
                  ) : filteredMyCourses.length > 0 ? (
                    filteredMyCourses.map((course) => (
                      <MyCourseCard
                        key={course.id}
                        course={course}
                        onContinue={handleContinueCourse}
                        onReview={handleReviewCourse}
                      />
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-500 text-sm">
                      <BookOpen size={32} className="mx-auto mb-2 text-ink-400" />
                      Không tìm thấy khóa học nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Section 2: Các Khóa Học Khác */}
            {isOtherCoursesPage && (
              <section aria-labelledby="other-courses-heading">
                <div className="section-header-row">
                  <div className="section-title-group">
                    <h2 id="other-courses-heading">Các Khóa Học Khác</h2>
                    <p>Khám phá các khóa học và lựa chọn lộ trình phù hợp với bạn.</p>
                  </div>
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-input-icon" />
                    <input
                      type="search"
                      placeholder="Tìm kiếm khóa học..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="course-search-input"
                    />
                  </div>
                </div>
                <div className="course-cards-stack">
                  {isOtherCoursesLoading ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-500 text-sm">
                      <LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-brand-600" />
                      <p>Đang tải danh sách khóa học…</p>
                    </div>
                  ) : otherCoursesError ? (
                    <div className="bg-white rounded-2xl border border-red-100 p-8 text-center text-red-600 text-sm">
                      <p>{otherCoursesError}</p>
                    </div>
                  ) : displayedOtherCourses.length > 0 ? (
                    displayedOtherCourses.map((course) => (
                      <OtherCourseCard
                        key={course.id}
                        course={course}
                        onViewDetail={handleViewOtherCourseDetail}
                        onEnroll={handleEnrollOtherCourse}
                      />
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-500 text-sm">
                      <BookOpen size={32} className="mx-auto mb-2 text-ink-400" />
                      {searchQuery
                        ? `Không tìm thấy khóa học nào phù hợp với từ khóa "${searchQuery}".`
                        : 'Hiện tại chưa có khóa học khác.'}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Popup Daily Word — chỉ hiển thị tại trang này, 1 lần/ngày cho từng học viên */}
      <StudentDailyWordPopup />
    </div>
  )
}

export default StudentCoursesPage
