import { createSupabaseClient } from '../../config/supabase.js'
import type {
  AuthenticatedUser,
  LessonItem,
  LessonProgressData,
  LessonProgressItem,
  LessonTopic,
} from './lessons.types.js'

/**
 * Xáo trộn URL video cho học viên: base64 của chuỗi ĐẢO NGƯỢC.
 * F12 đọc JSON API chỉ thấy chuỗi vô nghĩa; FE giải mã ngay lúc tạo player.
 * Đây là biện pháp cản trở thông thường — không phải mã hóa bảo mật tuyệt đối.
 */
function maHoaVideoToken(url: string): string {
  return Buffer.from(url.split('').reverse().join('')).toString('base64')
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export { UUID_PATTERN }

export class LessonsRepository {
  constructor(
    private readonly clientFactory: typeof createSupabaseClient = createSupabaseClient
  ) {}

  private getClient() {
    return this.clientFactory()
  }

  /**
   * Kiểm tra người dùng có quyền thao tác / xem khóa học:
   * - ADMIN: luôn được
   * - TEACHER: phải là giáo viên chính hoặc nằm trong danh sách phân công (course_teachers)
   * - STUDENT: phải có ghi danh 'active' hoặc 'completed' trong course_enrollments
   * Trả về exists: false nếu khóa không tồn tại, allowed: false nếu không có quyền.
   */
  async findCourseAccess(
    courseIdentifier: string,
    user: AuthenticatedUser
  ): Promise<{ exists: boolean; allowed: boolean; courseId: string; courseTitle: string }> {
    const client = this.getClient()
    let query = client
      .from('courses')
      .select('id, title, teacher_id')

    if (UUID_PATTERN.test(courseIdentifier)) {
      query = query.eq('id', courseIdentifier)
    } else {
      query = query.eq('slug', courseIdentifier)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return { exists: false, allowed: false, courseId: '', courseTitle: '' }

    const courseId = data.id as string
    const courseTitle = (data.title as string) || ''

    if (user.role === 'ADMIN') return { exists: true, allowed: true, courseId, courseTitle }
    if (user.role === 'TEACHER') {
      if (data.teacher_id === user.id) return { exists: true, allowed: true, courseId, courseTitle }

      const { data: assigned } = await client
        .from('course_teachers')
        .select('teacher_id')
        .eq('course_id', courseId)
        .eq('teacher_id', user.id)
        .maybeSingle()

      return { exists: true, allowed: Boolean(assigned), courseId, courseTitle }
    }
    if (user.role === 'STUDENT') {
      const { data: enrollment } = await client
        .from('course_enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .in('status', ['active', 'completed'])
        .maybeSingle()

      return { exists: true, allowed: Boolean(enrollment), courseId, courseTitle }
    }
    return { exists: true, allowed: false, courseId, courseTitle }
  }

  async findTopicsWithLessons(
    courseId: string,
    publishedOnly = false,
    studentId?: string
  ): Promise<LessonTopic[]> {
    const client = this.getClient()
    const { data: topics, error } = await client
      .from('topics')
      .select('id, course_id, title, description, sort_order')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    if (error || !topics) return []

    // Bài giảng của khóa: gồm cả bài KHÔNG thuộc chủ đề nào (topic_id null)
    let lessonQuery = client
      .from('lessons')
      .select(
        'id, topic_id, course_id, title, description, video_url, duration_seconds, sort_order, status'
      )
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    if (publishedOnly) {
      lessonQuery = lessonQuery.eq('status', 'published')
    }

    const { data: lessons } = await lessonQuery

    const lessonIds = (lessons ?? []).map((l) => l.id)
    const materialsByLesson = new Map<string, Array<{ id: string; name: string; file_url: string; file_type: string }>>()
    const progressByLesson = new Map<string, LessonProgressData>()

    if (lessonIds.length > 0) {
      try {
        const { data: materials } = await client
          .from('lesson_materials')
          .select('id, lesson_id, file_name, file_url, file_type, status')
          .in('lesson_id', lessonIds)
          .eq('status', 'published')

        for (const mat of materials ?? []) {
          const list = materialsByLesson.get(mat.lesson_id) ?? []
          list.push({
            id: mat.id,
            name: mat.file_name,
            file_url: mat.file_url,
            file_type: mat.file_type || 'pdf',
          })
          materialsByLesson.set(mat.lesson_id, list)
        }
      } catch {
        // ignore
      }

      if (studentId) {
        try {
          const { data: progressList } = await client
            .from('lesson_progress')
            .select('lesson_id, last_position_seconds, progress_percent, is_completed')
            .eq('student_id', studentId)
            .in('lesson_id', lessonIds)

          for (const p of progressList ?? []) {
            progressByLesson.set(p.lesson_id, {
              last_position_seconds: p.last_position_seconds ?? 0,
              progress_percent: Number(p.progress_percent ?? 0),
              is_completed: Boolean(p.is_completed),
            })
          }
        } catch {
          // ignore
        }
      }
    }

    const lessonsByTopic = new Map<string | null, LessonItem[]>()
    const topiclessLessons: LessonItem[] = []

    for (const lesson of lessons ?? []) {
      const base = lesson as LessonItem
      let item: LessonItem & { video_token?: string; progress?: LessonProgressData }
      if (studentId) {
        // Học viên: KHÔNG trả video_url thô (F12 đọc JSON không thấy link) —
        // thay bằng video_token xáo trộn, FE giải mã ngay lúc tạo player
        item = {
          id: base.id,
          topic_id: base.topic_id,
          course_id: base.course_id,
          title: base.title,
          description: base.description,
          video_url: undefined,
          video_token: base.video_url ? maHoaVideoToken(base.video_url) : undefined,
          duration_seconds: base.duration_seconds,
          sort_order: base.sort_order,
          status: base.status,
          materials: materialsByLesson.get(base.id) ?? [],
          progress: progressByLesson.get(base.id),
        }
      } else {
        item = {
          ...base,
          materials: materialsByLesson.get(base.id) ?? [],
          progress: progressByLesson.get(base.id),
        }
      }
      if (base.topic_id === null) {
        topiclessLessons.push(item)
      } else {
        const list = lessonsByTopic.get(base.topic_id) ?? []
        list.push(item)
        lessonsByTopic.set(base.topic_id, list)
      }
    }

    const result = topics.map((topic) => ({
      id: topic.id,
      course_id: topic.course_id,
      title: topic.title,
      description: topic.description,
      sort_order: topic.sort_order,
      lessons: lessonsByTopic.get(topic.id) ?? [],
    }))

    // Bài không chia chủ đề → gom thành nhóm ảo đặt CUỐI danh sách
    if (topiclessLessons.length > 0) {
      result.push({
        id: null,
        course_id: courseId,
        title: 'Không chia chủ đề',
        description: null,
        sort_order: 9999,
        lessons: topiclessLessons,
      })
    }
    return result
  }

  async findLessonProgress(
    lessonId: string,
    studentId: string
  ): Promise<LessonProgressItem | null> {
    const { data, error } = await this.getClient()
      .from('lesson_progress')
      .select('id, lesson_id, student_id, last_position_seconds, progress_percent, is_completed, updated_at')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (error || !data) return null
    return {
      id: data.id,
      lesson_id: data.lesson_id,
      student_id: data.student_id,
      last_position_seconds: data.last_position_seconds ?? 0,
      progress_percent: Number(data.progress_percent ?? 0),
      is_completed: Boolean(data.is_completed),
      updated_at: data.updated_at,
    }
  }

  async upsertLessonProgress(payload: {
    lesson_id: string
    student_id: string
    last_position_seconds: number
    progress_percent: number
    is_completed: boolean
  }): Promise<LessonProgressItem> {
    const client = this.getClient()
    const { data, error } = await client
      .from('lesson_progress')
      .upsert(
        {
          lesson_id: payload.lesson_id,
          student_id: payload.student_id,
          last_position_seconds: Math.max(0, Math.floor(payload.last_position_seconds)),
          progress_percent: Math.min(100, Math.max(0, Number(payload.progress_percent.toFixed(2)))),
          is_completed: payload.is_completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,student_id' }
      )
      .select('id, lesson_id, student_id, last_position_seconds, progress_percent, is_completed, updated_at')
      .single()

    if (error || !data) {
      throw new Error(`Unable to update lesson progress: ${error?.message || 'no row returned'}`, {
        cause: error,
      })
    }

    return {
      id: data.id,
      lesson_id: data.lesson_id,
      student_id: data.student_id,
      last_position_seconds: data.last_position_seconds,
      progress_percent: Number(data.progress_percent),
      is_completed: Boolean(data.is_completed),
      updated_at: data.updated_at,
    }
  }

  async updateLessonDuration(lessonId: string, durationSeconds: number): Promise<void> {
    if (durationSeconds <= 0) return
    const client = this.getClient()
    await client
      .from('lessons')
      .update({ duration_seconds: Math.round(durationSeconds) })
      .eq('id', lessonId)
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

  /** Số thứ tự kế tiếp trong một chủ đề (topicId null = nhóm không chia chủ đề của khóa) */
  async nextLessonSortOrder(courseId: string, topicId: string | null): Promise<number> {
    let query = this.getClient()
      .from('lessons')
      .select('sort_order')
      .eq('course_id', courseId)
    query = topicId === null ? query.is('topic_id', null) : query.eq('topic_id', topicId)
    const { data } = await query.order('sort_order', { ascending: false }).limit(1)
    const max = data?.[0]?.sort_order
    return typeof max === 'number' ? max + 1 : 1
  }

  // Tìm chủ đề theo tên trong khóa (dùng cho chủ đề mặc định "Bài giảng")
  async findTopicByTitle(courseId: string, title: string): Promise<LessonTopic | null> {
    const { data, error } = await this.getClient()
      .from('topics')
      .select('id, course_id, title, description, sort_order')
      .eq('course_id', courseId)
      .eq('title', title)
      .order('sort_order', { ascending: true })
      .limit(1)
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
    course_id: string
    topic_id: string | null
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
        'id, topic_id, course_id, title, description, video_url, duration_seconds, sort_order, status'
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
        'id, topic_id, course_id, title, description, video_url, duration_seconds, sort_order, status'
      )
      .eq('id', lessonId)
      .maybeSingle()

    if (error || !data) return null
    return data as LessonItem
  }

  async findLessonWithCourse(
    lessonId: string,
    studentId?: string
  ): Promise<{ lesson: LessonItem; courseId: string } | null> {
    const client = this.getClient()
    const { data: lesson, error } = await client
      .from('lessons')
      .select('id, topic_id, course_id, title, description, video_url, duration_seconds, sort_order, status')
      .eq('id', lessonId)
      .maybeSingle()

    if (error || !lesson) return null

    let materials: Array<{ id: string; name: string; file_url: string; file_type: string }> = []
    try {
      const { data: matData } = await client
        .from('lesson_materials')
        .select('id, lesson_id, file_name, file_url, file_type, status')
        .eq('lesson_id', lessonId)
        .eq('status', 'published')

      if (matData) {
        materials = matData.map((m) => ({
          id: m.id,
          name: m.file_name,
          file_url: m.file_url,
          file_type: m.file_type || 'pdf',
        }))
      }
    } catch {
      // ignore
    }

    let progress: LessonProgressData | undefined
    if (studentId) {
      try {
        const existingProgress = await this.findLessonProgress(lessonId, studentId)
        if (existingProgress) {
          progress = {
            last_position_seconds: existingProgress.last_position_seconds,
            progress_percent: existingProgress.progress_percent,
            is_completed: existingProgress.is_completed,
          }
        }
      } catch {
        // ignore
      }
    }

    const base = lesson as LessonItem
    const lessonOut: LessonItem = studentId
      ? {
          id: base.id,
          topic_id: base.topic_id,
          course_id: base.course_id,
          title: base.title,
          description: base.description,
          video_url: undefined,
          video_token: base.video_url ? maHoaVideoToken(base.video_url) : undefined,
          duration_seconds: base.duration_seconds,
          sort_order: base.sort_order,
          status: base.status,
          materials,
          progress,
        }
      : {
          ...base,
          materials,
          progress,
        }

    return {
      lesson: lessonOut,
      courseId: lesson.course_id,
    }
  }

  // Xóa bài giảng (hàng đợi ôn tập/tiến độ liên quan tự xóa theo CASCADE)
  async deleteLesson(lessonId: string): Promise<boolean> {
    const { data, error } = await this.getClient()
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .select('id')

    if (error) {
      throw new Error(`Không thể xóa bài giảng: ${error.message}`)
    }
    return Array.isArray(data) && data.length > 0
  }

  async updateLesson(
    lessonId: string,
    payload: Partial<{
      topic_id: string | null
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
