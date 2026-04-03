import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Hash, User, Megaphone, X, Check, AlertTriangle, Pencil } from 'lucide-react';
import { IconButton } from '../components/ui/icon-button';
import { supabase } from '../lib/supabase';
import { useCampaign, type Campaign } from '../lib/campaign';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

const COLORS = ['#B9DB23','#55CD0A','#E4FD80','#38BDF8','#F59E0B','#E94045','#EC4899','#06B6D4'];

// ----------------------------------------------------------------
// Shared modal shell
// ----------------------------------------------------------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-raised rounded-2xl w-full max-w-sm shadow-modal animate-scale-in">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
          <p className="text-[15px] font-semibold text-primary">{title}</p>
          <button
            onClick={onClose}
            className="p-2 rounded-full border bg-surface-inset border-border-subtle text-tertiary hover:bg-surface-active hover:border-border hover:text-primary active:scale-95 transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Campaign modal (create / edit)
// ----------------------------------------------------------------
function CampaignModal({
  initial,
  onClose,
}: {
  initial?: Campaign;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    color: initial?.color ?? COLORS[0],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (initial) {
        const { error } = await supabase
          .from('campaigns')
          .update({ name: form.name, description: form.description || null, color: form.color })
          .eq('id', initial.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');
        const { error } = await supabase
          .from('campaigns')
          .insert({ user_id: user.id, name: form.name, description: form.description || null, color: form.color });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      onClose();
    },
  });

  return (
    <Modal title={initial ? 'Edit Campaign' : 'New Campaign'} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-label">Name</label>
          <Input
            placeholder="e.g. Summer Launch"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-label">Description <span className="normal-case font-normal text-tertiary">(optional)</span></label>
          <Input
            placeholder="What is this campaign about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-label">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className="relative w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{ background: c }}
              >
                {form.color === c && (
                  <Check className="absolute inset-0 m-auto w-3 h-3 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        {save.isError && (
          <p className="text-[12px] text-destructive">{(save.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
            className="flex-1"
          >
            {save.isPending ? 'Saving…' : initial ? 'Update' : 'Create'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------
// Add items modal (hashtags or profiles)
// ----------------------------------------------------------------
function AddItemModal({
  type,
  campaignId,
  onClose,
}: {
  type: 'hashtag' | 'profile';
  campaignId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const isHashtag = type === 'hashtag';

  const add = useMutation({
    mutationFn: async () => {
      const items = input.split(/[\s,]+/).filter(Boolean);
      if (!items.length) return;

      if (isHashtag) {
        const rows = items.map((t) => ({
          campaign_id: campaignId,
          hashtag: t.replace(/^#+/, '').toLowerCase(),
        }));
        const { error } = await supabase.from('tracked_hashtags').insert(rows);
        if (error) throw error;
      } else {
        const rows = items.map((h) => ({
          campaign_id: campaignId,
          handle: h.replace(/^@/, '').toLowerCase(),
        }));
        const { error } = await supabase.from('tracked_profiles').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [isHashtag ? 'hashtags' : 'profiles', campaignId] });
      onClose();
    },
  });

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') add.mutate();
  }

  return (
    <Modal title={isHashtag ? 'Add Hashtags' : 'Add Profiles'} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] text-secondary">
          {isHashtag
            ? 'Enter one or more hashtags separated by commas or spaces. The # is optional.'
            : 'Enter one or more handles separated by commas or spaces. The @ is optional.'}
        </p>
        <Input
          placeholder={isHashtag ? '#marketing, #socialmedia' : '@nike, @adidas'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
        />
        {add.isError && (
          <p className="text-[12px] text-destructive">{(add.error as Error).message}</p>
        )}
        <div className="flex gap-2">
          <Button
            onClick={() => add.mutate()}
            disabled={!input.trim() || add.isPending}
            className="flex-1"
          >
            {add.isPending ? 'Adding…' : 'Add'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------
// Delete campaign confirmation
// ----------------------------------------------------------------
function DeleteCampaignModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const qc = useQueryClient();
  const { setActiveCampaignId, campaigns, activeCampaignId } = useCampaign();

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('campaigns').delete().eq('id', campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (activeCampaignId === campaign.id) {
        const next = campaigns.find((c) => c.id !== campaign.id);
        setActiveCampaignId(next?.id ?? null);
      }
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      onClose();
    },
  });

  return (
    <Modal title="Delete Campaign?" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-[13px] text-secondary leading-relaxed">
            <span className="font-medium text-primary">"{campaign.name}"</span> and all its tracked hashtags, profiles, posts, and analyses will be permanently deleted.
          </p>
        </div>
        {del.isError && (
          <p className="text-[12px] text-destructive">{(del.error as Error).message}</p>
        )}
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => del.mutate()} disabled={del.isPending} className="flex-1">
            {del.isPending ? 'Deleting…' : 'Delete'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------
type ModalState =
  | { type: 'new-campaign' }
  | { type: 'edit-campaign'; campaign: Campaign }
  | { type: 'delete-campaign'; campaign: Campaign }
  | { type: 'add-hashtag' }
  | { type: 'add-profile' };

export function SetupPage() {
  const { campaigns, activeCampaign, activeCampaignId, setActiveCampaignId, isLoading } = useCampaign();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);

  const { data: hashtags = [] } = useQuery({
    queryKey: ['hashtags', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tracked_hashtags')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at');
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', activeCampaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tracked_profiles')
        .select('*')
        .eq('campaign_id', activeCampaignId!)
        .order('created_at');
      return data ?? [];
    },
    enabled: Boolean(activeCampaignId),
  });

  const removeHashtag = useMutation({
    mutationFn: (id: string) => supabase.from('tracked_hashtags').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags', activeCampaignId] }),
  });

  const toggleHashtag = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      supabase.from('tracked_hashtags').update({ active }).eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags', activeCampaignId] }),
  });

  const removeProfile = useMutation({
    mutationFn: (id: string) => supabase.from('tracked_profiles').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles', activeCampaignId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-title-xl">Setup</h1>
        <Button onClick={() => setModal({ type: 'new-campaign' })} className="gap-2">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-8 h-8 text-tertiary mx-auto mb-3" />
            <p className="text-[14px] text-secondary">No campaigns yet.</p>
            <p className="text-caption mt-1">Create one to start tracking hashtags and profiles.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Active campaign context ───────────────────────────── */}
          {activeCampaign ? (
            <>
              {/* Campaign card */}
              <div className="glass-raised rounded-2xl border border-accent/20 overflow-hidden">
                <div className="h-1 w-full" style={{ background: activeCampaign.color }} />
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-semibold truncate">{activeCampaign.name}</p>
                      <Badge variant="default">Active</Badge>
                    </div>
                    {activeCampaign.description && (
                      <p className="text-[13px] text-secondary mt-0.5 truncate">{activeCampaign.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <IconButton
                      icon={Pencil}
                      onClick={() => setModal({ type: 'edit-campaign', campaign: activeCampaign })}
                      title="Edit campaign"
                    />
                    <IconButton
                      icon={Trash2}
                      variant="destructive"
                      onClick={() => setModal({ type: 'delete-campaign', campaign: activeCampaign })}
                      title="Delete campaign"
                    />
                  </div>
                </div>
              </div>

              {/* Hashtags + Profiles */}
              <div className="grid grid-cols-2 gap-5">
                {/* Hashtags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-accent" /> Hashtags
                    </CardTitle>
                    <button
                      onClick={() => setModal({ type: 'add-hashtag' })}
                      className="flex items-center gap-1 text-[12px] text-accent hover:text-accent-hover transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {hashtags.length === 0 ? (
                      <p className="text-caption py-2">No hashtags tracked yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {hashtags.map((row) => (
                          <div
                            key={row.id}
                            className={cn(
                              'flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium transition-all',
                              row.active ? 'bg-accent/15 text-accent' : 'bg-surface-tint text-tertiary',
                            )}
                          >
                            <button
                              onClick={() => toggleHashtag.mutate({ id: row.id, active: !row.active })}
                              className="hover:opacity-70 transition-opacity"
                              title={row.active ? 'Disable' : 'Enable'}
                            >
                              #{row.hashtag}
                            </button>
                            <button
                              onClick={() => removeHashtag.mutate(row.id)}
                              className="hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {hashtags.some((h) => !h.active) && (
                      <p className="text-[11px] text-tertiary mt-3">Dimmed hashtags are disabled — click to toggle.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Profiles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-accent" /> Profiles
                    </CardTitle>
                    <button
                      onClick={() => setModal({ type: 'add-profile' })}
                      className="flex items-center gap-1 text-[12px] text-accent hover:text-accent-hover transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {profiles.length === 0 ? (
                      <p className="text-caption py-2">No profiles tracked yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profiles.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium bg-accent/15 text-accent"
                          >
                            @{row.handle}
                            <button
                              onClick={() => removeProfile.mutate(row.id)}
                              className="hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[14px] text-secondary">No campaign selected.</p>
                <p className="text-caption mt-1">Select one from the list below.</p>
              </CardContent>
            </Card>
          )}

          {/* ── Other campaigns ──────────────────────────────────── */}
          {campaigns.filter((c) => c.id !== activeCampaignId).length > 0 && (
            <section className="space-y-2">
              <h2 className="text-label px-1">Other campaigns</h2>
              <div className="space-y-1.5">
                {campaigns.filter((c) => c.id !== activeCampaignId).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border glass border-border-subtle"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 opacity-50" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-secondary truncate">{c.name}</p>
                      {c.description && (
                        <p className="text-[11px] text-tertiary truncate">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => setActiveCampaignId(c.id)}>
                        Select
                      </Button>
                      <IconButton
                        icon={Pencil}
                        onClick={() => setModal({ type: 'edit-campaign', campaign: c })}
                        title="Edit"
                      />
                      <IconButton
                        icon={Trash2}
                        variant="destructive"
                        onClick={() => setModal({ type: 'delete-campaign', campaign: c })}
                        title="Delete"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modals */}
      {modal?.type === 'new-campaign' && (
        <CampaignModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit-campaign' && (
        <CampaignModal initial={modal.campaign} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete-campaign' && (
        <DeleteCampaignModal campaign={modal.campaign} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'add-hashtag' && activeCampaignId && (
        <AddItemModal type="hashtag" campaignId={activeCampaignId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'add-profile' && activeCampaignId && (
        <AddItemModal type="profile" campaignId={activeCampaignId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
