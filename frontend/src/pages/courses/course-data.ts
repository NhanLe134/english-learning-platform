export interface CourseReference {
  id: string
  slug: string
  title: string
  details: string
  thumbnailUrl: string | null
  instructor: string
  price: number
  originalPrice: number
  description: string
  category: string
  level: string
  targetAudience: string
  totalLessons: number
  modules: CourseModule[]
  highlights?: string[]
  isPopular?: boolean
  iconType?: 'award' | 'users' | 'briefcase'
}

export interface CourseModule {
  id: string
  title: string
  description: string
  lessons: string[]
}

export function createCheckoutUrl(course: CourseReference): string {
  const params = new URLSearchParams({
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    details: course.details,
    instructor: course.instructor,
    price: String(course.price),
    originalPrice: String(course.originalPrice),
    thumbnail: course.thumbnailUrl ?? '',
    category: course.category,
    description: course.description,
    level: course.level,
    targetAudience: course.targetAudience,
    totalLessons: String(course.totalLessons),
  })

  return `/checkout?${params.toString()}`
}

export function createRegistrationUrl(course: CourseReference): string {
  const search = new URL(createCheckoutUrl(course), window.location.origin).search
  return `/register${search}`
}

function readPositiveAmount(value: string | null, fallback: number): number {
  if (!value) return fallback
  const amount = Number(value)
  return Number.isSafeInteger(amount) && amount > 0 ? amount : fallback
}

function readThumbnail(value: string | null): string | null {
  if (!value) return null

  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

/** Minimal placeholder used only as a last-resort fallback for readCheckoutCourse(). */
const PLACEHOLDER: CourseReference = {
  id: '',
  slug: '',
  title: 'Khóa học',
  details: '',
  thumbnailUrl: null,
  instructor: 'Đội ngũ giảng viên',
  price: 0,
  originalPrice: 0,
  description: '',
  category: '',
  level: '',
  targetAudience: '',
  totalLessons: 0,
  modules: [],
}

export function readCheckoutCourse(search: string): CourseReference {
  const params = new URLSearchParams(search)
  const price = readPositiveAmount(params.get('price'), PLACEHOLDER.price)
  const requestedOriginalPrice = readPositiveAmount(
    params.get('originalPrice'),
    PLACEHOLDER.originalPrice,
  )

  return {
    id: params.get('courseId')?.trim() || PLACEHOLDER.id,
    slug: params.get('slug')?.trim() || PLACEHOLDER.slug,
    title: params.get('title')?.trim() || PLACEHOLDER.title,
    details: params.get('details')?.trim() || PLACEHOLDER.details,
    instructor: params.get('instructor')?.trim() || PLACEHOLDER.instructor,
    thumbnailUrl: readThumbnail(params.get('thumbnail')),
    price,
    originalPrice: Math.max(price, requestedOriginalPrice),
    description: params.get('description')?.trim() || PLACEHOLDER.description,
    category: params.get('category')?.trim() || PLACEHOLDER.category,
    level: params.get('level')?.trim() || PLACEHOLDER.level,
    targetAudience: params.get('targetAudience')?.trim() || PLACEHOLDER.targetAudience,
    totalLessons: readPositiveAmount(params.get('totalLessons'), PLACEHOLDER.totalLessons),
    modules: [],
  }
}
