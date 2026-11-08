export interface CourseTeacher {
  id: string
  full_name: string
  avatar_url: string | null
}

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  status: string
  teacher: CourseTeacher | null
}

export interface CourseCatalogTopic {
  id: string
  title: string
  description: string | null
  sort_order: number
  lessons: { id: string; title: string; description: string | null; sort_order: number }[]
}

export interface CourseCatalogEntry extends Omit<ManagedCourse, 'teacher_id' | 'status'> {
  teacher: CourseTeacher | null
  topics: CourseCatalogTopic[]
}

export type ManagedCourseStatus = 'draft' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ManagedCourse {
  id: string
  title: string
  slug: string
  description: string | null
  category: string
  level: CourseLevel
  target_audience: string
  price: number
  discounted_price: number | null
  total_lessons: number
  thumbnail_url: string | null
  status: ManagedCourseStatus
  teacher_id: string
  created_at: string
  updated_at: string
}

export interface ManagedCourseInput {
  title: string
  slug: string
  description: string | null
  category: string
  level: CourseLevel
  target_audience: string
  price: number
  discounted_price: number | null
  total_lessons: number
  thumbnail_url: string | null
  status: 'draft' | 'published'
}

export interface CourseListFilters {
  search: string
  category: string
  level: 'all' | CourseLevel
  status: 'all' | ManagedCourseStatus
  sort: 'newest' | 'price_asc' | 'price_desc'
  page: number
  limit: number
}

export interface ManagedCoursePage {
  items: ManagedCourse[]
  total: number
  page: number
  limit: number
  totalPages: number
}
