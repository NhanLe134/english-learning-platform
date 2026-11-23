import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.js'
import { env } from '../src/config/env.js'
import { authService } from '../src/modules/auth/auth.service.js'
import { courseRepository } from '../src/modules/courses/course.repository.js'
import { CourseRequestError, courseService } from '../src/modules/courses/course.service.js'
import type { Course, CourseCatalogEntry, EnrolledCourseItem } from '../src/modules/courses/course.types.js'

const firstCourseId = 'c0a80101-0000-4000-8000-000000000001'
const secondCourseId = 'c0a80101-0000-4000-8000-000000000002'
const unavailableCourseId = 'c0a80101-0000-4000-8000-000000000003'

describe('course selection API', () => {
  let server: Server
  let baseUrl: string
  let originalFindPublishedByIds: typeof courseRepository.findPublishedByIds
  let originalFindPublishedCourses: typeof courseRepository.findPublishedCourses
  let originalFindPublishedCourse: typeof courseRepository.findPublishedCourse
  let originalHasStudentCourseAccess: typeof courseRepository.hasStudentCourseAccess
  let originalGetEnrolledCourses: typeof courseService.getEnrolledCourses
  let originalAuthenticateAccessToken: typeof authService.authenticateAccessToken
  const originalSupabaseConfig = {
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
  }

  before(async () => {
    Object.assign(env, {
      supabaseUrl: 'https://courses.example.test',
      supabaseServiceRoleKey: 'course-api-test-key',
    })
    originalFindPublishedByIds = courseRepository.findPublishedByIds
    originalFindPublishedCourses = courseRepository.findPublishedCourses
    originalFindPublishedCourse = courseRepository.findPublishedCourse
    originalHasStudentCourseAccess = courseRepository.hasStudentCourseAccess
    originalGetEnrolledCourses = courseService.getEnrolledCourses
    originalAuthenticateAccessToken = authService.authenticateAccessToken
    authService.authenticateAccessToken = async () => ({
      id: 'd9101527-381f-45cb-8c6e-ea724eeb34a4',
      email: 'student@example.test',
      full_name: 'Test Student',
      role: 'STUDENT',
      status: 'active',
      is_verified: true,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    })
    courseRepository.findPublishedByIds = async (ids) => {
      const courses: Course[] = [
        {
          id: firstCourseId,
          title: 'Tiếng Anh giao tiếp',
          description: 'Khóa học giao tiếp',
          thumbnail_url: 'https://example.test/course.png',
          status: 'published',
          teacher: {
            id: 'c0a80101-0000-4000-8000-000000000010',
            full_name: 'Nguyễn An',
            avatar_url: null,
          },
        },
        {
          id: secondCourseId,
          title: 'Ngữ pháp nền tảng',
          description: null,
          thumbnail_url: null,
          status: 'published',
          teacher: null,
        },
      ]
      return courses.filter((course) => ids.includes(course.id))
    }
    const catalogCourse: CourseCatalogEntry = {
      id: firstCourseId,
      title: 'Tiếng Anh giao tiếp',
      slug: 'tieng-anh-giao-tiep',
      description: 'Khóa học giao tiếp',
      category: 'Giao tiếp',
      level: 'beginner',
      target_audience: 'Người mới bắt đầu',
      price: 2_000_000,
      discounted_price: 1_500_000,
      total_lessons: 12,
      thumbnail_url: 'https://example.test/course.png',
      teacher: { id: 'c0a80101-0000-4000-8000-000000000010', full_name: 'Nguyễn An', avatar_url: null },
      topics: [{
        id: 'c0a80101-0000-4000-8000-000000000020',
        title: 'Chào hỏi',
        description: 'Giao tiếp cơ bản',
        sort_order: 0,
        lessons: [{
          id: 'c0a80101-0000-4000-8000-000000000030',
          title: 'Giới thiệu bản thân',
          description: null,
          duration_seconds: 180,
          thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          sort_order: 0,
        }],
      }],
      created_at: '2026-11-03T00:00:00.000Z',
      updated_at: '2026-11-03T00:00:00.000Z',
    }
    courseRepository.findPublishedCourses = async () => [catalogCourse]
    courseRepository.findPublishedCourse = async (identifier, isId) =>
      (isId ? identifier === firstCourseId : identifier === catalogCourse.slug) ? catalogCourse : null
    courseRepository.hasStudentCourseAccess = async () => false
    courseService.getEnrolledCourses = async () => []

    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    courseRepository.findPublishedByIds = originalFindPublishedByIds
    courseRepository.findPublishedCourses = originalFindPublishedCourses
    courseRepository.findPublishedCourse = originalFindPublishedCourse
    courseRepository.hasStudentCourseAccess = originalHasStudentCourseAccess
    courseService.getEnrolledCourses = originalGetEnrolledCourses
    authService.authenticateAccessToken = originalAuthenticateAccessToken
    Object.assign(env, originalSupabaseConfig)
    server.close()
    await once(server, 'close')
  })

  it('returns paid enrollments for the authenticated student and reports API failures', async () => {
    const paidEnrollment: EnrolledCourseItem = {
      id: firstCourseId,
      course_id: firstCourseId,
      title: 'Paid course',
      slug: 'paid-course',
      category: 'English',
      level: 'beginner',
      thumbnail_url: null,
      total_lessons: 12,
      completed_lessons: 0,
      progress_percent: 0,
      status: 'in_progress',
      enrolled_at: '2026-11-20T00:00:00.000Z',
      last_active: null,
      teacher: null,
    }
    courseService.getEnrolledCourses = async (studentId) => {
      assert.equal(studentId, 'd9101527-381f-45cb-8c6e-ea724eeb34a4')
      return [paidEnrollment]
    }

    const response = await fetch(`${baseUrl}/api/courses/my-courses`, {
      headers: { Authorization: 'Bearer student-token' },
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { success: true, data: [paidEnrollment] })

    courseService.getEnrolledCourses = async () => {
      throw new CourseRequestError('Unable to load paid enrollments.', 503)
    }
    const failedResponse = await fetch(`${baseUrl}/api/courses/my-courses`, {
      headers: { Authorization: 'Bearer student-token' },
    })
    assert.equal(failedResponse.status, 503)
    assert.deepEqual(await failedResponse.json(), {
      success: false,
      message: 'Unable to load paid enrollments.',
    })
  })

  it('returns selected course details in the requested order', async () => {
    const response = await fetch(
      `${baseUrl}/api/courses?ids=${secondCourseId},${firstCourseId}`
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      success: true,
      data: [
        {
          id: secondCourseId,
          title: 'Ngữ pháp nền tảng',
          description: null,
          thumbnail_url: null,
          status: 'published',
          teacher: null,
        },
        {
          id: firstCourseId,
          title: 'Tiếng Anh giao tiếp',
          description: 'Khóa học giao tiếp',
          thumbnail_url: 'https://example.test/course.png',
          status: 'published',
          teacher: {
            id: 'c0a80101-0000-4000-8000-000000000010',
            full_name: 'Nguyễn An',
            avatar_url: null,
          },
        },
      ],
    })
  })

  it('lists published catalog entries with dynamic pricing and curriculum', async () => {
    const response = await fetch(`${baseUrl}/api/courses/catalog`)
    assert.equal(response.status, 200)
    const result = await response.json() as { success: boolean; data: CourseCatalogEntry[] }
    assert.equal(result.success, true)
    assert.equal(result.data[0]?.slug, 'tieng-anh-giao-tiep')
    assert.equal(result.data[0]?.discounted_price, 1_500_000)
    assert.deepEqual(result.data[0]?.topics[0]?.lessons, [])
  })

  it('retrieves a published course by slug or ID and returns 404 for unknown courses', async () => {
    const bySlug = await fetch(`${baseUrl}/api/courses/tieng-anh-giao-tiep`)
    assert.equal(bySlug.status, 200)
    const publicCourse = (await bySlug.json() as { data: CourseCatalogEntry }).data
    assert.equal(publicCourse.id, firstCourseId)
    assert.equal(publicCourse.topics[0]?.lessons[0]?.title, 'Giới thiệu bản thân')
    assert.equal(
      publicCourse.topics[0]?.lessons[0]?.thumbnail_url,
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    )
    assert.equal('video_url' in (publicCourse.topics[0]?.lessons[0] ?? {}), false)

    const byId = await fetch(`${baseUrl}/api/courses/${firstCourseId}`)
    assert.equal(byId.status, 200)

    const missing = await fetch(`${baseUrl}/api/courses/unknown-course`)
    assert.equal(missing.status, 404)
  })

  it('returns published curriculum lesson outline for courses', async () => {
    const unpaidResponse = await fetch(`${baseUrl}/api/courses/tieng-anh-giao-tiep`, {
      headers: { Authorization: 'Bearer student-token' },
    })
    assert.equal(unpaidResponse.status, 200)
    const unpaidCourse = (await unpaidResponse.json() as { data: CourseCatalogEntry }).data
    assert.equal(unpaidCourse.topics[0]?.lessons[0]?.title, 'Giới thiệu bản thân')

    courseRepository.hasStudentCourseAccess = async (studentId, courseId) => {
      assert.equal(studentId, 'd9101527-381f-45cb-8c6e-ea724eeb34a4')
      assert.equal(courseId, firstCourseId)
      return true
    }

    const response = await fetch(`${baseUrl}/api/courses/tieng-anh-giao-tiep`, {
      headers: { Authorization: 'Bearer student-token' },
    })
    assert.equal(response.status, 200)
    const course = (await response.json() as { data: CourseCatalogEntry }).data
    assert.equal(course.topics[0]?.lessons[0]?.title, 'Giới thiệu bản thân')
  })

  it('rejects missing and malformed ID lists', async () => {
    const missingIdsParameter = await fetch(`${baseUrl}/api/courses`)
    assert.equal(missingIdsParameter.status, 400)

    const malformedId = await fetch(`${baseUrl}/api/courses?ids=not-a-uuid`)
    assert.equal(malformedId.status, 400)
  })

  it('returns the IDs of courses that are missing or not published', async () => {
    const response = await fetch(
      `${baseUrl}/api/courses?ids=${firstCourseId},${unavailableCourseId}`
    )

    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'One or more selected courses are unavailable.',
      missingIds: [unavailableCourseId],
    })
  })

  it('validates registration course IDs against the same published catalog', async () => {
    const result = await courseService.validateSelectedCourseIds([
      secondCourseId,
      firstCourseId,
      secondCourseId,
    ])

    assert.deepEqual(result, {
      courseIds: [secondCourseId, firstCourseId],
      missingIds: [],
    })

    await assert.rejects(
      () => courseService.validateSelectedCourseIds(['not-a-uuid']),
      (error: unknown) => error instanceof CourseRequestError && error.statusCode === 400
    )
    assert.deepEqual(
      await courseService.validateSelectedCourseIds([unavailableCourseId]),
      { courseIds: [unavailableCourseId], missingIds: [unavailableCourseId] }
    )
  })
})
