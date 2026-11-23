import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSupabaseClient } from '../../config/supabase.js'
import { LessonsRepository } from './lessons.repository.js'
import { LessonsService } from './lessons.service.js'
import type { AuthenticatedUser } from './lessons.types.js'

interface EnrollmentRow {
  id: string
  course_id: string
  student_id: string
  status: string
}

interface FilterState {
  eq: Record<string, unknown>
  in: Record<string, unknown[]>
}

function makeSupabaseMock(params: {
  courses?: Array<{ id: string; slug: string; title: string; teacher_id: string }>
  enrollments?: EnrollmentRow[]
  topics?: Array<{ id: string; course_id: string; title: string; description: string | null; sort_order: number }>
  lessons?: Array<{
    id: string
    topic_id: string | null
    course_id: string
    title: string
    description: string | null
    video_url: string
    duration_seconds: number | null
    sort_order: number
    status: string
  }>
  materials?: Array<{
    id: string
    lesson_id: string
    file_name: string
    file_url: string
    file_type: string
    status: string
  }>
  progress?: Array<{
    lesson_id: string
    student_id: string
    last_position_seconds: number
    progress_percent: number
    is_completed: boolean
  }>
}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    courses: (params.courses ?? []) as unknown as Array<Record<string, unknown>>,
    course_enrollments: (params.enrollments ?? []) as unknown as Array<Record<string, unknown>>,
    topics: (params.topics ?? []) as unknown as Array<Record<string, unknown>>,
    lessons: (params.lessons ?? []) as unknown as Array<Record<string, unknown>>,
    lesson_materials: (params.materials ?? []) as unknown as Array<Record<string, unknown>>,
    lesson_progress: (params.progress ?? []) as unknown as Array<Record<string, unknown>>,
  }

  let writeCount = 0

  const client = {
    from(table: string) {
      const filters: FilterState = { eq: {}, in: {} }
      const execute = () => {
        const rows = (tables[table] ?? []).filter((row) => {
          for (const [k, v] of Object.entries(filters.eq)) {
            if (row[k] !== v) return false
          }
          for (const [k, vals] of Object.entries(filters.in)) {
            if (!vals.includes(row[k])) return false
          }
          return true
        })
        return rows
      }

      const query = {
        select: () => query,
        eq: (col: string, val: unknown) => {
          filters.eq[col] = val
          return query
        },
        in: (col: string, vals: unknown[]) => {
          filters.in[col] = vals
          return query
        },
        order: () => query,
        limit: () => query,
        update: () => {
          writeCount++
          return query
        },
        upsert: () => {
          writeCount++
          return query
        },
        maybeSingle: async () => {
          const rows = execute()
          return { data: rows[0] ?? null, error: null }
        },
        then: (
          resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
          reject: (reason: unknown) => unknown
        ) => Promise.resolve({ data: execute(), error: null }).then(resolve, reject),
      }
      return query
    },
  }

  return {
    client: client as unknown as ReturnType<typeof createSupabaseClient>,
    getWriteCount: () => writeCount,
  }
}

describe('LessonsRepository.findCourseAccess – Student enrollment status authorization', () => {
  const courseId = 'c0a80101-0000-4000-8000-000000000001'
  const topicId = 'd0a80101-0000-4000-8000-000000000001'
  const lessonId = 'e0a80101-0000-4000-8000-000000000001'
  const student: AuthenticatedUser = { id: 's0a80101-0000-4000-8000-000000000001', role: 'STUDENT' }

  const baseCourse = {
    id: courseId,
    slug: 'ielts-mastery',
    title: 'IELTS Mastery',
    teacher_id: 't-1',
  }

  it('allows a student with active enrollment to access the course', async () => {
    const { client } = makeSupabaseMock({
      courses: [baseCourse],
      enrollments: [{ id: 'enr-1', course_id: courseId, student_id: student.id, status: 'active' }],
    })
    const repo = new LessonsRepository(() => client)

    const access = await repo.findCourseAccess(courseId, student)
    assert.equal(access.exists, true)
    assert.equal(access.allowed, true)
    assert.equal(access.courseId, courseId)
  })

  it('allows a student with completed enrollment to reopen and review the course without modifying enrollment status or progress', async () => {
    const enrollments: EnrollmentRow[] = [
      { id: 'enr-2', course_id: courseId, student_id: student.id, status: 'completed' },
    ]
    const progress = [
      {
        lesson_id: lessonId,
        student_id: student.id,
        last_position_seconds: 600,
        progress_percent: 100,
        is_completed: true,
      },
    ]
    const { client, getWriteCount } = makeSupabaseMock({
      courses: [baseCourse],
      enrollments,
      topics: [{ id: topicId, course_id: courseId, title: 'Chương 1', description: null, sort_order: 1 }],
      lessons: [
        {
          id: lessonId,
          topic_id: topicId,
          course_id: courseId,
          title: 'Bài 1: Phát âm chuẩn',
          description: 'Ôn tập phát âm',
          video_url: 'https://www.youtube.com/watch?v=completed123',
          duration_seconds: 600,
          sort_order: 1,
          status: 'published',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          lesson_id: lessonId,
          file_name: 'Workbook.pdf',
          file_url: 'https://example.com/workbook.pdf',
          file_type: 'pdf',
          status: 'published',
        },
      ],
      progress,
    })

    const repo = new LessonsRepository(() => client)
    const service = new LessonsService(repo)

    // Reopen curriculum
    const topics = await service.getTopicsForCourse('ielts-mastery', student)
    assert.equal(topics.length, 1)
    assert.equal(topics[0]!.lessons.length, 1)
    const lesson = topics[0]!.lessons[0]!
    assert.equal(lesson.id, lessonId)
    assert.ok(lesson.video_token)
    assert.equal(lesson.materials?.length, 1)
    assert.equal(lesson.materials?.[0]?.name, 'Workbook.pdf')
    assert.equal(lesson.progress?.progress_percent, 100)
    assert.equal(lesson.progress?.is_completed, true)

    // Open individual lesson
    const detail = await service.getLesson(lessonId, student)
    assert.equal(detail.id, lessonId)
    assert.ok(detail.video_token)
    assert.equal(detail.materials?.length, 1)
    assert.equal(detail.progress?.progress_percent, 100)
    assert.equal(detail.progress?.is_completed, true)

    // Enrollment status and progress remain untouched (no writes performed on revisit)
    assert.equal(getWriteCount(), 0)
    assert.equal(enrollments[0]!.status, 'completed')
    assert.equal(progress[0]!.progress_percent, 100)
    assert.equal(progress[0]!.is_completed, true)
  })

  it('blocks a student with cancelled or expired enrollment from accessing protected content', async () => {
    for (const status of ['cancelled', 'expired']) {
      const { client } = makeSupabaseMock({
        courses: [baseCourse],
        enrollments: [{ id: `enr-${status}`, course_id: courseId, student_id: student.id, status }],
      })
      const repo = new LessonsRepository(() => client)

      const access = await repo.findCourseAccess(courseId, student)
      assert.equal(access.exists, true)
      assert.equal(access.allowed, false)
    }
  })

  it('blocks a student without any enrollment from accessing protected content', async () => {
    const { client } = makeSupabaseMock({
      courses: [baseCourse],
      enrollments: [],
    })
    const repo = new LessonsRepository(() => client)

    const access = await repo.findCourseAccess(courseId, student)
    assert.equal(access.exists, true)
    assert.equal(access.allowed, false)
  })
})
