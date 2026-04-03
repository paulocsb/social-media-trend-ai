# Dashboard Pages

All pages are in `packages/dashboard/src/pages/`. All are campaign-scoped — every query
filters by `activeCampaignId` from `useCampaign()`. Routes are defined in `App.tsx`.

---

## Home (`/`) — `HomePage.tsx`

**Purpose:** Primary workspace. Trigger collection, view trending data, manage post grid.

### Layout
```
Header (campaign name + target filter + Collect Now button)
Error banner (collect error, if any)
Status bar (Last Run cell | Analysis cell)
Alert banner (triggered alerts, dismissible)
Trending Hashtags section (pill chips)
Top Posts section (3-col grid)
```

### State
| State | Type | Purpose |
|---|---|---|
| `target` | `'both'|'hashtags'|'profiles'` | What to collect |
| `triggeredAlerts` | `TriggeredAlert[]` | Shown as dismissible banner after collect |
| `collectStep` | `number` | Drives `StepIndicator` animation |
| `successCount` | `number|null` | Shown briefly after collect |
| `dataVersion` | `number` | Bumped on collect — busts pool/hashtag query cache |
| `excluded` | `Set<string>` | Locally excluded post IDs (reset on collect) |
| `seededRef` | `useRef<boolean>` | Prevents double-seeding excluded from DB queue |
| `needsQueueRefill` | `useRef<boolean>` | Triggers queue sync after pool refetches post-collect |

### Queries
| Key | Source | Notes |
|---|---|---|
| `['last-run', campaignId]` | `collection_runs` | Latest run; polls every 2s while status=running |
| `['last-analysis', campaignId]` | `ai_analyses` | id + created_at only — for status bar |
| `['analysis-queue', campaignId]` | `analysis_queue` | post_ids of the current analysis queue |
| `['top-posts', campaignId, runId, dataVersion]` | `scored_posts` | POOL_SIZE=18 posts from latest 5-min batch |
| `['top-hashtags', campaignId, runId, dataVersion]` | `hashtag_snapshots` | Top 12 from latest batch |

### Post grid logic
- `POOL_SIZE = 18` posts fetched, `DISPLAY_SIZE = 9` displayed
- `posts = pool.filter(p => !excluded.has(p.id)).slice(0, DISPLAY_SIZE)`
- **Exclude flow:** `handleExclude(postId)` → update `excluded` state → sync full queue to DB (delete all + insert new DISPLAY_SIZE non-excluded posts from pool)
- **Seed on load:** `seededRef` ensures this runs once. If queue is empty → auto-populate with top 9. If queue has entries → seed `excluded` from pool posts NOT in the queue.
- **Post-collect refill:** `needsQueueRefill` ref is set in `onSuccess`, consumed when pool refetches.

### Analysis status logic
```typescript
const analysisIsPostRun = lastCompletedRun && lastAnalysis
  ? new Date(lastAnalysis.created_at) > new Date(lastCompletedRun.started_at)
  : false;
```
Status bar shows: green "Ready" + "View →" if analysis is post-run; accent "Not run yet" + "Run →" if not.

### Key components defined inline
- `PostCard` — `relative aspect-square rounded-2xl overflow-hidden`, score badge (top-right), rank badge (top-left), exclude button (hover top-left), bottom gradient info bar
- `StepIndicator` — 4-step progress bar (Connecting → Fetching → Scoring → Saving)
- `ScoreDot` — colored dot (green ≥70, yellow ≥40, gray <40)
- `SkeletonGrid`, `SkeletonChips` — loading states

---

## Analysis (`/analysis`) — `AnalisePage.tsx`

**Purpose:** Run AI analysis on queued posts, view results, manual copy/paste fallback.

### Layout
```
Page title "Analysis"
Auto AI run card (Sparkles icon, Run Analysis button, AnalysisSteps progress)
Manual section (collapsible — Generate Prompt | Submit AI Response)
Latest Analysis card (always expanded, accent top bar)
History section (collapsible, older analyses as expand-on-click cards)
```

### State
| State | Type | Purpose |
|---|---|---|
| `prompt` | `string` | Generated prompt text for manual workflow |
| `response` | `string` | User-pasted AI JSON for manual submit |
| `showManual` | `boolean` | Collapse state of manual section |
| `expanded` | `string|null` | Which history card is expanded |
| `showHistory` | `boolean` | Collapse state of history section |

### Queries & mutations
| Name | Type | Endpoint |
|---|---|---|
| `providers` | query | `GET /analysis/providers` |
| `analyses` | query | `ai_analyses` — latest 10, ordered by created_at desc |
| `runWithAI` | mutation | `POST /analysis/run` |
| `loadPrompt` | mutation | `GET /analysis/prompt?campaignId=` |
| `submit` | mutation | `POST /analysis` (manual JSON) |
| `deleteAnalysis` | mutation | `supabase.from('ai_analyses').delete()` |

### AnalysisSteps component
5-step time-based progress indicator: Fetching data (0ms) → Building prompt (1500ms) → Analysing trends (3000ms) → Generating content (6000ms) → Saving (9000ms). Timer-driven, resets when `running` goes false.

### Analysis display
- `analyses[0]` → **Latest Analysis**: always expanded, `border-accent/30 shadow-panel`, `h-0.5 bg-accent/60` top bar, topic + urgency badge + delete button in header, full body below.
- `analyses[1...]` → **History**: toggle-collapsed, each card expand-on-click.
- `AnalysisBody` helper renders: Reasoning → Content Ideas → Suggested Hashtags → Generated Content (caption + visual + hashtags + best time) → Content Prompt fallback.

---

## History (`/history`) — `HistoryPage.tsx`

**Purpose:** Audit trail of collection runs and AI analyses.

### Layout
```
Page title "History"
Collection Runs section
  - Bulk delete button (when rows selected)
  - Table: checkbox | Started | Target | Duration | Posts | Status | Actions
  - Expandable rows: error detail or top hashtags from run
AI Analyses section (if any exist)
  - Link to /analysis
  - List: topic + date + urgency badge
Delete confirmation dialog (modal)
```

### Key features
- **Multi-select** with select-all checkbox; bulk delete with confirmation modal
- **Rescore** button per completed/partial run → `POST /collect/rescore` without re-fetching Apify
- **Expand row** → shows either error message (failed runs) or top hashtags (completed runs)
- Rescore feedback tooltip (success/error) appears beside the rescore button for 4s

### Queries & mutations
| Name | Type | Source |
|---|---|---|
| `runs` | query | `collection_runs` — latest 50 |
| `analyses` | query | `ai_analyses` — id, main_topic, urgency_level, created_at, latest 20 |
| `deleteRuns` | mutation | `collection_runs.delete().in('id', ids)` |
| `rescore` | mutation | `POST /functions/v1/collect/rescore { campaignId, runId }` |

---

## Setup (`/setup`) — `SetupPage.tsx`

**Purpose:** Manage campaigns, hashtags, and profiles. Context-focused on active campaign.

### Layout
```
Header (page title + New Campaign button)
─── If campaigns.length === 0: empty state ───
─── Else: ───
  Active campaign card (colored top bar, name, Active badge, edit/delete)
  2-col grid: Hashtags card | Profiles card
  Other campaigns section (compact rows: color dot, name, Select/Edit/Delete)
```

### Active campaign card
`glass-raised rounded-2xl border border-accent/20` with `h-1` colored top bar using `campaign.color`.
Hashtags shown as togglable pills (`active ? bg-accent/15 : bg-surface-tint`). Click to toggle active state, × to delete.
Profiles shown as `bg-accent/15` pills with × to delete.

### Modal system
`modal` state is a discriminated union:
```typescript
type ModalState =
  | { type: 'new-campaign' }
  | { type: 'edit-campaign'; campaign: Campaign }
  | { type: 'delete-campaign'; campaign: Campaign }
  | { type: 'add-hashtag' }
  | { type: 'add-profile' };
```

**CampaignModal** — name + description (optional) + color picker (8 preset colors). Create or update.
**AddItemModal** — comma/space-separated bulk add. Strips `#`/`@` prefixes automatically.
**DeleteCampaignModal** — warns that all posts and analyses are permanently deleted.

### Queries & mutations
| Name | Type | Source |
|---|---|---|
| `hashtags` | query | `tracked_hashtags` ordered by created_at |
| `profiles` | query | `tracked_profiles` ordered by created_at |
| `removeHashtag` | mutation | `tracked_hashtags.delete()` |
| `toggleHashtag` | mutation | `tracked_hashtags.update({ active })` |
| `removeProfile` | mutation | `tracked_profiles.delete()` |
| Campaign CRUD | in `CampaignModal`, `DeleteCampaignModal` | `campaigns` table |

---

## Settings (`/settings`) — `ConfiguracoesPage.tsx`

**Purpose:** Alert management — get notified when a hashtag's trend score crosses a threshold.

### Layout
Alerts list with per-alert controls: hashtag name, threshold input, active toggle, delete.
Add alert form at bottom.

### Alert evaluation
Alerts are NOT evaluated here — they run inline at the end of each `collect` call.
The `triggeredAlerts` array is returned in the collect response and shown as a banner on Home.

---

## Account (`/account`) — `ContaPage.tsx`

**Purpose:** Update email and password.

### Layout
Two sections: Update Email (current email + new email input) and Update Password (new password + confirm).

Uses `supabase.auth.updateUser({ email })` and `supabase.auth.updateUser({ password })`.
Email update triggers a confirmation email to the new address.

---

## Auth Pages (`/features/auth/`)

| File | Route | Method |
|---|---|---|
| `Login.tsx` | `/login` | `signInWithPassword` |
| `SignUp.tsx` | `/signup` | `signUp` |
| `ForgotPassword.tsx` | `/forgot-password` | `resetPasswordForEmail` |
| `ResetPassword.tsx` | `/reset-password` | `updateUser` on `PASSWORD_RECOVERY` event |
| `OAuthButtons.tsx` | (used in Login + SignUp) | `signInWithOAuth` (Google, GitHub, Apple) |
| `AuthLayout.tsx` | wrapper | Centered glass card layout |

`App.tsx` subscribes to `onAuthStateChange`. If session exists, public routes redirect to `/`.
On `PASSWORD_RECOVERY` event, app navigates to `/reset-password` regardless of current route.

---

## Shared lib

### `useCampaign()` — `lib/campaign.tsx`
```typescript
const {
  campaigns,          // Campaign[]
  activeCampaign,     // Campaign | undefined
  activeCampaignId,   // string | null
  setActiveCampaignId,// (id: string | null) => void
  isLoading,          // boolean
} = useCampaign();
```
Active campaign ID is persisted to `localStorage`. `campaigns` comes from a TanStack Query on `campaigns` table. `CampaignProvider` wraps the entire auth-guarded app.

### `useTheme()` — `lib/theme.tsx`
```typescript
const { theme, toggleTheme } = useTheme(); // theme: 'light' | 'dark'
```
Default is `'light'`. Persisted to `localStorage`. Adds/removes `.dark` class on `<html>`.
Flash prevention script in `index.html` adds `.dark` only when stored value is `'dark'`.

### `utils.ts`
```typescript
cn(...inputs)               // clsx + tailwind-merge
relativeTime(isoString)     // "2 hours ago"
formatNumber(n)             // 1200 → "1.2K"
```
