import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Zap, Hash, User2, CheckCircle2, XCircle, Loader2,
  TrendingUp, BarChart3, Newspaper, ImageIcon, ChevronRight,
  RotateCcw, ExternalLink, History,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'setup' | 'running' | 'results'
type RunTarget = 'hashtags' | 'profiles' | 'both'

type QueueCounts = { waiting: number; active: number; completed: number; failed: number; delayed: number }
type QueueStat   = { name: string; counts: QueueCounts }

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: 'setup',   label: 'Setup' },
  { key: 'running', label: 'Collecting' },
  { key: 'results', label: 'Results' },
]

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
              done   && 'bg-emerald-500 text-white',
              active && 'bg-primary text-primary-foreground shadow-md shadow-primary/30',
              !done && !active && 'bg-muted text-muted-foreground',
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Setup step ───────────────────────────────────────────────────────────────

function SetupStep({ onStart }: { onStart: (target: RunTarget) => void }) {
  const { activeCampaignId } = useCampaign()
  const [target, setTarget] = useState<RunTarget>('both')

  const { data: hashtagData } = useQuery({ queryKey: ['hashtags', activeCampaignId], queryFn: () => activeCampaignId ? api.getTrackedHashtags(activeCampaignId) : Promise.resolve({ ok: true as const, hashtags: [] }) })
  const { data: profileData  } = useQuery({ queryKey: ['profiles', activeCampaignId], queryFn: () => activeCampaignId ? api.getProfiles(activeCampaignId) : Promise.resolve({ ok: true as const, profiles: [] }) })

  const hashtags = hashtagData?.hashtags.filter((h) => h.active) ?? []
  const profiles  = profileData?.profiles.filter((p) => p.active) ?? []

  const canRunHashtags = hashtags.length > 0
  const canRunProfiles  = profiles.length > 0

  const TARGETS: { key: RunTarget; label: string; icon: React.ElementType; items: string[]; disabled: boolean; emptyMsg: string }[] = [
    {
      key: 'hashtags',
      label: 'Hashtags',
      icon: Hash,
      items: hashtags.map((h) => h.hashtag),
      disabled: !canRunHashtags,
      emptyMsg: 'No active hashtags',
    },
    {
      key: 'profiles',
      label: 'Profiles',
      icon: User2,
      items: profiles.map((p) => `@${p.handle}`),
      disabled: !canRunProfiles,
      emptyMsg: 'No active profiles',
    },
  ]

  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">What do you want to collect?</h2>
        <p className="text-sm text-muted-foreground">Select the sources to include in this run.</p>
      </div>

      {/* Source cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TARGETS.map(({ key, label, icon: Icon, items, disabled, emptyMsg }) => {
          const selected = target === key || target === 'both'
          return (
            <button
              key={key}
              disabled={disabled}
              onClick={() => {
                if (disabled) return
                if (target === 'both') setTarget(key === 'hashtags' ? 'profiles' : 'hashtags')
                else if (target === key) setTarget('both')
                else setTarget('both')
              }}
              className={cn(
                'group relative flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200',
                selected && !disabled
                  ? 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                  selected && !disabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 transition-colors',
                  selected && !disabled ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                )}>
                  {selected && !disabled && <CheckCircle2 className="h-full w-full text-primary-foreground" />}
                </div>
              </div>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {disabled ? emptyMsg : `${items.length} active`}
                </p>
              </div>
              {items.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {items.slice(0, 5).map((item) => (
                    <span key={item} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {item}
                    </span>
                  ))}
                  {items.length > 5 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      +{items.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground">
        Data is processed and scored automatically after collection. Events and trends update within a few seconds.
      </p>

      <Button
        size="lg"
        className="w-full gap-2 text-base"
        disabled={
          (target === 'hashtags' && !canRunHashtags) ||
          (target === 'profiles' && !canRunProfiles) ||
          (target === 'both' && !canRunHashtags && !canRunProfiles)
        }
        onClick={() => onStart(target)}
      >
        <Zap className="h-5 w-5" />
        Start collection
      </Button>
    </div>
  )
}

// ─── Queue progress bar ───────────────────────────────────────────────────────

function QueueProgress({ queue, seenActive }: { queue: QueueStat; seenActive: boolean }) {
  const { waiting, active, completed, failed } = queue.counts
  const total = waiting + active + completed + failed
  const pct   = total > 0 ? Math.round((completed / total) * 100) : 0
  const busy  = active > 0 || waiting > 0

  const LABEL: Record<string, string> = {
    'collect:hashtag': 'Hashtags',
    'collect:profile': 'Profiles',
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {busy
            ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
            : failed > 0 && completed === 0
              ? <XCircle className="h-4 w-4 text-destructive" />
              : <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          }
          <span className="font-medium">{LABEL[queue.name] ?? queue.name}</span>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            failed > 0 && completed === 0 ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${seenActive ? pct : 0}%` }}
        />
      </div>

      {/* Counts */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        {active > 0    && <span className="text-blue-500 font-medium">{active} running</span>}
        {waiting > 0   && <span className="text-amber-500">{waiting} waiting</span>}
        {completed > 0 && <span className="text-emerald-500">{completed} done</span>}
        {failed > 0    && <span className="text-destructive">{failed} failed</span>}
      </div>
    </div>
  )
}

// ─── Running step ─────────────────────────────────────────────────────────────

function RunningStep({ target, onDone }: { target: RunTarget; onDone: () => void }) {
  const seenActiveRef = useRef(false)
  const doneRef       = useRef(false)

  const { data } = useQuery({
    queryKey:        ['jobs-run'],
    queryFn:         () => api.getJobs(),
    refetchInterval: 2_000,
  })

  const queues = (data?.queues ?? []) as QueueStat[]

  const relevant = queues.filter((q) => {
    if (target === 'both')     return true
    if (target === 'hashtags') return q.name === 'collect:hashtag'
    return q.name === 'collect:profile'
  })

  const totalActive  = relevant.reduce((s, q) => s + q.counts.active, 0)
  const totalWaiting = relevant.reduce((s, q) => s + q.counts.waiting, 0)
  const totalDone    = relevant.reduce((s, q) => s + q.counts.completed + q.counts.failed, 0)

  // Track that we've seen at least 1 active job to avoid premature completion
  if (totalActive > 0) seenActiveRef.current = true

  useEffect(() => {
    if (!seenActiveRef.current) return
    if (totalActive === 0 && totalWaiting === 0 && totalDone > 0 && !doneRef.current) {
      doneRef.current = true
      setTimeout(onDone, 800) // brief pause so user can see 100%
    }
  }, [totalActive, totalWaiting, totalDone, onDone])

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Collecting data…</h2>
          <p className="text-sm text-muted-foreground">This usually takes 30–90 seconds. Stay on this page.</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm text-muted-foreground tabular-nums">
          {elapsedStr}
        </span>
      </div>

      {/* Animated dots while waiting for jobs to appear */}
      {!seenActiveRef.current && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for workers to pick up jobs…
        </div>
      )}

      <div className="space-y-3">
        {relevant.length === 0
          ? Array.from({ length: target === 'both' ? 2 : 1 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))
          : relevant.map((q) => (
              <QueueProgress key={q.name} queue={q} seenActive={seenActiveRef.current} />
            ))
        }
      </div>
    </div>
  )
}

// ─── Results step ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function ResultsStep({ runId, onReset }: { runId: string | null; onReset: () => void }) {
  const { activeCampaignId } = useCampaign()
  const { data: postsData    } = useQuery({ queryKey: ['posts-run', activeCampaignId],       queryFn: () => activeCampaignId ? api.getPosts(activeCampaignId, '24h', 6, false) : Promise.resolve({ ok: true as const, posts: [] }) })
  const { data: hashtagData  } = useQuery({ queryKey: ['leaderboard-run', activeCampaignId], queryFn: () => activeCampaignId ? api.getHashtagLeaderboard(activeCampaignId, '24h', 5) : Promise.resolve({ ok: true as const, hashtags: [] }) })
  const { data: eventsData   } = useQuery({ queryKey: ['events-run', activeCampaignId],      queryFn: () => activeCampaignId ? api.getEvents(activeCampaignId, 5) : Promise.resolve({ ok: true as const, events: [] }) })

  const posts    = (postsData?.posts    ?? []) as Array<{ id: string; thumbnailUrl?: string; likes: number; comments: number; trendScore: number; authorHandle?: string; permalink?: string }>
  const hashtags = hashtagData?.hashtags ?? []
  const events   = (eventsData?.events  ?? []) as Array<{ id: string; title: string; eventType: string; detectedAt: string; strategy?: string }>

  // Persist run stats once data is loaded
  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current || !runId) return
    if (!postsData || !hashtagData || !eventsData) return
    savedRef.current = true
    api.completeRun(runId, {
      status: 'completed',
      postsFound:   posts.length,
      eventsFound:  events.length,
      topHashtags:  hashtags.slice(0, 10).map((h) => ({ hashtag: h.hashtag, score: h.score })),
      topEvents:    events.slice(0, 5).map((e) => ({ topic: e.title, strategy: e.strategy ?? null })),
    }).catch(() => { /* non-critical */ })
  }, [runId, postsData, hashtagData, eventsData, posts.length, events.length, hashtags, events])

  const BASE = import.meta.env.VITE_API_URL ?? ''
  function imgProxy(url?: string) {
    if (!url) return undefined
    return `${BASE}/api/proxy/image?url=${encodeURIComponent(url)}`
  }

  return (
    <div className="animate-slide-up space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Collection complete</h2>
          <p className="text-sm text-muted-foreground">Here's what was found in this run.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Done</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ImageIcon}    label="Posts collected" value={posts.length}    color="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
        <StatCard icon={TrendingUp}   label="Trending topics" value={hashtags.length} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
        <StatCard icon={Newspaper}    label="Events detected" value={events.length}   color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
      </div>

      {/* Top hashtags */}
      {hashtags.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Top hashtags</h3>
          </div>
          <div className="space-y-2">
            {hashtags.map((h, i) => {
              const max = hashtags[0]?.score ?? 1
              const pct = Math.round((h.score / max) * 100)
              return (
                <div key={h.hashtag} className="flex items-center gap-3">
                  <span className="w-4 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%`, transitionDelay: `${i * 60}ms` }}
                    />
                  </div>
                  <span className="w-28 truncate font-mono text-xs text-foreground">#{h.hashtag}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{h.score.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Posts mini-grid */}
      {posts.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Top posts</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                {post.thumbnailUrl
                  ? <img src={imgProxy(post.thumbnailUrl)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  : <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/30" /></div>
                }
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="font-mono text-[10px] text-white">{post.trendScore.toFixed(0)}</span>
                  {post.permalink && <ExternalLink className="ml-auto h-3 w-3 text-white/70" />}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Detected events */}
      {events.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Detected events</h3>
          </div>
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                {ev.strategy === 'URGENT' && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                {ev.strategy === 'ENGAGEMENT' && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                {(!ev.strategy || ev.strategy === 'DISCARD') && <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />}
                <p className="flex-1 truncate text-sm font-medium">{ev.title}</p>
                {ev.strategy && ev.strategy !== 'DISCARD' && (
                  <Badge variant="secondary" className="text-[10px]">{ev.strategy}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link to="/analysis"><Newspaper className="h-4 w-4" /> Go to Analysis</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/history"><History className="h-4 w-4" /> View history</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> New run
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RunPage() {
  const { activeCampaignId } = useCampaign()
  const [step, setStep]     = useState<Step>('setup')
  const [target, setTarget] = useState<RunTarget>('both')
  const [runId,  setRunId]  = useState<string | null>(null)

  const triggerHashtags = useMutation({ mutationFn: () => activeCampaignId ? api.triggerCollection(activeCampaignId) : Promise.reject(new Error('No campaign')) })
  const triggerProfiles = useMutation({ mutationFn: () => activeCampaignId ? api.triggerProfileCollection(activeCampaignId) : Promise.reject(new Error('No campaign')) })

  async function handleStart(t: RunTarget) {
    setTarget(t)
    if (!activeCampaignId) return
    const { run } = await api.createRun(activeCampaignId, t)
    setRunId(run.id)
    if (t === 'hashtags' || t === 'both') await triggerHashtags.mutateAsync()
    if (t === 'profiles'  || t === 'both') await triggerProfiles.mutateAsync()
    setStep('running')
  }

  // Called by RunningStep when jobs finish — persists completion immediately
  // so navigating away still records the run as completed.
  async function handleDone(id: string) {
    await api.completeRun(id, { status: 'completed' }).catch(() => {})
    setStep('results')
  }

  function reset() {
    setStep('setup')
    setTarget('both')
    setRunId(null)
    triggerHashtags.reset()
    triggerProfiles.reset()
  }

  const startError = triggerHashtags.error ?? triggerProfiles.error

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-start justify-center pt-8">
      <div className="w-full max-w-xl space-y-10">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Run Collection</h1>
              <p className="text-sm text-muted-foreground">Collect, process and analyze in one flow</p>
            </div>
          </div>
          <StepIndicator current={step} />
        </div>

        {/* Step content */}
        {startError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
            <XCircle className="h-4 w-4 shrink-0" />
            {(startError as Error).message ?? 'Failed to trigger collection'}
          </div>
        )}

        {step === 'setup'   && <SetupStep   onStart={handleStart} />}
        {step === 'running' && <RunningStep target={target} onDone={() => runId && handleDone(runId)} />}
        {step === 'results' && <ResultsStep runId={runId} onReset={reset} />}
      </div>
    </div>
  )
}
