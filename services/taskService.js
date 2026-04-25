import { randomUUID } from 'node:crypto'
import prisma from '../config/prisma.js'
import { normalizeTaskPayload, validateTaskPayload } from '../models/taskModel.js'

const nextOrderForColumn = async (column) => {
  const result = await prisma.task.aggregate({
    where: { column },
    _max: { order: true },
  })

  return (result._max.order ?? -1) + 1
}

export const getTasks = async () => {
  return prisma.task.findMany({
    orderBy: [{ column: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })
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
  const order = Number.isInteger(task.order) ? task.order : await nextOrderForColumn(task.column)
  const id = task.id || randomUUID()

  return prisma.task.create({
    data: {
      id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      column: task.column,
      order,
    },
  })
}

export const updateTask = async (id, payload) => {
  const existingTask = await prisma.task.findUnique({ where: { id } })

  if (!existingTask) {
    return null
  }

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
}

export const deleteTask = async (id) => {
  const existingTask = await prisma.task.findUnique({ where: { id } })

  if (!existingTask) {
    return false
  }

  await prisma.task.delete({ where: { id } })

  return true
}
