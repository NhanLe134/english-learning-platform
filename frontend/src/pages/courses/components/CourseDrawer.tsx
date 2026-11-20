import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Archive, Check, Globe, ImagePlus, LoaderCircle, X } from 'lucide-react'
import type { Course, CourseInput, CourseLevel } from '../types'

interface CourseDrawerProps {
  /** null = tạo mới, Course = chỉnh sửa */
  course: Course | null
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

const inputClass =
  'h-[38px] w-full rounded border border-slate-300 bg-white px-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none'

const labelClass = 'text-[13px] font-semibold text-ink-900'

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] text-rose-600">{message}</p>
}

export function CourseDrawer({ course, saving, onClose, onSubmit }: CourseDrawerProps) {
  const isEdit = course !== null
  const [title, setTitle] = useState(course?.title ?? '')
  const [slug, setSlug] = useState(course?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [category, setCategory] = useState(course?.category ?? '')
  const [level, setLevel] = useState<CourseLevel>(course?.level ?? 'beginner')
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
    }
    try {
      await onSubmit(input)
    } catch {
      // onSubmit đã hiển thị toast lỗi — giữ drawer mở để người dùng sửa
    }
  }

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
        <header className="flex items-center justify-between border-b border-slate-200 px-7 py-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {isEdit ? 'Chỉnh sửa khóa học' : 'Thêm khóa học mới'}
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              {isEdit
                ? 'Cập nhật thông tin và trạng thái xuất bản của khóa học.'
                : 'Điền thông tin để xuất bản khóa học lên nền tảng.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={saving}
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </header>

        {/* Nội dung */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-7 overflow-y-auto px-7 py-6">
            <FormSection title="Thông tin khóa học">
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
                <div className="mt-1.5 flex h-[38px] items-center rounded border border-slate-300 bg-slate-50 pl-3 focus-within:border-brand-500">
                  <span className="font-mono text-xs text-ink-400">/</span>
                  <input
                    id="course-slug"
                    type="text"
                    className="h-full w-full border-none bg-transparent pl-1 font-mono text-xs text-ink-900 focus:outline-none"
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
                  <input
                    id="course-category"
                    type="text"
                    className={`${inputClass} mt-1.5`}
                    placeholder="VD: IELTS, TOEIC, Phát âm"
                    value={category}
                    maxLength={100}
                    onChange={(event) => setCategory(event.target.value)}
                  />
                  <FieldError message={fieldErrors.category} />
                </div>
                <div>
                  <label htmlFor="course-level" className={labelClass}>Trình độ</label>
                  <select
                    id="course-level"
                    className={`${inputClass} mt-1.5`}
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
                <label htmlFor="course-audience" className={labelClass}>Mô tả đối tượng học viên <span className="text-brand-600">*</span></label>
                <textarea
                  id="course-audience"
                  rows={2}
                  className="mt-1.5 w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
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
                  className="mt-1.5 w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                  placeholder="Mô tả ngắn về nội dung, lợi ích của khóa học (không bắt buộc)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </FormSection>

            <FormSection title="Học phí">
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

            <FormSection title="Ảnh bìa">
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
                    className="mt-3 h-40 w-full rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="mt-3 flex h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[11px] text-ink-400">
                    <ImagePlus size={15} />
                    Chưa có ảnh bìa
                  </div>
                )}
                <FieldError message={fieldErrors.thumbnailUrl} />
              </div>
            </FormSection>

            <FormSection title="Trạng thái">
              {/* Trạng thái: chỉ có Công khai và Lưu trữ */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={status === 'published'}
                  onClick={() => setStatus('published')}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left ${
                    status === 'published'
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Globe size={17} className={status === 'published' ? 'text-emerald-600' : 'text-ink-400'} />
                  <span>
                    <span className="block text-xs font-semibold text-ink-900">Công khai</span>
                    <span className="block text-[11px] text-ink-500">Học viên thấy được khóa học</span>
                  </span>
                  {status === 'published' && <Check size={15} className="ml-auto text-emerald-600" />}
                </button>
                <button
                  type="button"
                  aria-pressed={status === 'archived'}
                  onClick={() => setStatus('archived')}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left ${
                    status === 'archived'
                      ? 'border-slate-400 bg-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Archive size={17} className={status === 'archived' ? 'text-ink-700' : 'text-ink-400'} />
                  <span>
                    <span className="block text-xs font-semibold text-ink-900">Lưu trữ</span>
                    <span className="block text-[11px] text-ink-500">Ẩn khỏi danh mục công khai</span>
                  </span>
                  {status === 'archived' && <Check size={15} className="ml-auto text-ink-700" />}
                </button>
              </div>
            </FormSection>
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-7 py-4">
            {/* Số bài giảng là trường đếm, chỉ hiển thị ở chế độ chỉnh sửa; chưa kết nối đếm tự động nên hiển thị theo dữ liệu hiện có */}
            {isEdit ? (
              <p className="text-xs text-ink-500">
                Số bài giảng: <strong className="font-semibold text-ink-900">{course?.total_lessons ?? 0}</strong>
                <span className="ml-1 text-ink-400">(tự động đếm — chưa khả dụng)</span>
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-[38px] rounded border border-slate-200 bg-white px-4 text-xs font-semibold text-ink-900 hover:bg-slate-50 disabled:opacity-40"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-[38px] items-center gap-2 rounded bg-brand-600 px-5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving && <LoaderCircle size={13} className="animate-spin" />}
                {isEdit ? 'Lưu thay đổi' : 'Tạo khóa học'}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  )
}
