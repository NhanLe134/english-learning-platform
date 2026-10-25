import { Router } from 'express'
import { authorize } from '../../middlewares/authorize.js'
import { authenticate } from '../auth/auth.middleware.js'
import { usersController } from './users.controller.js'

export const usersRouter = Router()

usersRouter.use(authenticate, authorize('ADMIN'))

// User list and search
usersRouter.get('/', (req, res, next) => usersController.getUsers(req, res, next))

// Export CSV
usersRouter.get('/export', (req, res, next) => usersController.exportCsv(req, res, next))

// Create teacher or admin
usersRouter.post('/', (req, res, next) => usersController.createUser(req, res, next))

// Seed sample data to Supabase if empty
usersRouter.post('/seed', (req, res) => usersController.seedUsers(req, res))

// Update user status
usersRouter.patch('/:id/status', (req, res, next) => usersController.updateStatus(req, res, next))

// Delete user
usersRouter.delete('/:id', (req, res, next) => usersController.deleteUser(req, res, next))
