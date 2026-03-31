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
| `supabase/functions/collect` | Manual collection trigger (Apify → normalize → score → insert) |
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

## Local dev
```bash
pnpm install
# add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to packages/dashboard/.env
pnpm --filter @trend/dashboard dev
```
