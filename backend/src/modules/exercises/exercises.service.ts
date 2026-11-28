import { ExerciseRequestError } from './exercises.errors.js'
import { ExercisesRepository, UUID_PATTERN } from './exercises.repository.js'
import type {
  AuthenticatedExerciseUser,
  CourseExerciseAdminDetail,
  CourseExerciseStudentDetail,
  CourseExerciseSummary,
  ExerciseAnswerSubmission,
  ExerciseQuestionInput,
  ExerciseQuestionStudentView,
  ExerciseStatus,
  SaveCourseExerciseInput,
  SubmitCourseExerciseQuestionResult,
  SubmitCourseExerciseResult,
} from './exercises.types.js'

const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 2000
const OPTION_MAX_LENGTH = 500
const ACCEPTED_ANSWER_MAX_LENGTH = 200
const MAX_TIME_LIMIT_MINUTES = 600
const DEFAULT_EXERCISE_MAX_SCORE = 10
const MAX_EXERCISE_SCORE = 1000

/**
 * Chia đều tổng điểm (làm tròn 2 chữ số thập phân) cho từng câu hỏi,
 * đảm bảo tổng điểm các câu luôn khớp chính xác với tổng điểm đã thiết lập.
 */
function splitTotalScoreEvenly(totalScore: number, count: number): number[] {
  if (count <= 0) return []
  const totalCents = Math.round(totalScore * 100)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  return Array.from({ length: count }, (_, idx) => {
    const extra = idx >= count - remainder ? 1 : 0
    return (baseCents + extra) / 100
  })
}

function normalizeBlankAnswer(value: string, caseSensitive: boolean): string {
  const collapsed = value.trim().replace(/\s+/g, ' ')
  return caseSensitive ? collapsed : collapsed.toLowerCase()
}

function toStudentDetail(detail: CourseExerciseAdminDetail): CourseExerciseStudentDetail {
  const questions: ExerciseQuestionStudentView[] = detail.questions.map((question) => {
    if (question.question_type === 'multiple_choice') {
      return {
        id: question.id,
        sort_order: question.sort_order,
        question_type: 'multiple_choice',
        content: question.content,
        points: question.points,
        options: question.options,
        allow_multiple: question.allow_multiple,
      }
    }
    return {
      id: question.id,
      sort_order: question.sort_order,
      question_type: 'fill_blank',
      content: question.content,
      points: question.points,
      blank_count: question.blanks.length,
      case_sensitive: question.case_sensitive,
    }
  })

  return {
    id: detail.id,
    course_id: detail.course_id,
    title: detail.title,
    description: detail.description,
    time_limit_minutes: detail.time_limit_minutes,
    max_score: detail.max_score,
    status: detail.status,
    question_count: detail.question_count,
    multiple_choice_count: detail.multiple_choice_count,
    fill_blank_count: detail.fill_blank_count,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
    questions,
  }
}

export class ExercisesService {
  constructor(private readonly repo: ExercisesRepository = new ExercisesRepository()) {}

  private assertUuid(value: string, label: string): string {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!UUID_PATTERN.test(trimmed)) {
      throw new ExerciseRequestError(`${label} không hợp lệ.`, 400)
    }
    return trimmed
  }

  private async assertCourseAccess(
    courseIdentifier: string,
    user: AuthenticatedExerciseUser
  ): Promise<{ courseId: string; courseTitle: string; courseTeacherId: string }> {
    const trimmed = typeof courseIdentifier === 'string' ? courseIdentifier.trim() : ''
    if (!trimmed) {
      throw new ExerciseRequestError('Thiếu mã khóa học.', 400)
    }
    const access = await this.repo.findCourseAccess(trimmed, user)
    if (!access.exists) {
      throw new ExerciseRequestError('Không tìm thấy khóa học.', 404)
    }
    if (!access.allowed) {
      if (user.role === 'STUDENT') {
        throw new ExerciseRequestError(
          'Học viên chưa đăng ký hoặc chưa hoàn tất thanh toán khóa học này.',
          403
        )
      }
      throw new ExerciseRequestError('Bạn chưa được phân công phụ trách khóa học này.', 403)
    }
    return {
      courseId: access.courseId,
      courseTitle: access.courseTitle,
      courseTeacherId: access.courseTeacherId,
    }
  }

  private validateQuestionInput(raw: unknown, index: number): ExerciseQuestionInput {
    if (!raw || typeof raw !== 'object') {
      throw new ExerciseRequestError(`Câu hỏi ${index + 1} không hợp lệ.`, 400)
    }
    const item = raw as Record<string, unknown>
    const questionType = item.question_type
    const content = typeof item.content === 'string' ? item.content.trim() : ''
    if (!content) {
      throw new ExerciseRequestError(`Câu hỏi ${index + 1}: nội dung câu hỏi không được để trống.`, 400)
    }

    const rawPoints = item.points ?? 1
    const points = Number(rawPoints)
    if (!Number.isFinite(points) || points <= 0 || points > 100) {
      throw new ExerciseRequestError(`Câu hỏi ${index + 1}: điểm phải lớn hơn 0 và tối đa 100.`, 400)
    }

    if (questionType === 'multiple_choice') {
      if (!Array.isArray(item.options) || item.options.length < 2) {
        throw new ExerciseRequestError(
          `Câu hỏi ${index + 1}: trắc nghiệm cần ít nhất 2 lựa chọn.`,
          400
        )
      }
      const options = item.options.map((opt, optIdx) => {
        const text = typeof opt === 'string' ? opt.trim() : ''
        if (!text || text.length > OPTION_MAX_LENGTH) {
          throw new ExerciseRequestError(
            `Câu hỏi ${index + 1}: lựa chọn ${optIdx + 1} không được trống và tối đa ${OPTION_MAX_LENGTH} ký tự.`,
            400
          )
        }
        return text
      })

      const allowMultiple = Boolean(item.allow_multiple)
      const rawCorrect = Array.isArray(item.correct_indices) ? item.correct_indices : []
      const correctIndices = [
        ...new Set(
          rawCorrect
            .map((val) => Number(val))
            .filter((val) => Number.isInteger(val) && val >= 0 && val < options.length)
        ),
      ].sort((a, b) => a - b)

      if (correctIndices.length === 0) {
        throw new ExerciseRequestError(
          `Câu hỏi ${index + 1}: vui lòng chọn ít nhất 1 đáp án đúng.`,
          400
        )
      }
      if (!allowMultiple && correctIndices.length > 1) {
        throw new ExerciseRequestError(
          `Câu hỏi ${index + 1}: chế độ chọn 1 đáp án chỉ được phép có 1 đáp án đúng.`,
          400
        )
      }

      return {
        question_type: 'multiple_choice',
        content,
        points,
        allow_multiple: allowMultiple,
        options,
        correct_indices: correctIndices,
      }
    }

    if (questionType === 'fill_blank') {
      if (!Array.isArray(item.blanks) || item.blanks.length === 0) {
        throw new ExerciseRequestError(
          `Câu hỏi ${index + 1}: câu điền từ phải có ít nhất 1 ô trống và đáp án đúng.`,
          400
        )
      }

      const blanks = item.blanks.map((rawBlank, blankIdx) => {
        const blankObj =
          rawBlank && typeof rawBlank === 'object' ? (rawBlank as Record<string, unknown>) : {}
        const rawAnswers = Array.isArray(blankObj.accepted_answers) ? blankObj.accepted_answers : []
        const seen = new Set<string>()
        const acceptedAnswers: string[] = []
        for (const ans of rawAnswers) {
          const text = typeof ans === 'string' ? ans.trim() : ''
          if (!text) continue
          if (text.length > ACCEPTED_ANSWER_MAX_LENGTH) {
            throw new ExerciseRequestError(
              `Câu hỏi ${index + 1} (ô trống ${blankIdx + 1}): đáp án tối đa ${ACCEPTED_ANSWER_MAX_LENGTH} ký tự.`,
              400
            )
          }
          const key = text.toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            acceptedAnswers.push(text)
          }
        }
        if (acceptedAnswers.length === 0) {
          throw new ExerciseRequestError(
            `Câu hỏi ${index + 1} (ô trống ${blankIdx + 1}): vui lòng nhập ít nhất 1 đáp án đúng.`,
            400
          )
        }
        return { accepted_answers: acceptedAnswers }
      })

      return {
        question_type: 'fill_blank',
        content,
        points,
        blanks,
        case_sensitive: Boolean(item.case_sensitive),
      }
    }

    throw new ExerciseRequestError(
      `Câu hỏi ${index + 1}: chỉ hỗ trợ dạng 'multiple_choice' hoặc 'fill_blank'.`,
      400
    )
  }

  private validateExerciseInput(rawBody: unknown): SaveCourseExerciseInput {
    if (!rawBody || typeof rawBody !== 'object') {
      throw new ExerciseRequestError('Dữ liệu bài tập không hợp lệ.', 400)
    }
    const body = rawBody as Record<string, unknown>

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > TITLE_MAX_LENGTH) {
      throw new ExerciseRequestError(
        `Tên bài tập là bắt buộc và tối đa ${TITLE_MAX_LENGTH} ký tự.`,
        400
      )
    }

    let description: string | null = null
    if (typeof body.description === 'string' && body.description.trim()) {
      description = body.description.trim()
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        throw new ExerciseRequestError(
          `Mô tả bài tập tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`,
          400
        )
      }
    }

    let timeLimitMinutes: number | null = null
    if (body.time_limit_minutes !== undefined && body.time_limit_minutes !== null && body.time_limit_minutes !== '') {
      const parsedLimit = Number(body.time_limit_minutes)
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_TIME_LIMIT_MINUTES) {
        throw new ExerciseRequestError(
          `Thời gian làm bài phải là số nguyên từ 1 đến ${MAX_TIME_LIMIT_MINUTES} phút.`,
          400
        )
      }
      timeLimitMinutes = parsedLimit
    }

    const rawStatus = body.status ?? 'published'
    const allowedStatuses: ExerciseStatus[] = ['draft', 'published', 'archived']
    if (typeof rawStatus !== 'string' || !allowedStatuses.includes(rawStatus as ExerciseStatus)) {
      throw new ExerciseRequestError('Trạng thái bài tập không hợp lệ.', 400)
    }

    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      throw new ExerciseRequestError('Bài tập phải có ít nhất 1 câu hỏi.', 400)
    }

    let maxScore = DEFAULT_EXERCISE_MAX_SCORE
    if (body.max_score !== undefined && body.max_score !== null && body.max_score !== '') {
      const parsedMaxScore = Number(body.max_score)
      if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0 || parsedMaxScore > MAX_EXERCISE_SCORE) {
        throw new ExerciseRequestError(
          `Tổng điểm bài tập phải lớn hơn 0 và tối đa ${MAX_EXERCISE_SCORE}.`,
          400
        )
      }
      maxScore = Math.round(parsedMaxScore * 100) / 100
    }

    const validatedQuestions = body.questions.map((q, idx) => this.validateQuestionInput(q, idx))
    const distributedPoints = splitTotalScoreEvenly(maxScore, validatedQuestions.length)
    const questions = validatedQuestions.map((q, idx) => ({
      ...q,
      points: distributedPoints[idx] ?? 1,
    }))

    return {
      title,
      description,
      time_limit_minutes: timeLimitMinutes,
      max_score: maxScore,
      status: rawStatus as ExerciseStatus,
      questions,
    }
  }

  async listExercisesForCourse(
    courseIdentifier: string,
    user: AuthenticatedExerciseUser
  ): Promise<CourseExerciseSummary[]> {
    const { courseId } = await this.assertCourseAccess(courseIdentifier, user)
    const includeUnpublished = user.role === 'ADMIN' || user.role === 'TEACHER'
    return this.repo.listByCourse(courseId, includeUnpublished)
  }

  async getExerciseDetail(
    exerciseId: string,
    user: AuthenticatedExerciseUser
  ): Promise<CourseExerciseAdminDetail | CourseExerciseStudentDetail> {
    const validId = this.assertUuid(exerciseId, 'Mã bài tập')
    const detail = await this.repo.findById(validId)
    if (!detail) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }

    await this.assertCourseAccess(detail.course_id, user)

    if (user.role === 'STUDENT') {
      if (detail.status !== 'published') {
        throw new ExerciseRequestError('Bài tập này chưa được công khai.', 403)
      }
      return toStudentDetail(detail)
    }

    return detail
  }

  async createCourseExercise(
    courseIdentifier: string,
    user: AuthenticatedExerciseUser,
    rawBody: unknown
  ): Promise<CourseExerciseAdminDetail> {
    if (user.role === 'STUDENT') {
      throw new ExerciseRequestError('Bạn không có quyền tạo bài tập.', 403)
    }
    const { courseId, courseTeacherId } = await this.assertCourseAccess(courseIdentifier, user)
    const input = this.validateExerciseInput(rawBody)
    const ownerProfileId = await this.repo.resolveOwnerProfileId(user.id, courseTeacherId)
    return this.repo.createForCourse(courseId, ownerProfileId, input)
  }

  async updateCourseExercise(
    exerciseId: string,
    user: AuthenticatedExerciseUser,
    rawBody: unknown
  ): Promise<CourseExerciseAdminDetail> {
    if (user.role === 'STUDENT') {
      throw new ExerciseRequestError('Bạn không có quyền sửa bài tập.', 403)
    }
    const validId = this.assertUuid(exerciseId, 'Mã bài tập')
    const existing = await this.repo.findById(validId)
    if (!existing) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }
    await this.assertCourseAccess(existing.course_id, user)

    const input = this.validateExerciseInput(rawBody)
    const updated = await this.repo.updateExercise(validId, input)
    if (!updated) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }
    return updated
  }

  async deleteCourseExercise(
    exerciseId: string,
    user: AuthenticatedExerciseUser
  ): Promise<void> {
    if (user.role === 'STUDENT') {
      throw new ExerciseRequestError('Bạn không có quyền xóa bài tập.', 403)
    }
    const validId = this.assertUuid(exerciseId, 'Mã bài tập')
    const existing = await this.repo.findById(validId)
    if (!existing) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }
    await this.assertCourseAccess(existing.course_id, user)

    const deleted = await this.repo.deleteExercise(validId)
    if (!deleted) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }
  }

  async submitCourseExercise(
    exerciseId: string,
    user: AuthenticatedExerciseUser,
    rawBody: unknown
  ): Promise<SubmitCourseExerciseResult> {
    const validId = this.assertUuid(exerciseId, 'Mã bài tập')
    const exercise = await this.repo.findById(validId)
    if (!exercise) {
      throw new ExerciseRequestError('Không tìm thấy bài tập.', 404)
    }

    await this.assertCourseAccess(exercise.course_id, user)

    if (user.role === 'STUDENT' && exercise.status !== 'published') {
      throw new ExerciseRequestError('Bài tập này chưa được công khai.', 403)
    }

    const body = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {}
    if (!Array.isArray(body.answers)) {
      throw new ExerciseRequestError('Vui lòng gửi danh sách câu trả lời (answers).', 400)
    }

    const answersByQuestionId = new Map<string, Record<string, unknown>>()
    for (const rawAns of body.answers) {
      if (!rawAns || typeof rawAns !== 'object') continue
      const item = rawAns as Record<string, unknown>
      if (typeof item.question_id === 'string' && item.question_id.trim()) {
        answersByQuestionId.set(item.question_id.trim(), item)
      }
    }

    const results: SubmitCourseExerciseQuestionResult[] = []
    const storedAnswerPayloads = new Map<string, Record<string, unknown>>()
    let earnedPoints = 0
    let maxPoints = 0
    let correctCount = 0

    for (const question of exercise.questions) {
      maxPoints += question.points
      const given = answersByQuestionId.get(question.id)

      if (question.question_type === 'multiple_choice') {
        const rawIndices = Array.isArray(given?.selected_indices)
          ? given.selected_indices
          : typeof given?.selected_index === 'number'
            ? [given.selected_index]
            : []

        const selectedSorted = [
          ...new Set(
            rawIndices
              .map((idx) => Number(idx))
              .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < question.options.length)
          ),
        ].sort((a, b) => a - b)

        const expectedSorted = [...question.correct_indices].sort((a, b) => a - b)
        const isCorrect =
          expectedSorted.length > 0 &&
          selectedSorted.length === expectedSorted.length &&
          selectedSorted.every((val, idx) => val === expectedSorted[idx])

        const questionEarned = isCorrect ? question.points : 0
        earnedPoints += questionEarned
        if (isCorrect) correctCount += 1

        storedAnswerPayloads.set(question.id, { selected_indices: selectedSorted })
        results.push({
          question_id: question.id,
          question_type: 'multiple_choice',
          is_correct: isCorrect,
          earned_points: questionEarned,
          max_points: question.points,
          correct_indices: expectedSorted,
        })
      } else {
        const rawBlankAnswers = Array.isArray(given?.blank_answers)
          ? given.blank_answers.map((val) => (typeof val === 'string' ? val : String(val ?? '')))
          : typeof given?.answer_text === 'string'
            ? [given.answer_text]
            : []

        const isCorrect =
          question.blanks.length > 0 &&
          question.blanks.every((blank, blankIdx) => {
            const submittedVal = normalizeBlankAnswer(
              rawBlankAnswers[blankIdx] ?? '',
              question.case_sensitive
            )
            if (!submittedVal) return false
            return blank.accepted_answers.some(
              (accepted) =>
                normalizeBlankAnswer(accepted, question.case_sensitive) === submittedVal
            )
          })

        const questionEarned = isCorrect ? question.points : 0
        earnedPoints += questionEarned
        if (isCorrect) correctCount += 1

        storedAnswerPayloads.set(question.id, { blank_answers: rawBlankAnswers })
        results.push({
          question_id: question.id,
          question_type: 'fill_blank',
          is_correct: isCorrect,
          earned_points: questionEarned,
          max_points: question.points,
          accepted_answers_per_blank: question.blanks.map((b) => b.accepted_answers),
        })
      }
    }

    const scorePercent = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0
    const passed = results.length > 0 && scorePercent >= 60

    let attemptSaved = false
    if (user.role === 'STUDENT') {
      attemptSaved = await this.repo.saveStudentAttempt(
        exercise.id,
        user.id,
        scorePercent,
        results,
        storedAnswerPayloads
      )
    }

    return {
      exercise_id: exercise.id,
      total_questions: exercise.questions.length,
      correct_count: correctCount,
      earned_points: Number(earnedPoints.toFixed(2)),
      max_points: Number(maxPoints.toFixed(2)),
      score_percent: scorePercent,
      passed,
      attempt_saved: attemptSaved,
      results,
    }
  }
}

export const exercisesService = new ExercisesService()
export type { ExerciseAnswerSubmission }
