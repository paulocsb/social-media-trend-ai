import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Hash, TrendingUp, Clock, AlertCircle, Bell, X, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { relativeTime, formatNumber, cn } from '../lib/utils';
import type { Tables } from '@trend/shared';

type CollectionRun = Tables<'collection_runs'>;
type ScoredPost = Tables<'scored_posts'>;

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-tertiary';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium text-secondary w-7 text-right">{pct.toFixed(0)}</span>
    </div>
  );
}

type TriggeredAlert = { hashtag: string; score: number; threshold: number };

export function HomePage() {
  const { activeCampaignId, activeCampaign } = useCampaign();
  const qc = useQueryClient();
  const [target, setTarget] = useState<'both' | 'hashtags' | 'profiles'>('both');
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);

  const { data: lastRun } = useQuery({
    queryKey: ['last-run', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('collection_runs')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      return data as CollectionRun | null;
    },
    enabled: Boolean(activeCampaignId),
    refetchInterval: (q) => q.state.data?.status === 'running' ? 2000 : false,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['top-posts', activeCampaignId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('scored_posts')
        .select('id, author_handle, caption, likes, comments, views, trend_score, thumbnail_url, permalink, collected_at')
        .eq('campaign_id', activeCampaignId!)
        .gte('collected_at', since)
        .order('trend_score', { ascending: false })
        .limit(10);
      return (data ?? []) as ScoredPost[];
    },
    enabled: Boolean(activeCampaignId),
  });

  const { data: hashtags = [] } = useQuery({
    queryKey: ['top-hashtags', activeCampaignId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('hashtag_snapshots')
        .select('hashtag, trend_score')
        .eq('campaign_id', activeCampaignId!)
        .gte('snapshotted_at', since)
        .order('trend_score', { ascending: false })
        .limit(20);
      const map = new Map<string, number>();
      for (const s of data ?? []) {
        if ((map.get(s.hashtag) ?? 0) < s.trend_score) map.set(s.hashtag, s.trend_score);
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([hashtag, score], i) => ({ hashtag, score, rank: i + 1 }));
    },
    enabled: Boolean(activeCampaignId),
  });

  const collect = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ campaignId: activeCampaignId, target }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['last-run', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['top-posts', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['top-hashtags', activeCampaignId] });
      if (data?.triggeredAlerts?.length) {
        setTriggeredAlerts(data.triggeredAlerts);
      }
    },
  });

  const isRunning = lastRun?.status === 'running' || collect.isPending;

  if (!activeCampaignId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-10 h-10 text-tertiary mb-4" />
        <p className="text-title text-primary">No campaign selected</p>
        <p className="text-caption mt-1">Create a campaign in Setup to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header — campaign title + collect controls */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-title-xl truncate">{activeCampaign?.name ?? '—'}</h1>
          {/* Unified collect control */}
          <div className="flex items-center glass rounded-full p-0.5 gap-0.5 shrink-0">
            {([
              { value: 'both',     label: 'All' },
              { value: 'hashtags', label: 'Hashtags' },
              { value: 'profiles', label: 'Profiles' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTarget(value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150',
                  target === value
                    ? 'bg-white/[0.12] text-primary shadow-subtle'
                    : 'text-secondary hover:text-primary',
                )}
              >
                {label}
              </button>
            ))}

            <div className="w-px h-4 bg-white/[0.12] self-center mx-0.5 shrink-0" />

            <button
              onClick={() => collect.mutate()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-accent text-[#0D0D0D] transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none"
            >
              {isRunning ? (
                <><div className="w-3.5 h-3.5 rounded-full border-2 border-[#0D0D0D] border-t-transparent animate-spin" />Collecting…</>
              ) : (
                <><Play className="w-3.5 h-3.5" />Collect Now</>
              )}
            </button>
          </div>
        </div>

        {activeCampaign?.description && (
          <p className="text-caption mt-1 truncate">{activeCampaign.description}</p>
        )}
        <p className="text-[12px] text-tertiary mt-1">
          Fetches trending posts and hashtags from Instagram, scores them by engagement, and surfaces the top content for this campaign.
        </p>

        {/* Status bar — only shown when there's something to say */}
        {(lastRun || collect.error) && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            {collect.error ? (
              <div className="flex items-center gap-2 text-destructive text-[13px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {(collect.error as Error).message}
              </div>
            ) : lastRun && (
              <div className={cn(
                'flex items-center gap-2.5 text-[13px]',
                lastRun.status === 'completed' && 'text-success',
                lastRun.status === 'running'   && 'text-accent',
                lastRun.status === 'failed'    && 'text-destructive',
                lastRun.status === 'partial'   && 'text-warning',
              )}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">
                  {lastRun.status === 'running'
                    ? 'Collection in progress…'
                    : `Last run ${relativeTime(lastRun.started_at)} — ${lastRun.posts_found ?? 0} posts found`}
                </span>
                <Badge
                  variant={lastRun.status === 'completed' ? 'success' : lastRun.status === 'failed' ? 'destructive' : lastRun.status === 'running' ? 'default' : 'warning'}
                >
                  {lastRun.status}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {triggeredAlerts.length > 0 && (
        <div className="rounded-xl bg-warning/10 border border-warning/25 px-4 py-3.5 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-warning mb-1.5">
                  {triggeredAlerts.length === 1 ? '1 alert triggered' : `${triggeredAlerts.length} alerts triggered`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {triggeredAlerts.map((a) => (
                    <div key={a.hashtag} className="flex items-center gap-1.5 bg-warning/10 border border-warning/20 rounded-full px-3 py-0.5">
                      <span className="text-[12px] font-medium text-warning">#{a.hashtag}</span>
                      <span className="text-[11px] text-warning/70">score {a.score} ≥ {a.threshold}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setTriggeredAlerts([])}
              className="p-1 rounded-md text-warning/60 hover:text-warning hover:bg-warning/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-[200px_1fr] gap-5">
        {/* Trending hashtags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-accent" /> Trending
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {hashtags.length === 0 ? (
              <p className="text-caption text-center py-4">No data yet</p>
            ) : hashtags.map((h) => (
              <div key={h.hashtag}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-primary">#{h.hashtag}</span>
                  <span className="text-2xs text-tertiary">#{h.rank}</span>
                </div>
                <ScoreBar score={h.score} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Top Posts (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {posts.length === 0 ? (
              <p className="text-caption text-center py-8">No posts yet — click Collect Now to start.</p>
            ) : (
              <div>
                {posts.map((post, i) => (
                  <div key={post.id} className={cn(
                    'flex items-start gap-3 py-3',
                    i < posts.length - 1 && 'border-b border-border-subtle',
                  )}>
                    <span className="text-[12px] font-medium text-tertiary w-4 shrink-0 pt-0.5">{i + 1}</span>

                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="" className="w-9 h-9 rounded object-cover shrink-0 bg-white/10" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-white/10 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-medium truncate">
                          {post.author_handle ? `@${post.author_handle}` : 'Unknown'}
                        </span>
                        <span className="text-caption shrink-0">{relativeTime(post.collected_at)}</span>
                      </div>
                      {post.caption && (
                        <p className="text-[12px] text-secondary line-clamp-1">{post.caption}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-[11px] text-tertiary">
                        <span>♥ {formatNumber(post.likes)}</span>
                        <span>💬 {formatNumber(post.comments)}</span>
                        {post.views > 0 && <span>👁 {formatNumber(post.views)}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn(
                        'text-[13px] font-semibold',
                        post.trend_score >= 70 ? 'text-success' :
                        post.trend_score >= 40 ? 'text-warning' : 'text-tertiary',
                      )}>
                        {post.trend_score.toFixed(0)}
                      </span>
                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 p-1.5 rounded-full border bg-accent/[0.08] border-accent/[0.25] text-accent hover:bg-accent/[0.18] hover:border-accent/[0.45] active:scale-95 transition-all duration-150 flex items-center justify-center"
                        >
                          <Eye className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
