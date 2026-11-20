const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export interface LessonTopicItem {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  lessons: {
    id: string
    topic_id: string
    title: string
    description: string | null
    video_url: string | null
    duration_seconds: number | null
    sort_order: number
    status: 'draft' | 'published'
  }[]
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
  /** Danh sách chủ đề + bài giảng của khóa học (gồm cả bản nháp) */
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
}
