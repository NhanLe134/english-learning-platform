// Seed dữ liệu mẫu vào bảng workshops (chạy 1 lần: node scripts/seed-workshops.mjs)
import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong backend/.env')
  process.exit(1)
}

const TEACHER_ID = process.argv[2]
if (!TEACHER_ID) {
  console.error('Cách dùng: node scripts/seed-workshops.mjs <teacher_id>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const workshops = [
  {
    title: 'Câu Lạc Bộ Đọc Báo Tiếng Anh',
    description:
      'Cùng đọc và bàn luận các đề mục thời sự quốc tế bằng tiếng Anh: học từ vựng và cấu trúc thiết yếu, thực hành theo nhóm và tự tin chia sẻ quan điểm của bản thân.',
    teacher_id: TEACHER_ID,
    start_time: '2026-11-14T12:30:00+07:00',
    end_time: '2026-11-14T14:30:00+07:00',
    price: 0,
    max_participants: 20,
    status: 'scheduled',
    created_at: '2026-11-01T00:00:00+07:00',
  },
  {
    title: 'IELTS Speaking: Phản Xạ 3 Giây Chinh Phục Band 7.0+',
    description:
      'Workshop thực chiến với cựu giám khảo British Council: xử lý nhanh mọi dạng câu hỏi Part 1 - 2 - 3, tránh bẫy từ vựng và chiến thuật tự sửa lỗi ngay khi nói.',
    teacher_id: TEACHER_ID,
    start_time: '2026-11-23T02:00:00+07:00',
    end_time: '2026-11-23T04:30:00+07:00',
    price: 0,
    max_participants: 20,
    status: 'scheduled',
    created_at: '2026-11-05T00:00:00+07:00',
  },
  {
    title: 'Lớp Tiếng Việt Giao Tiếp Cho Người Nước Ngoài',
    description:
      'Dành cho chuyên gia, sinh viên trao đổi và người nước ngoài sống tại Đà Nẵng: làm chủ tiếng Việt sinh hoạt từ chào hỏi, mua sắm đến đặt món — học bằng trải nghiệm thực tế ngoài lớp học.',
    teacher_id: TEACHER_ID,
    start_time: '2026-11-25T12:30:00+07:00',
    end_time: '2026-11-25T14:00:00+07:00',
    price: 500000,
    max_participants: 15,
    status: 'scheduled',
    created_at: '2026-11-07T00:00:00+07:00',
  },
]

const { error } = await supabase.from('workshops').insert(workshops)
if (error) {
  console.error('Seed thất bại:', error.message)
  process.exit(1)
}
console.log(`Đã seed ${workshops.length} workshop vào bảng workshops.`)
