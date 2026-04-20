import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendDir = path.dirname(fileURLToPath(import.meta.url))

export const dbFilePath = path.join(backendDir, '..', 'data', 'db.json')
