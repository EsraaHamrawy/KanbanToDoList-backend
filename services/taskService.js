import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dbFilePath } from '../config/db.js'
import { buildTaskRecord, validateTaskPayload } from '../models/taskModel.js'

const emptyDatabase = { tasks: [] }

const ensureDatabaseDir = async () => {
  await mkdir(path.dirname(dbFilePath), { recursive: true })
}

const readDatabase = async () => {
  await ensureDatabaseDir()

  try {
    const raw = await readFile(dbFilePath, 'utf8')
    return raw.trim() ? JSON.parse(raw) : emptyDatabase
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(dbFilePath, JSON.stringify(emptyDatabase, null, 2))
      return emptyDatabase
    }

    throw error
  }
}

const writeDatabase = async (database) => {
  await ensureDatabaseDir()
  await writeFile(dbFilePath, JSON.stringify(database, null, 2))
}

const nextOrderForColumn = (tasks, column) => {
  const columnOrders = tasks
    .filter((task) => task.column === column)
    .map((task) => (Number.isInteger(task.order) ? task.order : 0))

  return (columnOrders.length ? Math.max(...columnOrders) : -1) + 1
}

export const getTasks = async () => {
  const database = await readDatabase()
  return database.tasks || []
}

export const createTask = async (payload) => {
  const validation = validateTaskPayload(payload)
  if (!validation.isValid) {
    const error = new Error('Invalid task payload')
    error.status = 400
    error.details = validation.errors
    throw error
  }

  const database = await readDatabase()
  const task = buildTaskRecord(
    {
      ...payload,
      order: Number.isInteger(payload.order)
        ? payload.order
        : nextOrderForColumn(database.tasks || [], payload.column),
    }
  )

  database.tasks = [...(database.tasks || []), task]
  await writeDatabase(database)

  return task
}

export const updateTask = async (id, payload) => {
  const database = await readDatabase()
  const index = (database.tasks || []).findIndex((task) => task.id === id)

  if (index === -1) {
    return null
  }

  const nextPayload = { ...database.tasks[index], ...payload, id }
  const validation = validateTaskPayload(nextPayload)

  if (!validation.isValid) {
    const error = new Error('Invalid task payload')
    error.status = 400
    error.details = validation.errors
    throw error
  }

  const updatedTask = buildTaskRecord(nextPayload, database.tasks[index])
  database.tasks[index] = updatedTask

  await writeDatabase(database)

  return updatedTask
}

export const deleteTask = async (id) => {
  const database = await readDatabase()
  const nextTasks = (database.tasks || []).filter((task) => task.id !== id)

  if (nextTasks.length === (database.tasks || []).length) {
    return false
  }

  database.tasks = nextTasks
  await writeDatabase(database)

  return true
}
