# Instagram Trend Intelligence Platform

## Documentation
- Full architecture: `docs/architecture.md`
- Quick setup: `README.md`

## Stack
React 18 · Vite · Supabase · TypeScript · Deno Edge Functions · pnpm workspaces

## Packages
| Package | Purpose |
|---|---|
| `packages/shared` | Types, Zod schemas, Supabase `Database` type |
| `packages/dashboard` | React SPA — 6 routes, campaign-scoped |
| `supabase/functions/collect` | Manual collection trigger (Apify → normalize → AI score → insert); also exposes `POST /collect/rescore` to re-score an existing run |
| `supabase/functions/analysis` | AI prompt builder + submit |
| `supabase/functions/alerts` | Alert CRUD (threshold evaluation is inline in `collect`) |

## Dashboard routes
| Path | Purpose |
|---|---|
| `/` | Home — manual collect trigger, trending hashtags, top posts |
| `/analysis` | AI analysis workflow |
| `/history` | Past runs and analyses |
| `/setup` | Campaigns → hashtags → profiles (campaign-scoped, modal-based CRUD) |
| `/settings` | Alerts |
| `/account` | Email and password |

## Key architectural decisions
- **No scheduler**: collection is always manual — user clicks "Collect Now"
- **No API server**: dashboard queries Supabase directly; only collection uses an Edge Function
- **Campaign-scoped data**: every table has `campaign_id`; RLS enforces isolation
- **Supabase Auth**: replaces custom JWT — use `supabase.auth` everywhere
- **Alert evaluation**: runs inline at the end of each `collect` call — `triggeredAlerts` returned in the response, shown as a dismissible banner on Home
- **AI trend scoring**: math pre-scores all posts (free), top `AI_SCORER_LIMIT` (default 50) sent to AI. Falls back to math silently on failure
- **Post age filtering**: `MAX_POST_AGE_DAYS` (default 2) passed to Apify as `onlyPostsNewerThan`; also applied as a post-collection filter
- **Rescore endpoint**: `POST /functions/v1/collect/rescore` re-evaluates already-collected posts without re-running Apify
- **Home grid scoping**: posts and hashtags displayed are from the most recent `collected_at` batch (5-minute window), not run-scoped — avoids clock-drift issues with `started_at`/`finished_at`
- **DB types**: regenerate after schema changes with `supabase gen types typescript --local > packages/shared/src/database.types.ts`

## Local dev
```bash
pnpm install
# add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to packages/dashboard/.env
pnpm --filter @trend/dashboard dev
```
