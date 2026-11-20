import { LessonRequestError } from './lessons.errors.js'
import { LessonsRepository, UUID_PATTERN } from './lessons.repository.js'
import type { AuthenticatedUser, LessonItem, LessonTopic } from './lessons.types.js'

const TOPIC_TITLE_MAX = 200
const LESSON_TITLE_MAX = 200
const DESCRIPTION_MAX = 2000

export class LessonsService {
  private readonly repo: LessonsRepository

  constructor(repo: LessonsRepository = new LessonsRepository()) {
    this.repo = repo
  }

  private async assertCourseAccess(courseId: string, user: AuthenticatedUser): Promise<void> {
    if (!UUID_PATTERN.test(courseId)) {
      throw new LessonRequestError('Course ID must be a valid UUID.', 400)
    }
    const access = await this.repo.findCourseAccess(courseId, user)
    if (!access.exists) {
      throw new LessonRequestError('Course not found.', 404)
    }
    if (!access.allowed) {
      throw new LessonRequestError(
        'Bạn chưa được phân công phụ trách khóa học này.',
        403
      )
    }
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

  /** Danh sách chủ đề + bài giảng của một khóa (gồm cả bản nháp) */
  async getTopicsForCourse(courseId: string, user: AuthenticatedUser): Promise<LessonTopic[]> {
    await this.assertCourseAccess(courseId, user)
    return this.repo.findTopicsWithLessons(courseId)
  }

  /** Tạo chủ đề mới cho khóa học */
  async createTopic(
    courseId: string,
    user: AuthenticatedUser,
    value: unknown
  ): Promise<LessonTopic> {
    await this.assertCourseAccess(courseId, user)
    if (!value || typeof value !== 'object') {
      throw new LessonRequestError('Topic details are required.', 400)
    }
    const body = value as Record<string, unknown>
    const title = this.validateTitle(body.title, 'Topic title', TOPIC_TITLE_MAX)
    const description = this.validateDescription(body.description)
    const sortOrder = await this.repo.nextTopicSortOrder(courseId)
    return this.repo.insertTopic({ course_id: courseId, title, description, sort_order: sortOrder })
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
