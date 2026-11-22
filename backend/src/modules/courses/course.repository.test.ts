import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSupabaseClient } from '../../config/supabase.js'
import { CourseRepository } from './course.repository.js'

function makeClient(responses: Record<string, { data: unknown; error: unknown }>): ReturnType<typeof createSupabaseClient> {
  const client = {
    from(table: string) {
      const result = responses[table] ?? { data: [], error: null }
      const query = {
        select: () => query,
        eq: () => query,
        gt: () => query,
        in: () => query,
        limit: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      }
      return query
    },
  }
  return client as unknown as ReturnType<typeof createSupabaseClient>
}

describe('CourseRepository.findEnrolledCourses', () => {
  it('includes a paid order even when no enrollment row exists', async () => {
    const courseId = 'c0a80101-0000-4000-8000-000000000001'
    const repository = new CourseRepository(() => makeClient({
      course_enrollments: { data: [], error: null },
      course_orders: {
        data: [{ course_id: courseId, status: 'paid', amount: 1000, currency: 'VND', paid_at: '2026-11-20T00:00:00.000Z' }],
        error: null,
      },
      auth_registration_details: { data: null, error: null },
      courses: {
        data: [{
          id: courseId,
          title: 'Paid course',
          slug: 'paid-course',
          category: 'English',
          level: 'beginner',
          total_lessons: 10,
          thumbnail_url: null,
          teacher: null,
        }],
        error: null,
      },
    }))

    const result = await repository.findEnrolledCourses('d9101527-381f-45cb-8c6e-ea724eeb34a4')
    assert.equal(result.length, 1)
    assert.equal(result[0]?.course_id, courseId)
    assert.equal(result[0]?.slug, 'paid-course')
    assert.equal(result[0]?.status, 'in_progress')
  })

  it('does not grant My Courses access from registration-selected courses without a payment or enrollment', async () => {
    const repository = new CourseRepository(() => makeClient({
      course_enrollments: { data: [], error: null },
      course_orders: { data: [], error: null },
      auth_registration_details: {
        data: { selected_course_ids: ['c0a80101-0000-4000-8000-000000000001'] },
        error: null,
      },
    }))

    const result = await repository.findEnrolledCourses('d9101527-381f-45cb-8c6e-ea724eeb34a4')
    assert.deepEqual(result, [])
  })

  it('propagates enrollment and paid-order database errors instead of returning an empty list', async () => {
    const databaseError = { code: '42501', message: 'permission denied' }
    for (const failedTable of ['course_enrollments', 'course_orders']) {
      const repository = new CourseRepository(() => makeClient({
        course_enrollments: {
          data: failedTable === 'course_enrollments' ? null : [],
          error: failedTable === 'course_enrollments' ? databaseError : null,
        },
        course_orders: {
          data: failedTable === 'course_orders' ? null : [],
          error: failedTable === 'course_orders' ? databaseError : null,
        },
      }))

      await assert.rejects(
        () => repository.findEnrolledCourses('d9101527-381f-45cb-8c6e-ea724eeb34a4'),
        /Unable to load enrolled courses/
      )
    }
  })
})

describe('CourseRepository.hasStudentCourseAccess', () => {
  it('accepts a valid enrollment or paid VND order and rejects unpaid accounts', async () => {
    const studentId = 'd9101527-381f-45cb-8c6e-ea724eeb34a4'
    const courseId = 'c0a80101-0000-4000-8000-000000000001'
    const enrolled = new CourseRepository(() => makeClient({
      course_enrollments: { data: { id: 'enrollment-1' }, error: null },
      course_orders: { data: null, error: null },
    }))
    const paid = new CourseRepository(() => makeClient({
      course_enrollments: { data: null, error: null },
      course_orders: { data: { id: 'order-1' }, error: null },
    }))
    const unpaid = new CourseRepository(() => makeClient({
      course_enrollments: { data: null, error: null },
      course_orders: { data: null, error: null },
    }))

    assert.equal(await enrolled.hasStudentCourseAccess(studentId, courseId), true)
    assert.equal(await paid.hasStudentCourseAccess(studentId, courseId), true)
    assert.equal(await unpaid.hasStudentCourseAccess(studentId, courseId), false)
  })
})
