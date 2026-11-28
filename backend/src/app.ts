import cors from 'cors'
import express from 'express'
import type { Request } from 'express'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { CorsOriginError } from './middlewares/corsOriginError.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { coursesRouter } from './modules/courses/course.routes.js'
import { usersRouter } from './modules/users/users.routes.js'

import { paymentsRouter } from './modules/payments/payments.routes.js'

import { workshopsRouter } from './modules/workshops/workshop.routes.js'
import { dailyWordRouter } from './modules/daily-word/daily-word.routes.js'
import { teacherRouter } from './modules/teachers/teacher.routes.js'
import { lessonsRouter } from './modules/lessons/lessons.routes.js'
import { exercisesRouter } from './modules/exercises/exercises.routes.js'
import { openApiDocument } from './openapi.js'

export const app = express()

const allowedOrigins: string[] = [new URL(env.frontendUrl).origin]
if (env.nodeEnv !== 'production') {
  try {
    const parsedFrontend = new URL(env.frontendUrl)
    const port = parsedFrontend.port || '5173'
    const protocol = parsedFrontend.protocol
    if (parsedFrontend.hostname === 'localhost' || parsedFrontend.hostname === '127.0.0.1') {
      allowedOrigins.push(`${protocol}//localhost:${port}`)
      allowedOrigins.push(`${protocol}//127.0.0.1:${port}`)
    }
    // Allow the Vite dev proxy target so proxied /api requests are not
    // rejected by CORS when the frontend runs on localhost:5173.
    allowedOrigins.push(`${protocol}//localhost:5000`)
    // Also allow the configured FRONTEND_URL origin directly.
    allowedOrigins.push(env.frontendUrl)
  } catch {
    // ignore
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new CorsOriginError())
    }
  },
  credentials: true,
}))
app.use('/api/exercises', express.json({ limit: '256kb' }))
app.use(express.json({
  limit: '16kb',
  verify: (request, _response, body) => {
    if ((request as Request).originalUrl.startsWith('/api/payment/sepay-bank-webhook')) {
      Object.assign(request, { rawBody: Buffer.from(body) })
    }
  },
}))

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

// User Management Routes
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/lessons', lessonsRouter)
app.use('/api/exercises', exercisesRouter)

app.use('/api/payment', paymentsRouter)

app.use('/api/workshops', workshopsRouter)
app.use('/api/daily-word', dailyWordRouter)
app.use('/api/teachers', teacherRouter)

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
