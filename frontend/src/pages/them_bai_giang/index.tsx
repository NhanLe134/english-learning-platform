import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, LoaderCircle, Save, Upload } from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { LessonInfoSection } from './components/LessonInfoSection'
import { VideoSourceSection, type VideoSource } from './components/VideoSourceSection'
import { SectionCard } from './components/SectionCard'
import { lessonApi } from './services/lessonApi'
import type { LessonTopicItem } from './services/lessonApi'
import { useAuth } from '../auth/auth-context'

/**
 * Trang "Thêm bài giảng & Bài tập tương tác".
 * Route: /admin/lessons/new (ADMIN) và /teacher/lessons/new (giảng viên).
 * MVP: đã nối backend cho phần thêm bài giảng (tiêu đề, chủ đề, mô tả, URL
 * video YouTube/Drive, lưu nháp/xuất bản). Phần Bài tập tương tác, toolbar
 * trình soạn thảo, tải file đính kèm và tải video trực tiếp sẽ hoàn thiện sau.
 */
export default function ThemBaiGiangPage() {
  const { accessToken, refreshSession } = useAuth()
  const courseId = new URLSearchParams(window.location.search).get('courseId') ?? ''

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
  }

  // Dữ liệu chủ đề
  const [topics, setTopics] = useState<LessonTopicItem[]>([])
  const [loadingTopics, setLoadingTopics] = useState(true)

  // Form
  const [title, setTitle] = useState('')
  const [topicId, setTopicId] = useState('')
  const [newTopicMode, setNewTopicMode] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState<VideoSource>('youtube')
  const [videoError, setVideoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const latestRequest = useRef(0)

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Tải danh sách chủ đề của khóa
  const loadTopics = useCallback(async () => {
    if (!courseId) {
      setLoadingTopics(false)
      return
    }
    const requestId = ++latestRequest.current
    try {
      setLoadingTopics(true)
      const data = await lessonApi.getTopics(courseId, accessToken, async () => (await refreshSession()).accessToken)
      if (requestId !== latestRequest.current) return
      setTopics(data)
      // Mặc định chọn chủ đề đầu tiên nếu có
      setTopicId((current) => current || data[0]?.id || '')
    } catch (error) {
      if (requestId !== latestRequest.current) return
      setFormError(error instanceof Error ? error.message : 'Không thể tải chủ đề của khóa học.')
    } finally {
      if (requestId === latestRequest.current) setLoadingTopics(false)
    }
  }, [accessToken, courseId, refreshSession])

  useEffect(() => {
    void loadTopics()
  }, [loadTopics])

  // Kiểm tra định dạng URL video
  function validateVideoUrl(): string | null {
    const url = videoUrl.trim()
    if (!url) return 'Vui lòng nhập liên kết video.'
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'Liên kết phải dùng http/https.'
      return null
    } catch {
      return 'Liên kết không hợp lệ.'
    }
  }

  function handleValidateVideo() {
    setVideoError(validateVideoUrl())
    if (!validateVideoUrl()) showToast('success', 'Định dạng liên kết hợp lệ.')
  }

  // Lưu bài giảng (status: draft hoặc published) — tự tạo chủ đề mới nếu đang ở chế độ đó
  async function handleSave(status: 'draft' | 'published') {
    setFormError(null)

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề bài giảng.')
      return
    }
    const videoErr = validateVideoUrl()
    if (videoErr) {
      setVideoError(videoErr)
      setFormError(videoErr)
      return
    }
    if (newTopicMode && !newTopicTitle.trim()) {
      setFormError('Vui lòng nhập tên chủ đề mới.')
      return
    }
    if (!newTopicMode && !topicId) {
      setFormError('Vui lòng chọn chủ đề cho bài giảng.')
      return
    }

    setSaving(true)
    try {
      let targetTopicId = topicId
      if (newTopicMode) {
        const topic = await lessonApi.createTopic(courseId, newTopicTitle.trim(), accessToken, async () => (await refreshSession()).accessToken)
        targetTopicId = topic.id
      }
      await lessonApi.createLesson(
        {
          topicId: targetTopicId,
          title: title.trim(),
          description: description.trim() || null,
          videoUrl: videoUrl.trim(),
          status,
        },
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      showToast('success', status === 'published' ? 'Đã xuất bản bài giảng.' : 'Đã lưu bài giảng vào bản nháp.')
      window.location.assign(`/admin/lessons?courseId=${courseId}`)
    } catch (error) {
      setSaving(false)
      setFormError(error instanceof Error ? error.message : 'Không thể lưu bài giảng.')
    }
  }

  return (
    <div className="user-management-page-container">
      <Sidebar activeTab="khoa_hoc_bai_tap" onTabChange={navigateAdmin} />
      <div className="user-management-main-wrapper">
        <TopHeader
          breadcrumb={[
            { label: 'Quản lý khóa học', href: '/admin/courses' },
            ...(courseId ? [{ label: 'Quản lý bài giảng', href: `/admin/lessons?courseId=${courseId}` }] : []),
            { label: 'Thêm bài giảng & Bài tập' },
          ]}
        />

        <main className="min-h-screen bg-white px-8 py-8">
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

          <div className="flex flex-col gap-8 pb-16">
            {/* Thanh tiêu đề + hành động */}
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold leading-8 text-ink-900">
                  Thêm bài giảng &amp; Bài tập tương tác
                </h1>
                <span className="flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
                  <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                  <span className="text-xs font-semibold leading-4 text-amber-700">
                    Trạng thái: Bản nháp (Draft)
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled
                  title="Tính năng sẽ được cập nhật sau"
                  className="flex h-[34px] cursor-not-allowed items-center gap-2 whitespace-nowrap rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-500 opacity-60 focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <Eye className="size-3.5 shrink-0" aria-hidden />
                  Xem trước (Student View)
                </button>
                <button
                  type="button"
                  disabled={saving || loadingTopics}
                  onClick={() => void handleSave('draft')}
                  className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-3.5 shrink-0" aria-hidden />
                  )}
                  Lưu bản nháp
                </button>
                <button
                  type="button"
                  disabled={saving || loadingTopics}
                  onClick={() => void handleSave('published')}
                  className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="size-3.5 shrink-0" aria-hidden />
                  )}
                  Xuất bản bài giảng
                </button>
              </div>
            </div>

            {formError && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                <AlertCircle size={15} />
                {formError}
              </div>
            )}

            {!courseId ? (
              <SectionCard icon={AlertCircle} title="Thiếu thông tin khóa học" subtitle="Không thể thêm bài giảng">
                <p className="text-xs leading-relaxed text-ink-500">
                  Không xác định được khóa học (thiếu courseId trên địa chỉ trang). Hãy quay lại
                  {' '}
                  <a href="/admin/courses" className="font-semibold text-brand-700 underline">Quản lý khóa học</a>
                  {' '}và bấm "Quản lý bài giảng" của khóa cần thêm bài.
                </p>
              </SectionCard>
            ) : (
              <div className="flex flex-col gap-8">
                <LessonInfoSection
                  title={title}
                  onTitleChange={setTitle}
                  topics={topics}
                  topicId={topicId}
                  onTopicChange={setTopicId}
                  newTopicMode={newTopicMode}
                  onToggleNewTopic={() => {
                    setNewTopicMode((mode) => !mode)
                    setNewTopicTitle('')
                  }}
                  newTopicTitle={newTopicTitle}
                  onNewTopicTitleChange={setNewTopicTitle}
                  description={description}
                  onDescriptionChange={setDescription}
                />

                <VideoSourceSection
                  videoUrl={videoUrl}
                  onVideoUrlChange={(value) => {
                    setVideoUrl(value)
                    setVideoError(null)
                  }}
                  source={videoSource}
                  onSourceChange={setVideoSource}
                  validationError={videoError ?? undefined}
                  onValidate={handleValidateVideo}
                />

                {/* Section Bài tập tương tác + Tài liệu đính kèm — hoàn thiện sau
                    (module exercises và Supabase Storage chưa sẵn sàng) */}
                <SectionCard
                  icon={LoaderCircle}
                  title="3. Bài tập tương tác & Tài liệu đính kèm"
                  subtitle="Đang hoàn thiện — sẽ mở sau khi phần bài giảng ổn định"
                >
                  <p className="text-xs leading-relaxed text-ink-500">
                    Tính năng đang hoàn thiện — hiện tại hãy tập trung vào phần Thêm bài giảng.
                    Sau khi lưu, bài giảng sẽ xuất hiện trong trang Quản lý bài giảng của khóa.
                  </p>
                </SectionCard>

                {loadingTopics && (
                  <p className="flex items-center gap-1.5 text-xs text-ink-500">
                    <LoaderCircle size={14} className="animate-spin" /> Đang tải chủ đề của khóa…
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}