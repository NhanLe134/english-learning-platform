import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { openApiDocument } from './openapi.js'

export const app = express()

app.use(cors({ origin: new URL(env.frontendUrl).origin, credentials: true }))
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

// User Management Routes
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)

app.get('/docs/openapi.json', (_request, response) => {
  response.status(200).json(openApiDocument)
})
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'English Learning Platform API',
    swaggerOptions: { url: '/docs/openapi.json', withCredentials: true },
  })
)

app.use(errorHandler)
