import React, { useEffect, useMemo, useState } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import { MyCourseCard } from './components/MyCourseCard'
import { OtherCourseCard } from './components/OtherCourseCard'
import { useAuth } from '../auth/auth-context'
import {
  CURRENT_STUDENT,
  MY_COURSES,
  OTHER_COURSES,
  type MyCourse,
  type OtherCourse,
  type StudentProfile,
} from './student-courses-data'
import {
  courseCatalogApi,
  type BackendEnrolledCourse,
} from './services/courseCatalogApi'
import type { CourseReference } from './course-data'
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
    tagBadge: (course.category || 'General').toUpperCase(),
    levelBadge:
      course.level === 'beginner'
        ? 'CƠ BẢN'
        : course.level === 'intermediate'
        ? 'TRUNG CẤP'
        : 'NÂNG CAO',
    levelBadgeColor:
      course.level === 'beginner'
        ? 'blue'
        : course.level === 'intermediate'
        ? 'rose'
        : 'emerald',
    lessonsCount: course.totalLessons || 20,
    totalHours: Math.round((course.totalLessons || 20) * 1.25),
    instructor: course.instructor || 'Giảng viên Your English Voice',
    instructorRole: 'Chuyên gia đào tạo phản xạ & ngữ điệu',
    thumbnailUrl:
      course.thumbnailUrl ||
      (course.slug.includes('phat-am') ? '/giaovien.jpg' : '/giaovien2.jpg'),
    features:
      course.highlights && course.highlights.length > 0
        ? course.highlights
        : [
            'Luyện khẩu hình & phản xạ chuẩn quốc tế',
            'Chữa lỗi phát âm thường gặp của người Việt',
          ],
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
    levelBadge:
      item.level === 'beginner'
        ? 'Cơ bản - B1'
        : item.level === 'intermediate'
        ? 'Trung cấp - B2'
        : 'Nâng cao - C1',
    instructor: item.teacher?.full_name || 'Trang English',
    thumbnailUrl:
      item.thumbnail_url ||
      (item.slug.includes('phat-am') ? '/giaovien.jpg' : '/giaovien2.jpg'),
    status: isCompleted ? 'completed' : 'in_progress',
    statusLabel: isCompleted ? 'Đã Hoàn Thành' : 'Đang Học',
    lastActive: item.last_active || 'Cập nhật gần đây',
    totalLessons: item.total_lessons,
    completedLessons: item.completed_lessons,
    progressPercent: item.progress_percent,
    nextLesson: !isCompleted
      ? {
          lessonNumber: Math.min(item.total_lessons, item.completed_lessons + 1),
          title: 'Bài tiếp theo trong lộ trình',
        }
      : undefined,
  }
}

export const StudentCoursesPage: React.FC = () => {
  const { user, accessToken } = useAuth()
  const isOtherCoursesPage = window.location.pathname === '/courses' || window.location.pathname === '/khoa-hoc'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [sortBy, _setSortBy] = useState<'recent' | 'progress' | 'title'>('recent')
  const [myCoursesLoading, setMyCoursesLoading] = useState(false)
  const [myCoursesError, setMyCoursesError] = useState<string | null>(null)

  const isGuestPreview = !user
  const [myCourses, setMyCourses] = useState<MyCourse[]>(() => {
    if (isGuestPreview) return MY_COURSES
    // Do NOT preload from localStorage – backend is authoritative
    return []
  })
  const [catalogCourses, setCatalogCourses] = useState<OtherCourse[]>(() => OTHER_COURSES)

  // Fetch real catalog courses and enrolled courses
  useEffect(() => {
    let active = true

    // 1. Fetch catalog courses currently available on platform
    void courseCatalogApi
      .list()
      .then((list) => {
        if (!active || !Array.isArray(list) || list.length === 0) return
        const mapped = list.map(mapCatalogToOtherCourse)
        setCatalogCourses(mapped)
      })
      .catch(() => {
        // Fallback to static catalog if network/server is unavailable
      })

    // 2. Fetch enrolled courses for the logged-in student via API
    if (user && accessToken) {
      setMyCoursesLoading(true)
      setMyCoursesError(null)
      void courseCatalogApi
        .getMyCourses(accessToken)
        .then((backendEnrolled) => {
          if (!active) return
          if (Array.isArray(backendEnrolled)) {
            const mappedEnrolled = backendEnrolled.map(mapBackendEnrolledCourse)
            setMyCourses(mappedEnrolled)
          }
        })
        .catch((err: unknown) => {
          if (!active) return
          console.error('[StudentCoursesPage] getMyCourses failed:', err)
          setMyCoursesError('Không thể tải danh sách khóa học. Vui lòng thử lại.')
        })
        .finally(() => {
          if (active) setMyCoursesLoading(false)
        })
    }

    return () => {
      active = false
    }
  }, [user, accessToken, isGuestPreview])

  // Logged in student profile
  const studentProfile: StudentProfile = useMemo(
    () => ({
      name: user?.fullName || CURRENT_STUDENT.name,
      email: user?.email || CURRENT_STUDENT.email || 'sarah.student@yev.edu.vn',
      role: user?.role === 'STUDENT' ? 'Member' : user?.role || CURRENT_STUDENT.role,
      avatarUrl: CURRENT_STUDENT.avatarUrl,
      streakDays: CURRENT_STUDENT.streakDays,
      weeklyGoalPercent: CURRENT_STUDENT.weeklyGoalPercent,
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

  // Filter out any courses in "Các Khóa Học Khác" that the student is already enrolled in
  const displayedOtherCourses = useMemo(() => {
    const enrolledSlugs = new Set(myCourses.map((c) => c.slug.toLowerCase()))
    const enrolledIds = new Set(myCourses.map((c) => c.id))

    return catalogCourses.filter(
      (course) =>
        !enrolledSlugs.has(course.slug.toLowerCase()) &&
        !enrolledIds.has(course.id) &&
        (!searchQuery.trim() || `${course.title} ${course.tagBadge} ${course.instructor}`.toLocaleLowerCase('vi').includes(searchQuery.trim().toLocaleLowerCase('vi')))
    )
  }, [catalogCourses, myCourses, searchQuery])

  const handleContinueCourse = (course: MyCourse) => {
    window.location.assign(`/student/courses/${encodeURIComponent(course.slug)}`)
  }

  const handleReviewCourse = (course: MyCourse) => {
    window.location.assign(`/student/courses/${encodeURIComponent(course.slug)}`)
  }

  return (
    <div className="student-portal-page">
      {/* Header */}
      <StudentHeader student={studentProfile} activePage={isOtherCoursesPage ? 'other-courses' : 'my-courses'} />

      {/* Main Container */}
      <main className="student-portal-content">
        {/* Welcome Hero Banner */}
        <section className="welcome-hero-banner" aria-label="Thông tin học tập cá nhân">
          <div className="welcome-streak-badge">
            🏆 HỌC VIÊN NĂNG ĐỘNG • {studentProfile.streakDays} NGÀY LIÊN TIẾP
          </div>
          <h1 className="welcome-hero-title">
            Chào mừng trở lại,{' '}
            <span className="highlight-name">{studentProfile.name}</span>
          </h1>
          <p className="welcome-hero-subtitle">
            Tiếp tục hành trình chinh phục tiếng Anh của bạn nhé! Bạn đã hoàn thành{' '}
            <strong className="highlight-percent">
              {studentProfile.weeklyGoalPercent}%
            </strong>{' '}
            mục tiêu học tuần này.
          </p>
        </section>

        {/* Two-column Main Grid */}
        <div className="student-layout-grid student-layout-grid-single">
          {/* Left Column (Main Content) */}
          <div className="left-main-column">
            {/* Section 1: Khóa Học Của Tôi */}
            {!isOtherCoursesPage && <section aria-labelledby="my-courses-heading">
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
                  Tất Cả ({totalCount})
                </button>
                <button
                  type="button"
                  className={`filter-tab-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('in_progress')}
                  role="tab"
                  aria-selected={statusFilter === 'in_progress'}
                >
                  Đang Học ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`filter-tab-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('completed')}
                  role="tab"
                  aria-selected={statusFilter === 'completed'}
                >
                  Đã Hoàn Thành ({completedCount})
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
                      className="mt-3 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold"
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
                      Hãy khám phá danh sách các khóa học hiện có bên dưới để bắt đầu lộ trình học tập của bạn nhé!
                    </p>
                    <a
                      href="#other-courses-heading"
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
            </section>}

            {/* Section 2: Các Khóa Học Khác */}
            {isOtherCoursesPage && <section aria-labelledby="other-courses-heading">
              <div className="section-header-row">
                <div className="section-title-group">
                  <h2 id="other-courses-heading">{'C\u00E1c kh\u00F3a h\u1ECDc kh\u00E1c'}</h2>
                  <p>{'Kh\u00E1m ph\u00E1 c\u00E1c kh\u00F3a h\u1ECDc v\u00E0 l\u1EF1a ch\u1ECDn l\u1ED9 tr\u00ECnh ph\u00F9 h\u1EE3p v\u1EDBi b\u1EA1n.'}</p>
                </div>
                <div className="search-input-wrapper">
                  <Search size={14} className="search-input-icon" />
                  <input
                    type="search"
                    placeholder={'T\u00ECm ki\u1EBFm kh\u00F3a h\u1ECDc...'}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="course-search-input"
                  />
                </div>
              </div>
              <div className="course-cards-stack">
                {displayedOtherCourses.length > 0 ? (
                  displayedOtherCourses.map((course) => (
                    <OtherCourseCard
                      key={course.id}
                      course={course}
                      onEnroll={(selectedCourse) => {
                        window.location.assign(
                          `/checkout?courseId=${encodeURIComponent(selectedCourse.id || selectedCourse.slug)}&slug=${encodeURIComponent(selectedCourse.slug)}`
                        )
                      }}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-ink-500 text-sm">
                    <BookOpen size={32} className="mx-auto mb-2 text-ink-400" />
                    {'Hi\u1EC7n t\u1EA1i ch\u01B0a c\u00F3 kh\u00F3a h\u1ECDc kh\u00E1c.'}
                  </div>
                )}
              </div>
            </section>}
          </div>

        </div>
      </main>
    </div>
  )
}

export default StudentCoursesPage
