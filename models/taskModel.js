const toText = (value) => (typeof value === 'string' ? value.trim() : '')

export const normalizeTaskPayload = (payload = {}) => ({
  id: toText(payload.id),
  title: toText(payload.title),
  description: toText(payload.description),
  priority: toText(payload.priority),
  column: toText(payload.column),
  order: Number.isInteger(payload.order) ? payload.order : undefined,
})

export const validateTaskPayload = (payload = {}) => {
  const task = normalizeTaskPayload(payload)
  const errors = {}

  if (!task.title) errors.title = 'Title is required'
  if (!task.description) errors.description = 'Description is required'
  if (!task.priority) errors.priority = 'Priority is required'
  if (!task.column) errors.column = 'Column is required'

  if (payload.order !== undefined && !Number.isInteger(payload.order)) {
    errors.order = 'Order must be an integer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    task,
  }
}
