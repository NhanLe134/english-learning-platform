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

const PUBLIC_COURSE_COLUMNS =
  'id,title,slug,description,category,level,target_audience,price,discounted_price,total_lessons,thumbnail_url,created_at,updated_at,teacher:profiles!courses_teacher_id_fkey(id,full_name,avatar_url),topics(id,title,description,sort_order,lessons(id,title,description,duration_seconds,video_url,sort_order,status))'

function mapManagedCourse(row: ManagedCourseRow): ManagedCourse {
  return {
    ...row,
    price: Number(row.price),
    discounted_price: row.discounted_price === null ? null : Number(row.discounted_price),
    teacher_ids: [],
  }
}

function mapCatalogCourse(row: CourseCatalogRow): CourseCatalogEntry {
  const topics = (row.topics ?? [])
    .map((topic) => ({
      ...topic,
      lessons: (topic.lessons ?? [])
        .filter((lesson) => lesson.status === 'published')
        .map(({ status: _status, ...lesson }) => ({
          ...lesson,
          duration_seconds: lesson.duration_seconds ?? null,
          video_url: lesson.video_url ?? null,
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
      const { data, error } = await createSupabaseClient()
        .from('courses')
        .select(PUBLIC_COURSE_COLUMNS)
        .eq(isId ? 'id' : 'slug', identifier)
        .eq('status', 'published')
        .maybeSingle()

      if (!error && data) {
        return mapCatalogCourse(data as unknown as CourseCatalogRow)
      }
      return null
    } catch {
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
    for (const item of items) {
      item.lesson_count = lessonCountMap.get(item.id) ?? 0
    }

    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    }
  }

  // Đếm số bài giảng thật của từng khóa (qua bảng topics trung gian)
  private async demBaiGiangTheoKhoa(courseIds: string[], onlyPublished = false): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (courseIds.length === 0) return map
    let query = this.clientFactory()
      .from('lessons')
      .select('id, topics!inner(course_id)')
      .in('topics.course_id', courseIds)
    if (onlyPublished) {
      query = query.eq('status', 'published')
    }
    const { data, error } = await query
    if (error) return map
    for (const row of data ?? []) {
      const cid = (row as { topics?: { course_id?: string } }).topics?.course_id
      if (cid) map.set(cid, (map.get(cid) ?? 0) + 1)
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

      const completedCountByCourse = new Map<string, number>()
      try {
        const { data: progressRows } = await client
          .from('lesson_progress')
          .select('lesson_id, lessons!inner(topic_id, topics!inner(course_id))')
          .eq('student_id', studentId)
          .eq('is_completed', true)

        if (Array.isArray(progressRows)) {
          for (const row of progressRows) {
            // @ts-expect-error joined relation types
            const courseId = row?.lessons?.topics?.course_id
            if (courseId) {
              completedCountByCourse.set(String(courseId), (completedCountByCourse.get(String(courseId)) ?? 0) + 1)
            }
          }
        }
      } catch {
        // ignore fallback
      }

      const realLessonCountMap = await this.demBaiGiangTheoKhoa(courseIds, true)

      return resolvedCourses.map((c) => {
        const meta = courseIdMap.get(String(c.id))
        const teacher = Array.isArray(c.teacher) ? c.teacher[0] ?? null : c.teacher
        const realCount = realLessonCountMap.get(String(c.id)) ?? 0
        const totalLessons = realCount
        const isCompleted = meta?.status === 'completed'
        const realCompleted = completedCountByCourse.get(String(c.id))
        const completedLessons = isCompleted
          ? totalLessons
          : realCompleted !== undefined
          ? Math.min(totalLessons, realCompleted)
          : 0
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

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
