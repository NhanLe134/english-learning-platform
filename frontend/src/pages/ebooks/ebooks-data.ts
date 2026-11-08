export interface Ebook {
  id: string
  title: string
  author: string
  description: string
  /** Thể loại dùng cho bộ lọc danh mục */
  category: string
  format: 'PDF' | 'EPUB'
  pages: number
  rating: number
  downloads: number
  price: number
  originalPrice?: number
  /** Gradient thay thế ảnh bìa (thay bằng `cover` khi có ảnh thật) */
  gradient: string
  cover?: string
}

export const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')}đ`

export const EBOOK_CATEGORIES = [
  'Tất cả',
  'IELTS',
  'Giao tiếp',
  'Phát âm',
  'Ngữ pháp',
  'Từ vựng',
]

export const ebooks: Ebook[] = [
  {
    id: 'ielts-writing-task-2-secrets',
    title: 'IELTS Writing Task 2: Bộ Công Thức Độc Quyền',
    author: 'ThS. Mark Davies',
    description:
      'Công thức xử lý 4 dạng bài Task 2 kèm 20 bài mẫu band 8.0 được chấm theo tiêu chuẩn giám khảo British Council. Kèm bảng checklist tự chấm điểm trước khi nộp.',
    category: 'IELTS',
    format: 'PDF',
    pages: 86,
    rating: 4.9,
    downloads: 12400,
    price: 0,
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 55%, #60a5fa 100%)',
    cover: '/ebook2.jpg',
  },
  {
    id: '44-am-ipa-noi-am',
    title: '44 Âm IPA & Kỹ Thuật Nối Âm Tiếng Anh',
    author: 'Cô Ngọc Ánh',
    description:
      'Sổ tay phát âm chuẩn American Accent: trọng âm câu, lướt âm, nuốt âm và nối âm kèm 300 từ luyện tập có mã QR nghe giọng bản xứ.',
    category: 'Phát âm',
    format: 'PDF',
    pages: 64,
    rating: 4.8,
    downloads: 9800,
    price: 0,
    gradient: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 55%, #c4b5fd 100%)',
    cover: '/ebook.jpg',
  },
  {
    id: '1000-tu-vung-cot-loi',
    title: '1000 Từ Vựng Cốt Lõi B1 - B2 Thường Nhật',
    author: 'Cô Ngọc Ánh',
    description:
      'Hệ thống hóa 1000 từ theo chủ đề giao tiếp hằng ngày, mỗi từ kèm câu ví dụ, collocations và flashcard Anki tải kèm theo — học 10 từ/ngày hoàn thành trong 3 tháng.',
    category: 'Từ vựng',
    format: 'PDF',
    pages: 112,
    rating: 4.9,
    downloads: 15600,
    price: 150000,
    originalPrice: 250000,
    gradient: 'linear-gradient(135deg, #713f12 0%, #ca8a04 55%, #fde68a 100%)',
    cover: '/ebook4.jpg',
  },
  {
    id: 'ngu-phap-can-ban-mat-goc',
    title: 'Ngữ Pháp Tiếng Anh Căn Bản Cho Người Mất Gốc',
    author: 'Cô Ngọc Ánh',
    description:
      'Xây lại nền móng từ con số 0: 12 thì cơ bản, câu bị động, mệnh đề quan trọng được giải thích bằng sơ đồ tư duy — không thuật ngữ khó hiểu, kèm 500 bài tập có đáp án.',
    category: 'Ngữ pháp',
    format: 'PDF',
    pages: 138,
    rating: 4.9,
    downloads: 18200,
    price: 0,
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #6ee7b7 100%)',
    cover: '/ebook3.jpg',
  },
  {
    id: 'ielts-bay-de-listening',
    title: 'IELTS Listening: Bản Đồ Bẫy Đề 4 Part',
    author: 'Thầy Hoàng Nam',
    description:
      'Tổng hợp 47 dạng bẫy đề phổ biến nhất trong cả 4 part của IELTS Listening, chiến thuật nghe-nhận-biết và 5 đề luyện tập chuẩn format mới kèm transcript chi tiết từng câu.',
    category: 'IELTS',
    format: 'PDF',
    pages: 95,
    rating: 4.8,
    downloads: 7400,
    price: 200000,
    originalPrice: 300000,
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fdba74 100%)',
    cover: '/ebook2.jpg',
  },
  {
    id: 'business-email-handbook',
    title: 'Business Email Handbook: Viết Email Công Sở Chuẩn Quốc Tế',
    author: 'Cô Sarah Mai',
    description:
      '60 mẫu email thực chiến cho mọi tình huống: đàm phán, khiếu nại, theo dõi tiến độ, xin nghỉ phép. Kèm bảng cụm từ thay thế "cliché" giúp email chuyên nghiệp hơn ngay lập tức.',
    category: 'Giao tiếp',
    format: 'EPUB',
    pages: 78,
    rating: 4.9,
    downloads: 5100,
    price: 180000,
    originalPrice: 280000,
    gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 55%, #94a3b8 100%)',
    cover: '/ebook6.jpg',
  },
]
