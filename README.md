# Instagram Trend Intelligence Platform

Real-time Instagram trend monitoring. Collects posts from hashtags and accounts, calculates trend scores, and surfaces AI-driven content recommendations through a minimal React dashboard.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS |
| Backend | Supabase (PostgreSQL · Auth · Realtime) |
| Edge Functions | Deno (Supabase) |
| Data source | Apify Instagram scrapers |
| Language | TypeScript |

---

## Architecture

```
Browser (React dashboard)
  ↓  auth + direct DB queries
Supabase (cloud)
  ↓  on "Collect Now"
Edge Function: collect
  ↓  fetch → normalize → score → insert
Apify Instagram API
```

No background jobs. No queues. No cron. Collection is always manual.

---

## Packages

| Package | Purpose |
|---|---|
| `packages/shared` | TypeScript types, Zod schemas, Supabase DB types |
| `packages/dashboard` | React SPA — 6 pages |
| `supabase/migrations/` | Single consolidated SQL migration |
| `supabase/functions/collect` | Manual collection trigger |
| `supabase/functions/analysis` | AI prompt builder + submit |
| `supabase/functions/alerts` | Threshold evaluation |

---

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io) — `npm install -g pnpm`
- A [Supabase](https://supabase.com) project (free tier works)

No Docker required.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create `packages/dashboard/.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase dashboard → **Settings → API**.

### 3. Run the dashboard

```bash
pnpm --filter @trend/dashboard dev
```

Opens at `http://localhost:5173`. The dashboard talks directly to your Supabase cloud project — nothing else to start.

---

## Supabase Setup (one-time)

### 1. Apply the schema

```bash
npx supabase login
npx supabase db push
```

### 2. Create a user

In your Supabase dashboard → **Authentication → Users → Add user**.

### 3. Deploy Edge Functions

```bash
npx supabase secrets set APIFY_TOKEN=your_apify_token
npx supabase functions deploy collect
npx supabase functions deploy analysis
npx supabase functions deploy alerts
```

---

## App Flow

1. **Setup** (`/setup`) — Create a campaign, add hashtags and/or profiles to track
2. **Home** (`/`) — Click **Collect Now** to fetch posts from Apify, score them, and save to DB
3. **Analysis** (`/analysis`) — Generate a prompt from recent data → paste into ChatGPT/Claude → submit the JSON response
4. **History** (`/history`) — View past collection runs and AI analyses
5. **Settings** (`/settings`) — Configure trend score alerts per hashtag

---

## Trend Score

Each post is scored 0–100:

```
score = velocity  × 40%
      + engagement rate    × 30%
      + absolute engagement × 20%
      + recency boost      × 10%  (decays to 0 at 6h)
```

---

## Dashboard Routes

| Route | Page |
|---|---|
| `/` | Home — collect + trending |
| `/analysis` | AI analysis workflow |
| `/history` | Past runs and analyses |
| `/setup?tab=` | Campaigns · Hashtags · Profiles |
| `/settings` | Alerts |
| `/account` | Email and password |
