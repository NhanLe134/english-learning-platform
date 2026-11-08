import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Grid2X2,
  Image,
  List,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { CourseFormModal } from './components/CourseFormModal'
import { courseApi } from './services/courseApi'
import type { Course, CourseFilters, CourseInput, CoursePagination } from './types'
import './course-management.css'

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
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

function levelLabel(level: Course['level']): string {
  switch (level) {
    case 'beginner': return 'Cơ bản'
    case 'intermediate': return 'Trung cấp'
    case 'advanced': return 'Nâng cao'
  }
}

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
        const status = confirmAction.course.status === 'published' ? 'draft' : 'published'
        await courseApi.updateStatus(
          confirmAction.course.id,
          status,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        showToast('success', status === 'published' ? 'Đã kích hoạt khóa học.' : 'Đã chuyển khóa học về bản nháp.')
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
  }

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)
  const actionCourse = confirmAction?.course
  const availableCategories = [...new Set(courses.map((course) => course.category))].sort()

  const resetFilters = () => setFilters(initialFilters)

  return (
    <div className="user-management-page-container course-management-page">
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

        <main className="user-management-content course-management-content">
          {/* Khối bọc Tiêu đề + Thanh tìm kiếm với nền màu loang (gradient) */}
          <div className="course-hero-banner">
            <div className="course-page-heading">
              <div>
                <p className="course-eyebrow">DANH MỤC ĐÀO TẠO · QUẢN TRỊ</p>
                <h1>Khám Phá Các Khóa Học <span>Tiếng Anh Chuẩn Quốc Tế</span></h1>
                <p>Quản lý nội dung, giá và trạng thái các khóa học trên nền tảng.</p>
              </div>
              <button type="button" className="course-button course-button-primary" onClick={() => setEditingCourse(null)}>
                <Plus size={18} />
                Thêm khóa học
              </button>
            </div>

            <section className="course-search-panel" aria-label="Tìm kiếm khóa học">
              <label className="course-search">
                <Search size={18} aria-hidden="true" />
                <span className="course-visually-hidden">Tìm kiếm khóa học</span>
                <input
                  type="search"
                  placeholder="Tìm khóa học IELTS, Giao tiếp, TOEIC, Ngữ pháp..."
                  value={filters.search}
                  onChange={(event) => updateFilters({ search: event.target.value, page: 1 })}
                />
              </label>
              <button type="button" className="course-button course-button-secondary" onClick={resetFilters}>
                <RotateCcw size={15} />
                Đặt lại bộ lọc
              </button>
              <button type="button" className="course-button course-button-primary course-search-submit" onClick={() => void loadCourses()}>
                Tìm kiếm
                <Search size={15} />
              </button>
            </section>
          </div>

          <section className="course-filter-card" aria-label="Bộ lọc khóa học">
            <label className="course-filter-field">
              <span>Cấp độ học viên</span>
              <select
                value={filters.level}
                onChange={(event) => updateFilters({ level: event.target.value as CourseFilters['level'], page: 1 })}
              >
                <option value="all">Tất cả cấp độ</option>
                <option value="beginner">Cơ bản</option>
                <option value="intermediate">Trung cấp</option>
                <option value="advanced">Nâng cao</option>
              </select>
            </label>
            <label className="course-filter-field">
              <span>Danh mục</span>
              <input
                list="course-category-options"
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value, page: 1 })}
                placeholder="Tất cả danh mục"
              />
              <datalist id="course-category-options">
                {availableCategories.map((category) => <option key={category} value={category} />)}
              </datalist>
            </label>
            <label className="course-filter-field">
              <span>Trạng thái</span>
              <select
                value={filters.status}
                onChange={(event) => updateFilters({ status: event.target.value as CourseFilters['status'], page: 1 })}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đang hoạt động</option>
                <option value="draft">Bản nháp</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </label>
            <label className="course-filter-field">
              <span>Sắp xếp</span>
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value as CourseFilters['sort'], page: 1 })}
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thấp đến cao</option>
                <option value="price_desc">Giá cao đến thấp</option>
              </select>
            </label>
            <button type="button" className="course-reset-link" onClick={resetFilters}>Xóa tất cả</button>
          </section>

          {pageError && (
            <div className="course-error-banner" role="alert">
              <span>{pageError}</span>
              <button type="button" onClick={() => void loadCourses()} disabled={loading}>Thử lại</button>
            </div>
          )}

          <div className="course-category-chips" aria-label="Lọc nhanh theo danh mục">
            <span>Bộ lọc nhanh:</span>
            <button type="button" className={!filters.category ? 'selected' : ''} onClick={() => updateFilters({ category: '', page: 1 })}>
              Tất cả khóa học
            </button>
            {availableCategories.map((category) => (
              <button
                type="button"
                className={filters.category === category ? 'selected' : ''}
                key={category}
                onClick={() => updateFilters({ category, page: 1 })}
              >
                {category}
              </button>
            ))}
          </div>

          <section className="course-catalog-section" aria-label="Danh sách khóa học">
            <header className="course-catalog-heading">
              <div>
                <h2>Danh Sách Khóa Học</h2>
                <span>Tìm thấy {pagination.total.toLocaleString('vi-VN')} khóa học</span>
              </div>
              <div className="course-view-controls" role="group" aria-label="Kiểu hiển thị">
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} aria-label="Dạng lưới" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                  <Grid2X2 size={16} />
                </button>
                <button type="button" className={viewMode === 'list' ? 'active' : ''} aria-label="Dạng danh sách" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>
                  <List size={17} />
                </button>
              </div>
            </header>

            {loading ? (
              <div className={`course-card-grid ${viewMode === 'list' ? 'list-view' : ''}`} aria-label="Đang tải khóa học">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="course-card-skeleton" />)}
              </div>
            ) : courses.length === 0 ? (
              <div className="course-empty-state">
                <BookOpen size={30} />
                <strong>Chưa có khóa học phù hợp</strong>
                <span>Thử thay đổi bộ lọc hoặc thêm khóa học mới.</span>
              </div>
            ) : (
              <div className={`course-card-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                {courses.map((course) => (
                  <article className="course-card" key={course.id}>
                    <div className="course-card-image">
                      {course.thumbnail_url
                        ? <img src={course.thumbnail_url} alt="" loading="lazy" />
                        : <div className="course-image-placeholder"><Image size={32} /></div>}
                      <div className="course-card-image-badges">
                        <span className={`course-status-badge ${course.status}`}>
                          <i />
                          {course.status === 'published' ? 'ĐANG HOẠT ĐỘNG' : course.status === 'archived' ? 'ĐÃ LƯU TRỮ' : 'BẢN NHÁP'}
                        </span>
                        <span className="course-card-id">{course.slug}</span>
                      </div>
                      <div className="course-card-actions" aria-label={`Thao tác ${course.title}`}>
                        <button type="button" className="course-icon-button" aria-label={`Sửa ${course.title}`} onClick={() => setEditingCourse(course)}>
                          <Edit3 size={15} />
                        </button>
                        <button type="button" className="course-icon-button" aria-label={course.status === 'published' ? `Tạm dừng ${course.title}` : `Kích hoạt ${course.title}`} onClick={() => setConfirmAction({ type: 'toggle', course })}>
                          {course.status === 'published' ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button type="button" className="course-icon-button danger" aria-label={`Xóa ${course.title}`} onClick={() => setConfirmAction({ type: 'delete', course })}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="course-card-content">
                      <div className="course-card-meta">
                        <span>{course.category}</span>
                        <span>{levelLabel(course.level)}</span>
                        <span>{course.total_lessons} bài học</span>
                      </div>
                      <h3>{course.title}</h3>
                      <p className="course-card-description">{course.description || course.target_audience}</p>
                      <div className="course-card-audience">{course.target_audience}</div>
                      <footer className="course-card-footer">
                        <div className="course-price-cell">
                          {course.discounted_price !== null && <span>{formatPrice(course.price)}</span>}
                          <strong>{formatPrice(course.discounted_price ?? course.price)}</strong>
                        </div>
                        <span className="course-card-short-id">ID {course.id.slice(0, 8)}</span>
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <footer className="course-table-footer">
              <span>Hiển thị {startRecord}–{endRecord} trong {pagination.total.toLocaleString('vi-VN')} khóa học</span>
              <div className="course-page-controls">
                <button type="button" onClick={() => updateFilters({ page: pagination.page - 1 })} disabled={loading || pagination.page <= 1} aria-label="Trang trước">
                  <ChevronLeft size={17} />
                </button>
                <span>Trang {pagination.page} / {pagination.totalPages}</span>
                <button type="button" onClick={() => updateFilters({ page: pagination.page + 1 })} disabled={loading || pagination.page >= pagination.totalPages} aria-label="Trang sau">
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </section>
          {loading && <span className="course-loading-note"><LoaderCircle size={15} /> Đang tải khóa học…</span>}
        </main>
      </div>

      {editingCourse !== undefined && (
        <CourseFormModal
          key={editingCourse?.id ?? 'new-course'}
          course={editingCourse}
          saving={saving}
          onClose={() => {
            if (!saving) setEditingCourse(undefined)
          }}
          onSubmit={handleSave}
        />
      )}

      {confirmAction && actionCourse && (
        <div className="course-modal-backdrop" role="presentation">
          <section className="course-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="course-confirm-title">
            <p className="course-eyebrow">XÁC NHẬN THAO TÁC</p>
            <h2 id="course-confirm-title">
              {confirmAction.type === 'delete'
                ? 'Xóa khóa học này?'
                : actionCourse.status === 'published'
                  ? 'Tạm dừng khóa học?'
                  : 'Kích hoạt khóa học?'}
            </h2>
            <p>
              {confirmAction.type === 'delete'
                ? <>Khóa học <strong>{actionCourse.title}</strong> sẽ bị xóa vĩnh viễn. Thao tác có thể bị từ chối nếu khóa học đang có dữ liệu liên quan.</>
                : <>Bạn đang thay đổi trạng thái khóa học <strong>{actionCourse.title}</strong>.</>}
            </p>
            <footer className="course-modal-footer">
              <button type="button" className="course-button course-button-secondary" onClick={() => setConfirmAction(null)} disabled={actionLoading}>Hủy</button>
              <button type="button" className="course-button course-button-primary" onClick={() => void handleConfirmedAction()} disabled={actionLoading}>
                {actionLoading ? 'Đang xử lý…' : confirmAction.type === 'delete' ? 'Xác nhận xóa' : 'Xác nhận'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
