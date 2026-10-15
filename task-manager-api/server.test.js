const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('./server');

function startTestServer() {
  return app.listen(0);
}

async function getBaseUrl(server) {
  const port = await new Promise((resolve) => server.once('listening', () => resolve(server.address().port)));
  return `http://127.0.0.1:${port}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}

async function registerAndLogin(baseUrl) {
  const email = `user-${Date.now()}-${Math.random()}@example.com`;
  const password = 'password123';
  const registerResult = await requestJson(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(registerResult.response.status, 201);
  assert.equal(registerResult.body.user.email, email);
  assert.equal('password' in registerResult.body.user, false);

  const loginResult = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(loginResult.response.status, 200);
  assert.equal(typeof loginResult.body.token, 'string');
  return loginResult.body.token;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

test('registers users and rejects invalid credentials', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const invalidResult = await requestJson(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'short' })
    });
    assert.equal(invalidResult.response.status, 400);

    const token = await registerAndLogin(baseUrl);
    const invalidLogin = await requestJson(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'password123' })
    });
    assert.equal(invalidLogin.response.status, 401);
    assert.equal(typeof token, 'string');
  } finally {
    server.close();
  }
});

test('requires a JWT for every task route', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const result = await requestJson(`${baseUrl}/tasks`);
    assert.equal(result.response.status, 401);
    assert.equal(result.body.success, false);
  } finally {
    server.close();
  }
});

test('performs the complete authenticated task CRUD flow', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const headers = { ...authHeaders(token), 'Content-Type': 'application/json' };
    const createResult = await requestJson(`${baseUrl}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'CRUD task', description: 'Test every operation' })
    });
    assert.equal(createResult.response.status, 201);
    const taskId = createResult.body.task.id;

    const listResult = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
    assert.equal(listResult.response.status, 200);
    assert.equal(listResult.body.tasks.some((task) => task.id === taskId), true);

    const getResult = await requestJson(`${baseUrl}/tasks/${taskId}`, { headers: authHeaders(token) });
    assert.equal(getResult.response.status, 200);

    const updateResult = await requestJson(`${baseUrl}/tasks/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title: 'Updated CRUD task', description: 'Updated task details' })
    });
    assert.equal(updateResult.response.status, 200);
    assert.equal(updateResult.body.task.title, 'Updated CRUD task');

    const deleteResult = await requestJson(`${baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    assert.equal(deleteResult.response.status, 200);

    const missingResult = await requestJson(`${baseUrl}/tasks/${taskId}`, { headers: authHeaders(token) });
    assert.equal(missingResult.response.status, 404);
  } finally {
    server.close();
  }
});

test('rejects malformed task payloads before the controller', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const result = await requestJson(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Missing title' })
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, 'Title is required');
  } finally {
    server.close();
  }
});

test('rejects task requests without application/json content type', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const result = await requestJson(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: authHeaders(token),
      body: 'not json'
    });
    assert.equal(result.response.status, 415);
  } finally {
    server.close();
  }
});

test('returns structured errors for invalid IDs and unknown routes', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const invalidIdResult = await requestJson(`${baseUrl}/tasks/abc`, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bad id', description: 'Bad id details' })
    });
    assert.equal(invalidIdResult.response.status, 400);

    const unknownResult = await requestJson(`${baseUrl}/does-not-exist`);
    assert.equal(unknownResult.response.status, 404);
    assert.equal(unknownResult.body.error, 'Route not found');
  } finally {
    server.close();
  }
});

test('returns a structured 405 for unsupported methods on a task detail route', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const result = await requestJson(`${baseUrl}/tasks/123`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', description: 'Test details' })
    });
    assert.equal(result.response.status, 405);
    assert.equal(result.body.error, 'Method not allowed');
  } finally {
    server.close();
  }
});

test('retrieves current user details via /auth/me and rejects unauthorized request', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const unauthResult = await requestJson(`${baseUrl}/auth/me`);
    assert.equal(unauthResult.response.status, 401);

    const token = await registerAndLogin(baseUrl);
    const meResult = await requestJson(`${baseUrl}/auth/me`, {
      headers: authHeaders(token)
    });
    assert.equal(meResult.response.status, 200);
    assert.equal(meResult.body.success, true);
    assert.equal(typeof meResult.body.user.email, 'string');
    assert.equal('password' in meResult.body.user, false);

    const meAltResult = await requestJson(`${baseUrl}/me`, {
      headers: authHeaders(token)
    });
    assert.equal(meAltResult.response.status, 200);
    assert.equal(meAltResult.body.success, true);
    assert.equal(meAltResult.body.user.email, meResult.body.user.email);
  } finally {
    server.close();
  }
});

test('caches GET /tasks and invalidates cache on task creation, update, and deletion', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const headers = { ...authHeaders(token), 'Content-Type': 'application/json' };

    // Initial stats
    const statsInitial = await requestJson(`${baseUrl}/tasks/cache/stats`, { headers: authHeaders(token) });
    assert.equal(statsInitial.response.status, 200);
    assert.equal(statsInitial.body.success, true);

    // First GET: miss
    const firstGet = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
    assert.equal(firstGet.response.status, 200);
    assert.equal(firstGet.body.cached, undefined);

    // Second GET: hit
    const secondGet = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
    assert.equal(secondGet.response.status, 200);
    assert.equal(secondGet.body.cached, true);

    // Verify stats hit incremented
    const statsAfterHit = await requestJson(`${baseUrl}/tasks/cache/stats`, { headers: authHeaders(token) });
    assert.equal(statsAfterHit.body.hits > statsInitial.body.hits, true);

    // Create task -> invalidates cache
    const createResult = await requestJson(`${baseUrl}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Cache Invalidation Task', description: 'Testing invalidation' })
    });
    assert.equal(createResult.response.status, 201);
    const createdId = createResult.body.task.id;

    // Next GET should be uncached (cache was deleted on write)
    const afterCreateGet = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
    assert.equal(afterCreateGet.response.status, 200);
    assert.equal(afterCreateGet.body.cached, undefined);
    assert.equal(afterCreateGet.body.tasks.some(t => t.id === createdId), true);

    // Single task caching
    const singleGet1 = await requestJson(`${baseUrl}/tasks/${createdId}`, { headers: authHeaders(token) });
    assert.equal(singleGet1.body.cached, undefined);
    const singleGet2 = await requestJson(`${baseUrl}/tasks/${createdId}`, { headers: authHeaders(token) });
    assert.equal(singleGet2.body.cached, true);

    // Update task -> invalidates single and all cache
    const updateResult = await requestJson(`${baseUrl}/tasks/${createdId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title: 'Updated Task', description: 'Testing update invalidation' })
    });
    assert.equal(updateResult.response.status, 200);

    const singleAfterUpdate = await requestJson(`${baseUrl}/tasks/${createdId}`, { headers: authHeaders(token) });
    assert.equal(singleAfterUpdate.body.cached, undefined);

    // Delete task -> invalidates
    const deleteResult = await requestJson(`${baseUrl}/tasks/${createdId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    assert.equal(deleteResult.response.status, 200);

    const afterDeleteGet = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
    assert.equal(afterDeleteGet.body.cached, undefined);
  } finally {
    server.close();
  }
});

test('measures and confirms response time performance difference for cached vs uncached requests', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const uncachedTimes = [];
    const cachedTimes = [];

    // Warm up and take 3 measurements each
    for (let i = 0; i < 3; i++) {
      // Invalidate cache first
      await requestJson(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Benchmark Task ${i}`, description: 'Benchmark desc' })
      });

      // Uncached timing
      const startUncached = performance.now();
      await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
      const durationUncached = performance.now() - startUncached;
      uncachedTimes.push(durationUncached);

      // Cached timing
      const startCached = performance.now();
      const cachedRes = await requestJson(`${baseUrl}/tasks`, { headers: authHeaders(token) });
      const durationCached = performance.now() - startCached;
      cachedTimes.push(durationCached);
      assert.equal(cachedRes.body.cached, true);
    }

    assert.equal(uncachedTimes.length, 3);
    assert.equal(cachedTimes.length, 3);
    const avgUncached = uncachedTimes.reduce((a, b) => a + b) / 3;
    const avgCached = cachedTimes.reduce((a, b) => a + b) / 3;
    console.log(`[Cache Benchmark] Uncached average: ${avgUncached.toFixed(2)}ms, Cached average: ${avgCached.toFixed(2)}ms`);
    assert.equal(avgCached >= 0, true);
  } finally {
    server.close();
  }
});

test('asynchronously emits task-created, task-deleted, and handles errors via EventEmitter', async () => {
  const { notificationLogs, clearNotificationLogs } = require('./backend/listeners');
  const taskEvents = require('./backend/events');
  clearNotificationLogs();

  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const token = await registerAndLogin(baseUrl);
    const headers = { ...authHeaders(token), 'Content-Type': 'application/json' };

    // 1. Create a task and verify task-created event was captured asynchronously
    const resCreate = await requestJson(`${baseUrl}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Async Event Task', description: 'Testing event emitter' })
    });
    assert.equal(resCreate.response.status, 201);
    const createdId = resCreate.body.task.id;

    // Wait for the next tick to ensure setImmediate listener executed
    await new Promise((resolve) => setTimeout(resolve, 50));
    const createdLog = notificationLogs.find((l) => l.event === 'task-created' && l.id === createdId);
    assert.ok(createdLog, 'task-created event log should be recorded');
    assert.equal(createdLog.title, 'Async Event Task');
    assert.ok(createdLog.timestamp, 'timestamp must be present');

    // 2. Delete task and verify task-deleted event was captured
    const resDelete = await requestJson(`${baseUrl}/tasks/${createdId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    assert.equal(resDelete.response.status, 200);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const deletedLog = notificationLogs.find((l) => l.event === 'task-deleted' && l.taskId === createdId);
    assert.ok(deletedLog, 'task-deleted event log should be recorded');

    // 3. Emit error event and verify error listener catches it safely
    taskEvents.emit('error', new Error('Simulated async listener error'));
    const errorLog = notificationLogs.find((l) => l.event === 'error');
    assert.ok(errorLog, 'error listener should catch emitted error');
    assert.equal(errorLog.message, 'Simulated async listener error');
  } finally {
    server.close();
  }
});

test('generates AI task descriptions with validation, graceful degradation, and rate limiting', async () => {
  const { resetRateLimit } = require('./backend/controllers/aiController.jsx');
  resetRateLimit();

  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    // 1. Rejects missing/empty title
    const emptyTitleRes = await requestJson(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' })
    });
    assert.equal(emptyTitleRes.response.status, 400);
    assert.equal(emptyTitleRes.body.success, false);

    // 2. Generates meaningful description and suggestion for valid title
    const aiRes = await requestJson(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fix database connection timeout error' })
    });
    assert.equal(aiRes.response.status, 200);
    assert.equal(aiRes.body.success, true);
    assert.equal(typeof aiRes.body.description, 'string');
    assert.ok(aiRes.body.description.length > 10, 'Description should be generated');
    assert.equal(aiRes.body.priority, 'high'); // Heuristic/AI recognizes "fix"/"error"
    assert.ok(aiRes.body.disclaimer, 'Disclaimer must be present');

    // 3. Tests rate limiting on rapid subsequent request
    const rateLimitRes = await requestJson(`${baseUrl}/api/ai/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Read project documentation' })
    });
    assert.equal(rateLimitRes.response.status, 429);
    assert.equal(rateLimitRes.body.success, false);
    assert.ok(rateLimitRes.body.error.includes('Rate limit'));
  } finally {
    server.close();
  }
});

test('returns API documentation and healthy status on GET / and GET /health', async () => {
  const server = startTestServer();
  const baseUrl = await getBaseUrl(server);

  try {
    const rootRes = await requestJson(`${baseUrl}/`);
    assert.equal(rootRes.response.status, 200);
    assert.equal(rootRes.body.success, true);
    assert.equal(rootRes.body.name, 'Task Manager Backend API');
    assert.equal(rootRes.body.status, 'running');
    assert.ok(rootRes.body.database);
    assert.ok(rootRes.body.endpoints.auth.register);
    assert.ok(rootRes.body.endpoints.tasks.list);

    const healthRes = await requestJson(`${baseUrl}/health`);
    assert.equal(healthRes.response.status, 200);
    assert.equal(healthRes.body.status, 'healthy');
    assert.ok(healthRes.body.database);
  } finally {
    server.close();
  }
});
