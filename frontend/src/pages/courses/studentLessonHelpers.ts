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

export interface LatestExerciseResult {
  scorePercent: number
  passed: boolean
}

export interface SidebarLessonDisplayInfo {
  durationText: string
  statusText: string
  durationStatusLine: string
  isCompleted: boolean
  playbackPositionLine: string
  exerciseScorePercent: number
  exerciseStatusText: 'Đạt' | 'Chưa đạt'
  exerciseScoreLine: string
  exercisePassed: boolean
}

export function formatSidebarLessonInfo(
  lesson: Pick<StudentLessonItem, 'duration' | 'status' | 'progressPercent' | 'lastPositionSeconds'>,
  latestExerciseResult?: LatestExerciseResult | null
): SidebarLessonDisplayInfo {
  const isCompleted = lesson.status === 'completed'
  const progressPct = Math.min(100, Math.max(0, Math.round(lesson.progressPercent || 0)))
  const durationText = lesson.duration
  const statusText = isCompleted ? 'Đã hoàn thành' : `Đang học ${progressPct}%`
  const durationStatusLine = `${durationText} · ${statusText}`
  const playbackPositionLine = `Vị trí xem: ${formatPlaybackTime(lesson.lastPositionSeconds)}`

  const hasResult =
    latestExerciseResult !== null &&
    latestExerciseResult !== undefined &&
    Number.isFinite(latestExerciseResult.scorePercent)
  const exerciseScorePercent = hasResult
    ? Math.min(100, Math.max(0, Math.round(latestExerciseResult.scorePercent)))
    : 0
  const exercisePassed = hasResult ? Boolean(latestExerciseResult.passed) : false
  const exerciseStatusText: 'Đạt' | 'Chưa đạt' = exercisePassed ? 'Đạt' : 'Chưa đạt'
  const exerciseScoreLine = `Bài tập: ${exerciseScorePercent}% · ${exerciseStatusText}`

  return {
    durationText,
    statusText,
    durationStatusLine,
    isCompleted,
    playbackPositionLine,
    exerciseScorePercent,
    exerciseStatusText,
    exerciseScoreLine,
    exercisePassed,
  }
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

export const PASSING_SCORE_PERCENT = 80

export interface ExerciseValidationResult {
  allAnswered: boolean
  unansweredIndex?: number
  totalQuestions: number
  answeredCount: number
  correctCount: number
  scorePercent: number
  passed: boolean
  message: string
  correctMap: Record<number, boolean>
}

export function validateExerciseSubmission(params: {
  questions: QuizQuestion[]
  selectedAnswers: Record<number, string>
  isAlreadyCompleted?: boolean
}): ExerciseValidationResult {
  const { questions, selectedAnswers, isAlreadyCompleted = false } = params
  const totalQuestions = questions.length

  if (totalQuestions === 0) {
    return {
      allAnswered: true,
      totalQuestions: 0,
      answeredCount: 0,
      correctCount: 0,
      scorePercent: 100,
      passed: true,
      message: 'Không có câu hỏi trong bài tập.',
      correctMap: {},
    }
  }

  // Students must answer all questions before clicking Check
  const unansweredIndex = questions.findIndex((_, idx) => !selectedAnswers[idx])
  if (unansweredIndex !== -1) {
    const qNum = unansweredIndex + 1
    return {
      allAnswered: false,
      unansweredIndex,
      totalQuestions,
      answeredCount: Object.keys(selectedAnswers).filter((idx) => Boolean(selectedAnswers[Number(idx)])).length,
      correctCount: 0,
      scorePercent: 0,
      passed: false,
      message: `Vui lòng trả lời tất cả các câu hỏi trước khi kiểm tra (còn thiếu Câu ${qNum}).`,
      correctMap: {},
    }
  }

  let correctCount = 0
  const correctMap: Record<number, boolean> = {}

  questions.forEach((q, idx) => {
    const isCorrect = selectedAnswers[idx] === q.correctOptionId
    if (isCorrect) {
      correctCount++
      correctMap[idx] = true
    } else {
      correctMap[idx] = false
    }
  })

  const scorePercent = Math.round((correctCount / totalQuestions) * 100)
  const passed = scorePercent >= PASSING_SCORE_PERCENT

  return {
    allAnswered: true,
    totalQuestions,
    answeredCount: totalQuestions,
    correctCount,
    scorePercent,
    passed,
    message: passed
      ? `🎉 Chúc mừng! Bạn đạt ${scorePercent}% (${correctCount}/${totalQuestions} câu đúng). Bài học đã hoàn thành!`
      : isAlreadyCompleted
      ? `❌ Bạn đạt ${scorePercent}% (${correctCount}/${totalQuestions} câu đúng), chưa đạt mức 80%. Tiến độ video vẫn được giữ nguyên 100%, bạn có thể làm lại bài tập ngay!`
      : `❌ Bạn đạt ${scorePercent}% (${correctCount}/${totalQuestions} câu đúng), chưa đạt mức 80% yêu cầu. Vui lòng xem lại video từ đầu để làm lại bài tập!`,
    correctMap,
  }
}

export interface QuestionValidationResult {
  isCorrect: boolean
  allCompleted: boolean
  nextQuestionIndex: number
  updatedCorrectMap: Record<number, boolean>
  message: string
}

export function validateQuestionAnswer(params: {
  questions: QuizQuestion[]
  currentQuestionIndex: number
  selectedOptionId: string | undefined
  currentCorrectMap: Record<number, boolean>
}): {
  valid: boolean
  error?: string
  result?: QuestionValidationResult
} {
  const { questions, currentQuestionIndex, selectedOptionId, currentCorrectMap } = params
  const total = questions.length

  if (!selectedOptionId) {
    return {
      valid: false,
      error: 'Vui lòng chọn đáp án trước khi kiểm tra.',
    }
  }

  const currentQ = questions[currentQuestionIndex]
  if (!currentQ) {
    return {
      valid: false,
      error: 'Câu hỏi không tồn tại.',
    }
  }

  if (currentCorrectMap[currentQuestionIndex]) {
    const nextIdx = questions.findIndex((_, idx) => !currentCorrectMap[idx])
    return {
      valid: false,
      error: 'Câu hỏi này bạn đã trả lời chính xác!',
      result: {
        isCorrect: true,
        allCompleted: questions.every((_, idx) => currentCorrectMap[idx]),
        nextQuestionIndex: nextIdx !== -1 ? nextIdx : currentQuestionIndex,
        updatedCorrectMap: currentCorrectMap,
        message: 'Câu hỏi này bạn đã trả lời chính xác!',
      },
    }
  }

  const isCorrect = selectedOptionId === currentQ.correctOptionId

  if (isCorrect) {
    const updatedCorrectMap = {
      ...currentCorrectMap,
      [currentQuestionIndex]: true,
    }
    const allCompleted = questions.length > 0 && questions.every((_, idx) => updatedCorrectMap[idx])

    let nextQuestionIndex = currentQuestionIndex
    if (!allCompleted) {
      if (currentQuestionIndex < total - 1 && !updatedCorrectMap[currentQuestionIndex + 1]) {
        nextQuestionIndex = currentQuestionIndex + 1
      } else {
        const nextIncomplete = questions.findIndex((_, idx) => !updatedCorrectMap[idx])
        if (nextIncomplete !== -1) {
          nextQuestionIndex = nextIncomplete
        }
      }
    }

    return {
      valid: true,
      result: {
        isCorrect: true,
        allCompleted,
        nextQuestionIndex,
        updatedCorrectMap,
        message: allCompleted
          ? '🎉 Chính xác! Bạn đã hoàn thành tất cả các câu hỏi.'
          : '🎉 Chính xác! Đáp án hoàn toàn đúng.',
      },
    }
  }

  return {
    valid: true,
    result: {
      isCorrect: false,
      allCompleted: false,
      nextQuestionIndex: currentQuestionIndex,
      updatedCorrectMap: currentCorrectMap,
      message: '❌ Đáp án chưa chính xác. Hệ thống chuyển lại video để bạn ôn tập và thử lại câu hỏi!',
    },
  }
}
