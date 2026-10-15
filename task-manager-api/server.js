const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./backend/middleware/logger.jsx');
const validateContentType = require('./backend/middleware/validateContenty.jsx');
const errorHandler = require('./backend/middleware/errorhandler.jsx');
const authRouter = require('./backend/router/authrouter.jsx');
const taskRouter = require('./backend/router/taskrouter.jsx');
const aiRouter = require('./backend/router/airouter.jsx');
const { setMongoConnectionState } = require('./backend/controllers/taskController.jsx');
const { setUserMongoConnectionState } = require('./backend/controllers/authController.jsx');
require('./backend/listeners.js');

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(logger);
app.use(validateContentType);
app.use(express.json());
app.use(authRouter);
app.use(taskRouter);
app.use(aiRouter);

app.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    name: 'Task Manager Backend API',
    version: '1.0.0',
    status: 'running',
    database: isDbConnected ? 'connected (MongoDB)' : 'in-memory storage fallback',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        currentUser: 'GET /auth/me (Bearer token)'
      },
      tasks: {
        list: 'GET /tasks (Bearer token)',
        create: 'POST /tasks (Bearer token)',
        getOne: 'GET /tasks/:id (Bearer token)',
        update: 'PUT /tasks/:id (Bearer token)',
        delete: 'DELETE /tasks/:id (Bearer token)',
        cacheStats: 'GET /tasks/cache/stats (Bearer token)'
      },
      ai: {
        generateDescription: 'POST /api/ai/generate-description'
      },
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    database: isDbConnected ? 'connected (MongoDB)' : 'in-memory fallback',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

async function connectToMongo() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_manager_db';

  try {
    await mongoose.connect(mongoUri);
    setMongoConnectionState(true);
    setUserMongoConnectionState(true);
    console.log(`MongoDB connected to ${mongoUri}`);
  } catch (error) {
    setMongoConnectionState(false);
    setUserMongoConnectionState(false);
    console.warn('MongoDB connection failed, using in-memory storage:', error.message);
  }
}

if (require.main === module) {
  connectToMongo();
  app.listen(5000, () => console.log('Server running on port 5000'));
}

module.exports = { app };
