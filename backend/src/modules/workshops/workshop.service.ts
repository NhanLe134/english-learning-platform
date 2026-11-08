import { env } from '../../config/env.js'
import { workshopRepository } from './workshop.repository.js'
import type { WorkshopListItem } from './workshop.types.js'

export class WorkshopRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message)
    this.name = 'WorkshopRequestError'
  }
}

export class WorkshopService {
  constructor(private readonly repository = workshopRepository) {}

  /** Danh sách workshop mới nhất cho trang chủ — mặc định 2 workshop */
  async listLatestWorkshops(query: Record<string, unknown>): Promise<WorkshopListItem[]> {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new WorkshopRequestError('Workshops are not configured.', 503)
    }

    const rawLimit = query.limit ?? '2'
    const limit = Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      throw new WorkshopRequestError('limit must be an integer between 1 and 10.', 400)
    }

    return this.repository.findLatestWorkshops(limit)
  }
}

export const workshopService = new WorkshopService()
