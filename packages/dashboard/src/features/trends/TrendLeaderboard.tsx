import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { TrendingUp, Flame, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'
import { useSocket } from '@/hooks/useSocket'

type Entry = { hashtag: string; score: number; live?: boolean }

export function TrendLeaderboard() {
  const [liveEntries, setLiveEntries] = useState<Entry[]>([])
  const { activeCampaignId } = useCampaign()

  const { data, isLoading, error } = useQuery({
    queryKey: ['hashtags', '24h', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getHashtagLeaderboard(activeCampaignId, '24h', 20) : Promise.resolve({ ok: true as const, hashtags: [] }),
    enabled: Boolean(activeCampaignId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const onSpike = useCallback((event: unknown) => {
    const e = event as { hashtag: string; trendScore: number }
    setLiveEntries((prev) => [
      { hashtag: e.hashtag, score: e.trendScore, live: true },
      ...prev.filter((x) => x.hashtag !== e.hashtag),
    ])
  }, [])

  useSocket('trend:spike', onSpike)

  const entries: Entry[] = [
    ...liveEntries,
    ...(data?.hashtags ?? []).filter((h) => !liveEntries.find((l) => l.hashtag === h.hashtag)),
  ]

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Trend Leaderboard</CardTitle>
            <CardDescription>Top hashtags · last 24h</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">Failed to load leaderboard.</p>}
        {!isLoading && !error && (
          <ScrollArea className="h-[340px]">
            <ol className="space-y-1 pr-3">
              {entries.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet. Add hashtags to start tracking.</p>
              )}
              {entries.map((entry, i) => (
                <li key={entry.hashtag}>
                  <div className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50',
                    i === 0 && 'bg-yellow-50 dark:bg-yellow-500/10',
                    i === 1 && 'bg-zinc-50   dark:bg-zinc-500/10',
                    i === 2 && 'bg-amber-50  dark:bg-amber-600/10',
                    entry.live && 'bg-primary/5 ring-1 ring-primary/20'
                  )}>
                    <span className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-yellow-400 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-950' :
                      i === 1 ? 'bg-zinc-300   text-zinc-700   dark:bg-zinc-500   dark:text-zinc-100'   :
                      i === 2 ? 'bg-amber-600  text-white       dark:bg-amber-700  dark:text-amber-100'  :
                      'bg-muted text-muted-foreground'
                    )}>{i + 1}</span>
                    <Hash className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{entry.hashtag}</span>
                    {entry.live && (
                      <Badge variant="destructive" className="animate-pulse text-[10px]">
                        <Flame className="mr-1 h-3 w-3" />LIVE
                      </Badge>
                    )}
                    <span className="text-xs tabular-nums text-muted-foreground">{entry.score.toFixed(1)}</span>
                  </div>
                  {i < entries.length - 1 && <Separator className="ml-12 opacity-50" />}
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
