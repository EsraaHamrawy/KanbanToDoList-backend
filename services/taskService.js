import { randomUUID } from 'node:crypto'
import prisma from '../config/prisma.js'
import { normalizeTaskPayload, validateTaskPayload } from '../models/taskModel.js'

let useMemoryStore = false
const memoryTasks = []

const isDatabaseUnavailableError = (error) => {
  return (
    error?.code === 'P1001' ||
    error?.code === 'P1002' ||
    /can't reach database server|database server/i.test(error?.message || '')
  )
}

const withDbFallback = async (operation, fallback) => {
  if (useMemoryStore) {
    return fallback()
  }

  try {
    return await operation()
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error

    useMemoryStore = true
    console.warn('Database unavailable. Falling back to in-memory task store for development.')
    return fallback()
  }
}

const nextOrderForColumn = async (column) => {
  const result = await prisma.task.aggregate({
    where: { column },
    _max: { order: true },
  })

  return (result._max.order ?? -1) + 1
}

const nextMemoryOrderForColumn = (column) => {
  const orders = memoryTasks.filter((task) => task.column === column).map((task) => task.order)
  return (orders.length > 0 ? Math.max(...orders) : -1) + 1
}

export const getTasks = async () => {
  return withDbFallback(
    () =>
      prisma.task.findMany({
        orderBy: [{ column: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      }),
    () => [...memoryTasks].sort((a, b) => a.column.localeCompare(b.column) || a.order - b.order)
  )
}

export const createTask = async (payload) => {
  const validation = validateTaskPayload(payload)
  if (!validation.isValid) {
    const error = new Error('Invalid task payload')
    error.status = 400
    error.details = validation.errors
    throw error
  }

  const task = validation.task

  return withDbFallback(
    async () => {
      const order = Number.isInteger(task.order) ? task.order : await nextOrderForColumn(task.column)

      return prisma.task.create({
        data: {
          id: task.id || randomUUID(),
          title: task.title,
          description: task.description,
          priority: task.priority,
          column: task.column,
          order,
        },
      })
    },
    () => {
      const created = {
        id: task.id || randomUUID(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        column: task.column,
        order: Number.isInteger(task.order) ? task.order : nextMemoryOrderForColumn(task.column),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      memoryTasks.push(created)
      return created
    }
  )
}

export const updateTask = async (id, payload) => {
  return withDbFallback(
    async () => {
      const existingTask = await prisma.task.findUnique({ where: { id } })
      if (!existingTask) return null

      const patch = normalizeTaskPayload(payload)
      const nextPayload = {
        id,
        title: patch.title || existingTask.title,
        description: patch.description || existingTask.description,
        priority: patch.priority || existingTask.priority,
        column: patch.column || existingTask.column,
        order: patch.order ?? existingTask.order,
      }

      const validation = validateTaskPayload(nextPayload)
      if (!validation.isValid) {
        const error = new Error('Invalid task payload')
        error.status = 400
        error.details = validation.errors
        throw error
      }

      const task = validation.task
      return prisma.task.update({
        where: { id },
        data: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          column: task.column,
          order: Number.isInteger(task.order) ? task.order : existingTask.order,
        },
      })
    },
    () => {
      const existingIndex = memoryTasks.findIndex((task) => task.id === id)
      if (existingIndex === -1) return null

      const existingTask = memoryTasks[existingIndex]
      const patch = normalizeTaskPayload(payload)
      const nextPayload = {
        id,
        title: patch.title || existingTask.title,
        description: patch.description || existingTask.description,
        priority: patch.priority || existingTask.priority,
        column: patch.column || existingTask.column,
        order: patch.order ?? existingTask.order,
      }

      const validation = validateTaskPayload(nextPayload)
      if (!validation.isValid) {
        const error = new Error('Invalid task payload')
        error.status = 400
        error.details = validation.errors
        throw error
      }

      const task = validation.task
      const updated = {
        ...existingTask,
        title: task.title,
        description: task.description,
        priority: task.priority,
        column: task.column,
        order: Number.isInteger(task.order) ? task.order : existingTask.order,
        updatedAt: new Date().toISOString(),
      }
      memoryTasks[existingIndex] = updated
      return updated
    }
  )
}

export const deleteTask = async (id) => {
  return withDbFallback(
    async () => {
      const existingTask = await prisma.task.findUnique({ where: { id } })
      if (!existingTask) return false

      await prisma.task.delete({ where: { id } })
      return true
    },
    () => {
      const existingIndex = memoryTasks.findIndex((task) => task.id === id)
      if (existingIndex === -1) return false

      memoryTasks.splice(existingIndex, 1)
      return true
    }
  )
}
