# Instagram Trend Intelligence Platform
## Technical Architecture

> Stack: React 18 · Vite · Supabase · TypeScript · Deno Edge Functions · Apify

---

## Table of Contents

1. [Overview](#1-overview)
2. [Repository Structure](#2-repository-structure)
3. [Database Schema](#3-database-schema)
4. [Edge Functions](#4-edge-functions)
5. [Collection Pipeline](#5-collection-pipeline)
6. [React Dashboard](#6-react-dashboard)
7. [Deploy](#7-deploy)

---

## 1. Overview

### Data flow

```
Browser (React dashboard)
  ↓  Supabase Auth + direct DB queries (supabase-js)
Supabase PostgreSQL
  ↓  on "Collect Now" button
Edge Function: collect  (Deno)
  ↓  HTTP → Apify Instagram scrapers
Raw posts → normalize → score → INSERT into Supabase
  ↓  Supabase Realtime
Browser updates live
```

### Core principles

- **No background jobs.** Collection is always triggered manually by the user.
- **No separate API server.** The dashboard queries Supabase directly for all reads/writes except collection (Edge Function).
- **Campaign-scoped data.** Every table has `campaign_id`. Row Level Security (RLS) enforces that users only see their own campaigns.

### Package responsibilities

| Package | Purpose |
|---|---|
| `packages/shared` | TypeScript types, Zod schemas, Supabase `Database` type |
| `packages/dashboard` | React SPA — 6 pages, Supabase client, Tailwind design system |
| `supabase/migrations/` | Single consolidated SQL migration (schema + RLS + Realtime) |
| `supabase/functions/collect` | Manual collection: fetch → normalize → score → insert |
| `supabase/functions/analysis` | AI prompt builder + submit analysis |
| `supabase/functions/alerts` | Threshold evaluation after collection |

---

## 2. Repository Structure

```
instagram-media-ai/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── database.types.ts      ← Supabase row types (auto-gen with supabase gen types)
│   │       └── types/
│   │           ├── post.ts
│   │           ├── hashtag.ts
│   │           ├── alert.ts
│   │           └── campaign.ts
│   └── dashboard/
│       └── src/
│           ├── App.tsx                ← auth check, route tree
│           ├── components/
│           │   ├── layout/            ← Sidebar, AppLayout
│           │   └── ui/                ← Button, Card, Input, Badge
│           ├── features/
│           │   └── auth/Login.tsx
│           ├── lib/
│           │   ├── supabase.ts        ← typed supabase-js client
│           │   ├── campaign.tsx       ← CampaignProvider + useCampaign()
│           │   └── utils.ts           ← cn(), relativeTime(), formatNumber()
│           └── pages/
│               ├── HomePage.tsx       ← collect trigger + trending
│               ├── SetupPage.tsx      ← campaigns / hashtags / profiles
│               ├── AnalisePage.tsx    ← AI analysis workflow
│               ├── HistoryPage.tsx    ← past runs + analyses
│               ├── ConfiguracoesPage.tsx ← alerts
│               └── ContaPage.tsx      ← email + password
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 20240101000000_init.sql   ← all tables + RLS + Realtime
│   └── functions/
│       ├── collect/index.ts
│       ├── analysis/index.ts
│       └── alerts/index.ts
├── docs/
│   └── architecture.md               ← this file
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 3. Database Schema

All tables live in the `public` schema on Supabase PostgreSQL. Row Level Security is enabled on every table — users can only access rows whose `campaign_id` belongs to a campaign they own.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `campaigns` | `id, user_id, name, color, active` | Owned by `auth.users` |
| `tracked_hashtags` | `campaign_id, hashtag, active` | Unique per (hashtag, campaign) |
| `tracked_profiles` | `campaign_id, handle, active` | Unique per (handle, campaign) |
| `collection_runs` | `campaign_id, status, started_at, finished_at, posts_found` | status: running → completed/failed/partial |
| `scored_posts` | `campaign_id, id, trend_score, hashtags[], author_handle` | PK: (id, collected_at) |
| `hashtag_snapshots` | `campaign_id, hashtag, trend_score, post_count, snapshotted_at` | One row per collection run per hashtag |
| `news_events` | `campaign_id, title, strategy, confidence, detected_at` | |
| `ai_analyses` | `campaign_id, main_topic, urgency_level, content_prompt` | |
| `alerts` | `campaign_id, user_id, hashtag, threshold, active` | |

### Realtime

Realtime is enabled on `collection_runs` and `scored_posts` so the dashboard can subscribe to live updates during a collection run.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scored_posts;
```

---

## 4. Edge Functions

All three functions run on Deno and are deployed to Supabase Edge Runtime. They receive the Supabase service role key automatically from the runtime environment.

### `collect`

**Trigger:** `POST /functions/v1/collect`
**Body:** `{ campaignId: string, target: "hashtags" | "profiles" | "both", limit?: number }`

Flow:
1. Create a `collection_runs` row with `status: "running"`
2. Fetch `tracked_hashtags` and `tracked_profiles` for the campaign
3. Call Apify Instagram scrapers (hashtag scraper and/or profile scraper)
4. Normalize raw posts → canonical schema
5. Score each post (0–100, four weighted factors)
6. Upsert into `scored_posts`
7. Aggregate hashtag trend scores → insert into `hashtag_snapshots`
8. Update the run to `status: "completed"` with `posts_found` and `top_hashtags`

**Required secret:** `APIFY_TOKEN`

### `analysis`

**GET `/functions/v1/analysis/prompt?campaignId=`** — builds a prompt from recent posts, hashtag snapshots, and news events.

**POST `/functions/v1/analysis`** — saves the AI JSON response as an `ai_analyses` row, generating a `content_prompt` from the selected posts.

### `alerts`

**POST `/functions/v1/alerts/evaluate`** — compares recent `hashtag_snapshots` against active `alerts` thresholds and returns which alerts fired.

**GET/POST/DELETE `/functions/v1/alerts`** — CRUD for alert records.

---

## 5. Collection Pipeline

### Trend Score Formula

Each post is scored 0–100:

```
trendScore =
  velocityScore        × 0.40   // supplied externally (default 0)
  + engagementRate     × 0.30   // (likes+comments+shares) / max(views,1)
  + absoluteEngagement × 0.20   // min(total / 100k, 1)
  + recencyBoost       × 0.10   // linear decay: 1.0 at 0h → 0.0 at 6h
```

### Normalization

Raw Apify JSON is normalized to a consistent schema before scoring. Field mapping handles differences between the hashtag scraper and profile scraper responses (e.g. `likesCount` vs `like_count`, unix timestamps vs ISO strings).

Duplicates are removed by `id` before insertion.

---

## 6. React Dashboard

### Design system

Apple-inspired minimalist Tailwind tokens:

| Token | Value |
|---|---|
| Font | `-apple-system, BlinkMacSystemFont, SF Pro Display, Inter` |
| Page background | `#F5F5F7` |
| Card/surface | `#FFFFFF` with `0 1px 3px rgba(0,0,0,0.08)` shadow |
| Primary text | `#1D1D1F` |
| Secondary text | `#6E6E73` |
| Accent (blue) | `#0071E3` |
| Border | `#D2D2D7` |

### Authentication

Uses Supabase Auth (`supabase.auth.signInWithPassword`). `App.tsx` subscribes to `onAuthStateChange` and shows the login page when no session exists. The campaign provider and layout only render when authenticated.

### Campaign context

```typescript
const { activeCampaignId, activeCampaign, campaigns, setActiveCampaignId } = useCampaign()
```

Active campaign is persisted to `localStorage`. All queries include `campaign_id` as a filter.

### Dashboard routes

| Path | Page | Key queries |
|---|---|---|
| `/` | Home | `collection_runs`, `scored_posts`, `hashtag_snapshots` |
| `/analysis` | Analysis | Edge Function `analysis/prompt`, `ai_analyses` |
| `/history` | History | `collection_runs`, `ai_analyses` |
| `/setup?tab=` | Setup | `campaigns`, `tracked_hashtags`, `tracked_profiles` |
| `/settings` | Settings | `alerts` |
| `/account` | Account | `supabase.auth.updateUser` |

---

## 7. Deploy

### Local development

No Docker required. The dashboard connects to the Supabase cloud project.

```bash
# Install dependencies
pnpm install

# Add Supabase credentials to packages/dashboard/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Start the dashboard
pnpm --filter @trend/dashboard dev
# → http://localhost:5173
```

### Supabase setup (one-time)

```bash
# Authenticate CLI
npx supabase login

# Apply schema migration to your cloud project
npx supabase db push

# Set Edge Function secrets
npx supabase secrets set APIFY_TOKEN=your_apify_token

# Deploy Edge Functions
npx supabase functions deploy collect
npx supabase functions deploy analysis
npx supabase functions deploy alerts
```

### Production

| Service | Platform | Cost |
|---|---|---|
| Dashboard | Vercel / Netlify | Free hobby tier |
| Database + Auth + Edge Functions | Supabase | Free tier (500MB DB, 2M Edge invocations/month) |

The only environment variables needed in production are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the frontend host.

---

*Maintained in `docs/architecture.md` — update alongside architecture changes.*
