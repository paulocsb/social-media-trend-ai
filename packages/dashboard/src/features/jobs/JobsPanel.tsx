import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, X, Play, Zap } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type JobCounts  = { waiting: number; active: number; completed: number; failed: number; delayed: number }
type RecentJob  = { id: string | number; status: string; data: unknown; timestamp: number; failedReason?: string }
type QueueStat  = { name: string; counts: JobCounts; recent: RecentJob[] }
type JobsData   = { ok: boolean; queues: QueueStat[] }
type ClearStatus = 'completed' | 'failed' | 'waiting' | 'delayed' | 'all'

const QUEUE_LABEL: Record<string, string> = {
  'collect:hashtag': 'Hashtags',
  'collect:profile': 'Profiles',
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType }> = {
  active:    { icon: Loader2 },
  completed: { icon: CheckCircle2 },
  failed:    { icon: AlertCircle },
  waiting:   { icon: Clock },
}

function StatPill({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg px-3 py-2 min-w-[56px]', className)}>
      <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="mt-1 text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function JobCampaignBadge({ data }: { data: unknown }) {
  const campaignId = (data as Record<string, unknown>)?.campaignId as string | undefined
  if (!campaignId) return null
  // Show last 8 chars of UUID as a compact identifier
  return (
    <Badge variant="secondary" className="shrink-0 font-mono text-[10px] px-1.5 py-0">
      {campaignId.slice(-8)}
    </Badge>
  )
}

export function JobsPanel() {
  const qc = useQueryClient()
  const [confirmClear, setConfirmClear] = useState<{ queue: string; status: ClearStatus } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const trigger = useMutation({
    mutationFn: () => api.triggerCollection(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const triggerProfiles = useMutation({
    mutationFn: () => api.triggerProfileCollection(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.getJobs(),
    refetchInterval: 10_000,
  })

  const runJob = useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) => api.runJob(queue, jobId),
    onMutate: async ({ queue, jobId }) => {
      await qc.cancelQueries({ queryKey: ['jobs'] })
      const prev = qc.getQueryData<JobsData>(['jobs'])
      qc.setQueryData<JobsData>(['jobs'], (old) => {
        if (!old) return old
        return {
          ...old,
          queues: old.queues.map((q) =>
            q.name === queue
              ? { ...q, recent: q.recent.map((j) => String(j.id) === jobId ? { ...j, status: 'active' } : j) }
              : q
          ),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(['jobs'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const deleteJob = useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) => api.deleteJob(queue, jobId),
    onMutate: async ({ queue, jobId }) => {
      setDeleteError(null)
      await qc.cancelQueries({ queryKey: ['jobs'] })
      const prev = qc.getQueryData<JobsData>(['jobs'])
      qc.setQueryData<JobsData>(['jobs'], (old) => {
        if (!old) return old
        return {
          ...old,
          queues: old.queues.map((q) =>
            q.name === queue
              ? { ...q, recent: q.recent.filter((j) => String(j.id) !== jobId) }
              : q
          ),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['jobs'], ctx.prev)
      setDeleteError('Failed to delete job. Please try again.')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const clearQueue = useMutation({
    mutationFn: ({ queue, status }: { queue: string; status: ClearStatus }) => api.clearQueue(queue, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); setConfirmClear(null) },
  })

  const queues = (data?.queues ?? []) as QueueStat[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">Job Queues</CardTitle>
              <CardDescription>All campaigns · refreshes every 10s</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={trigger.isPending}
              onClick={() => trigger.mutate()}
              title="Collect hashtags for all active campaigns"
            >
              {trigger.isPending
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : <Zap className="mr-1 h-3 w-3" />
              }
              Collect all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={triggerProfiles.isPending}
              onClick={() => triggerProfiles.mutate()}
              title="Collect profiles for all active campaigns"
            >
              {triggerProfiles.isPending
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : <Zap className="mr-1 h-3 w-3" />
              }
              Profiles all
            </Button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
        {error && <p className="text-sm text-destructive">Failed to load job queues.</p>}

        {deleteError && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {deleteError}
            <button className="ml-auto hover:opacity-70" onClick={() => setDeleteError(null)}>
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {queues.map((q, qi) => (
              <div key={q.name}>
                {qi > 0 && <Separator className="mb-4" />}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold">{QUEUE_LABEL[q.name] ?? q.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{q.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {(['completed', 'failed', 'all'] as ClearStatus[]).map((s) => {
                      const isConfirming = confirmClear?.queue === q.name && confirmClear?.status === s
                      const isThisClearing = clearQueue.isPending
                        && clearQueue.variables?.queue === q.name
                        && clearQueue.variables?.status === s
                      return (
                        <Button key={s} variant={isConfirming ? 'destructive' : 'ghost'} size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={clearQueue.isPending}
                          onClick={() => {
                            if (isConfirming) {
                              clearQueue.mutate({ queue: q.name, status: s })
                            } else {
                              setConfirmClear({ queue: q.name, status: s })
                              setTimeout(() => setConfirmClear(null), 4000)
                            }
                          }}
                        >
                          {isThisClearing
                            ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            : <Trash2 className="mr-1 h-3 w-3" />
                          }
                          {isConfirming ? 'Confirm?' : `Clear ${s}`}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mb-3 flex gap-1">
                  <StatPill label="waiting"   value={q.counts.waiting}   className="bg-amber-50   dark:bg-amber-900/30   text-amber-700   dark:text-amber-400" />
                  <StatPill label="active"    value={q.counts.active}    className="bg-blue-50    dark:bg-blue-900/30    text-blue-700    dark:text-blue-400" />
                  <StatPill label="done"      value={q.counts.completed} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" />
                  <StatPill label="failed"    value={q.counts.failed}    className="bg-red-50     dark:bg-red-900/30     text-red-700     dark:text-red-400" />
                  <StatPill label="delayed"   value={q.counts.delayed}   className="bg-slate-50   dark:bg-slate-800/50   text-slate-600   dark:text-slate-400" />
                </div>

                {/* Recent jobs */}
                {q.recent.length > 0 && (
                  <ScrollArea className="h-[140px]">
                    <ul className="space-y-1 pr-2">
                      {q.recent.map((job) => {
                        const Icon = STATUS_CONFIG[job.status]?.icon ?? Clock
                        return (
                          <li key={job.id}
                            className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs transition-opacity"
                          >
                            <Icon className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0',
                              job.status === 'active'    && 'animate-spin text-blue-500',
                              job.status === 'completed' && 'text-emerald-500',
                              job.status === 'failed'    && 'text-destructive',
                              job.status === 'waiting'   && 'text-amber-500',
                            )} />
                            <JobCampaignBadge data={job.data} />
                            <span className="flex-1 truncate font-mono text-muted-foreground">
                              {JSON.stringify(job.data)}
                            </span>
                            {job.failedReason && (
                              <span className="max-w-[160px] truncate text-destructive" title={job.failedReason}>
                                {job.failedReason}
                              </span>
                            )}
                            <span className="flex-shrink-0 text-muted-foreground/60">
                              {job.timestamp ? new Date(job.timestamp).toLocaleTimeString() : '—'}
                            </span>
                            {job.status === 'waiting' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 flex-shrink-0 text-muted-foreground/40 hover:text-emerald-600"
                                title="Run now"
                                onClick={() => runJob.mutate({ queue: q.name, jobId: String(job.id) })}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 flex-shrink-0 text-muted-foreground/40 hover:text-destructive"
                              onClick={() => deleteJob.mutate({ queue: q.name, jobId: String(job.id) })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                )}
                {q.recent.length === 0 && (
                  <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
                    No recent jobs
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
