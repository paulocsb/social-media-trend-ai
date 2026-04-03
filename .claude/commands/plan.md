Create a detailed implementation plan for: $ARGUMENTS

Follow these steps:

1. **Understand the requirement**
   - Restate what needs to be built in one sentence
   - Identify which part of the app is affected (page, edge function, DB, shared types)
   - Check if it touches the collection pipeline, analysis pipeline, or is purely UI

2. **Read relevant files**
   - Read the affected page(s) from `packages/dashboard/src/pages/`
   - Read `docs/pages.md` for the relevant page context
   - If DB changes are needed, read `docs/architecture.md` section 3 (Database Schema)
   - If design changes are needed, read `docs/design-system.md`
   - If edge function changes are needed, read the relevant function in `supabase/functions/`
   - Read any component files in `packages/dashboard/src/components/` that are involved

3. **Check existing patterns**
   - How is similar functionality already implemented?
   - What queries/mutations pattern should be followed?
   - Are there existing UI components to reuse?

4. **Output the plan in this exact format:**

---
## Plan: [feature name]

### Overview
[1-3 sentence description of what will be built and why]

### Affected files
| File | Change type | Description |
|------|-------------|-------------|
| `path/to/file.tsx` | modify / create | What changes and why |

### DB changes needed
[List any new tables, columns, or migrations — or "None"]
If yes: specify the migration SQL and whether `database.types.ts` needs manual update.

### Step-by-step

**Step 1: [name]**
- What to do
- Which file
- Key implementation detail

**Step 2: [name]**
- ...

[continue for all steps]

### Design checklist
- [ ] Uses `font-display` for text ≥20px, `font-sans` below
- [ ] Accent color `#0071e3` only for interactive elements
- [ ] No glow shadows (`shadow-glow`) on buttons or nav
- [ ] No `active:scale` on buttons
- [ ] Single shadow layer on glass components
- [ ] Error states use `bg-destructive/10 border-destructive/25` pattern
- [ ] Loading states use `animate-spin` spinner or `.skeleton` shimmer

### Risks & considerations
- [Any edge cases, RLS implications, type safety issues, or breaking changes]

### Estimated steps
[N steps — simple / moderate / complex]

---

After presenting the plan, ask: "Ready to implement? I'll work through each step and confirm completion before moving to the next."
