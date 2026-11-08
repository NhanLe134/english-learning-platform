export interface CourseReference {
  id: string
  slug: string
  title: string
  details: string
  thumbnailUrl: string | null
  instructor: string
  price: number
  originalPrice: number
  description: string
  category: string
  level: string
  targetAudience: string
  totalLessons: number
  modules: CourseModule[]
  highlights?: string[]
  isPopular?: boolean
  iconType?: 'award' | 'users' | 'briefcase'
}

export interface CourseModule {
  id: string
  title: string
  description: string
  lessons: string[]
}

export const DEFAULT_COURSES: CourseReference[] = [
  {
    id: 'phat-am-tieng-anh',
    slug: 'phat-am-tieng-anh',
    title: 'Phát âm tiếng Anh',
    details: '20 video · Luyện phát âm chuẩn quốc tế',
    thumbnailUrl: null,
    instructor: 'Đội ngũ Your English Voice',
    price: 1_200_000,
    originalPrice: 1_800_000,
    description: 'Tìm được chất giọng tiếng Anh của mình. Chữa lỗi phát âm 99% người Việt mắc phải. Các mẹo phát âm rõ ràng, giao tiếp hiệu quả.',
    category: 'Tiếng Anh nền tảng',
    level: 'Cơ bản',
    targetAudience: 'Người mất gốc, người muốn cải thiện phát âm',
    totalLessons: 20,
    highlights: [
      'Thời lượng: 20 video',
      'Có bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
    isPopular: false,
    iconType: 'award',
    modules: [
      {
        id: 'pa-module-1',
        title: 'Phần 1: Bảng ký hiệu ngữ âm quốc tế (IPA)',
        description: 'Làm chủ nguyên âm đơn, nguyên âm đôi và phụ âm chuẩn Cambridge',
        lessons: ['Nguyên âm ngắn & nguyên âm dài', 'Cặp phụ âm vô thanh & hữu thanh'],
      },
      {
        id: 'pa-module-2',
        title: 'Phần 2: Trọng âm, nối âm & ngữ điệu tự nhiên',
        description: 'Quy tắc nhấn trọng âm từ, ngữ điệu câu và biến âm trong thực tế',
        lessons: ['Kỹ thuật nối âm linking sounds', 'Ngữ điệu câu hỏi & trần thuật'],
      },
    ],
  },
  {
    id: 'tu-vung-tieng-anh',
    slug: 'tu-vung-tieng-anh',
    title: 'Từ vựng tiếng Anh',
    details: '20 video · Tư duy học từ vựng theo gốc từ',
    thumbnailUrl: null,
    instructor: 'Đội ngũ Your English Voice',
    price: 1_200_000,
    originalPrice: 1_800_000,
    description: 'Nắm vững loạt từ vựng thiết yếu cho các chủ đề thường gặp. Phân biệt các từ gần nghĩa. Xây dựng tư duy học từ vựng dựa trên gốc từ.',
    category: 'Tiếng Anh nền tảng',
    level: 'Cơ bản',
    targetAudience: 'Người muốn xây dựng vốn từ vựng nền tảng',
    totalLessons: 20,
    highlights: [
      'Thời lượng: 20 video',
      'Bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
    isPopular: true,
    iconType: 'users',
    modules: [
      {
        id: 'tv-module-1',
        title: 'Phần 1: Phương pháp học từ vựng qua gốc từ (Etymology)',
        description: 'Tiền tố, hậu tố và phương pháp suy luận nghĩa của từ mới',
        lessons: ['Tiền tố phủ định và chuyển nghĩa', 'Hậu tố danh từ, tính từ và trạng từ'],
      },
      {
        id: 'tv-module-2',
        title: 'Phần 2: Từ vựng theo chủ đề đời sống & công việc',
        description: 'Từ vựng thông dụng và phân biệt từ đồng nghĩa - gần nghĩa (Synonyms/Nuances)',
        lessons: ['Chủ đề Công sở & Giao tiếp', 'Phân biệt các cặp từ dễ nhầm lẫn'],
      },
    ],
  },
  {
    id: 'ngu-phap-tieng-anh',
    slug: 'ngu-phap-tieng-anh',
    title: 'Ngữ pháp tiếng Anh',
    details: '20 video · Ngữ pháp thực hành nhẹ nhàng',
    thumbnailUrl: null,
    instructor: 'Đội ngũ Your English Voice',
    price: 1_200_000,
    originalPrice: 1_800_000,
    description: 'Học các thì một cách nhẹ nhàng và vận dụng ngay trong ngữ cảnh thích hợp. Hiểu lý do của những quy tắc và ngoại lệ.',
    category: 'Tiếng Anh nền tảng',
    level: 'Cơ bản',
    targetAudience: 'Người muốn nắm vững ngữ pháp thực hành',
    totalLessons: 20,
    highlights: [
      'Thời lượng: 20 video',
      'Bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
    isPopular: false,
    iconType: 'briefcase',
    modules: [
      {
        id: 'np-module-1',
        title: 'Phần 1: Hệ thống các thì cốt lõi trong tiếng Anh',
        description: 'Bản chất dòng thời gian của các thì và ứng dụng thực tế',
        lessons: ['Hiện tại đơn & Hiện tại tiếp diễn', 'Quá khứ đơn & Hiện tại hoàn thành'],
      },
      {
        id: 'np-module-2',
        title: 'Phần 2: Cấu trúc câu & mệnh đề linh hoạt',
        description: 'Mệnh đề quan hệ, câu điều kiện và câu bị động tự nhiên',
        lessons: ['Mệnh đề quan hệ rút gọn', 'Câu điều kiện ứng dụng trong giao tiếp'],
      },
    ],
  },
]

export const FEATURED_COURSE: CourseReference = DEFAULT_COURSES[1]

export function createCheckoutUrl(course: CourseReference): string {
  const params = new URLSearchParams({
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    details: course.details,
    instructor: course.instructor,
    price: String(course.price),
    originalPrice: String(course.originalPrice),
    thumbnail: course.thumbnailUrl ?? '',
    category: course.category,
    description: course.description,
    level: course.level,
    targetAudience: course.targetAudience,
    totalLessons: String(course.totalLessons),
  })

  return `/checkout?${params.toString()}`
}

export function createRegistrationUrl(course: CourseReference): string {
  const search = new URL(createCheckoutUrl(course), window.location.origin).search
  return `/register${search}`
}

function readPositiveAmount(value: string | null, fallback: number): number {
  if (!value) return fallback
  const amount = Number(value)
  return Number.isSafeInteger(amount) && amount > 0 ? amount : fallback
}

function readThumbnail(value: string | null): string | null {
  if (!value) return null

  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export function readCheckoutCourse(search: string): CourseReference {
  const params = new URLSearchParams(search)
  const price = readPositiveAmount(params.get('price'), FEATURED_COURSE.price)
  const requestedOriginalPrice = readPositiveAmount(
    params.get('originalPrice'),
    FEATURED_COURSE.originalPrice,
  )

  return {
    id: params.get('courseId')?.trim() || FEATURED_COURSE.id,
    slug: params.get('slug')?.trim() || FEATURED_COURSE.slug,
    title: params.get('title')?.trim() || FEATURED_COURSE.title,
    details: params.get('details')?.trim() || FEATURED_COURSE.details,
    instructor: params.get('instructor')?.trim() || FEATURED_COURSE.instructor,
    thumbnailUrl: readThumbnail(params.get('thumbnail')),
    price,
    originalPrice: Math.max(price, requestedOriginalPrice),
    description: params.get('description')?.trim() || FEATURED_COURSE.description,
    category: params.get('category')?.trim() || FEATURED_COURSE.category,
    level: params.get('level')?.trim() || FEATURED_COURSE.level,
    targetAudience: params.get('targetAudience')?.trim() || FEATURED_COURSE.targetAudience,
    totalLessons: readPositiveAmount(params.get('totalLessons'), FEATURED_COURSE.totalLessons),
    modules: FEATURED_COURSE.modules,
  }
}
