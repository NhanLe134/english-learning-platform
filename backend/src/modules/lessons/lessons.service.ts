import { LessonRequestError } from './lessons.errors.js'
import { LessonsRepository, UUID_PATTERN } from './lessons.repository.js'
import type {
  AuthenticatedUser,
  LessonItem,
  LessonProgressItem,
  LessonTopic,
} from './lessons.types.js'

const TOPIC_TITLE_MAX = 200
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
    const isCompleted = Boolean(existing?.is_completed) || body.is_completed === true

    let incomingPercent: number
    if ('progress_percent' in body && body.progress_percent !== undefined) {
      const pct = Number(body.progress_percent)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new LessonRequestError('progress_percent must be a number between 0 and 100.', 400)
      }
      incomingPercent = pct
    } else if (effectiveDuration > 0) {
      incomingPercent = Math.min(99, Math.round((flooredPosition / effectiveDuration) * 100))
    } else {
      incomingPercent = Number(existing?.progress_percent ?? 0)
    }

    const progressPercent = isCompleted
      ? 100
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
    const sortOrder = await this.repo.nextLessonSortOrder(topicId)
    const lesson = await this.repo.insertLesson({
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
    const currentTopic = await this.repo.findTopicById(lesson.topic_id)
    if (!currentTopic) {
      throw new LessonRequestError('Topic of this lesson no longer exists.', 404)
    }
    await this.assertCourseAccess(currentTopic.course_id, user)

    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Lesson update payload is required.', 400)
    }
    const body = value as Record<string, unknown>

    const payload: Parameters<LessonsRepository['updateLesson']>[1] = {}
    if ('title' in body) payload.title = this.validateTitle(body.title, 'Lesson title', LESSON_TITLE_MAX)
    if ('description' in body) payload.description = this.validateDescription(body.description)
    if ('video_url' in body) payload.video_url = this.validateVideoUrl(body.video_url)
    if ('status' in body) payload.status = this.validateStatus(body.status)

    // Đổi chủ đề
    let moved = false
    if ('topic_id' in body && typeof body.topic_id === 'string' && body.topic_id !== lesson.topic_id) {
      if (!UUID_PATTERN.test(body.topic_id)) {
        throw new LessonRequestError('New topic ID must be a valid UUID.', 400)
      }
      const targetTopic = await this.repo.findTopicById(body.topic_id)
      if (!targetTopic) {
        throw new LessonRequestError('Target topic not found.', 404)
      }
      await this.assertCourseAccess(targetTopic.course_id, user)
      payload.topic_id = body.topic_id
      moved = true
    }

    // Thứ tự hiển thị (tính riêng theo topic đích); không gửi thì nếu di chuyển
    // sẽ tự xếp cuối danh sách topic mới
    if ('sort_order' in body) {
      const sortOrder = Number(body.sort_order)
      if (!Number.isSafeInteger(sortOrder) || sortOrder < 1) {
        throw new LessonRequestError('Sort order must be a positive whole number.', 400)
      }
      payload.sort_order = sortOrder
    } else if (moved) {
      payload.sort_order = await this.repo.nextLessonSortOrder(payload.topic_id as string)
    }

    const updated = await this.repo.updateLesson(lessonId, payload)
    return { lesson: updated, moved }
  }
}

export const lessonsService = new LessonsService()
