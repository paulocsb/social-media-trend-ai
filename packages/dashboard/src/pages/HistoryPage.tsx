import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History, CheckCircle2, XCircle, Clock, AlertTriangle,
  Hash, User2, BarChart3, Newspaper, ImageIcon,
  ChevronDown, ChevronUp, Zap, BrainCircuit, Copy, Check,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api, type CollectionRun, type AIAnalysis } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' · ' + new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ─── RUNS TAB ─────────────────────────────────────────────────────────────────

function runDuration(run: CollectionRun): string {
  if (!run.finishedAt) return '—'
  const s = Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const RUN_STATUS = {
  running:   { icon: Clock,         color: 'text-blue-500',    bg: 'bg-blue-50    dark:bg-blue-900/20',    label: 'Running' },
  completed: { icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Completed' },
  partial:   { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-50   dark:bg-amber-900/20',   label: 'Partial' },
  failed:    { icon: XCircle,       color: 'text-destructive', bg: 'bg-destructive/10',                    label: 'Failed' },
} as const

const RUN_TARGET = {
  both:     { icon: Zap,   label: 'Both' },
  hashtags: { icon: Hash,  label: 'Hashtags' },
  profiles: { icon: User2, label: 'Profiles' },
} as const

function RunDetail({ run }: { run: CollectionRun }) {
  return (
    <div className="animate-slide-up space-y-4 border-t bg-muted/30 px-5 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {run.topHashtags && run.topHashtags.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Top hashtags
            </p>
            <div className="space-y-1.5">
              {run.topHashtags.slice(0, 8).map((h, i) => {
                const max = run.topHashtags![0]?.score ?? 1
                const pct = Math.round((h.score / max) * 100)
                return (
                  <div key={h.hashtag} className="flex items-center gap-2">
                    <span className="w-4 text-right text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%`, transitionDelay: `${i * 40}ms` }} />
                    </div>
                    <span className="w-24 truncate font-mono text-[11px]">#{h.hashtag}</span>
                    <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{h.score.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {run.topEvents && run.topEvents.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Newspaper className="h-3.5 w-3.5" /> Detected events
            </p>
            <div className="space-y-1.5">
              {run.topEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full',
                    ev.strategy === 'URGENT'     ? 'bg-red-500' :
                    ev.strategy === 'ENGAGEMENT' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  )} />
                  <p className="flex-1 truncate text-xs font-medium">{ev.topic}</p>
                  {ev.strategy && ev.strategy !== 'DISCARD' && (
                    <Badge variant="secondary" className="text-[9px]">{ev.strategy}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {run.errorMessage && (
          <p className="col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {run.errorMessage}
          </p>
        )}

        {!run.topHashtags && !run.topEvents && !run.errorMessage && (
          <p className="col-span-2 text-sm italic text-muted-foreground">No detail data recorded for this run.</p>
        )}
      </div>
    </div>
  )
}

function RunRow({ run }: { run: CollectionRun }) {
  const [expanded, setExpanded] = useState(false)
  const status     = RUN_STATUS[run.status] ?? RUN_STATUS.failed
  const target     = RUN_TARGET[run.target] ?? RUN_TARGET.both
  const StatusIcon = status.icon
  const TargetIcon = target.icon
  const hasDetail  = run.topHashtags || run.topEvents || run.errorMessage

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card transition-shadow', expanded && 'shadow-sm')}>
      <button
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
        onClick={() => hasDetail && setExpanded((v) => !v)}
      >
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', status.bg)}>
          <StatusIcon className={cn('h-4 w-4', status.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatDate(run.startedAt)}</span>
            <Badge variant="outline" className="gap-1 py-0 text-[10px]">
              <TargetIcon className="h-2.5 w-2.5" />{target.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {relativeDate(run.startedAt)} · {runDuration(run)}
          </p>
        </div>

        <div className="hidden items-center gap-5 sm:flex">
          {run.postsFound !== null && (
            <div className="text-center">
              <p className="text-base font-bold tabular-nums leading-none">{run.postsFound}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">posts</p>
            </div>
          )}
          {run.eventsFound !== null && (
            <div className="text-center">
              <p className="text-base font-bold tabular-nums leading-none">{run.eventsFound}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">events</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
          {hasDetail && (expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
        </div>
      </button>
      {expanded && hasDetail && <RunDetail run={run} />}
    </div>
  )
}

function RunsTab() {
  const { activeCampaignId } = useCampaign()
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all')
  const { data, isLoading } = useQuery({ queryKey: ['runs', activeCampaignId], queryFn: () => activeCampaignId ? api.listRuns(activeCampaignId) : Promise.resolve({ ok: true as const, runs: [] }), refetchInterval: 30_000 })

  const all  = data?.runs ?? []
  const runs = filter === 'all' ? all : all.filter((r) => r.status === filter)

  const totalPosts = all.reduce((s, r) => s + (r.postsFound ?? 0), 0)
  const totalEvts  = all.reduce((s, r) => s + (r.eventsFound ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      {all.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total runs',      value: all.length,  icon: History,   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
            { label: 'Posts collected', value: totalPosts,  icon: ImageIcon, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
            { label: 'Events detected', value: totalEvts,   icon: Newspaper, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      {all.length > 0 && (
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
          {(['all', 'completed', 'failed'] as const).map((f) => {
            const count = f === 'all' ? all.length : all.filter((r) => r.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            )
          })}
        </div>
      )}

      {isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>}

      {!isLoading && runs.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">{all.length === 0 ? 'No runs yet' : 'No runs match this filter'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{all.length === 0 ? 'Start your first collection run to see history here.' : 'Try a different filter.'}</p>
          </div>
          {all.length === 0 && <Button asChild size="sm"><Link to="/"><Zap className="h-4 w-4" /> Start first run</Link></Button>}
        </div>
      )}

      {!isLoading && runs.length > 0 && (
        <div className="space-y-2">{runs.map((run) => <RunRow key={run.id} run={run} />)}</div>
      )}
    </div>
  )
}

// ─── ANALYSES TAB ─────────────────────────────────────────────────────────────

const URGENCY_COLOR = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  low:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function AnalysisDetail({ analysis }: { analysis: AIAnalysis }) {
  const [copied, setCopied] = useState(false)

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-slide-up space-y-4 border-t bg-muted/30 px-5 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Reasoning */}
        {analysis.reasoning && (
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reasoning</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{analysis.reasoning}</p>
          </div>
        )}

        {/* Hashtags */}
        {analysis.suggestedHashtags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested hashtags</p>
            <div className="flex flex-wrap gap-1">
              {analysis.suggestedHashtags.map((h) => (
                <span key={h} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">#{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Content ideas */}
        {analysis.contentIdeas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content ideas</p>
            <ul className="space-y-1">
              {analysis.contentIdeas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {idea}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Content prompt */}
      {analysis.contentPrompt && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content creation prompt</p>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copy(analysis.contentPrompt!)}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="rounded-lg border bg-card px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              {analysis.contentPrompt}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function AnalysisRow({ analysis }: { analysis: AIAnalysis }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card transition-shadow', expanded && 'shadow-sm')}>
      <button
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <BrainCircuit className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{analysis.mainTopic}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(analysis.createdAt)} · {relativeDate(analysis.createdAt)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn('text-[10px]', URGENCY_COLOR[analysis.urgencyLevel])}>
            {analysis.urgencyLevel}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{analysis.contentFormat}</Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && <AnalysisDetail analysis={analysis} />}
    </div>
  )
}

function AnalysesTab() {
  const { activeCampaignId } = useCampaign()
  const { data, isLoading } = useQuery({
    queryKey: ['analyses-history', activeCampaignId],
    queryFn: () => activeCampaignId ? api.listAnalyses(activeCampaignId) : Promise.resolve({ ok: true as const, analyses: [] }),
    enabled: Boolean(activeCampaignId),
  })

  const analyses = data?.analyses ?? []

  return (
    <div className="space-y-4">
      {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>}

      {!isLoading && analyses.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <BrainCircuit className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No analyses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Run a collection and submit an AI analysis to see history here.</p>
          </div>
          <Button asChild size="sm"><Link to="/analysis"><BrainCircuit className="h-4 w-4" /> Go to Analysis</Link></Button>
        </div>
      )}

      {!isLoading && analyses.length > 0 && (
        <div className="space-y-2">{analyses.map((a) => <AnalysisRow key={a.id} analysis={a} />)}</div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'runs' | 'analyses'

export function HistoryPage() {
  const [tab, setTab] = useState<Tab>('runs')

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Past collection runs and AI analyses</p>
        </div>
        <Button asChild size="sm">
          <Link to="/"><Zap className="h-4 w-4" /> New run</Link>
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {([
          { key: 'runs',     label: 'Collection runs', icon: History     },
          { key: 'analyses', label: 'AI Analyses',     icon: BrainCircuit },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'runs'     && <RunsTab />}
      {tab === 'analyses' && <AnalysesTab />}
    </>
  )
}
