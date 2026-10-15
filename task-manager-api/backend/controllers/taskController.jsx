const { Task, memoryTasks, getNextMemoryTaskId } = require('../data/task');
const { getCache, setCache, delCache, getStats } = require('../cache');
const taskEvents = require('../events');

let isMongoConnected = false;

function setMongoConnectionState(connected) {
  isMongoConnected = connected;
}

function serializeTask(task) {
  if (!task) return null;

  if (task.toObject) {
    const plainTask = task.toObject();
    return {
      ...plainTask,
      id: plainTask._id?.toString?.() || plainTask.id
    };
  }

  return { ...task, id: task.id };
}

async function getTasks(req, res) {
  const cachedData = getCache('all_tasks');
  if (cachedData) {
    return res.status(200).json({ ...cachedData, cached: true });
  }

  let tasks;
  if (isMongoConnected) {
    tasks = await Task.find().sort({ createdAt: -1 });
  } else {
    tasks = memoryTasks;
  }

  const responsePayload = { success: true, tasks: tasks.map(serializeTask) };
  setCache('all_tasks', responsePayload);
  return res.status(200).json(responsePayload);
}

async function createTask(req, res) {
  const { title, description, dueDate, priority, status } = req.body;

  if (!title || !description) {
    return res.status(400).json({ success: false, error: 'Missing required task fields' });
  }

  const taskData = {
    id: getNextMemoryTaskId(),
    title,
    description,
    dueDate: dueDate ? new Date(dueDate) : new Date(),
    priority: priority || 'normal',
    status: status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let createdTask;
  if (isMongoConnected) {
    const task = await Task.create(taskData);
    createdTask = serializeTask(task);
  } else {
    memoryTasks.push(taskData);
    createdTask = serializeTask(taskData);
  }

  delCache('all_tasks');
  console.log(`[API] Response sent at ${new Date().toISOString()}`);
  res.status(201).json({ success: true, task: createdTask });
  taskEvents.emit('task-created', createdTask, req.user);
}

async function getTask(req, res) {
  const { id } = req.params;
  const cacheKey = `task_${id}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  const task = isMongoConnected
    ? await Task.findById(id)
    : memoryTasks.find((taskItem) => taskItem.id === id || taskItem._id?.toString?.() === id);

  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  const payload = { success: true, task: serializeTask(task) };
  setCache(cacheKey, payload);
  return res.status(200).json(payload);
}

async function updateTask(req, res) {
  const { id } = req.params;

  let serializedUpdated;
  if (isMongoConnected) {
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedTask) return res.status(404).json({ success: false, error: 'Task not found' });
    serializedUpdated = serializeTask(updatedTask);
  } else {
    const taskIndex = memoryTasks.findIndex((task) => task.id === id || task._id?.toString?.() === id);
    if (taskIndex === -1) return res.status(404).json({ success: false, error: 'Task not found' });

    const updatedTask = { ...memoryTasks[taskIndex], ...req.body, id, updatedAt: new Date() };
    memoryTasks[taskIndex] = updatedTask;
    serializedUpdated = serializeTask(updatedTask);
  }

  delCache('all_tasks');
  delCache(`task_${id}`);
  return res.status(200).json({ success: true, task: serializedUpdated });
}

async function deleteTask(req, res) {
  const { id } = req.params;

  if (isMongoConnected) {
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) return res.status(404).json({ success: false, error: 'Task not found' });
  } else {
    const taskIndex = memoryTasks.findIndex((task) => task.id === id || task._id?.toString?.() === id);
    if (taskIndex === -1) return res.status(404).json({ success: false, error: 'Task not found' });

    memoryTasks.splice(taskIndex, 1);
  }

  delCache('all_tasks');
  delCache(`task_${id}`);
  res.status(200).json({ success: true, message: 'Task deleted successfully' });
  taskEvents.emit('task-deleted', id, req.user);
}

async function getCacheStats(req, res) {
  return res.status(200).json({ success: true, ...getStats() });
}

module.exports = {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  getCacheStats,
  setMongoConnectionState,
  updateTask
};
