import { useQuery } from '@tanstack/react-query'
import { Newspaper, RefreshCw, TrendingUp, Users, Clock, Zap, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

type Strategy = 'URGENT' | 'ENGAGEMENT' | 'DISCARD' | null

type NewsEvent = {
  id: string
  detectedAt: string
  eventType: 'volume_spike' | 'verified_origin' | 'theme_convergence'
  title: string
  summary: string | null
  hashtags: string[]
  authorHandles: string[]
  confidence: number
  strategy: Strategy
  strategyReason: string | null
}

const STRATEGY_CONFIG = {
  URGENT:     { label: 'Urgent',     icon: Zap,      className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800' },
  ENGAGEMENT: { label: 'Engagement', icon: BookOpen,  className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  DISCARD:    { label: 'Discard',    icon: Clock,     className: 'bg-muted text-muted-foreground border-border' },
} as const

const EVENT_CONFIG = {
  volume_spike:       { label: 'Volume Spike',   icon: TrendingUp, color: 'text-amber-500',   bg: 'bg-amber-50   dark:bg-amber-900/20'   },
  verified_origin:    { label: 'Verified Source', icon: Newspaper,  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  theme_convergence:  { label: 'Multi-Source',    icon: Users,      color: 'text-blue-500',    bg: 'bg-blue-50    dark:bg-blue-900/20'    },
} as const

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  )
}

export function EventsPanel() {
  const { activeCampaignId } = useCampaign()
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['events', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getEvents(activeCampaignId) : Promise.resolve({ ok: true as const, events: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 60_000,
  })

  const events = (data?.events ?? []) as NewsEvent[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Newspaper className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-base">Detected Events</CardTitle>
              <CardDescription>News signals from collected posts · last 48h</CardDescription>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
        {error && <p className="text-sm text-destructive">Failed to load events.</p>}

        {!isLoading && !error && events.length === 0 && (
          <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            No events detected yet — events appear after data is collected
          </p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-2">
              {events.map((event) => {
                const cfg = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.volume_spike
                const Icon = cfg.icon
                return (
                  <li
                    key={event.id}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-xs border',
                      event.strategy === 'URGENT'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
                        : cfg.bg + ' border-transparent',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', cfg.color)} />
                        <span>{event.title}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {event.strategy && STRATEGY_CONFIG[event.strategy] && (() => {
                          const s = STRATEGY_CONFIG[event.strategy!]!
                          const SIcon = s.icon
                          return (
                            <span
                              className={cn('flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium', s.className)}
                              title={event.strategyReason ?? undefined}
                            >
                              <SIcon className="h-2.5 w-2.5" />
                              {s.label}
                            </span>
                          )
                        })()}
                        <Badge variant="outline" className="text-[10px] py-0">{cfg.label}</Badge>
                      </div>
                    </div>

                    {event.summary && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{event.summary}</p>
                    )}

                    {event.strategyReason && (
                      <p className="mt-1 italic text-muted-foreground/70 line-clamp-1">{event.strategyReason}</p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {event.hashtags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">
                            #{tag}
                          </span>
                        ))}
                        {event.authorHandles.slice(0, 2).map((handle) => (
                          <span key={handle} className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">
                            @{handle}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                        <ConfidenceBar value={event.confidence} />
                        <div className="flex items-center gap-0.5 text-muted-foreground/60">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="text-[10px]">{new Date(event.detectedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
