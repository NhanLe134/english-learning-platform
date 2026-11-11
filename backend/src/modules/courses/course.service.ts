import { env } from '../../config/env.js'
import { CourseRepository, courseRepository } from './course.repository.js'
import type {
  Course,
  CourseCatalogEntry,
  CourseLevel,
  CourseListFilters,
  ManagedCourse,
  ManagedCourseInput,
  ManagedCoursePage,
} from './course.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_COURSE_IDS = 50
const COURSE_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced']

export class CourseRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly missingIds?: string[]
  ) {
    super(message)
    this.name = 'CourseRequestError'
  }
}

export interface SelectedCourses {
  courses: Course[]
  missingIds: string[]
}

export interface ValidatedCourseIds {
  courseIds: string[]
  missingIds: string[]
}

export class CourseService {
  constructor(private readonly repository: CourseRepository = courseRepository) {}

  async listManagedCourses(query: Record<string, unknown>): Promise<ManagedCoursePage> {
    const page = this.parsePositiveInteger(query.page, 1, 'page', 1_000_000)
    const limit = this.parsePositiveInteger(query.limit, 10, 'limit', 100)
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''
    const category = typeof query.category === 'string' ? query.category.trim().slice(0, 100) : ''
    const statusValue = typeof query.status === 'string' ? query.status : 'all'
    const levelValue = typeof query.level === 'string' ? query.level : 'all'
    const sortValue = typeof query.sort === 'string' ? query.sort : 'newest'
    if (!['all', 'draft', 'published', 'archived'].includes(statusValue)) {
      throw new CourseRequestError('Course status filter is invalid.', 400)
    }
    if (!['all', ...COURSE_LEVELS].includes(levelValue)) {
      throw new CourseRequestError('Course level filter is invalid.', 400)
    }
    if (!['newest', 'price_asc', 'price_desc'].includes(sortValue)) {
      throw new CourseRequestError('Course sort order is invalid.', 400)
    }

    return this.repository.findCourses({
      search,
      category,
      level: levelValue as CourseListFilters['level'],
      status: statusValue as CourseListFilters['status'],
      sort: sortValue as CourseListFilters['sort'],
      page,
      limit,
    })
  }

  async listPublishedCourses(): Promise<CourseCatalogEntry[]> {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new CourseRequestError('The course catalog is not configured.', 503)
    }
    return this.repository.findPublishedCourses()
  }

  async getPublishedCourse(identifier: string): Promise<CourseCatalogEntry | null> {
    const isId = UUID_PATTERN.test(identifier)
    if (!isId && !SLUG_PATTERN.test(identifier)) {
      throw new CourseRequestError('Course ID or slug is invalid.', 400)
    }
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new CourseRequestError('The course catalog is not configured.', 503)
    }
    return this.repository.findPublishedCourse(identifier, isId)
  }

  async getCourseForPaidOrder(courseId: string): Promise<CourseCatalogEntry | null> {
    if (!UUID_PATTERN.test(courseId)) return null
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new CourseRequestError('The course catalog is not configured.', 503)
    }
    return this.repository.findCourseById(courseId)
  }

  async createManagedCourse(value: unknown, teacherId: string): Promise<ManagedCourse> {
    if (!UUID_PATTERN.test(teacherId)) {
      throw new CourseRequestError('An authenticated administrator is required.', 401)
    }
    try {
      return await this.repository.createCourse(this.validateManagedCourse(value), teacherId)
    } catch (error) {
      this.throwForDatabaseConstraint(error)
      throw error
    }
  }

  async updateManagedCourse(id: string, value: unknown): Promise<ManagedCourse> {
    this.validateCourseId(id)
    let updated: ManagedCourse | null
    try {
      updated = await this.repository.updateCourse(id, this.validateManagedCourse(value))
    } catch (error) {
      this.throwForDatabaseConstraint(error)
      throw error
    }
    if (!updated) throw new CourseRequestError('Course not found.', 404)
    return updated
  }

  async updateManagedCourseStatus(id: string, value: unknown): Promise<ManagedCourse> {
    this.validateCourseId(id)
    if (!value || typeof value !== 'object' || !('status' in value)) {
      throw new CourseRequestError('Course status is required.', 400)
    }
    const status = value.status
    if (status !== 'draft' && status !== 'published') {
      throw new CourseRequestError('Course status must be draft or published.', 400)
    }
    const updated = await this.repository.updateCourseStatus(id, status)
    if (!updated) throw new CourseRequestError('Course not found.', 404)
    return updated
  }

  async deleteManagedCourse(id: string): Promise<void> {
    this.validateCourseId(id)
    let deleted: boolean
    try {
      deleted = await this.repository.deleteCourse(id)
    } catch (error) {
      const code = this.databaseErrorCode(error)
      if (code === '23503') {
        throw new CourseRequestError(
          'Course cannot be deleted while enrollments or course content are linked.',
          409
        )
      }
      throw error
    }
    if (!deleted) {
      throw new CourseRequestError('Course not found.', 404)
    }
  }

  async getSelectedCourses(idsParameter: unknown): Promise<SelectedCourses> {
    const uniqueIds = this.parseCourseIds(idsParameter)
    return this.findSelectedCourses(uniqueIds)
  }

  async validateSelectedCourseIds(idsParameter: unknown): Promise<ValidatedCourseIds> {
    if (!Array.isArray(idsParameter) || idsParameter.some((id) => typeof id !== 'string')) {
      throw new CourseRequestError('Selected course IDs must be an array of UUIDs.', 400)
    }

    if (idsParameter.length === 0) return { courseIds: [], missingIds: [] }

    const uniqueIds = this.parseCourseIds(idsParameter.join(','))
    const { missingIds } = await this.findSelectedCourses(uniqueIds)
    return { courseIds: uniqueIds, missingIds }
  }

  private parseCourseIds(idsParameter: unknown): string[] {
    if (typeof idsParameter !== 'string' || !idsParameter.trim()) {
      throw new CourseRequestError('Provide selected course IDs in the ids query parameter.', 400)
    }

    const requestedIds = idsParameter.split(',').map((id) => id.trim())
    if (
      requestedIds.length > MAX_COURSE_IDS ||
      requestedIds.some((id) => !UUID_PATTERN.test(id))
    ) {
      throw new CourseRequestError(
        `Course IDs must be valid UUIDs; provide no more than ${MAX_COURSE_IDS}.`,
        400
      )
    }

    return [...new Set(requestedIds)]
  }

  private parsePositiveInteger(
    value: unknown,
    fallback: number,
    field: string,
    maximum: number
  ): number {
    if (value === undefined) return fallback
    const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
      throw new CourseRequestError(`${field} must be between 1 and ${maximum}.`, 400)
    }
    return parsed
  }

  private validateCourseId(id: string): void {
    if (!UUID_PATTERN.test(id)) throw new CourseRequestError('Course ID must be a UUID.', 400)
  }

  private throwForDatabaseConstraint(error: unknown): void {
    if (this.databaseErrorCode(error) === '23505') {
      throw new CourseRequestError('A course with this slug already exists.', 409)
    }
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!(error instanceof Error) || !error.cause || typeof error.cause !== 'object') return undefined
    return 'code' in error.cause && typeof error.cause.code === 'string'
      ? error.cause.code
      : undefined
  }

  private validateManagedCourse(value: unknown): ManagedCourseInput {
    if (!value || typeof value !== 'object') {
      throw new CourseRequestError('Course details are required.', 400)
    }
    const input = value as Record<string, unknown>
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : ''
    const category = typeof input.category === 'string' ? input.category.trim() : ''
    const targetAudience =
      typeof input.target_audience === 'string' ? input.target_audience.trim() : ''
    const level = input.level
    const description =
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : null
    const thumbnailUrl =
      typeof input.thumbnail_url === 'string' && input.thumbnail_url.trim()
        ? input.thumbnail_url.trim()
        : null
    const price = this.parseMoney(input.price, 'price', false)
    const discountedPrice = this.parseMoney(input.discounted_price, 'discounted_price', true)
    const totalLessons = input.total_lessons
    const status = input.status

    if (!title || title.length > 200) {
      throw new CourseRequestError('Course title is required and must be at most 200 characters.', 400)
    }
    if (!slug || slug.length > 180 || !SLUG_PATTERN.test(slug)) {
      throw new CourseRequestError('Course slug must use lowercase letters, numbers, and hyphens.', 400)
    }
    if (!category || category.length > 100) {
      throw new CourseRequestError('Course category is required and must be at most 100 characters.', 400)
    }
    if (typeof level !== 'string' || !COURSE_LEVELS.includes(level as CourseLevel)) {
      throw new CourseRequestError('Course level is invalid.', 400)
    }
    if (!targetAudience || targetAudience.length > 500) {
      throw new CourseRequestError('Target audience is required and must be at most 500 characters.', 400)
    }
    if (
      typeof totalLessons !== 'number' ||
      !Number.isSafeInteger(totalLessons) ||
      totalLessons < 0 ||
      totalLessons > 100_000
    ) {
      throw new CourseRequestError('Total lessons must be a non-negative whole number.', 400)
    }
    if (discountedPrice !== null && discountedPrice > price) {
      throw new CourseRequestError('Discounted price cannot exceed the regular price.', 400)
    }
    if (thumbnailUrl) {
      try {
        const url = new URL(thumbnailUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol')
      } catch {
        throw new CourseRequestError('Thumbnail must be a valid HTTP or HTTPS URL.', 400)
      }
    }
    if (status !== 'draft' && status !== 'published') {
      throw new CourseRequestError('Course status must be draft or published.', 400)
    }

    return {
      title,
      slug,
      description,
      category,
      level: level as CourseLevel,
      target_audience: targetAudience,
      price,
      discounted_price: discountedPrice,
      total_lessons: totalLessons,
      thumbnail_url: thumbnailUrl,
      status,
    }
  }

  private parseMoney(value: unknown, field: string, optional: false): number
  private parseMoney(value: unknown, field: string, optional: true): number | null
  private parseMoney(value: unknown, field: string, optional: boolean): number | null {
    if (optional && (value === null || value === undefined || value === '')) return null
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 99_999_999) {
      throw new CourseRequestError(`${field} must be a non-negative number.`, 400)
    }
    if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) {
      throw new CourseRequestError(`${field} may have at most two decimal places.`, 400)
    }
    return value
  }

  private async findSelectedCourses(uniqueIds: string[]): Promise<SelectedCourses> {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new CourseRequestError('The course catalog is not configured.', 503)
    }

    const coursesById = new Map(
      (await this.repository.findPublishedByIds(uniqueIds)).map((course) => [course.id, course])
    )
    const courses = uniqueIds
      .map((id) => coursesById.get(id))
      .filter((course): course is Course => course !== undefined)
    const foundIds = new Set(courses.map((course) => course.id))

    return {
      courses,
      missingIds: uniqueIds.filter((id) => !foundIds.has(id)),
    }
  }
}

export const courseService = new CourseService()
