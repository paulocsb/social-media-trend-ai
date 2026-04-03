# social-media-trend-ai

Social media trend monitoring dashboard — collect posts, score by engagement velocity, and generate AI-driven content.

---

## AI-first development

This project is designed to be built, maintained, and extended primarily through AI. The codebase ships with full context documents, slash commands, and a structured workflow so that an AI agent can contribute immediately — no onboarding, no spelunking through code.

**Clone the repo, open Claude Code, run `/init`. The AI reads the full project context and is ready to implement, review, or explain anything.**

```
/init                        ← start every session here
/plan <feature description>  ← before implementing anything non-trivial
/implement                   ← work through the plan step by step
/review                      ← after writing code, check against project standards
```

| Command | What it does |
|---|---|
| `/init` | Reads all context files + git state. Outputs a session brief — stack, recent commits, uncommitted changes, key files. |
| `/plan` | Reads affected files, checks existing patterns, produces a step-by-step plan with affected files, design checklist, and risks. |
| `/implement` | Executes the plan step by step with task tracking. Enforces design and code patterns on every edit. |
| `/review` | Runs architecture, TypeScript, design system, security, and UX checklists. Outputs issues as Critical / Moderate / Minor. |

The AI context lives in [`CLAUDE.md`](./CLAUDE.md) — stack, architecture, patterns, pipelines, design system summary, and the full command reference. Start there.

---

## What it does

A campaign-scoped Instagram trend intelligence dashboard. The core loop:

```
Setup campaign → add hashtags / profiles
  → Collect Now (fetches posts via Apify, scores by engagement velocity)
  → Review trending hashtags + top post grid
  → Exclude posts from the analysis selection
  → Run Analysis (AI identifies topic, generates caption + hashtags)
  → Copy content → post on Instagram
```

No background jobs. No queues. No cron. Everything is manual and on-demand.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · TypeScript · TanStack Query |
| Styling | Tailwind CSS v3 + custom design system |
| Backend | Supabase (PostgreSQL · Auth · Realtime · Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| Data source | Apify Instagram scrapers · `DEV_MODE` fixture fallback |
| AI providers | Anthropic Claude · OpenAI GPT-4o · Ollama (any) |
| Monorepo | pnpm workspaces · Turborepo |

---

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Trigger collection · trending hashtags · top post grid |
| `/analysis` | Analysis | One-click AI analysis · caption + hashtag generation |
| `/history` | History | Collection runs · AI analyses · rescore |
| `/setup` | Setup | Campaigns · hashtags · profiles |
| `/settings` | Settings | Trend score alerts per hashtag |
| `/account` | Account | Email and password |

---

## Docs

| File | Purpose |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Master AI context — stack, patterns, pipelines, architectural decisions |
| [`docs/architecture.md`](./docs/architecture.md) | Full technical reference — DB schema, edge functions, pipelines |
| [`docs/design-system.md`](./docs/design-system.md) | Design tokens, typography, components, UI patterns |
| [`docs/pages.md`](./docs/pages.md) | Per-page breakdown — layout, state, queries, key logic |
| [`docs/setup.md`](./docs/setup.md) | Local development setup |
| [`docs/deployment.md`](./docs/deployment.md) | Production deployment |

---

## Quick start

See [`docs/setup.md`](./docs/setup.md) for the full local development guide.

```bash
pnpm install
supabase start
supabase functions serve --env-file supabase/functions/.env.local
pnpm --filter @trend/dashboard dev
```

---

## License

MIT
