export type LessonStatus = 'draft' | 'published'

export interface LessonItem {
  id: string
  topic_id: string
  title: string
  description: string | null
  video_url: string | null
  duration_seconds: number | null
  sort_order: number
  status: LessonStatus
}

export interface LessonTopic {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  lessons: LessonItem[]
}

export interface CreateTopicPayload {
  course_id: string
  title: string
  description: string | null
  sort_order: number
}

export interface CreateLessonPayload {
  topic_id: string
  title: string
  description: string | null
  video_url: string
  status: LessonStatus
  sort_order: number
}

export interface AuthenticatedUser {
  id: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}
