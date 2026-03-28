# Instagram Trend Intelligence Platform
## Technical Architecture

> Stack: Node.js 20 · Fastify 4 · React 18 · TimescaleDB · Redis · pnpm Workspaces · Docker · Railway · Vercel

---

## Table of Contents

1. [Overview](#1-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Data Sources](#3-data-sources)
4. [Collector Service](#4-collector-service)
5. [Processing Pipeline](#5-processing-pipeline)
6. [Storage](#6-storage)
7. [REST API](#7-rest-api)
8. [React Dashboard](#8-react-dashboard)
9. [Deploy](#9-deploy)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Overview

The platform is divided into four independent layers that communicate via events. Each layer can be scaled or replaced without impacting the others.

### Data flow

```
External sources (Graph API · Apify · RapidAPI)
        ↓
  Collector Service  (Node.js · node-cron · Bull)
        ↓
  Processing Pipeline  (Normalizer → Trend Scorer)
        ↓
  Storage  (TimescaleDB + Redis leaderboard)
        ↓
  REST API / WebSocket  (Fastify 4)
        ↓
  Dashboard  (React 18 · TanStack Query · shadcn/ui)
```

### Core principle

> Keep collection, processing, storage, and presentation in separate services. This lets you swap the data source (e.g. from Apify to the official Graph API) without rewriting the dashboard or API.

### Packages and responsibilities

| Package | Technology | Responsibility |
|---|---|---|
| `packages/shared` | TypeScript, Zod | Types, schemas, Result type, env |
| `packages/db` | pg, ioredis | Migrations, queries, clients |
| `packages/collector` | Node.js, Bull, node-cron | Scheduling and data collection |
| `packages/processor` | Node.js | Normalization and scoring |
| `packages/api` | Fastify 4, JWT | REST endpoints, WebSocket |
| `packages/dashboard` | React 18, Vite | Web interface |
| `infra/` | Docker, Railway | Infrastructure and deploy |

---

## 2. Monorepo Structure

```
instagram-trend-platform/
├── CLAUDE.md                    ← auto-read by Claude Code
├── packages/
│   ├── shared/                  ← types, Zod schemas, Result<T>, env
│   │   └── src/
│   │       ├── index.ts
│   │       ├── result.ts
│   │       ├── errors.ts
│   │       ├── env.ts
│   │       └── types/
│   │           ├── post.ts
│   │           ├── hashtag.ts
│   │           └── alert.ts
│   ├── db/                      ← TimescaleDB + Redis
│   │   └── src/
│   │       ├── pg.ts
│   │       ├── redis.ts
│   │       ├── migrations/      ← 14 SQL files + run.ts runner
│   │       └── queries/         ← campaigns, hashtags, profiles, events, analysis...
│   ├── collector/               ← cron + Bull queue + adapters
│   │   └── src/
│   │       ├── adapters/
│   │       ├── queue/
│   │       ├── rate-limiter/
│   │       └── scheduler/
│   ├── processor/               ← normalizer + trend scorer
│   │   └── src/
│   │       ├── normalizer/
│   │       ├── scorer/
│   │       └── nlp/
│   ├── api/                     ← Fastify routes + WebSocket
│   │   └── src/
│   │       ├── plugins/
│   │       ├── routes/          ← 11 route files
│   │       └── errors/
│   └── dashboard/               ← React SPA
│       └── src/
│           ├── components/      ← ui primitives + layout (Sidebar)
│           ├── features/        ← feature modules (trends, analysis, events…)
│           ├── pages/           ← route-level page components
│           ├── lib/             ← api client, campaign context, i18n, utils
│           └── locales/         ← en.ts translations
├── infra/
│   ├── docker-compose.yml
│   └── railway/
├── scripts/
│   └── migrate.ts
├── docs/
│   └── architecture.md          ← this file
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### Package dependency graph

```
dashboard  →  shared
api        →  shared, db
processor  →  shared, db
collector  →  shared, db, processor (via queue)
db         →  shared
```

### Key commands

```bash
turbo dev                              # all services in parallel
pnpm --filter @trend/api dev           # API only
pnpm --filter @trend/collector dev     # collector only
pnpm --filter @trend/dashboard dev     # dashboard only
pnpm --filter @trend/db migrate        # run migrations
turbo build                            # build everything
turbo typecheck lint test              # CI checks
```

---

## 3. Data Sources

### 3.1 Instagram Graph API (Meta) — free

Official source. Requires a Business or Creator account approved via Meta for Developers.

**Endpoints used**

| Endpoint | Use |
|---|---|
| `GET /ig_hashtag_search?q={tag}` | Get hashtag ID (cache 24h) |
| `GET /{hashtag-id}/top_media` | Most-engaged posts |
| `GET /{hashtag-id}/recent_media` | Recent posts |
| `GET /{ig-user-id}/media?fields=insights` | Metrics for your own accounts |

**Limit:** 200 calls/hour per user token. Mitigate with a **Token Pool** (multi-account rotation).

### 3.2 Apify — free tier (~$5 USD/month credit)

Used for ethical scraping of public data. Recommended actor: `apify~instagram-hashtag-scraper`.

```bash
POST https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync
{
  "hashtags": ["marketing", "trends"],
  "resultsLimit": 50
}
```

> ⚠️ Use `run-async` + webhook for large scrapes (sync timeout is 300s).

### 3.3 RapidAPI — free plans with 100–500 req/month

For competitor data. Recommended APIs: `Instagram Bulk Profile Scrapper`, `Instagram Scraper 2022`.

### Comparison

| Source | Free plan | Req/month | Best for |
|---|---|---|---|
| Meta Graph API | Yes | Unlimited* | Your own accounts |
| Apify | Yes | ~200 runs | Public hashtags |
| RapidAPI | Yes | 100–500 | Competitors |

*Subject to rate limits per hour (200/h per token)

---

## 4. Collector Service

### Required interface for all adapters

```typescript
// packages/collector/src/adapters/adapter.interface.ts
export interface SourceAdapter {
  readonly name: 'graph-api' | 'apify' | 'rapid-api';
  collect(options: CollectOptions): Promise<Result<RawPost[]>>;
  isAvailable(): boolean;
}
```

### Token Pool — multi-token rotation

```typescript
const SAFE_LIMIT = 160; // 80% of the 200/h limit

export class TokenPool {
  getToken(): string {
    // Resets expired slots, then returns the next one with capacity
    // Throws if all tokens are exhausted
  }
}
```

### Bull Queue — async jobs

```typescript
export const QUEUES = {
  COLLECT_HASHTAG: 'collect:hashtag',
  COLLECT_PROFILE: 'collect:profile',
} as const;

export const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};
```

> ⚠️ Bull requires its own Redis connection. Never reuse the app Redis client for Bull — use `createBullRedis()` from `@trend/db`.

### Scheduler — cron jobs

| Job | Frequency | Preferred source |
|---|---|---|
| Top tracked hashtags | Every 15 min | Graph API |
| Profile snapshots | Every hour | RapidAPI |
| Trend scoring | After each collection | Internal |

```typescript
cron.schedule('*/15 * * * *', () => collectTopHashtags());
cron.schedule('0 * * * *',    () => collectProfiles());
```

---

## 5. Processing Pipeline

### 5.1 Normalizer

Converts raw JSON from each source to the canonical `NormalizedPost` schema.

```typescript
export interface NormalizedPost {
  id:          string;           // '{source}_{original_id}'
  source:      'graph-api' | 'apify' | 'rapid-api';
  hashtags:    string[];
  likes:       number;
  comments:    number;
  shares:      number;
  views:       number;           // 0 for non-Reels
  mediaType:   'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL';
  collectedAt: Date;
}
```

### 5.2 Trend Scorer

Calculates a composite `trendScore` (0–100) for each post.

**Formula**

```
trendScore =
  engagementVelocity   × 0.40   // growth rate
  + engagementRate     × 0.30   // engagement relative to reach
  + absoluteEngagement × 0.20   // absolute volume
  + recencyBoost       × 0.10   // linear decay: 1.0 at 0h → 0.0 at 6h
```

```typescript
export interface ScoredPost extends NormalizedPost {
  engagementRate: number;   // (likes+comments+shares) / max(views,1)
  trendScore:     number;   // 0–100
  velocityScore:  number;
}
```

### 5.3 NLP Hashtag Grouper (Phase 4)

Semantically groups related hashtags to consolidate trend signals. Phase 4: Python microservice with `sentence-transformers`.

```typescript
// Current stub — returns each hashtag as its own group
export async function groupHashtags(hashtags: string[]): Promise<Map<string, string[]>>
```

---

## 6. Storage

### 6.1 TimescaleDB — main tables

```sql
-- Processed posts (hypertable partitioned by collected_at)
CREATE TABLE scored_posts (
  id              TEXT        NOT NULL,
  source          TEXT        NOT NULL,
  hashtags        TEXT[]      NOT NULL DEFAULT '{}',
  media_type      TEXT        NOT NULL,
  likes           INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  shares          INTEGER     NOT NULL DEFAULT 0,
  views           INTEGER     NOT NULL DEFAULT 0,
  engagement_rate FLOAT       NOT NULL DEFAULT 0,
  trend_score     FLOAT       NOT NULL DEFAULT 0,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  campaign_id     UUID        REFERENCES campaigns(id)
);
SELECT create_hypertable('scored_posts', 'collected_at');

-- Hashtag snapshots (hypertable)
CREATE TABLE hashtag_snapshots (
  hashtag        TEXT        NOT NULL,
  trend_score    FLOAT       NOT NULL DEFAULT 0,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  campaign_id    UUID        REFERENCES campaigns(id)
);
SELECT create_hypertable('hashtag_snapshots', 'snapshotted_at');

-- Campaigns
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  active      BOOLEAN NOT NULL DEFAULT true,
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> ⚠️ Hypertables: always call `create_hypertable()` OUTSIDE a transaction.

**All data tables are campaign-scoped** — every table has a `campaign_id` column. Queries always filter by `campaign_id` to isolate data between campaigns.

### 6.2 Migration runner

Migrations use an idempotency table to prevent re-runs:

```typescript
// packages/db/src/migrations/run.ts
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
// Skips files already in schema_migrations
if (appliedSet.has(file)) { console.log(`[migrate] Skip: ${file}`); continue }
```

Current migrations (14 files):

| Migration | Purpose |
|---|---|
| `001_init.sql` | Core tables: scored_posts, hashtag_snapshots |
| `002_tracked_hashtags.sql` | Hashtag tracking table |
| `003_post_media_fields.sql` | Media type fields |
| `004_tracked_profiles.sql` | Profile tracking table |
| `005_news_events.sql` | News event detection table |
| `006_event_strategy.sql` | Event strategy column |
| `007_ai_analysis.sql` | AI analysis results table |
| `008_users.sql` | User authentication table |
| `009_user_password.sql` | Password field |
| `010_collection_runs.sql` | Collection run tracking |
| `011_campaigns.sql` | Campaign management |
| `012_campaign_scope.sql` | campaign_id added to all tables |
| `013_fix_top_events.sql` | Event aggregation fixes |
| `014_restore_events_from_analyses.sql` | Backfill events from AI analyses |

### 6.3 Redis — key conventions

```
# Leaderboards (sorted sets)
trends:hashtags:1h      → top hashtags last 1h    (TTL 3600s)
trends:hashtags:6h      → top hashtags last 6h    (TTL 21600s)
trends:hashtags:24h     → top hashtags last 24h   (TTL 86400s)

# Hashtag ID cache (Graph API: /ig_hashtag_search is expensive)
cache:hashtag-id:{name} → {ig_hashtag_id}         (TTL 86400s)

# Rate limit per token
ratelimit:graph:{token_hash} → call count         (TTL 3600s)

# Pub/Sub for WebSocket
channel:trend:spike     → { hashtag, trendScore, delta }
```

---

## 7. REST API

All endpoints except `/api/auth/token` require `Authorization: Bearer <jwt>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/token` | Exchange API key for JWT |

### Campaigns

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/campaigns` | List all campaigns |
| `POST` | `/api/campaigns` | Create campaign |
| `PATCH` | `/api/campaigns/:id` | Update campaign (name, color, active) |
| `DELETE` | `/api/campaigns/:id` | Delete campaign and all data |

### Trends

| Method | Path | Query params | Description |
|---|---|---|---|
| `GET` | `/api/trends/hashtags` | `campaignId`, `window=24h`, `limit=20` | Top hashtags leaderboard |
| `GET` | `/api/trends/posts` | `campaignId`, `window`, `limit`, `verifiedOnly` | Posts by trend score |
| `GET` | `/api/trends/velocity` | `campaignId` | Fastest-growing hashtags |

### Hashtags & Profiles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/hashtags?campaignId=` | List tracked hashtags |
| `POST` | `/api/hashtags` | Add hashtag `{ campaignId, hashtag }` |
| `PATCH` | `/api/hashtags/:id` | Toggle active / rename |
| `DELETE` | `/api/hashtags/:id` | Remove hashtag |
| `GET` | `/api/profiles?campaignId=` | List tracked profiles |
| `POST` | `/api/profiles` | Add profile `{ campaignId, handle }` |
| `PATCH` | `/api/profiles/:id` | Toggle active |
| `DELETE` | `/api/profiles/:id` | Remove profile |

### Collection Runs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/runs` | Create run record `{ campaignId, target }` |
| `PATCH` | `/api/runs/:id` | Complete run with results |
| `GET` | `/api/runs?campaignId=` | List runs |
| `GET` | `/api/runs/:id` | Run detail |

### Jobs (Queue Monitoring)

Jobs are infrastructure-level — they operate across all active campaigns. `campaignId` is optional on trigger endpoints; if omitted, the job fires for all active campaigns.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | Queue stats for all queues |
| `POST` | `/api/jobs/trigger` | Trigger hashtag collection (`{ campaignId? }`) |
| `POST` | `/api/jobs/trigger/profiles` | Trigger profile collection (`{ campaignId? }`) |
| `POST` | `/api/jobs/:queue/:jobId/run` | Retry a specific job |
| `DELETE` | `/api/jobs/:queue/:jobId` | Delete a specific job |
| `DELETE` | `/api/jobs/:queue?status=` | Bulk-delete jobs by status |

### Events & Analysis

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events?campaignId=&limit=&window=` | Detected news events |
| `GET` | `/api/analysis/prompt?campaignId=` | Generate AI prompt from recent data |
| `POST` | `/api/analysis` | Submit AI JSON response |
| `GET` | `/api/analysis/latest?campaignId=` | Latest analysis |
| `GET` | `/api/analysis?campaignId=` | All analyses |

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/alerts?campaignId=` | List alerts |
| `POST` | `/api/alerts` | Create alert `{ campaignId, hashtag, threshold }` |
| `PATCH` | `/api/alerts/:id` | Update alert |
| `DELETE` | `/api/alerts/:id` | Delete alert |

### User

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/me` | Current user profile |
| `PATCH` | `/api/user/me` | Update profile (name, email) |
| `PATCH` | `/api/user/password` | Change password |
| `GET` | `/api/user/tokens` | List API tokens |
| `POST` | `/api/user/tokens` | Create API token |
| `DELETE` | `/api/user/tokens/:id` | Revoke API token |

**Error response format:**
```json
{ "ok": false, "code": "UNAUTHORIZED", "message": "Invalid or expired token" }
```

**Rate limiting:** 100 requests/min per JWT. Returns `429` with `Retry-After` header when exceeded.

---

## 8. React Dashboard

### Stack

```
React 18 + TypeScript (strict)
Vite (build tool)
TanStack Query v5 (server state)
React Router v6 (navigation)
shadcn/ui + Tailwind CSS (components)
Recharts (charts)
```

### Route structure

| Path | Page | Description |
|---|---|---|
| `/` | `HomePage` | Main operational screen — collection panel, recent events, trending hashtags |
| `/analysis` | `AnalisePage` | AI analysis workflow (tabs: AI Analysis / Detected Events) |
| `/history` | `HistoryPage` | Past collection runs and AI analyses |
| `/setup` | `SetupPage` | Campaign, hashtag, and profile management |
| `/settings` | `ConfiguracoesPage` | Alerts, API tokens, system (job monitoring) |
| `/account` | `ContaPage` | User profile and password change |

Legacy redirects map old Portuguese routes to the above: `/analise→/analysis`, `/historico→/history`, `/campanhas→/setup`, `/coleta→/setup`, `/configuracoes→/settings`, `/conta→/account`, `/sistema→/settings`.

### Feature modules (`src/features/`)

| Feature | Key components | Purpose |
|---|---|---|
| `auth/` | `Login.tsx` | Email/password authentication |
| `trends/` | `TrendLeaderboard`, `VelocityChart`, `PostGrid` | Real-time trends and leaderboard |
| `analysis/` | `AnalysisPanel` | 3-step AI analysis: generate prompt → paste response → view results |
| `events/` | `EventsPanel` | Detected news events list |
| `hashtags/` | `HashtagManager` | Add/remove tracked hashtags per campaign |
| `profiles/` | `ProfileManager` | Add/remove tracked profiles per campaign |
| `alerts/` | `AlertManager` | Spike alert configuration |
| `jobs/` | `JobsPanel` | Bull queue monitoring and manual triggers |

### Campaign context

All data is campaign-scoped. The active campaign is stored in `localStorage` and exposed via `useCampaign()`:

```typescript
// packages/dashboard/src/lib/campaign.tsx
const { activeCampaignId, activeCampaign, campaigns, setActiveCampaignId } = useCampaign()
```

Every API call passes `campaignId` as a query param or body field. The campaign switcher in the Sidebar allows switching between campaigns without page reload.

### Setup page — URL-driven tabs

The `/setup` page reads `?tab=` from the URL to open the correct tab:

```tsx
const [searchParams, setSearchParams] = useSearchParams()
const tab = searchParams.get('tab') ?? 'campaigns'
```

This allows deep-linking from banners and other pages (e.g. `<Link to="/setup?tab=hashtags">`).

The Campaigns tab must be completed first; Hashtags and Profiles tabs are disabled (and show an inline notice) when no campaign exists.

### TanStack Query cache strategy

| Query | refetchInterval | staleTime |
|---|---|---|
| Hashtag leaderboard | 60s | 30s |
| Events | 60s | 30s |
| Collection runs | — | 0 (always fresh) |
| Jobs (during collection) | 2s | 0 |
| Analysis prompt | — | 60s |

---

## 9. Deploy

### Local (Docker Compose)

```bash
# Start TimescaleDB + Redis
docker compose -f infra/docker-compose.yml up -d

# Run migrations
pnpm --filter @trend/db migrate

# Start all services
turbo dev
```

### Production

| Service | Platform | Cost |
|---|---|---|
| API + Collector | Railway | $0 (500h/month free) |
| Dashboard | Vercel | $0 (hobby) |
| TimescaleDB | Timescale Cloud | $0 (90 days) → ~$28/month |
| Redis | Upstash | $0 (10k req/day) |

### Required environment variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=                          # minimum 32 characters
PORT=3000

# Optional — enable additional data sources
IG_TOKENS=token1,token2              # comma-separated, multi-token rotation
APIFY_TOKEN=
RAPID_API_KEY=

# Frontend
VITE_API_URL=https://api.your-domain.com
```

> All variables are validated with Zod at startup. If a required variable is missing, the process exits with a clear message.

### CI/CD (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: turbo typecheck lint test
```

---

## 10. Implementation Checklist

### Phase 1 — Foundation ✅

- [x] Create Meta for Developers account and obtain Graph API token
- [x] Configure Railway + TimescaleDB + Redis
- [x] Scaffold monorepo with pnpm workspaces + turbo
- [x] `packages/shared` (types, Zod schemas, Result, env)
- [x] TimescaleDB initial migrations (001–005)
- [x] Collector service with adapters + node-cron
- [x] User authentication (JWT)

### Phase 2 — Processing ✅

- [x] Normalizer with deduplication by `id`
- [x] Trend scorer with base formula
- [x] Redis leaderboard updated after each collection
- [x] Main REST endpoints (trends, hashtags, posts, velocity)
- [x] Apify as second data source
- [x] Campaign architecture (all tables campaign-scoped)
- [x] Collection run tracking
- [x] News event detection (volume spike, verified origin, theme convergence)

### Phase 3 — Dashboard ✅

- [x] React + Vite + TanStack Query + shadcn/ui scaffold
- [x] Campaign management (create, edit, archive, switch)
- [x] Hashtag and profile tracking management (per campaign)
- [x] Home page: collection panel (idle / running / done) + events + trending
- [x] Analysis page: AI analysis workflow (3-step) + detected events
- [x] History page: past runs and analyses
- [x] Setup page: campaign → hashtags → profiles guided flow
- [x] Settings page: alerts, API tokens, job/queue monitoring
- [x] Account page: profile and password management
- [x] Migration runner with idempotency (`schema_migrations` table)

### Phase 4 — Advanced (Planned)

- [ ] NLP microservice for semantic hashtag grouping
- [ ] Webhook/email alerts on spike detection
- [ ] Competitor analysis module
- [ ] Influencer discovery module
- [ ] Automated weekly report

---

## Code Conventions

| Concept | Convention | Example |
|---|---|---|
| Files | kebab-case | `trend-scorer.ts` |
| Classes | PascalCase | `TokenPool` |
| Functions/vars | camelCase | `getTrendLeaderboard` |
| Zod schemas | `Schema` suffix | `NormalizedPostSchema` |
| Inferred types | no suffix | `NormalizedPost` |
| Bull queues | `SCREAMING_SNAKE` | `COLLECT_HASHTAG` |
| Redis keys | `domain:entity:id` | `trends:hashtags:1h` |
| DB tables | `snake_case` | `scored_posts` |
| Env variables | `SCREAMING_SNAKE` | `JWT_SECRET` |
| Monorepo packages | `@trend/` prefix | `@trend/shared` |

---

*Maintained in `docs/architecture.md` — update alongside architecture changes.*
