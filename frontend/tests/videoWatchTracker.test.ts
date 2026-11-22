import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { VideoWatchTracker } from '../src/pages/courses/videoWatchTracker.ts'
import { getLessonExercise, getLessonThumbnail, type StudentLessonItem } from '../src/pages/courses/studentLessonHelpers.ts'
import {
  buildEmbedUrl,
  extractGoogleDriveEmbedUrl,
  extractYouTubeVideoId,
} from '../src/pages/them_bai_giang/services/lessonApi.ts'

describe('VideoWatchTracker - Real-time playback, anti-seek, resume, and exercise gate', () => {
  it('tracks continuous watched progress in real time and caps at 99% before exercise completion', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'lesson-1',
      duration: 100,
      savedPositionSeconds: 0,
      savedProgressPercent: 0,
      isCompleted: false,
    })
    assert.equal(init.restorePosition, 0)

    let now = 1_000
    tracker.onPlay(now)

    // Watch continuously in 1s increments up to 50s
    for (let sec = 1; sec <= 50; sec++) {
      now += 1_000
      const res = tracker.onTimeSample(sec, now, 1)
      assert.equal(res.seekBlocked, false)
      assert.equal(res.currentTime, sec)
    }

    let snap = tracker.getSnapshot()
    assert.equal(snap.videoWatchedPercent, 50)
    assert.equal(snap.lessonProgressPercent, 50)
    assert.equal(snap.isLessonCompleted, false)

    // Watch continuously from 51s to 99s
    for (let sec = 51; sec <= 99; sec++) {
      now += 1_000
      const res = tracker.onTimeSample(sec, now, 1)
      assert.equal(res.seekBlocked, false)
    }

    snap = tracker.getSnapshot()
    assert.equal(snap.videoWatchedPercent, 99)
    assert.equal(snap.lessonProgressPercent, 99)

    // Genuine ended event unlocks video and opens exercise ONCE, while keeping lesson progress at 99%
    const end1 = tracker.onEnded(now + 1_000)
    assert.equal(end1.genuine, true)
    assert.equal(end1.shouldOpenExercise, true)
    assert.equal(end1.snapshot.videoWatchedPercent, 100)
    assert.equal(end1.snapshot.lessonProgressPercent, 99)
    assert.equal(end1.snapshot.isLessonCompleted, false)

    // Duplicate ended in the same attempt must not reopen the popup automatically
    const end2 = tracker.onEnded(now + 1_200)
    assert.equal(end2.genuine, true)
    assert.equal(end2.shouldOpenExercise, false)

    // Completing exercises updates progress to 100% and sets is_completed = true
    tracker.markLessonCompleted()
    snap = tracker.getSnapshot()
    assert.equal(snap.lessonProgressPercent, 100)
    assert.equal(snap.isLessonCompleted, true)
  })

  it('blocks forward/backward seeking and rejects manipulated ended events', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: 'lesson-seek',
      duration: 120,
      savedPositionSeconds: 0,
      savedProgressPercent: 0,
      isCompleted: false,
    })

    let now = 5_000
    tracker.onPlay(now)
    now += 1_000
    tracker.onTimeSample(1, now, 1)
    now += 1_000
    tracker.onTimeSample(2, now, 1)

    // Attempt HTML5 onSeeking jump to 90s
    const seekCheck = tracker.onSeeking(90, now + 50)
    assert.equal(seekCheck.allowed, false)
    assert.equal(seekCheck.revertToSeconds, 2)

    // Attempt forward time sample jump from 2s to 118s in 200ms
    const forwardJump = tracker.onTimeSample(118, now + 200, 1)
    assert.equal(forwardJump.seekBlocked, true)
    assert.equal(forwardJump.revertToSeconds, 2)
    assert.equal(forwardJump.videoWatchedPercent, 2)

    // Attempt to trigger ended without watching >= 95%
    const fakeEnd = tracker.onEnded(now + 300)
    assert.equal(fakeEnd.genuine, false)
    assert.equal(fakeEnd.shouldOpenExercise, false)
    assert.equal(fakeEnd.revertToSeconds, 2)

    // Resume playing up to 30s and attempt backward seek to 5s
    now += 400
    tracker.onPlay(now)
    for (let sec = 3; sec <= 30; sec++) {
      now += 1_000
      tracker.onTimeSample(sec, now, 1)
    }
    const backwardJump = tracker.onTimeSample(5, now + 200, 1)
    assert.equal(backwardJump.seekBlocked, true)
    assert.equal(backwardJump.revertToSeconds, 30)
  })

  it('does not count paused, buffering, or non-1x speed time', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: 'lesson-pause',
      duration: 100,
      savedPositionSeconds: 0,
      savedProgressPercent: 0,
      isCompleted: false,
    })

    let now = 10_000
    tracker.onPlay(now)
    now += 1_000
    tracker.onTimeSample(1, now, 1)
    now += 1_000
    tracker.onTimeSample(2, now, 1)

    // Pause / Buffer and try advancing time sample while paused
    tracker.onPauseOrBuffer()
    now += 5_000
    const pausedTick = tracker.onTimeSample(10, now, 1)
    assert.equal(pausedTick.seekBlocked, true)
    assert.equal(pausedTick.revertToSeconds, 2)
    assert.equal(tracker.getSnapshot().videoWatchedPercent, 2)

    // Try speeding up to 1.5x
    tracker.onPlay(now + 100)
    const fastTick = tracker.onTimeSample(5, now + 1_100, 1.5)
    assert.equal(fastTick.seekBlocked, true)
    assert.equal(fastTick.revertToSeconds, 2)
    assert.equal(tracker.getSnapshot().videoWatchedPercent, 2)
  })

  it('restores saved playback position safely and resumes cleanly to genuine completion', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'lesson-resume',
      duration: 0,
      savedPositionSeconds: 60,
      savedProgressPercent: 60,
      isCompleted: false,
    })
    assert.equal(init.restorePosition, 60)

    // Metadata arrives with real duration = 100s
    const afterMeta = tracker.setDuration(100)
    assert.equal(afterMeta.restorePosition, 60)
    assert.equal(tracker.getSnapshot().videoWatchedPercent, 60)
    assert.equal(tracker.hasPlaybackActivity(), false)

    // Programmatic restore seek (plus brief initial 0s telemetry jitter before seek settles)
    let now = 20_000
    tracker.beginAuthorizedSeek(60, now)
    assert.equal(tracker.onSeeking(60, now + 50).allowed, true)
    assert.equal(tracker.onTimeSample(0, now + 80, 1).seekBlocked, false)
    assert.equal(tracker.getLastValidTime(), 60)

    // Player settles at 60s and resumes playing to 100s
    tracker.onPlay(now + 100)
    assert.equal(tracker.hasPlaybackActivity(), true)
    tracker.onTimeSample(60, now + 150, 1)

    for (let sec = 61; sec <= 99; sec++) {
      now += 1_000
      const res = tracker.onTimeSample(sec, now, 1)
      assert.equal(res.seekBlocked, false)
    }

    const end = tracker.onEnded(now + 1_000)
    assert.equal(end.genuine, true)
    assert.equal(end.shouldOpenExercise, true)
  })

  it('resets saved EOF position to 0 on revisit and supports replay reset', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'lesson-eof',
      duration: 60,
      savedPositionSeconds: 60,
      savedProgressPercent: 100,
      isCompleted: true,
    })
    assert.equal(init.restorePosition, 0)
    assert.equal(tracker.getSnapshot().isLessonCompleted, true)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)

    // Replaying resets attempt flag so popup can reopen on genuine replay end
    tracker.resetForReplay(30_000)
    assert.equal(tracker.isVideoCompleted(), false)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100) // Preserves completed status!
  })
})

describe('YouTube & Thumbnail Helpers', () => {
  it('extracts video IDs from standard, short, embed, live, and nocookie YouTube URLs', () => {
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=abc123'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
    assert.equal(extractYouTubeVideoId('not-a-valid-video'), null)
  })

  it('builds Google Drive and YouTube embed URLs safely without hardcoding IDs', () => {
    assert.equal(
      extractGoogleDriveEmbedUrl('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing'),
      'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview'
    )
    assert.equal(
      buildEmbedUrl('https://youtu.be/abc123DEF45?t=15s'),
      'https://www.youtube.com/embed/abc123DEF45?enablejsapi=1&rel=0&start=15'
    )
    assert.equal(buildEmbedUrl('https://cdn.example.com/lesson.mp4'), null)
  })

  it('prioritizes API thumbnail_url, then YouTube thumbnail, then fallback', () => {
    assert.equal(
      getLessonThumbnail({
        thumbnailUrl: 'https://cdn.example.com/custom.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      }),
      'https://cdn.example.com/custom.jpg'
    )
    assert.equal(
      getLessonThumbnail({
        videoUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      }),
      'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg'
    )
    assert.equal(
      getLessonThumbnail({ videoUrl: 'https://cdn.example.com/video.mp4' }, '/course-cover.png'),
      '/course-cover.png'
    )
  })

  it('builds dynamic lesson exercise questions tailored to the selected lesson without mock leakage', () => {
    const lesson: StudentLessonItem = {
      id: 'lesson-abc',
      topicId: 'topic-1',
      topicTitle: 'Topic 1',
      lessonNumber: 3,
      title: 'Phát âm /θ/ và /ð/',
      description: null,
      videoUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      duration: '05:00',
      durationSeconds: 300,
      materials: [],
      sortOrder: 3,
      status: 'not_started',
      progressPercent: 0,
      lastPositionSeconds: 0,
    }
    const exercise = getLessonExercise(lesson)
    assert.equal(exercise.totalQuestions, exercise.questions.length)
    assert.ok(exercise.title.includes('Phát âm /θ/ và /ð/'))
    assert.ok(exercise.questions.every((q) => q.options.some((o) => o.id === q.correctOptionId)))
  })
})
