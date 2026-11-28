import { createSupabaseClient } from '../../config/supabase.js'
import type {
  AuthenticatedExerciseUser,
  CourseExerciseAdminDetail,
  CourseExerciseSummary,
  ExerciseQuestionAdminView,
  ExerciseQuestionInput,
  ExerciseStatus,
  SaveCourseExerciseInput,
  SubmitCourseExerciseQuestionResult,
} from './exercises.types.js'

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface ExerciseRow {
  id: string
  course_id: string
  lesson_id: string | null
  teacher_id: string
  title: string
  description: string | null
  time_limit_minutes: number | null
  max_score: number | string
  status: ExerciseStatus
  created_at: string
  updated_at: string
}

interface RawQuestionRow {
  id: string
  question_type: string
  content: string
  correct_answer: unknown
  points: number | string
}

export class ExercisesRepository {
  constructor(
    private readonly clientFactory: typeof createSupabaseClient = createSupabaseClient
  ) {}

  private getClient() {
    return this.clientFactory()
  }

  async findCourseAccess(
    courseIdentifier: string,
    user: AuthenticatedExerciseUser
  ): Promise<{
    exists: boolean
    allowed: boolean
    courseId: string
    courseTitle: string
    courseTeacherId: string
  }> {
    const client = this.getClient()
    const column = UUID_PATTERN.test(courseIdentifier) ? 'id' : 'slug'
    const { data: course, error } = await client
      .from('courses')
      .select('id, title, teacher_id')
      .eq(column, courseIdentifier)
      .maybeSingle()

    if (error) {
      throw new Error(`Không thể kiểm tra khóa học: ${error.message}`, { cause: error })
    }
    if (!course) {
      return { exists: false, allowed: false, courseId: '', courseTitle: '', courseTeacherId: '' }
    }

    const base = {
      exists: true,
      courseId: course.id as string,
      courseTitle: course.title as string,
      courseTeacherId: course.teacher_id as string,
    }

    if (user.role === 'ADMIN') {
      return { ...base, allowed: true }
    }

    if (user.role === 'TEACHER') {
      if (course.teacher_id === user.id) {
        return { ...base, allowed: true }
      }
      const { data: assigned } = await client
        .from('course_teachers')
        .select('teacher_id')
        .eq('course_id', course.id)
        .eq('teacher_id', user.id)
        .maybeSingle()
      return { ...base, allowed: assigned !== null }
    }

    const { data: enrollment } = await client
      .from('course_enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', course.id)
      .in('status', ['active', 'completed'])
      .limit(1)
      .maybeSingle()
    if (enrollment) {
      return { ...base, allowed: true }
    }

    const { data: paidOrder } = await client
      .from('course_orders')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', course.id)
      .eq('status', 'paid')
      .eq('currency', 'VND')
      .gt('amount', 0)
      .limit(1)
      .maybeSingle()

    return { ...base, allowed: paidOrder !== null }
  }

  /**
   * Đảm bảo teacher_id gắn vào bảng exercises luôn trỏ tới profile hợp lệ.
   * Admin đăng nhập Supabase Auth vẫn có thể không có bản ghi tương ứng trong profiles
   * ở một số môi trường thử nghiệm, khi đó fallback về teacher_id của khóa học.
   */
  async resolveOwnerProfileId(userId: string, fallbackTeacherId: string): Promise<string> {
    const client = this.getClient()
    const { data } = await client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    return data?.id ? (data.id as string) : fallbackTeacherId
  }

  private mapQuestionRow(row: RawQuestionRow, sortOrder: number): ExerciseQuestionAdminView | null {
    const points = Number(row.points) || 1
    const payload = (row.correct_answer && typeof row.correct_answer === 'object'
      ? row.correct_answer
      : {}) as Record<string, unknown>

    if (row.question_type === 'multiple_choice') {
      const options = Array.isArray(payload.options)
        ? payload.options.map((item) => String(item))
        : []
      const rawIndices = Array.isArray(payload.correct_indices)
        ? payload.correct_indices
        : typeof payload.correct_index === 'number'
          ? [payload.correct_index]
          : []
      const correctIndices = [...new Set(
        rawIndices
          .map((idx) => Number(idx))
          .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < options.length)
      )].sort((a, b) => a - b)

      const allowMultiple =
        typeof payload.allow_multiple === 'boolean'
          ? payload.allow_multiple
          : correctIndices.length > 1

      return {
        id: row.id,
        sort_order: sortOrder,
        question_type: 'multiple_choice',
        content: row.content,
        points,
        options,
        allow_multiple: allowMultiple,
        correct_indices: correctIndices,
      }
    }

    if (row.question_type === 'fill_blank') {
      const rawBlanks = Array.isArray(payload.blanks) ? payload.blanks : []
      const blanks = rawBlanks.map((blank) => {
        const blankObj = blank && typeof blank === 'object' ? (blank as Record<string, unknown>) : {}
        const accepted = Array.isArray(blankObj.accepted_answers)
          ? blankObj.accepted_answers.map((ans) => String(ans).trim()).filter(Boolean)
          : []
        return { accepted_answers: accepted }
      })

      return {
        id: row.id,
        sort_order: sortOrder,
        question_type: 'fill_blank',
        content: row.content,
        points,
        blanks,
        case_sensitive: Boolean(payload.case_sensitive),
      }
    }

    return null
  }

  private buildCorrectAnswerPayload(question: ExerciseQuestionInput): Record<string, unknown> {
    if (question.question_type === 'multiple_choice') {
      return {
        options: question.options,
        correct_indices: question.correct_indices,
        allow_multiple: Boolean(question.allow_multiple),
      }
    }

    return {
      blanks: question.blanks.map((b) => ({ accepted_answers: b.accepted_answers })),
      case_sensitive: Boolean(question.case_sensitive),
    }
  }

  private async insertExerciseQuestions(
    exerciseId: string,
    questions: ExerciseQuestionInput[]
  ): Promise<void> {
    const client = this.getClient()

    for (const [index, question] of questions.entries()) {
      const points = question.points ?? 1
      const { data: qRow, error: qError } = await client
        .from('questions')
        .insert({
          question_type: question.question_type,
          content: question.content,
          correct_answer: this.buildCorrectAnswerPayload(question),
          points,
        })
        .select('id')
        .single()

      if (qError || !qRow) {
        throw new Error(`Không thể tạo câu hỏi ${index + 1}: ${qError?.message || 'no row'}`)
      }

      const { error: linkError } = await client.from('exercise_questions').insert({
        exercise_id: exerciseId,
        question_id: qRow.id,
        sort_order: index + 1,
        points,
      })

      if (linkError) {
        throw new Error(`Không thể gắn câu hỏi vào bài tập: ${linkError.message}`)
      }
    }
  }

  private async removeLinkedQuestions(exerciseId: string): Promise<void> {
    const client = this.getClient()
    const { data: links } = await client
      .from('exercise_questions')
      .select('question_id')
      .eq('exercise_id', exerciseId)

    await client.from('exercise_questions').delete().eq('exercise_id', exerciseId)

    const questionIds = (links ?? [])
      .map((item) => (item as { question_id?: string }).question_id)
      .filter((id): id is string => Boolean(id))

    if (questionIds.length > 0) {
      await client.from('questions').delete().in('id', questionIds)
    }
  }

  async listByCourse(
    courseId: string,
    includeUnpublished: boolean
  ): Promise<CourseExerciseSummary[]> {
    const client = this.getClient()
    let query = client
      .from('exercises')
      .select('id, course_id, lesson_id, teacher_id, title, description, time_limit_minutes, max_score, status, created_at, updated_at')
      .eq('course_id', courseId)
      .is('lesson_id', null)
      .order('created_at', { ascending: false })

    if (!includeUnpublished) {
      query = query.eq('status', 'published')
    }

    const { data: exercises, error } = await query
    if (error) {
      throw new Error(`Không thể tải danh sách bài tập: ${error.message}`, { cause: error })
    }

    const rows = (exercises ?? []) as ExerciseRow[]
    if (rows.length === 0) return []

    const exerciseIds = rows.map((row) => row.id)
    const { data: links, error: linksError } = await client
      .from('exercise_questions')
      .select('exercise_id, questions (question_type)')
      .in('exercise_id', exerciseIds)

    if (linksError) {
      throw new Error(`Không thể đếm câu hỏi bài tập: ${linksError.message}`, { cause: linksError })
    }

    const counts = new Map<
      string,
      { total: number; multipleChoice: number; fillBlank: number }
    >()

    for (const link of links ?? []) {
      const typed = link as {
        exercise_id: string
        questions?: { question_type?: string } | Array<{ question_type?: string }> | null
      }
      const q = Array.isArray(typed.questions) ? typed.questions[0] : typed.questions
      const current = counts.get(typed.exercise_id) ?? {
        total: 0,
        multipleChoice: 0,
        fillBlank: 0,
      }
      current.total += 1
      if (q?.question_type === 'multiple_choice') current.multipleChoice += 1
      if (q?.question_type === 'fill_blank') current.fillBlank += 1
      counts.set(typed.exercise_id, current)
    }

    return rows.map((row) => {
      const stat = counts.get(row.id) ?? { total: 0, multipleChoice: 0, fillBlank: 0 }
      return {
        id: row.id,
        course_id: row.course_id,
        title: row.title,
        description: row.description,
        time_limit_minutes: row.time_limit_minutes,
        max_score: Number(row.max_score) || 0,
        status: row.status,
        question_count: stat.total,
        multiple_choice_count: stat.multipleChoice,
        fill_blank_count: stat.fillBlank,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  }

  async findById(exerciseId: string): Promise<CourseExerciseAdminDetail | null> {
    const client = this.getClient()
    const { data: exercise, error } = await client
      .from('exercises')
      .select('id, course_id, lesson_id, teacher_id, title, description, time_limit_minutes, max_score, status, created_at, updated_at')
      .eq('id', exerciseId)
      .is('lesson_id', null)
      .maybeSingle()

    if (error) {
      throw new Error(`Không thể tải chi tiết bài tập: ${error.message}`, { cause: error })
    }
    if (!exercise) return null

    const typedExercise = exercise as ExerciseRow
    const { data: links, error: linksError } = await client
      .from('exercise_questions')
      .select('sort_order, points, questions (id, question_type, content, correct_answer, points)')
      .eq('exercise_id', typedExercise.id)
      .order('sort_order', { ascending: true })

    if (linksError) {
      throw new Error(`Không thể tải câu hỏi bài tập: ${linksError.message}`, { cause: linksError })
    }

    const questions: ExerciseQuestionAdminView[] = []
    for (const link of links ?? []) {
      const typedLink = link as {
        sort_order: number
        points: number | string
        questions?: RawQuestionRow | RawQuestionRow[] | null
      }
      const rawQ = Array.isArray(typedLink.questions)
        ? typedLink.questions[0]
        : typedLink.questions
      if (!rawQ) continue
      const mapped = this.mapQuestionRow(
        { ...rawQ, points: typedLink.points ?? rawQ.points },
        typedLink.sort_order
      )
      if (mapped) questions.push(mapped)
    }

    const multipleChoiceCount = questions.filter((q) => q.question_type === 'multiple_choice').length
    const fillBlankCount = questions.filter((q) => q.question_type === 'fill_blank').length

    return {
      id: typedExercise.id,
      course_id: typedExercise.course_id,
      title: typedExercise.title,
      description: typedExercise.description,
      time_limit_minutes: typedExercise.time_limit_minutes,
      max_score: Number(typedExercise.max_score) || 0,
      status: typedExercise.status,
      question_count: questions.length,
      multiple_choice_count: multipleChoiceCount,
      fill_blank_count: fillBlankCount,
      created_at: typedExercise.created_at,
      updated_at: typedExercise.updated_at,
      questions,
    }
  }

  async createForCourse(
    courseId: string,
    ownerId: string,
    input: SaveCourseExerciseInput
  ): Promise<CourseExerciseAdminDetail> {
    const client = this.getClient()
    const totalPoints =
      input.max_score ?? input.questions.reduce((sum, q) => sum + (q.points ?? 1), 0)

    const { data: exercise, error } = await client
      .from('exercises')
      .insert({
        teacher_id: ownerId,
        course_id: courseId,
        lesson_id: null,
        title: input.title,
        description: input.description ?? null,
        time_limit_minutes: input.time_limit_minutes ?? null,
        max_score: totalPoints,
        status: input.status ?? 'published',
      })
      .select('id')
      .single()

    if (error || !exercise) {
      throw new Error(`Không thể tạo bài tập: ${error?.message || 'no row'}`)
    }

    try {
      await this.insertExerciseQuestions(exercise.id as string, input.questions)
    } catch (insertError) {
      await this.deleteExercise(exercise.id as string).catch(() => {})
      throw insertError
    }

    const created = await this.findById(exercise.id as string)
    if (!created) {
      throw new Error('Không thể đọc lại bài tập vừa tạo.')
    }
    return created
  }

  async updateExercise(
    exerciseId: string,
    input: SaveCourseExerciseInput
  ): Promise<CourseExerciseAdminDetail | null> {
    const client = this.getClient()
    const totalPoints =
      input.max_score ?? input.questions.reduce((sum, q) => sum + (q.points ?? 1), 0)

    const { data: updatedRow, error } = await client
      .from('exercises')
      .update({
        title: input.title,
        description: input.description ?? null,
        time_limit_minutes: input.time_limit_minutes ?? null,
        max_score: totalPoints,
        status: input.status ?? 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseId)
      .is('lesson_id', null)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(`Không thể cập nhật bài tập: ${error.message}`, { cause: error })
    }
    if (!updatedRow) return null

    await this.removeLinkedQuestions(exerciseId)
    await this.insertExerciseQuestions(exerciseId, input.questions)

    return this.findById(exerciseId)
  }

  async deleteExercise(exerciseId: string): Promise<boolean> {
    const client = this.getClient()
    const { data: existing } = await client
      .from('exercises')
      .select('id')
      .eq('id', exerciseId)
      .is('lesson_id', null)
      .maybeSingle()

    if (!existing) return false

    const { data: attempts } = await client
      .from('exercise_attempts')
      .select('id')
      .eq('exercise_id', exerciseId)
    const attemptIds = (attempts ?? [])
      .map((item) => (item as { id?: string }).id)
      .filter((id): id is string => Boolean(id))

    if (attemptIds.length > 0) {
      await client.from('student_answers').delete().in('attempt_id', attemptIds)
      await client.from('exercise_attempts').delete().in('id', attemptIds)
    }

    await this.removeLinkedQuestions(exerciseId)

    const { data: deleted, error } = await client
      .from('exercises')
      .delete()
      .eq('id', exerciseId)
      .is('lesson_id', null)
      .select('id')

    if (error) {
      throw new Error(`Không thể xóa bài tập: ${error.message}`, { cause: error })
    }

    return Array.isArray(deleted) && deleted.length > 0
  }

  async saveStudentAttempt(
    exerciseId: string,
    studentId: string,
    scorePercent: number,
    results: SubmitCourseExerciseQuestionResult[],
    submittedAnswers: Map<string, Record<string, unknown>>
  ): Promise<boolean> {
    const client = this.getClient()
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('id', studentId)
      .maybeSingle()

    if (!profile) return false

    const { data: attempt, error: attemptError } = await client
      .from('exercise_attempts')
      .insert({
        exercise_id: exerciseId,
        student_id: studentId,
        submitted_at: new Date().toISOString(),
        score: scorePercent,
        status: 'graded',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      throw new Error(`Không thể lưu kết quả bài tập: ${attemptError?.message || 'no row'}`)
    }

    for (const res of results) {
      const rawAnswer = submittedAnswers.get(res.question_id) ?? {}
      await client.from('student_answers').upsert(
        {
          attempt_id: attempt.id,
          question_id: res.question_id,
          answer: rawAnswer,
          is_correct: res.is_correct,
          score: res.earned_points,
        },
        { onConflict: 'attempt_id,question_id' }
      )
    }

    return true
  }
}

export const exercisesRepository = new ExercisesRepository()
