import { createSupabaseClient } from '../../config/supabase.js'
import type { WorkshopListItem, WorkshopTeacher } from './workshop.types.js'

interface WorkshopRow {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  price: number | string
  max_participants: number
  status: string
  created_at: string
  teacher: WorkshopTeacher | WorkshopTeacher[] | null
}

const WORKSHOP_COLUMNS =
  'id,title,description,start_time,end_time,price,max_participants,status,created_at,' +
  'teacher:profiles!workshops_teacher_id_fkey(id,full_name,avatar_url)'

function toListItem(row: WorkshopRow): WorkshopListItem {
  const teacher = Array.isArray(row.teacher) ? row.teacher[0] ?? null : row.teacher
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    maxParticipants: row.max_participants,
    status: row.status,
    createdAt: row.created_at,
    teacher,
  }
}

export class WorkshopRepository {
  async findLatestWorkshops(limit: number): Promise<WorkshopListItem[]> {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('workshops')
      .select(WORKSHOP_COLUMNS)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to load workshops: ${error.message}`)
    }
    return ((data ?? []) as unknown as WorkshopRow[]).map(toListItem)
  }
}

export const workshopRepository = new WorkshopRepository()
