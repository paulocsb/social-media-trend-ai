import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Megaphone, SlidersHorizontal, Hash, User2, Check, AlertCircle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, type Campaign } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'
import { HashtagManager } from '@/features/hashtags/HashtagManager'
import { ProfileManager } from '@/features/profiles/ProfileManager'
import { cn } from '@/lib/utils'

// ─── Campaign form modal ───────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
]

function CampaignFormModal({ initial, onClose }: { initial?: Campaign; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: () => api.createCampaign({ name: name.trim(), description: description.trim() || undefined, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.updateCampaign(initial!.id, { name: name.trim(), description: description.trim() || null, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Campaign name is required'); return }
    if (initial) updateMutation.mutate()
    else createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{initial ? 'Edit campaign' : 'New campaign'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Black Friday 2025"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this campaign about?"
              rows={2}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : undefined,
                    outlineOffset: color === c ? '2px' : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : initial ? 'Save changes' : 'Create campaign'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Campaign card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const qc = useQueryClient()
  const { activeCampaignId, setActiveCampaignId } = useCampaign()
  const [editing, setEditing] = useState(false)
  const isActive = campaign.id === activeCampaignId

  const toggleMutation = useMutation({
    mutationFn: () => api.updateCampaign(campaign.id, { active: !campaign.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCampaign(campaign.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  function handleDelete() {
    if (!confirm(`Delete campaign "${campaign.name}"? All associated data will be permanently removed.`)) return
    deleteMutation.mutate()
  }

  return (
    <>
      {editing && <CampaignFormModal initial={campaign} onClose={() => setEditing(false)} />}
      <div className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${isActive ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: campaign.color + '20' }}>
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: campaign.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{campaign.name}</span>
            {!campaign.active && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>
            )}
            {isActive && (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: campaign.color + '20', color: campaign.color }}>
                Active
              </span>
            )}
          </div>
          {campaign.description && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{campaign.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Created {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isActive && (
            <button
              onClick={() => setActiveCampaignId(campaign.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium border hover:bg-accent transition-colors"
            >
              Switch to
            </button>
          )}
          <button
            onClick={() => toggleMutation.mutate()}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={campaign.active ? 'Archive' : 'Restore'}
          >
            {campaign.active
              ? <ToggleRight className="h-4 w-4 text-primary" />
              : <ToggleLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Campaigns tab ─────────────────────────────────────────────────────────────

function CampaignsTab() {
  const { campaigns, isLoading } = useCampaign()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      {creating && <CampaignFormModal onClose={() => setCreating(false)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Each campaign has its own hashtags, profiles, collections and analyses.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a campaign to start collecting and analysing trends.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create first campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  )
}

// ─── No campaign notice (shown inside hashtag/profile tabs) ────────────────────

function NoCampaignNotice({ onGoToCampaigns }: { onGoToCampaigns: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="font-medium">No campaign selected</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You need a campaign before adding hashtags or profiles.
        </p>
      </div>
      <button
        onClick={onGoToCampaigns}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Megaphone className="h-4 w-4" />
        Create a campaign first
      </button>
    </div>
  )
}

// ─── Setup steps guide ─────────────────────────────────────────────────────────

const SETUP_STEPS = [
  {
    id: 'campaigns' as const,
    icon: Megaphone,
    title: 'Campaign',
    description: 'Create a campaign to group your data.',
  },
  {
    id: 'hashtags' as const,
    icon: Hash,
    title: 'Hashtags',
    description: 'Add hashtags to monitor for trending posts.',
  },
  {
    id: 'profiles' as const,
    icon: User2,
    title: 'Profiles',
    description: 'Optionally track specific Instagram accounts.',
  },
]

function SetupGuide({
  activeTab,
  hasCampaign,
  onSelect,
}: {
  activeTab: string
  hasCampaign: boolean
  onSelect: (tab: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SETUP_STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = activeTab === step.id
        const isLocked = i > 0 && !hasCampaign

        return (
          <button
            key={step.id}
            onClick={() => !isLocked && onSelect(step.id)}
            disabled={isLocked}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : isLocked
                  ? 'cursor-not-allowed opacity-40'
                  : 'bg-card hover:shadow-sm hover:border-border/80',
            )}
          >
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {i === 0 && hasCampaign
                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                : <Icon className="h-3.5 w-3.5" />
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <p className="text-sm font-medium leading-snug">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{step.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function SetupPage() {
  const { campaigns, activeCampaign } = useCampaign()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'campaigns'
  const hasCampaign = campaigns.length > 0

  function setTab(value: string) {
    setSearchParams({ tab: value }, { replace: true })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Setup</h1>
          <p className="text-sm text-muted-foreground">
            {activeCampaign
              ? <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: activeCampaign.color }} />
                  {activeCampaign.name}
                </span>
              : 'Configure campaigns, hashtags and tracked profiles'
            }
          </p>
        </div>
      </div>

      <SetupGuide activeTab={tab} hasCampaign={hasCampaign} onSelect={setTab} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="hashtags" disabled={!hasCampaign}>Hashtags</TabsTrigger>
          <TabsTrigger value="profiles" disabled={!hasCampaign}>Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>

        <TabsContent value="hashtags">
          {hasCampaign
            ? <HashtagManager />
            : <NoCampaignNotice onGoToCampaigns={() => setTab('campaigns')} />
          }
        </TabsContent>

        <TabsContent value="profiles">
          {hasCampaign
            ? <ProfileManager />
            : <NoCampaignNotice onGoToCampaigns={() => setTab('campaigns')} />
          }
        </TabsContent>
      </Tabs>
    </>
  )
}
