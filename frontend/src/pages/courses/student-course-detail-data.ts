export interface LessonItem {
  id: string
  lessonNumber: number
  title: string
  duration: string
  status: 'completed' | 'in_progress' | 'not_started'
  progressPercent: number
  isCurrent?: boolean
}

export interface QuizQuestion {
  id: number
  questionNumberStr: string
  questionText: string
  audioText: string
  options: {
    id: string
    label: string
    text: string
  }[]
  correctOptionId: string
}

export interface KeyTakeawayCard {
  id: string
  word: string
  phonetic: string
  tag: string
  tagColor: 'green' | 'gray' | 'rose' | 'amber'
  meaning: string
  example: string
}

export interface AttachmentFile {
  id: string
  name: string
  size: string
  type: 'pdf' | 'mp3' | 'docx'
  downloadUrl: string
}

export interface CourseDetailData {
  courseId: string
  courseSlug: string
  courseTitle: string
  badgeText: string
  instructor: string
  instructorAvatar: string
  totalLessons: number
  completedLessons: number
  currentLessonNumber: number
  overallProgressPercent: number
  currentLesson: {
    number: number
    title: string
    videoDuration: string
    videoCompletedDuration: string
    videoPercent: number
    videoUrl?: string
    boardTitle: string
    objectivesSummary: string
  }
  lessons: LessonItem[]
  quiz: {
    title: string
    subtitle: string
    totalQuestions: number
    durationMinutes: number
    passingScoreStr: string
    instructorName: string
    questions: QuizQuestion[]
  }
  keyTakeaways: KeyTakeawayCard[]
  attachments: AttachmentFile[]
}

export const STUDENT_COURSE_DETAIL: CourseDetailData = {
  courseId: 'crs-grammar-b1',
  courseSlug: 'ngu-phap-tieng-anh',
  courseTitle: 'Ngữ pháp Tiếng Anh',
  badgeText: 'Khóa Học Đang Diễn Ra',
  instructor: 'Trang English',
  instructorAvatar: '/giaovien.jpg',
  totalLessons: 12,
  completedLessons: 3,
  currentLessonNumber: 4,
  overallProgressPercent: 33.33,
  currentLesson: {
    number: 4,
    title: 'Bài 4: Thì hiện tại hoàn thành',
    videoDuration: '18:45',
    videoCompletedDuration: '18:45',
    videoPercent: 100,
    boardTitle: 'International Phonetic Alphabet (IPA) - American English',
    objectivesSummary:
      'Làm chủ kỹ thuật mở đầu cuộc đối thoại tự nhiên, tránh lối mòn câu trả lời thụ động dạng "I\'m fine, thank you", và vận dụng cấu trúc Small Talk xoay quanh thời tiết, công việc, và tin tức trong văn hóa giao tiếp công sở quốc tế.',
  },
  lessons: [
    {
      id: 'lesson-1',
      lessonNumber: 1,
      title: 'Bài 1: Tổng quan ngữ âm IPA & 12 nguyên âm',
      duration: '14:20',
      status: 'completed',
      progressPercent: 100,
    },
    {
      id: 'lesson-2',
      lessonNumber: 2,
      title: 'Bài 2: Bí quyết nối âm (Linking Sounds) tự nhiên',
      duration: '19:10',
      status: 'completed',
      progressPercent: 100,
    },
    {
      id: 'lesson-3',
      lessonNumber: 3,
      title: 'Bài 3: Trọng âm từ và câu trong giao tiếp hàng ngày',
      duration: '16:30',
      status: 'completed',
      progressPercent: 100,
    },
    {
      id: 'lesson-4',
      lessonNumber: 4,
      title: 'Bài 4: Phản xạ hội thoại chào hỏi & Small Talk',
      duration: '18:45',
      status: 'in_progress',
      progressPercent: 80,
      isCurrent: true,
    },
    {
      id: 'lesson-5',
      lessonNumber: 5,
      title: 'Bài 5: Cách giữ mạch hội thoại không bị ngắt quãng',
      duration: '22:15',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-6',
      lessonNumber: 6,
      title: 'Bài 6: Diễn đạt cảm xúc và quan điểm cá nhân',
      duration: '20:00',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-7',
      lessonNumber: 7,
      title: 'Bài 7: Kỹ năng đặt câu hỏi mở và xử lý tình huống',
      duration: '17:40',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-8',
      lessonNumber: 8,
      title: 'Bài 8: Thực hành tình huống tại sân bay & khách sạn',
      duration: '25:30',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-9',
      lessonNumber: 9,
      title: 'Bài 9: Giao tiếp qua điện thoại và xử lý khiếu nại',
      duration: '21:00',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-10',
      lessonNumber: 10,
      title: 'Bài 10: Kỹ thuật đàm phán và thuyết phục bằng tiếng Anh',
      duration: '23:45',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-11',
      lessonNumber: 11,
      title: 'Bài 11: Phát âm tiếng Anh chuyên ngành & môi trường công sở',
      duration: '20:10',
      status: 'not_started',
      progressPercent: 0,
    },
    {
      id: 'lesson-12',
      lessonNumber: 12,
      title: 'Bài 12: Tổng kết lộ trình & Đánh giá năng lực cuối khóa',
      duration: '30:00',
      status: 'not_started',
      progressPercent: 0,
    },
  ],
  quiz: {
    title: 'Bài Kiểm Tra Kiến Thức Bài 4 (Teacher-Created Quiz)',
    subtitle: 'Hãy hoàn thành bài quick để hoàn thiện bài học',
    totalQuestions: 5,
    durationMinutes: 10,
    passingScoreStr: '80% (4/5)',
    instructorName: 'Trang English',
    questions: [
      {
        id: 1,
        questionNumberStr: 'CÂU 01',
        questionText:
          'Trong tiếng Anh giao tiếp chuẩn, cách chào nào phù hợp nhất trong ngữ cảnh trang trọng với đối tác mới gặp lần đầu?',
        audioText: 'How do you do? Pleased to meet you.',
        options: [
          { id: 'A', label: 'A', text: "Hey, what's up?" },
          { id: 'B', label: 'B', text: 'How do you do? Pleased to meet you.' },
          { id: 'C', label: 'C', text: 'Yo, long time no see!' },
          { id: 'D', label: 'D', text: 'Alright mate!' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 2,
        questionNumberStr: 'CÂU 02',
        questionText:
          'Khi ai đó hỏi "How have you been lately?", câu trả lời nào mang sắc thái tự nhiên và ngữ điệu chuẩn nhất của người bản xứ?',
        audioText:
          "When someone asks 'How have you been lately?', the most natural native response is: Couldn't be better! How about yourself?",
        options: [
          { id: 'A', label: 'A', text: 'I am fine, thank you, and you?' },
          { id: 'B', label: 'B', text: "Couldn't be better! How about yourself?" },
          { id: 'C', label: 'C', text: 'Yes, I have been.' },
          { id: 'D', label: 'D', text: 'I am being good today.' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 3,
        questionNumberStr: 'CÂU 03',
        questionText:
          'Cụm từ "Small talk" trong văn hóa công sở phương Tây mang ý nghĩa cốt lõi là gì?',
        audioText: 'What is the core meaning of Small Talk in professional culture?',
        options: [
          { id: 'A', label: 'A', text: 'Trò chuyện nhỏ tiếng, thì thầm trong giờ làm việc.' },
          {
            id: 'B',
            label: 'B',
            text:
              'Các câu chuyện tán gẫu ngắn giúp phá vỡ bầu không khí ngượng ngùng (ice-breaking) trước khi vào việc chính.',
          },
          { id: 'C', label: 'C', text: 'Báo cáo vắn tắt tiến độ công việc hàng ngày.' },
          { id: 'D', label: 'D', text: 'Cuộc nói chuyện kéo dài dưới 1 phút.' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 4,
        questionNumberStr: 'CÂU 04',
        questionText:
          'Khi muốn kết thúc cuộc trò chuyện một cách lịch thiệp và hẹn gặp lại, bạn nên dùng mẫu câu nào?',
        audioText: 'I have a meeting right now, let us catch up soon!',
        options: [
          { id: 'A', label: 'A', text: 'Stop talking now, I leave.' },
          { id: 'B', label: 'B', text: "I'm out of here right now." },
          { id: 'C', label: 'C', text: 'I have a meeting right now, let’s catch up soon!' },
          { id: 'D', label: 'D', text: "Don't talk to me anymore." },
        ],
        correctOptionId: 'C',
      },
      {
        id: 5,
        questionNumberStr: 'CÂU 05',
        questionText:
          'Thành ngữ "Same old, same old" thường được dùng trong trường hợp nào khi chào hỏi?',
        audioText: 'What does Same old, same old mean in daily conversation?',
        options: [
          { id: 'A', label: 'A', text: 'Khi nói về một đồ vật rất cổ kính.' },
          {
            id: 'B',
            label: 'B',
            text:
              'Trả lời thân mật khi được hỏi thăm và cuộc sống vẫn diễn ra bình thường, không có biến động mới.',
          },
          { id: 'C', label: 'C', text: 'Khi gặp lại người bạn già lâu năm.' },
          { id: 'D', label: 'D', text: 'Khi muốn từ chối nói chuyện.' },
        ],
        correctOptionId: 'B',
      },
    ],
  },
  keyTakeaways: [
    {
      id: 'kt-1',
      word: "Couldn't be better",
      phonetic: '/ˈkʊd.nt biː ˈbet.ər/',
      tag: 'High Fluency',
      tagColor: 'green',
      meaning: 'Không thể tuyệt vời hơn! (Trả lời phản xạ thay cho "Very well")',
      example: '"How\'s work going?" — "Couldn\'t be better!"',
    },
    {
      id: 'kt-2',
      word: 'Small talk',
      phonetic: '/ˈsmɔːl tɔːk/',
      tag: 'Idiom',
      tagColor: 'gray',
      meaning: 'Chuyện trò xã giao, mở đầu phá băng (Ice-breaking).',
      example: '"We made small talk about the chilly weather."',
    },
    {
      id: 'kt-3',
      word: 'Catch up soon',
      phonetic: '/kætʃ ʌp suːn/',
      tag: 'Closing phrase',
      tagColor: 'rose',
      meaning: 'Hẹn sớm gặp lại/tám chuyện sau nhé.',
      example: '"I have a meeting right now, let\'s catch up soon!"',
    },
    {
      id: 'kt-4',
      word: 'Same old, same old',
      phonetic: '/seɪm oʊld seɪm oʊld/',
      tag: 'Informal',
      tagColor: 'amber',
      meaning: 'Vẫn như mọi khi thôi, không có gì mới.',
      example: '"What\'s new?" — "Ah, same old, same old."',
    },
  ],
  attachments: [
    {
      id: 'att-1',
      name: 'Slide_Bai_Giang_Bai_4_Thuc_Hanh_Small_Talk.pdf',
      size: '4.2 MB',
      type: 'pdf',
      downloadUrl: '#',
    },
    {
      id: 'att-2',
      name: 'Audio_Listening_Native_Conversation_Full.mp3',
      size: '8.5 MB',
      type: 'mp3',
      downloadUrl: '#',
    },
    {
      id: 'att-3',
      name: 'Bai_Tap_Thao_Luan_Ghi_Am_Khau_Hinh.docx',
      size: '1.1 MB',
      type: 'docx',
      downloadUrl: '#',
    },
  ],
}
