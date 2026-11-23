const API_BASE_URL = (
  import.meta.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export interface LessonMaterialItem {
  id: string
  name: string
  file_url: string
  file_type: string
}

export interface LessonProgressDetails {
  last_position_seconds: number
  progress_percent: number
  is_completed: boolean
}

export interface LessonItemDetails {
  id: string
  topic_id: string
  title: string
  description: string | null
  /** Học viên: undefined — thay bằng video_token (video_url đã xáo trộn) */
  video_url?: string | null
  video_token?: string | null
  thumbnail_url?: string | null
  duration_seconds: number | null
  sort_order: number
  status: 'draft' | 'published'
  materials?: LessonMaterialItem[]
  progress?: LessonProgressDetails
}

export interface LessonTopicItem {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  lessons: LessonItemDetails[]
}

/** Trích xuất YouTube Video ID từ bất kỳ định dạng link YouTube nào */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`)
    const host = parsed.hostname.toLowerCase()
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v')
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      }
      const parts = parsed.pathname.split('/').filter(Boolean)
      const first = parts[0]?.toLowerCase()
      if (first === 'embed' || first === 'v' || first === 'shorts' || first === 'live') {
        const id = parts[1]
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
      }
    }
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const parts = parsed.pathname.split('/').filter(Boolean)
      const id = parts[0]
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
    }
  } catch {
    // fallback regex
  }
  const match = trimmed.match(/(?:youtu\.be\/|(?:youtube|youtube-nocookie)\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

/** Trích xuất link nhúng xem trước Google Drive (trả null nếu không phải link Drive) */
export function extractGoogleDriveEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    if (parsed.hostname.includes('drive.google.com')) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/)
      const fileId = match?.[1] ?? parsed.searchParams.get('id')
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return null
  } catch {
    return null
  }
}

/** Chuyển URL YouTube / Google Drive thành link nhúng (embed) an toàn */
export function buildEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const ytId = extractYouTubeVideoId(url)
  if (ytId) {
    const origin = typeof window !== 'undefined' && window.location.origin ? encodeURIComponent(window.location.origin) : ''
    let startSeconds: number | null = null
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      const tParam = parsed.searchParams.get('t') || parsed.searchParams.get('start')
      if (tParam) {
        const parsedSec = parseInt(tParam.replace(/s$/i, ''), 10)
        if (!isNaN(parsedSec) && parsedSec > 0) startSeconds = parsedSec
      }
    } catch {
      // ignore
    }

    const queryParts = [
      'enablejsapi=1',
      'controls=0',
      'modestbranding=1',
      'rel=0',
      'iv_load_policy=3',
      'fs=0',
      'disablekb=1',
      'playsinline=1',
      'cc_load_policy=0',
    ]
    if (origin) queryParts.push(`origin=${origin}`)
    if (startSeconds !== null) queryParts.push(`start=${startSeconds}`)
    return `https://www.youtube.com/embed/${ytId}?${queryParts.join('&')}`
  }

  return extractGoogleDriveEmbedUrl(url)
}

export interface CreatedTopic {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
}

export interface CreatedLesson {
  id: string
  topic_id: string
  title: string
  description: string | null
  video_url: string
  status: 'draft' | 'published'
  sort_order: number
}

export interface LessonQuizQuestion {
  id?: string
  content: string
  options: string[]
  correct_index?: number
}

export interface LessonQuiz {
  title: string
  questions: LessonQuizQuestion[]
}

export interface LessonQuizPayload {
  title: string
  questions: LessonQuizQuestion[]
}

export interface QuizSubmitResult {
  total: number
  correct_count: number
  passed: boolean
  score_percent: number
  results: Array<{ question_id: string; is_correct: boolean; correct_index: number }>
}

interface ApiResponse<T> {
  success: boolean
  error?: string
  message?: string
  data?: T
}

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<string>
): Promise<T> {
  if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')

  const send = (token: string) =>
    fetch(`${API_BASE_URL}/lessons${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
      credentials: 'include',
    })

  let response = await send(accessToken)
  if (response.status === 401) {
    response = await send(await refreshAccessToken())
  }

  let json: ApiResponse<T>
  try {
    json = await response.json()
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
  }

  if (!response.ok || !json.success || json.data === undefined) {
    throw new Error(json.error || json.message || `Yêu cầu thất bại (HTTP ${response.status}).`)
  }
  return json.data
}

export const lessonApi = {
  /**
   * Kiểm tra video (YouTube/Drive) có phát được cho học viên không —
   * backend hỏi YouTube oEmbed / thử tải Drive, phát hiện video riêng tư
   */
  /**
   * Lấy quiz của bài giảng. Admin/Teacher: có correct_index để chỉnh sửa.
   * Học viên: không có correct_index (chấm điểm server-side).
   */
  async getQuiz(
    lessonId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<LessonQuiz | null> {
    return authenticatedRequest<LessonQuiz | null>(
      `/lessons/${encodeURIComponent(lessonId)}/quiz`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
  },

  /**
   * Lưu/tạo quiz cho bài giảng (chỉ định đáp án đúng qua correct_index 0-3)
   */
  async saveQuiz(
    lessonId: string,
    quiz: LessonQuizPayload,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ title: string; total_questions: number }> {
    return authenticatedRequest<{ title: string; total_questions: number }>(
      `/lessons/${encodeURIComponent(lessonId)}/quiz`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz),
      },
      accessToken,
      refreshAccessToken
    )
  },

  /**
   * Học viên nộp bài quiz — server chấm điểm, trả kết quả từng câu
   */
  async submitQuiz(
    lessonId: string,
    answers: Array<{ question_id: string; selected_index: number }>,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<QuizSubmitResult> {
    return authenticatedRequest<QuizSubmitResult>(
      `/lessons/${encodeURIComponent(lessonId)}/quiz/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      },
      accessToken,
      refreshAccessToken
    )
  },

  async checkVideo(
    url: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ accessible: boolean; provider: string; title?: string; message: string }> {
    return authenticatedRequest<{
      accessible: boolean
      provider: string
      title?: string
      message: string
    }>(
      `/check-video?url=${encodeURIComponent(url)}`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
  },

  /** Xóa bài giảng */
  async deleteLesson(
    lessonId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<void> {
    return authenticatedRequest<void>(
      `/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'DELETE' },
      accessToken,
      refreshAccessToken
    )
  },

  /** Danh sách chủ đề + bài giảng của khóa học (gồm cả bản nháp với Admin/Teacher, chỉ published với Student) */
  async getTopics(
    courseId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<LessonTopicItem[]> {
    return authenticatedRequest<LessonTopicItem[]>(
      `/courses/${encodeURIComponent(courseId)}/topics`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
  },

  /** Chi tiết một bài giảng kèm tài liệu đính kèm */
  async getLesson(
    lessonId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<LessonItemDetails> {
    return authenticatedRequest<LessonItemDetails>(
      `/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
  },

  /** Tạo chủ đề mới trong khóa học */
  async createTopic(
    courseId: string,
    title: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CreatedTopic> {
    return authenticatedRequest<CreatedTopic>(
      `/courses/${encodeURIComponent(courseId)}/topics`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      },
      accessToken,
      refreshAccessToken
    )
  },

  /** Tạo bài giảng mới trong một chủ đề */
  /**
   * Tạo bài giảng KHÔNG chia chủ đề — backend tự gắn vào chủ đề mặc định
   * "Bài giảng" của khóa (tự tạo nếu khóa chưa có)
   */
  async createLessonInCourse(
    input: {
      courseId: string
      title: string
      description: string | null
      videoUrl: string
      status: 'draft' | 'published'
      /** Quiz lưu CÙNG LẦN với bài giảng (tùy chọn — không gửi nếu không soạn câu hỏi) */
      quiz?: { title: string; questions: Array<{ content: string; options: string[]; correct_index: number }> }
    },
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ topic: CreatedTopic; lesson: CreatedLesson; quiz_saved?: boolean }> {
    return authenticatedRequest<{ topic: CreatedTopic; lesson: CreatedLesson; quiz_saved?: boolean }>(
      `/courses/${encodeURIComponent(input.courseId)}/lessons`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          video_url: input.videoUrl,
          status: input.status,
          ...(input.quiz ? { quiz: input.quiz } : {}),
        }),
      },
      accessToken,
      refreshAccessToken
    )
  },

  async createLesson(
    input: {
      topicId: string
      title: string
      description: string | null
      videoUrl: string
      status: 'draft' | 'published'
    },
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ topic: CreatedTopic; lesson: CreatedLesson }> {
    return authenticatedRequest<{ topic: CreatedTopic; lesson: CreatedLesson }>(
      `/topics/${encodeURIComponent(input.topicId)}/lessons`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          video_url: input.videoUrl,
          status: input.status,
        }),
      },
      accessToken,
      refreshAccessToken
    )
  },

  /**
   * Cập nhật bài giảng — mọi trường, kể cả chuyển chủ đề (topicId mới)
   * và đổi thứ tự hiển thị (sortOrder tính riêng theo topic).
   */
  async updateLesson(
    input: {
      lessonId: string
      topicId?: string
      title: string
      description: string | null
      videoUrl: string
      status: 'draft' | 'published'
      sortOrder: number
    },
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CreatedLesson> {
    return authenticatedRequest<CreatedLesson>(
      `/lessons/${encodeURIComponent(input.lessonId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          video_url: input.videoUrl,
          status: input.status,
          sort_order: input.sortOrder,
          topic_id: input.topicId,
        }),
      },
      accessToken,
      refreshAccessToken
    )
  },

  /** Cập nhật tiến độ xem video bài học */
  async updateProgress(
    lessonId: string,
    payload: {
      last_position_seconds: number
      progress_percent?: number
      is_completed?: boolean
      duration_seconds?: number
      reset_progress?: boolean
    },
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>,
    keepalive = false
  ): Promise<{
    lesson_id: string
    student_id: string
    last_position_seconds: number
    progress_percent: number
    is_completed: boolean
  }> {
    return authenticatedRequest(
      `/lessons/${encodeURIComponent(lessonId)}/progress`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive,
      },
      accessToken,
      refreshAccessToken
    )
  },
}
