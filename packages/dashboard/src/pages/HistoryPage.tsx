import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { relativeTime, cn } from '../lib/utils';
import type { Tables } from '@trend/shared';

type Run = Tables<'collection_runs'>;

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'default' | 'warning'> = {
  completed: 'success',
  failed:    'destructive',
  running:   'default',
  partial:   'warning',
};

export function HistoryPage() {
  const { activeCampaignId } = useCampaign();

  const { data: runs = [], isLoading } = useQuery({
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
        .select('id, main_topic, urgency_level, created_at, suggested_hashtags')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  function duration(run: Run) {
    if (!run.finished_at) return run.status === 'running' ? 'running…' : '—';
    const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-title-xl">History</h1>

      {/* Collection runs */}
      <section>
        <h2 className="text-title mb-3">Collection Runs</h2>
        <Card>
          {isLoading ? (
            <CardContent><p className="text-caption text-center py-6">Loading…</p></CardContent>
          ) : runs.length === 0 ? (
            <CardContent><p className="text-caption text-center py-6">No runs yet.</p></CardContent>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['Started', 'Target', 'Duration', 'Posts', 'Status'].map((h) => (
                    <th key={h} className="text-left text-label px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => (
                  <tr key={run.id} className={cn('hover:bg-background transition-colors', i < runs.length - 1 && 'border-b border-border-subtle')}>
                    <td className="px-5 py-3 text-[13px]">{relativeTime(run.started_at)}</td>
                    <td className="px-5 py-3 text-[13px] text-secondary capitalize">{run.target}</td>
                    <td className="px-5 py-3 text-[13px] text-secondary">{duration(run)}</td>
                    <td className="px-5 py-3 text-[13px]">{run.posts_found ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[run.status] ?? 'secondary'}>{run.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* Analyses */}
      {analyses.length > 0 && (
        <section>
          <h2 className="text-title mb-3">AI Analyses</h2>
          <div className="space-y-2">
            {analyses.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3 bg-surface rounded-lg shadow-card">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{a.main_topic}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(a.suggested_hashtags ?? []).slice(0, 4).map((h: string) => (
                      <Badge key={h} variant="secondary">#{h}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={a.urgency_level === 'high' ? 'destructive' : a.urgency_level === 'medium' ? 'warning' : 'secondary'}>
                    {a.urgency_level}
                  </Badge>
                  <p className="text-caption mt-1">{relativeTime(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
