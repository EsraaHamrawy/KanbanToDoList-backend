import { createTask, deleteTask, getTasks, updateTask } from '../services/taskService.js'

export const listTasks = async (_req, res, next) => {
  try {
    res.json(await getTasks())
  } catch (error) {
    next(error)
  }
}

export const addTask = async (req, res, next) => {
  try {
    const task = await createTask(req.body)
    res.status(201).json(task)
  } catch (error) {
    next(error)
  }
}

export const editTask = async (req, res, next) => {
  try {
    const task = await updateTask(req.params.id, req.body)

    if (!task) {
      res.status(404).json({ message: 'Task not found' })
      return
    }

    res.json(task)
  } catch (error) {
    next(error)
  }
}

export const removeTask = async (req, res, next) => {
  try {
    const removed = await deleteTask(req.params.id)

    if (!removed) {
      res.status(404).json({ message: 'Task not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
