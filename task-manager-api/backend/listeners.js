const taskEvents = require('./events');

const notificationLogs = [];

function registerListeners() {
  // Error listener to catch and log any errors thrown in event handlers
  taskEvents.on('error', (err) => {
    const logEntry = {
      event: 'error',
      message: err.message || String(err),
      timestamp: new Date().toISOString()
    };
    notificationLogs.push(logEntry);
    console.error(`[Error Listener] Handled error in background listener: ${err.message}`);
  });

  // Task created listener (asynchronous background processing)
  taskEvents.on('task-created', (task, user) => {
    // Non-blocking asynchronous notification dispatch
    setImmediate(() => {
      try {
        const assignedUser = user?.email || user?.id || 'unassigned';
        const timestamp = new Date().toISOString();
        const logEntry = {
          event: 'task-created',
          title: task.title,
          id: task.id,
          assignedUser,
          timestamp
        };
        notificationLogs.push(logEntry);
        console.log(`[Notification] Task "${task.title}" created at ${timestamp} for ${assignedUser}`);
      } catch (err) {
        taskEvents.emit('error', err);
      }
    });
  });

  // Task deleted listener
  taskEvents.on('task-deleted', (taskId, user) => {
    setImmediate(() => {
      try {
        const userRef = user?.email || user?.id || 'unassigned';
        const timestamp = new Date().toISOString();
        const logEntry = {
          event: 'task-deleted',
          taskId,
          user: userRef,
          timestamp
        };
        notificationLogs.push(logEntry);
        console.log(`[Notification] Task "${taskId}" deleted at ${timestamp} by ${userRef}`);
      } catch (err) {
        taskEvents.emit('error', err);
      }
    });
  });
}

// Automatically register once on module import
registerListeners();

module.exports = {
  notificationLogs,
  getNotificationLogs: () => [...notificationLogs],
  clearNotificationLogs: () => { notificationLogs.length = 0; }
};
