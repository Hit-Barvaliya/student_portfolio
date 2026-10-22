const taskEvents = require('./events');

const notificationLogs = [];
let simulatedDelayMs = 0;

function setSimulatedDelay(ms) {
  simulatedDelayMs = ms;
}

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

  // Task created listener (asynchronous non-blocking background processing)
  taskEvents.on('task-created', (task, user) => {
    const delay = simulatedDelayMs || 0;
    const scheduleFn = delay > 0 ? (fn) => setTimeout(fn, delay) : setImmediate;

    scheduleFn(() => {
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
        console.log(`[Background Event] Notification for task "${task.title}" (ID: ${task.id}) processed at ${timestamp} for ${assignedUser}`);
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
        console.log(`[Background Event] Task "${taskId}" deletion notification processed at ${timestamp} by ${userRef}`);
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
  clearNotificationLogs: () => { notificationLogs.length = 0; },
  setSimulatedDelay
};
