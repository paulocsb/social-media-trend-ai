# Instagram Trend Intelligence Platform — AI Agent Context

This file is the authoritative context document for AI agents working on this project.
Read it fully at the start of every session. Cross-reference `docs/architecture.md`,
`docs/design-system.md`, and `docs/pages.md` for deeper detail.

---

## 1. Project Overview

**What it is:** A campaign-scoped Instagram trend intelligence dashboard. Users create
campaigns, track hashtags and profiles, collect trending posts via Apify, score them with
AI, and generate Instagram content from the analysis.

**What it is not:** A scheduler, a social media manager, or a posting tool. Everything is
manual and on-demand. The user decides when to collect, when to analyse, and when to act.

**Core loop:**
```
Setup campaign → add hashtags/profiles
  → Collect Now (fetches posts, scores, stores)
  → Review trending hashtags + top post grid
  → Exclude posts from analysis grid
  → Run Analysis (AI identifies topic, generates caption + hashtags)
  → Copy content → post on Instagram
```

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | SPA, no SSR |
| Styling | Tailwind CSS v3 + custom tokens | Custom design system — see `docs/design-system.md` |
| State | TanStack Query v5 | All server state; no Redux/Zustand |
| Routing | React Router v6 | Hash-free, 6 routes |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) | No custom API server |
| Edge Functions | Deno (TypeScript) | `collect`, `analysis`, `alerts` |
| Data source | Apify Instagram scrapers | DEV_MODE bypasses Apify with fixtures |
| AI providers | Anthropic → OpenAI → Ollama | Priority order; all optional |
| Monorepo | pnpm workspaces + Turborepo | `packages/shared`, `packages/dashboard` |
| DB types | `supabase gen types typescript` | Stored in `packages/shared/src/database.types.ts` |

---

## 3. Workspace Structure

```
instagram-media-ai/
├── .claude/
│   └── commands/          ← AI slash commands (init, plan, implement, review)
├── docs/
│   ├── architecture.md    ← Full technical reference
│   ├── design-system.md   ← Design tokens, components, typography, patterns
│   └── pages.md           ← Per-page documentation (queries, state, UX)
├── packages/
│   ├── shared/            ← @trend/shared
│   │   └── src/
│   │       ├── database.types.ts   ← Supabase generated types (+ manual analysis_queue)
│   │       └── types/             ← Post, Hashtag, Alert, Campaign Zod schemas
│   └── dashboard/         ← @trend/dashboard
│       ├── index.html             ← Flash-prevention theme script
│       ├── tailwind.config.js     ← Design tokens, font families, radius, shadows
│       └── src/
│           ├── index.css          ← CSS vars (light/dark), glass utilities, typography
│           ├── App.tsx            ← Auth gate + route tree
│           ├── lib/
│           │   ├── supabase.ts    ← Typed supabase-js client
│           │   ├── campaign.tsx   ← CampaignProvider + useCampaign()
│           │   ├── theme.tsx      ← ThemeProvider + useTheme() (light default)
│           │   └── utils.ts       ← cn(), relativeTime(), formatNumber()
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppLayout.tsx  ← Sidebar + <Outlet>
│           │   │   └── Sidebar.tsx    ← Nav, campaign picker, theme toggle
│           │   └── ui/
│           │       ├── button.tsx     ← Primary/secondary/ghost/destructive/outline
│           │       ├── badge.tsx      ← default/secondary/success/warning/destructive/outline
│           │       ├── card.tsx       ← Card, CardHeader, CardTitle, CardContent
│           │       ├── input.tsx      ← Text input
│           │       └── icon-button.tsx
│           ├── features/auth/         ← Login, SignUp, ForgotPassword, ResetPassword, OAuth
│           └── pages/
│               ├── HomePage.tsx       ← Collect + trending hashtags + post grid
│               ├── AnalisePage.tsx    ← AI analysis workflow
│               ├── HistoryPage.tsx    ← Runs + analyses timeline
│               ├── SetupPage.tsx      ← Campaign CRUD + hashtags + profiles
│               ├── ConfiguracoesPage.tsx ← Alerts
│               └── ContaPage.tsx      ← Account (email/password)
├── supabase/
│   ├── config.toml
│   ├── migrations/        ← All schema changes (never edit existing, add new)
│   └── functions/
│       ├── collect/index.ts
│       ├── analysis/index.ts
│       └── alerts/index.ts
├── .env.example
├── CLAUDE.md              ← This file
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Design System (summary — full detail in `docs/design-system.md`)

Full detail in `docs/design-system.md`. Key rules:

- **Fonts:** `SF Pro Display` (≥20px) via `font-display` Tailwind class; `SF Pro Text` (<20px) is the default `font-sans`. Never mix.
- **Accent:** `#0071e3` — the ONLY chromatic color for interactive elements.
- **Light bg:** `#f5f5f7` · **Dark bg:** `#000000` · **Primary text light:** `#1d1d1f`
- **Letter-spacing:** Negative at ALL sizes (−0.28px at 28px+, −0.374px at 17−20px, −0.224px at 14px, −0.12px at 12px)
- **Headlines:** `font-semibold` (600) — never 700+ on headlines
- **Buttons:** No glow shadows, no `active:scale`, primary weight is `font-medium` (400−500)
- **Glass:** `.glass` and `.glass-raised` — `backdrop-filter: saturate(180%) blur(20px)` with a single soft shadow. No inset layers.
- **Shadows:** Single layer only — `rgba(0,0,0,0.22) 3px 5px 30px 0px` or nothing.
- **Border radius:** Generous spatial scale — DEFAULT 12px, lg 16px, xl 20px, 2xl 24px. Pills use `rounded-full`.
- **Semantic colors:** success `#28cd41`, warning `#ff9500`, destructive `#ff3b30` — only for status, never as accent.

**Component conventions:**
- All page content wrapped in `<div className="space-y-6 animate-fade-in">`
- Section headers: `<h2 className="text-title">` with icon + label pattern
- Labels: `<p className="text-label">` (11px, uppercase, tracking-wider, tertiary color)
- Error banners: `bg-destructive/10 border border-destructive/25` with `AlertCircle` icon
- Loading spinners: `w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin`

---

## 5. Database Schema (key tables)

| Table | Key columns | Notes |
|---|---|---|
| `campaigns` | `id, user_id, name, description, color` | Auto-created on signup via trigger |
| `tracked_hashtags` | `campaign_id, hashtag, active` | Toggle active to include/exclude from collection |
| `tracked_profiles` | `campaign_id, handle` | |
| `collection_runs` | `campaign_id, status, target, posts_found, top_hashtags, started_at, finished_at` | status: running→completed/failed/partial |
| `scored_posts` | `campaign_id, run_id, trend_score, likes, comments, views, thumbnail_url, permalink, author_handle, caption, collected_at` | Upserted per run |
| `hashtag_snapshots` | `campaign_id, hashtag, trend_score, snapshotted_at` | One row per hashtag per run |
| `ai_analyses` | `campaign_id, main_topic, urgency_level, reasoning, content_ideas[], suggested_hashtags[], content_prompt, generated_content` | `generated_content` is JSONB: caption, visualDescription, hashtags[], bestPostingTime |
| `analysis_queue` | `campaign_id, post_id, added_at` | PK(campaign_id, post_id) — persists which posts are selected for next analysis |
| `alerts` | `campaign_id, hashtag, threshold, active` | Evaluated inline at end of collect |

**RLS rule:** every table is protected by `campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())`.

**After any schema change:** regenerate types:
```bash
supabase gen types typescript --local > packages/shared/src/database.types.ts
```
If adding a new table that needs to be used before type regen, add it manually to `database.types.ts` following the existing `analysis_queue` pattern.

---

## 6. Collection Pipeline

```
User clicks "Collect Now"
  → POST /functions/v1/collect { campaignId, target }
  → Insert collection_run (status: running)
  → Fetch tracked_hashtags + tracked_profiles
  → DEV_MODE? → fixture data (no Apify)
     PROD?    → Apify Instagram scrapers (onlyPostsNewerThan MAX_POST_AGE_DAYS)
  → Normalize posts → canonical schema
  → Math-score ALL posts (free, no network)
  → Send top AI_SCORER_LIMIT posts to AI scorer (Anthropic→OpenAI→Ollama)
  → AI failure? → fall back to math scores silently
  → Upsert scored_posts with run_id
  → Aggregate hashtag_snapshots
  → Evaluate alert thresholds → triggeredAlerts[]
  → Update run status: completed / partial / failed
  → Return { postsFound, triggeredAlerts }
```

**Env vars for collect:**
- `DEV_MODE=true` — use fixtures (no Apify token needed)
- `APIFY_TOKEN` — required in production
- `AI_SCORER_LIMIT` — max posts sent to AI (default 50; 0 = math only)
- `MAX_POST_AGE_DAYS` — filter posts older than N days (default 2)

---

## 7. Analysis Pipeline

```
User clicks "Run Analysis"
  → POST /functions/v1/analysis/run { campaignId }
  → Fetch campaign data: posts + hashtag_snapshots + news_events (last 24h)
  → buildAnalysisPrompt()
  → AI call #1: { mainTopic, reasoning, selectedPostIds, suggestedHashtags,
                  contentIdeas, urgencyLevel, contentFormat }
  → buildContentPromptForAI()
  → AI call #2: { caption, visualDescription, hashtags, bestPostingTime }
  → Save to ai_analyses { content_prompt, generated_content }
```

**Provider priority:** Anthropic (`claude-sonnet-4-6`) → OpenAI (`gpt-4o`) → Ollama
**AI call #2 is non-fatal** — analysis saves even if content generation fails.

**Env vars for analysis:**
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `OLLAMA_URL` + `OLLAMA_MODEL` (default `llama3`)

---

## 8. Dashboard Pages

See `docs/pages.md` for full per-page detail. Summary:

| Route | Page | Purpose |
|---|---|---|
| `/` | HomePage | Collect trigger, status bar (last run + analysis), trending hashtags chips, top posts grid (exclude-to-queue), alerts banner |
| `/analysis` | AnalisePage | AI run (one-click), manual copy/paste, latest analysis (expanded), history (collapsed) |
| `/history` | HistoryPage | Collection runs table (select+delete+rescore), AI analyses timeline |
| `/setup` | SetupPage | Active campaign card + hashtags/profiles, other campaigns list (select/edit/delete) |
| `/settings` | ConfiguracoesPage | Alert CRUD (threshold per hashtag) |
| `/account` | ContaPage | Update email and password |

---

## 9. Common Patterns

### Querying Supabase
```typescript
const { data: things = [] } = useQuery({
  queryKey: ['things', activeCampaignId],
  queryFn: async () => {
    const { data } = await supabase
      .from('table')
      .select('*')
      .eq('campaign_id', activeCampaignId!)
      .order('created_at', { ascending: false });
    return data ?? [];
  },
  enabled: Boolean(activeCampaignId),
});
```

### Mutations with invalidation
```typescript
const save = useMutation({
  mutationFn: async (payload) => {
    const { error } = await supabase.from('table').insert(payload);
    if (error) throw error;
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ['things', activeCampaignId] }),
});
```

### Calling an Edge Function
```typescript
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
  body: JSON.stringify({ campaignId }),
});
if (!res.ok) throw new Error(await res.text());
```

### Error parsing (JSON error responses)
```typescript
function parseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  try { const j = JSON.parse(msg); return j.message ?? j.error ?? msg; } catch { return msg; }
}
```

### Campaign-scoped hook
```typescript
const { activeCampaignId, activeCampaign, campaigns, setActiveCampaignId } = useCampaign();
```
Always guard queries with `enabled: Boolean(activeCampaignId)`.

### cn() utility
```typescript
import { cn } from '../lib/utils';
className={cn('base-classes', condition && 'conditional-class', variantMap[variant])}
```

---

## 10. Commands

### Run the app
```bash
pnpm install                          # install all workspace deps
pnpm --filter @trend/dashboard dev    # start Vite dev server

# Supabase local (requires Docker)
supabase start
supabase functions serve --env-file supabase/functions/.env.local
```

### Build
```bash
pnpm --filter @trend/dashboard build
```

### DB types (after schema changes)
```bash
supabase gen types typescript --local > packages/shared/src/database.types.ts
```

### Apply migrations
```bash
supabase db push           # local
supabase db push --linked  # remote (after supabase link)
```

### Deploy Edge Functions
```bash
supabase functions deploy collect
supabase functions deploy analysis
supabase functions deploy alerts
```

### Secrets (production)
```bash
supabase secrets set APIFY_TOKEN=...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OLLAMA_URL=...
```

---

## 11. Key Architectural Decisions

- **No scheduler** — collection is always manual. User clicks "Collect Now".
- **No API server** — dashboard queries Supabase directly (supabase-js). Only collection and analysis go through Edge Functions.
- **Campaign-scoped everywhere** — every table has `campaign_id`. RLS enforces isolation. Never query without `eq('campaign_id', activeCampaignId!)`.
- **Home grid scoping** — posts and hashtags shown are from the most recent `collected_at` batch within a 5-minute window. Not run-scoped (avoids clock-drift with `started_at`/`finished_at`).
- **analysis_queue** — persists which posts are selected for the next analysis. Excluded posts are removed from the queue; replacements are inserted to keep DISPLAY_SIZE (9) entries. Seeded on first load, synced on every exclude.
- **AI scoring fallback** — math scores all posts (free), AI refines top N. If AI fails, math scores are used silently. Never block collection on AI failure.
- **DB errors must be wrapped** — always `throw new Error(\`message: \${error.message}\`)` not `throw error` (prevents `[object Object]` in the UI).
- **Light mode default** — `(localStorage.getItem('theme') as Theme) ?? 'light'` in `theme.tsx`. Flash prevention in `index.html`.

---

## 12. AI Agent Workflows

Slash commands are defined in `.claude/commands/` and available in every Claude Code
session. Follow this workflow for every session — skipping steps leads to inconsistent
code, missed patterns, and design violations.

### Standard session workflow

```
1. /init          ← always first — loads full context, reports session state
2. /plan <what>   ← before any non-trivial change — produces a reviewed plan
3. /implement     ← executes the plan step by step with task tracking
4. /review        ← after writing code — runs the full checklist
```

### Command reference

**`/init`** — Run at the start of every session without exception.
Reads `CLAUDE.md`, `docs/architecture.md`, `docs/design-system.md`, `docs/pages.md`,
then checks `git status` and `git log`. Outputs a session brief covering stack, recent
commits, uncommitted changes, and which files are most relevant to the current task.
If you have a task in mind, describe it — the init will orient toward it automatically.

**`/plan <feature description>`** — Run before implementing anything non-trivial.
Reads all affected files, identifies the right patterns to follow, and produces:
- One-sentence summary of what will be built
- Table of affected files with change type and description
- DB migration requirements (if any)
- Numbered step-by-step implementation plan
- Design checklist (font variants, accent usage, shadow rules, etc.)
- Risks and edge cases

Confirm the plan before proceeding to `/implement`.

**`/implement`** — Run after a plan is agreed.
Works through each step in order: creates tasks, marks them in-progress, makes the
edit, confirms it looks correct, marks complete, then moves on. Enforces design and
pattern rules at every edit. Finishes with a list of all changed files and next steps.

**`/review`** — Run after writing code, before committing.
Runs five checklists: Architecture & Patterns, TypeScript, Design System, Security & RLS,
UX & Accessibility. Outputs issues grouped as Critical / Moderate / Minor with file
locations and suggested fixes. "LGTM" means all checks passed.

### When to skip `/plan`

Only skip planning for:
- Single-line text or copy changes
- Fixing a typo or obvious bug with a known 1-line fix
- Reverting a change

For everything else — new features, refactors, DB changes, new components — always plan first.
