export interface WorkshopTeacher {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface WorkshopListItem {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  price: number
  maxParticipants: number
  status: string
  createdAt: string
  teacher: WorkshopTeacher | null
}
