export type CourseProgressStatus = 'all' | 'in_progress' | 'completed'

export interface StudentProfile {
  name: string
  email?: string
  role: string
  avatarUrl: string
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
  name: 'Sarah',
  email: 'sarah.student@yev.edu.vn',
  role: 'Member',
  avatarUrl: '/giaovien.jpg',
  streakDays: 14,
  weeklyGoalPercent: 68,
}

export const MY_COURSES: MyCourse[] = [
  {
    id: 'my-course-1',
    title: 'Ngữ pháp Tiếng Anh',
    slug: 'ngu-phap-tieng-anh',
    levelBadge: 'Cơ bản - B1',
    instructor: 'Trang English',
    thumbnailUrl: '/giaovien2.jpg',
    status: 'in_progress',
    statusLabel: 'Đang Học',
    lastActive: 'Cập nhật 2 giờ trước',
    totalLessons: 12,
    completedLessons: 4,
    progressPercent: 33,
    nextLesson: {
      lessonNumber: 5,
      title: 'Thì hiện tại hoàn thành',
    },
  },
  {
    id: 'my-course-2',
    title: 'Phát âm Tiếng Anh',
    slug: 'phat-am-tieng-anh',
    levelBadge: 'Trung cấp - B2',
    instructor: 'ThS. David Nguyen',
    thumbnailUrl: '/david.png',
    status: 'in_progress',
    statusLabel: 'Đang Học',
    lastActive: 'Hôm qua',
    totalLessons: 16,
    completedLessons: 12,
    progressPercent: 75,
    nextLesson: {
      lessonNumber: 13,
      title: 'Phát âm từ phức',
    },
  },
  {
    id: 'my-course-3',
    title: 'Từ vựng Tiếng Anh',
    slug: 'tu-vung-tieng-anh',
    levelBadge: 'Cơ bản',
    instructor: 'Trang English',
    thumbnailUrl: '/giaovien.jpg',
    status: 'completed',
    statusLabel: 'Đã Hoàn Thành',
    lastActive: '3 ngày trước',
    totalLessons: 10,
    completedLessons: 10,
    progressPercent: 100,
  },
]

export const OTHER_COURSES: OtherCourse[] = [
  {
    id: 'c0a80101-0000-4000-8000-000000000001',
    title: 'Phát âm Tiếng Anh',
    slug: 'phat-am-tieng-anh',
    tagBadge: 'TIẾNG ANH NỀN TẢNG',
    levelBadge: 'CƠ BẢN',
    levelBadgeColor: 'blue',
    lessonsCount: 20,
    totalHours: 25,
    instructor: 'Đội ngũ Your English Voice',
    instructorRole: 'Chuyên gia Ngữ điệu & Giọng nói',
    thumbnailUrl: '/david.png',
    features: [
      'Chấm điểm phổ âm thanh AI',
      'Sửa giọng chuẩn khẩu hình',
      'Chữa lỗi phát âm 99% người Việt mắc phải',
    ],
    price: 1200000,
    originalPrice: 1800000,
    discountPercent: 33,
  },
  {
    id: 'c0a80101-0000-4000-8000-000000000002',
    title: 'Từ vựng Tiếng Anh',
    slug: 'tu-vung-tieng-anh',
    tagBadge: 'TIẾNG ANH NỀN TẢNG',
    levelBadge: 'CƠ BẢN',
    levelBadgeColor: 'blue',
    lessonsCount: 20,
    totalHours: 25,
    instructor: 'Trang English',
    instructorRole: 'Giảng viên chuyên môn',
    thumbnailUrl: '/giaovien.jpg',
    features: [
      'Bộ từ vựng thiết yếu theo chủ đề',
      'Phân biệt từ gần nghĩa trong giao tiếp',
      'Tư duy học từ vựng dựa trên gốc từ',
    ],
    price: 1200000,
    originalPrice: 1800000,
    discountPercent: 33,
  },
  {
    id: 'c0a80101-0000-4000-8000-000000000003',
    title: 'Ngữ pháp Tiếng Anh',
    slug: 'ngu-phap-tieng-anh',
    tagBadge: 'TIẾNG ANH NỀN TẢNG',
    levelBadge: 'CƠ BẢN',
    levelBadgeColor: 'rose',
    lessonsCount: 20,
    totalHours: 25,
    instructor: 'Trang English',
    instructorRole: 'Giảng viên chuyên môn',
    thumbnailUrl: '/giaovien2.jpg',
    features: [
      'Học các thì nhẹ nhàng & thực tế',
      'Vận dụng ngữ cảnh giao tiếp công sở',
      'Làm chủ cấu trúc câu & phản xạ',
    ],
    price: 1200000,
    originalPrice: 1800000,
    discountPercent: 33,
  },
]

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
