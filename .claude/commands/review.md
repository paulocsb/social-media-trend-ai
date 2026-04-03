Review the current code changes against this project's standards. $ARGUMENTS

Follow these steps:

1. **Get the diff**
   Run `git diff HEAD` (or `git diff --staged` if changes are staged) to see what changed.
   If $ARGUMENTS specifies a file or path, focus on that.

2. **Read each changed file in full** — do not review diffs alone, read the full file for context.

3. **Review against these checklists:**

### Architecture & Patterns
- [ ] All DB queries have `enabled: Boolean(activeCampaignId)` guard
- [ ] All DB queries filter by `eq('campaign_id', activeCampaignId!)`
- [ ] Mutations call `qc.invalidateQueries` on success for affected query keys
- [ ] Edge Function errors are wrapped: `throw new Error(\`...: \${error.message}\`)` — never `throw error`
- [ ] `parseError()` is used when displaying errors to users (handles JSON error responses)
- [ ] No hardcoded campaign IDs, user IDs, or magic strings
- [ ] New tables in Edge Functions use the service role key, not the anon key

### TypeScript
- [ ] No `any` types (use `unknown` + type guard if needed)
- [ ] Supabase table types come from `Tables<'table_name'>` from `@trend/shared`
- [ ] New DB columns are reflected in `database.types.ts`
- [ ] Props interfaces are defined for all new components
- [ ] No non-null assertions (`!`) except on `activeCampaignId!` inside `enabled: Boolean(activeCampaignId)` guards

### Design System
- [ ] Text ≥20px uses `font-display` (SF Pro Display) class
- [ ] Text <20px uses default `font-sans` (SF Pro Text)
- [ ] Accent color is ONLY `text-accent`, `bg-accent`, `border-accent`, `text-accent/XX` — no hardcoded `#0071e3`
- [ ] No `shadow-glow` or `shadow-glow-sm` on buttons or nav items
- [ ] No `active:scale-*` on buttons
- [ ] Primary button uses `font-medium` — not `font-semibold` or `font-bold`
- [ ] Headlines use `font-semibold` (600) — not `font-bold` (700)
- [ ] Glass components use single shadow layer (no inset)
- [ ] Error banners follow pattern: `bg-destructive/10 border border-destructive/25 rounded-xl px-4 py-3`
- [ ] New modals use `glass-raised rounded-2xl shadow-modal`
- [ ] Page root uses `<div className="space-y-6 animate-fade-in">`

### Security & RLS
- [ ] No new tables without RLS policy mirroring the `campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid())` pattern
- [ ] Auth session retrieved with `supabase.auth.getSession()` — not stored in React state
- [ ] No sensitive data (API keys, tokens) visible in frontend code
- [ ] Supabase service role key used only in Edge Functions, never in dashboard

### UX & Accessibility
- [ ] Loading states present for all async operations
- [ ] Error states present for all mutations and queries that can fail
- [ ] Interactive elements have `disabled` state during pending mutations
- [ ] Focus states work (`:focus-visible` is globally defined)
- [ ] Empty states have helpful copy ("No X yet — do Y to get started")

4. **Output format:**

---
## Review: [description of changes]

### Summary
[1-3 sentences on what the changes do]

### Issues found

**Critical** (must fix before shipping):
- [issue] in `path/to/file.tsx:line` — [why it's a problem] → [how to fix]

**Moderate** (should fix):
- [issue] → [fix]

**Minor** (nice to have):
- [issue] → [fix]

### Passed checks
- [list of checklist items that passed]

### Verdict
[LGTM / Fix criticals / Needs rework]

---

If no issues are found: say "LGTM — all checks passed" and list what was verified.
