import dotenv from 'dotenv'

dotenv.config()

const rawCorsOrigin = process.env.CORS_ORIGIN || ''

export const env = {
  port: Number(process.env.PORT) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: rawCorsOrigin
    ? rawCorsOrigin.startsWith('http')
      ? rawCorsOrigin
      : `https://${rawCorsOrigin}`
    : '',
}
