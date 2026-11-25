import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { env } from '../src/config/env.js'
import { LessonRequestError } from '../src/modules/lessons/lessons.errors.js'
import { LessonsRepository } from '../src/modules/lessons/lessons.repository.js'
import {
  extractGoogleDriveFileId,
  LessonsService,
} from '../src/modules/lessons/lessons.service.js'
import type { AuthenticatedUser } from '../src/modules/lessons/lessons.types.js'
import { VideoWatchTracker } from '../../frontend/src/pages/courses/videoWatchTracker.js'

const LESSON_DRIVE_ID = '11111111-1111-4111-8111-111111111111'
const LESSON_DRAFT_ID = '22222222-2222-4222-8222-222222222222'
const LESSON_YT_ID = '33333333-3333-4333-8333-333333333333'
const COURSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const STUDENT_USER: AuthenticatedUser = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'STUDENT',
}
const UNENROLLED_STUDENT: AuthenticatedUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  role: 'STUDENT',
}

describe('Google Drive video stream token & access control', () => {
  const originalSecret = env.authJwtSecret
  let service: LessonsService

  before(() => {
    env.authJwtSecret = 'test-secret-for-drive-video-stream-at-least-32-bytes'

    const fakeRepo = {
      async findLessonWithCourse(lessonId: string) {
        if (lessonId === LESSON_DRIVE_ID) {
          return {
            courseId: COURSE_ID,
            lesson: {
              id: LESSON_DRIVE_ID,
              topic_id: 't1',
              title: 'Bài Drive 1',
              description: null,
              video_url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing',
              duration_seconds: 120,
              sort_order: 1,
              status: 'published' as const,
            },
          }
        }
        if (lessonId === LESSON_DRAFT_ID) {
          return {
            courseId: COURSE_ID,
            lesson: {
              id: LESSON_DRAFT_ID,
              topic_id: 't1',
              title: 'Bài Drive Nháp',
              description: null,
              video_url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view',
              duration_seconds: 120,
              sort_order: 2,
              status: 'draft' as const,
            },
          }
        }
        if (lessonId === LESSON_YT_ID) {
          return {
            courseId: COURSE_ID,
            lesson: {
              id: LESSON_YT_ID,
              topic_id: 't1',
              title: 'Bài YouTube 1',
              description: null,
              video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration_seconds: 120,
              sort_order: 3,
              status: 'published' as const,
            },
          }
        }
        return null
      },
      async findCourseAccess(_courseId: string, user: AuthenticatedUser) {
        return {
          exists: true,
          allowed: user.id === STUDENT_USER.id || user.role === 'ADMIN',
          courseId: COURSE_ID,
          courseTitle: 'IELTS Speaking',
        }
      },
    } as unknown as LessonsRepository

    service = new LessonsService(fakeRepo)
  })

  after(() => {
    env.authJwtSecret = originalSecret
  })

  it('extracts Drive file IDs from supported URL formats and ignores non-Drive links', () => {
    assert.equal(
      extractGoogleDriveFileId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing'),
      '1AbCdEfGhIjKlMnOpQrStUvWxYz'
    )
    assert.equal(
      extractGoogleDriveFileId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview'),
      '1AbCdEfGhIjKlMnOpQrStUvWxYz'
    )
    assert.equal(
      extractGoogleDriveFileId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz'),
      '1AbCdEfGhIjKlMnOpQrStUvWxYz'
    )
    assert.equal(extractGoogleDriveFileId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), null)
    assert.equal(extractGoogleDriveFileId('https://example.com/video.mp4'), null)
  })

  it('issues and resolves a signed stream token for an enrolled student on a published Drive lesson', async () => {
    const issued = await service.createGoogleDriveStreamToken(LESSON_DRIVE_ID, STUDENT_USER)
    assert.ok(issued.token.includes('.'))
    assert.equal(issued.expiresInSeconds, 900)

    const resolved = await service.resolveGoogleDriveStream(LESSON_DRIVE_ID, issued.token)
    assert.equal(resolved.driveFileId, '1AbCdEfGhIjKlMnOpQrStUvWxYz')
    assert.equal(
      resolved.downloadUrl,
      'https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOpQrStUvWxYz&export=download&confirm=t'
    )
  })

  it('rejects unenrolled students (403), draft lessons for students (404), and YouTube lessons (400)', async () => {
    await assert.rejects(
      () => service.createGoogleDriveStreamToken(LESSON_DRIVE_ID, UNENROLLED_STUDENT),
      (err: unknown) => err instanceof LessonRequestError && err.status === 403
    )

    await assert.rejects(
      () => service.createGoogleDriveStreamToken(LESSON_DRAFT_ID, STUDENT_USER),
      (err: unknown) => err instanceof LessonRequestError && err.status === 404
    )

    await assert.rejects(
      () => service.createGoogleDriveStreamToken(LESSON_YT_ID, STUDENT_USER),
      (err: unknown) => err instanceof LessonRequestError && err.status === 400
    )
  })

  it('rejects missing, tampered, or cross-lesson stream tokens with 401', async () => {
    const issued = await service.createGoogleDriveStreamToken(LESSON_DRIVE_ID, STUDENT_USER)

    await assert.rejects(
      () => service.resolveGoogleDriveStream(LESSON_DRIVE_ID, ''),
      (err: unknown) => err instanceof LessonRequestError && err.status === 401
    )

    await assert.rejects(
      () => service.resolveGoogleDriveStream(LESSON_DRIVE_ID, `${issued.token}tampered`),
      (err: unknown) => err instanceof LessonRequestError && err.status === 401
    )

    await assert.rejects(
      () => service.resolveGoogleDriveStream(LESSON_DRAFT_ID, issued.token),
      (err: unknown) => err instanceof LessonRequestError && err.status === 401
    )
  })
})

describe('VideoWatchTracker parity for HTML5 / Google Drive playback', () => {
  it('blocks forward seeks, allows backward seeks, restores saved position, and gates exercise on genuine end', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: LESSON_DRIVE_ID,
      duration: 100,
      savedPositionSeconds: 0,
      savedProgressPercent: 0,
      isCompleted: false,
    })
    assert.equal(init.restorePosition, 0)

    let now = 1_000
    tracker.onPlay(now)

    // Watch continuously from 0s to 30s
    for (let sec = 1; sec <= 30; sec += 1) {
      now += 1_000
      const tick = tracker.onTimeSample(sec, now, 1)
      assert.equal(tick.seekBlocked, false)
    }
    assert.ok(tracker.getFurthestWatchedTime() >= 29.5)

    // Attempt forward seek to 80s -> blocked
    const forwardSeek = tracker.onSeeking(80, now + 200)
    assert.equal(forwardSeek.allowed, false)

    // Attempt backward seek to 10s -> allowed
    const backwardSeek = tracker.onSeeking(10, now + 400)
    assert.equal(backwardSeek.allowed, true)

    // Premature ended event at 30% -> rejected, exercise must NOT open
    const prematureEnd = tracker.onEnded(now + 500)
    assert.equal(prematureEnd.genuine, false)
    assert.equal(prematureEnd.shouldOpenExercise, false)

    // Simulate reload & resume from saved position 30s (30%)
    const resumed = new VideoWatchTracker()
    const resumeInit = resumed.initializeForLesson({
      lessonId: LESSON_DRIVE_ID,
      duration: 100,
      savedPositionSeconds: 30,
      savedProgressPercent: 30,
      isCompleted: false,
    })
    assert.equal(resumeInit.restorePosition, 30)

    // Continue watching genuinely from 30s to 100s
    let resumeNow = 50_000
    resumed.onPlay(resumeNow)
    for (let sec = 31; sec <= 100; sec += 1) {
      resumeNow += 1_000
      const tick = resumed.onTimeSample(sec, resumeNow, 1)
      assert.equal(tick.seekBlocked, false)
    }

    const genuineEnd = resumed.onEnded(resumeNow + 200)
    assert.equal(genuineEnd.genuine, true)
    assert.equal(genuineEnd.shouldOpenExercise, true)
    assert.equal(genuineEnd.snapshot.lessonProgressPercent, 99)
  })
})
