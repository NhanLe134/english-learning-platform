import { type CourseReference } from '../course-data'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export interface CourseCatalogRecord {
  id: string
  title: string
  slug: string
  description: string | null
  category: string
  level: string
  target_audience: string
  price: number
  discounted_price: number | null
  total_lessons: number
  thumbnail_url: string | null
  teacher: { full_name: string; avatar_url: string | null } | null
  topics: {
    id: string
    title: string
    description: string | null
    lessons: { id: string; title: string }[]
  }[]
}

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

function inferIconType(slug: string): CourseReference['iconType'] {
  if (slug.includes('tu-vung')) return 'users'
  if (slug.includes('ngu-phap')) return 'briefcase'
  return 'award'
}

export function mapCourseCatalogRecord(course: CourseCatalogRecord): CourseReference {
  const price = course.discounted_price ?? course.price
  const modules = course.topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    lessons: topic.lessons.map((lesson) => lesson.title),
  }))

  const highlights = [
    course.total_lessons ? `Thời lượng: ${course.total_lessons} bài học` : null,
    'Bài tập thực hành sau mỗi bài học',
    '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
  ].filter(Boolean) as string[]

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    details: [
      course.total_lessons ? `${course.total_lessons} bài học` : '',
      course.category,
      course.level,
    ].filter(Boolean).join(' · '),
    thumbnailUrl: course.thumbnail_url,
    instructor: course.teacher?.full_name || '',
    instructorAvatarUrl: course.teacher?.avatar_url ?? null,
    price,
    originalPrice: Math.max(price, course.price),
    description: course.description ?? '',
    category: course.category,
    level: course.level,
    targetAudience: course.target_audience ?? '',
    totalLessons: course.total_lessons,
    modules,
    highlights,
    isPopular: false,
    iconType: inferIconType(course.slug),
  }
}

async function requestCourseData<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/courses/${path}`)
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.')
  }

  let result: ApiResponse<T>
  try {
    result = await response.json() as ApiResponse<T>
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
  }

  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.message || `Không thể tải dữ liệu (HTTP ${response.status}).`)
  }
  return result.data
}

export const courseCatalogApi = {
  async list(): Promise<CourseReference[]> {
    const data = await requestCourseData<CourseCatalogRecord[]>('catalog')
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }
    return data.map(mapCourseCatalogRecord)
  },

  async get(identifier: string): Promise<CourseReference> {
    const data = await requestCourseData<CourseCatalogRecord>(encodeURIComponent(identifier))
    if (!data || typeof data !== 'object' || !data.id || !data.title) {
      throw new Error('Thông tin khóa học không hợp lệ.')
    }
    return mapCourseCatalogRecord(data)
  },
}
