import dotenv from 'dotenv'

dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const rawCorsOrigin = process.env.CORS_ORIGIN
const databaseUrl = process.env.DATABASE_URL

const parseCorsOrigins = (value) => {
  if (!value) return []

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => (origin.startsWith('http') ? origin : `https://${origin}`))
    .map((origin) => origin.replace(/\/+$/, ''))
}

if (isProduction) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set in production')
  }

  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must not point to localhost in production')
  }

  if (!rawCorsOrigin) {
    throw new Error('CORS_ORIGIN must be set in production')
  }
}

export const env = {
  port: Number(process.env.PORT) || 3002,
  nodeEnv,
  corsOrigins: parseCorsOrigins(rawCorsOrigin),
}
