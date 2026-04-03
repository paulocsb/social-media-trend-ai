# Local Development Setup

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://docs.docker.com/desktop/) — required for `supabase functions serve`
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase`

---

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start local Supabase

```bash
supabase start
```

Note the **Project URL**, **Publishable key**, and **Secret key** printed on first run.

## 3. Configure environment

**Dashboard** — create `packages/dashboard/.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key from supabase start>
```

**Edge Functions** — create `supabase/functions/.env.local`:

```bash
# Option A — fixture data (no Apify token required)
DEV_MODE=true

# Option B — real Apify data locally
APIFY_TOKEN=your_apify_token
# DEV_MODE can be omitted or set to false

# Optional: AI provider for auto-analysis and AI trend scoring
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OLLAMA_URL=http://host.docker.internal:11434

# Optional: collection tuning
# MAX_POST_AGE_DAYS=2        ← only collect posts newer than N days (default: 2)
# AI_SCORER_LIMIT=50         ← max posts sent to AI per run (default: 50; 0 = math only)
```

> **Important:** `--env-file` loads only the specified file. If `DEV_MODE=true` is set but `APIFY_TOKEN` is absent, fixtures are always used — even if `APIFY_TOKEN` exists in another file. Both must be in the same env file.

## 4. Apply the schema

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 5. Run everything

```bash
# Terminal 1 — Edge Functions
supabase functions serve --env-file supabase/functions/.env.local

# Terminal 2 — Dashboard
pnpm --filter @trend/dashboard dev
# → http://localhost:5173
```

Sign up for an account — a default campaign is created automatically.

---

## Environment files reference

| File | Committed | Purpose |
|---|---|---|
| `packages/dashboard/.env` | ✅ | Remote defaults |
| `packages/dashboard/.env.local` | ❌ gitignored | Local overrides (Vite loads automatically) |
| `supabase/functions/.env` | ✅ | Remote defaults |
| `supabase/functions/.env.local` | ❌ gitignored | Local overrides — pass with `--env-file` |
