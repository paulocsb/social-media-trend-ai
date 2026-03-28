import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Hash, User, Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCampaign, type Campaign } from '../lib/campaign';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import type { Tables } from '@trend/shared';

type Tab = 'campaigns' | 'hashtags' | 'profiles';

const TABS: { id: Tab; label: string; icon: typeof Hash }[] = [
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'hashtags',  label: 'Hashtags',  icon: Hash },
  { id: 'profiles',  label: 'Profiles',  icon: User },
];

const COLORS = ['#6366f1','#0071E3','#34C759','#FF9F0A','#FF3B30','#AF52DE','#FF2D55','#5AC8FA'];

// ----- Campaign tab -----
function CampaignsTab() {
  const { campaigns, activeCampaignId, setActiveCampaignId } = useCampaign();
  const qc = useQueryClient();
  const { data: { user } } = useQuery({ queryKey: ['user'], queryFn: () => supabase.auth.getUser() }).data ?? { data: { user: null } };

  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [editId, setEditId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (editId) {
        await supabase.from('campaigns').update({ name: form.name, description: form.description || null, color: form.color }).eq('id', editId);
      } else {
        await supabase.from('campaigns').insert({ user_id: user.id, name: form.name, description: form.description || null, color: form.color });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setForm({ name: '', description: '', color: COLORS[0] });
      setEditId(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => supabase.from('campaigns').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  function startEdit(c: Campaign) {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description ?? '', color: c.color });
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <Card>
        <CardHeader><CardTitle>{editId ? 'Edit Campaign' : 'New Campaign'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={cn('w-6 h-6 rounded-full transition-transform', form.color === c && 'ring-2 ring-offset-2 ring-accent scale-110')}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
              {editId ? 'Update' : 'Create'}
            </Button>
            {editId && <Button variant="secondary" onClick={() => { setEditId(null); setForm({ name: '', description: '', color: COLORS[0] }); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg bg-surface shadow-card')}>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">{c.name}</p>
              {c.description && <p className="text-caption">{c.description}</p>}
            </div>
            {activeCampaignId === c.id ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setActiveCampaignId(c.id)}>Select</Button>
            )}
            <button onClick={() => startEdit(c)} className="text-secondary hover:text-primary transition-colors">
              <span className="text-[13px]">Edit</span>
            </button>
            <button onClick={() => del.mutate(c.id)} className="text-secondary hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Hashtags tab -----
function HashtagsTab() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const { data: rows = [] } = useQuery({
    queryKey: ['hashtags', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase.from('tracked_hashtags').select('*').eq('campaign_id', activeCampaignId!).order('created_at');
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const add = useMutation({
    mutationFn: async (tag: string) => {
      const clean = tag.replace(/^#/, '').toLowerCase().trim();
      if (!clean) return;
      await supabase.from('tracked_hashtags').insert({ campaign_id: activeCampaignId!, hashtag: clean });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hashtags'] }); setInput(''); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => supabase.from('tracked_hashtags').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags'] }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      supabase.from('tracked_hashtags').update({ active }).eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags'] }),
  });

  function handleAdd() {
    const tags = input.split(/[\s,]+/).filter(Boolean);
    tags.forEach((t) => add.mutate(t));
  }

  return (
    <Card>
      <CardHeader><CardTitle>Tracked Hashtags</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="#marketing, #socialmedia"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="md" className="shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium transition-all',
                row.active ? 'bg-accent/10 text-accent' : 'bg-[#E8E8ED] text-tertiary',
              )}
            >
              <button onClick={() => toggle.mutate({ id: row.id, active: !row.active })} className="hover:opacity-70">
                #{row.hashtag}
              </button>
              <button onClick={() => remove.mutate(row.id)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-caption">No hashtags tracked yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Profiles tab -----
function ProfilesTab() {
  const { activeCampaignId } = useCampaign();
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const { data: rows = [] } = useQuery({
    queryKey: ['profiles', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase.from('tracked_profiles').select('*').eq('campaign_id', activeCampaignId!).order('created_at');
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const add = useMutation({
    mutationFn: async (handle: string) => {
      const clean = handle.replace(/^@/, '').toLowerCase().trim();
      if (!clean) return;
      await supabase.from('tracked_profiles').insert({ campaign_id: activeCampaignId!, handle: clean });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); setInput(''); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => supabase.from('tracked_profiles').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });

  function handleAdd() {
    const handles = input.split(/[\s,]+/).filter(Boolean);
    handles.forEach((h) => add.mutate(h));
  }

  return (
    <Card>
      <CardHeader><CardTitle>Tracked Profiles</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="@nike, @adidas"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="md" className="shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium bg-accent/10 text-accent">
              @{row.handle}
              <button onClick={() => remove.mutate(row.id)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-caption">No profiles tracked yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Page -----
export function SetupPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'campaigns';

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-title-xl">Setup</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#E8E8ED] p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setParams({ tab: id })}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[14px] font-medium transition-all',
              tab === id ? 'bg-surface text-primary shadow-subtle' : 'text-secondary hover:text-primary',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'hashtags'  && <HashtagsTab />}
      {tab === 'profiles'  && <ProfilesTab />}
    </div>
  );
}
