Implement the current plan step by step. $ARGUMENTS

If no plan exists in the current session, ask the user to run `/plan <feature>` first.

Follow this process:

1. **Create tasks** for each step in the plan using TaskCreate.

2. **For each step:**
   a. Mark the task as `in_progress`
   b. Read the file(s) that need to change before editing them
   c. Make the changes — prefer Edit over Write for existing files
   d. After each file change, verify the edit looks correct
   e. Mark the task as `completed`
   f. Report: "✓ Step N complete — [what was done in one line]"
   g. Move to the next step

3. **Rules during implementation:**
   - Never skip reading a file before editing it
   - Follow the patterns in `CLAUDE.md` section 9 (Common Patterns) exactly
   - For DB changes: write the migration SQL first, then update `database.types.ts`
   - For new UI components: check `packages/dashboard/src/components/ui/` for reusable primitives before creating new ones
   - For Edge Function changes: keep Deno-compatible imports (no npm: unless in import map)
   - After any schema change, note that `supabase gen types typescript --local > packages/shared/src/database.types.ts` must be run

4. **Design enforcement during implementation:**
   - Text ≥20px → add `font-display` class
   - Interactive elements → use `text-accent` or `bg-accent` — never custom colors
   - Error banners → `<div className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 flex items-start gap-3">`
   - Success feedback → `text-success` text or `bg-success/10` background
   - Loading → spinner `w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin`
   - Page wrapper → `<div className="space-y-6 animate-fade-in">`

5. **After all steps complete:**
   - Run a final review: check for TypeScript issues, missing `enabled:` guards on queries, uncaught errors
   - List all modified files
   - Suggest the next action (run the app, run migration, commit)
