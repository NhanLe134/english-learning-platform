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
  reset_progress?: boolean
}

export interface LessonItem {
  id: string
  /** null = bài không chia chủ đề */
  topic_id: string | null
  course_id: string
  title: string
  description: string | null
  /** Học viên: undefined (thay bằng video_token) */
  video_url?: string | null
  /** Chỉ có trong response dành cho học viên: video_url đã xáo trộn */
  video_token?: string
  duration_seconds: number | null
  sort_order: number
  status: LessonStatus
  materials?: LessonMaterialItem[]
  progress?: LessonProgressData
}

export interface LessonTopic {
  /** null = nhóm ảo "Không chia chủ đề" (gom các bài không thuộc chủ đề nào) */
  id: string | null
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
