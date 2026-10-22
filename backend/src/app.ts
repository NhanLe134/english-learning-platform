import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { usersRouter } from './modules/users/users.routes.js'

export const app = express()

app.use(cors({ origin: env.frontendUrl }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

// User Management Routes
app.use('/api/users', usersRouter)

app.use(errorHandler)

