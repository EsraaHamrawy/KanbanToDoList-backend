import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT) || 3002
const DATABASE_URL = process.env.DATABASE_URL

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

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    priority: { type: String, enum: [...ALLOWED_PRIORITIES], default: 'Medium' },
    column: { type: String, enum: [...ALLOWED_COLUMNS], default: 'backlog', index: true },
    order: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
)

const TaskModel = mongoose.model('Task', taskSchema)

const mapTask = (taskDoc) => {
  const plain = taskDoc.toObject ? taskDoc.toObject() : taskDoc
  const column = normalizeColumn(plain.column, plain.completed)

  return {
    ...plain,
    id: plain.id,
    title: plain.title,
    description: plain.description,
    priority: normalizePriority(plain.priority),
    column,
    order: normalizeOrder(plain.order),
    completed: column === 'done',
  }
}

const nextOrderForColumn = async (column) => {
  const topTask = await TaskModel.findOne({ column }).sort({ order: -1 }).lean()
  return (topTask?.order ?? -1) + 1
}

app.get('/', (_req, res) => {
  res.json({ message: 'Simple Node.js Tasks API is running' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState })
})

// GET /tasks
app.get('/tasks', async (_req, res) => {
  try {
    const taskDocs = await TaskModel.find().sort({ createdAt: 1 }).lean()
    const normalizedTasks = taskDocs.map(mapTask)
    res.json(normalizedTasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    res.status(500).json({ message: 'Failed to fetch tasks' })
  }
})

// GET /tasks/:id
app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await TaskModel.findOne({ id: req.params.id }).lean()

    if (!task) {
      res.status(404).json({ message: 'Task not found' })
      return
    }

    res.json(mapTask(task))
  } catch (error) {
    console.error('Failed to fetch task by id:', error)
    res.status(500).json({ message: 'Failed to fetch task' })
  }
})

// POST /tasks
app.post('/tasks', async (req, res) => {
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

  try {
    const normalizedColumn = normalizeColumn(column)
    const now = new Date().toISOString()
    const nextOrder = normalizeOrder(order, await nextOrderForColumn(normalizedColumn))

    const newTask = await TaskModel.create({
      id: randomUUID(),
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      priority: normalizePriority(priority),
      column: normalizedColumn,
      order: nextOrder,
      completed: normalizedColumn === 'done',
      createdAt: now,
      updatedAt: now,
    })

    res.status(201).json(mapTask(newTask))
  } catch (error) {
    console.error('Failed to save task:', error)
    res.status(500).json({ message: 'Failed to save task' })
  }
})

const updateTaskHandler = async (req, res) => {
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

  try {
    const currentTask = await TaskModel.findOne({ id: req.params.id }).lean()

    if (!currentTask) {
      res.status(404).json({ message: 'Task not found' })
      return
    }

    const normalizedColumn = normalizeColumn(column, completed !== undefined ? completed : currentTask.completed)
    const resolvedOrder =
      order !== undefined
        ? order
        : currentTask.order ?? (await nextOrderForColumn(normalizedColumn))

    const updatedTask = await TaskModel.findOneAndUpdate(
      { id: req.params.id },
      {
        title: title !== undefined ? title.trim() : currentTask.title,
        description: description !== undefined ? description.trim() : currentTask.description,
        priority: priority !== undefined ? normalizePriority(priority) : normalizePriority(currentTask.priority),
        column: normalizedColumn,
        order: normalizeOrder(resolvedOrder),
        completed: normalizedColumn === 'done',
        updatedAt: new Date().toISOString(),
      },
      { new: true }
    ).lean()

    res.json(mapTask(updatedTask))
  } catch (error) {
    console.error('Failed to update task:', error)
    res.status(500).json({ message: 'Failed to update task' })
  }
}

// PUT /tasks/:id
app.put('/tasks/:id', updateTaskHandler)

// PATCH /tasks/:id
app.patch('/tasks/:id', updateTaskHandler)

// DELETE /tasks/:id
app.delete('/tasks/:id', async (req, res) => {
  try {
    const deleteResult = await TaskModel.deleteOne({ id: req.params.id })

    if (deleteResult.deletedCount === 0) {
      res.status(404).json({ message: 'Task not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete task:', error)
    res.status(500).json({ message: 'Failed to delete task' })
  }
})

const startServer = async () => {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Set it in environment variables.')
  }

  mongoose.connection.on('connected', () => {
    console.log('Database connected')
  })

  mongoose.connection.on('error', (error) => {
    console.error('Database connection error:', error)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('Database disconnected')
  })

  await mongoose.connect(DATABASE_URL, {
    serverSelectionTimeoutMS: 10000,
  })

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Unable to start server:', error)
  process.exit(1)
})
