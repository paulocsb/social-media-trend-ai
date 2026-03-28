import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Megaphone } from 'lucide-react'
import { api, type Campaign } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
]

function CampaignFormModal({
  initial,
  onClose,
}: {
  initial?: Campaign
  onClose: () => void
}) {
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
            <label className="mb-1.5 block text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
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
                  style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : undefined, outlineOffset: color === c ? '2px' : undefined }}
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
      <div
        className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${isActive ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}
      >
        {/* Color dot + name */}
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
            {campaign.active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
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

export function CampaignsPage() {
  const { campaigns, isLoading } = useCampaign()
  const [creating, setCreating] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6">
      {creating && <CampaignFormModal onClose={() => setCreating(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each campaign has its own hashtags, profiles, collections, and analyses.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a campaign to start collecting and analysing trends.</p>
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
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </div>
  )
}
