import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('backend/.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in backend/.env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Connecting to Supabase at:', supabaseUrl)

  // 1. Check existing profiles to find a teacher/admin ID
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .limit(10)

  if (profileErr) {
    console.error('Error fetching profiles:', profileErr.message)
    process.exit(1)
  }

  console.log(`Found ${profiles?.length || 0} profiles:`)
  profiles?.forEach(p => console.log(` - [${p.role}] ${p.full_name} (${p.id})`))

  const teacherId = profiles?.find(p => p.role === 'TEACHER' || p.role === 'ADMIN')?.id || profiles?.[0]?.id

  if (!teacherId) {
    console.error('No profiles found in Supabase database. Cannot assign teacher_id.')
    process.exit(1)
  }

  console.log('Using teacher_id:', teacherId)

  // 2. Check existing courses
  const { data: existingCourses, error: courseErr } = await supabase
    .from('courses')
    .select('id, slug, title')

  if (courseErr) {
    console.error('Error fetching existing courses:', courseErr.message)
    process.exit(1)
  }

  console.log(`Current courses in Supabase (${existingCourses?.length || 0}):`)
  existingCourses?.forEach(c => console.log(` - ${c.title} (${c.slug})`))

  // 3. Upsert the 3 courses
  const targetCourses = [
    {
      title: 'Phát âm tiếng Anh',
      slug: 'phat-am-tieng-anh',
      description: 'Tìm được chất giọng tiếng Anh của mình. Chữa lỗi phát âm 99% người Việt mắc phải. Các mẹo phát âm rõ ràng, giao tiếp hiệu quả.',
      category: 'Tiếng Anh nền tảng',
      level: 'beginner',
      target_audience: 'Người mất gốc, người muốn cải thiện phát âm',
      price: 1200000,
      discounted_price: 1200000,
      total_lessons: 20,
      thumbnail_url: null,
      teacher_id: teacherId,
      status: 'published',
    },
    {
      title: 'Từ vựng tiếng Anh',
      slug: 'tu-vung-tieng-anh',
      description: 'Nắm vững loạt từ vựng thiết yếu cho các chủ đề thường gặp. Phân biệt các từ gần nghĩa. Xây dựng tư duy học từ vựng dựa trên gốc từ.',
      category: 'Tiếng Anh nền tảng',
      level: 'beginner',
      target_audience: 'Người muốn xây dựng vốn từ vựng nền tảng',
      price: 1200000,
      discounted_price: 1200000,
      total_lessons: 20,
      thumbnail_url: null,
      teacher_id: teacherId,
      status: 'published',
    },
    {
      title: 'Ngữ pháp tiếng Anh',
      slug: 'ngu-phap-tieng-anh',
      description: 'Học các thì một cách nhẹ nhàng và vận dụng ngay trong ngữ cảnh thích hợp. Hiểu lý do của những quy tắc và ngoại lệ.',
      category: 'Tiếng Anh nền tảng',
      level: 'beginner',
      target_audience: 'Người muốn nắm vững ngữ pháp thực hành',
      price: 1200000,
      discounted_price: 1200000,
      total_lessons: 20,
      thumbnail_url: null,
      teacher_id: teacherId,
      status: 'published',
    },
  ]

  for (const course of targetCourses) {
    const existing = existingCourses?.find(c => c.slug === course.slug)
    if (existing) {
      console.log(`Updating course: ${course.title}...`)
      const { error: updErr } = await supabase
        .from('courses')
        .update(course)
        .eq('id', existing.id)
      if (updErr) console.error(`Failed to update ${course.title}:`, updErr.message)
      else console.log(`✓ Updated: ${course.title}`)
    } else {
      console.log(`Inserting course: ${course.title}...`)
      const { error: insErr } = await supabase
        .from('courses')
        .insert(course)
      if (insErr) console.error(`Failed to insert ${course.title}:`, insErr.message)
      else console.log(`✓ Inserted: ${course.title}`)
    }
  }

  // Archive old sample courses not in the target list so only the 3 courses are active
  const targetSlugs = targetCourses.map(c => c.slug)
  const { error: archErr } = await supabase
    .from('courses')
    .update({ status: 'archived' })
    .not('slug', 'in', `(${targetSlugs.join(',')})`)

  if (archErr) {
    console.error('Error archiving old courses:', archErr.message)
  } else {
    console.log('✓ Archived non-target courses successfully')
  }

  // 4. Verify after upsert
  const { data: verified, error: verifyErr } = await supabase
    .from('courses')
    .select('id, title, slug, category, status')
    .eq('status', 'published')

  console.log('\n--- VERIFICATION RESULT ---')
  if (verifyErr) {
    console.error('Verify error:', verifyErr.message)
  } else {
    console.log(`Total courses in Supabase: ${verified?.length}`)
    verified?.forEach(c => console.log(` - [${c.status}] ${c.title} (${c.slug}) [${c.category}]`))
  }
}

run()
