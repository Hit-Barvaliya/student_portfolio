# Full-Stack Task Management & Student Portfolio

[![CI Pipeline](https://github.com/Hit-Barvaliya/student_portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/Hit-Barvaliya/student_portfolio/actions/workflows/ci.yml)

Advanced Web Development Frameworks (ITUE301) — Laboratory Practicals.

---

## Running the Application Locally

### 1. Backend (Express & MongoDB)
```bash
cd task-manager-api
npm install
npm run start
```
Runs at `http://localhost:5000`.

### 2. Frontend (React + Vite)
```bash
npm install
npm run dev
```
Runs at `http://localhost:5173`.

---

## Containerization with Docker Compose (Practical 11)

Run the entire full-stack application (React frontend, Node/Express backend, and MongoDB) with a single command:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017

---

## Performance Optimization & Code Splitting (Practical 8)

Route-based components and heavy UI widgets are code-split using `React.lazy()` and `Suspense`:

| Chunk / Asset | Size (gzip) | Loading Strategy |
|---|---|---|
| `index.js` (Core Bundle) | 74.96 kB | Loaded initially |
| `TaskManager.js` | 3.08 kB | Loaded on `/tasks` route visit |
| `TaskAnalyticsChart.js` | 0.97 kB | Loaded on demand when analytics is opened |
| `Projects.js` | 0.89 kB | Loaded on `/projects` route visit |
| `Home.js` | 0.49 kB | Loaded on `/` route visit |
| `Contact.js` | 0.40 kB | Loaded on `/contact` route visit |
| `NotFound.js` | 0.22 kB | Loaded on 404 route |

---

## In-Memory Caching Performance (Practical 9)

In-memory cache implemented with `node-cache` (TTL = 60s) for `GET /tasks` and `GET /tasks/:id`, with automatic invalidation on `POST`, `PUT`, and `DELETE`.

| Sample Run | Uncached Response Time | Cached Response Time (HIT) | Improvement |
|---|---|---|---|
| Sample 1 | 14.86 ms | 11.69 ms | ~21% faster |
| Sample 2 | 11.53 ms | 8.92 ms | ~23% faster |
| Sample 3 | 11.37 ms | 8.85 ms | ~22% faster |

Cache stats and monitoring: `GET /tasks/cache/stats` and `GET /cache/stats`.

---

## Event-Driven Asynchronous Processing (Practical 10)

Uses Node.js native `EventEmitter` (`events.js` and `listeners.js`) to decouple notifications (`task-created`, `task-deleted`, and `error`) from the HTTP request/response cycle, responding immediately before background processing.

---

## CI/CD Pipeline (Practical 12)

The GitHub Actions workflow is located at `.github/workflows/ci.yml`. It runs automatically on push and pull requests to `main` and `master`, executing linting (`oxlint`) and the automated test suite.

### Workflow Architecture:
1. **Trigger:** `push` and `pull_request` on `[main, master]` branches.
2. **Job 1 (`lint`):** Code quality gate running `oxlint` across JavaScript and React JSX files.
3. **Job 2 (`test`):** Depends on `lint` succeeding (`needs: lint`), provisions Node.js 18 on `ubuntu-latest`, installs root and backend dependencies, and executes the 15-assertion automated test suite covering:
   - User authentication and JWT verification
   - Task CRUD lifecycle operations
   - Input validation and 400 Bad Request error handlers
   - In-memory caching, cache hits, misses, and write invalidation
   - Non-blocking asynchronous EventEmitter processing
   - AI assistant controller validation, rate-limiting, and graceful degradation

### Demonstrating Pipeline Pass and Fail:
- **Pass State:** When code complies with linter rules and all 15 tests pass, both `lint` and `test` jobs display green checkmarks.
- **Fail State:** If an assertion is broken (e.g. altering status code check in `server.test.js` from `200` to `500`), GitHub Actions halts execution at the failing step, prevents merging, and highlights the failed test in the CI log.

---

## AI API Integration & Responsible AI (Practical 13)

The application integrates an AI-powered assistant for task description and priority recommendation.

### Architecture:
```
React Frontend (TaskManager.jsx)
   │  "Auto-generate with AI" button clicked
   ▼
Express Backend Route: POST /api/ai/generate-description
   │  API key securely isolated in backend .env (never exposed to client)
   ▼
OpenAI (gpt-4o-mini) / Google Gemini API
   │
   ├─► Success: Parses response → Returns suggested description & priority → Displays in editable form
   └─► Failure / No Key / Timeout: Graceful fallback engine activates → Returns contextual suggestion
```

### Key Technical Features:
1. **Server-Side API Key Isolation:**
   API keys (`OPENAI_API_KEY` or `GEMINI_API_KEY`) remain strictly on the backend inside `.env`. Keys are ignored by `.gitignore` and `.dockerignore`, preventing leaks into frontend bundles or Git history.
2. **Graceful Degradation:**
   If the external AI provider is offline, rate-limited, or has no API key configured, the backend catches the error and generates a contextual heuristic fallback (`generateLocalFallback`). The application continues running without disruption.
3. **Rate Limiting:**
   A built-in per-client rate limiter prevents excessive API calls and quotas by throttling requests within a rolling time window, returning HTTP `429 Too Many Requests`.
4. **Editable Suggestions & Responsible AI Disclaimer:**
   AI-generated content is loaded directly into editable inputs so the user retains full editorial control before saving. A prominent UI banner indicates: `AI-generated suggestion. Please review and modify before saving.`
5. **Data Privacy Governance:**
   Only the task title string is sent to the AI endpoint; no passwords, user IDs, or sensitive personal data are ever forwarded to third-party models.
