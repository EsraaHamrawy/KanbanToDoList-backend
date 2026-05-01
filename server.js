import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT) || 3002

const ALLOWED_COLUMNS = new Set(['backlog', 'in_progress', 'review', 'done'])
const ALLOWED_PRIORITIES = new Set(['High', 'Medium', 'Low'])

const normalizeColumn = (value, fallbackCompleted = false) => {
  if (value === undefined || value === null || value === '') {
    return fallbackCompleted ? 'done' : 'backlog'
  }

  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_')

  if (normalized === 'todo' || normalized === 'to_do' || normalized === 'to-do') return 'backlog'
  if (normalized === 'inprogress' || normalized === 'in-progress') return 'in_progress'
  if (normalized === 'inreview' || normalized === 'in-review') return 'review'
  if (normalized === 'completed') return 'done'

  return ALLOWED_COLUMNS.has(normalized) ? normalized : fallbackCompleted ? 'done' : 'backlog'
}

const normalizePriority = (value) => {
  if (typeof value !== 'string') return 'Medium'
  const trimmed = value.trim()
  return ALLOWED_PRIORITIES.has(trimmed) ? trimmed : 'Medium'
}

const normalizeOrder = (value, fallback = 0) => (Number.isInteger(value) ? value : fallback)

const nextOrderForColumn = (column) => {
  const orders = tasks.filter((task) => task.column === column).map((task) => task.order)
  return (orders.length > 0 ? Math.max(...orders) : -1) + 1
}

// Temporary in-memory storage
// Data resets whenever server restarts
const tasks = []

app.get('/', (_req, res) => {
  res.json({ message: 'Simple Node.js Tasks API is running' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// GET /tasks
app.get('/tasks', (_req, res) => {
  const normalizedTasks = tasks.map((task) => {
    const column = normalizeColumn(task.column, task.completed)
    return {
      ...task,
      column,
      priority: normalizePriority(task.priority),
      order: normalizeOrder(task.order),
      completed: column === 'done',
    }
  })

  res.json(normalizedTasks)
})

// GET /tasks/:id
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find((item) => item.id === req.params.id)

  if (!task) {
    res.status(404).json({ message: 'Task not found' })
    return
  }

  res.json(task)
})

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title = '', description = '', column, priority, order } = req.body || {}

  if (!title || typeof title !== 'string') {
    res.status(400).json({ message: 'title is required and must be a string' })
    return
  }

  if (column !== undefined && typeof column !== 'string') {
    res.status(400).json({ message: 'column must be a string' })
    return
  }

  if (priority !== undefined && typeof priority !== 'string') {
    res.status(400).json({ message: 'priority must be a string' })
    return
  }

  if (order !== undefined && !Number.isInteger(order)) {
    res.status(400).json({ message: 'order must be an integer' })
    return
  }

  const normalizedColumn = normalizeColumn(column)
  const newTask = {
    id: randomUUID(),
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    priority: normalizePriority(priority),
    column: normalizedColumn,
    order: normalizeOrder(order, nextOrderForColumn(normalizedColumn)),
    completed: normalizedColumn === 'done',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  tasks.push(newTask)
  res.status(201).json(newTask)
})

// PUT /tasks/:id
app.put('/tasks/:id', (req, res) => {
  const index = tasks.findIndex((item) => item.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ message: 'Task not found' })
    return
  }

  const currentTask = tasks[index]
  const { title, description, completed, column, priority, order } = req.body || {}

  if (title !== undefined && typeof title !== 'string') {
    res.status(400).json({ message: 'title must be a string' })
    return
  }

  if (description !== undefined && typeof description !== 'string') {
    res.status(400).json({ message: 'description must be a string' })
    return
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ message: 'completed must be a boolean' })
    return
  }

  if (column !== undefined && typeof column !== 'string') {
    res.status(400).json({ message: 'column must be a string' })
    return
  }

  if (priority !== undefined && typeof priority !== 'string') {
    res.status(400).json({ message: 'priority must be a string' })
    return
  }

  if (order !== undefined && !Number.isInteger(order)) {
    res.status(400).json({ message: 'order must be an integer' })
    return
  }

  const normalizedColumn = normalizeColumn(column, completed !== undefined ? completed : currentTask.completed)

  const updatedTask = {
    ...currentTask,
    title: title !== undefined ? title.trim() : currentTask.title,
    description: description !== undefined ? description.trim() : currentTask.description,
    priority: priority !== undefined ? normalizePriority(priority) : normalizePriority(currentTask.priority),
    column: normalizedColumn,
    order: normalizeOrder(order, currentTask.order ?? nextOrderForColumn(normalizedColumn)),
    completed: normalizedColumn === 'done',
    updatedAt: new Date().toISOString(),
  }

  tasks[index] = updatedTask
  res.json(updatedTask)
})

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex((item) => item.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ message: 'Task not found' })
    return
  }

  tasks.splice(index, 1)
  res.status(204).send()
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
