import { extractYouTubeVideoId, type LessonMaterialItem } from '../them_bai_giang/services/lessonApi'
import type { QuizQuestion } from './student-course-detail-data'

export interface StudentLessonItem {
  id: string
  topicId: string
  topicTitle: string
  lessonNumber: number
  title: string
  description: string | null
  videoUrl: string | null
  thumbnailUrl?: string | null
  duration: string
  durationSeconds: number
  materials: LessonMaterialItem[]
  sortOrder: number
  status: 'completed' | 'in_progress' | 'not_started'
  progressPercent: number
  lastPositionSeconds: number
}

export interface LessonExerciseData {
  title: string
  subtitle: string
  totalQuestions: number
  durationMinutes: number
  questions: QuizQuestion[]
}

export const DEFAULT_LESSON_THUMBNAIL = '/hero-classroom.png'

/**
 * Resolve the thumbnail image URL for a lesson:
 * 1. Prioritize API-provided `thumbnail_url` if present.
 * 2. If it's a YouTube video, extract the video ID and use `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`.
 * 3. Fallback to course thumbnail or default placeholder image.
 */
export function getLessonThumbnail(
  lesson: {
    videoUrl?: string | null
    thumbnailUrl?: string | null
  },
  fallback: string = DEFAULT_LESSON_THUMBNAIL
): string {
  if (lesson.thumbnailUrl && lesson.thumbnailUrl.trim()) {
    return lesson.thumbnailUrl.trim()
  }

  const ytId = extractYouTubeVideoId(lesson.videoUrl)
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
  }

  return fallback || DEFAULT_LESSON_THUMBNAIL
}

/**
 * Format duration seconds for sidebar badges (`Chưa cập nhật` when duration is not stored).
 */
export function formatLessonDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return 'Chưa cập nhật'
  }
  return formatPlaybackTime(seconds)
}

/**
 * Format playback position / duration (`00:00` or `HH:MM:SS`) for player UI.
 */
export function formatPlaybackTime(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Dynamically provide practice exercise questions tailored to each lesson.
 */
export function getLessonExercise(lesson: StudentLessonItem): LessonExerciseData {
  const title = lesson.title || `Bài học ${lesson.lessonNumber}`
  const num = lesson.lessonNumber

  return {
    title: `Bài tập thực hành: ${title}`,
    subtitle: `Kiểm tra kiến thức trọng tâm bài ${num}`,
    totalQuestions: 2,
    durationMinutes: 5,
    questions: [
      {
        id: 1,
        questionNumberStr: 'CÂU 01',
        questionText: `Nội dung cốt lõi của bài học "${title}" tập trung vào phần nào?`,
        audioText: `Focus on the core concept of ${title} to achieve high fluency.`,
        options: [
          { id: 'A', label: 'A', text: `Các ví dụ thực tế và ngữ cảnh ứng dụng mở rộng của ${title}` },
          { id: 'B', label: 'B', text: `Nắm vững cấu trúc và quy tắc trọng tâm được giảng dạy trong ${title}` },
          { id: 'C', label: 'C', text: 'Chỉ học thuộc lòng các từ vựng mà không cần ngữ cảnh' },
          { id: 'D', label: 'D', text: 'Bỏ qua phần bài tập và phát âm thực hành' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 2,
        questionNumberStr: 'CÂU 02',
        questionText: `Khi áp dụng kiến thức từ bài "${title}" vào giao tiếp, điều nào sau đây là chính xác nhất?`,
        audioText: 'Practice regularly with correct pronunciation and natural intonation.',
        options: [
          { id: 'A', label: 'A', text: 'Dịch từng từ từ tiếng Việt sang tiếng Anh trước khi nói' },
          { id: 'B', label: 'B', text: 'Sử dụng ngữ điệu tự nhiên, phản xạ linh hoạt và áp dụng đúng tình huống' },
          { id: 'C', label: 'C', text: 'Nói thật nhanh bất kể đúng hay sai ngữ pháp' },
          { id: 'D', label: 'D', text: 'Tránh luyện tập nghe để không bị bối rối' },
        ],
        correctOptionId: 'B',
      },
    ],
  }
}
