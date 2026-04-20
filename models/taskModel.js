import { randomUUID } from 'node:crypto'

const toText = (value) => (typeof value === 'string' ? value.trim() : '')

export const buildTaskRecord = (payload = {}, existingTask = null) => ({
  id: toText(payload.id) || existingTask?.id || randomUUID(),
  title: toText(payload.title ?? existingTask?.title),
  description: toText(payload.description ?? existingTask?.description),
  priority: toText(payload.priority ?? existingTask?.priority),
  column: toText(payload.column ?? existingTask?.column),
  order: Number.isInteger(payload.order) ? payload.order : existingTask?.order ?? 0,
})

export const validateTaskPayload = (payload = {}) => {
  const errors = {}

  if (!toText(payload.title)) errors.title = 'Title is required'
  if (!toText(payload.description)) errors.description = 'Description is required'
  if (!toText(payload.priority)) errors.priority = 'Priority is required'
  if (!toText(payload.column)) errors.column = 'Column is required'

  if (payload.order !== undefined && !Number.isInteger(payload.order)) {
    errors.order = 'Order must be an integer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
