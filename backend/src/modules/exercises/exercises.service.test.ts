import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ExerciseRequestError } from './exercises.errors.js'
import type { ExercisesRepository } from './exercises.repository.js'
import { ExercisesService } from './exercises.service.js'
import type { CourseExerciseAdminDetail, SaveCourseExerciseInput } from './exercises.types.js'

const COURSE_ID = '11111111-1111-4111-8111-111111111111'
const EXERCISE_ID = '22222222-2222-4222-8222-222222222222'
const TEACHER_ID = '33333333-3333-4333-8333-333333333333'
const STUDENT_ID = '44444444-4444-4444-8444-444444444444'

function makeSampleExercise(): CourseExerciseAdminDetail {
  return {
    id: EXERCISE_ID,
    course_id: COURSE_ID,
    title: 'Bài tập tổng hợp Grammar & Vocabulary',
    description: 'Kiểm tra cuối khóa',
    time_limit_minutes: 20,
    max_score: 5,
    status: 'published',
    question_count: 3,
    multiple_choice_count: 2,
    fill_blank_count: 1,
    created_at: '2026-11-28T00:00:00.000Z',
    updated_at: '2026-11-28T00:00:00.000Z',
    questions: [
      {
        id: 'q-mc-single',
        sort_order: 1,
        question_type: 'multiple_choice',
        content: 'Choose the synonym of eloquent (6 options).',
        points: 1,
        options: ['Silent', 'Articulate', 'Dull', 'Vague', 'Brief', 'Harsh'],
        allow_multiple: false,
        correct_indices: [1],
      },
      {
        id: 'q-mc-multi',
        sort_order: 2,
        question_type: 'multiple_choice',
        content: 'Select ALL modal verbs:',
        points: 2,
        options: ['Can', 'Walk', 'Should', 'Must', 'Table'],
        allow_multiple: true,
        correct_indices: [0, 2, 3],
      },
      {
        id: 'q-fill',
        sort_order: 3,
        question_type: 'fill_blank',
        content: 'She ___ to school by ___ every morning.',
        points: 2,
        blanks: [
          { accepted_answers: ['goes', 'walks', 'cycles'] },
          { accepted_answers: ['bus', 'bicycle'] },
        ],
        case_sensitive: false,
      },
    ],
  }
}

function createFakeRepo(overrides: Partial<ExercisesRepository> = {}): ExercisesRepository {
  const sample = makeSampleExercise()
  return {
    findCourseAccess: async () => ({
      exists: true,
      allowed: true,
      courseId: COURSE_ID,
      courseTitle: 'Ngữ pháp tiếng Anh',
      courseTeacherId: TEACHER_ID,
    }),
    resolveOwnerProfileId: async (userId: string) => userId,
    listByCourse: async () => [sample],
    findById: async () => sample,
    createForCourse: async (_courseId: string, _ownerId: string, input: SaveCourseExerciseInput) => ({
      ...sample,
      title: input.title,
      description: input.description ?? null,
    }),
    updateExercise: async () => sample,
    deleteExercise: async () => true,
    saveStudentAttempt: async () => true,
    ...overrides,
  } as unknown as ExercisesRepository
}

describe('ExercisesService', () => {
  it('supports unlimited options for multiple choice and multiple accepted answers for fill_blank', async () => {
    let capturedOptionsCount = 0
    let capturedBlanksCount = 0
    const repo = createFakeRepo({
      createForCourse: async (_courseId: string, _ownerId: string, input: SaveCourseExerciseInput) => {
        const mc = input.questions[0]
        const fb = input.questions[1]
        if (mc?.question_type === 'multiple_choice') capturedOptionsCount = mc.options.length
        if (fb?.question_type === 'fill_blank') capturedBlanksCount = fb.blanks[0]?.accepted_answers.length ?? 0
        return makeSampleExercise()
      },
    })
    const service = new ExercisesService(repo)

    await service.createCourseExercise(
      COURSE_ID,
      { id: TEACHER_ID, role: 'ADMIN' },
      {
        title: 'Unit 1 Review',
        questions: [
          {
            question_type: 'multiple_choice',
            content: 'Pick two vowels',
            allow_multiple: true,
            options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            correct_indices: [0, 4],
          },
          {
            question_type: 'fill_blank',
            content: 'I ___ English.',
            blanks: [{ accepted_answers: ['study', 'learn', 'practice', 'study'] }],
          },
        ],
      }
    )

    assert.equal(capturedOptionsCount, 7)
    assert.equal(capturedBlanksCount, 3)
  })

  it('rejects multiple correct answers when allow_multiple is false', async () => {
    const service = new ExercisesService(createFakeRepo())
    await assert.rejects(
      () =>
        service.createCourseExercise(
          COURSE_ID,
          { id: TEACHER_ID, role: 'ADMIN' },
          {
            title: 'Invalid single choice',
            questions: [
              {
                question_type: 'multiple_choice',
                content: 'Pick one',
                allow_multiple: false,
                options: ['A', 'B', 'C'],
                correct_indices: [0, 1],
              },
            ],
          }
        ),
      (err: unknown) => err instanceof ExerciseRequestError && err.status === 400
    )
  })

  it('auto-grades single-choice, multi-choice, and fill_blank with multiple accepted answers', async () => {
    let savedAttempt = false
    const service = new ExercisesService(
      createFakeRepo({
        saveStudentAttempt: async () => {
          savedAttempt = true
          return true
        },
      })
    )

    const result = await service.submitCourseExercise(
      EXERCISE_ID,
      { id: STUDENT_ID, role: 'STUDENT' },
      {
        answers: [
          { question_id: 'q-mc-single', selected_indices: [1] },
          { question_id: 'q-mc-multi', selected_indices: [3, 0, 2] }, // out of order should still pass
          { question_id: 'q-fill', blank_answers: ['  CYCLES  ', 'Bus'] }, // whitespace + case insensitive
        ],
      }
    )

    assert.equal(result.total_questions, 3)
    assert.equal(result.correct_count, 3)
    assert.equal(result.earned_points, 5)
    assert.equal(result.max_points, 5)
    assert.equal(result.score_percent, 100)
    assert.equal(result.passed, true)
    assert.equal(result.attempt_saved, true)
    assert.equal(savedAttempt, true)
  })

  it('marks partial or over-selected multi-choice as incorrect and does not persist admin test runs', async () => {
    let savedAttempt = false
    const service = new ExercisesService(
      createFakeRepo({
        saveStudentAttempt: async () => {
          savedAttempt = true
          return true
        },
      })
    )

    const result = await service.submitCourseExercise(
      EXERCISE_ID,
      { id: TEACHER_ID, role: 'ADMIN' },
      {
        answers: [
          { question_id: 'q-mc-single', selected_indices: [1] },
          { question_id: 'q-mc-multi', selected_indices: [0, 2] }, // missing index 3
          { question_id: 'q-fill', blank_answers: ['goes', 'car'] }, // second blank wrong
        ],
      }
    )

    assert.equal(result.correct_count, 1)
    assert.equal(result.earned_points, 1)
    assert.equal(result.max_points, 5)
    assert.equal(result.score_percent, 20)
    assert.equal(result.passed, false)
    assert.equal(result.attempt_saved, false)
    assert.equal(savedAttempt, false)
  })

  it('hides correct answers when student requests published exercise detail', async () => {
    const service = new ExercisesService(createFakeRepo())
    const detail = await service.getExerciseDetail(EXERCISE_ID, {
      id: STUDENT_ID,
      role: 'STUDENT',
    })

    for (const q of detail.questions) {
      assert.equal('correct_indices' in q, false)
      assert.equal('blanks' in q, false)
    }
    const fillQ = detail.questions[2]
    assert.equal(fillQ?.question_type, 'fill_blank')
    if (fillQ && fillQ.question_type === 'fill_blank' && 'blank_count' in fillQ) {
      assert.equal(fillQ.blank_count, 2)
    }
  })

  it('defaults max_score to 10 and automatically splits points evenly across questions', async () => {
    let savedInput: SaveCourseExerciseInput | null = null
    const service = new ExercisesService(
      createFakeRepo({
        createForCourse: async (_courseId: string, _ownerId: string, input: SaveCourseExerciseInput) => {
          savedInput = input
          return makeSampleExercise()
        },
      })
    )

    await service.createCourseExercise(
      COURSE_ID,
      { id: TEACHER_ID, role: 'ADMIN' },
      {
        title: '5-question default 10-point exercise',
        questions: Array.from({ length: 5 }, (_, i) => ({
          question_type: 'multiple_choice' as const,
          content: `Question ${i + 1}`,
          allow_multiple: false,
          options: ['A', 'B'],
          correct_indices: [0],
        })),
      }
    )

    assert.ok(savedInput)
    const captured = savedInput as SaveCourseExerciseInput
    assert.equal(captured.max_score, 10)
    assert.deepEqual(
      captured.questions.map((q) => q.points),
      [2, 2, 2, 2, 2]
    )
  })
})
