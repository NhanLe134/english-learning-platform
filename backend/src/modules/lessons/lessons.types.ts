export type LessonStatus = 'draft' | 'published'

export interface LessonMaterialItem {
  id: string
  name: string
  file_url: string
  file_type: string
}

export interface LessonProgressData {
  last_position_seconds: number
  progress_percent: number
  is_completed: boolean
}

export interface LessonProgressItem extends LessonProgressData {
  id?: string
  lesson_id: string
  student_id: string
  updated_at?: string
}

export interface UpdateLessonProgressInput {
  last_position_seconds: number
  progress_percent?: number
  is_completed?: boolean
  duration_seconds?: number
}

export interface LessonItem {
  id: string
  topic_id: string
  title: string
  description: string | null
  video_url: string | null
  duration_seconds: number | null
  sort_order: number
  status: LessonStatus
  materials?: LessonMaterialItem[]
  progress?: LessonProgressData
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
