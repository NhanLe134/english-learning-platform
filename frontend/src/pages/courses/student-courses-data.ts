export type CourseProgressStatus = 'all' | 'in_progress' | 'completed'

export interface StudentProfile {
  name: string
  email?: string
  role: string
  avatarUrl: string | null
  streakDays: number
  weeklyGoalPercent: number
}

export interface MyCourse {
  id: string
  title: string
  slug: string
  levelBadge: string
  instructor: string
  thumbnailUrl: string
  status: 'in_progress' | 'completed'
  statusLabel: string
  lastActive: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  nextLesson?: {
    lessonNumber: number
    title: string
  }
}

export interface OtherCourse {
  id: string
  title: string
  slug: string
  tagBadge: string
  tagBadgeColor?: string
  levelBadge: string
  levelBadgeColor: 'rose' | 'emerald' | 'blue'
  lessonsCount: number
  totalHours: number
  instructor: string
  instructorRole: string
  thumbnailUrl: string
  features: string[]
  price: number
  originalPrice: number
  discountPercent: number
}

export interface DailyWordData {
  date: string
  word: string
  partOfSpeech: string
  phonetic: string
  meaning: string
  exampleEn: string
  exampleVi: string
}

export interface ImprovementIssue {
  id: string
  category: string
  categoryColor: 'teal' | 'amber' | 'emerald'
  title: string
  severityBadge: string
  severityColor: 'rose' | 'amber' | 'emerald'
  description: string
}

export const CURRENT_STUDENT: StudentProfile = {
  name: '',
  email: '',
  role: 'Học viên',
  avatarUrl: null,
  streakDays: 0,
  weeklyGoalPercent: 0,
}

export const MY_COURSES: MyCourse[] = []

export const OTHER_COURSES: OtherCourse[] = []

export const DAILY_WORD: DailyWordData = {
  date: 'Hôm nay, 14 Th11',
  word: 'ACCOMPLISH',
  partOfSpeech: 'VERB',
  phonetic: '/əˈkʌm.plɪʃ/',
  meaning: 'Hoàn thành, đạt được mục tiêu sau nỗ lực.',
  exampleEn: 'She worked hard to accomplish her goals.',
  exampleVi: 'Cô ấy đã làm việc chăm chỉ để đạt được mục tiêu của mình.',
}

export const IMPROVEMENT_ISSUES: ImprovementIssue[] = [
  {
    id: 'issue-1',
    category: 'Phát âm',
    categoryColor: 'teal',
    title: 'Phát âm âm cuối (/s/, /t/)',
    severityBadge: 'Cần cải thiện',
    severityColor: 'rose',
    description: 'Bạn thường bỏ âm /s/ và /t/ khi phát âm tiếng Anh.',
  },
  {
    id: 'issue-2',
    category: 'Ngữ pháp',
    categoryColor: 'amber',
    title: 'Thì hiện tại hoàn thành',
    severityBadge: 'Hay mắc lỗi',
    severityColor: 'amber',
    description: 'Bạn thường nhầm lẫn giữa Present Perfect và Past...',
  },
  {
    id: 'issue-3',
    category: 'Từ vựng',
    categoryColor: 'emerald',
    title: 'Sử dụng từ sai ngữ cảnh',
    severityBadge: 'Cần luyện thêm',
    severityColor: 'emerald',
    description: 'Cần luyện cách dùng từ trong tình huống giao tiếp...',
  },
]
