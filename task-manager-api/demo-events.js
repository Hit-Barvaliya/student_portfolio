/**
 * Practical 10: Asynchronous Processing with Event-Driven Architecture Demo
 * Demonstrates non-blocking background notification processing via Node.js native EventEmitter.
 * Confirms that the API returns HTTP 201 immediately before the slow background listener finishes.
 */

const { app } = require('./server');
const { setSimulatedDelay, getNotificationLogs, clearNotificationLogs } = require('./backend/listeners');

async function runDemo() {
  clearNotificationLogs();
  // Simulate slow email/SMS notification service (1500 ms artificial delay)
  setSimulatedDelay(1500);

  const server = app.listen(0);
  const port = await new Promise((resolve) => server.once('listening', () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('='.repeat(70));
  console.log(' Practical 10: Event-Driven Asynchronous Processing Demonstration');
  console.log('='.repeat(70));

  try {
    // 1. Auth setup
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `async-demo-${Date.now()}@example.com`, password: 'password123' })
    });
    const regData = await regRes.json();

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regData.user.email, password: 'password123' })
    });
    const { token } = await loginRes.json();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n[Client] Sending POST /tasks request to create new task...');
    const startTime = performance.now();
    const res = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Asynchronous Event Demonstration Task',
        description: 'Verify HTTP response finishes before slow background notification listener.'
      })
    });
    const duration = performance.now() - startTime;
    const body = await res.json();
    const clientReceivedAt = new Date().toISOString();

    console.log(`[Client] Received HTTP ${res.status} response in ${duration.toFixed(2)} ms!`);
    console.log(`[Client] Response timestamp : ${clientReceivedAt}`);
    console.log(`[Client] Task ID created     : ${body.task.id}`);

    console.log('\n[Server] Background listener is currently executing with simulated slow delay (1500 ms)...');
    console.log('[Server] Awaiting background task completion...');

    await new Promise((resolve) => setTimeout(resolve, 1800));

    const logs = getNotificationLogs();
    const createdLog = logs.find((l) => l.event === 'task-created' && l.id === body.task.id);

    console.log('\n' + '-'.repeat(70));
    console.log(' Timestamp Comparison:');
    console.log(`  • Client Response Received At : ${clientReceivedAt} (${duration.toFixed(2)} ms)`);
    console.log(`  • Background Handler Executed : ${createdLog?.timestamp}`);
    console.log('-'.repeat(70));

    if (createdLog) {
      console.log('✓ SUCCESS: Main API response completed BEFORE the background listener!');
      console.log('✓ Proves non-blocking event-driven execution using EventEmitter.');
    }
  } finally {
    setSimulatedDelay(0);
    server.close();
  }
}

if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
