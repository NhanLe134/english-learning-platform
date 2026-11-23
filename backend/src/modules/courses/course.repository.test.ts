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
        order: () => query,
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

  it('calculates overall course progress from current lesson progress including partial progress, topicless lessons, and decreases when a lesson is reset to 0%', async () => {
    const courseId = 'c0a80101-0000-4000-8000-000000000001'
    const studentId = 'd9101527-381f-45cb-8c6e-ea724eeb34a4'
    const publishedLessons = [
      { id: 'lesson-1', course_id: courseId },
      { id: 'lesson-2', course_id: courseId },
      { id: 'lesson-3', course_id: courseId },
      { id: 'lesson-4', course_id: courseId },
    ]
    const baseResponses = {
      course_enrollments: {
        data: [{ course_id: courseId, status: 'active', enrolled_at: '2026-11-20T00:00:00.000Z' }],
        error: null,
      },
      course_orders: { data: [], error: null },
      courses: {
        data: [{
          id: courseId,
          title: 'Grammar Mastery',
          slug: 'grammar-mastery',
          category: 'English',
          level: 'beginner',
          total_lessons: 4,
          thumbnail_url: null,
          teacher: null,
        }],
        error: null,
      },
      lessons: { data: publishedLessons, error: null },
    }

    // Lesson 1: 100%, Lesson 2: 80%, Lesson 3: 0%, Lesson 4: 0% => 45%
    const repoBeforeReset = new CourseRepository(() => makeClient({
      ...baseResponses,
      lesson_progress: {
        data: [
          { lesson_id: 'lesson-1', progress_percent: 100, is_completed: true },
          { lesson_id: 'lesson-2', progress_percent: 80, is_completed: false },
        ],
        error: null,
      },
    }))

    const beforeReset = await repoBeforeReset.findEnrolledCourses(studentId)
    assert.equal(beforeReset[0]?.total_lessons, 4)
    assert.equal(beforeReset[0]?.completed_lessons, 1)
    assert.equal(beforeReset[0]?.progress_percent, 45)
    assert.equal(beforeReset[0]?.status, 'in_progress')

    // After relearning Lesson 1 (reset to 0%): Lesson 1: 0%, Lesson 2: 80%, Lesson 3: 0%, Lesson 4: 0% => 20%
    const repoAfterReset = new CourseRepository(() => makeClient({
      ...baseResponses,
      lesson_progress: {
        data: [
          { lesson_id: 'lesson-1', progress_percent: 0, is_completed: false },
          { lesson_id: 'lesson-2', progress_percent: 80, is_completed: false },
        ],
        error: null,
      },
    }))

    const afterReset = await repoAfterReset.findEnrolledCourses(studentId)
    assert.equal(afterReset[0]?.total_lessons, 4)
    assert.equal(afterReset[0]?.completed_lessons, 0)
    assert.equal(afterReset[0]?.progress_percent, 20)
    assert.equal(afterReset[0]?.status, 'in_progress')
  })

  it('returns 0% for courses with no progress and calculates accurate percentages across multiple enrolled courses', async () => {
    const courseZero = 'c0a80101-0000-4000-8000-000000000010'
    const coursePartial = 'c0a80101-0000-4000-8000-000000000011'
    const courseDone = 'c0a80101-0000-4000-8000-000000000012'
    const studentId = 'd9101527-381f-45cb-8c6e-ea724eeb34a4'

    const repository = new CourseRepository(() => makeClient({
      course_enrollments: {
        data: [
          { course_id: courseZero, status: 'active', enrolled_at: '2026-11-20T00:00:00.000Z' },
          { course_id: coursePartial, status: 'active', enrolled_at: '2026-11-20T00:00:00.000Z' },
          { course_id: courseDone, status: 'active', enrolled_at: '2026-11-20T00:00:00.000Z' },
        ],
        error: null,
      },
      course_orders: { data: [], error: null },
      courses: {
        data: [
          { id: courseZero, title: 'Zero Course', slug: 'zero-course', category: 'English', level: 'beginner', total_lessons: 2, thumbnail_url: null, teacher: null },
          { id: coursePartial, title: 'Partial Course', slug: 'partial-course', category: 'English', level: 'intermediate', total_lessons: 3, thumbnail_url: null, teacher: null },
          { id: courseDone, title: 'Done Course', slug: 'done-course', category: 'English', level: 'advanced', total_lessons: 2, thumbnail_url: null, teacher: null },
        ],
        error: null,
      },
      lessons: {
        data: [
          { id: 'z-1', course_id: courseZero },
          { id: 'z-2', course_id: courseZero },
          { id: 'p-1', course_id: coursePartial },
          { id: 'p-2', course_id: coursePartial },
          { id: 'p-3', course_id: coursePartial },
          { id: 'd-1', course_id: courseDone },
          { id: 'd-2', course_id: courseDone },
        ],
        error: null,
      },
      lesson_progress: {
        data: [
          { lesson_id: 'p-1', progress_percent: 100, is_completed: true },
          { lesson_id: 'p-2', progress_percent: 50, is_completed: false },
          { lesson_id: 'd-1', progress_percent: 100, is_completed: true },
          { lesson_id: 'd-2', progress_percent: 100, is_completed: true },
        ],
        error: null,
      },
    }))

    const result = await repository.findEnrolledCourses(studentId)
    const byId = new Map(result.map((item) => [item.course_id, item]))

    assert.equal(byId.get(courseZero)?.total_lessons, 2)
    assert.equal(byId.get(courseZero)?.completed_lessons, 0)
    assert.equal(byId.get(courseZero)?.progress_percent, 0)
    assert.equal(byId.get(courseZero)?.status, 'in_progress')

    // (100 + 50 + 0) / 3 = 50%
    assert.equal(byId.get(coursePartial)?.total_lessons, 3)
    assert.equal(byId.get(coursePartial)?.completed_lessons, 1)
    assert.equal(byId.get(coursePartial)?.progress_percent, 50)
    assert.equal(byId.get(coursePartial)?.status, 'in_progress')

    // (100 + 100) / 2 = 100%
    assert.equal(byId.get(courseDone)?.total_lessons, 2)
    assert.equal(byId.get(courseDone)?.completed_lessons, 2)
    assert.equal(byId.get(courseDone)?.progress_percent, 100)
    assert.equal(byId.get(courseDone)?.status, 'completed')
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

describe('CourseRepository.findPublishedCourse', () => {
  it('returns grouped topics and topicless published lessons in sort_order without exposing video_url', async () => {
    const courseId = 'c0a80101-0000-4000-8000-000000000099'
    const topic1Id = 'c0a80101-0000-4000-8000-000000000101'
    const topic2Id = 'c0a80101-0000-4000-8000-000000000102'
    const emptyTopicId = 'c0a80101-0000-4000-8000-000000000103'

    const repository = new CourseRepository(() => makeClient({
      courses: {
        data: {
          id: courseId,
          title: 'Public English Course',
          slug: 'public-english-course',
          description: 'Course description',
          category: 'IELTS',
          level: 'beginner',
          target_audience: 'Beginners',
          price: 1_500_000,
          discounted_price: 990_000,
          total_lessons: 0,
          thumbnail_url: null,
          created_at: '2026-11-20T00:00:00.000Z',
          updated_at: '2026-11-20T00:00:00.000Z',
          teacher: { id: 'teacher-1', full_name: 'Ms. Lan', avatar_url: null },
        },
        error: null,
      },
      topics: {
        data: [
          { id: topic2Id, title: 'Topic 2', description: 'Second', sort_order: 2 },
          { id: topic1Id, title: 'Topic 1', description: 'First', sort_order: 1 },
          { id: emptyTopicId, title: 'Empty Topic', description: null, sort_order: 3 },
        ],
        error: null,
      },
      lessons: {
        data: [
          { id: 'l-2', topic_id: topic1Id, title: 'Lesson 1.2', description: 'Desc', duration_seconds: 300, sort_order: 2, video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { id: 'l-1', topic_id: topic1Id, title: 'Lesson 1.1', description: null, duration_seconds: 180, sort_order: 1, video_url: 'https://youtu.be/9bZkp7q19f0' },
          { id: 'l-3', topic_id: topic2Id, title: 'Lesson 2.1', description: null, duration_seconds: 240, sort_order: 1, video_url: 'https://drive.google.com/file/d/secret3/view' },
          { id: 'l-4', topic_id: null, title: 'Standalone Lesson', description: 'No topic', duration_seconds: 420, sort_order: 1, video_url: 'https://www.youtube.com/shorts/3JZ_D3ELwOQ' },
        ],
        error: null,
      },
    }))

    const course = await repository.findPublishedCourse('public-english-course', false)
    assert.ok(course)
    assert.equal(course.total_lessons, 4)
    assert.equal(course.topics.length, 3)

    // Topics sorted by sort_order, empty topic filtered out
    assert.equal(course.topics[0]?.title, 'Topic 1')
    assert.deepEqual(course.topics[0]?.lessons.map((l) => l.title), ['Lesson 1.1', 'Lesson 1.2'])
    assert.equal(course.topics[0]?.lessons[0]?.thumbnail_url, 'https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg')
    assert.equal(course.topics[0]?.lessons[1]?.thumbnail_url, 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    assert.equal(course.topics[1]?.title, 'Topic 2')
    assert.deepEqual(course.topics[1]?.lessons.map((l) => l.title), ['Lesson 2.1'])
    assert.equal(course.topics[1]?.lessons[0]?.thumbnail_url, null)

    // Topicless published lessons are included at the end with their YouTube thumbnail
    assert.equal(course.topics[2]?.title, 'Bài giảng')
    assert.deepEqual(course.topics[2]?.lessons.map((l) => l.title), ['Standalone Lesson'])
    assert.equal(course.topics[2]?.lessons[0]?.thumbnail_url, 'https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg')

    // Never expose video_url, video_token, or materials in public outline
    for (const topic of course.topics) {
      for (const lesson of topic.lessons) {
        assert.equal('video_url' in lesson, false)
        assert.equal('video_token' in lesson, false)
        assert.equal('materials' in lesson, false)
      }
    }
  })
})
