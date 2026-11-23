import { type CourseReference, type CourseLessonItem } from '../course-data'
import { extractYouTubeVideoId } from '../../them_bai_giang/services/lessonApi'
import { formatPlaybackTime } from '../studentLessonHelpers'

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
    lessons: {
      id: string
      title: string
      description?: string | null
      duration_seconds?: number | null
      thumbnail_url?: string | null
      video_url?: string | null
    }[]
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
  const price = course.discounted_price !== null && course.discounted_price !== undefined && course.discounted_price < course.price
    ? course.discounted_price
    : course.price
  const originalPrice = Math.max(price, course.price)
  const modules = (course.topics || []).map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description ?? '',
    lessons: (topic.lessons || []).map((lesson): CourseLessonItem => {
      const durationSeconds = typeof lesson.duration_seconds === 'number' ? lesson.duration_seconds : null
      const formattedDuration = durationSeconds && durationSeconds > 0 ? formatPlaybackTime(durationSeconds) : '--:--'
      const ytId = extractYouTubeVideoId(lesson.video_url)
      const thumbnailUrl = lesson.thumbnail_url?.trim()
        ? lesson.thumbnail_url.trim()
        : ytId
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : null

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description ?? null,
        duration: formattedDuration,
        durationSeconds,
        thumbnailUrl,
        videoUrl: lesson.video_url ?? null,
      }
    }),
  }))

  const highlights: string[] = [
    `Thời lượng: ${course.total_lessons ?? 0} bài học`,
  ]
  if (course.level) {
    highlights.push(`Trình độ: ${course.level}`)
  }
  if (course.target_audience) {
    highlights.push(`Dành cho: ${course.target_audience}`)
  }

  const detailsParts = [
    course.total_lessons ? `${course.total_lessons} bài học` : '',
    course.category,
    course.level,
  ].filter(Boolean)

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    details: detailsParts.join(' · '),
    thumbnailUrl: course.thumbnail_url || null,
    instructor: course.teacher?.full_name || '',
    instructorAvatarUrl: course.teacher?.avatar_url ?? null,
    price,
    originalPrice,
    description: course.description ?? '',
    category: course.category || '',
    level: course.level || '',
    targetAudience: course.target_audience ?? '',
    totalLessons: course.total_lessons || 0,
    modules,
    highlights,
    isPopular: false,
    iconType: inferIconType(course.slug),
  }
}

async function requestCourseData<T>(path: string, accessToken?: string): Promise<T> {
  let response: Response
  try {
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    response = await fetch(`${API_BASE_URL}/courses/${path}`, {
      headers,
    })
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

export interface BackendEnrolledCourse {
  id: string
  course_id: string
  title: string
  slug: string
  category: string
  level: string
  thumbnail_url: string | null
  total_lessons: number
  completed_lessons: number
  progress_percent: number
  status: 'in_progress' | 'completed'
  enrolled_at: string
  last_active: string | null
  teacher: { id: string; full_name: string; avatar_url: string | null } | null
}

export const courseCatalogApi = {
  async list(): Promise<CourseReference[]> {
    const data = await requestCourseData<CourseCatalogRecord[]>('catalog')
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }
    return data.map(mapCourseCatalogRecord)
  },

  async getMyCourses(accessToken: string): Promise<BackendEnrolledCourse[]> {
    if (!accessToken) return []
    let response: Response
    try {
      response = await fetch(`${API_BASE_URL}/courses/my-courses`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch {
      throw new Error('Could not connect to the server to load your courses. Please try again.')
    }

    let result: ApiResponse<BackendEnrolledCourse[]>
    try {
      result = await response.json() as ApiResponse<BackendEnrolledCourse[]>
    } catch {
      throw new Error('The server returned an invalid response while loading your courses.')
    }
    if (response.ok && result.success && Array.isArray(result.data)) return result.data
    throw new Error(result.message || `Could not load your courses (HTTP ${response.status}).`)
  },

  async get(identifier: string, accessToken?: string): Promise<CourseReference> {
    const data = await requestCourseData<CourseCatalogRecord>(encodeURIComponent(identifier), accessToken)
    if (!data || typeof data !== 'object' || !data.id || !data.title) {
      throw new Error('Thông tin khóa học không hợp lệ.')
    }
    return mapCourseCatalogRecord(data)
  },
}
