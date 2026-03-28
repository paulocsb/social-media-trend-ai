import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Zap, Hash, User2, CheckCircle2, XCircle, Loader2,
  TrendingUp, Newspaper, Megaphone, ArrowRight, RefreshCw,
  BarChart3, SlidersHorizontal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectState = 'idle' | 'running' | 'done'
type RunTarget    = 'hashtags' | 'profiles' | 'both'
type QueueCounts  = { waiting: number; active: number; completed: number; failed: number; delayed: number }
type QueueStat    = { name: string; counts: QueueCounts }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Empty state: no campaign ─────────────────────────────────────────────────

function NoCampaignState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Megaphone className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">No campaigns yet</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Create your first campaign to start tracking hashtags, collecting data and detecting trends.
        </p>
      </div>
      <Button asChild>
        <Link to="/setup">
          <SlidersHorizontal className="h-4 w-4" />
          Go to Setup
        </Link>
      </Button>
    </div>
  )
}

// ─── No sources banner ────────────────────────────────────────────────────────

function NoSourcesBanner() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/20">
      <div className="flex items-center gap-2.5">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Add hashtags or profiles to this campaign before running a collection.
        </p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40" asChild>
        <Link to="/setup?tab=hashtags">Set up <ArrowRight className="h-3 w-3" /></Link>
      </Button>
    </div>
  )
}

// ─── Queue progress bar ───────────────────────────────────────────────────────

function QueueBar({ queue, seenActive }: { queue: QueueStat; seenActive: boolean }) {
  const { waiting, active, completed, failed } = queue.counts
  const total = waiting + active + completed + failed
  const pct   = total > 0 ? Math.round((completed / total) * 100) : 0
  const busy  = active > 0 || waiting > 0

  const LABEL: Record<string, string> = { 'collect:hashtag': 'Hashtags', 'collect:profile': 'Profiles' }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          {busy
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            : failed > 0 && completed === 0
              ? <XCircle className="h-3.5 w-3.5 text-destructive" />
              : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          }
          <span className="font-medium">{LABEL[queue.name] ?? queue.name}</span>
        </div>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-700', failed > 0 && completed === 0 ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${seenActive ? pct : 0}%` }}
        />
      </div>
    </div>
  )
}

// ─── Collection section ───────────────────────────────────────────────────────

function CollectionSection({ hasHashtags, hasProfiles, lastRun }: {
  hasHashtags: boolean
  hasProfiles: boolean
  lastRun: { startedAt: string; postsFound: number | null; eventsFound: number | null } | null
}) {
  const { activeCampaignId } = useCampaign()
  const [state, setState] = useState<CollectState>('idle')
  const [target, setTarget] = useState<RunTarget>('both')
  const [runId,  setRunId]  = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [doneInfo, setDoneInfo] = useState<{ posts: number; events: number } | null>(null)
  const seenActiveRef = useRef(false)
  const doneRef = useRef(false)

  const canRun = (target === 'hashtags' && hasHashtags)
    || (target === 'profiles' && hasProfiles)
    || (target === 'both' && (hasHashtags || hasProfiles))
  const hasAnySources = hasHashtags || hasProfiles

  // Elapsed timer
  useEffect(() => {
    if (state !== 'running') { setElapsed(0); return }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [state])

  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

  // Poll jobs when running
  const { data: jobsData } = useQuery({
    queryKey: ['jobs-home'],
    queryFn: () => api.getJobs(),
    refetchInterval: 2_000,
    enabled: state === 'running',
  })

  const queues = (jobsData?.queues ?? []) as QueueStat[]
  const relevant = queues.filter((q) => {
    if (target === 'both') return true
    return target === 'hashtags' ? q.name === 'collect:hashtag' : q.name === 'collect:profile'
  })

  const totalActive  = relevant.reduce((s, q) => s + q.counts.active, 0)
  const totalWaiting = relevant.reduce((s, q) => s + q.counts.waiting, 0)
  const totalDone    = relevant.reduce((s, q) => s + q.counts.completed + q.counts.failed, 0)

  if (totalActive > 0) seenActiveRef.current = true

  // Auto-complete
  useEffect(() => {
    if (state !== 'running' || !seenActiveRef.current || doneRef.current) return
    if (totalActive === 0 && totalWaiting === 0 && totalDone > 0) {
      doneRef.current = true
      setTimeout(async () => {
        if (runId) {
          try {
            const [evData, hData] = await Promise.all([
              activeCampaignId ? api.getEvents(activeCampaignId, 5) : Promise.resolve({ ok: true as const, events: [] }),
              activeCampaignId ? api.getHashtagLeaderboard(activeCampaignId, '24h', 10) : Promise.resolve({ ok: true as const, hashtags: [] }),
            ])
            const evArr = (evData.events ?? []) as Array<{ id: string; title: string; strategy?: string }>
            const hArr  = hData.hashtags ?? []
            setDoneInfo({ posts: totalDone, events: evArr.length })
            await api.completeRun(runId, {
              status: 'completed',
              postsFound: totalDone,
              eventsFound: evArr.length,
              topHashtags: hArr.slice(0, 10).map((h) => ({ hashtag: h.hashtag, score: h.score })),
              topEvents: evArr.slice(0, 5).map((e) => ({ topic: e.title, strategy: e.strategy ?? null })),
            }).catch(() => {})
          } catch {}
        }
        setState('done')
      }, 800)
    }
  }, [state, totalActive, totalWaiting, totalDone, runId, activeCampaignId])

  const triggerHashtags = useMutation({ mutationFn: () => activeCampaignId ? api.triggerCollection(activeCampaignId) : Promise.reject(new Error('No campaign')) })
  const triggerProfiles = useMutation({ mutationFn: () => activeCampaignId ? api.triggerProfileCollection(activeCampaignId) : Promise.reject(new Error('No campaign')) })

  async function handleRun() {
    if (!activeCampaignId || !canRun) return
    const { run } = await api.createRun(activeCampaignId, target)
    setRunId(run.id)
    seenActiveRef.current = false
    doneRef.current = false
    if (target === 'hashtags' || target === 'both') await triggerHashtags.mutateAsync().catch(() => {})
    if (target === 'profiles' || target === 'both') await triggerProfiles.mutateAsync().catch(() => {})
    setState('running')
  }

  function handleReset() {
    setState('idle')
    setRunId(null)
    setDoneInfo(null)
    seenActiveRef.current = false
    doneRef.current = false
    triggerHashtags.reset()
    triggerProfiles.reset()
  }

  const startError = triggerHashtags.error ?? triggerProfiles.error

  // ── Idle ──
  if (state === 'idle') {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Target pills */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(['both', 'hashtags', 'profiles'] as RunTarget[]).map((t) => {
              const labels: Record<RunTarget, string> = { both: 'Both', hashtags: 'Hashtags', profiles: 'Profiles' }
              return (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    target === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {labels[t]}
                </button>
              )
            })}
          </div>

          {/* Source counts */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {hasHashtags ? 'ready' : 'none'}
            </span>
            <span className="flex items-center gap-1">
              <User2 className="h-3 w-3" /> {hasProfiles ? 'ready' : 'none'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Last run info */}
            {lastRun && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Last: {relativeDate(lastRun.startedAt)}
                {lastRun.postsFound != null && ` · ${lastRun.postsFound} posts`}
              </span>
            )}
            {/* Run button */}
            <Button
              size="sm"
              disabled={!hasAnySources || !canRun || triggerHashtags.isPending || triggerProfiles.isPending}
              onClick={handleRun}
              className="gap-1.5"
            >
              {(triggerHashtags.isPending || triggerProfiles.isPending)
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5" />
              }
              Run collection
            </Button>
          </div>
        </div>

        {startError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {(startError as Error).message ?? 'Failed to trigger collection'}
          </div>
        )}
      </div>
    )
  }

  // ── Running ──
  if (state === 'running') {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium text-sm">Collecting…</span>
          </div>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">{elapsedStr}</span>
        </div>

        {!seenActiveRef.current && (
          <p className="text-xs text-muted-foreground animate-pulse">Waiting for workers to pick up jobs…</p>
        )}

        <div className="space-y-3">
          {relevant.length === 0
            ? Array.from({ length: target === 'both' ? 2 : 1 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
              ))
            : relevant.map((q) => (
                <QueueBar key={q.name} queue={q} seenActive={seenActiveRef.current} />
              ))
          }
        </div>
      </div>
    )
  }

  // ── Done ──
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-900/20">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Collection complete</span>
        </div>
        {doneInfo && (
          <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400">
            {doneInfo.events > 0 && (
              <span className="flex items-center gap-1">
                <Newspaper className="h-3 w-3" /> {doneInfo.events} event{doneInfo.events !== 1 ? 's' : ''} detected
              </span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" asChild>
            <Link to="/analysis"><Newspaper className="h-3.5 w-3.5" /> Analyze</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-3.5 w-3.5" /> Run again
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Events section ───────────────────────────────────────────────────────────

type NewsEvent = {
  id: string
  title: string
  summary: string | null
  strategy: string | null
  confidence: number
  detectedAt: string
}

function EventsSection() {
  const { activeCampaignId } = useCampaign()
  const { data, isLoading } = useQuery({
    queryKey: ['events', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getEvents(activeCampaignId, 5, 48) : Promise.resolve({ ok: true as const, events: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 60_000,
  })

  const events = (data?.events ?? []) as NewsEvent[]

  const STRATEGY: Record<string, { dot: string; badge: string }> = {
    URGENT:     { dot: 'bg-red-500',            badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    ENGAGEMENT: { dot: 'bg-emerald-500',         badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
    DISCARD:    { dot: 'bg-muted-foreground/30', badge: 'bg-muted text-muted-foreground' },
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Detected Events</h2>
        </div>
        <Link to="/analysis" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
          <Newspaper className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No events detected yet</p>
          <p className="text-xs text-muted-foreground/70">Events appear after running a collection</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((ev) => {
            const s = ev.strategy && ev.strategy in STRATEGY ? STRATEGY[ev.strategy] : null
            return (
              <div key={ev.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', s?.dot ?? 'bg-muted-foreground/30')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{relativeDate(ev.detectedAt)}</p>
                </div>
                {ev.strategy && ev.strategy !== 'DISCARD' && s && (
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', s.badge)}>
                    {ev.strategy}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Trending section ─────────────────────────────────────────────────────────

function TrendingSection() {
  const { activeCampaignId } = useCampaign()
  const { data, isLoading } = useQuery({
    queryKey: ['hashtags', '24h', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getHashtagLeaderboard(activeCampaignId, '24h', 8) : Promise.resolve({ ok: true as const, hashtags: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 60_000,
  })

  const hashtags = data?.hashtags ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Trending · 24h</h2>
        </div>
        <Link to="/analysis" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          Full view <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-6 animate-pulse rounded-md bg-muted" />)}
        </div>
      )}

      {!isLoading && hashtags.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
          <BarChart3 className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No trending data yet</p>
          <p className="text-xs text-muted-foreground/70">Run a collection to populate trends</p>
        </div>
      )}

      {hashtags.length > 0 && (
        <div className="space-y-2">
          {hashtags.map((h, i) => {
            const max = hashtags[0]?.score ?? 1
            const pct = Math.round((h.score / max) * 100)
            return (
              <div key={h.hashtag} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%`, transitionDelay: `${i * 50}ms` }}
                  />
                </div>
                <span className="w-28 truncate font-mono text-xs text-foreground">#{h.hashtag}</span>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{h.score.toFixed(0)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { activeCampaign, campaigns, isLoading: campaignsLoading } = useCampaign()

  // Last run data
  const { data: runsData } = useQuery({
    queryKey: ['runs', activeCampaign?.id],
    queryFn: () => activeCampaign ? api.listRuns(activeCampaign.id) : Promise.resolve({ ok: true as const, runs: [] }),
    enabled: Boolean(activeCampaign),
  })

  // Source counts
  const { data: hashtagData } = useQuery({
    queryKey: ['hashtags-tracked', activeCampaign?.id],
    queryFn: () => activeCampaign ? api.getTrackedHashtags(activeCampaign.id) : Promise.resolve({ ok: true as const, hashtags: [] }),
    enabled: Boolean(activeCampaign),
  })
  const { data: profileData } = useQuery({
    queryKey: ['profiles-tracked', activeCampaign?.id],
    queryFn: () => activeCampaign ? api.getProfiles(activeCampaign.id) : Promise.resolve({ ok: true as const, profiles: [] }),
    enabled: Boolean(activeCampaign),
  })

  if (campaignsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (campaigns.length === 0) return <NoCampaignState />

  const runs      = runsData?.runs ?? []
  const lastRun   = runs[0] ?? null
  const hashtags  = (hashtagData?.hashtags ?? []) as Array<{ active: boolean }>
  const profiles  = (profileData?.profiles ?? []) as Array<{ active: boolean }>
  const hasHashtags = hashtags.some((h) => h.active)
  const hasProfiles = profiles.some((p) => p.active)
  const hasSources  = hasHashtags || hasProfiles

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Home</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeCampaign
              ? <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: activeCampaign.color }} />
                  {activeCampaign.name}
                </span>
              : 'Select a campaign to get started'
            }
          </p>
        </div>
      </div>

      {/* No sources warning */}
      {!hasSources && <NoSourcesBanner />}

      {/* Collection panel */}
      <CollectionSection
        hasHashtags={hasHashtags}
        hasProfiles={hasProfiles}
        lastRun={lastRun}
      />

      {/* Data panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EventsSection />
        <TrendingSection />
      </div>
    </>
  )
}
