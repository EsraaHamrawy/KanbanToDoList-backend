import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT) || 3002

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
  res.json(tasks)
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
  const { title = '', description = '' } = req.body || {}

  if (!title || typeof title !== 'string') {
    res.status(400).json({ message: 'title is required and must be a string' })
    return
  }

  const newTask = {
    id: randomUUID(),
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    completed: false,
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
  const { title, description, completed } = req.body || {}

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

  const updatedTask = {
    ...currentTask,
    title: title !== undefined ? title.trim() : currentTask.title,
    description: description !== undefined ? description.trim() : currentTask.description,
    completed: completed !== undefined ? completed : currentTask.completed,
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
