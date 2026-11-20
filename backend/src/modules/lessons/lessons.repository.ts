import { createSupabaseClient } from '../../config/supabase.js'
import type { AuthenticatedUser, LessonItem, LessonTopic } from './lessons.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export { UUID_PATTERN }

export class LessonsRepository {
  private getClient() {
    return createSupabaseClient()
  }

  /**
   * Kiểm tra người dùng có quyền thao tác trên khóa học không:
   * - ADMIN: luôn được
   * - TEACHER: phải là giáo viên chính hoặc nằm trong danh sách phân công (course_teachers)
   * Trả về null nếu khóa không tồn tại, false nếu không có quyền.
   */
  async findCourseAccess(
    courseId: string,
    user: AuthenticatedUser
  ): Promise<{ exists: boolean; allowed: boolean }> {
    const client = this.getClient()
    const { data, error } = await client
      .from('courses')
      .select('id, teacher_id')
      .eq('id', courseId)
      .maybeSingle()

    if (error || !data) return { exists: false, allowed: false }
    if (user.role === 'ADMIN') return { exists: true, allowed: true }
    if (data.teacher_id === user.id) return { exists: true, allowed: true }

    const { data: assigned } = await client
      .from('course_teachers')
      .select('teacher_id')
      .eq('course_id', courseId)
      .eq('teacher_id', user.id)
      .maybeSingle()

    return { exists: true, allowed: Boolean(assigned) }
  }

  async findTopicsWithLessons(courseId: string): Promise<LessonTopic[]> {
    const client = this.getClient()
    const { data: topics, error } = await client
      .from('topics')
      .select('id, course_id, title, description, sort_order')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    if (error || !topics) return []

    const topicIds = topics.map((topic) => topic.id)
    const lessonsByTopic = new Map<string, LessonItem[]>()
    if (topicIds.length > 0) {
      const { data: lessons } = await client
        .from('lessons')
        .select(
          'id, topic_id, title, description, video_url, duration_seconds, sort_order, status'
        )
        .in('topic_id', topicIds)
        .order('sort_order', { ascending: true })

      for (const lesson of lessons ?? []) {
        const list = lessonsByTopic.get(lesson.topic_id) ?? []
        list.push(lesson as LessonItem)
        lessonsByTopic.set(lesson.topic_id, list)
      }
    }

    return topics.map((topic) => ({
      id: topic.id,
      course_id: topic.course_id,
      title: topic.title,
      description: topic.description,
      sort_order: topic.sort_order,
      lessons: lessonsByTopic.get(topic.id) ?? [],
    }))
  }

  async nextTopicSortOrder(courseId: string): Promise<number> {
    const { data } = await this.getClient()
      .from('topics')
      .select('sort_order')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: false })
      .limit(1)
    const max = data?.[0]?.sort_order
    return typeof max === 'number' ? max + 1 : 1
  }

  async nextLessonSortOrder(topicId: string): Promise<number> {
    const { data } = await this.getClient()
      .from('lessons')
      .select('sort_order')
      .eq('topic_id', topicId)
      .order('sort_order', { ascending: false })
      .limit(1)
    const max = data?.[0]?.sort_order
    return typeof max === 'number' ? max + 1 : 1
  }

  async findTopicById(topicId: string): Promise<LessonTopic | null> {
    const { data, error } = await this.getClient()
      .from('topics')
      .select('id, course_id, title, description, sort_order')
      .eq('id', topicId)
      .maybeSingle()

    if (error || !data) return null
    return {
      id: data.id,
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      sort_order: data.sort_order,
      lessons: [],
    }
  }

  async insertTopic(payload: {
    course_id: string
    title: string
    description: string | null
    sort_order: number
  }): Promise<LessonTopic> {
    const { data, error } = await this.getClient()
      .from('topics')
      .insert(payload)
      .select('id, course_id, title, description, sort_order')
      .single()

    if (error || !data) {
      throw new Error(`Unable to create topic: ${error?.message || 'no row returned'}`, {
        cause: error,
      })
    }
    return { ...data, lessons: [] }
  }

  async insertLesson(payload: {
    topic_id: string
    title: string
    description: string | null
    video_url: string
    status: 'draft' | 'published'
    sort_order: number
  }): Promise<LessonItem> {
    const { data, error } = await this.getClient()
      .from('lessons')
      .insert(payload)
      .select(
        'id, topic_id, title, description, video_url, duration_seconds, sort_order, status'
      )
      .single()

    if (error || !data) {
      throw new Error(`Unable to create lesson: ${error?.message || 'no row returned'}`, {
        cause: error,
      })
    }
    return data as LessonItem
  }

  async findLessonById(lessonId: string): Promise<LessonItem | null> {
    const { data, error } = await this.getClient()
      .from('lessons')
      .select(
        'id, topic_id, title, description, video_url, duration_seconds, sort_order, status'
      )
      .eq('id', lessonId)
      .maybeSingle()

    if (error || !data) return null
    return data as LessonItem
  }

  async updateLesson(
    lessonId: string,
    payload: Partial<{
      topic_id: string
      title: string
      description: string | null
      video_url: string
      status: 'draft' | 'published'
      sort_order: number
    }>
  ): Promise<LessonItem> {
    const { data, error } = await this.getClient()
      .from('lessons')
      .update({ ...payload })
      .eq('id', lessonId)
      .select(
        'id, topic_id, title, description, video_url, duration_seconds, sort_order, status'
      )
      .single()

    if (error || !data) {
      throw new Error(`Unable to update lesson: ${error?.message || 'no row returned'}`, {
        cause: error,
      })
    }
    return data as LessonItem
  }
}
