# Instagram Trend Intelligence Platform

Real-time Instagram trend monitoring. Collects posts from hashtags and accounts, scores them, and surfaces AI-driven content recommendations through a minimal React dashboard.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS |
| Backend | Supabase (PostgreSQL · Auth · Realtime · Edge Functions) |
| Edge Functions | Deno (Supabase) |
| Data source | Apify Instagram scrapers (or local fixtures via `DEV_MODE`) |
| AI providers | Anthropic Claude · OpenAI GPT-4o · Ollama (any) |
| Language | TypeScript |

---

## Architecture

```
Browser (React dashboard)
  ↓  auth + direct DB queries (supabase-js)
Supabase (PostgreSQL + Auth + Realtime)
  ↓  on "Collect Now"
Edge Function: collect  (Deno)
  ↓  DEV_MODE=true → fixture data  |  production → Apify
Apify Instagram API
  ↓  normalize → score → upsert
scored_posts, hashtag_snapshots
  ↓  Supabase Realtime
Browser updates live
```

No background jobs. No queues. No cron. Collection is always manual.

---

## Packages

| Package | Purpose |
|---|---|
| `packages/shared` | TypeScript types, Zod schemas, Supabase DB types |
| `packages/dashboard` | React SPA — 6 pages + full auth flow |
| `supabase/migrations/` | Schema, RLS, Realtime, default-campaign trigger |
| `supabase/functions/collect` | Manual collection — Apify or fixture data |
| `supabase/functions/analysis` | AI analysis pipeline + content generation |
| `supabase/functions/alerts` | Threshold evaluation |

---

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://docs.docker.com/desktop/) — required for `supabase functions serve`
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local Supabase

```bash
supabase start
```

Note the **Project URL**, **Publishable key**, and **Secret key** printed on first run.

### 3. Configure environment

**Dashboard** — create `packages/dashboard/.env.local`:
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key from supabase start>
```

**Edge Functions** — create `supabase/functions/.env.local`:
```bash
DEV_MODE=true
# Optional: add an AI provider key to enable auto-analysis
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OLLAMA_URL=http://host.docker.internal:11434
```

> `DEV_MODE=true` skips Apify and uses realistic fixture data. No Apify token needed for local dev.

### 4. Apply the schema

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 5. Run everything

```bash
# Terminal 1 — Edge Functions
supabase functions serve --env-file supabase/functions/.env.local

# Terminal 2 — Dashboard
pnpm --filter @trend/dashboard dev
# → http://localhost:5173
```

Sign up for an account — a default campaign is created automatically.

---

## Production Setup

### 1. Apply schema to remote

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 2. Set secrets

```bash
supabase secrets set APIFY_TOKEN=your_apify_token

# At least one AI provider to enable auto-analysis (optional)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# or
supabase secrets set OPENAI_API_KEY=sk-...
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy collect
supabase functions deploy analysis
supabase functions deploy alerts
```

### 4. Deploy the dashboard

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider (Vercel, Netlify, etc.) then deploy `packages/dashboard`.

---

## App Flow

1. **Sign up** — account created, default campaign provisioned automatically
2. **Setup** (`/setup`) — the active campaign is the scope; add/edit hashtags and profiles via modal dialogs
3. **Home** (`/`) — click **Collect Now** to fetch and score posts
4. **Analysis** (`/analysis`)
   - *With AI provider:* one click — prompt built, AI called, caption + hashtags generated automatically
   - *Without AI provider:* copy the generated prompt into ChatGPT/Claude, paste the JSON response back
5. **History** (`/history`) — past collection runs and analyses
6. **Settings** (`/settings`) — configure trend score alerts per hashtag

---

## Trend Score

Each post is scored 0–100:

```
score = velocity          × 40%
      + engagement rate   × 30%
      + absolute engagement × 20%
      + recency boost     × 10%  (linear decay → 0 at 6h)
```

---

## Environment Files

| File | Committed | Purpose |
|---|---|---|
| `packages/dashboard/.env` | ✅ | Remote defaults |
| `packages/dashboard/.env.local` | ❌ gitignored | Local overrides (Vite loads automatically) |
| `supabase/functions/.env` | ✅ | Remote defaults |
| `supabase/functions/.env.local` | ❌ gitignored | Local overrides — pass with `--env-file` |

---

## Dashboard Routes

| Route | Page |
|---|---|
| `/login` `/signup` `/forgot-password` `/reset-password` | Auth |
| `/` | Home — collect + trending |
| `/analysis` | AI analysis + content generation |
| `/history` | Past runs and analyses |
| `/setup` | Campaigns · Hashtags · Profiles |
| `/settings` | Alerts |
| `/account` | Email and password |
