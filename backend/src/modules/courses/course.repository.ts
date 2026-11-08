import { createSupabaseClient } from '../../config/supabase.js'
import type {
  Course,
  CourseCatalogEntry,
  CourseCatalogTopic,
  CourseListFilters,
  CourseTeacher,
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
  'id,title,slug,description,category,level,target_audience,price,discounted_price,total_lessons,thumbnail_url,created_at,updated_at,teacher:profiles!courses_teacher_id_fkey(id,full_name,avatar_url),topics(id,title,description,sort_order,lessons(id,title,description,sort_order,status))'

function mapManagedCourse(row: ManagedCourseRow): ManagedCourse {
  return {
    ...row,
    price: Number(row.price),
    discounted_price: row.discounted_price === null ? null : Number(row.discounted_price),
  }
}

function mapCatalogCourse(row: CourseCatalogRow): CourseCatalogEntry {
  return {
    ...row,
    price: Number(row.price),
    discounted_price: row.discounted_price === null ? null : Number(row.discounted_price),
    teacher: Array.isArray(row.teacher) ? row.teacher[0] ?? null : row.teacher,
    topics: (row.topics ?? [])
      .map((topic) => ({
        ...topic,
        lessons: topic.lessons
          .filter((lesson) => lesson.status === 'published')
          .map(({ status: _status, ...lesson }) => lesson),
      }))
      .sort((first, second) => first.sort_order - second.sort_order),
  }
}

export class CourseRepository {
  async findPublishedCourses(): Promise<CourseCatalogEntry[]> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select(PUBLIC_COURSE_COLUMNS)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Unable to retrieve published courses: ${error.message}`, { cause: error })
    }

    return ((data ?? []) as unknown as CourseCatalogRow[]).map(mapCatalogCourse)
  }

  async findPublishedCourse(identifier: string, isId: boolean): Promise<CourseCatalogEntry | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .select(PUBLIC_COURSE_COLUMNS)
      .eq(isId ? 'id' : 'slug', identifier)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to retrieve published course: ${error.message}`, { cause: error })
    }

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

    if (error) {
      throw new Error(`Unable to retrieve courses: ${error.message}`, { cause: error })
    }

    const rows = (data ?? []) as unknown as ManagedCourseRow[]
    const total = count ?? rows.length
    return {
      items: rows.map(mapManagedCourse),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    }
  }

  async createCourse(input: ManagedCourseInput, teacherId: string): Promise<ManagedCourse> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .insert({ ...input, teacher_id: teacherId })
      .select(MANAGED_COURSE_COLUMNS)
      .single()

    if (error) throw new Error(`Unable to create course: ${error.message}`, { cause: error })
    return mapManagedCourse(data as unknown as ManagedCourseRow)
  }

  async updateCourse(id: string, input: ManagedCourseInput): Promise<ManagedCourse | null> {
    const { data, error } = await createSupabaseClient()
      .from('courses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(MANAGED_COURSE_COLUMNS)
      .maybeSingle()

    if (error) throw new Error(`Unable to update course: ${error.message}`, { cause: error })
    return data ? mapManagedCourse(data as unknown as ManagedCourseRow) : null
  }

  async updateCourseStatus(
    id: string,
    status: 'draft' | 'published'
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
}

export const courseRepository = new CourseRepository()
