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
6. [Analysis Pipeline](#6-analysis-pipeline)
7. [React Dashboard](#7-react-dashboard)
8. [Deploy](#8-deploy)

---

## 1. Overview

### Data flow

```
Browser (React dashboard)
  ↓  Supabase Auth + direct DB queries (supabase-js)
Supabase PostgreSQL
  ↓  on "Collect Now" button
Edge Function: collect  (Deno)
  ↓  DEV_MODE=true → fixture data
  ↓  production    → Apify Instagram scrapers
Raw posts → normalize → score → INSERT into Supabase
  ↓  Supabase Realtime
Browser updates live
  ↓  on "Run Analysis"
Edge Function: analysis  (Deno)
  ↓  build prompt from recent data
  ↓  call AI provider (Anthropic / OpenAI / Ollama)
  ↓  AI call #1: identify trending topic + content ideas
  ↓  AI call #2: generate Instagram caption + hashtags
  ↓  save to ai_analyses
Browser shows generated content
```

### Core principles

- **No background jobs.** Collection and analysis are always triggered manually.
- **No separate API server.** The dashboard queries Supabase directly for all reads/writes except collection and analysis (Edge Functions).
- **Campaign-scoped data.** Every table has `campaign_id`. Row Level Security enforces isolation.
- **DEV_MODE.** Setting `DEV_MODE=true` in the functions env skips Apify and inserts realistic fixture data — no Apify token needed locally.

### Package responsibilities

| Package | Purpose |
|---|---|
| `packages/shared` | TypeScript types, Zod schemas, Supabase `Database` type |
| `packages/dashboard` | React SPA — 6 pages + full auth flow, Tailwind design system |
| `supabase/migrations/` | Schema + RLS + Realtime + default-campaign trigger |
| `supabase/functions/collect` | Manual collection: Apify or fixture data → normalize → score → insert |
| `supabase/functions/analysis` | AI prompt builder + auto-run pipeline + content generation |
| `supabase/functions/alerts` | Threshold evaluation after collection |

---

## 2. Repository Structure

```
instagram-media-ai/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── database.types.ts      ← Supabase row types (supabase gen types)
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
│           │   └── ui/                ← Button, Card, Input, Badge, IconButton
│           ├── features/
│           │   └── auth/
│           │       ├── AuthLayout.tsx
│           │       ├── Login.tsx
│           │       ├── SignUp.tsx
│           │       ├── ForgotPassword.tsx
│           │       ├── ResetPassword.tsx
│           │       └── OAuthButtons.tsx   ← Google, GitHub, Apple SSO
│           ├── lib/
│           │   ├── supabase.ts        ← typed supabase-js client
│           │   ├── campaign.tsx       ← CampaignProvider + useCampaign()
│           │   └── utils.ts           ← cn(), relativeTime(), formatNumber()
│           └── pages/
│               ├── HomePage.tsx       ← collect trigger + trending
│               ├── SetupPage.tsx      ← campaigns / hashtags / profiles
│               ├── AnalisePage.tsx    ← AI analysis + content generation
│               ├── HistoryPage.tsx    ← past runs + analyses
│               ├── ConfiguracoesPage.tsx ← alerts
│               └── ContaPage.tsx      ← email + password
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20240101000000_init.sql               ← all tables + RLS + Realtime
│   │   ├── 20240102000000_default_campaign_trigger.sql
│   │   ├── 20240103000000_analysis_generated_content.sql
│   │   └── 20240104000000_scored_posts_run_id.sql ← run_id FK + top_hashtags JSONB
│   └── functions/
│       ├── collect/index.ts
│       ├── analysis/index.ts
│       └── alerts/index.ts
├── docs/
│   └── architecture.md
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 3. Database Schema

All tables live in the `public` schema. RLS is enabled on every table — users only access rows whose `campaign_id` belongs to a campaign they own.

### Tables

| Table | Key columns | Notes |
|---|---|---|
| `campaigns` | `id, user_id, name, description, color` | Owned by `auth.users`. Created automatically on signup via trigger. |
| `tracked_hashtags` | `campaign_id, hashtag, active` | Unique per (hashtag, campaign) |
| `tracked_profiles` | `campaign_id, handle, active` | Unique per (handle, campaign) |
| `collection_runs` | `campaign_id, status, target, started_at, finished_at, posts_found, error_message, top_hashtags` | status: `running` → `completed` / `failed` / `partial`; `top_hashtags` is JSONB array of `{hashtag, score}` |
| `scored_posts` | `campaign_id, id, run_id, trend_score, likes, comments, views, hashtags[], author_handle` | Upserted per run; `run_id` references `collection_runs(id) ON DELETE SET NULL` |
| `hashtag_snapshots` | `campaign_id, hashtag, trend_score, post_count, snapshotted_at` | One row per hashtag per run |
| `news_events` | `campaign_id, title, event_type, strategy, confidence, detected_at` | |
| `ai_analyses` | `campaign_id, main_topic, urgency_level, content_prompt, generated_content` | `generated_content` is JSONB with caption, hashtags, etc. |
| `alerts` | `campaign_id, user_id, hashtag, threshold, active` | |

### Default campaign trigger

Every new user gets a campaign created automatically:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_campaign();
```

### Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scored_posts;
```

---

## 4. Edge Functions

All functions run on Deno. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the runtime — do not set them manually in production.

### `collect`

**Trigger:** `POST /functions/v1/collect`
**Body:** `{ campaignId, target?: "hashtags"|"profiles"|"both", limit?: number }`

Flow:
1. Insert `collection_runs` row with `status: "running"`
2. Fetch `tracked_hashtags` and `tracked_profiles` for the campaign
3. **DEV_MODE:** return realistic fixture posts (skips Apify)
4. **Production:** call Apify hashtag/profile scrapers
5. Normalize raw posts → canonical schema
6. Score each post (0–100, four weighted factors)
7. Upsert into `scored_posts`
8. Aggregate hashtag scores → insert `hashtag_snapshots`; store top hashtags in `collection_runs.top_hashtags`
9. Evaluate active alert thresholds against collected hashtag scores → return `triggeredAlerts` in response
10. Update run to `status: "completed"` (or `"failed"` with `error_message` on error)

**Env vars:**
- `DEV_MODE=true` — use fixtures, skip Apify
- `APIFY_TOKEN` — required in production when `DEV_MODE` is not set

### `analysis`

**GET `/functions/v1/analysis/providers`** — returns which AI providers are configured.

**GET `/functions/v1/analysis/prompt?campaignId=`** — builds an analysis prompt from recent posts, hashtag snapshots, and news events. For manual copy/paste workflows.

**POST `/functions/v1/analysis/run`** — full auto pipeline:
1. Fetch campaign data (posts, hashtags, events from last 24h)
2. Build analysis prompt
3. **AI call #1** — identifies main topic, reasoning, content ideas, urgency, format
4. Build content brief from the analysis result
5. **AI call #2** — generates Instagram caption, visual description, hashtags, best posting time
6. Save everything to `ai_analyses` (`content_prompt` + `generated_content`)

**POST `/functions/v1/analysis`** — submit a manual JSON response from a user's AI of choice. Builds `content_prompt` and saves the analysis.

**AI provider priority:** Anthropic → OpenAI → Ollama

**Env vars:**
- `ANTHROPIC_API_KEY` — uses `claude-sonnet-4-6`
- `OPENAI_API_KEY` — uses `gpt-4o` with `response_format: json_object`
- `OLLAMA_URL` — e.g. `http://host.docker.internal:11434`; `OLLAMA_MODEL` defaults to `llama3`

### `alerts`

**GET/POST/DELETE `/functions/v1/alerts`** — CRUD for alert records.

> Alert threshold evaluation is performed inline at the end of each `collect` run — no separate evaluate call needed. The collect response includes a `triggeredAlerts` array which the dashboard surfaces as a dismissible banner.

---

## 5. Collection Pipeline

### Trend Score Formula

```
trendScore =
  velocityScore        × 0.40   // default 0 (requires historical data)
  + engagementRate     × 0.30   // (likes + comments) / max(views, 1)
  + absoluteEngagement × 0.20   // min(total / 100k, 1)
  + recencyBoost       × 0.10   // linear decay: 1.0 at 0h → 0.0 at 6h
```

### DEV_MODE fixtures

When `DEV_MODE=true`, `devFixtures()` generates posts seeded from the campaign's actual hashtags and profiles:
- 5 posts per hashtag, 3 posts per profile handle
- Randomised engagement numbers, media types, and ages (0–72h)
- Full normalizer + scorer still runs — `trend_score` and `engagement_rate` are real computed values

---

## 6. Analysis Pipeline

### Auto pipeline (`POST /analysis/run`)

```
Campaign data (posts + hashtags + events)
  ↓
buildAnalysisPrompt()
  ↓
AI call #1  →  { mainTopic, reasoning, selectedPostIds, suggestedHashtags,
                  contentIdeas, urgencyLevel, contentFormat }
  ↓
buildContentPromptForAI()
  ↓
AI call #2  →  { caption, visualDescription, hashtags, bestPostingTime }
  ↓
ai_analyses row saved
  { content_prompt (manual brief), generated_content (JSONB from AI #2) }
```

AI call #2 is non-fatal — if it fails, the analysis is still saved and `content_prompt` is available for manual copy/paste.

### Manual pipeline

1. `GET /analysis/prompt` → copy prompt to your AI
2. AI returns JSON → paste into dashboard
3. `POST /analysis` → saves with `content_prompt`, `generated_content` is null

---

## 7. React Dashboard

### Authentication

Full auth flow via Supabase Auth:

| Screen | Route | Method |
|---|---|---|
| Login | `/login` | `signInWithPassword` |
| Sign Up | `/signup` | `signUp` |
| Forgot Password | `/forgot-password` | `resetPasswordForEmail` |
| Reset Password | `/reset-password` | `updateUser` (PASSWORD_RECOVERY event) |
| OAuth | Login + Sign Up | `signInWithOAuth` (Google, GitHub, Apple) |

`App.tsx` subscribes to `onAuthStateChange`. Session is the single source of truth — public routes redirect to `/` if a session exists.

### Design system

Dark glass / Vision Pro-inspired Tailwind tokens:

| Token | Value |
|---|---|
| Font | `-apple-system, BlinkMacSystemFont, SF Pro Display, Inter` |
| Page background | `#080816` |
| Surface | `#0F0F23` |
| Card | `rgba(255,255,255,0.04)` + `backdrop-filter: blur(20px)` |
| Primary text | `#F5F5F7` |
| Secondary text | `rgba(255,255,255,0.55)` |
| Accent (violet) | `#8B5CF6` |
| Border | `rgba(255,255,255,0.08)` |

Glass utilities (`.glass`, `.glass-raised`, `.glass-sidebar`) are defined in `index.css` under `@layer components`.

### Campaign context

```typescript
const { activeCampaignId, activeCampaign, campaigns, setActiveCampaignId, isLoading } = useCampaign()
```

Active campaign is persisted to `localStorage`. All queries filter by `campaign_id`.

### Dashboard routes

| Path | Page | Key queries |
|---|---|---|
| `/` | Home | `collection_runs`, `scored_posts`, `hashtag_snapshots` |
| `/analysis` | Analysis | `analysis/providers`, `analysis/run`, `ai_analyses` |
| `/history` | History | `collection_runs`, `ai_analyses` |
| `/setup` | Setup | `campaigns`, `tracked_hashtags`, `tracked_profiles` |
| `/settings` | Settings | `alerts` |
| `/account` | Account | `supabase.auth.getUser`, `supabase.auth.updateUser` |

---

## 8. Deploy

### Local development

```bash
# 1. Start local Supabase (requires Docker Desktop)
supabase start

# 2. Create packages/dashboard/.env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key>

# 3. Create supabase/functions/.env.local
DEV_MODE=true
# ANTHROPIC_API_KEY=sk-ant-...   ← optional, enables auto-analysis

# 4. Apply schema
supabase link --project-ref <ref>
supabase db push

# 5. Start function server + dashboard
supabase functions serve --env-file supabase/functions/.env.local
pnpm --filter @trend/dashboard dev
```

### Production

```bash
supabase link --project-ref <ref>
supabase db push

supabase secrets set APIFY_TOKEN=...
supabase secrets set ANTHROPIC_API_KEY=...   # optional

supabase functions deploy collect
supabase functions deploy analysis
supabase functions deploy alerts
```

Deploy `packages/dashboard` to Vercel/Netlify with:
- `VITE_SUPABASE_URL` — remote project URL
- `VITE_SUPABASE_ANON_KEY` — remote anon key

### Production cost estimate

| Service | Platform | Free tier |
|---|---|---|
| Dashboard | Vercel / Netlify | ✅ |
| DB + Auth + Edge Functions | Supabase | ✅ 500MB DB, 2M invocations/month |
| Data collection | Apify | ~$5/month for light usage |
| AI (Anthropic) | Anthropic API | Pay-per-use (~$0.01/analysis) |

---

*Maintained in `docs/architecture.md` — update alongside architecture changes.*
