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

  it('allows backward seeking to previously watched position and blocks forward seeking beyond watched progress', () => {
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

    // Attempt HTML5 onSeeking jump to 90s before watching it
    const seekCheck = tracker.onSeeking(90, now + 50)
    assert.equal(seekCheck.allowed, false)
    assert.equal(seekCheck.revertToSeconds, 2)

    // Attempt forward time sample jump from 2s to 118s in 200ms
    const forwardJump = tracker.onTimeSample(118, now + 200, 1)
    assert.equal(forwardJump.seekBlocked, true)
    assert.equal(forwardJump.revertToSeconds, 2)
    assert.equal(tracker.getFurthestWatchedTime(), 2)

    // Watch continuously up to 30s
    now += 400
    tracker.onPlay(now)
    for (let sec = 3; sec <= 30; sec++) {
      now += 1_000
      const tick = tracker.onTimeSample(sec, now, 1)
      assert.equal(tick.seekBlocked, false)
    }
    assert.equal(tracker.getFurthestWatchedTime(), 30)

    // Backward seek to 5s is ALLOWED because 5s <= 30s (watched progress)
    const backwardSeekCheck = tracker.onSeeking(5, now + 100)
    assert.equal(backwardSeekCheck.allowed, true)
    assert.equal(backwardSeekCheck.revertToSeconds, 5)

    const backwardJump = tracker.onTimeSample(5, now + 200, 1)
    assert.equal(backwardJump.seekBlocked, false)
    assert.equal(backwardJump.currentTime, 5)
    // Furthest watched position remains 30s
    assert.equal(tracker.getFurthestWatchedTime(), 30)

    // From 5s, forward seek to 20s is ALLOWED because 20s <= 30s
    const forwardWithinWatched = tracker.onTimeSample(20, now + 300, 1)
    assert.equal(forwardWithinWatched.seekBlocked, false)
    assert.equal(forwardWithinWatched.currentTime, 20)

    // From 20s, forward seek to 45s is BLOCKED because 45s > 30s (furthest watched)
    const forwardBeyondWatched = tracker.onTimeSample(45, now + 400, 1)
    assert.equal(forwardBeyondWatched.seekBlocked, true)
    assert.equal(forwardBeyondWatched.revertToSeconds, 20)

    // Normal playback resumes from 20s and advances past 30s to 32s
    for (let sec = 21; sec <= 32; sec++) {
      now += 1_000
      const tick = tracker.onTimeSample(sec, now, 1)
      assert.equal(tick.seekBlocked, false)
    }
    assert.equal(tracker.getFurthestWatchedTime(), 32)
    assert.equal(tracker.getLastValidTime(), 32)
  })

  it('allows replaying completed videos without resetting progress and allows seeking within duration', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'lesson-completed-replay',
      duration: 100,
      savedPositionSeconds: 100,
      savedProgressPercent: 100,
      isCompleted: true,
    })

    // Resets EOF position to 0 so video can replay from start
    assert.equal(init.restorePosition, 0)
    assert.equal(tracker.isVideoCompleted(), true)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)
    assert.equal(tracker.getMaxSeekableTime(), 100)

    // Student replays video: start playing at 0s
    let now = 10_000
    tracker.onPlay(now)
    const tick0 = tracker.onTimeSample(0, now, 1)
    assert.equal(tick0.seekBlocked, false)
    // Progress remains 100% completed
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)
    assert.equal(tracker.getSnapshot().videoWatchedPercent, 100)

    // Seeking anywhere within completed video (e.g. 50s, 80s, back to 10s) is allowed
    const seek50 = tracker.onSeeking(50, now + 100)
    assert.equal(seek50.allowed, true)
    const tick50 = tracker.onTimeSample(50, now + 200, 1)
    assert.equal(tick50.seekBlocked, false)

    const seekBack10 = tracker.onSeeking(10, now + 300)
    assert.equal(seekBack10.allowed, true)
    const tick10 = tracker.onTimeSample(10, now + 400, 1)
    assert.equal(tick10.seekBlocked, false)

    // Seeking beyond video duration (120s > 100s) is blocked
    const seekBeyond = tracker.onSeeking(120, now + 500)
    assert.equal(seekBeyond.allowed, false)

    // resetForReplay preserves completed lesson status and 100% progress
    tracker.resetForReplay(now + 600)
    assert.equal(tracker.getSnapshot().isLessonCompleted, true)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)
    assert.equal(tracker.getSnapshot().videoWatchedPercent, 100)
  })

  it('preserves persisted watched progress on page refresh and restricts forward seeking accordingly', () => {
    // Student previously watched 5 minutes (300s) out of 10 minutes (600s)
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'lesson-refresh',
      duration: 600,
      savedPositionSeconds: 300,
      savedProgressPercent: 50,
      isCompleted: false,
    })

    assert.equal(init.restorePosition, 300)
    assert.equal(tracker.getFurthestWatchedTime(), 300)
    assert.equal(tracker.getMaxSeekableTime(), 300)

    let now = 50_000
    // Backward seek to 120s (2 min) is allowed
    assert.equal(tracker.onSeeking(120, now).allowed, true)
    const backTick = tracker.onTimeSample(120, now + 100, 1)
    assert.equal(backTick.seekBlocked, false)
    assert.equal(backTick.currentTime, 120)

    // Forward seek beyond 300s (e.g. 360s = 6 min) is blocked
    assert.equal(tracker.onSeeking(360, now + 200).allowed, false)
    const fwdBlock = tracker.onTimeSample(360, now + 300, 1)
    assert.equal(fwdBlock.seekBlocked, true)
    assert.equal(fwdBlock.revertToSeconds, 120)

    // Normal playback from 120s continues properly
    tracker.onPlay(now + 400)
    const play121 = tracker.onTimeSample(121, now + 1_400, 1)
    assert.equal(play121.seekBlocked, false)
    assert.equal(play121.currentTime, 121)
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

describe('Video Switching - Restore Saved Playback Position', () => {
  function watchTo(tracker: VideoWatchTracker, from: number, to: number, startMs: number) {
    tracker.onPlay(startMs)
    for (let sec = from + 1; sec <= to; sec++) {
      tracker.onTimeSample(sec, startMs + (sec - from) * 1000, 1)
    }
  }

  it('Video A at 02:00 -> switch to B -> return to A resumes at 02:00; B restores its own position', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: 'A', duration: 600, savedPositionSeconds: 0, savedProgressPercent: 0, isCompleted: false,
    })
    watchTo(tracker, 0, 120, 1000)
    assert.equal(tracker.getLastValidTime(), 120)
    const savedA = { position: Math.floor(tracker.getLastValidTime()), percent: tracker.getSnapshot().lessonProgressPercent }
    assert.equal(savedA.position, 120)

    // Switch to B (fresh, then watched to 03:00)
    tracker.initializeForLesson({
      lessonId: 'B', duration: 500, savedPositionSeconds: 0, savedProgressPercent: 0, isCompleted: false,
    })
    watchTo(tracker, 0, 180, 500000)
    const savedB = { position: Math.floor(tracker.getLastValidTime()), percent: tracker.getSnapshot().lessonProgressPercent }
    assert.equal(savedB.position, 180)

    // Return to A: resumes at 02:00 with furthest = 02:00
    const initA = tracker.initializeForLesson({
      lessonId: 'A', duration: 600, savedPositionSeconds: savedA.position, savedProgressPercent: savedA.percent, isCompleted: false,
    })
    assert.equal(initA.restorePosition, 120)
    assert.equal(tracker.getLastValidTime(), 120)
    assert.equal(tracker.getSnapshot().currentTime, 120)
    assert.equal(tracker.getMaxSeekableTime() >= 120, true)
    assert.equal(tracker.beginAuthorizedSeek(60, 900000), true) // backward ok
    assert.equal(tracker.beginAuthorizedSeek(400, 901000), false) // forward blocked

    // Return to B: resumes at its own 03:00
    const initB = tracker.initializeForLesson({
      lessonId: 'B', duration: 500, savedPositionSeconds: savedB.position, savedProgressPercent: savedB.percent, isCompleted: false,
    })
    assert.equal(initB.restorePosition, 180)
    assert.equal(tracker.getMaxSeekableTime() >= 180, true)
    assert.equal(tracker.beginAuthorizedSeek(400, 902000), false)
  })

  it('restores persisted position after a page refresh (fresh tracker from saved progress)', () => {
    const fresh = new VideoWatchTracker()
    const init = fresh.initializeForLesson({
      lessonId: 'A', duration: 600, savedPositionSeconds: 120, savedProgressPercent: 20, isCompleted: false,
    })
    assert.equal(init.restorePosition, 120)
    assert.equal(fresh.getSnapshot().currentTime, 120)
    assert.equal(fresh.beginAuthorizedSeek(300, 1000), false)
  })

  it('failed-exercise retry lessons restart at 0:00 and keep forward seeking locked', () => {
    // Retry state forces saved position/progress to 0 (as StudentCourseDetailPage does)
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'R', duration: 600, savedPositionSeconds: 0, savedProgressPercent: 0, isCompleted: false,
    })
    assert.equal(init.restorePosition, 0)
    assert.equal(tracker.getMaxSeekableTime(), 0)
    assert.equal(tracker.beginAuthorizedSeek(60, 1000), false)
  })

  it('completed lessons keep completed status and resume at saved position with full seeking', () => {
    const tracker = new VideoWatchTracker()
    const init = tracker.initializeForLesson({
      lessonId: 'C', duration: 600, savedPositionSeconds: 200, savedProgressPercent: 100, isCompleted: true,
    })
    assert.equal(init.restorePosition, 200)
    assert.equal(tracker.getSnapshot().isLessonCompleted, true)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)
    assert.equal(tracker.getMaxSeekableTime(), 600)
  })

  it('preserves exact furthestWatchedTime across backward seek and video switch via savedFurthestSeconds', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: 'A', duration: 600, savedPositionSeconds: 0, savedProgressPercent: 0, isCompleted: false,
    })
    watchTo(tracker, 0, 245, 1000)
    assert.equal(tracker.getFurthestWatchedTime(), 245)

    // User seeks backward to 60s while paused -> marks unsaved position change
    tracker.onPauseOrBuffer()
    assert.equal(tracker.beginAuthorizedSeek(60, 300000, true), true)
    assert.equal(tracker.hasUnsavedChanges(), true)
    assert.equal(tracker.getLastValidTime(), 60)
    assert.equal(tracker.getFurthestWatchedTime(), 245)

    const savedPos = Math.floor(tracker.getLastValidTime())
    const savedFurthest = tracker.getFurthestWatchedTime()
    const savedPct = tracker.getSnapshot().lessonProgressPercent

    // Switch to B and back to A
    tracker.initializeForLesson({
      lessonId: 'B', duration: 300, savedPositionSeconds: 0, savedProgressPercent: 0, isCompleted: false,
    })
    const initA = tracker.initializeForLesson({
      lessonId: 'A',
      duration: 600,
      savedPositionSeconds: savedPos,
      savedProgressPercent: savedPct,
      isCompleted: false,
      savedFurthestSeconds: savedFurthest,
    })
    assert.equal(initA.restorePosition, 60)
    assert.equal(tracker.getFurthestWatchedTime(), 245)
    assert.equal(tracker.getMaxSeekableTime(), 245)
    assert.equal(tracker.beginAuthorizedSeek(245, 310000, true), true)
    assert.equal(tracker.beginAuthorizedSeek(260, 311000, true), false)
  })

  it('rejects ended events without actual playback and accepts genuine end even after trailing buffer/pause', () => {
    // Spurious ended without playing must not complete video
    const unplayed = new VideoWatchTracker()
    unplayed.initializeForLesson({
      lessonId: 'E1', duration: 100, savedPositionSeconds: 98, savedProgressPercent: 98, isCompleted: false,
    })
    const fakeEnd = unplayed.onEnded(5000)
    assert.equal(fakeEnd.genuine, false)
    assert.equal(fakeEnd.shouldOpenExercise, false)
    assert.equal(unplayed.isVideoCompleted(), false)

    // Genuine playback reaching near-end followed by trailing buffering before ended succeeds
    const played = new VideoWatchTracker()
    played.initializeForLesson({
      lessonId: 'E2', duration: 100, savedPositionSeconds: 95, savedProgressPercent: 95, isCompleted: false,
    })
    played.onPlay(1000)
    played.onTimeSample(96, 2000, 1)
    played.onTimeSample(97, 3000, 1)
    played.onTimeSample(98, 4000, 1)
    played.onTimeSample(99, 5000, 1)
    played.onPauseOrBuffer() // simulates YouTube BUFFERING/PAUSED right before ENDED
    const realEnd = played.onEnded(5200)
    assert.equal(realEnd.genuine, true)
    assert.equal(realEnd.shouldOpenExercise, true)
    assert.equal(played.isVideoCompleted(), true)
    assert.equal(played.getMaxSeekableTime(), 100)
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
      'https://www.youtube.com/embed/abc123DEF45?enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&cc_load_policy=0&start=15'
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
