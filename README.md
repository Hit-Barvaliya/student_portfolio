# Full-Stack Task Management & Student Portfolio

![CI Pipeline](https://github.com/Hit-Barvaliya/student-portfolio/actions/workflows/ci.yml/badge.svg)

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
