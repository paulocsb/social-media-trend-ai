import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowRight, Trash2, AlertTriangle, Check } from 'lucide-react';
import { IconButton } from '../components/ui/icon-button';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { relativeTime, cn } from '../lib/utils';
import type { Tables } from '@trend/shared';

type Run = Tables<'collection_runs'>;

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'default' | 'warning'> = {
  completed: 'success',
  failed:    'destructive',
  running:   'default',
  partial:   'warning',
};

function duration(run: Run) {
  if (!run.finished_at) return run.status === 'running' ? 'running…' : '—';
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function normalizeHashtag(h: string) {
  return h.replace(/^#+/, '');
}

function Checkbox({ checked, onChange, onClick }: {
  checked: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { onClick?.(e); onChange(); }}
      className={cn(
        'w-4 h-4 rounded flex items-center justify-center transition-all border shrink-0',
        checked
          ? 'bg-accent border-accent shadow-glow-sm'
          : 'bg-white/5 border-border hover:border-accent/50',
      )}
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </button>
  );
}

export function HistoryPage() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();

  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['runs', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('collection_runs')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('started_at', { ascending: false })
        .limit(50);
      return (data ?? []) as Run[];
    },
    enabled: Boolean(activeCampaignId),
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses-list', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_analyses')
        .select('id, main_topic, urgency_level, created_at')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const deleteRuns = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('collection_runs')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['runs', activeCampaignId] });
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === runs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(runs.map((r) => r.id)));
    }
  }

  const allSelected = runs.length > 0 && selected.size === runs.length;
  const anySelected = selected.size > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-title-xl">History</h1>

      {/* Collection runs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title">Collection Runs</h2>
          {anySelected && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setConfirmDelete([...selected])}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size === 1 ? '1 run' : `${selected.size} runs`}
            </Button>
          )}
        </div>

        <Card>
          {runsLoading ? (
            <CardContent><p className="text-caption text-center py-6">Loading…</p></CardContent>
          ) : runs.length === 0 ? (
            <CardContent><p className="text-caption text-center py-6">No runs yet. Click Collect Now on the Home page to start.</p></CardContent>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="pl-5 pr-2 py-3 w-8">
                    <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  {['Started', 'Target', 'Duration', 'Posts', 'Status'].map((h) => (
                    <th key={h} className="text-left text-label px-3 py-3">{h}</th>
                  ))}
                  <th className="w-16 py-3" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => {
                  const isExpanded = expandedRun === run.id;
                  const isLast = i === runs.length - 1;
                  const topHashtags = (run as Run & { top_hashtags?: { hashtag: string; score: number }[] }).top_hashtags ?? [];

                  return (
                    <>
                      <tr
                        key={run.id}
                        className={cn(
                          'transition-colors hover:bg-white/3',
                          !isLast && !isExpanded && 'border-b border-border-subtle',
                        )}
                      >
                        {/* Checkbox */}
                        <td className="pl-5 pr-2 py-3 w-8">
                          <Checkbox
                            checked={selected.has(run.id)}
                            onChange={() => toggleSelect(run.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-3 py-3 text-[13px]">{relativeTime(run.started_at)}</td>
                        <td className="px-3 py-3 text-[13px] text-secondary capitalize">{run.target ?? '—'}</td>
                        <td className="px-3 py-3 text-[13px] text-secondary">{duration(run)}</td>
                        <td className="px-3 py-3 text-[13px]">{run.posts_found ?? '—'}</td>
                        <td className="px-3 py-3">
                          <Badge variant={STATUS_VARIANT[run.status] ?? 'secondary'}>{run.status}</Badge>
                        </td>
                        {/* Actions */}
                        <td className="pr-4 py-3">
                          <button
                            onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                            className="p-2 rounded-full border bg-white/[0.06] border-white/[0.1] text-secondary hover:bg-white/[0.12] hover:border-white/[0.16] hover:text-primary active:scale-95 transition-all duration-150"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr className={cn(!isLast && 'border-b border-border-subtle')}>
                          <td colSpan={7} className="px-5 pb-4">
                            {run.status === 'failed' && run.error_message ? (
                              <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-destructive/70 mb-1.5">Error detail</p>
                                <p className="text-[12px] font-mono text-destructive/90 whitespace-pre-wrap break-all">{run.error_message}</p>
                              </div>
                            ) : topHashtags.length > 0 ? (
                              <div className="rounded-xl bg-white/3 border border-border-subtle px-4 py-3">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-tertiary mb-2.5">Top hashtags this run</p>
                                <div className="flex flex-wrap gap-2">
                                  {topHashtags.map(({ hashtag, score }) => (
                                    <div key={hashtag} className="flex items-center gap-1.5 bg-white/5 border border-border-subtle rounded-full px-3 py-1">
                                      <span className="text-[12px] text-primary">#{normalizeHashtag(hashtag)}</span>
                                      <span className="text-[11px] text-accent font-medium">{score}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-caption text-center py-2">No additional detail available.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* AI Analyses timeline */}
      {analyses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title">AI Analyses</h2>
            <Link
              to="/analysis"
              className="flex items-center gap-1 text-[13px] text-accent hover:text-accent-hover transition-colors"
            >
              See full details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <div className="divide-y divide-border-subtle">
              {analyses.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{a.main_topic}</p>
                    <p className="text-caption mt-0.5">{relativeTime(a.created_at)}</p>
                  </div>
                  <Badge
                    variant={
                      a.urgency_level === 'high' ? 'destructive'
                      : a.urgency_level === 'medium' ? 'warning'
                      : 'secondary'
                    }
                  >
                    {a.urgency_level}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-raised rounded-2xl p-6 w-full max-w-sm shadow-modal animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-primary">Delete {confirmDelete.length === 1 ? 'run' : `${confirmDelete.length} runs`}?</p>
                <p className="text-[13px] text-secondary mt-0.5">
                  Posts collected in {confirmDelete.length === 1 ? 'this run' : 'these runs'} are kept.
                </p>
              </div>
            </div>
            {deleteRuns.isError && (
              <p className="text-[12px] text-destructive mb-3">{(deleteRuns.error as Error).message}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setConfirmDelete(null); deleteRuns.reset(); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteRuns.mutate(confirmDelete)}
                disabled={deleteRuns.isPending}
              >
                {deleteRuns.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
