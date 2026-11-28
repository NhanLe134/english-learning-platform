export type ExerciseStatus = 'draft' | 'published' | 'archived'
export type CourseExerciseQuestionType = 'multiple_choice' | 'fill_blank'

export interface MultipleChoiceQuestion {
  id: string
  sort_order: number
  question_type: 'multiple_choice'
  content: string
  points: number
  options: string[]
  allow_multiple: boolean
  correct_indices?: number[]
}

export interface FillBlankItem {
  accepted_answers: string[]
}

export interface FillBlankQuestion {
  id: string
  sort_order: number
  question_type: 'fill_blank'
  content: string
  points: number
  blanks?: FillBlankItem[]
  blank_count?: number
  case_sensitive: boolean
}

export type ExerciseQuestion = MultipleChoiceQuestion | FillBlankQuestion

export interface CourseExerciseSummary {
  id: string
  course_id: string
  title: string
  description: string | null
  time_limit_minutes: number | null
  max_score: number
  status: ExerciseStatus
  question_count: number
  multiple_choice_count: number
  fill_blank_count: number
  created_at: string
  updated_at: string
}

export interface CourseExerciseDetail extends CourseExerciseSummary {
  questions: ExerciseQuestion[]
}

export interface MultipleChoiceQuestionInput {
  question_type: 'multiple_choice'
  content: string
  points: number
  allow_multiple: boolean
  options: string[]
  correct_indices: number[]
}

export interface FillBlankQuestionInput {
  question_type: 'fill_blank'
  content: string
  points: number
  blanks: Array<{ accepted_answers: string[] }>
  case_sensitive: boolean
}

export type ExerciseQuestionInput = MultipleChoiceQuestionInput | FillBlankQuestionInput

export interface SaveCourseExerciseInput {
  title: string
  description: string | null
  time_limit_minutes: number | null
  max_score: number
  status: ExerciseStatus
  questions: ExerciseQuestionInput[]
}

export interface ExerciseSubmissionAnswer {
  question_id: string
  selected_indices?: number[]
  blank_answers?: string[]
}

export interface ExerciseQuestionGradeResult {
  question_id: string
  question_type: CourseExerciseQuestionType
  is_correct: boolean
  earned_points: number
  max_points: number
  correct_indices?: number[]
  accepted_answers_per_blank?: string[][]
}

export interface SubmitExerciseResult {
  exercise_id: string
  total_questions: number
  correct_count: number
  earned_points: number
  max_points: number
  score_percent: number
  passed: boolean
  attempt_saved: boolean
  results: ExerciseQuestionGradeResult[]
}
