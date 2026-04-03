Load full project context for this session.

Read the following files in order and build a complete mental model of the project:

1. Read `CLAUDE.md` — project overview, stack, workspace structure, patterns, commands
2. Read `docs/architecture.md` — full technical reference (DB schema, edge functions, pipelines)
3. Read `docs/design-system.md` — Apple Design tokens, component rules, typography
4. Read `docs/pages.md` — per-page documentation
5. Run `git status` to see what files are currently modified or staged
6. Run `git log --oneline -8` to understand recent work

After reading everything, respond with a structured session brief:

---
**Session Ready**

**Project:** Instagram Trend Intelligence Platform
**Branch:** [current branch]
**Recent commits:** [last 3 commit messages]
**Uncommitted changes:** [list or "none"]

**Stack in memory:**
- Frontend: React 18 + Vite + TypeScript + TanStack Query
- Backend: Supabase (PostgreSQL + Auth + Edge Functions on Deno)
- Design: Apple Design System (SF Pro Display/Text, #0071e3 accent, glass components)
- Monorepo: pnpm workspaces (packages/shared, packages/dashboard)

**Key files to know:**
- `packages/dashboard/src/pages/` — all 6 pages
- `packages/dashboard/tailwind.config.js` + `src/index.css` — design tokens
- `supabase/functions/collect/index.ts` — collection pipeline
- `supabase/functions/analysis/index.ts` — analysis pipeline
- `packages/shared/src/database.types.ts` — all DB types

**Ready for:** [implementation / review / debugging / planning]

---

If the user has already described a task, begin working on it immediately after the brief. Do not ask clarifying questions unless the task is genuinely ambiguous.
