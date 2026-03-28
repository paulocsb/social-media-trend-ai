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
| `supabase/functions/alerts` | Threshold evaluation |

## Dashboard routes
| Path | Purpose |
|---|---|
| `/` | Home — manual collect trigger, trending hashtags, top posts |
| `/analysis` | AI analysis workflow |
| `/history` | Past runs and analyses |
| `/setup` | Campaigns → hashtags → profiles (URL-driven tabs with `?tab=`) |
| `/settings` | Alerts |
| `/account` | Email and password |

## Key architectural decisions
- **No scheduler**: collection is always manual — user clicks "Collect Now"
- **No API server**: dashboard queries Supabase directly; only collection uses an Edge Function
- **Campaign-scoped data**: every table has `campaign_id`; RLS enforces isolation
- **Supabase Auth**: replaces custom JWT — use `supabase.auth` everywhere
- **Setup tab deep-linking**: `/setup?tab=hashtags` opens the Hashtags tab directly — `SetupPage` reads `useSearchParams`

## Local dev
```bash
pnpm install
# add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to packages/dashboard/.env
pnpm --filter @trend/dashboard dev
```
