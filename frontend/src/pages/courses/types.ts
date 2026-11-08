export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Course {
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
  status: CourseStatus
  teacher_id: string
  created_at: string
  updated_at: string
}

export interface CourseInput {
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

export interface CourseFilters {
  search: string
  category: string
  level: 'all' | CourseLevel
  status: 'all' | CourseStatus
  sort: 'newest' | 'price_asc' | 'price_desc'
  page: number
  limit: number
}

export interface CoursePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}
