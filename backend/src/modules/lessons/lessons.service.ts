import { LessonRequestError } from './lessons.errors.js'
import { LessonsRepository, UUID_PATTERN } from './lessons.repository.js'
import type {
  AuthenticatedUser,
  LessonItem,
  LessonProgressItem,
  LessonTopic,
} from './lessons.types.js'

export interface VideoCheckResult {
  accessible: boolean
  provider: 'youtube' | 'drive' | 'other'
  title?: string
  message: string
}

const FETCH_TIMEOUT_MS = 8000

/** Lấy YouTube video ID từ các dạng link phổ biến, null nếu không parse được */
function extractYouTubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null
  if (url.searchParams.get('v')) return url.searchParams.get('v')
  const shorts = url.pathname.match(/\/(shorts|embed|live)\/([^/?]+)/)
  if (shorts?.[2]) return shorts[2]
  return null
}

/** Lấy Drive file ID từ link chia sẻ, null nếu không parse được */
function extractDriveId(url: URL): string | null {
  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/)
  if (fileMatch?.[1]) return fileMatch[1]
  if (url.searchParams.get('id')) return url.searchParams.get('id')
  return null
}

const TOPIC_TITLE_MAX = 200

/** Tên chủ đề mặc định cho các bài giảng không chia chủ đề */
const DEFAULT_TOPIC_TITLE = 'Bài giảng'
const LESSON_TITLE_MAX = 200
const DESCRIPTION_MAX = 2000

export class LessonsService {
  private readonly repo: LessonsRepository

  constructor(repo: LessonsRepository = new LessonsRepository()) {
    this.repo = repo
  }

  private async assertCourseAccess(
    courseIdentifier: string,
    user: AuthenticatedUser
  ): Promise<{ courseId: string; courseTitle: string }> {
    const trimmed = typeof courseIdentifier === 'string' ? courseIdentifier.trim() : ''
    if (!trimmed) {
      throw new LessonRequestError('Course identifier is required.', 400)
    }
    const access = await this.repo.findCourseAccess(trimmed, user)
    if (!access.exists) {
      throw new LessonRequestError('Course not found.', 404)
    }
    if (!access.allowed) {
      if (user.role === 'STUDENT') {
        throw new LessonRequestError(
          'Học viên chưa đăng ký hoặc chưa hoàn tất thanh toán khóa học này.',
          403
        )
      }
      throw new LessonRequestError(
        'Bạn chưa được phân công phụ trách khóa học này.',
        403
      )
    }
    return { courseId: access.courseId, courseTitle: access.courseTitle }
  }

  private validateTitle(value: unknown, field: string, max: number): string {
    const title = typeof value === 'string' ? value.trim() : ''
    if (!title || title.length > max) {
      throw new LessonRequestError(`${field} is required and must be at most ${max} characters.`, 400)
    }
    return title
  }

  private validateDescription(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null
    const description = value.trim()
    if (description.length > DESCRIPTION_MAX) {
      throw new LessonRequestError(`Description must be at most ${DESCRIPTION_MAX} characters.`, 400)
    }
    return description
  }

  private validateVideoUrl(value: unknown): string {
    const url = typeof value === 'string' ? value.trim() : ''
    if (!url) {
      throw new LessonRequestError('Video URL is required (YouTube or Google Drive link).', 400)
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('invalid protocol')
      }
      return parsed.toString()
    } catch {
      throw new LessonRequestError('Video URL must be a valid YouTube or Google Drive HTTP(S) link.', 400)
    }
  }

  private validateStatus(value: unknown): 'draft' | 'published' {
    if (value === undefined || value === null || value === '') return 'draft'
    if (value === 'draft' || value === 'published') return value
    throw new LessonRequestError('Status must be draft or published.', 400)
  }

  /** Danh sách chủ đề + bài giảng của một khóa (Admin/Teacher thấy cả draft; Student chỉ thấy published) */
  async getTopicsForCourse(courseIdentifier: string, user: AuthenticatedUser): Promise<LessonTopic[]> {
    const access = await this.assertCourseAccess(courseIdentifier, user)
    const publishedOnly = user.role === 'STUDENT'
    const studentId = user.role === 'STUDENT' ? user.id : undefined
    return this.repo.findTopicsWithLessons(access.courseId, publishedOnly, studentId)
  }

  /** Chi tiết một bài giảng kèm tài liệu đính kèm */
  async getLesson(lessonId: string, user: AuthenticatedUser): Promise<LessonItem> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const studentId = user.role === 'STUDENT' ? user.id : undefined
    const result = await this.repo.findLessonWithCourse(lessonId, studentId)
    if (!result) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(result.courseId, user)
    if (user.role === 'STUDENT' && result.lesson.status !== 'published') {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    return result.lesson
  }

  /** Cập nhật tiến độ xem video bài giảng */
  async updateLessonProgress(
    lessonId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<LessonProgressItem> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const result = await this.repo.findLessonWithCourse(lessonId)
    if (!result) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(result.courseId, user)
    if (user.role === 'STUDENT' && result.lesson.status !== 'published') {
      throw new LessonRequestError('Lesson not found.', 404)
    }

    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Progress details are required.', 400)
    }
    const body = value as Record<string, unknown>
    const lastPosition = Number(body.last_position_seconds ?? 0)
    if (!Number.isFinite(lastPosition) || lastPosition < 0) {
      throw new LessonRequestError('last_position_seconds must be a non-negative number.', 400)
    }
    const flooredPosition = Math.floor(lastPosition)

    const existing = await this.repo.findLessonProgress(lessonId, user.id)

    let validDuration: number | undefined
    if ('duration_seconds' in body && body.duration_seconds !== undefined && body.duration_seconds !== null && body.duration_seconds !== '') {
      const dur = Number(body.duration_seconds)
      if (Number.isFinite(dur) && dur > 0) {
        validDuration = Math.round(dur)
        if (!result.lesson.duration_seconds || result.lesson.duration_seconds <= 0) {
          await this.repo.updateLessonDuration(lessonId, validDuration).catch(() => {})
        }
      }
    }
    const effectiveDuration =
      result.lesson.duration_seconds && result.lesson.duration_seconds > 0
        ? result.lesson.duration_seconds
        : (validDuration ?? 0)

    if ('is_completed' in body && body.is_completed !== undefined && typeof body.is_completed !== 'boolean') {
      throw new LessonRequestError('is_completed must be a boolean.', 400)
    }
    const isReset = body.reset_progress === true
    const isCompleted = isReset ? false : Boolean(existing?.is_completed) || body.is_completed === true

    let incomingPercent: number
    if ('progress_percent' in body && body.progress_percent !== undefined) {
      const pct = Number(body.progress_percent)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new LessonRequestError('progress_percent must be a number between 0 and 100.', 400)
      }
      incomingPercent = pct
    } else if (isReset) {
      incomingPercent = 0
    } else if (effectiveDuration > 0) {
      incomingPercent = Math.min(99, Math.round((flooredPosition / effectiveDuration) * 100))
    } else {
      incomingPercent = Number(existing?.progress_percent ?? 0)
    }

    const progressPercent = isCompleted
      ? 100
      : isReset
      ? Math.min(99, Math.max(0, incomingPercent))
      : Math.min(99, Math.max(Number(existing?.progress_percent ?? 0), incomingPercent))

    return this.repo.upsertLessonProgress({
      lesson_id: lessonId,
      student_id: user.id,
      last_position_seconds: flooredPosition,
      progress_percent: progressPercent,
      is_completed: isCompleted,
    })
  }

  /** Tạo chủ đề mới cho khóa học */
  async createTopic(
    courseId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<LessonTopic> {
    const access = await this.assertCourseAccess(courseId, user)
    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Topic details are required.', 400)
    }
    const body = value as Record<string, unknown>
    const title = this.validateTitle(body.title, 'Topic title', TOPIC_TITLE_MAX)
    const description = this.validateDescription(body.description)
    const sortOrder = await this.repo.nextTopicSortOrder(access.courseId)
    return this.repo.insertTopic({ course_id: access.courseId, title, description, sort_order: sortOrder })
  }

  /** Tạo bài giảng mới KHÔNG chia chủ đề — topic_id = null, gắn thẳng vào khóa */
  async createLessonInCourse(
    courseId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<{ lesson: LessonItem; quizSaved: boolean }> {
    await this.assertCourseAccess(courseId, user)
    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Lesson details are required.', 400)
    }
    const body = value as Record<string, unknown>
    const title = this.validateTitle(body.title, 'Lesson title', LESSON_TITLE_MAX)
    const description = this.validateDescription(body.description)
    const videoUrl = this.validateVideoUrl(body.video_url)
    const status = this.validateStatus(body.status)

    // Quiz tùy chọn gửi kèm — validate TOÀN BỘ trước khi tạo lesson để lỗi
    // validate không bao giờ tạo dở bài giảng trong DB
    const quiz = this.parseQuizPayload(body.quiz)

    const sortOrder = await this.repo.nextLessonSortOrder(courseId, null)
    const lesson = await this.repo.insertLesson({
      course_id: courseId,
      topic_id: null,
      title,
      description,
      video_url: videoUrl,
      status,
      sort_order: sortOrder,
    })

    if (quiz) {
      try {
        await this.repo.replaceQuizForLesson(
          lesson.id,
          user.id,
          courseId,
          quiz.title,
          quiz.questions
        )
      } catch (err) {
        // Supabase REST không có transaction — nếu tạo quiz lỗi sau khi đã tạo
        // lesson thì xóa lesson vừa tạo để không để lại bài giảng dở dang
        await this.repo.deleteLesson(lesson.id).catch(() => {})
        throw err
      }
    }

    return { lesson, quizSaved: Boolean(quiz) }
  }

  /** Tạo bài giảng mới trong một chủ đề */
  async createLesson(
    topicId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<{ topic: LessonTopic; lesson: LessonItem }> {
    if (!UUID_PATTERN.test(topicId)) {
      throw new LessonRequestError('Topic ID must be a valid UUID.', 400)
    }
    const topic = await this.repo.findTopicById(topicId)
    if (!topic) {
      throw new LessonRequestError('Topic not found.', 404)
    }
    await this.assertCourseAccess(topic.course_id, user)

    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Lesson details are required.', 400)
    }
    const body = value as Record<string, unknown>
    const title = this.validateTitle(body.title, 'Lesson title', LESSON_TITLE_MAX)
    const description = this.validateDescription(body.description)
    const videoUrl = this.validateVideoUrl(body.video_url)
    const status = this.validateStatus(body.status)
    const sortOrder = await this.repo.nextLessonSortOrder(topic.course_id, topicId)
    const lesson = await this.repo.insertLesson({
      course_id: topic.course_id,
      topic_id: topicId,
      title,
      description,
      video_url: videoUrl,
      status,
      sort_order: sortOrder,
    })
    return { topic, lesson }
  }

  /**
   * Cập nhật bài giảng — cho phép sửa mọi trường kể cả CHUYỂN TOPIC và đổi
   * thứ tự (sort_order tính riêng theo từng topic). Kiểm tra quyền trên
   * khóa của topic CŨ và topic MỚI (nếu di chuyển).
   */
  /** Xóa bài giảng (kiểm tra quyền trên khóa chứa bài giảng) */
  async deleteLesson(lessonId: string, user: AuthenticatedUser): Promise<boolean> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const lesson = await this.repo.findLessonById(lessonId)
    if (!lesson) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(lesson.course_id, user)
    return this.repo.deleteLesson(lessonId)
  }

  async updateLesson(
    lessonId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<{ lesson: LessonItem; moved: boolean }> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const lesson = await this.repo.findLessonById(lessonId)
    if (!lesson) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(lesson.course_id, user)

    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Lesson update payload is required.', 400)
    }
    const body = value as Record<string, unknown>

    const payload: Parameters<LessonsRepository['updateLesson']>[1] = {}
    if ('title' in body) payload.title = this.validateTitle(body.title, 'Lesson title', LESSON_TITLE_MAX)
    if ('description' in body) payload.description = this.validateDescription(body.description)
    if ('video_url' in body) payload.video_url = this.validateVideoUrl(body.video_url)
    if ('status' in body) payload.status = this.validateStatus(body.status)

    // Đổi chủ đề: gửi UUID → chuyển chương; gửi sentinel '__none__' → bỏ chủ đề (topic_id null)
    let moved = false
    if (
      'topic_id' in body &&
      typeof body.topic_id === 'string' &&
      body.topic_id !== (lesson.topic_id ?? '__none__')
    ) {
      if (body.topic_id === '__none__') {
        payload.topic_id = null
        moved = true
      } else if (UUID_PATTERN.test(body.topic_id)) {
        const targetTopic = await this.repo.findTopicById(body.topic_id)
        if (!targetTopic) {
          throw new LessonRequestError('Target topic not found.', 404)
        }
        await this.assertCourseAccess(targetTopic.course_id, user)
        payload.topic_id = body.topic_id
        moved = true
      } else {
        throw new LessonRequestError('New topic ID must be a valid UUID or "__none__".', 400)
      }
    }

    // Thứ tự hiển thị (tính riêng theo topic đích); không gửi thì nếu di chuyển
    // sẽ tự xếp cuối danh sách đích
    if ('sort_order' in body) {
      const sortOrder = Number(body.sort_order)
      if (!Number.isSafeInteger(sortOrder) || sortOrder < 1) {
        throw new LessonRequestError('Sort order must be a positive whole number.', 400)
      }
      payload.sort_order = sortOrder
    } else if (moved) {
      payload.sort_order = await this.repo.nextLessonSortOrder(lesson.course_id, payload.topic_id ?? null)
    }

    // Payload rỗng (VD: chỉ gửi "__none__" trùng trạng thái hiện tại) → không gọi DB
    if (Object.keys(payload).length === 0) {
      const current = await this.repo.findLessonById(lessonId)
      if (!current) throw new LessonRequestError('Lesson not found.', 404)
      return { lesson: current, moved: false }
    }

    const updated = await this.repo.updateLesson(lessonId, payload)
    return { lesson: updated, moved }
  }

  /**
   * Lấy quiz của bài giảng. Học viên: ĐÁP ÁN ĐÚNG bị che (chấm điểm server-side).
   * Admin/Teacher: trả đầy đủ đáp án để chỉnh sửa.
   */
  async getQuizForLesson(
    lessonId: string,
    user: AuthenticatedUser
  ): Promise<{
    title: string
    questions: Array<{
      id: string
      content: string
      options: string[]
      correct_index?: number
    }>
  } | null> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const lesson = await this.repo.findLessonById(lessonId)
    if (!lesson) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(lesson.course_id, user)

    const quiz = await this.repo.findExerciseByLesson(lessonId)
    if (!quiz) return null

    const isStudent = user.role === 'STUDENT'
    return {
      title: quiz.title,
      questions: quiz.questions
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((q) => ({
          id: q.id,
          content: q.content,
          options: q.options,
          ...(isStudent ? {} : { correct_index: q.correct_index ?? 0 }),
        })),
    }
  }

  /**
   * Validate payload quiz (từ PUT /lessons/:id/quiz hoặc trường quiz trong
   * payload tạo lesson). value null/undefined → null (không có quiz).
   * Trả về { title, questions } đã làm sạch nếu có quiz.
   */
  private parseQuizPayload(
    value: unknown,
    fallbackTitle = ''
  ): { title: string; questions: Array<{ content: string; options: string[]; correct_index: number }> } | null {
    if (value === undefined || value === null) return null
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new LessonRequestError('Quiz payload must be an object.', 400)
    }
    const body = value as Record<string, unknown>
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : fallbackTitle || 'Quiz kiểm tra'

    const rawQuestions = Array.isArray(body.questions) ? body.questions : []
    if (rawQuestions.length === 0) {
      throw new LessonRequestError('Quiz phải có ít nhất một câu hỏi.', 400)
    }

    const questions = rawQuestions.map((q: any, index: number) => {
      const content = typeof q?.content === 'string' ? q.content.trim() : ''
      if (!content) throw new LessonRequestError(`Câu hỏi ${index + 1}: nội dung không được để trống.`, 400)
      const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? '').trim()) : []
      if (options.length < 2 || options.some((o: unknown) => !o)) {
        throw new LessonRequestError(`Câu hỏi ${index + 1}: phải có ít nhất 2 đáp án, không để trống.`, 400)
      }
      const correctIndex = Number(q?.correct_index)
      if (!Number.isSafeInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        throw new LessonRequestError(`Câu hỏi ${index + 1}: đáp án đúng không hợp lệ.`, 400)
      }
      return { content, options, correct_index: correctIndex }
    })

    return { title, questions }
  }

  /**
   * Lưu/tạo quiz cho bài giảng (chỉ định đáp án đúng qua correct_index 0-3)
   */
  async saveQuizForLesson(
    lessonId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<{ title: string; total_questions: number }> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const lesson = await this.repo.findLessonById(lessonId)
    if (!lesson) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(lesson.course_id, user)

    if (value === undefined || value === null) {
      throw new LessonRequestError('Quiz payload is required.', 400)
    }
    const quiz = this.parseQuizPayload(value, `Quiz: ${lesson.title}`)
    if (!quiz) {
      throw new LessonRequestError('Quiz payload is required.', 400)
    }

    await this.repo.replaceQuizForLesson(lessonId, user.id, lesson.course_id, quiz.title, quiz.questions)
    return { title: quiz.title, total_questions: quiz.questions.length }
  }

  /**
   * Học viên nộp bài quiz — chấm điểm server-side, lưu attempt + câu trả lời
   */
  async submitQuiz(
    lessonId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<{
    total: number
    correct_count: number
    passed: boolean
    score_percent: number
    results: Array<{ question_id: string; is_correct: boolean; correct_index: number }>
  }> {
    if (!UUID_PATTERN.test(lessonId)) {
      throw new LessonRequestError('Lesson ID must be a valid UUID.', 400)
    }
    const lesson = await this.repo.findLessonById(lessonId)
    if (!lesson) {
      throw new LessonRequestError('Lesson not found.', 404)
    }
    await this.assertCourseAccess(lesson.course_id, user)

    if (!value || typeof value !== 'object' || !Array.isArray((value as any).answers)) {
      throw new LessonRequestError('Answers array is required.', 400)
    }
    const answers = (value as { answers: unknown }).answers as Array<{
      question_id: string
      selected_index: number
    }>
    for (const answer of answers) {
      if (!answer || typeof answer.question_id !== 'string' || !Number.isSafeInteger(answer.selected_index)) {
        throw new LessonRequestError('Answers format is invalid.', 400)
      }
    }

    const exercise = await this.repo.findExerciseByLesson(lessonId)
    if (!exercise) {
      throw new LessonRequestError('Bài giảng này chưa có quiz.', 404)
    }
    const knownIds = new Set(exercise.questions.map((q) => q.id))
    for (const answer of answers) {
      if (!knownIds.has(answer.question_id)) {
        throw new LessonRequestError('Câu trả lời chứa câu hỏi không thuộc quiz này.', 400)
      }
    }

    return this.repo.submitQuizAttempt(lessonId, exercise.id, user.id, answers)
  }

  /**
   * Kiểm tra video có PHÁT ĐƯỢC cho học viên hay không (gọi khi bấm "Kiểm tra"):
   * - YouTube: hỏi oEmbed của YouTube — video Riêng tư (Private)/không tồn tại
   *   sẽ bị từ chối (401/404), video Công khai hoặc Unlisted trả về kèm tiêu đề.
   * - Google Drive: thử tải thử file không đăng nhập — file "Bất kỳ ai có liên kết"
   *   trả 200; file "Hạn chế" bị đẩy sang trang đăng nhập Google.
   */
  async kiemTraVideo(value: { url?: unknown }): Promise<VideoCheckResult> {
    const rawUrl = typeof value?.url === 'string' ? value.url.trim() : ''
    if (!rawUrl) {
      throw new LessonRequestError('Video URL is required.', 400)
    }
    let url: URL
    try {
      url = new URL(rawUrl)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
    } catch {
      throw new LessonRequestError('Video URL must be a valid HTTP(S) link.', 400)
    }

    // Chặn probe vào địa chỉ nội bộ (SSRF)
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(url.hostname)) {
      throw new LessonRequestError('Video URL must be a public link.', 400)
    }

    // ---- YouTube ----
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`
      )}&format=json`
      try {
        const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        if (res.ok) {
          const data = (await res.json()) as { title?: string }
          return {
            accessible: true,
            provider: 'youtube',
            title: data.title,
            message: `Video hợp lệ, phát được cho học viên${data.title ? ` — "${data.title}"` : ''}.`,
          }
        }
        if (res.status === 401 || res.status === 403) {
          return {
            accessible: false,
            provider: 'youtube',
            message:
              'Video đang ở chế độ RIÊNG TƯ hoặc hạn chế — học viên KHÔNG xem được. Hãy đổi sang "Không liệt kê (Unlisted)" hoặc "Công khai".',
          }
        }
        if (res.status === 404) {
          return {
            accessible: false,
            provider: 'youtube',
            message:
              'KHÔNG phát được cho học viên: video đang ở chế độ Riêng tư (Private), đã bị xóa, hoặc link sai.',
          }
        }
        return {
          accessible: false,
          provider: 'youtube',
          message: `YouTube trả về mã ${res.status} — không xác nhận được video.`,
        }
      } catch (err) {
        if (err instanceof LessonRequestError) throw err
        return {
          accessible: false,
          provider: 'youtube',
          message: 'Không kết nối được YouTube để kiểm tra (lỗi mạng). Vui lòng thử lại.',
        }
      }
    }

    // ---- Google Drive ----
    const driveId = extractDriveId(url)
    if (driveId) {
      try {
        const res = await fetch(`https://drive.google.com/uc?export=download&id=${driveId}`, {
          redirect: 'follow',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        const redirectedToLogin = res.url.includes('accounts.google.com')
        if (res.ok && !redirectedToLogin) {
          return {
            accessible: true,
            provider: 'drive',
            message:
              'File Drive hợp lệ, đang chia sẻ "Bất kỳ ai có liên kết" — học viên xem được qua nhúng Drive.',
          }
        }
        return {
          accessible: false,
          provider: 'drive',
          message:
            'File Drive đang ở chế độ HẠN CHẾ/Riêng tư — học viên KHÔNG xem được. Hãy bật chia sẻ "Bất kỳ ai có liên kết".',
        }
      } catch {
        return {
          accessible: false,
          provider: 'drive',
          message: 'Không kết nối được Google Drive để kiểm tra (lỗi mạng). Vui lòng thử lại.',
        }
      }
    }

    // ---- Nguồn khác: kiểm tra HTTP cơ bản ----
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      return {
        accessible: res.ok,
        provider: 'other',
        message: res.ok
          ? 'Liên kết phản hồi OK (không kiểm tra sâu được với nguồn ngoài YouTube/Drive).'
          : `Liên kết trả về mã ${res.status} — có thể học viên không xem được.`,
      }
    } catch {
      return {
        accessible: false,
        provider: 'other',
        message: 'Không kết nối được liên kết video (lỗi mạng hoặc link sai).',
      }
    }
  }
}

export const lessonsService = new LessonsService()
