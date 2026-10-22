import type { Request, Response, NextFunction } from 'express'
import { usersService } from './users.service.js'
import type { ApiResponse, CreateUserDto, UserQueryParams, UserRole, UserStatus } from './users.types.js'

export class UsersController {
  /**
   * GET /api/users
   * Fetch paginated list of users with search and filter
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams: UserQueryParams = {
        search: req.query.search ? String(req.query.search) : undefined,
        role: req.query.role ? (String(req.query.role).toUpperCase() as 'ALL' | UserRole) : 'ALL',
        status: req.query.status ? (String(req.query.status).toLowerCase() as 'ALL' | UserStatus) : 'ALL',
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
      }

      const result = await usersService.getUsers(queryParams)

      const response: ApiResponse = {
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      }

      res.status(200).json(response)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/users
   * Create new teacher or admin account
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateUserDto = {
        full_name: req.body.full_name,
        nickname: req.body.nickname,
        email: req.body.email,
        phone_number: req.body.phone_number,
        role: req.body.role,
        password: req.body.password,
        avatar_url: req.body.avatar_url,
      }

      const createdUser = await usersService.createUser(dto)

      const response: ApiResponse = {
        success: true,
        message: 'Khởi tạo tài khoản thành công',
        data: createdUser,
      }

      res.status(201).json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi khởi tạo tài khoản'
      res.status(400).json({
        success: false,
        message,
      })
    }
  }

  /**
   * PATCH /api/users/:id/status
   * Lock or activate user account
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id ? String(req.params.id) : ''
      const { status } = req.body

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'User ID là bắt buộc',
        })
        return
      }

      if (!status || !['active', 'locked', 'pending'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ (active, locked, pending)',
        })
        return
      }

      const updated = await usersService.updateStatus(id, status as UserStatus)

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: updated,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi cập nhật trạng thái'
      res.status(400).json({
        success: false,
        message,
      })
    }
  }

  /**
   * DELETE /api/users/:id
   * Delete user account
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id ? String(req.params.id) : ''
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'User ID là bắt buộc',
        })
        return
      }

      await usersService.deleteUser(id)

      res.status(200).json({
        success: true,
        message: 'Xóa người dùng thành công',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi xóa người dùng'
      res.status(400).json({
        success: false,
        message,
      })
    }
  }

  /**
   * GET /api/users/export
   * Export users list as CSV file
   */
  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParams: UserQueryParams = {
        search: req.query.search ? String(req.query.search) : undefined,
        role: req.query.role ? (String(req.query.role).toUpperCase() as 'ALL' | UserRole) : 'ALL',
        status: req.query.status ? (String(req.query.status).toLowerCase() as 'ALL' | UserStatus) : 'ALL',
      }

      const csvData = await usersService.exportCsv(queryParams)

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="engmaster_users.csv"')
      res.status(200).send(csvData)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /api/users/seed
   * Seed sample data into Supabase if empty
   */
  async seedUsers(_req: Request, res: Response): Promise<void> {
    try {
      const result = await usersService.seedUsers()
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi seed dữ liệu'
      res.status(400).json({
        success: false,
        message,
      })
    }
  }
}

export const usersController = new UsersController()

