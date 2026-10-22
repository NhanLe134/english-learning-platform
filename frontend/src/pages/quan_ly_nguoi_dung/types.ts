export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type UserStatus = 'active' | 'locked' | 'pending'

export interface UserProfile {
  id: string
  email: string
  password_hash: string
  full_name: string
  nickname?: string | null
  phone_number?: string | null
  role: UserRole
  avatar_url?: string | null
  status: UserStatus
  is_verified?: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  full_name: string
  nickname?: string
  email: string
  phone_number?: string
  role: 'TEACHER' | 'ADMIN'
  password?: string
  avatar_url?: string
}

export interface UserFilterState {
  search: string
  role: 'ALL' | UserRole
  status: 'ALL' | UserStatus
  page: number
  limit: number
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  pagination?: PaginationInfo
}
