import { useEffect, useState } from 'react'
import { Check, ChevronDown, Edit3, ExternalLink, Layers, LoaderCircle, Save, Trash2, X } from 'lucide-react'
import { ConfirmModal } from '../../daily-word/components/ConfirmModal'
import type { LessonTopicItem } from '../../them_bai_giang/services/lessonApi'

interface LessonPreviewDrawerProps {
  topics: LessonTopicItem[]
  topicTitle: string
  lesson: NonNullable<LessonTopicItem['lessons'][number]>
  onClose: () => void
  /** Lưu chỉnh sửa — trang cha sẽ reload danh sách sau khi lưu thành công */
  onSaveEdit: (input: {
    lessonId: string
    topicId: string
    title: string
    description: string | null
    videoUrl: string
    status: 'draft' | 'published'
    sortOrder: number
  }) => Promise<void>
  /** Xóa bài giảng — trang cha xử lý API + reload danh sách */
  onDelete: () => Promise<void>
}

/** Chuyển URL YouTube/Drive thành link nhúng (embed) — trả null nếu không nhận diện được */
function buildEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtube.com')) {
      const id =
        parsed.pathname === '/watch'
          ? parsed.searchParams.get('v')
          : parsed.pathname.split('/').filter(Boolean).pop()
      if (id) return `https://www.youtube.com/embed/${id}?enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`
    }
    if (parsed.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${parsed.pathname}?enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1`
    }
    if (parsed.hostname.includes('drive.google.com')) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/)
      const fileId = match?.[1] ?? parsed.searchParams.get('id')
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return null
  } catch {
    return null
  }
}

/**
 * Drawer xem/chỉnh sửa bài giảng từ trang Quản lý bài giảng:
 * - Xem trước: video nhúng (YouTube/Drive), mô tả, trạng thái, thông tin chủ đề
 * - Chỉnh sửa: sửa mọi trường — tiêu đề, chủ đề (chuyển chương), mô tả, URL video,
 *   trạng thái và thứ tự hiển thị (thứ tự tính riêng theo từng chủ đề)
 */
export function LessonPreviewDrawer({
  topics,
  topicTitle,
  lesson,
  onClose,
  onSaveEdit,
  onDelete,
}: LessonPreviewDrawerProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form chỉnh sửa
  const [editTitle, setEditTitle] = useState(lesson.title)
  const [editTopicId, setEditTopicId] = useState(lesson.topic_id)
  const [editDescription, setEditDescription] = useState(lesson.description ?? '')
  const [editVideoUrl, setEditVideoUrl] = useState(lesson.video_url ?? '')
  const [editStatus, setEditStatus] = useState<'draft' | 'published'>(lesson.status)
  const [editSortOrder, setEditSortOrder] = useState(String(lesson.sort_order))

  // Nhập lại form mỗi lần chuyển sang chế độ chỉnh sửa (đồng bộ dữ liệu mới nhất)
  useEffect(() => {
    if (editing) {
      setEditTitle(lesson.title)
      setEditTopicId(lesson.topic_id)
      setEditDescription(lesson.description ?? '')
      setEditVideoUrl(lesson.video_url ?? '')
      setEditStatus(lesson.status)
      setEditSortOrder(String(lesson.sort_order))
      setFormError(null)
    }
  }, [editing, lesson])

  const isPublished = lesson.status === 'published'
  const embedUrl = lesson.video_url ? buildEmbedUrl(lesson.video_url) : null

  function handleSaveEdit() {
    if (!editTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề bài giảng.')
      return
    }
    if (!editTopicId) {
      setFormError('Vui lòng chọn chủ đề.')
      return
    }
    const url = editVideoUrl.trim()
    if (!url) {
      setFormError('Vui lòng nhập liên kết video.')
      return
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
    } catch {
      setFormError('Liên kết video phải là URL http/https hợp lệ.')
      return
    }
    const sortOrder = Number(editSortOrder)
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 1) {
      setFormError('Thứ tự phải là số nguyên dương.')
      return
    }
    setFormError(null)
    setSaving(true)
    void onSaveEdit({
      lessonId: lesson.id,
      topicId: editTopicId,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      videoUrl: url,
      status: editStatus,
      sortOrder,
    }).finally(() => setSaving(false))
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        disabled={saving}
        className="absolute inset-0 cursor-default bg-ink-900/40 disabled:cursor-not-allowed"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Xem trước bài giảng ${lesson.title}`}
        className="relative z-10 flex h-full w-full max-w-[760px] flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Layers className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-ink-900">
                {editing ? 'Chỉnh sửa bài giảng' : lesson.title}
              </h2>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {editing ? 'Sửa mọi trường — kể cả chuyển chủ đề và thứ tự hiển thị' : topicTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={saving}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-40 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Nội dung */}
        {!editing ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            {/* Trạng thái + thông tin nhanh */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isPublished
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <span className={`size-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isPublished ? 'Đã xuất bản' : 'Bản nháp'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-ink-500">
                Thứ tự: {lesson.sort_order}
              </span>
            </div>

            {/* Video nhúng */}
            {embedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <iframe
                  src={embedUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : lesson.video_url ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold text-ink-900">Không nhận diện được nguồn nhúng</p>
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline"
                >
                  <ExternalLink className="size-3" />
                  Mở liên kết video gốc
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-ink-400">
                Bài giảng chưa có video.
              </div>
            )}

            {/* Mô tả */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                MÔ TẢ BÀI GIẢNG &amp; GHI CHÚ HỌC VIÊN
              </h4>
              {lesson.description ? (
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                  {lesson.description}
                </p>
              ) : (
                <p className="mt-2 text-xs italic text-ink-400">Chưa có mô tả.</p>
              )}
            </div>

            {/* Liên kết video gốc */}
            {lesson.video_url && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LIÊN KẾT VIDEO</h4>
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 break-all rounded-xl border border-slate-200 bg-slate-50/60 p-3 font-mono text-[11px] text-brand-700 hover:bg-slate-50"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  {lesson.video_url}
                </a>
              </div>
            )}
          </div>
        ) : (
          /* Chế độ chỉnh sửa */
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            {formError && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}
            <div>
              <label htmlFor="edit-lesson-title" className="text-xs font-bold text-ink-900">
                Tiêu đề bài giảng <span className="text-brand-600">*</span>
              </label>
              <input
                id="edit-lesson-title"
                type="text"
                value={editTitle}
                maxLength={200}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-1.5 h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label htmlFor="edit-lesson-topic" className="text-xs font-bold text-ink-900">
                Chủ đề (chương) <span className="text-brand-600">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  id="edit-lesson-topic"
                  value={editTopicId}
                  onChange={(event) => setEditTopicId(event.target.value)}
                  className="h-[38px] w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 pr-9 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
                >
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title} ({topic.lessons.length} bài)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              </div>
            </div>

            <div>
              <label htmlFor="edit-lesson-video" className="text-xs font-bold text-ink-900">
                URL video <span className="text-brand-600">*</span>
              </label>
              <input
                id="edit-lesson-video"
                type="url"
                value={editVideoUrl}
                onChange={(event) => setEditVideoUrl(event.target.value)}
                className="mt-1.5 h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 font-mono text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div>
              <label htmlFor="edit-lesson-description" className="text-xs font-bold text-ink-900">
                Mô tả bài giảng &amp; Ghi chú học viên
              </label>
              <textarea
                id="edit-lesson-description"
                rows={4}
                value={editDescription}
                maxLength={2000}
                onChange={(event) => setEditDescription(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-ink-900">Trạng thái</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(['published', 'draft'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={editStatus === value}
                      onClick={() => setEditStatus(value)}
                      className={`flex h-[38px] items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        editStatus === value
                          ? value === 'published'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-ink-500 hover:bg-slate-50'
                      }`}
                    >
                      {editStatus === value && <Check className="size-3.5" />}
                      {value === 'published' ? 'Công khai' : 'Bản nháp'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="edit-lesson-sort" className="text-xs font-bold text-ink-900">
                  Thứ tự trong chủ đề
                </label>
                <input
                  id="edit-lesson-sort"
                  type="number"
                  min={1}
                  step="1"
                  value={editSortOrder}
                  onChange={(event) => setEditSortOrder(event.target.value)}
                  className="mt-1.5 h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-medium text-ink-900 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-100 px-7 py-4">
          {!editing ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:border-red-200 hover:bg-red-50/60 hover:text-red-600 active:scale-98 disabled:opacity-50 cursor-pointer"
                title="Xóa bài giảng"
                aria-label="Xóa bài giảng"
              >
                {deleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0 active:scale-98 cursor-pointer"
              >
                <Edit3 className="size-3.5" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200/90 bg-white px-3.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0 active:scale-98 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setFormError(null)
                }}
                disabled={saving}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200/90 bg-white px-3.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:bg-slate-50 hover:text-slate-900 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 active:translate-y-0 active:scale-98 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
              >
                {saving ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          )}

          {/* Modal xác nhận xóa bài giảng */}
          <ConfirmModal
            open={confirmDelete}
            title="Xóa bài giảng này?"
            message={`Xóa vĩnh viễn bài giảng "${lesson.title}" khỏi chủ đề "${topicTitle}"? Hành động không thể hoàn tác.`}
            confirmLabel="Xác nhận xóa"
            danger
            loading={deleting}
            error={formError ?? undefined}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => void (async () => {
              setDeleting(true)
              try {
                await onDelete()
                setConfirmDelete(false)
                onClose()
              } catch (err) {
                setFormError(err instanceof Error ? err.message : 'Không thể xóa bài giảng.')
              } finally {
                setDeleting(false)
              }
            })()}
          />
        </footer>
      </aside>
    </div>
  )
}
