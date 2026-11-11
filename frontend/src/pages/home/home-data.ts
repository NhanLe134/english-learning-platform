import type { ComponentType } from 'react'
import {
  BookOpen,
  ListChecks,
  Mic,
  MonitorSmartphone,
  NotebookPen,
  Sprout,
  UserCheck,
} from 'lucide-react'

/* ---------- Section: Các khóa học hiện tại ---------- */

export interface FeaturedCourse {
  id: string
  tag: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  duration: string
  benefits: string[]
  popular?: boolean
}

export const featuredCourses: FeaturedCourse[] = [
  {
    id: 'phat-am',
    tag: 'Tiếng Anh nền tảng',
    title: 'Phát âm tiếng Anh',
    description:
      'Tìm được chất giọng tiếng Anh của mình. Chữa lỗi phát âm 99% người Việt mắc phải. Các mẹo phát âm rõ ràng, giao tiếp hiệu quả.',
    icon: Mic,
    duration: 'Thời lượng: 20 video',
    benefits: [
      'Có bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
  },
  {
    id: 'tu-vung',
    tag: 'Tiếng Anh nền tảng',
    title: 'Từ vựng tiếng Anh',
    description:
      'Nắm vững loạt từ vựng thiết yếu cho các chủ đề thường gặp. Phân biệt các từ gần nghĩa. Xây dựng tư duy học từ vựng dựa trên gốc từ.',
    icon: BookOpen,
    duration: 'Thời lượng: 20 video',
    benefits: [
      'Bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
    popular: true,
  },
  {
    id: 'ngu-phap',
    tag: 'Tiếng Anh nền tảng',
    title: 'Ngữ pháp tiếng Anh',
    description:
      'Học các thì một cách nhẹ nhàng và vận dụng ngay trong ngữ cảnh thích hợp. Hiểu lý do của những quy tắc và ngoại lệ.',
    icon: NotebookPen,
    duration: 'Thời lượng: 20 video',
    benefits: [
      'Bài tập thực hành sau mỗi video',
      '1 buổi tư vấn 30 phút sau khi hoàn thành khoá học',
    ],
  },
]

/* ---------- Section: Tủ Sách Tự Học ---------- */

export const ebooks = [
  {
    title: 'Ebook: Cẩm nang Phát Âm Chuẩn Quốc Tế IPA',
    description: '44 âm tiết với hình họa vị trí lưỡi và audio mẫu chuẩn giọng Anh - Mỹ.',
  },
  {
    title: 'Tuyển tập: 88 Từ Vựng Hữu dụng và Chất lừ',
    description: 'Để không bị lác và bỏ rơi khi nói chuyện với người bản xứ',
  },
]

/* ---------- Section: Vì sao chọn ---------- */

export interface Reason {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

export const reasons: Reason[] = [
  {
    icon: Sprout,
    title: 'Phương pháp tiếp cận tự nhiên',
    description:
      'Tập trung so sánh và sửa lỗi thường gặp và đã không được sửa trong nhiều năm',
  },
  {
    icon: ListChecks,
    title: 'Bài tập thiết kế chọn lọc',
    description:
      'Bài tập tổng hợp những tình huống hay gặp nhất để học viên có thể dùng được luôn sau lớp học',
  },
  {
    icon: UserCheck,
    title: 'Giáo viên uy tín',
    description:
      'Giáo viên là người đã trải qua toàn bộ quá trình lột xác từ một người kém tiếng Anh cho đến khá và tương đối giỏi, có thể tự tin tham gia các hội thảo, sự kiện quốc tế.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Các khoá đào tạo trực tuyến',
    description:
      'Cơ hội tương tác trực tiếp với giáo viên Việt và bản xứ. Được giải đáp thắc mắc cụ thể ngay lập tức để xử lý vấn đề.',
  },
]

/* ---------- Section: Cảm nhận học viên ---------- */

export interface Testimonial {
  initials: string
  name: string
  role: string
  quote: string
}

export const testimonials: Testimonial[] = [
  {
    initials: 'TH',
    name: 'Văn. T',
    role: 'Du học sinh Australia',
    quote:
      'Khoá học Phát âm tiếng Anh đã giúp mình yêu giọng nói của mình khi nói tiếng Anh hơn hẳn. Mình giảm được sự ảnh hưởng của tiếng Việt, nghe “tây” hơn hẳn, và cải thiện rõ ràng khả năng nghe.',
  },
  {
    initials: 'ML',
    name: 'Mai. V',
    role: 'Du học sinh Mĩ',
    quote:
      'Mình bắt đầu khoá học Ngữ pháp với mục tiêu là vượt qua nỗi sợ học các thì. Mọi thứ trở nên thật rõ ràng dễ hiểu khi được giải thích bằng chính ngôn ngữ mẹ đẻ một cách thân thiện chứ không hề nhiều khái niệm xa lạ.',
  },
]
