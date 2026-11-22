import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Archive,
  Banknote,
  BookOpen,
  Check,
  ChevronDown,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  X,
} from 'lucide-react'
import type { UserProfile } from '../../quan_ly_nguoi_dung/types'
import type { Course, CourseInput, CourseLevel } from '../types'

interface CourseDrawerProps {
  /** null = tạo mới, Course = chỉnh sửa */
  course: Course | null
  /** Danh sách giáo viên (vai trò TEACHER) cho trường phân công giảng dạy */
  teachers: UserProfile[]
  /** Danh sách phân loại đã tồn tại (cho dropdown chọn, tránh gõ tay sai chính tả) */
  categories: string[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: CourseInput) => Promise<void>
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
}

// Input theo style Daily Word: nền xám nhạt, bo tròn lớn, focus viền đỏ + ring
const inputClass =
  'h-[38px] w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600'

const labelClass = 'text-xs font-bold text-ink-900'

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof BookOpen
  children: ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-extrabold text-ink-900">{title}</h3>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] font-semibold text-rose-600">{message}</p>
}

export function CourseDrawer({ course, teachers, categories, saving, onClose, onSubmit }: CourseDrawerProps) {
  const isEdit = course !== null
  const [title, setTitle] = useState(course?.title ?? '')
  const [slug, setSlug] = useState(course?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [category, setCategory] = useState(course?.category ?? '')
  const [newCategoryMode, setNewCategoryMode] = useState(
    // Khóa đang sửa có phân loại không nằm trong danh sách → giữ nguyên giá trị đó
    Boolean(course?.category && !categories.includes(course.category))
  )
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? 'beginner')
  // Phân công nhiều giáo viên: mặc định là giáo viên chính hiện tại của khóa
  const [teacherIds, setTeacherIds] = useState<string[]>(
    course?.teacher_ids ?? (course?.teacher_id ? [course.teacher_id] : [])
  )
  const [description, setDescription] = useState(course?.description ?? '')
  const [targetAudience, setTargetAudience] = useState(course?.target_audience ?? '')
  const [price, setPrice] = useState(course ? String(course.price) : '')
  const [discountedPrice, setDiscountedPrice] = useState(
    course?.discounted_price !== null && course?.discounted_price !== undefined
      ? String(course.discounted_price)
      : ''
  )
  const [thumbnailUrl, setThumbnailUrl] = useState(course?.thumbnail_url ?? '')
  const [status, setStatus] = useState<'published' | 'archived'>(course?.status === 'archived' ? 'archived' : 'published')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const previewUrl = useMemo(() => {
    if (!thumbnailUrl.trim()) return null
    try {
      const url = new URL(thumbnailUrl.trim())
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
    } catch {
      return null
    }
  }, [thumbnailUrl])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Tên khóa học không được để trống.'
    if (!slug.trim()) {
      errors.slug = 'Slug không được để trống.'
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim())) {
      errors.slug = 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'
    }
    if (!category.trim()) errors.category = 'Phân loại không được để trống.'
    if (teachers.length > 0 && teacherIds.length === 0) {
      errors.teacherIds = 'Vui lòng phân công ít nhất một giáo viên phụ trách.'
    }
    if (!targetAudience.trim()) errors.targetAudience = 'Mô tả đối tượng học viên không được để trống.'
    const parsedPrice = Number(price)
    if (price.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      errors.price = 'Giá khóa học phải là số không âm.'
    }
    if (discountedPrice.trim() !== '') {
      const parsedDiscount = Number(discountedPrice)
      if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
        errors.discountedPrice = 'Giá khuyến mãi phải là số không âm.'
      } else if (!errors.price && parsedDiscount > parsedPrice) {
        errors.discountedPrice = 'Giá khuyến mãi không được vượt quá giá gốc.'
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !validate()) return
    const input: CourseInput = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      category: category.trim(),
      level,
      target_audience: targetAudience.trim(),
      price: Number(price),
      discounted_price: discountedPrice.trim() === '' ? null : Number(discountedPrice),
      // Số bài giảng do hệ thống đếm (chưa kết nối) — giữ nguyên giá trị hiện có của khóa,
      // khóa mới mặc định 0.
      total_lessons: course?.total_lessons ?? 0,
      thumbnail_url: thumbnailUrl.trim() || null,
      status,
      teacher_ids: teacherIds,
    }
    try {
      await onSubmit(input)
    } catch {
      // onSubmit đã hiển thị toast lỗi — giữ drawer mở để người dùng sửa
    }
  }

  const textareaClass = `mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400 focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600`

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => {
          if (!saving) onClose()
        }}
        className="absolute inset-0 cursor-default bg-ink-900/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Chỉnh sửa khóa học' : 'Thêm khóa học mới'}
        className="relative z-10 flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BookOpen className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink-900">
                {isEdit ? 'Chỉnh sửa khóa học' : 'Thêm khóa học mới'}
              </h2>
              <p className="mt-0.5 text-xs text-ink-500">
                {isEdit
                  ? 'Cập nhật thông tin và trạng thái xuất bản của khóa học.'
                  : 'Điền thông tin để xuất bản khóa học lên nền tảng.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-ink-700 disabled:opacity-40 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Nội dung */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
            {/* Nhóm Thông tin khóa học: bỏ header vì trùng với tiêu đề drawer */}
            <div className="space-y-4">
              <div>
                <label htmlFor="course-title" className={labelClass}>Tên khóa học <span className="text-brand-600">*</span></label>
                <input
                  id="course-title"
                  type="text"
                  className={`${inputClass} mt-1.5`}
                  placeholder="VD: IELTS Intensive Masterclass: Speaking & Writing Band 7.5+"
                  value={title}
                  maxLength={200}
                  onChange={(event) => {
                    const value = event.target.value
                    setTitle(value)
                    if (!slugTouched) setSlug(slugify(value))
                  }}
                />
                <FieldError message={fieldErrors.title} />
              </div>

              <div>
                <label htmlFor="course-slug" className={labelClass}>Đường dẫn (slug) <span className="text-brand-600">*</span></label>
                <div className="mt-1.5 flex h-[38px] items-center rounded-xl border border-slate-200 bg-slate-50/60 pl-3.5 outline-none focus-within:border-brand-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-600">
                  <span className="font-mono text-xs text-ink-400">/</span>
                  <input
                    id="course-slug"
                    type="text"
                    className="h-full w-full border-none bg-transparent pl-1 font-mono text-xs font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
                    placeholder="ielts-intensive-speaking-writing-7-5"
                    value={slug}
                    maxLength={180}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setSlug(event.target.value.toLowerCase())
                    }}
                  />
                </div>
                <FieldError message={fieldErrors.slug} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-category" className={labelClass}>Phân loại <span className="text-brand-600">*</span></label>
                  {!newCategoryMode ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          id="course-category"
                          className={`${inputClass} cursor-pointer appearance-none pr-8`}
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                        >
                          <option value="" disabled={categories.length > 0}>
                            — Chọn phân loại —
                          </option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          {/* Khóa đang sửa có phân loại ngoài danh sách → giữ hiển thị */}
                          {category && !categories.includes(category) && (
                            <option value={category}>{category}</option>
                          )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryMode(true)
                          setCategory('')
                        }}
                        title="Tạo phân loại mới"
                        className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-ink-900 transition-colors hover:bg-slate-50"
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Mới
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        id="course-category"
                        type="text"
                        className={`${inputClass} flex-1`}
                        placeholder="Tên phân loại mới (VD: IELTS, TOEIC, Phát âm)"
                        value={category}
                        maxLength={100}
                        autoFocus
                        onChange={(event) => setCategory(event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryMode(false)
                          setCategory(course?.category ?? '')
                        }}
                        className="h-[38px] shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink-900"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                  <FieldError message={fieldErrors.category} />
                </div>
                <div>
                  <label htmlFor="course-level" className={labelClass}>Trình độ</label>
                  <select
                    id="course-level"
                    className={`${inputClass} mt-1.5 cursor-pointer`}
                    value={level}
                    onChange={(event) => setLevel(event.target.value as CourseLevel)}
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="course-teacher" className={labelClass}>Phân công giáo viên <span className="text-brand-600">*</span></label>
                {teachers.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                    {teachers.map((teacher) => {
                      const selected = teacherIds.includes(teacher.id)
                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setTeacherIds((prev) =>
                              prev.includes(teacher.id)
                                ? prev.filter((id) => id !== teacher.id)
                                : [...prev, teacher.id]
                            )
                          }
                          className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                            selected
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {selected && <Check className="size-3" />}
                          {teacher.full_name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-[11px] text-ink-400">
                    Chưa có giáo viên nào trong hệ thống.
                  </div>
                )}
                {teachers.length > 0 && teacherIds.length > 0 && (
                  <p className="mt-1 text-[11px] text-ink-400">
                    Đã chọn {teacherIds.length} giáo viên — giáo viên đầu tiên là giáo viên chính.
                  </p>
                )}
                <FieldError message={fieldErrors.teacherIds} />
              </div>

              <div>
                <label htmlFor="course-audience" className={labelClass}>Mô tả đối tượng học viên <span className="text-brand-600">*</span></label>
                <textarea
                  id="course-audience"
                  rows={2}
                  className={textareaClass}
                  placeholder="VD: Nắm vững tiêu chí Lexical Resource & Grammatical Range để bứt phá band 8.0"
                  value={targetAudience}
                  maxLength={500}
                  onChange={(event) => setTargetAudience(event.target.value)}
                />
                <FieldError message={fieldErrors.targetAudience} />
              </div>

              <div>
                <label htmlFor="course-description" className={labelClass}>Giới thiệu khóa học</label>
                <textarea
                  id="course-description"
                  rows={3}
                  className={textareaClass}
                  placeholder="Mô tả ngắn về nội dung, lợi ích của khóa học (không bắt buộc)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>

            <FormSection title="Học phí" icon={Banknote}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-price" className={labelClass}>Giá khóa học (₫) <span className="text-brand-600">*</span></label>
                  <input
                    id="course-price"
                    type="number"
                    min={0}
                    step="1000"
                    className={`${inputClass} mt-1.5`}
                    placeholder="3490000"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  <FieldError message={fieldErrors.price} />
                </div>
                <div>
                  <label htmlFor="course-discount" className={labelClass}>Giá khuyến mãi (₫)</label>
                  <input
                    id="course-discount"
                    type="number"
                    min={0}
                    step="1000"
                    className={`${inputClass} mt-1.5`}
                    placeholder="Để trống nếu không giảm giá"
                    value={discountedPrice}
                    onChange={(event) => setDiscountedPrice(event.target.value)}
                  />
                  <FieldError message={fieldErrors.discountedPrice} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Ảnh bìa" icon={ImageIcon}>
              <div>
                <label htmlFor="course-thumbnail" className={labelClass}>URL ảnh bìa</label>
                <input
                  id="course-thumbnail"
                  type="text"
                  className={`${inputClass} mt-1.5`}
                  placeholder="https://..."
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Xem trước ảnh bìa"
                    className="mt-3 h-40 w-full rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="mt-3 flex h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-[11px] text-ink-400">
                    <ImagePlus className="size-4" />
                    Chưa có ảnh bìa
                  </div>
                )}
                <FieldError message={fieldErrors.thumbnailUrl} />
              </div>
            </FormSection>

            <FormSection title="Trạng thái" icon={Globe}>
              {/* Trạng thái: chỉ có Công khai và Lưu trữ */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={status === 'published'}
                  onClick={() => setStatus('published')}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
                    status === 'published'
                      ? 'border-emerald-300 bg-emerald-50 shadow-[0_1px_4px_rgba(16,185,129,0.15)]'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <Globe size={17} className={status === 'published' ? 'text-emerald-600' : 'text-ink-400'} />
                  <span>
                    <span className="block text-xs font-extrabold text-ink-900">Công khai</span>
                    <span className="block text-[11px] font-medium text-ink-500">Học viên thấy được khóa học</span>
                  </span>
                  {status === 'published' && <Check className="ml-auto size-4 text-emerald-600" />}
                </button>
                <button
                  type="button"
                  aria-pressed={status === 'archived'}
                  onClick={() => setStatus('archived')}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
                    status === 'archived'
                      ? 'border-slate-400 bg-slate-100 shadow-[0_1px_4px_rgba(71,85,105,0.15)]'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <Archive size={17} className={status === 'archived' ? 'text-ink-700' : 'text-ink-400'} />
                  <span>
                    <span className="block text-xs font-extrabold text-ink-900">Lưu trữ</span>
                    <span className="block text-[11px] font-medium text-ink-500">Ẩn khỏi danh mục công khai</span>
                  </span>
                  {status === 'archived' && <Check className="ml-auto size-4 text-ink-700" />}
                </button>
              </div>
            </FormSection>
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-7 py-4">
            {/* Số bài giảng là trường đếm, chỉ hiển thị ở chế độ chỉnh sửa; chưa kết nối đếm tự động */}
            {isEdit ? (
              <p className="text-xs text-ink-500">
                Số bài giảng: <strong className="font-extrabold text-ink-900">{course?.total_lessons ?? 0}</strong>
                <span className="ml-1 text-ink-400">(tự động đếm — chưa khả dụng)</span>
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex h-7 items-center rounded-md border border-slate-200/90 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-brand-600 to-brand-700 px-3 text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(200,16,46,0.25)] ring-1 ring-brand-700/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 hover:shadow-[0_4px_12px_rgba(200,16,46,0.35)] active:translate-y-0 active:scale-98 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
              >
                {saving ? (
                  <LoaderCircle className="size-3 animate-spin" />
                ) : isEdit ? (
                  <Save className="size-3" />
                ) : (
                  <Plus className="size-3" />
                )}
                <span>{isEdit ? 'Lưu thay đổi' : 'Tạo khóa học'}</span>
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  )
}
