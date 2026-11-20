import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Archive,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  GraduationCap,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Search,
  Target,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { userApi } from '../quan_ly_nguoi_dung/services/userApi'
import type { UserProfile } from '../quan_ly_nguoi_dung/types'
import { CourseDrawer } from './components/CourseDrawer'
import { courseApi } from './services/courseApi'
import type { Course, CourseFilters, CourseInput, CoursePagination } from './types'

const initialFilters: CourseFilters = {
  search: '',
  category: '',
  level: 'all',
  status: 'all',
  sort: 'newest',
  page: 1,
  limit: 9,
}

const initialPagination: CoursePagination = {
  page: 1,
  limit: 9,
  total: 0,
  totalPages: 1,
}

type ConfirmAction = { type: 'toggle' | 'delete'; course: Course } | null

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
}

function discountPercent(course: Course): number | null {
  if (course.discounted_price === null || course.price <= 0) return null
  const percent = Math.round((1 - course.discounted_price / course.price) * 100)
  return percent > 0 ? percent : null
}

function levelLabel(level: Course['level']): string {
  switch (level) {
    case 'beginner': return 'Cơ bản'
    case 'intermediate': return 'Trung cấp'
    case 'advanced': return 'Nâng cao'
  }
}

function statusPill(status: Course['status']): { label: string; className: string; dotClassName: string } {
  switch (status) {
    case 'published':
      return { label: 'Công khai', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dotClassName: 'bg-emerald-500' }
    case 'draft':
      return { label: 'Bản nháp', className: 'border-amber-200 bg-amber-50 text-amber-700', dotClassName: 'bg-amber-500' }
    case 'archived':
      return { label: 'Lưu trữ', className: 'border-slate-200 bg-slate-100 text-ink-700', dotClassName: 'bg-ink-400' }
  }
}

const filterControlClass =
  'h-[38px] rounded border border-slate-300 bg-white px-3 text-xs font-medium text-ink-900 focus:border-brand-500 focus:outline-none'

export function CourseManagementPage() {
  const { accessToken, refreshSession } = useAuth()
  const [filters, setFilters] = useState(initialFilters)
  const [courses, setCourses] = useState<Course[]>([])
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingCourse, setEditingCourse] = useState<Course | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const latestRequest = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    latestRequest.current += 1
  }, [])

  const loadCourses = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      setLoading(true)
      const result = await courseApi.list(
        filters,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      if (requestId !== latestRequest.current) return
      setCourses(result.courses)
      setPagination(result.pagination)
      setPageError(null)
    } catch (error) {
      if (requestId !== latestRequest.current) return
      setPageError(error instanceof Error ? error.message : 'Không thể tải danh sách khóa học.')
      setCourses([])
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }, [accessToken, filters, refreshSession])

  useEffect(() => {
    const timer = setTimeout(() => void loadCourses(), 200)
    return () => {
      clearTimeout(timer)
      latestRequest.current += 1
    }
  }, [loadCourses])

  // Danh sách giảng viên để hiển thị tên + avatar trên thẻ khóa học (map theo teacher_id)
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    userApi
      .getUsers(
        { search: '', role: 'TEACHER', status: 'ALL', page: 1, limit: 100 },
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      .then((result) => {
        if (!cancelled) setTeachers(result.data)
      })
      .catch(() => {
        // Không chặn trang nếu không tải được danh sách giảng viên — thẻ sẽ hiển thị "Chưa phân công"
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, refreshSession])

  const updateFilters = (updates: Partial<CourseFilters>) => {
    setFilters((current) => ({ ...current, ...updates }))
  }

  const handleSave = async (input: CourseInput) => {
    setSaving(true)
    try {
      if (editingCourse) {
        await courseApi.update(
          editingCourse.id,
          input,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        showToast('success', 'Đã cập nhật khóa học.')
      } else {
        await courseApi.create(
          input,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        showToast('success', 'Đã thêm khóa học.')
      }
      setEditingCourse(undefined)
      await loadCourses()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu khóa học.'
      showToast('error', message)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmedAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction.type === 'delete') {
        await courseApi.remove(
          confirmAction.course.id,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        showToast('success', 'Đã xóa khóa học.')
      } else {
        const status = confirmAction.course.status === 'published' ? 'archived' : 'published'
        await courseApi.updateStatus(
          confirmAction.course.id,
          status,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        showToast('success', status === 'published' ? 'Đã công khai khóa học.' : 'Đã lưu trữ khóa học.')
      }
      setConfirmAction(null)
      await loadCourses()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể thực hiện thao tác.')
    } finally {
      setActionLoading(false)
    }
  }

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)
  const actionCourse = confirmAction?.course
  const availableCategories = [...new Set(courses.map((course) => course.category))].sort()
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]))

  const pageNumbers: number[] = []
  const windowStart = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4))
  for (let page = windowStart; page <= Math.min(pagination.totalPages, windowStart + 4); page += 1) {
    pageNumbers.push(page)
  }

  const resetFilters = () => setFilters(initialFilters)

  return (
    <div className="user-management-page-container">
      {toast && (
        <div className="app-toast-container" role={toast.type === 'error' ? 'alert' : 'status'}>
          <div className={`app-toast ${toast.type}`}>
            {toast.type === 'success'
              ? <CheckCircle2 size={18} className="toast-icon-success" />
              : <AlertCircle size={18} className="toast-icon-error" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Sidebar activeTab="khoa_hoc_bai_tap" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader currentPage="Quản lý khóa học" />

        <main className="min-h-screen bg-white px-8 py-8">
          {/* Tiêu đề trang + các hành động chính */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Quản lý Khóa học</h1>
              <p className="mt-1 max-w-xl text-sm text-ink-500">
                Quản lý danh mục giáo trình, phân công giảng viên phụ trách, học phí và xuất bản khóa học trên YourEnglishVoice
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* TODO (người dùng tự làm): xuất danh sách khóa học ra Excel */}
              <button
              type="button"
              disabled
              title="Tính năng sẽ được cập nhật sau"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3.5 text-[12px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98 disabled:opacity-50"
            >
              <Download size={14} />
              Xuất Excel
            </button>

              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 cursor-pointer"
              >
                <Plus size={14} />
                Thêm khóa mới
              </button>
            </div>
          </div>

          {/* Hai thẻ số liệu.
              TODO (người dùng tự làm): nối số liệu thật —
              - Tổng học viên đăng ký: chưa có endpoint (có thể tổng hợp từ course_enrollments)
              - Doanh thu khóa học: chưa có endpoint theo khóa (chỉ có /api/payment/admin/statistics toàn cục) */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:max-w-[62%]">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Tổng học viên đăng ký
                </p>
                <p className="mt-2 text-3xl font-bold text-ink-900">0</p>
                <p className="mt-1 text-xs text-ink-400">Số liệu sẽ được cập nhật sau</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50">
                <GraduationCap size={20} className="text-brand-600" />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Doanh thu khóa học
                </p>
                <p className="mt-2 text-3xl font-bold text-ink-900">0 ₫</p>
                <p className="mt-1 text-xs text-ink-400">Số liệu sẽ được cập nhật sau</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50">
                <Banknote size={20} className="text-amber-500" />
              </span>
            </div>
          </div>

          {/* Thanh tìm kiếm và bộ lọc */}
          <section
            aria-label="Tìm kiếm và lọc khóa học"
            className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <label className="flex h-[38px] min-w-[240px] flex-1 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3">
              <Search size={15} className="shrink-0 text-ink-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Tìm kiếm theo tên khóa học, slug..."
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value, page: 1 })}
                className="h-full w-full border-none bg-transparent text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </label>
            <select
              aria-label="Lọc theo phân loại"
              className={filterControlClass}
              value={filters.category}
              onChange={(event) => updateFilters({ category: event.target.value, page: 1 })}
            >
              <option value="">Phân loại: Tất cả</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>Phân loại: {category}</option>
              ))}
            </select>
            <select
              aria-label="Lọc theo trình độ"
              className={filterControlClass}
              value={filters.level}
              onChange={(event) => updateFilters({ level: event.target.value as CourseFilters['level'], page: 1 })}
            >
              <option value="all">Trình độ: Tất cả</option>
              <option value="beginner">Trình độ: Cơ bản</option>
              <option value="intermediate">Trình độ: Trung cấp</option>
              <option value="advanced">Trình độ: Nâng cao</option>
            </select>
            <select
              aria-label="Lọc theo trạng thái"
              className={filterControlClass}
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value as CourseFilters['status'], page: 1 })}
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="published">Trạng thái: Công khai</option>
              <option value="archived">Trạng thái: Lưu trữ</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
              className="flex h-[38px] items-center gap-2 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-slate-50"
            >
              <RotateCcw size={14} />
            </button>
          </section>

          {pageError && (
            <div role="alert" className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              <span className="flex items-center gap-2"><AlertCircle size={15} />{pageError}</span>
              <button type="button" onClick={() => void loadCourses()} disabled={loading} className="font-semibold underline">
                Thử lại
              </button>
            </div>
          )}

          {/* Lưới thẻ khóa học */}
          <section aria-label="Danh sách khóa học" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải khóa học">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-[430px] animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
                <BookOpen size={30} className="text-ink-400" />
                <strong className="text-sm font-semibold text-ink-900">Chưa có khóa học phù hợp</strong>
                <span className="text-xs text-ink-500">Thử thay đổi bộ lọc hoặc thêm khóa học mới.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                  const pill = statusPill(course.status)
                  // Giáo viên chính = phần tử đầu tiên trong danh sách phân công (fallback teacher_id)
                  const primaryTeacherId = course.teacher_ids?.[0] ?? course.teacher_id
                  const teacher = primaryTeacherId ? teacherMap.get(primaryTeacherId) : undefined
                  const extraTeacherCount = Math.max(0, (course.teacher_ids?.length ?? 0) - 1)
                  const discount = discountPercent(course)
                  return (
                    <article key={course.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <div className="relative h-44 bg-slate-100">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-ink-400">
                            <ImageIcon size={32} />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className="rounded bg-ink-900/85 px-2 py-1 text-[11px] font-semibold text-white">
                            {course.category}
                          </span>
                          <span className="rounded bg-white/95 px-2 py-1 text-[11px] font-semibold text-ink-900">
                            {levelLabel(course.level)}
                          </span>
                        </div>
                        <span className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border bg-white/95 px-2.5 py-1 text-[11px] font-semibold ${pill.className}`}>
                          <i className={`size-1.5 rounded-full ${pill.dotClassName}`} />
                          {pill.label}
                        </span>
                        <div className="absolute right-3 top-3 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Sửa ${course.title}`}
                            onClick={() => setEditingCourse(course)}
                            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-ink-700 hover:bg-slate-50"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Xóa ${course.title}`}
                            onClick={() => setConfirmAction({ type: 'delete', course })}
                            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-ink-700 hover:bg-slate-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <p className="flex items-center gap-1.5 font-mono text-[11px] text-ink-400">
                          <Link2 size={12} className="shrink-0" />
                          <span className="truncate">/{course.slug}</span>
                        </p>
                        <h3 className="line-clamp-2 text-base font-semibold text-ink-900">{course.title}</h3>
                        {course.target_audience && (
                          <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-ink-700">
                            <Target size={14} className="mt-0.5 shrink-0 text-ink-500" />
                            <span className="line-clamp-2">{course.target_audience}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          {teacher?.avatar_url ? (
                            <img src={teacher.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                              {(teacher?.full_name ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-900">
                              {teacher?.full_name ?? 'Chưa phân công'}
                              {extraTeacherCount > 0 && (
                                <span className="ml-1.5 rounded border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 align-middle">
                                  +{extraTeacherCount} GV
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-ink-500">Giảng viên phụ trách</p>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <strong className="text-base font-bold text-brand-600">
                              {formatPrice(course.discounted_price ?? course.price)}
                            </strong>
                            {discount !== null && (
                              <>
                                <s className="text-xs text-ink-400">{formatPrice(course.price)}</s>
                                <span className="rounded border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-600">
                                  -{discount}%
                                </span>
                              </>
                            )}
                            {discount === null && course.discounted_price === null && (
                              <span className="text-[11px] text-ink-400">(Giá chuẩn)</span>
                            )}
                          </div>
                          {/* TODO (người dùng tự làm): đếm học viên thực tế theo khóa (course_enrollments) */}
                          <span className="flex items-center gap-1 text-xs text-ink-500" title="Học viên đã đăng ký (sẽ cập nhật sau)">
                            <Users size={13} />
                            0
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {course.status === 'archived' ? (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'toggle', course })}
                              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0 active:scale-98 cursor-pointer"
                            >
                              <Play size={13} />
                              Khôi phục xuất bản
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                window.location.assign(`/admin/lessons?courseId=${course.id}`)
                              }
                              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0 active:scale-98 cursor-pointer"
                            >
                              <BookOpen size={13} />
                              Quản lý {course.lesson_count ?? course.total_lessons} bài giảng
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={course.status === 'published' ? `Lưu trữ ${course.title}` : `Công khai ${course.title}`}
                            onClick={() => setConfirmAction({ type: 'toggle', course })}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 cursor-pointer"
                          >
                            {course.status === 'published' ? <Archive size={13} /> : <Play size={13} />}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}

                {/* Thẻ tạo khóa học mới — mở drawer thêm khóa học */}
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 text-center hover:bg-brand-50"
                >
                  <span className="flex size-12 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-600">
                    <Plus size={20} />
                  </span>
                  <span className="text-sm font-semibold text-ink-900">Tạo khóa học mới</span>
                </button>
              </div>
            )}

            {/* Phân trang */}
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4">
              <span className="text-xs text-ink-500">
                Hiển thị {startRecord} - {endRecord} trên tổng số{' '}
                <strong className="font-semibold text-ink-900">{pagination.total.toLocaleString('vi-VN')}</strong> khóa học
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => updateFilters({ page: pagination.page - 1 })}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    aria-current={page === pagination.page ? 'page' : undefined}
                    onClick={() => updateFilters({ page })}
                    className={`inline-flex size-8 items-center justify-center rounded-lg text-[11.5px] font-bold transition-all duration-150 ease-out active:scale-95 cursor-pointer ${
                      page === pagination.page
                        ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)]'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-ink-900'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => updateFilters({ page: pagination.page + 1 })}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-ink-700 active:scale-98 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </footer>

            {loading && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                <LoaderCircle size={14} className="animate-spin" /> Đang tải khóa học…
              </p>
            )}
          </section>
        </main>
      </div>

      {editingCourse !== undefined && (
        <CourseDrawer
          key={editingCourse?.id ?? 'new-course'}
          course={editingCourse}
          teachers={teachers}
          saving={saving}
          onClose={() => {
            if (!saving) setEditingCourse(undefined)
          }}
          onSubmit={handleSave}
        />
      )}

      {confirmAction && actionCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setConfirmAction(null)}
            disabled={actionLoading}
            className="absolute inset-0 cursor-default bg-ink-900/40"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="course-confirm-title"
            className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6"
          >
            <h2 id="course-confirm-title" className="text-base font-semibold text-ink-900">
              {confirmAction.type === 'delete'
                ? 'Xóa khóa học này?'
                : actionCourse.status === 'published'
                  ? 'Lưu trữ khóa học?'
                  : 'Công khai khóa học?'}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              {confirmAction.type === 'delete'
                ? <>Khóa học <strong className="text-ink-900">{actionCourse.title}</strong> sẽ bị xóa vĩnh viễn. Thao tác có thể bị từ chối nếu khóa học đang có dữ liệu liên quan.</>
                : <>Bạn đang thay đổi trạng thái khóa học <strong className="text-ink-900">{actionCourse.title}</strong>.</>}
            </p>
            <footer className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="h-[34px] rounded border border-slate-200 bg-white px-4 text-xs font-semibold text-ink-900 hover:bg-slate-50 disabled:opacity-40"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmedAction()}
                disabled={actionLoading}
                className="flex h-[34px] items-center gap-2 rounded bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {actionLoading && <LoaderCircle size={13} className="animate-spin" />}
                {actionLoading ? 'Đang xử lý…' : confirmAction.type === 'delete' ? 'Xác nhận xóa' : 'Xác nhận'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
