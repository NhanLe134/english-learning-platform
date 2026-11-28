import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LoaderCircle,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { courseApi } from '../courses/services/courseApi'
import type { Course } from '../courses/types'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { ExerciseEditorDrawer } from './components/ExerciseEditorDrawer'
import { ExercisePreviewQuizModal } from './components/ExercisePreviewQuizModal'
import { exerciseApi } from './services/exerciseApi'
import type {
  CourseExerciseDetail,
  CourseExerciseSummary,
  SaveCourseExerciseInput,
} from './types'

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

function readCourseId(): string {
  return new URLSearchParams(window.location.search).get('courseId') ?? ''
}

function statusBadge(status: CourseExerciseSummary['status']) {
  switch (status) {
    case 'published':
      return {
        label: 'Công khai',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
      }
    case 'draft':
      return {
        label: 'Bản nháp',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      }
    case 'archived':
      return {
        label: 'Lưu trữ',
        className: 'border-slate-200 bg-slate-100 text-ink-700',
        dot: 'bg-ink-400',
      }
  }
}

/**
 * Trang quản lý bài tập cấp khóa học (lesson_id IS NULL — khác với quiz của từng bài giảng).
 * Route: /admin/exercises?courseId=<id> — mở từ nút "Quản lý N bài tập" trên thẻ khóa học.
 */
export function QuanLyBaiTapPage() {
  const { accessToken, refreshSession } = useAuth()
  const courseId = readCourseId()

  const [courseListFallback, setCourseListFallback] = useState<Course[]>([])
  const [exercises, setExercises] = useState<CourseExerciseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [editorState, setEditorState] = useState<{
    open: boolean
    detail: CourseExerciseDetail | null
  }>({ open: false, detail: null })
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [previewExercise, setPreviewExercise] = useState<CourseExerciseDetail | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CourseExerciseSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const refreshAccessToken = useCallback(
    async () => (await refreshSession()).accessToken,
    [refreshSession]
  )

  const loadData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      if (!courseId) {
        const courseResult = await courseApi.list(
          {
            search: '',
            category: '',
            level: 'all',
            status: 'all',
            sort: 'newest',
            page: 1,
            limit: 100,
          },
          accessToken,
          refreshAccessToken
        )
        setCourseListFallback(courseResult.courses)
        setExercises([])
        setLoadError(null)
        return
      }

      const list = await exerciseApi.listByCourse(courseId, accessToken, refreshAccessToken)
      setExercises(list)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách bài tập.')
      setExercises([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, courseId, refreshAccessToken])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openEditDrawer = async (exerciseId: string) => {
    setDetailLoadingId(exerciseId)
    try {
      const detail = await exerciseApi.getDetail(exerciseId, accessToken, refreshAccessToken)
      setEditorState({ open: true, detail })
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể tải chi tiết bài tập.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  const openPreviewModal = async (exerciseId: string) => {
    setDetailLoadingId(exerciseId)
    try {
      const detail = await exerciseApi.getDetail(exerciseId, accessToken, refreshAccessToken)
      setPreviewExercise(detail)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể mở bài tập làm thử.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  const handleSaveExercise = async (input: SaveCourseExerciseInput) => {
    if (!courseId) return
    setSaving(true)
    try {
      if (editorState.detail) {
        await exerciseApi.update(editorState.detail.id, input, accessToken, refreshAccessToken)
        showToast('success', 'Đã cập nhật bài tập.')
      } else {
        await exerciseApi.createForCourse(courseId, input, accessToken, refreshAccessToken)
        showToast('success', 'Đã tạo bài tập mới.')
      }
      setEditorState({ open: false, detail: null })
      await loadData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể lưu bài tập.')
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExercise = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await exerciseApi.remove(confirmDelete.id, accessToken, refreshAccessToken)
      showToast('success', 'Đã xóa bài tập.')
      setConfirmDelete(null)
      await loadData()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Không thể xóa bài tập.')
    } finally {
      setDeleting(false)
    }
  }

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  return (
    <div className="user-management-page-container">
      {toast && (
        <div className="app-toast-container" role={toast.type === 'error' ? 'alert' : 'status'}>
          <div className={`app-toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="toast-icon-success" />
            ) : (
              <AlertCircle size={18} className="toast-icon-error" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Sidebar activeTab="khoa_hoc_bai_tap" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader
          breadcrumb={[
            { label: 'Quản lý khóa học', href: '/admin/courses' },
            { label: 'Quản lý bài tập' },
          ]}
        />

        <main className="min-h-screen bg-white px-8 py-8">
          {!courseId ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-2xl font-bold text-ink-900">Quản lý Bài tập theo Khóa học</h1>
                  <p className="mt-1 text-sm text-ink-500">
                    Chọn một khóa học bên dưới để xem và quản lý bộ bài tập của toàn bộ khóa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.assign('/admin/courses')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-ink-800 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Quay lại Quản lý khóa học
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 py-12 text-sm text-ink-500">
                  <LoaderCircle size={16} className="animate-spin" />
                  Đang tải danh sách khóa học…
                </div>
              ) : courseListFallback.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 py-14 text-center text-xs text-ink-500">
                  Chưa có khóa học nào trong hệ thống.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {courseListFallback.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => window.location.assign(`/admin/exercises?courseId=${item.id}`)}
                      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-brand-300 hover:shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-ink-900/85 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {item.category}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink-900">
                          {LEVEL_LABELS[item.level] ?? item.level}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-ink-900">{item.title}</h2>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                        <ClipboardList size={13} />
                        Quản lý {item.exercise_count ?? 0} bài tập
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-16">
              {/* Header khóa học + nút thêm bài tập */}
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="text-2xl font-bold leading-8 text-ink-900">
                    Quản lý Bài tập khóa học
                  </h1>
                  <span className="flex items-center gap-1.5 text-xs text-ink-500">
                    <ClipboardList size={13} className="text-ink-400" />
                    {exercises.length} bài tập toàn khóa
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditorState({ open: true, detail: null })}
                    className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    Thêm bài tập mới
                  </button>
                </div>
              </div>

              {loadError && (
                <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={15} />
                    {loadError}
                  </span>
                  <button type="button" onClick={() => void loadData()} className="font-semibold underline cursor-pointer">
                    Thử lại
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex items-center gap-2 py-16 text-sm text-ink-500">
                  <LoaderCircle size={16} className="animate-spin" />
                  Đang tải danh sách bài tập…
                </div>
              ) : exercises.length === 0 ? (
                <section
                  aria-label="Danh sách bài tập"
                  className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white text-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-xl bg-brand-50">
                    <ClipboardList size={26} className="text-brand-600" />
                  </span>
                  <strong className="text-sm font-semibold text-ink-900">
                    Khóa học này chưa có bài tập nào
                  </strong>
                  <p className="max-w-md text-xs leading-relaxed text-ink-500">
                    Đây là nơi quản lý các bài tập tổng hợp của toàn bộ khóa học (tách biệt với bài kiểm tra trong từng bài giảng).
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditorState({ open: true, detail: null })}
                    className="mt-1 flex h-[34px] items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] hover:from-brand-500 hover:to-brand-600 cursor-pointer"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Thêm bài tập đầu tiên
                  </button>
                </section>
              ) : (
                <div className="space-y-3">
                  {exercises.map((exercise) => {
                    const pill = statusBadge(exercise.status)
                    const isBusy = detailLoadingId === exercise.id
                    return (
                      <article
                        key={exercise.id}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-bold text-ink-900">{exercise.title}</h2>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${pill.className}`}
                            >
                              <span className={`size-1.5 rounded-full ${pill.dot}`} />
                              {pill.label}
                            </span>
                          </div>

                          {exercise.description && (
                            <p className="line-clamp-2 text-xs text-ink-500">{exercise.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-ink-800">
                              {exercise.question_count} câu hỏi ({exercise.max_score} điểm)
                            </span>
                            {exercise.multiple_choice_count > 0 && (
                              <span className="rounded-md border border-brand-100 bg-brand-50 px-2 py-0.5 text-brand-700">
                                {exercise.multiple_choice_count} trắc nghiệm
                              </span>
                            )}
                            {exercise.fill_blank_count > 0 && (
                              <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">
                                {exercise.fill_blank_count} điền từ
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void openPreviewModal(exercise.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-ink-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            {isBusy ? (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5" />
                            )}
                            <span>Làm thử</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void openEditDrawer(exercise.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-ink-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 cursor-pointer"
                          >
                            <Edit3 className="size-3.5" />
                            <span>Chỉnh sửa</span>
                          </button>

                          <button
                            type="button"
                            aria-label={`Xóa ${exercise.title}`}
                            onClick={() => setConfirmDelete(exercise)}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {editorState.open && (
        <ExerciseEditorDrawer
          key={editorState.detail?.id ?? 'new-exercise'}
          exercise={editorState.detail}
          saving={saving}
          onClose={() => {
            if (!saving) setEditorState({ open: false, detail: null })
          }}
          onSubmit={handleSaveExercise}
        />
      )}

      {previewExercise && (
        <ExercisePreviewQuizModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
          onSubmitAnswers={(answers) =>
            exerciseApi.submit(previewExercise.id, answers, accessToken, refreshAccessToken)
          }
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Đóng"
            disabled={deleting}
            onClick={() => setConfirmDelete(null)}
            className="absolute inset-0 cursor-default bg-ink-900/40"
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exercise-delete-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 id="exercise-delete-title" className="text-base font-bold text-ink-900">
              Xóa bài tập này?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Bài tập <strong className="text-ink-900">{confirmDelete.title}</strong> và toàn bộ câu hỏi bên trong sẽ bị xóa vĩnh viễn.
            </p>
            <footer className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-ink-800 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteExercise()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60 cursor-pointer"
              >
                {deleting && <LoaderCircle size={13} className="animate-spin" />}
                <span>{deleting ? 'Đang xóa…' : 'Xác nhận xóa'}</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}

export default QuanLyBaiTapPage
