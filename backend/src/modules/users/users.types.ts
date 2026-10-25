export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type UserStatus = 'active' | 'locked' | 'pending'

export interface UserProfile {
  id: string
  email: string
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

export interface CreateUserDto {
  full_name: string
  nickname?: string
  email: string
  phone_number?: string
  role: 'TEACHER' | 'ADMIN'
  password: string
  avatar_url?: string
}

export interface UserQueryParams {
  search?: string
  role?: 'ALL' | UserRole
  status?: 'ALL' | UserStatus
  page?: number
  limit?: number
  sortBy?: 'created_at' | 'full_name' | 'email'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
