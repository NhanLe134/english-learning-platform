import { useState, type FormEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import type { Course, CourseInput, CourseLevel } from '../types'

interface CourseFormModalProps {
  course: Course | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: CourseInput) => Promise<void>
}

interface CourseFormState {
  title: string
  slug: string
  description: string
  category: string
  level: CourseLevel
  target_audience: string
  price: string
  discounted_price: string
  total_lessons: string
  thumbnail_url: string
  status: 'draft' | 'published'
}

const emptyForm: CourseFormState = {
  title: '',
  slug: '',
  description: '',
  category: '',
  level: 'beginner',
  target_audience: '',
  price: '0',
  discounted_price: '',
  total_lessons: '0',
  thumbnail_url: '',
  status: 'draft',
}

function formFromCourse(course: Course | null): CourseFormState {
  if (!course) return emptyForm
  return {
    title: course.title,
    slug: course.slug,
    description: course.description ?? '',
    category: course.category,
    level: course.level,
    target_audience: course.target_audience,
    price: String(course.price),
    discounted_price: course.discounted_price === null ? '' : String(course.discounted_price),
    total_lessons: String(course.total_lessons),
    thumbnail_url: course.thumbnail_url ?? '',
    status: course.status === 'published' ? 'published' : 'draft',
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CourseFormModal({ course, saving, onClose, onSubmit }: CourseFormModalProps) {
  const [form, setForm] = useState<CourseFormState>(() => formFromCourse(course))
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [formError, setFormError] = useState('')

  const update = <K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const price = Number(form.price)
    const discountedPrice = form.discounted_price === '' ? null : Number(form.discounted_price)
    const totalLessons = Number(form.total_lessons)
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Vui lòng nhập giá khóa học hợp lệ.')
      return
    }
    if (discountedPrice !== null && (!Number.isFinite(discountedPrice) || discountedPrice < 0)) {
      setFormError('Vui lòng nhập giá ưu đãi hợp lệ.')
      return
    }
    if (discountedPrice !== null && discountedPrice > price) {
      setFormError('Giá ưu đãi không thể cao hơn giá gốc.')
      return
    }
    if (!Number.isSafeInteger(totalLessons) || totalLessons < 0) {
      setFormError('Tổng số bài học phải là số nguyên không âm.')
      return
    }

    try {
      await onSubmit({
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        category: form.category.trim(),
        level: form.level,
        target_audience: form.target_audience.trim(),
        price,
        discounted_price: discountedPrice,
        total_lessons: totalLessons,
        thumbnail_url: form.thumbnail_url.trim() || null,
        status: form.status,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu khóa học.')
    }
  }

  return (
    <div className="course-modal-backdrop" role="presentation">
      <section
        className="course-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-form-title"
      >
        <header className="course-modal-header">
          <div>
            <p className="course-eyebrow">QUẢN LÝ NỘI DUNG</p>
            <h2 id="course-form-title">{course ? 'Chỉnh sửa khóa học' : 'Thêm khóa học mới'}</h2>
          </div>
          <button type="button" className="course-icon-button" onClick={onClose} disabled={saving} aria-label="Đóng">
            <X size={19} />
          </button>
        </header>

        <form className="course-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="course-form-grid">
            <label className="course-form-field">
              <span>Tên khóa học <b>*</b></span>
              <input
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value
                  setForm((current) => ({
                    ...current,
                    title,
                    ...(!slugManuallyEdited ? { slug: slugify(title) } : {}),
                  }))
                }}
                maxLength={200}
                required
              />
            </label>
            <label className="course-form-field">
              <span>Slug <b>*</b></span>
              <input
                value={form.slug}
                onChange={(event) => {
                  setSlugManuallyEdited(true)
                  update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
                maxLength={180}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
              />
            </label>
            <label className="course-form-field">
              <span>Danh mục <b>*</b></span>
              <input value={form.category} onChange={(event) => update('category', event.target.value)} maxLength={100} required />
            </label>
            <label className="course-form-field">
              <span>Trình độ <b>*</b></span>
              <select value={form.level} onChange={(event) => update('level', event.target.value as CourseLevel)}>
                <option value="beginner">Cơ bản</option>
                <option value="intermediate">Trung cấp</option>
                <option value="advanced">Nâng cao</option>
              </select>
            </label>
            <label className="course-form-field course-form-wide">
              <span>Mô tả</span>
              <textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} />
            </label>
            <label className="course-form-field course-form-wide">
              <span>Đối tượng mục tiêu <b>*</b></span>
              <input
                value={form.target_audience}
                onChange={(event) => update('target_audience', event.target.value)}
                maxLength={500}
                required
              />
            </label>
            <label className="course-form-field">
              <span>Giá gốc (₫) <b>*</b></span>
              <input type="number" min="0" max="99999999" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} required />
            </label>
            <label className="course-form-field">
              <span>Giá ưu đãi (₫)</span>
              <input type="number" min="0" max="99999999" step="0.01" value={form.discounted_price} onChange={(event) => update('discounted_price', event.target.value)} />
            </label>
            <label className="course-form-field">
              <span>Tổng số bài học <b>*</b></span>
              <input type="number" min="0" max="100000" step="1" value={form.total_lessons} onChange={(event) => update('total_lessons', event.target.value)} required />
            </label>
            <label className="course-form-field">
              <span>Trạng thái</span>
              <select value={form.status} onChange={(event) => update('status', event.target.value as 'draft' | 'published')}>
                <option value="draft">Bản nháp</option>
                <option value="published">Đang hoạt động</option>
              </select>
            </label>
            <label className="course-form-field course-form-wide">
              <span>URL ảnh thumbnail</span>
              <input
                type="url"
                value={form.thumbnail_url}
                onChange={(event) => update('thumbnail_url', event.target.value)}
                placeholder="https://example.com/course-image.jpg"
              />
            </label>
          </div>

          {form.thumbnail_url && (
            <div className="course-image-preview">
              <img src={form.thumbnail_url} alt="Xem trước ảnh khóa học" />
              <span><ImagePlus size={16} /> Xem trước thumbnail</span>
            </div>
          )}
          {formError && <p className="course-form-error" role="alert">{formError}</p>}

          <footer className="course-modal-footer">
            <button type="button" className="course-button course-button-secondary" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="course-button course-button-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : course ? 'Lưu thay đổi' : 'Thêm khóa học'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
