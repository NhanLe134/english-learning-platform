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
}

export interface CourseModule {
  id: string
  title: string
  description: string
  lessons: string[]
}

export const FEATURED_COURSE: CourseReference = {
  id: 'ielts-masterclass-7-plus',
  slug: 'ielts-masterclass-7-plus',
  title: 'IELTS Masterclass 7.0+ Toàn Diện',
  details: '55 buổi học · 110 giờ học · Luyện thi đủ 4 kỹ năng',
  thumbnailUrl: null,
  instructor: 'ThS. Mark Davies',
  price: 4_800_000,
  originalPrice: 6_000_000,
  description: 'Lộ trình tinh gọn dành riêng cho người học hướng tới dải điểm 7.0 – 8.0+. Làm chủ chiến thuật phòng thi thực chiến, triệt tiêu lỗi diễn đạt bằng nền tảng tư duy phản biện học thuật chuẩn Cambridge.',
  category: 'IELTS',
  level: 'Nâng cao',
  targetAudience: 'Người học hướng tới IELTS 7.0+',
  totalLessons: 55,
  modules: [
    { id: 'ielts-module-1', title: 'Phần 1: Nền tảng Academic Vocabulary & Advanced Grammar', description: '10 buổi · 120+ từ vựng C1–C2 theo chủ đề học thuật', lessons: [] },
    { id: 'ielts-module-2', title: 'Phần 2: Listening & Reading Hack – Phương pháp Scan & Skim chuyên sâu', description: '12 buổi · Giải mã bẫy Paraphrasing & Kỹ thuật định vị Key-info', lessons: [] },
    { id: 'ielts-module-3', title: 'Phần 3: Writing Task 1 & 2 – Cấu trúc bài điểm 7.5+', description: '12 buổi · Master lập luận PEEL & viết phân tích biểu đồ khó', lessons: [] },
    { id: 'ielts-module-4', title: 'Phần 4: Speaking Master – Phản xạ tự nhiên & phát âm chuẩn C1', description: '11 buổi · Kỹ thuật mở rộng câu chuyện & tư duy diễn đạt', lessons: [] },
    { id: 'ielts-module-5', title: 'Phần 5: Thi thử Mock Test 1-on-1 với ban giám khảo', description: '10 buổi · Đánh giá theo 4 tiêu chí chấm điểm thực tế', lessons: [] },
  ],
}

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
