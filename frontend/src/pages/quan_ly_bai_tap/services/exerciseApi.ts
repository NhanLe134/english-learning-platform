import type {
  CourseExerciseDetail,
  CourseExerciseSummary,
  ExerciseSubmissionAnswer,
  SaveCourseExerciseInput,
  SubmitExerciseResult,
} from '../types'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<string>
): Promise<ApiResponse<T>> {
  if (!accessToken) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }

  const send = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE_URL}/exercises${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  }

  let response = await send(accessToken)
  if (response.status === 401) {
    response = await send(await refreshAccessToken())
  }

  let result: ApiResponse<T>
  try {
    result = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error('Máy chủ trả về dữ liệu bài tập không hợp lệ.')
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Yêu cầu thất bại (HTTP ${response.status}).`)
  }
  return result
}

export const exerciseApi = {
  async listByCourse(
    courseId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CourseExerciseSummary[]> {
    const res = await authenticatedRequest<CourseExerciseSummary[]>(
      `/courses/${encodeURIComponent(courseId)}`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
    return Array.isArray(res.data) ? res.data : []
  },

  async getDetail(
    exerciseId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CourseExerciseDetail> {
    const res = await authenticatedRequest<CourseExerciseDetail>(
      `/${encodeURIComponent(exerciseId)}`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
    if (!res.data) throw new Error('Không tìm thấy chi tiết bài tập.')
    return res.data
  },

  async createForCourse(
    courseId: string,
    input: SaveCourseExerciseInput,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CourseExerciseDetail> {
    const res = await authenticatedRequest<CourseExerciseDetail>(
      `/courses/${encodeURIComponent(courseId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      accessToken,
      refreshAccessToken
    )
    if (!res.data) throw new Error('Máy chủ không trả về bài tập đã tạo.')
    return res.data
  },

  async update(
    exerciseId: string,
    input: SaveCourseExerciseInput,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<CourseExerciseDetail> {
    const res = await authenticatedRequest<CourseExerciseDetail>(
      `/${encodeURIComponent(exerciseId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      accessToken,
      refreshAccessToken
    )
    if (!res.data) throw new Error('Máy chủ không trả về bài tập đã cập nhật.')
    return res.data
  },

  async remove(
    exerciseId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<void> {
    await authenticatedRequest<void>(
      `/${encodeURIComponent(exerciseId)}`,
      { method: 'DELETE' },
      accessToken,
      refreshAccessToken
    )
  },

  async submit(
    exerciseId: string,
    answers: ExerciseSubmissionAnswer[],
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<SubmitExerciseResult> {
    const res = await authenticatedRequest<SubmitExerciseResult>(
      `/${encodeURIComponent(exerciseId)}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      },
      accessToken,
      refreshAccessToken
    )
    if (!res.data) throw new Error('Không nhận được kết quả chấm điểm.')
    return res.data
  },
}
