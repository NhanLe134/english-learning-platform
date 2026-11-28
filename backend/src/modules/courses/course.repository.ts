import { createSupabaseClient } from '../../config/supabase.js'
import type {
  Course,
  CourseCatalogEntry,
  CourseCatalogTopic,
  CourseListFilters,
  CourseTeacher,
  EnrolledCourseItem,
  ManagedCourse,
  ManagedCourseInput,
  ManagedCoursePage,
} from './course.types.js'

interface CourseRow {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  status: string
  teacher: CourseTeacher | CourseTeacher[] | null
}

interface ManagedCourseRow extends Omit<ManagedCourse, 'price' | 'discounted_price'> {
  price: number | string
  discounted_price: number | string | null
}

interface CourseCatalogRow extends Omit<CourseCatalogEntry, 'price' | 'discounted_price' | 'teacher' | 'topics'> {
  price: number | string
  discounted_price: number | string | null
  teacher: CourseTeacher | CourseTeacher[] | null
  topics: (Omit<CourseCatalogTopic, 'lessons'> & {
    lessons: (CourseCatalogTopic['lessons'][number] & { status: string })[]
  })[] | null
}

const MANAGED_COURSE_COLUMNS =
  'id,title,slug,description,category,level,target_audience,price,discounted_price,total_lessons,thumbnail_url,status,teacher_id,created_at,updated_at'

const PUBLIC_COURSE_BASE_COLUMNS =
  'id,title,slug,description,category,level,target_audience,price,discounted_price,total_lessons,thumbnail_url,created_at,updated_at,teacher:profiles!courses_teacher_id_fkey(id,full_name,avatar_url)'

const PUBLIC_COURSE_COLUMNS =
  `${PUBLIC_COURSE_BASE_COLUMNS},topics(id,title,description,sort_order,lessons(id,title,description,duration_seconds,sort_order,status))`

function mapManagedCourse(row: ManagedCourseRow): ManagedCourse {
  return {
    ...row,
    price: Number(row.price),
    discounted_price: row.discounted_price === null ? null : Number(row.discounted_price),
    teacher_ids: [],
  }
}

function buildYouTubeThumbnailUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl || typeof videoUrl !== 'string') return null
  const trimmed = videoUrl.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.toLowerCase()
    let videoId: string | null = null
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      videoId = parsed.searchParams.get('v')
      if (!videoId) {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)
        videoId = match?.[1] ?? null
      }
    }
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }
    return null
  } catch {
    return null
  }
}

function mapCatalogCourse(row: CourseCatalogRow): CourseCatalogEntry {
  const topics = (row.topics ?? [])
    .map((topic) => ({
      ...topic,
      lessons: (topic.lessons ?? [])
        .filter((lesson) => lesson.status === 'published')
        .sort((first, second) => first.sort_order - second.sort_order)
        .map(({ status: _status, video_url: _videoUrl, ...lesson }) => ({
          ...lesson,
          duration_seconds: lesson.duration_seconds ?? null,
        })),
    }))
    // Chủ đề không có bài giảng nào thì không hiển thị
    .filter((topic) => topic.lessons.length > 0)
    .sort((first, second) => first.sort_order - second.sort_order)

  const actualLessonsCount = topics.reduce((acc, t) => acc + (t.lessons?.length || 0), 0)
  const totalLessons = actualLessonsCount

  return {
    ...row,
    price: Number(row.price),
    discounted_price: row.discounted_price === null ? null : Number(row.discounted_price),
    total_lessons: totalLessons,
    teacher: Array.isArray(row.teacher) ? row.teacher[0] ?? null : row.teacher,
    topics,
  }
}

function hideCatalogLessons(course: CourseCatalogEntry): CourseCatalogEntry {
  return { ...course, topics: course.topics.map((topic) => ({ ...topic, lessons: [] })) }
}

export class CourseRepository {
  constructor(
    private readonly clientFactory: typeof createSupabaseClient = createSupabaseClient
  ) {}

  async findPublishedCourses(): Promise<CourseCatalogEntry[]> {
    try {
      const { data, error } = await createSupabaseClient()
        .from('courses')
        .select(PUBLIC_COURSE_COLUMNS)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('[CourseRepository] findPublishedCourses database error:', error)
        return []
      }

      const rows = ((data ?? []) as unknown as CourseCatalogRow[]).map(mapCatalogCourse)
      return rows.map(hideCatalogLessons)
    } catch (err) {
      console.error('[CourseRepository] findPublishedCourses unexpected error:', err)
      return []
    }
  }

  async findPublishedCourse(identifier: string, isId: boolean): Promise<CourseCatalogEntry | null> {
    try {
      const client = this.clientFactory()
      const { data: courseData, error: courseError } = await client
        .from('courses')
        .select(PUBLIC_COURSE_BASE_COLUMNS)
        .eq(isId ? 'id' : 'slug', identifier)
        .eq('status', 'published')
        .maybeSingle()

      if (courseError || !courseData) {
        if (courseError) {
          console.error('[CourseRepository] findPublishedCourse course query error:', courseError)
        }
        return null
      }

      const courseRow = courseData as unknown as Omit<CourseCatalogRow, 'topics'>
      const courseId = String(courseRow.id)

      const [topicsResult, lessonsResult] = await Promise.all([
        client
          .from('topics')
          .select('id, title, description, sort_order')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true }),
        client
          .from('lessons')
          .select('id, topic_id, title, description, duration_seconds, video_url, sort_order')
          .eq('course_id', courseId)
          .eq('status', 'published')
          .order('sort_order', { ascending: true }),
      ])

      if (topicsResult.error) {
        console.error('[CourseRepository] findPublishedCourse topics query error:', topicsResult.error)
      }
      if (lessonsResult.error) {
        console.error('[CourseRepository] findPublishedCourse lessons query error:', lessonsResult.error)
      }

      const rawTopics = (topicsResult.data ?? []) as Array<{
        id: string
        title: string
        description: string | null
        sort_order: number
      }>
      const rawLessons = (lessonsResult.data ?? []) as Array<{
        id: string
        topic_id: string | null
        title: string
        description: string | null
        duration_seconds: number | null
        video_url?: string | null
        sort_order: number
      }>

      const topicIdSet = new Set(rawTopics.map((topic) => topic.id))
      const lessonsByTopic = new Map<string, CourseCatalogTopic['lessons']>()
      const topiclessLessons: CourseCatalogTopic['lessons'] = []

      for (const lesson of rawLessons) {
        const publicLesson = {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? null,
          duration_seconds: lesson.duration_seconds ?? null,
          thumbnail_url: buildYouTubeThumbnailUrl(lesson.video_url),
          sort_order: Number(lesson.sort_order ?? 0),
        }
        if (lesson.topic_id && topicIdSet.has(lesson.topic_id)) {
          const list = lessonsByTopic.get(lesson.topic_id) ?? []
          list.push(publicLesson)
          lessonsByTopic.set(lesson.topic_id, list)
        } else {
          topiclessLessons.push(publicLesson)
        }
      }

      const groupedTopics: CourseCatalogTopic[] = rawTopics
        .map((topic) => ({
          id: topic.id,
          title: topic.title,
          description: topic.description ?? null,
          sort_order: Number(topic.sort_order ?? 0),
          lessons: (lessonsByTopic.get(topic.id) ?? []).sort(
            (first, second) => first.sort_order - second.sort_order
          ),
        }))
        .filter((topic) => topic.lessons.length > 0)
        .sort((first, second) => first.sort_order - second.sort_order)

      if (topiclessLessons.length > 0) {
        groupedTopics.push({
          id: `course-${courseId}-lessons`,
          title: 'Bài giảng',
          description: null,
          sort_order: 9999,
          lessons: topiclessLessons.sort((first, second) => first.sort_order - second.sort_order),
        })
      }

      const totalLessons = groupedTopics.reduce((acc, topic) => acc + topic.lessons.length, 0)

      return {
        ...courseRow,
        price: Number(courseRow.price),
        discounted_price:
          courseRow.discounted_price === null ? null : Number(courseRow.discounted_price),
        total_lessons: totalLessons,
        teacher: Array.isArray(courseRow.teacher) ? courseRow.teacher[0] ?? null : courseRow.teacher,
        topics: groupedTopics,
      }
    } catch (err) {
      console.error('[CourseRepository] findPublishedCourse unexpected error:', err)
      return null
    }
  }

  async hasStudentCourseAccess(studentId: string, courseId: string): Promise<boolean> {
    const client = this.clientFactory()
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .limit(1)
      .maybeSingle()
    if (enrollmentError) throw new Error(`Unable to verify course enrollment: ${enrollmentError.message}`, { cause: enrollmentError })
    if (enrollment) return true

    const { data: paidOrder, error: orderError } = await client
      .from('course_orders')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'paid')
      .eq('currency', 'VND')
      .gt('amount', 0)
      .limit(1)
      .maybeSingle()
    if (orderError) throw new Error(`Unable to verify paid course orders: ${orderError.message}`, { cause: orderError })
    return paidOrder !== null
  }

  async findCourseById(courseId: string): Promise<CourseCatalogEntry | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select(PUBLIC_COURSE_COLUMNS)
      .eq('id', courseId)
      .maybeSingle()
    if (error) throw new Error(`Unable to retrieve purchased course details: ${error.message}`, { cause: error })
    return data ? mapCatalogCourse(data as unknown as CourseCatalogRow) : null
  }

  async findPublishedByIds(ids: string[]): Promise<Course[]> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select(
        'id,title,description,thumbnail_url,status,teacher:profiles!courses_teacher_id_fkey(id,full_name,avatar_url)'
      )
      .in('id', ids)
      .eq('status', 'published')

    if (error) {
      throw new Error(`Unable to retrieve selected courses: ${error.message}`, { cause: error })
    }

    const rows = data as unknown as CourseRow[] | null
    return (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      status: row.status,
      teacher: Array.isArray(row.teacher) ? row.teacher[0] ?? null : row.teacher,
    }))
  }

  async findCourses(filters: CourseListFilters): Promise<ManagedCoursePage> {
    const offset = (filters.page - 1) * filters.limit
    let query = createSupabaseClient()
      .from('courses')
      .select(MANAGED_COURSE_COLUMNS, { count: 'exact' })

    if (filters.search) query = query.ilike('title', `%${filters.search}%`)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.level !== 'all') query = query.eq('level', filters.level)
    if (filters.status !== 'all') query = query.eq('status', filters.status)

    const sortByPrice = filters.sort !== 'newest'
    const { data, count, error } = await query
      .order(sortByPrice ? 'price' : 'created_at', {
        ascending: filters.sort === 'price_asc',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + filters.limit - 1)

    let rows = (data ?? []) as unknown as ManagedCourseRow[]
    let total = count ?? rows.length

    if (error) {
      console.error('[CourseRepository] listManagedCourses error:', error)
      return {
        items: [],
        total: 0,
        page: filters.page,
        limit: filters.limit,
        totalPages: 0,
      }
    }

    const items = rows.map(mapManagedCourse)
    // Gắn danh sách giáo viên được phân công cho từng khóa
    const teacherMap = await this.layTeacherIdsTheoKhoa(items.map((item) => item.id))
    for (const item of items) {
      item.teacher_ids = teacherMap.get(item.id) ?? [item.teacher_id]
    }
    // Gắn số bài giảng THẬT của từng khóa (đếm qua topics — cột total_lessons là tĩnh)
    const lessonCountMap = await this.demBaiGiangTheoKhoa(items.map((item) => item.id))
    const exerciseCountMap = await this.demBaiTapTheoKhoa(items.map((item) => item.id))
    for (const item of items) {
      item.lesson_count = lessonCountMap.get(item.id) ?? 0
      item.exercise_count = exerciseCountMap.get(item.id) ?? 0
    }

    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    }
  }

  // Đếm số bài giảng thật của từng khóa trực tiếp theo lessons.course_id (bao gồm cả bài không chia chủ đề)
  private async demBaiGiangTheoKhoa(courseIds: string[], onlyPublished = false): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (courseIds.length === 0) return map
    let query = this.clientFactory()
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
    if (onlyPublished) {
      query = query.eq('status', 'published')
    }
    const { data, error } = await query
    if (error) {
      console.error('[CourseRepository] demBaiGiangTheoKhoa query failed', {
        code: error.code,
        message: error.message,
      })
      return map
    }
    for (const row of data ?? []) {
      const lessonRow = row as { course_id?: string | null; topics?: { course_id?: string } | null }
      const cid = lessonRow.course_id ?? lessonRow.topics?.course_id
      if (cid) map.set(String(cid), (map.get(String(cid)) ?? 0) + 1)
    }
    return map
  }

  // Đếm số bài tập cấp khóa học (lesson_id IS NULL) theo từng khóa
  private async demBaiTapTheoKhoa(courseIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (courseIds.length === 0) return map
    const { data, error } = await this.clientFactory()
      .from('exercises')
      .select('id, course_id')
      .in('course_id', courseIds)
      .is('lesson_id', null)
    if (error) {
      console.error('[CourseRepository] demBaiTapTheoKhoa query failed', {
        code: error.code,
        message: error.message,
      })
      return map
    }
    for (const row of data ?? []) {
      const cid = (row as { course_id?: string | null }).course_id
      if (cid) map.set(String(cid), (map.get(String(cid)) ?? 0) + 1)
    }
    return map
  }

  // Danh sách phân loại riêng biệt của mọi khóa (cho dropdown chọn phân loại)
  async findDistinctCategories(): Promise<string[]> {
    const { data, error } = await this.clientFactory()
      .from('courses')
      .select('category')
    if (error || !data) return []
    const categories = [
      ...new Set(
        data
          .map((row) => (row as { category?: string }).category?.trim())
          .filter((c): c is string => Boolean(c))
      ),
    ]
    return categories.sort((a, b) => a.localeCompare(b, 'vi'))
  }

  // Lấy bảng phân bố khóa — giáo viên cho danh sách khóa
  private async layTeacherIdsTheoKhoa(courseIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    if (courseIds.length === 0) return map
    const { data, error } = await createSupabaseClient()
      .from('course_teachers')
      .select('course_id, teacher_id')
      .in('course_id', courseIds)
    if (error) return map
    for (const row of data ?? []) {
      const list = map.get(row.course_id) ?? []
      list.push(row.teacher_id)
      map.set(row.course_id, list)
    }
    return map
  }

  // Ghi lại bảng phân công (xóa cũ - chèn mới)
  private async luuDanhSachGiaoVien(courseId: string, teacherIds: string[]): Promise<void> {
    await createSupabaseClient().from('course_teachers').delete().eq('course_id', courseId)
    if (teacherIds.length === 0) return
    await createSupabaseClient()
      .from('course_teachers')
      .insert(teacherIds.map((teacher_id) => ({ course_id: courseId, teacher_id })))
  }

  async createCourse(input: ManagedCourseInput, teacherIds: string[]): Promise<ManagedCourse> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .insert({ ...input, teacher_id: teacherIds[0] })
      .select(MANAGED_COURSE_COLUMNS)
      .single()

    if (error) throw new Error(`Unable to create course: ${error.message}`, { cause: error })
    const course = mapManagedCourse(data as unknown as ManagedCourseRow)
    await this.luuDanhSachGiaoVien(course.id, teacherIds)
    course.teacher_ids = teacherIds
    return course
  }

  async updateCourse(
    id: string,
    input: ManagedCourseInput,
    teacherIds?: string[] | null
  ): Promise<ManagedCourse | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .update({
        ...input,
        ...(teacherIds && teacherIds.length > 0 ? { teacher_id: teacherIds[0] } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(MANAGED_COURSE_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to update course: ${error.message}`, { cause: error })
    if (!data) return null
    const course = mapManagedCourse(data as unknown as ManagedCourseRow)
    if (teacherIds) {
      await this.luuDanhSachGiaoVien(id, teacherIds)
      course.teacher_ids = teacherIds
    } else {
      const teacherMap = await this.layTeacherIdsTheoKhoa([id])
      course.teacher_ids = teacherMap.get(id) ?? [course.teacher_id]
    }
    return course
  }

  // Kiểm tra toàn bộ ID đều là profile vai trò TEACHER (xác thực phân công giảng viên)
  async isTeacherProfiles(profileIds: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(profileIds)]
    if (uniqueIds.length === 0) return true
    const { data, error } = await createSupabaseClient()
      .from('profiles')
      .select('id')
      .in('id', uniqueIds)
      .eq('role', 'TEACHER')
    if (error) return false
    return (data?.length ?? 0) === uniqueIds.length
  }

  async updateCourseStatus(
    id: string,
    status: 'published' | 'archived'
  ): Promise<ManagedCourse | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(MANAGED_COURSE_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to update course status: ${error.message}`, { cause: error })
    return data ? mapManagedCourse(data as unknown as ManagedCourseRow) : null
  }

  async deleteCourse(id: string): Promise<boolean> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(`Unable to delete course: ${error.message}`, { cause: error })
    return data !== null
  }

  async findEnrolledCourses(studentId: string): Promise<EnrolledCourseItem[]> {
    try {
      const client = this.clientFactory()

      // 1. Fetch active enrollments
      const { data: enrollments, error: enrollError } = await client
        .from('course_enrollments')
        .select('id, course_id, status, enrolled_at')
        .eq('student_id', studentId)
        .in('status', ['active', 'completed'])

      if (enrollError) {
        console.error('[CourseRepository] findEnrolledCourses: enrollment query failed', {
          studentId: studentId.slice(0, 8) + '…',
          code: enrollError.code,
          message: enrollError.message,
        })
        throw new Error('Unable to query course enrollments', { cause: enrollError })
      }

      // 2. Fetch paid course orders
      const { data: orders, error: orderError } = await client
        .from('course_orders')
        .select('course_id, status, paid_at, created_at, amount, currency')
        .eq('student_id', studentId)
        .eq('status', 'paid')
        .eq('currency', 'VND')
        .gt('amount', 0)

      if (orderError) {
        console.error('[CourseRepository] findEnrolledCourses: orders query failed', {
          studentId: studentId.slice(0, 8) + '…',
          code: orderError.code,
          message: orderError.message,
        })
        throw new Error('Unable to query paid course orders', { cause: orderError })
      }

      console.info('[CourseRepository] findEnrolledCourses: data fetched', {
        studentId: studentId.slice(0, 8) + '…',
        enrollmentCount: Array.isArray(enrollments) ? enrollments.length : 'null',
        paidOrderCount: Array.isArray(orders) ? orders.length : 'null',
      })

      const courseIdMap = new Map<string, { status: 'in_progress' | 'completed'; enrolledAt: string }>()

      if (!enrollError && Array.isArray(enrollments)) {
        for (const e of enrollments) {
          courseIdMap.set(String(e.course_id), {
            status: e.status === 'completed' ? 'completed' : 'in_progress',
            enrolledAt: String(e.enrolled_at || new Date().toISOString()),
          })
        }
      }

      if (Array.isArray(orders)) {
        for (const o of orders) {
          const cid = String(o.course_id)
          if (!courseIdMap.has(cid)) {
            courseIdMap.set(cid, {
              status: 'in_progress',
              enrolledAt: String(o.paid_at || o.created_at || new Date().toISOString()),
            })
          }
        }
      }

      if (courseIdMap.size === 0) {
        return []
      }

      const courseIds = Array.from(courseIdMap.keys())
      const { data: courses, error: courseError } = await client
        .from('courses')
        .select(
          'id, title, slug, category, level, price, discounted_price, total_lessons, thumbnail_url, teacher:profiles!courses_teacher_id_fkey(id, full_name, avatar_url)'
        )
        .in('id', courseIds)

      let resolvedCourses: Array<{
        id: string
        title: string
        slug: string
        category?: string
        level?: string
        total_lessons?: number
        thumbnail_url?: string | null
        teacher?: CourseTeacher | CourseTeacher[] | null
      }> = []

      if (!courseError && Array.isArray(courses)) {
        resolvedCourses = courses as unknown as typeof resolvedCourses
      } else {
        if (courseError) throw new Error('Unable to load enrolled course details', { cause: courseError })
        resolvedCourses = []
      }

      // 3. Fetch all published lessons for the student's courses directly via lessons.course_id
      //    (matches LessonsRepository.findTopicsWithLessons, including topicless lessons).
      const realLessonCountMap = new Map<string, number>()
      const publishedLessonCourseById = new Map<string, string>()
      const { data: publishedLessons, error: lessonsError } = await client
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds)
        .eq('status', 'published')

      if (lessonsError) {
        console.error('[CourseRepository] findEnrolledCourses: published lessons query failed', {
          studentId: studentId.slice(0, 8) + '…',
          code: lessonsError.code,
          message: lessonsError.message,
        })
      } else if (Array.isArray(publishedLessons)) {
        for (const row of publishedLessons) {
          const lessonRow = row as {
            id?: string | null
            course_id?: string | null
            topics?: { course_id?: string } | Array<{ course_id?: string }> | null
          }
          const lessonId = lessonRow.id ? String(lessonRow.id) : null
          const topicCourseId = Array.isArray(lessonRow.topics)
            ? lessonRow.topics[0]?.course_id
            : lessonRow.topics?.course_id
          const cid = lessonRow.course_id ?? topicCourseId
          if (!lessonId || !cid) continue
          const courseKey = String(cid)
          if (!publishedLessonCourseById.has(lessonId)) {
            publishedLessonCourseById.set(lessonId, courseKey)
            realLessonCountMap.set(courseKey, (realLessonCountMap.get(courseKey) ?? 0) + 1)
          }
        }
      }

      // 4. Fetch current lesson_progress directly by (student_id, lesson_id) without nested joins
      //    so progress always matches StudentCourseDetailPage and reflects resets/relearning.
      const completedCountByCourse = new Map<string, number>()
      const progressSumByCourse = new Map<string, number>()
      const hasProgressByCourse = new Set<string>()
      const publishedLessonIds = Array.from(publishedLessonCourseById.keys())
      if (publishedLessonIds.length > 0) {
        const { data: progressRows, error: progressError } = await client
          .from('lesson_progress')
          .select('lesson_id, progress_percent, is_completed')
          .eq('student_id', studentId)
          .in('lesson_id', publishedLessonIds)

        if (progressError) {
          console.error('[CourseRepository] findEnrolledCourses: lesson_progress query failed', {
            studentId: studentId.slice(0, 8) + '…',
            code: progressError.code,
            message: progressError.message,
          })
        } else if (Array.isArray(progressRows)) {
          const seenLessonIds = new Set<string>()
          for (const row of progressRows) {
            const lessonId = (row as { lesson_id?: string | null }).lesson_id
            if (!lessonId) continue
            const lessonKey = String(lessonId)
            if (seenLessonIds.has(lessonKey)) continue
            const courseKey = publishedLessonCourseById.get(lessonKey)
            if (!courseKey) continue
            seenLessonIds.add(lessonKey)

            hasProgressByCourse.add(courseKey)

            const lessonCompleted = Boolean((row as { is_completed?: boolean }).is_completed)
            const rawPercent = Number((row as { progress_percent?: number | string }).progress_percent ?? 0)
            const currentLessonPercent = lessonCompleted
              ? 100
              : Number.isFinite(rawPercent)
              ? Math.min(100, Math.max(0, rawPercent))
              : 0

            progressSumByCourse.set(courseKey, (progressSumByCourse.get(courseKey) ?? 0) + currentLessonPercent)
            if (lessonCompleted) {
              completedCountByCourse.set(courseKey, (completedCountByCourse.get(courseKey) ?? 0) + 1)
            }
          }
        }
      }

      return resolvedCourses.map((c) => {
        const courseKey = String(c.id)
        const meta = courseIdMap.get(courseKey)
        const teacher = Array.isArray(c.teacher) ? c.teacher[0] ?? null : c.teacher
        const realCount = realLessonCountMap.get(courseKey) ?? 0
        const totalLessons = realCount
        const hasProgressRows = hasProgressByCourse.has(courseKey)
        const realCompleted = completedCountByCourse.get(courseKey) ?? 0
        const completedLessons =
          !hasProgressRows && meta?.status === 'completed'
            ? totalLessons
            : Math.min(totalLessons, realCompleted)
        const progressSum =
          !hasProgressRows && meta?.status === 'completed'
            ? totalLessons * 100
            : (progressSumByCourse.get(courseKey) ?? 0)
        const progressPercent =
          totalLessons > 0
            ? Math.min(100, Math.max(0, Math.round(progressSum / totalLessons)))
            : 0
        const isCompleted =
          totalLessons > 0
            ? completedLessons >= totalLessons && progressPercent === 100
            : meta?.status === 'completed'

        return {
          id: String(c.id),
          course_id: String(c.id),
          title: String(c.title),
          slug: String(c.slug),
          category: String(c.category || ''),
          level: String(c.level || ''),
          thumbnail_url: c.thumbnail_url ? String(c.thumbnail_url) : null,
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          progress_percent: progressPercent,
          status: isCompleted ? 'completed' : 'in_progress',
          enrolled_at: meta?.enrolledAt ?? new Date().toISOString(),
          last_active: 'Cập nhật gần đây',
          teacher: teacher
            ? {
                id: String(teacher.id),
                full_name: String(teacher.full_name),
                avatar_url: teacher.avatar_url ? String(teacher.avatar_url) : null,
              }
            : null,
        }
      })
    } catch (err) {
      console.error('[CourseRepository] findEnrolledCourses: unexpected error', {
        studentId: studentId.slice(0, 8) + '…',
        error: err instanceof Error ? err.message : String(err),
      })
      throw new Error('Unable to load enrolled courses', { cause: err })
    }
  }
}

export const courseRepository = new CourseRepository()
