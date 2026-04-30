import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import taskRoutes from './routes/taskRoutes.js'
import { env } from './config/env.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())

const allowedOrigins = env.nodeEnv === 'production' ? env.corsOrigins : []
const allowAllOrigins = env.nodeEnv !== 'production'

const corsOptions = {
  origin(origin, callback) {
    if (allowAllOrigins || !origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
  },
}

app.use(
  cors({
    ...corsOptions,
  })
)
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'ToDo backend is running' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/tasks', taskRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
