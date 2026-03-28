# Instagram Trend Intelligence Platform

Real-time Instagram trend monitoring platform. Collects posts from hashtags and accounts, calculates trend scores, detects news events, and surfaces AI-driven content recommendations through a React dashboard.

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turbo |
| Backend | Node.js 20 + Fastify 4 |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Database | TimescaleDB (PostgreSQL) |
| Cache / Queues | Redis + Bull |
| Language | TypeScript (strict) |
| Local infra | Docker Compose |

---

## Architecture

```
External sources (Graph API · Apify · RapidAPI)
        ↓
  Collector Service  — cron jobs + Bull queue
        ↓
  Processing Pipeline  — Normalizer → Trend Scorer
        ↓
  Storage  — TimescaleDB + Redis leaderboard
        ↓
  REST API  — Fastify 4 + JWT
        ↓
  Dashboard  — React 18 + TanStack Query
```

### Monorepo packages

| Package | Responsibility |
|---|---|
| `packages/shared` | TypeScript types, Zod schemas, `Result<T>`, env validation |
| `packages/db` | PostgreSQL pool, Redis client, migrations, queries |
| `packages/collector` | Cron scheduling, Bull queues, collection adapters |
| `packages/processor` | Post normalization, trend score calculation |
| `packages/api` | REST endpoints, JWT auth, WebSocket |
| `packages/dashboard` | React SPA |

---

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Installation

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Database (defaults work with local Docker)
DATABASE_URL=postgresql://postgres:password@localhost:5433/trend_db
REDIS_URL=redis://localhost:6379

# JWT secret — minimum 32 characters
JWT_SECRET=generate_with_the_command_below

# API port
PORT=3000

# Data sources (configure at least one)
IG_TOKENS=              # Instagram Graph API tokens (optional)
APIFY_TOKEN=            # Apify token (optional, free tier available)
RAPID_API_KEY=          # RapidAPI key (optional)

# Frontend
VITE_API_URL=http://localhost:3000
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Note:** Local TimescaleDB runs on port `5433` (not `5432`) to avoid conflicts with a native PostgreSQL install.

### 3. Start local infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

Wait for containers to be `healthy`:
```bash
docker compose -f infra/docker-compose.yml ps
```

### 4. Run migrations

```bash
env $(cat .env | grep -v '^#' | xargs) pnpm --filter @trend/db migrate
```

### 5. Start all services

```bash
env $(cat .env | grep -v '^#' | xargs) pnpm exec turbo dev
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:3000 |
| API Health | http://localhost:3000/health |

---

## Authentication

The dashboard shows a login screen on first open. For local development, use the email and password registered in your user profile. To create the first user, use the API:

```bash
# Get a JWT (replace with your API key)
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"dev"}'
```

---

## Dashboard — Navigation

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Run collections, view recent events and trending hashtags |
| `/analysis` | Analysis | AI content analysis workflow + detected events |
| `/history` | History | Past collection runs and AI analyses |
| `/setup` | Setup | Campaigns, hashtags, and tracked profiles |
| `/settings` | Settings | Alerts, API tokens, system/job monitoring |
| `/account` | Account | User profile and password |

### Setup flow

1. **Create a campaign** — all data (hashtags, posts, events, analyses) is scoped to a campaign
2. **Add hashtags** — choose hashtags to monitor for trending posts
3. **Add profiles** *(optional)* — track specific Instagram accounts
4. **Go to Home** — run a collection and watch data come in

---

## API Endpoints

All authenticated endpoints require `Authorization: Bearer <jwt>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/token` | Exchange API key for JWT |

### Campaigns

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/campaigns` | List all campaigns |
| `POST` | `/api/campaigns` | Create campaign |
| `PATCH` | `/api/campaigns/:id` | Update campaign |
| `DELETE` | `/api/campaigns/:id` | Delete campaign |

### Trends

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/trends/hashtags` | Top hashtags leaderboard (`?campaignId&window=24h&limit=20`) |
| `GET` | `/api/trends/posts` | Posts by trend score (`?campaignId&window&limit&verifiedOnly`) |
| `GET` | `/api/trends/velocity` | Fastest-growing hashtags (`?campaignId`) |

### Hashtags & Profiles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/hashtags` | List tracked hashtags (`?campaignId`) |
| `POST` | `/api/hashtags` | Add hashtag to campaign |
| `PATCH` | `/api/hashtags/:id` | Update hashtag (toggle active) |
| `DELETE` | `/api/hashtags/:id` | Remove hashtag |
| `GET` | `/api/profiles` | List tracked profiles (`?campaignId`) |
| `POST` | `/api/profiles` | Add profile to campaign |
| `PATCH` | `/api/profiles/:id` | Update profile (toggle active) |
| `DELETE` | `/api/profiles/:id` | Remove profile |

### Collection Runs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/runs` | Create a run record (`{ campaignId, target }`) |
| `PATCH` | `/api/runs/:id` | Complete/update a run with results |
| `GET` | `/api/runs` | List runs (`?campaignId`) |
| `GET` | `/api/runs/:id` | Get run details |

### Jobs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | Queue stats for all queues |
| `POST` | `/api/jobs/trigger` | Trigger hashtag collection (`{ campaignId? }`) |
| `POST` | `/api/jobs/trigger/profiles` | Trigger profile collection (`{ campaignId? }`) |
| `POST` | `/api/jobs/:queue/:jobId/run` | Retry a specific job |
| `DELETE` | `/api/jobs/:queue/:jobId` | Delete a specific job |
| `DELETE` | `/api/jobs/:queue` | Bulk-delete jobs by status |

### Events & Analysis

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events` | Detected news events (`?campaignId&limit&window`) |
| `GET` | `/api/analysis/prompt` | Generate AI analysis prompt (`?campaignId`) |
| `POST` | `/api/analysis` | Submit AI JSON response |
| `GET` | `/api/analysis/latest` | Latest analysis for campaign (`?campaignId`) |
| `GET` | `/api/analysis` | All analyses (`?campaignId`) |

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/alerts` | List alerts (`?campaignId`) |
| `POST` | `/api/alerts` | Create alert |
| `PATCH` | `/api/alerts/:id` | Update alert |
| `DELETE` | `/api/alerts/:id` | Delete alert |

### User

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/me` | Get current user profile |
| `PATCH` | `/api/user/me` | Update profile (name, email) |
| `PATCH` | `/api/user/password` | Change password |
| `GET` | `/api/user/tokens` | List API tokens |
| `POST` | `/api/user/tokens` | Create API token |
| `DELETE` | `/api/user/tokens/:id` | Revoke API token |

**Error response format:**
```json
{ "ok": false, "code": "UNAUTHORIZED", "message": "Invalid or expired token" }
```

---

## Trend Score

Each post receives a score from 0–100 calculated as:

```
trendScore =
  growth velocity      × 40%
  + engagement rate    × 30%
  + absolute engagement× 20%
  + recency boost      × 10%   ← decays linearly to 0 at 6h
```

---

## Useful Commands

```bash
# Start everything
env $(cat .env | grep -v '^#' | xargs) pnpm exec turbo dev

# Individual services
env $(cat .env | grep -v '^#' | xargs) pnpm --filter @trend/api dev
pnpm --filter @trend/dashboard dev
env $(cat .env | grep -v '^#' | xargs) pnpm --filter @trend/collector dev

# Run migrations
env $(cat .env | grep -v '^#' | xargs) pnpm --filter @trend/db migrate

# Build everything
pnpm exec turbo build

# Stop Docker infra
docker compose -f infra/docker-compose.yml down
```

---

## Deploy (Production)

| Service | Platform | Cost |
|---|---|---|
| API + Collector | Railway | $0 (500h/month free) |
| Dashboard | Vercel | $0 (hobby) |
| TimescaleDB | Timescale Cloud | $0 (90-day trial) → ~$28/mo |
| Redis | Upstash | $0 (10k req/day) |

See `docs/architecture.md` for full deploy details.
