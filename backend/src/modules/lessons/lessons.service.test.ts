import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LessonsService } from './lessons.service.js'
import { LessonsRepository } from './lessons.repository.js'
import { LessonRequestError } from './lessons.errors.js'
import type { AuthenticatedUser, LessonItem, LessonProgressItem, LessonTopic } from './lessons.types.js'

class FakeLessonsRepository extends LessonsRepository {
  public mockCourses = new Map<string, { id: string; title: string; teacher_id: string }>()
  public mockEnrollments = new Set<string>() // format: `${courseId}:${studentId}`
  public mockTeachers = new Set<string>() // format: `${courseId}:${teacherId}`
  public mockTopics: LessonTopic[] = []
  public mockLessons: LessonItem[] = []
  public mockProgress = new Map<string, LessonProgressItem>()
  public updatedDurations = new Map<string, number>()

  override async findCourseAccess(
    courseIdentifier: string,
    user: AuthenticatedUser
  ): Promise<{ exists: boolean; allowed: boolean; courseId: string; courseTitle: string }> {
    const course = this.mockCourses.get(courseIdentifier)
    if (!course) return { exists: false, allowed: false, courseId: '', courseTitle: '' }

    if (user.role === 'ADMIN') {
      return { exists: true, allowed: true, courseId: course.id, courseTitle: course.title }
    }
    if (user.role === 'TEACHER') {
      const allowed = course.teacher_id === user.id || this.mockTeachers.has(`${course.id}:${user.id}`)
      return { exists: true, allowed, courseId: course.id, courseTitle: course.title }
    }
    if (user.role === 'STUDENT') {
      const allowed = this.mockEnrollments.has(`${course.id}:${user.id}`)
      return { exists: true, allowed, courseId: course.id, courseTitle: course.title }
    }
    return { exists: true, allowed: false, courseId: course.id, courseTitle: course.title }
  }

  override async findTopicsWithLessons(
    courseId: string,
    publishedOnly = false,
    studentId?: string
  ): Promise<LessonTopic[]> {
    return this.mockTopics
      .filter((t) => t.course_id === courseId)
      .map((topic) => ({
        ...topic,
        lessons: this.mockLessons
          .filter((l) => l.topic_id === topic.id)
          .filter((l) => !publishedOnly || l.status === 'published')
          .map((l) => ({
            ...l,
            progress: studentId ? this.mockProgress.get(`${l.id}:${studentId}`) : undefined,
          })),
      }))
  }

  override async findLessonProgress(
    lessonId: string,
    studentId: string
  ): Promise<LessonProgressItem | null> {
    return this.mockProgress.get(`${lessonId}:${studentId}`) ?? null
  }

  override async updateLessonDuration(lessonId: string, durationSeconds: number): Promise<void> {
    if (durationSeconds <= 0) return
    this.updatedDurations.set(lessonId, Math.round(durationSeconds))
    const target = this.mockLessons.find((l) => l.id === lessonId)
    if (target) {
      target.duration_seconds = Math.round(durationSeconds)
    }
  }

  override async upsertLessonProgress(payload: {
    lesson_id: string
    student_id: string
    last_position_seconds: number
    progress_percent: number
    is_completed: boolean
  }) {
    const key = `${payload.lesson_id}:${payload.student_id}`
    const record: LessonProgressItem = {
      lesson_id: payload.lesson_id,
      student_id: payload.student_id,
      last_position_seconds: payload.last_position_seconds,
      progress_percent: payload.progress_percent,
      is_completed: payload.is_completed,
    }
    this.mockProgress.set(key, record)
    return record
  }

  override async findLessonWithCourse(
    lessonId: string,
    studentId?: string
  ): Promise<{ lesson: LessonItem; courseId: string } | null> {
    const lesson = this.mockLessons.find((l) => l.id === lessonId)
    if (!lesson) return null
    const topic = this.mockTopics.find((t) => t.id === lesson.topic_id)
    if (!topic) return null
    return {
      lesson: {
        ...lesson,
        progress: studentId ? this.mockProgress.get(`${lesson.id}:${studentId}`) : undefined,
      },
      courseId: topic.course_id,
    }
  }
}

describe('LessonsService - Student access & lesson retrieval', () => {
  const courseId = 'c0a80101-0000-4000-8000-000000000001'
  const topicId = 'd0a80101-0000-4000-8000-000000000001'
  const publishedLessonId = 'e0a80101-0000-4000-8000-000000000001'
  const draftLessonId = 'e0a80101-0000-4000-8000-000000000002'

  const enrolledStudent: AuthenticatedUser = { id: 's0a80101-0000-4000-8000-000000000001', role: 'STUDENT' }
  const unenrolledStudent: AuthenticatedUser = { id: 's0a80101-0000-4000-8000-000000000002', role: 'STUDENT' }
  const adminUser: AuthenticatedUser = { id: 'a0a80101-0000-4000-8000-000000000001', role: 'ADMIN' }

  function setup() {
    const repo = new FakeLessonsRepository()
    repo.mockCourses.set(courseId, { id: courseId, title: 'English Masterclass', teacher_id: 't-1' })
    repo.mockCourses.set('english-masterclass', { id: courseId, title: 'English Masterclass', teacher_id: 't-1' })
    repo.mockEnrollments.add(`${courseId}:${enrolledStudent.id}`)

    repo.mockTopics = [
      {
        id: topicId,
        course_id: courseId,
        title: 'Chương 1: Khởi động',
        description: 'Tổng quan bài học',
        sort_order: 1,
        lessons: [],
      },
    ]

    repo.mockLessons = [
      {
        id: publishedLessonId,
        topic_id: topicId,
        title: 'Bài 1: Phát âm cơ bản',
        description: 'Nắm vững 44 âm IPA',
        video_url: 'https://www.youtube.com/watch?v=sample123',
        duration_seconds: 900,
        sort_order: 1,
        status: 'published',
        materials: [{ id: 'm-1', name: 'Slide bài giảng.pdf', file_url: 'https://example.com/slide.pdf', file_type: 'pdf' }],
      },
      {
        id: draftLessonId,
        topic_id: topicId,
        title: 'Bài 2: Bản nháp chưa công bố',
        description: 'Đang soạn',
        video_url: 'https://www.youtube.com/watch?v=draft123',
        duration_seconds: 600,
        sort_order: 2,
        status: 'draft',
      },
    ]

    const service = new LessonsService(repo)
    return { service, repo }
  }

  it('allows enrolled student to retrieve published lessons for course', async () => {
    const { service } = setup()
    const topics = await service.getTopicsForCourse(courseId, enrolledStudent)

    assert.equal(topics.length, 1)
    const lessons = topics[0]!.lessons
    assert.equal(lessons.length, 1)
    assert.equal(lessons[0]!.id, publishedLessonId)
    assert.equal(lessons[0]!.title, 'Bài 1: Phát âm cơ bản')
    assert.equal(lessons[0]!.video_url, 'https://www.youtube.com/watch?v=sample123')
    assert.equal(lessons[0]!.duration_seconds, 900)
    assert.equal(lessons[0]!.materials?.length, 1)
  })

  it('resolves course by slug as well as UUID', async () => {
    const { service } = setup()
    const topics = await service.getTopicsForCourse('english-masterclass', enrolledStudent)

    assert.equal(topics.length, 1)
    assert.equal(topics[0]!.lessons.length, 1)
    assert.equal(topics[0]!.lessons[0]!.id, publishedLessonId)
  })

  it('filters out draft lessons for student callers', async () => {
    const { service } = setup()
    const studentTopics = await service.getTopicsForCourse(courseId, enrolledStudent)
    assert.equal(studentTopics[0]!.lessons.some((l) => l.status === 'draft'), false)

    // Admin should see both published and draft lessons
    const adminTopics = await service.getTopicsForCourse(courseId, adminUser)
    assert.equal(adminTopics[0]!.lessons.length, 2)
  })

  it('rejects unenrolled student with 403 Forbidden', async () => {
    const { service } = setup()
    await assert.rejects(
      async () => service.getTopicsForCourse(courseId, unenrolledStudent),
      (err: unknown) => {
        assert.ok(err instanceof LessonRequestError)
        assert.equal(err.status, 403)
        assert.match(err.message, /chưa đăng ký hoặc chưa hoàn tất thanh toán/)
        return true
      }
    )
  })

  it('retrieves single published lesson details for enrolled student', async () => {
    const { service } = setup()
    const lesson = await service.getLesson(publishedLessonId, enrolledStudent)

    assert.equal(lesson.id, publishedLessonId)
    assert.equal(lesson.title, 'Bài 1: Phát âm cơ bản')
    assert.equal(lesson.video_url, 'https://www.youtube.com/watch?v=sample123')
    assert.equal(lesson.materials?.length, 1)
  })

  it('rejects student requesting unpublished draft lesson with 404', async () => {
    const { service } = setup()
    await assert.rejects(
      async () => service.getLesson(draftLessonId, enrolledStudent),
      (err: unknown) => {
        assert.ok(err instanceof LessonRequestError)
        assert.equal(err.status, 404)
        return true
      }
    )
  })

  it('rejects unenrolled student requesting single lesson with 403', async () => {
    const { service } = setup()
    await assert.rejects(
      async () => service.getLesson(publishedLessonId, unenrolledStudent),
      (err: unknown) => {
        assert.ok(err instanceof LessonRequestError)
        assert.equal(err.status, 403)
        return true
      }
    )
  })

  it('updates lesson watch progress without marking completed before exercises pass', async () => {
    const { service } = setup()
    const result = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 750,
    })

    assert.equal(result.lesson_id, publishedLessonId)
    assert.equal(result.student_id, enrolledStudent.id)
    assert.equal(result.last_position_seconds, 750)
    // 750 / 900 = 83% — video watched, but exercises are not passed yet so is_completed remains false
    assert.equal(result.progress_percent, 83)
    assert.equal(result.is_completed, false)

    // Verify progress is reflected in curriculum and single-lesson fetch
    const topics = await service.getTopicsForCourse(courseId, enrolledStudent)
    const lesson = topics[0]?.lessons[0]
    assert.equal(lesson?.progress?.progress_percent, 83)
    assert.equal(lesson?.progress?.last_position_seconds, 750)
    assert.equal(lesson?.progress?.is_completed, false)

    const single = await service.getLesson(publishedLessonId, enrolledStudent)
    assert.equal(single.progress?.last_position_seconds, 750)
    assert.equal(single.progress?.progress_percent, 83)
    assert.equal(single.progress?.is_completed, false)
  })

  it('caps progress_percent at 99 until is_completed is true even at end of video', async () => {
    const { service } = setup()
    const result = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 900,
      progress_percent: 100,
      is_completed: false,
    })

    assert.equal(result.last_position_seconds, 900)
    assert.equal(result.progress_percent, 99)
    assert.equal(result.is_completed, false)
  })

  it('does not jump progress to 100 when duration_seconds is missing', async () => {
    const { service, repo } = setup()
    const lesson = repo.mockLessons.find((l) => l.id === publishedLessonId)!
    lesson.duration_seconds = null

    const result = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 45,
    })

    assert.equal(result.last_position_seconds, 45)
    assert.equal(result.progress_percent, 0)
    assert.equal(result.is_completed, false)
  })

  it('sets 100% and preserves completed status when re-watching or saving earlier playback positions', async () => {
    const { service } = setup()

    const completed = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 900,
      progress_percent: 100,
      is_completed: true,
    })
    assert.equal(completed.progress_percent, 100)
    assert.equal(completed.is_completed, true)

    // Re-watching from 120s must update last_position_seconds without resetting is_completed or 100%
    const rewatched = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 120,
      progress_percent: 13,
      is_completed: false,
    })
    assert.equal(rewatched.last_position_seconds, 120)
    assert.equal(rewatched.progress_percent, 100)
    assert.equal(rewatched.is_completed, true)
  })

  it('prevents progress_percent regression when pausing at an earlier position before completion', async () => {
    const { service } = setup()

    await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 450,
      progress_percent: 50,
      is_completed: false,
    })

    const pausedEarlier = await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 180,
      progress_percent: 20,
      is_completed: false,
    })
    assert.equal(pausedEarlier.last_position_seconds, 180)
    assert.equal(pausedEarlier.progress_percent, 50)
    assert.equal(pausedEarlier.is_completed, false)
  })

  it('backfills missing lesson duration_seconds when reported by player', async () => {
    const { service, repo } = setup()
    const lesson = repo.mockLessons.find((l) => l.id === publishedLessonId)!
    lesson.duration_seconds = null

    await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 30,
      duration_seconds: 120,
    })
    assert.equal(repo.updatedDurations.get(publishedLessonId), 120)
  })

  it('stores and preserves separate playback positions and completion states per lesson ID', async () => {
    const { service, repo } = setup()
    const secondLessonId = 'e0a80101-0000-4000-8000-000000000003'
    repo.mockLessons.push({
      id: secondLessonId,
      topic_id: topicId,
      title: 'Bài 2: Nguyên âm đôi',
      description: 'Thực hành nguyên âm đôi',
      video_url: 'https://www.youtube.com/watch?v=second12345',
      duration_seconds: 600,
      sort_order: 2,
      status: 'published',
    })

    await service.updateLessonProgress(publishedLessonId, enrolledStudent, {
      last_position_seconds: 215,
      progress_percent: 24,
      is_completed: false,
    })
    await service.updateLessonProgress(secondLessonId, enrolledStudent, {
      last_position_seconds: 480,
      progress_percent: 100,
      is_completed: true,
    })

    const topics = await service.getTopicsForCourse(courseId, enrolledStudent)
    const lessons = topics[0]!.lessons
    const first = lessons.find((l) => l.id === publishedLessonId)!
    const second = lessons.find((l) => l.id === secondLessonId)!

    assert.equal(first.progress?.last_position_seconds, 215)
    assert.equal(first.progress?.progress_percent, 24)
    assert.equal(first.progress?.is_completed, false)

    assert.equal(second.progress?.last_position_seconds, 480)
    assert.equal(second.progress?.progress_percent, 100)
    assert.equal(second.progress?.is_completed, true)
  })

  it('rejects invalid is_completed and out-of-range progress_percent values with 400', async () => {
    const { service } = setup()
    await assert.rejects(
      async () =>
        service.updateLessonProgress(publishedLessonId, enrolledStudent, {
          last_position_seconds: 10,
          is_completed: 'yes',
        }),
      (err: unknown) => err instanceof LessonRequestError && err.status === 400
    )
    await assert.rejects(
      async () =>
        service.updateLessonProgress(publishedLessonId, enrolledStudent, {
          last_position_seconds: 10,
          progress_percent: 150,
        }),
      (err: unknown) => err instanceof LessonRequestError && err.status === 400
    )
  })

  it('rejects unenrolled student from updating progress with 403', async () => {
    const { service } = setup()
    await assert.rejects(
      async () =>
        service.updateLessonProgress(publishedLessonId, unenrolledStudent, {
          last_position_seconds: 100,
        }),
      (err: unknown) => {
        assert.ok(err instanceof LessonRequestError)
        assert.equal(err.status, 403)
        return true
      }
    )
  })
})
