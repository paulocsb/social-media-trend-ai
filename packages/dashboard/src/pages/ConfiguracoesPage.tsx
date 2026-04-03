import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Bell } from 'lucide-react';
import { IconButton } from '../components/ui/icon-button';
import { supabase } from '../lib/supabase';
import { useCampaign } from '../lib/campaign';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { relativeTime, cn } from '../lib/utils';

export function ConfiguracoesPage() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();

  const [hashtag, setHashtag] = useState('');
  const [threshold, setThreshold] = useState('70');

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const { data: { user } = { user: null } } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    },
  });

  const addAlert = useMutation({
    mutationFn: async () => {
      if (!user || !activeCampaignId) return;
      await supabase.from('alerts').insert({
        campaign_id: activeCampaignId,
        user_id: user.id,
        hashtag: hashtag.replace(/^#/, '').toLowerCase(),
        threshold: Number(threshold),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setHashtag('');
      setThreshold('70');
    },
  });

  const deleteAlert = useMutation({
    mutationFn: (id: string) => supabase.from('alerts').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const toggleAlert = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      supabase.from('alerts').update({ active }).eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-title-xl">Settings</h1>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-title flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" /> Trend Alerts
        </h2>
        <p className="text-[13px] text-secondary">
          Get notified when a hashtag's trend score exceeds the threshold after a collection run.
        </p>

        {/* Add alert */}
        <Card>
          <CardHeader><CardTitle>New Alert</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[12px] font-medium text-secondary">Hashtag</label>
              <Input
                placeholder="#marketing"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1">
              <label className="text-[12px] font-medium text-secondary">Threshold (0–100)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <Button onClick={() => addAlert.mutate()} disabled={!hashtag.trim() || addAlert.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Alert list */}
        {alerts.length > 0 && (
          <Card>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['Hashtag', 'Threshold', 'Active', 'Created', ''].map((h, i, arr) => (
                    <th key={h} className={cn('text-label px-5 py-3', i === arr.length - 1 ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, i) => (
                  <tr key={alert.id} className={i < alerts.length - 1 ? 'border-b border-border-subtle' : ''}>
                    <td className="px-5 py-3 text-[13px] font-medium">#{alert.hashtag}</td>
                    <td className="px-5 py-3 text-[13px] text-secondary">{alert.threshold}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleAlert.mutate({ id: alert.id, active: !alert.active })}
                        className={`w-8 h-4 rounded-full transition-colors ${alert.active ? 'bg-accent' : 'bg-surface-strong'}`}
                      >
                        <span className={`block w-3 h-3 rounded-full bg-white shadow mx-0.5 transition-transform ${alert.active ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-caption">{relativeTime(alert.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <IconButton
                        icon={Trash2}
                        variant="destructive"
                        onClick={() => deleteAlert.mutate(alert.id)}
                        className="ml-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        {alerts.length === 0 && (
          <p className="text-caption">No alerts configured.</p>
        )}
      </section>
    </div>
  );
}
