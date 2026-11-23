import { useEffect, useState } from 'react'
import { Check, Edit3, ExternalLink, Layers, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { ConfirmModal } from '../../daily-word/components/ConfirmModal'
import { lessonApi, type LessonQuiz, type LessonTopicItem } from '../../them_bai_giang/services/lessonApi'
import type { BuilderQuestion } from '../../them_bai_giang/components/QuizBuilderSection'
import { useAuth } from '../../auth/auth-context'

interface LessonPreviewDrawerProps {
  topicTitle: string
  lesson: NonNullable<LessonTopicItem['lessons'][number]>
  onClose: () => void
  /** Lưu chỉnh sửa — trang cha sẽ reload danh sách sau khi lưu thành công */
  onSaveEdit: (input: {
    lessonId: string
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

  // Quiz của bài giảng (admin/teacher được trả cả correct_index)
  const { accessToken, refreshSession } = useAuth()
  const [quiz, setQuiz] = useState<LessonQuiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(true)
  const [quizSaving, setQuizSaving] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizSavedNote, setQuizSavedNote] = useState<string | null>(null)

  // Tải quiz mỗi lần mở bài giảng khác
  useEffect(() => {
    let cancelled = false
    setQuizLoading(true)
    setQuiz(null)
    setQuizError(null)
    setQuizSavedNote(null)
    lessonApi
      .getQuiz(lesson.id, accessToken, async () => (await refreshSession()).accessToken)
      .then((data) => {
        if (!cancelled) setQuiz(data)
      })
      .catch(() => {
        /* không tải được quiz → coi như chưa có quiz */
      })
      .finally(() => {
        if (!cancelled) setQuizLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  // Chế độ chỉnh sửa: bản nháp câu hỏi đang soạn (không có quiz → bắt đầu 1 câu rỗng)
  const [editQuiz, setEditQuiz] = useState<BuilderQuestion[]>([])
  useEffect(() => {
    if (!editing) return
    setQuizError(null)
    setQuizSavedNote(null)
    setEditQuiz(
      (quiz?.questions ?? []).map((q) => ({
        content: q.content,
        options: q.options.length >= 2 ? q.options : ['', ''],
        correct_index: q.correct_index ?? 0,
      }))
    )
    if (!quiz || quiz.questions.length === 0) {
      setEditQuiz([{ content: '', options: ['', '', '', ''], correct_index: 0 }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, lesson.id])

  /** Lưu quiz (PUT /lessons/:id/quiz) — thay toàn bộ câu hỏi của bài giảng */
  function handleSaveQuiz() {
    const cleaned = editQuiz
      .map((q) => ({
        content: q.content.trim(),
        options: q.options.map((o) => o.trim()),
        correct_index: q.correct_index,
      }))
      .filter((q) => q.content)
    if (cleaned.length === 0) {
      setQuizError('Quiz phải có ít nhất một câu hỏi có nội dung.')
      return
    }
    for (const [i, q] of cleaned.entries()) {
      if (q.options.filter((o) => o).length < 2) {
        setQuizError(`Câu hỏi ${i + 1}: phải có ít nhất 2 đáp án không để trống.`)
        return
      }
      if (q.correct_index >= q.options.length || !q.options[q.correct_index]) {
        setQuizError(`Câu hỏi ${i + 1}: hãy chọn một đáp án đúng hợp lệ.`)
        return
      }
    }
    setQuizError(null)
    setQuizSaving(true)
    void lessonApi
      .saveQuiz(
        lesson.id,
        { title: quiz?.title || `Quiz: ${lesson.title}`, questions: cleaned },
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      .then((result) => {
        setQuizSavedNote(`Đã lưu quiz (${result.total_questions} câu hỏi).`)
        setTimeout(() => setQuizSavedNote(null), 4000)
        return lessonApi
          .getQuiz(lesson.id, accessToken, async () => (await refreshSession()).accessToken)
          .then((data) => setQuiz(data))
      })
      .catch((err) => {
        setQuizError(err instanceof Error ? err.message : 'Không thể lưu quiz.')
      })
      .finally(() => setQuizSaving(false))
  }

  // Form chỉnh sửa
  const [editTitle, setEditTitle] = useState(lesson.title)
  const [editDescription, setEditDescription] = useState(lesson.description ?? '')
  const [editVideoUrl, setEditVideoUrl] = useState(lesson.video_url ?? '')
  const [editStatus, setEditStatus] = useState<'draft' | 'published'>(lesson.status)
  const [editSortOrder, setEditSortOrder] = useState(String(lesson.sort_order))

  // Nhập lại form mỗi lần chuyển sang chế độ chỉnh sửa (đồng bộ dữ liệu mới nhất)
  useEffect(() => {
    if (editing) {
      setEditTitle(lesson.title)
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
                {editing ? 'Sửa mọi trường — thứ tự hiển thị tính riêng theo nhóm không chủ đề' : topicTitle}
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

            {/* Quiz trắc nghiệm của bài giảng */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                QUIZ TRẮC NGHIỆM
              </h4>
              {quizLoading ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                  <LoaderCircle className="size-3.5 animate-spin" /> Đang tải quiz…
                </p>
              ) : !quiz || quiz.questions.length === 0 ? (
                <p className="mt-2 text-xs italic text-ink-400">
                  Bài giảng chưa có quiz — bấm "Chỉnh sửa" để soạn câu hỏi.
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  {quiz.questions.map((q, qIndex) => (
                    <div key={q.id ?? qIndex} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                      <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        CÂU {qIndex + 1}
                      </span>
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-ink-900">{q.content}</p>
                      <ul className="mt-1.5 space-y-1">
                        {q.options.map((option, oIndex) => (
                          <li
                            key={oIndex}
                            className={`flex items-center gap-1.5 text-xs ${
                              q.correct_index === oIndex
                                ? 'font-bold text-emerald-700'
                                : 'text-ink-600'
                            }`}
                          >
                            {q.correct_index === oIndex ? (
                              <Check className="size-3 shrink-0" />
                            ) : (
                              <span className="size-3 shrink-0" />
                            )}
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
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

            {/* Quiz trắc nghiệm — soạn/lưu riêng qua PUT /lessons/:id/quiz */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-900">Quiz trắc nghiệm</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditQuiz((prev) => [
                      ...prev,
                      { content: '', options: ['', '', '', ''], correct_index: 0 },
                    ])
                  }
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-600"
                >
                  <Plus className="size-3" /> Thêm câu hỏi
                </button>
              </div>

              {quizError && (
                <div role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {quizError}
                </div>
              )}
              {quizSavedNote && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  {quizSavedNote}
                </div>
              )}

              <div className="mt-3 space-y-3">
                {editQuiz.map((question, qIndex) => (
                  <div key={qIndex} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        CÂU {qIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditQuiz((prev) => prev.filter((_, i) => i !== qIndex))}
                        className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700"
                      >
                        <Trash2 className="size-3" /> Xóa câu
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={question.content}
                      maxLength={1000}
                      onChange={(event) =>
                        setEditQuiz((prev) =>
                          prev.map((q, i) => (i === qIndex ? { ...q, content: event.target.value } : q))
                        )
                      }
                      placeholder="Nội dung câu hỏi"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                    />
                    <div className="mt-2 space-y-1.5">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Đáp án đúng ${oIndex + 1}`}
                            aria-pressed={question.correct_index === oIndex}
                            onClick={() =>
                              setEditQuiz((prev) =>
                                prev.map((q, i) => (i === qIndex ? { ...q, correct_index: oIndex } : q))
                              )
                            }
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${
                              question.correct_index === oIndex
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-slate-300 bg-white text-slate-500 hover:border-emerald-400'
                            }`}
                            title="Đặt làm đáp án đúng"
                          >
                            {question.correct_index === oIndex ? <Check className="size-2.5" /> : oIndex + 1}
                          </button>
                          <input
                            type="text"
                            value={option}
                            maxLength={300}
                            onChange={(event) =>
                              setEditQuiz((prev) =>
                                prev.map((q, i) =>
                                  i === qIndex
                                    ? { ...q, options: q.options.map((o, j) => (j === oIndex ? event.target.value : o)) }
                                    : q
                                )
                              )
                            }
                            placeholder={`Nội dung đáp án ${oIndex + 1}`}
                            className="h-[30px] flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={quizSaving}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-ink-900 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  {quizSaving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
                  {quizSaving ? 'Đang lưu quiz…' : 'Lưu câu hỏi quiz'}
                </button>
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
