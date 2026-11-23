import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatSidebarLessonInfo,
  getLessonExercise,
  validateQuestionAnswer,
  validateExerciseSubmission,
  PASSING_SCORE_PERCENT,
  type StudentLessonItem,
} from '../src/pages/courses/studentLessonHelpers.ts'
import { VideoWatchTracker } from '../src/pages/courses/videoWatchTracker.ts'

describe('Per-Question Answer Validation & Exercise Flow', () => {
  const dummyLesson: StudentLessonItem = {
    id: 'lesson-val-1',
    topicId: 'topic-1',
    topicTitle: 'Topic 1',
    lessonNumber: 1,
    title: 'Bài 1: Tổng quan ngữ âm',
    description: 'Chi tiết bài 1',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: null,
    duration: '10:00',
    durationSeconds: 600,
    materials: [],
    sortOrder: 1,
    status: 'in_progress',
    progressPercent: 99,
    lastPositionSeconds: 600,
  }

  const exercise = getLessonExercise(dummyLesson)
  const questions = exercise.questions

  it('allows students to check an answer immediately without completing the entire exercise', () => {
    // Student only selects an answer for Question 0, leaving Question 1 completely unanswered
    const currentCorrectMap: Record<number, boolean> = {}
    const outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: questions[0]!.correctOptionId,
      currentCorrectMap,
    })

    assert.equal(outcome.valid, true)
    assert.ok(outcome.result)
    assert.equal(outcome.result.isCorrect, true)
    // Question 1 was not answered, so exercise is NOT completed yet
    assert.equal(outcome.result.allCompleted, false)
  })

  it('requires an answer selection before checking', () => {
    const outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: undefined,
      currentCorrectMap: {},
    })

    assert.equal(outcome.valid, false)
    assert.equal(outcome.error, 'Vui lòng chọn đáp án trước khi kiểm tra.')
  })

  it('correct answer: displays success notification and automatically moves to the next question', () => {
    const currentCorrectMap: Record<number, boolean> = {}

    // Question 0 answered correctly
    const outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: questions[0]!.correctOptionId,
      currentCorrectMap,
    })

    assert.equal(outcome.valid, true)
    assert.ok(outcome.result)
    assert.equal(outcome.result.isCorrect, true)
    assert.equal(outcome.result.message.includes('Chính xác'), true)
    // Automatically moves to next question (index 1)
    assert.equal(outcome.result.nextQuestionIndex, 1)
    assert.equal(outcome.result.allCompleted, false)
    assert.equal(outcome.result.updatedCorrectMap[0], true)
  })

  it('wrong answer: displays error notification, allows student to retry the same question, and resets video for review', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: dummyLesson.durationSeconds,
      savedPositionSeconds: dummyLesson.lastPositionSeconds,
      savedProgressPercent: 99,
      isCompleted: false,
    })

    const currentCorrectMap: Record<number, boolean> = {}
    const wrongOptionId = questions[0]!.options.find((opt) => opt.id !== questions[0]!.correctOptionId)!.id

    const outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: wrongOptionId,
      currentCorrectMap,
    })

    assert.equal(outcome.valid, true)
    assert.ok(outcome.result)
    assert.equal(outcome.result.isCorrect, false)
    assert.equal(outcome.result.message.includes('chưa chính xác'), true)
    // Remains on the same question index so the student retries the exact same question
    assert.equal(outcome.result.nextQuestionIndex, 0)
    assert.equal(outcome.result.allCompleted, false)
    assert.equal(Boolean(outcome.result.updatedCorrectMap[0]), false)

    // Verify video reset for review
    tracker.resetForReplay(Date.now())
    const snap = tracker.getSnapshot()
    assert.equal(snap.videoWatchedPercent, 0)
    assert.equal(tracker.getLastValidTime(), 0)
  })

  it('allows retrying the same question and proceeding when answered correctly', () => {
    // Attempt 1: wrong answer on Question 0
    let currentCorrectMap: Record<number, boolean> = {}
    const wrongOptionId = questions[0]!.options.find((opt) => opt.id !== questions[0]!.correctOptionId)!.id
    const attempt1 = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: wrongOptionId,
      currentCorrectMap,
    })
    assert.equal(attempt1.result?.isCorrect, false)
    assert.equal(attempt1.result?.nextQuestionIndex, 0)

    // Attempt 2: student retries Question 0 with correct answer
    const attempt2 = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: questions[0]!.correctOptionId,
      currentCorrectMap,
    })
    assert.equal(attempt2.result?.isCorrect, true)
    assert.equal(attempt2.result?.nextQuestionIndex, 1)
    currentCorrectMap = attempt2.result!.updatedCorrectMap
    assert.equal(currentCorrectMap[0], true)
  })

  it('marks the exercise as completed only when all questions are answered correctly', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: dummyLesson.durationSeconds,
      savedPositionSeconds: dummyLesson.lastPositionSeconds,
      savedProgressPercent: 99,
      isCompleted: false,
    })

    let currentCorrectMap: Record<number, boolean> = {}

    // Step 1: Validate Question 0 correctly
    const q0Outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 0,
      selectedOptionId: questions[0]!.correctOptionId,
      currentCorrectMap,
    })
    assert.equal(q0Outcome.result?.isCorrect, true)
    assert.equal(q0Outcome.result?.allCompleted, false)
    currentCorrectMap = q0Outcome.result!.updatedCorrectMap

    // Step 2: Validate Question 1 correctly (the final question)
    const q1Outcome = validateQuestionAnswer({
      questions,
      currentQuestionIndex: 1,
      selectedOptionId: questions[1]!.correctOptionId,
      currentCorrectMap,
    })
    assert.equal(q1Outcome.result?.isCorrect, true)
    // NOW all questions are answered correctly: marks exercise completed
    assert.equal(q1Outcome.result?.allCompleted, true)
    assert.equal(q1Outcome.result?.message.includes('hoàn thành tất cả các câu hỏi'), true)

    // Mark completion in tracker & progress
    tracker.markLessonCompleted()
    const finalSnap = tracker.getSnapshot()
    assert.equal(finalSnap.lessonProgressPercent, 100)
    assert.equal(finalSnap.isLessonCompleted, true)
  })
})

describe('Video Replay and Exercise Retry Loop (80% threshold)', () => {
  const dummyLesson: StudentLessonItem = {
    id: 'lesson-retry-loop-1',
    topicId: 'topic-1',
    topicTitle: 'Topic 1',
    lessonNumber: 1,
    title: 'Bài 1: Luyện phát âm',
    description: 'Chi tiết bài 1',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: null,
    duration: '10:00',
    durationSeconds: 600,
    materials: [],
    sortOrder: 1,
    status: 'in_progress',
    progressPercent: 99,
    lastPositionSeconds: 600,
  }

  const exercise = getLessonExercise(dummyLesson)
  const questions = exercise.questions

  it('requires all questions to be answered before clicking Check', () => {
    assert.equal(PASSING_SCORE_PERCENT, 80)
    // Only answered question 0, question 1 missing
    const res = validateExerciseSubmission({
      questions,
      selectedAnswers: { 0: questions[0]!.correctOptionId },
    })

    assert.equal(res.allAnswered, false)
    assert.equal(res.unansweredIndex, 1)
    assert.equal(res.passed, false)
    assert.equal(res.message.includes('còn thiếu Câu 2'), true)
  })

  it('calculates overall score and marks completed when score >= 80%', () => {
    // Both questions (100% >= 80%) answered correctly
    const res = validateExerciseSubmission({
      questions,
      selectedAnswers: {
        0: questions[0]!.correctOptionId,
        1: questions[1]!.correctOptionId,
      },
    })

    assert.equal(res.allAnswered, true)
    assert.equal(res.scorePercent, 100)
    assert.equal(res.passed, true)
    assert.equal(res.correctCount, 2)
    assert.equal(res.message.includes('hoàn thành'), true)

    // Verify tracker marks lesson completed
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: dummyLesson.durationSeconds,
      savedPositionSeconds: dummyLesson.lastPositionSeconds,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    tracker.markLessonCompleted()
    const snap = tracker.getSnapshot()
    assert.equal(snap.isLessonCompleted, true)
    assert.equal(snap.lessonProgressPercent, 100)
    assert.equal(snap.videoWatchedPercent, 100)
  })

  it('fails exercise and resets watch progress to 0 when score is below 80%', () => {
    // 1 of 2 questions correct = 50% (< 80%)
    const wrongOptId = questions[1]!.options.find((opt) => opt.id !== questions[1]!.correctOptionId)!.id
    const res = validateExerciseSubmission({
      questions,
      selectedAnswers: {
        0: questions[0]!.correctOptionId,
        1: wrongOptId,
      },
    })

    assert.equal(res.allAnswered, true)
    assert.equal(res.scorePercent, 50)
    assert.equal(res.passed, false)
    assert.equal(res.message.includes('chưa đạt mức 80%'), true)

    // Verify video watch progress resets to 0
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 99)

    // Reset required replay
    tracker.resetForRequiredReplay(Date.now())
    const resetSnap = tracker.getSnapshot()
    assert.equal(resetSnap.currentTime, 0)
    assert.equal(resetSnap.lessonProgressPercent, 0)
    assert.equal(resetSnap.videoWatchedPercent, 0)
    assert.equal(resetSnap.isLessonCompleted, false)
    assert.equal(resetSnap.videoCompleted, false)
    assert.equal(tracker.getMaxSeekableTime(), 0)
  })

  it('locks forward seeking at 0 after reset, allows backward seeking within watched progress, and unlocks only upon genuine full replay', () => {
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })

    // Reset after failed exercise
    tracker.resetForRequiredReplay(1000)
    assert.equal(tracker.getMaxSeekableTime(), 0)

    // Attempting to forward seek to minute 3 (180s) is blocked
    const seekBlocked = tracker.beginAuthorizedSeek(180, 1100)
    assert.equal(seekBlocked, false)
    assert.equal(tracker.getMaxSeekableTime(), 0)

    // Student starts watching from 0 normally
    tracker.onPlay(1200)
    for (let sec = 1; sec <= 120; sec++) {
      tracker.onTimeSample(sec, 1200 + sec * 1000, 1)
    }
    // Furthest watched is now 120s
    assert.equal(tracker.getMaxSeekableTime(), 120)

    // Backward seek to 40s is permitted
    const backwardSeek = tracker.beginAuthorizedSeek(40, 130000)
    assert.equal(backwardSeek, true)
    assert.equal(tracker.getLastValidTime(), 40)
    // Furthest watched position remains 120s
    assert.equal(tracker.getMaxSeekableTime(), 120)

    // Forward seek beyond 120s to 200s is blocked
    const overSeek = tracker.beginAuthorizedSeek(200, 131000)
    assert.equal(overSeek, false)

    // Student resumes continuous playback from seeked position 40s to 600s
    tracker.onPlay(132000)
    for (let sec = 41; sec <= 600; sec++) {
      tracker.onTimeSample(sec, 132000 + (sec - 40) * 1000, 1)
    }

    const endedResult = tracker.onEnded(132000 + 560000)
    assert.equal(endedResult.genuine, true)
    assert.equal(endedResult.shouldOpenExercise, true)
    assert.equal(tracker.isVideoCompleted(), true)
  })

  it('supports repeating the retry cycle multiple times until score reaches 80%', () => {
    const tracker = new VideoWatchTracker()
    const wrongOpt0 = questions[0]!.options.find((opt) => opt.id !== questions[0]!.correctOptionId)!.id
    const wrongOpt1 = questions[1]!.options.find((opt) => opt.id !== questions[1]!.correctOptionId)!.id

    // Cycle 1: Student finishes video, answers 0/2 (0%) -> FAILS
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    const cycle1 = validateExerciseSubmission({
      questions,
      selectedAnswers: { 0: wrongOpt0, 1: wrongOpt1 },
    })
    assert.equal(cycle1.passed, false)
    assert.equal(cycle1.scorePercent, 0)
    tracker.resetForRequiredReplay(Date.now())
    assert.equal(tracker.getMaxSeekableTime(), 0)

    // Cycle 2: Student re-watches video, answers 1/2 (50%) -> FAILS AGAIN
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    const cycle2 = validateExerciseSubmission({
      questions,
      selectedAnswers: { 0: questions[0]!.correctOptionId, 1: wrongOpt1 },
    })
    assert.equal(cycle2.passed, false)
    assert.equal(cycle2.scorePercent, 50)
    tracker.resetForRequiredReplay(Date.now())
    assert.equal(tracker.getMaxSeekableTime(), 0)

    // Cycle 3: Student re-watches video, answers 2/2 (100%) -> PASSES (>= 80%)
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    const cycle3 = validateExerciseSubmission({
      questions,
      selectedAnswers: { 0: questions[0]!.correctOptionId, 1: questions[1]!.correctOptionId },
    })
    assert.equal(cycle3.passed, true)
    assert.equal(cycle3.scorePercent, 100)
    tracker.markLessonCompleted()
    assert.equal(tracker.getSnapshot().isLessonCompleted, true)
    assert.equal(tracker.getSnapshot().lessonProgressPercent, 100)
  })

  it('persists progress and retry state across page refreshes at each stage', () => {
    // Stage 1: Failed exercise sets retry state
    const tracker = new VideoWatchTracker()
    tracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 99,
      isCompleted: false,
    })
    tracker.resetForRequiredReplay(Date.now())

    // Refresh page while at 0%:
    const freshTracker = new VideoWatchTracker()
    const init1 = freshTracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 0,
      savedProgressPercent: 0,
      isCompleted: false,
    })
    assert.equal(init1.restorePosition, 0)
    assert.equal(freshTracker.getMaxSeekableTime(), 0)
    assert.equal(freshTracker.getSnapshot().lessonProgressPercent, 0)
    assert.equal(freshTracker.isVideoCompleted(), false)

    // Stage 2: Watched 240s (40%), refreshed page:
    const resumedTracker = new VideoWatchTracker()
    const init2 = resumedTracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 240,
      savedProgressPercent: 40,
      isCompleted: false,
    })
    assert.equal(init2.restorePosition, 240)
    assert.equal(resumedTracker.getMaxSeekableTime(), 240)
    // Backward seeking permitted
    assert.equal(resumedTracker.beginAuthorizedSeek(100, Date.now()), true)
    // Forward seeking beyond 240 blocked
    assert.equal(resumedTracker.beginAuthorizedSeek(300, Date.now()), false)
    assert.equal(resumedTracker.isVideoCompleted(), false)

    // Stage 3: After passing with >= 80% and completed, refreshed page:
    const completedTracker = new VideoWatchTracker()
    completedTracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 100,
      isCompleted: true,
    })
    assert.equal(completedTracker.getSnapshot().isLessonCompleted, true)
    assert.equal(completedTracker.getSnapshot().lessonProgressPercent, 100)
    // Seeking anywhere allowed for completed lesson
    assert.equal(completedTracker.getMaxSeekableTime(), 600)
    // Replay does not reset completed status
    completedTracker.resetForReplay(Date.now())
    assert.equal(completedTracker.getSnapshot().isLessonCompleted, true)
    assert.equal(completedTracker.getSnapshot().lessonProgressPercent, 100)
    assert.equal(completedTracker.getMaxSeekableTime(), 600)
  })

  it('CASE B: redoing exercise on an already-completed lesson with score < 80% preserves 100% progress and never requires rewatch', () => {
    const wrongOpt0 = questions[0]!.options.find((opt) => opt.id !== questions[0]!.correctOptionId)!.id
    const wrongOpt1 = questions[1]!.options.find((opt) => opt.id !== questions[1]!.correctOptionId)!.id

    const redoResult = validateExerciseSubmission({
      questions,
      selectedAnswers: { 0: wrongOpt0, 1: wrongOpt1 },
      isAlreadyCompleted: true,
    })

    assert.equal(redoResult.allAnswered, true)
    assert.equal(redoResult.scorePercent, 0)
    assert.equal(redoResult.passed, false)
    assert.equal(redoResult.message.includes('100%'), true)
    assert.equal(redoResult.message.includes('xem lại video từ đầu'), false)

    // Completed tracker must remain 100% completed even if resetForRequiredReplay is invoked
    const completedTracker = new VideoWatchTracker()
    completedTracker.initializeForLesson({
      lessonId: dummyLesson.id,
      duration: 600,
      savedPositionSeconds: 600,
      savedProgressPercent: 100,
      isCompleted: true,
    })
    completedTracker.resetForRequiredReplay(Date.now())
    const snap = completedTracker.getSnapshot()
    assert.equal(snap.isLessonCompleted, true)
    assert.equal(snap.lessonProgressPercent, 100)
    assert.equal(snap.videoWatchedPercent, 100)
    assert.equal(completedTracker.getMaxSeekableTime(), 600)
  })
})

describe('Sidebar Lesson Information Display', () => {
  it('Case A: formats completed lesson with duration, status, saved playback position, and passing exercise score', () => {
    const info = formatSidebarLessonInfo(
      {
        duration: '18:20',
        status: 'completed',
        progressPercent: 100,
        lastPositionSeconds: 705, // 11:45
      },
      { scorePercent: 85, passed: true }
    )

    assert.equal(info.durationStatusLine, '18:20 · Đã hoàn thành')
    assert.equal(info.playbackPositionLine, 'Vị trí xem: 11:45')
    assert.equal(info.exerciseScoreLine, 'Bài tập: 85% · Đạt')
    assert.equal(info.isCompleted, true)
    assert.equal(info.exercisePassed, true)
  })

  it('Case B: formats in-progress lesson without exercise attempt as 0% · Chưa đạt', () => {
    const info = formatSidebarLessonInfo(
      {
        duration: '18:20',
        status: 'in_progress',
        progressPercent: 65,
        lastPositionSeconds: 705, // 11:45
      },
      undefined
    )

    assert.equal(info.durationStatusLine, '18:20 · Đang học 65%')
    assert.equal(info.playbackPositionLine, 'Vị trí xem: 11:45')
    assert.equal(info.exerciseScoreLine, 'Bài tập: 0% · Chưa đạt')
    assert.equal(info.isCompleted, false)
    assert.equal(info.exercisePassed, false)
  })

  it('displays reset playback position and latest failed attempt score on retry', () => {
    const afterFirstFail = formatSidebarLessonInfo(
      {
        duration: '18:20',
        status: 'not_started',
        progressPercent: 0,
        lastPositionSeconds: 0,
      },
      { scorePercent: 50, passed: false }
    )
    assert.equal(afterFirstFail.durationStatusLine, '18:20 · Đang học 0%')
    assert.equal(afterFirstFail.playbackPositionLine, 'Vị trí xem: 00:00')
    assert.equal(afterFirstFail.exerciseScoreLine, 'Bài tập: 50% · Chưa đạt')

    // Retrying on an already-completed lesson updates exercise display to latest attempt while keeping Đã hoàn thành
    const completedRedoFail = formatSidebarLessonInfo(
      {
        duration: '18:20',
        status: 'completed',
        progressPercent: 100,
        lastPositionSeconds: 705,
      },
      { scorePercent: 50, passed: false }
    )
    assert.equal(completedRedoFail.durationStatusLine, '18:20 · Đã hoàn thành')
    assert.equal(completedRedoFail.playbackPositionLine, 'Vị trí xem: 11:45')
    assert.equal(completedRedoFail.exerciseScoreLine, 'Bài tập: 50% · Chưa đạt')
  })
})
