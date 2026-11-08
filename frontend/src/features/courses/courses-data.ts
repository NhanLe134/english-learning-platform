export type HighlightIcon =
  | 'target'
  | 'bolt'
  | 'mic'
  | 'trophy'
  | 'seedling'
  | 'briefcase'

export interface Course {
  id: string
  title: string
  description: string
  /** Nhãn trạng thái hiển thị trên ảnh (nền đỏ) */
  statusLabel: string
  /** Nhãn danh mục hiển thị trên ảnh (nền trắng) */
  categoryLabel: string
  rating: number
  reviewCount: number
  /** Điểm nổi bật màu đỏ ở đầu thẻ */
  highlight: string
  highlightIcon: HighlightIcon
  lessons: number
  instructor: {
    name: string
    credential: string
  }
  price: number
  originalPrice: number
  /** Gradient thay thế ảnh bìa (thay bằng `image` khi có ảnh thật) */
  gradient: string
  image?: string
}

export const formatPrice = (value: number) =>
  `${value.toLocaleString('vi-VN')}đ`

export const courses: Course[] = [
  {
    id: 'ielts-masterclass',
    title: 'IELTS Masterclass 7.0+ Toàn Diện',
    description:
      'Bộ công thức độc quyền xử lý 4 kỹ năng Nghe-Nói-Đọc-Viết. Trực tiếp sửa 12 bài Writing Task 2 chi tiết theo...',
    statusLabel: 'Best Seller',
    categoryLabel: 'IELTS Academic',
    rating: 4.9,
    reviewCount: 1240,
    highlight: 'Mục tiêu 7.0+ - 8.0',
    highlightIcon: 'target',
    lessons: 45,
    instructor: {
      name: 'ThS. Mark Davies',
      credential: 'Cựu Giám khảo BC • 12 năm kinh nghiệm',
    },
    price: 4800000,
    originalPrice: 6000000,
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #60a5fa 100%)',
  },
  {
    id: 'workplace-english',
    title: 'Tiếng Anh Giao Tiếp Thực Chiến Cho Người Đi Làm',
    description:
      'Luyện đàm phán, viết email công sở chuẩn chỉnh và thuyết trình sắc bén. Xóa bỏ phản xạ dịch thầm tiếng...',
    statusLabel: 'Đang Ưu đãi 25%',
    categoryLabel: 'Workplace English',
    rating: 4.9,
    reviewCount: 890,
    highlight: 'Phản xạ 3 Giây',
    highlightIcon: 'bolt',
    lessons: 30,
    instructor: {
      name: 'Cô Sarah Mai',
      credential: '8.5 IELTS • 10 năm giảng dạy doanh nghiệp',
    },
    price: 2950000,
    originalPrice: 3800000,
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fdba74 100%)',
  },
  {
    id: 'american-accent',
    title: 'Phát Âm & Ngữ Điệu Chuẩn Bản Xứ (American Accent)',
    description:
      'Làm chủ trọng âm câu, kỹ thuật lướt âm, nuốt âm và nối âm tự nhiên như người bản xứ. Đánh bay giọng địa...',
    statusLabel: 'Âm chuẩn IPA',
    categoryLabel: 'General American',
    rating: 4.8,
    reviewCount: 650,
    highlight: '44 Âm IPA & Nối Âm',
    highlightIcon: 'mic',
    lessons: 24,
    instructor: {
      name: 'David Wilson',
      credential: 'Chuyên gia Ngữ âm học • California Univ',
    },
    price: 1890000,
    originalPrice: 2500000,
    gradient: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 55%, #c4b5fd 100%)',
  },
  {
    id: 'toeic-850',
    title: 'Chinh Phục TOEIC 850+ Cấp Tốc',
    description:
      'Nắm trọn bẫy Listening Part 3 & 4, tối ưu hóa tốc độ làm bài Reading Part 7 qua phương pháp Skimming &...',
    statusLabel: 'Cấp tốc 2 tháng',
    categoryLabel: 'ETS Chuẩn Hóa',
    rating: 4.9,
    reviewCount: 1050,
    highlight: 'Mục tiêu 850+ TOEIC',
    highlightIcon: 'trophy',
    lessons: 36,
    instructor: {
      name: 'Thầy Hoàng Nam',
      credential: '990/990 TOEIC • Đào tạo 5.000+ sinh viên',
    },
    price: 3200000,
    originalPrice: 4000000,
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #6ee7b7 100%)',
  },
  {
    id: 'zero-to-hero',
    title: 'Lấy Lại Nền Tảng Tiếng Anh Cho Người Mất Gốc',
    description:
      'Hệ thống hóa toàn bộ ngữ pháp căn bản, 1000 từ vựng cốt lõi thường nhật. Cam kết tự tin giao tiếp các chủ đề...',
    statusLabel: 'Khởi đầu vững chắc',
    categoryLabel: 'Zero to Hero',
    rating: 4.9,
    reviewCount: 1420,
    highlight: 'Học Dễ Hiểu & Nhớ Lâu',
    highlightIcon: 'seedling',
    lessons: 40,
    instructor: {
      name: 'Cô Ngọc Ánh',
      credential: 'Thủ khoa Sư Phạm Tiếng Anh • 8.0 IELTS',
    },
    price: 2100000,
    originalPrice: 2800000,
    gradient: 'linear-gradient(135deg, #713f12 0%, #ca8a04 55%, #fde68a 100%)',
  },
  {
    id: 'global-business',
    title: 'Business English: Kỹ Năng Đàm Phán & Thuyết Trình',
    description:
      'Dành riêng cho Quản lý, Giám đốc & Nhân sự cấp cao cần đàm phán hợp đồng, bảo vệ luận điểm và trình bày...',
    statusLabel: 'Cấp quản lý',
    categoryLabel: 'Global Business',
    rating: 4.8,
    reviewCount: 410,
    highlight: 'Kỹ Năng Cấp Cao',
    highlightIcon: 'briefcase',
    lessons: 20,
    instructor: {
      name: 'ThS. James Miller',
      credential: 'MBA Harvard • Cố vấn Doanh nghiệp FDI',
    },
    price: 3650000,
    originalPrice: 4500000,
    gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 55%, #94a3b8 100%)',
  },
]
