import { DEFAULT_COURSES, type CourseReference } from '../course-data'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

interface CourseCatalogRecord {
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
  teacher: { full_name: string } | null
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

function mapCourse(course: CourseCatalogRecord): CourseReference {
  const price = course.discounted_price ?? course.price
  const modules = course.topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    lessons: topic.lessons.map((lesson) => lesson.title),
  }))

  const defaultMeta = DEFAULT_COURSES.find(
    (item) => item.slug === course.slug || item.id === course.id
  )

  const isPopular = defaultMeta?.isPopular ?? course.slug.includes('tu-vung')
  const iconType = defaultMeta?.iconType ?? (
    course.slug.includes('tu-vung') ? 'users' :
    course.slug.includes('ngu-phap') ? 'briefcase' : 'award'
  )
  const highlights = defaultMeta?.highlights ?? [
    `Thời lượng: ${course.total_lessons || 20} video`,
    course.slug.includes('phat-am') ? 'Có bài tập thực hành sau mỗi video' : 'Bài tập thực hành sau mỗi video',
    '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
  ]

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
    instructor: course.teacher?.full_name || 'Đội ngũ giảng viên',
    price,
    originalPrice: Math.max(price, course.price),
    description: course.description || 'Khóa học được thiết kế theo lộ trình học tập cá nhân hóa.',
    category: course.category,
    level: course.level,
    targetAudience: course.target_audience,
    totalLessons: course.total_lessons,
    modules: modules.length > 0 ? modules : (defaultMeta?.modules ?? []),
    highlights,
    isPopular,
    iconType,
  }
}

async function requestCourseData<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/courses/${path}`)
  } catch {
    throw new Error('Không thể kết nối danh sách khóa học. Vui lòng thử lại sau.')
  }

  let result: ApiResponse<T>
  try {
    result = await response.json() as ApiResponse<T>
  } catch {
    throw new Error('Máy chủ trả về dữ liệu khóa học không hợp lệ.')
  }

  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.message || `Không thể tải khóa học (HTTP ${response.status}).`)
  }
  return result.data
}

export const courseCatalogApi = {
  async list(): Promise<CourseReference[]> {
    try {
      const data = await requestCourseData<CourseCatalogRecord[]>('catalog')
      if (Array.isArray(data) && data.length > 0) {
        const orderMap: Record<string, number> = {
          'phat-am-tieng-anh': 1,
          'tu-vung-tieng-anh': 2,
          'ngu-phap-tieng-anh': 3,
        }
        return data.map(mapCourse).sort((a, b) => (orderMap[a.slug] || 99) - (orderMap[b.slug] || 99))
      }
      return DEFAULT_COURSES
    } catch {
      return DEFAULT_COURSES
    }
  },

  async get(identifier: string): Promise<CourseReference> {
    try {
      const data = await requestCourseData<CourseCatalogRecord>(encodeURIComponent(identifier))
      if (data && typeof data === 'object' && data.id && data.title) {
        return mapCourse(data)
      }
    } catch {
      // Fallback to default courses if backend fails or doesn't have it
    }
    const fallback = DEFAULT_COURSES.find(
      (item) => item.slug === identifier || item.id === identifier
    )
    if (fallback) return fallback
    throw new Error('Thông tin khóa học không đúng định dạng.')
  },
}
