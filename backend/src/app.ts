import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'

export const app = express()

app.use(cors({ origin: env.frontendUrl }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

app.use(errorHandler)
