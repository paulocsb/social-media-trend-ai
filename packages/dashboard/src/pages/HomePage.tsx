import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Hash, TrendingUp, Clock, AlertCircle, Bell, X, Eye, Check, Heart, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Badge } from '../components/ui/badge';
import { relativeTime, formatNumber, cn } from '../lib/utils';
import type { Tables } from '@trend/shared';

type CollectionRun = Tables<'collection_runs'>;
type ScoredPost    = Tables<'scored_posts'>;

const POOL_SIZE    = 18; // fetch this many posts; display up to 9 non-excluded
const DISPLAY_SIZE = 9;

function parseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  try {
    const json = JSON.parse(msg);
    return json.message ?? json.error ?? msg;
  } catch {
    return msg;
  }
}

// ----------------------------------------------------------------
// Collect steps
// ----------------------------------------------------------------
const STEPS = [
  { label: 'Connecting', detail: 'Reaching Instagram sources' },
  { label: 'Fetching',   detail: 'Downloading posts' },
  { label: 'Scoring',    detail: 'AI trend analysis' },
  { label: 'Saving',     detail: 'Updating dashboard' },
];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-subtle">
      {STEPS.map((s, i) => {
        const done   = step > i;
        const active = step === i;
        return (
          <div key={s.label} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
              done   ? 'bg-success shadow-[0_0_8px_rgba(85,205,10,0.4)]'
                     : active ? 'bg-accent animate-pulse-dot'
                              : 'bg-surface-tint',
            )}>
              {done   && <Check className="w-2.5 h-2.5 text-[#0D0D0D]" strokeWidth={3} />}
              {active && <div className="w-1.5 h-1.5 rounded-full bg-[#0D0D0D]" />}
            </div>
            <span className={cn(
              'text-[12px] transition-colors duration-200 truncate',
              done   ? 'text-success'
                     : active ? 'text-accent font-medium'
                              : 'text-tertiary',
            )}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px transition-all duration-500 min-w-[12px]',
                done ? 'bg-success/30' : 'bg-surface-tint',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------
// Skeletons
// ----------------------------------------------------------------
function SkeletonChips() {
  const widths = [72, 88, 60, 96, 80, 64, 76, 52, 84, 68];
  return (
    <div className="flex flex-wrap gap-2">
      {widths.map((w, i) => (
        <div key={i} className="skeleton h-8 rounded-full" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: DISPLAY_SIZE }).map((_, i) => (
        <div key={i} className="skeleton aspect-square rounded-2xl" />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// Score dot
// ----------------------------------------------------------------
function ScoreDot({ score }: { score: number }) {
  return (
    <span className={cn(
      'w-1.5 h-1.5 rounded-full shrink-0',
      score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-tertiary',
    )} />
  );
}

// ----------------------------------------------------------------
// Post card
// ----------------------------------------------------------------
function PostCard({
  post,
  rank,
  onExclude,
}: {
  post: ScoredPost;
  rank: number;
  onExclude: (postId: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasImage = post.thumbnail_url && !imgError;

  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-tint border border-border-subtle transition-all duration-200 hover:scale-[1.02] hover:shadow-panel group">
      {/* Clickable image area → Instagram */}
      <a
        href={post.permalink ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('block w-full h-full', !post.permalink && 'pointer-events-none')}
        tabIndex={post.permalink ? 0 : -1}
      >
        {hasImage ? (
          <img
            src={post.thumbnail_url!}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[13px] font-medium text-secondary truncate px-3 text-center">
              {post.author_handle ? `@${post.author_handle}` : '#'}
            </span>
          </div>
        )}
      </a>

      {/* Score badge — top-right, always visible */}
      <div className={cn(
        'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-semibold pointer-events-none',
        'backdrop-blur-sm border',
        post.trend_score >= 70
          ? 'bg-success/20 border-success/30 text-success'
          : post.trend_score >= 40
          ? 'bg-warning/20 border-warning/30 text-warning'
          : 'bg-black/40 border-white/10 text-white/70',
      )}>
        {post.trend_score.toFixed(0)}
      </div>

      {/* Rank — top-left, always visible */}
      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-white">{rank}</span>
      </div>

      {/* Exclude button — top-left on hover, above rank */}
      <button
        onClick={(e) => { e.stopPropagation(); onExclude(post.id); }}
        className={cn(
          'absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center',
          'bg-black/60 backdrop-blur-sm border border-white/20 text-white/80',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          'hover:bg-destructive/80 hover:text-white hover:border-destructive',
        )}
        title="Exclude from analysis"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Bottom info — always visible */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent pt-10 pb-3 px-3 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-white truncate">
            {post.author_handle ? `@${post.author_handle}` : 'Unknown'}
          </span>
          <span className="text-[11px] text-white/60 shrink-0">
            {relativeTime(post.published_at ?? post.collected_at)}
          </span>
        </div>
        {post.caption && (
          <p className="text-[11px] text-white/80 line-clamp-2 leading-relaxed">{post.caption}</p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-white/70">
            <Heart className="w-3 h-3" />{formatNumber(post.likes)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/70">
            <MessageCircle className="w-3 h-3" />{formatNumber(post.comments)}
          </span>
          {post.views > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-white/70">
              <Eye className="w-3 h-3" />{formatNumber(post.views)}
            </span>
          )}
          {post.permalink && (
            <ExternalLink className="w-3 h-3 text-white/50 ml-auto" />
          )}
        </div>
      </div>
    </div>
  );
}

type TriggeredAlert = { hashtag: string; score: number; threshold: number };

export function HomePage() {
  const { activeCampaignId, activeCampaign } = useCampaign();
  const qc       = useQueryClient();
  const navigate = useNavigate();

  const [target, setTarget]                   = useState<'both' | 'hashtags' | 'profiles'>('both');
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [collectStep, setCollectStep]         = useState(0);
  const [successCount, setSuccessCount]       = useState<number | null>(null);
  const [dataVersion, setDataVersion]         = useState(0);
  const [excluded, setExcluded]               = useState<Set<string>>(new Set());
  const stepTimerRef                          = useRef<ReturnType<typeof setInterval> | null>(null);
  const seededRef                             = useRef(false);   // only seed excluded from DB once per load
  const needsQueueRefill                      = useRef(false);   // set after collect; cleared when pool refetches

  // ── Last run ───────────────────────────────────────────────────
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

  const lastCompletedRun = lastRun?.status === 'completed' || lastRun?.status === 'partial'
    ? lastRun : null;

  // ── Last analysis ──────────────────────────────────────────────
  const { data: lastAnalysis } = useQuery({
    queryKey: ['last-analysis', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_analyses')
        .select('id, created_at')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    },
    enabled: Boolean(activeCampaignId),
  });

  const analysisIsPostRun = lastCompletedRun && lastAnalysis
    ? new Date(lastAnalysis.created_at) > new Date(lastCompletedRun.started_at)
    : false;

  // ── Analysis queue (persisted included set) ───────────────────
  const { data: queueIds = [], isSuccess: queueFetched } = useQuery({
    queryKey: ['analysis-queue', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('analysis_queue')
        .select('post_id')
        .eq('campaign_id', activeCampaignId!);
      return (data ?? []).map((r) => r.post_id);
    },
    enabled: Boolean(activeCampaignId),
  });

  // ── Post pool ──────────────────────────────────────────────────
  const SELECT_POSTS = 'id, author_handle, caption, likes, comments, views, trend_score, thumbnail_url, permalink, collected_at, published_at' as const;

  const { data: pool = [] } = useQuery({
    queryKey: ['top-posts', activeCampaignId, lastCompletedRun?.id, dataVersion],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from('scored_posts')
        .select('collected_at')
        .eq('campaign_id', activeCampaignId!)
        .order('collected_at', { ascending: false })
        .limit(1)
        .single();

      if (!latest) return [] as ScoredPost[];

      const anchor      = new Date(latest.collected_at).getTime();
      const windowStart = new Date(anchor - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('scored_posts')
        .select(SELECT_POSTS)
        .eq('campaign_id', activeCampaignId!)
        .gte('collected_at', windowStart)
        .order('trend_score', { ascending: false })
        .limit(POOL_SIZE);

      return (data ?? []) as ScoredPost[];
    },
    enabled: Boolean(activeCampaignId) && lastRun !== undefined,
  });

  // Display: top DISPLAY_SIZE from pool, minus locally excluded posts.
  // Exclusions reset on new collect (dataVersion bump).
  const posts = pool.filter((p) => !excluded.has(p.id)).slice(0, DISPLAY_SIZE);
  const queuedCount = posts.length;

  // ── Hashtags ───────────────────────────────────────────────────
  const { data: hashtags = [] } = useQuery({
    queryKey: ['top-hashtags', activeCampaignId, lastCompletedRun?.id, dataVersion],
    queryFn: async () => {
      const { data: latestSnap } = await supabase
        .from('hashtag_snapshots')
        .select('snapshotted_at')
        .eq('campaign_id', activeCampaignId!)
        .order('snapshotted_at', { ascending: false })
        .limit(1)
        .single();

      const since = latestSnap
        ? new Date(new Date(latestSnap.snapshotted_at).getTime() - 5 * 60 * 1000).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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
        .slice(0, 12)
        .map(([hashtag, score], i) => ({ hashtag, score, rank: i + 1 }));
    },
    enabled: Boolean(activeCampaignId) && lastRun !== undefined,
  });

  // ── Collect ────────────────────────────────────────────────────
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
      setCollectStep(2);
      setTimeout(() => setCollectStep(3), 400);
      setTimeout(() => {
        setCollectStep(STEPS.length);
        setSuccessCount(data?.postsFound ?? 0);
        setExcluded(new Set());      // reset exclusions for new batch
        seededRef.current = false;   // allow re-seed on next load
        needsQueueRefill.current = true; // repopulate queue when pool refetches
        setDataVersion((v) => v + 1);
        setTimeout(() => setSuccessCount(null), 2500);
      }, 800);

      qc.invalidateQueries({ queryKey: ['last-run', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['top-posts', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['top-hashtags', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['runs', activeCampaignId] });
      qc.invalidateQueries({ queryKey: ['last-analysis', activeCampaignId] });
      if (data?.triggeredAlerts?.length) setTriggeredAlerts(data.triggeredAlerts);
    },
  });

  // ── Exclude post ───────────────────────────────────────────────
  function handleExclude(postId: string) {
    const newExcluded = new Set([...excluded, postId]);
    setExcluded(newExcluded);

    if (!activeCampaignId) return;

    // Build the new queue: top DISPLAY_SIZE pool posts that are not excluded.
    // This replaces the old queue entirely so that the replacement post (the
    // one that slides in to fill the gap) is persisted alongside the exclusion.
    const newQueueIds = pool
      .filter((p) => !newExcluded.has(p.id))
      .slice(0, DISPLAY_SIZE)
      .map((p) => p.id);

    supabase.from('analysis_queue')
      .delete().eq('campaign_id', activeCampaignId)
      .then(() =>
        newQueueIds.length > 0
          ? supabase.from('analysis_queue').insert(
              newQueueIds.map((post_id) => ({ campaign_id: activeCampaignId, post_id })),
            )
          : Promise.resolve(),
      )
      .then(() => qc.invalidateQueries({ queryKey: ['analysis-queue', activeCampaignId] }));
  }

  // ── Seed excluded from DB on initial load ─────────────────────
  // Wait until both pool and queue have loaded before deciding.
  // - Queue has entries → exclude any pool post NOT in the queue (was previously excluded)
  // - Queue is empty → auto-populate it with current top posts (first load ever)
  useEffect(() => {
    if (seededRef.current || pool.length === 0 || !queueFetched || !activeCampaignId) return;
    seededRef.current = true;

    if (queueIds.length === 0) {
      // Queue never populated — initialize with top posts, exclude nothing
      const topIds = pool.slice(0, DISPLAY_SIZE).map((p) => p.id);
      supabase.from('analysis_queue')
        .insert(topIds.map((post_id) => ({ campaign_id: activeCampaignId, post_id })))
        .then(() => qc.invalidateQueries({ queryKey: ['analysis-queue', activeCampaignId] }));
    } else {
      // Seed excluded from persisted queue
      const queueSet = new Set(queueIds);
      const toExclude = pool.filter((p) => !queueSet.has(p.id)).map((p) => p.id);
      if (toExclude.length > 0) setExcluded(new Set(toExclude));
    }
  }, [pool, queueIds, queueFetched, activeCampaignId]);

  // ── Repopulate queue after collect with fresh pool ─────────────
  // needsQueueRefill is set in onSuccess; this effect fires when pool refetches.
  useEffect(() => {
    if (!needsQueueRefill.current || pool.length === 0 || !activeCampaignId) return;
    needsQueueRefill.current = false;
    const topIds = pool.slice(0, DISPLAY_SIZE).map((p) => p.id);
    supabase.from('analysis_queue').delete().eq('campaign_id', activeCampaignId)
      .then(() => supabase.from('analysis_queue').insert(
        topIds.map((post_id) => ({ campaign_id: activeCampaignId, post_id })),
      ))
      .then(() => qc.invalidateQueries({ queryKey: ['analysis-queue', activeCampaignId] }));
  }, [pool, activeCampaignId]);

  // ── Running state ──────────────────────────────────────────────
  const isRunning = lastRun?.status === 'running' || collect.isPending;

  useEffect(() => {
    if (!isRunning) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      return;
    }
    setCollectStep(0);
    const startedAt = Date.now();
    stepTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= 3000) setCollectStep((s) => Math.max(s, 1));
    }, 500);
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, [isRunning]);

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
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-title-xl truncate">{activeCampaign?.name ?? '—'}</h1>

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
                    ? 'bg-surface-active text-primary shadow-subtle'
                    : 'text-secondary hover:text-primary',
                )}
              >
                {label}
              </button>
            ))}

            <div className="w-px h-4 bg-surface-active self-center mx-0.5 shrink-0" />

            <button
              onClick={() => collect.mutate()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-accent text-white transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 disabled:pointer-events-none min-w-[110px] justify-center"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Collecting…
                </>
              ) : successCount !== null ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  {successCount} posts
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Collect Now
                </>
              )}
            </button>
          </div>
        </div>

        {activeCampaign?.description && (
          <p className="text-caption mt-1 truncate">{activeCampaign.description}</p>
        )}

        {collect.error && (
          <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[13px] text-destructive flex-1">
              {parseError(collect.error)}
            </p>
          </div>
        )}
      </div>

      {/* ── Status bar ─────────────────────────────────────────── */}
      {(isRunning || lastRun) && (
        <div className="glass rounded-2xl border border-border-subtle overflow-hidden animate-fade-in">
          {isRunning ? (
            <div className="px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary mb-1">Collecting</p>
              <StepIndicator step={collectStep} />
            </div>
          ) : lastRun && (
            <div className="flex divide-x divide-border-subtle">
              {/* Last run cell */}
              <div className="flex-1 px-5 py-4 flex items-center gap-3 min-w-0">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  lastRun.status === 'completed' ? 'bg-success/15'
                  : lastRun.status === 'failed'  ? 'bg-destructive/15'
                  : lastRun.status === 'partial' ? 'bg-warning/15'
                  : 'bg-accent/15',
                )}>
                  <Clock className={cn(
                    'w-4 h-4',
                    lastRun.status === 'completed' ? 'text-success'
                    : lastRun.status === 'failed'  ? 'text-destructive'
                    : lastRun.status === 'partial' ? 'text-warning'
                    : 'text-accent',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary">Last Run</p>
                  <p className="text-[13px] font-medium text-primary mt-0.5 truncate">
                    {relativeTime(lastRun.started_at)} · {lastRun.posts_found ?? 0} posts
                  </p>
                </div>
                <Badge variant={
                  lastRun.status === 'completed' ? 'success'
                  : lastRun.status === 'failed'  ? 'destructive'
                  : lastRun.status === 'partial' ? 'warning'
                  : 'default'
                }>
                  {lastRun.status}
                </Badge>
              </div>

              {/* Analysis cell */}
              {lastCompletedRun && (
                <div className="flex-1 px-5 py-4 flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    analysisIsPostRun ? 'bg-success/15' : 'bg-accent/15',
                  )}>
                    <Sparkles className={cn('w-4 h-4', analysisIsPostRun ? 'text-success' : 'text-accent')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary">Analysis</p>
                    <p className={cn(
                      'text-[13px] font-medium mt-0.5',
                      analysisIsPostRun ? 'text-success' : 'text-secondary',
                    )}>
                      {analysisIsPostRun ? 'Ready' : 'Not run yet'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/analysis')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 shrink-0',
                      analysisIsPostRun
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-accent/10 text-accent hover:bg-accent/20',
                    )}
                  >
                    {analysisIsPostRun ? 'View' : 'Run'}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Triggered alerts ───────────────────────────────────── */}
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

      {/* ── Trending Hashtags ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-3.5 h-3.5 text-accent" />
          <h2 className="text-[14px] font-semibold text-primary">
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                Trending
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </span>
              </span>
            ) : 'Trending'}
          </h2>
        </div>

        {isRunning ? <SkeletonChips /> : hashtags.length === 0 ? (
          <p className="text-caption py-2">No hashtag data yet — collect to see trends.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((h, i) => (
              <div
                key={`${h.hashtag}-${dataVersion}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium bg-surface-tint border-border-subtle text-primary animate-fade-in"
                style={{ animationDelay: `${i * 35}ms`, animationFillMode: 'both' }}
              >
                <ScoreDot score={h.score} />
                <span>#{h.hashtag}</span>
                <span className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  h.score >= 70 ? 'text-success' : h.score >= 40 ? 'text-warning' : 'text-tertiary',
                )}>
                  {h.score.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Top Posts ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-[14px] font-semibold text-primary">
              {isRunning ? (
                <span className="flex items-center gap-1.5">
                  Top Posts
                  <span className="inline-flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Top Posts
                  {excluded.size > 0 && (
                    <span className="text-[11px] font-normal text-tertiary">
                      {queuedCount} queued · {excluded.size} excluded
                    </span>
                  )}
                </span>
              )}
            </h2>
          </div>

        </div>

        {isRunning ? <SkeletonGrid /> : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-8 h-8 text-tertiary mb-3" />
            <p className="text-[14px] font-medium text-secondary">No posts yet</p>
            <p className="text-caption mt-1">Click Collect Now to fetch trending content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {posts.map((post, i) => (
              <PostCard
                key={`${post.id}-${dataVersion}`}
                post={post}
                rank={i + 1}
                onExclude={handleExclude}
              />
            ))}
          </div>
        )}

        {excluded.size > 0 && pool.length > posts.length && !isRunning && (
          <p className="text-[11px] text-tertiary text-center mt-3">
            {excluded.size} excluded · {pool.length - posts.length - excluded.size > 0 ? `${pool.length - posts.length} more in pool` : 'pool exhausted'}
          </p>
        )}
      </section>
    </div>
  );
}
