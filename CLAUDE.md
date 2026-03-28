# Instagram Trend Intelligence Platform

## Documentation
- Full architecture: `docs/architecture.md`
- Quick setup: `README.md`

## Stack
Node.js 20 · Fastify 4 · React 18 · TimescaleDB · Redis · pnpm workspaces

## Packages
| Package | Purpose |
|---|---|
| `packages/shared` | Types, Zod schemas, Result<T>, env validation |
| `packages/db` | Migrations, queries, pg/redis clients |
| `packages/collector` | Bull queues, cron scheduler, collection adapters |
| `packages/processor` | Post normalization, trend scoring |
| `packages/api` | Fastify REST API (11 route files), JWT auth |
| `packages/dashboard` | React SPA — 6 routes, campaign-scoped |

## Dashboard routes
| Path | Purpose |
|---|---|
| `/` | Home — collection panel, events, trending |
| `/analysis` | AI analysis workflow + detected events |
| `/history` | Past runs and analyses |
| `/setup` | Campaigns → hashtags → profiles (URL-driven tabs with `?tab=`) |
| `/settings` | Alerts, API tokens, job monitoring |
| `/account` | User profile and password |

## Key architectural decisions
- **Campaign-scoped data**: every table has `campaign_id`; all queries filter by it
- **Job queues are global**: trigger endpoints accept optional `campaignId`; if omitted, fires for all active campaigns
- **Migration idempotency**: `schema_migrations` table prevents re-running SQL files
- **Setup tab deep-linking**: `/setup?tab=hashtags` opens the Hashtags tab directly — `SetupPage` reads `useSearchParams`
