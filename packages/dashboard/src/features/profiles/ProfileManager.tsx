import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, Plus, Pencil, Trash2, Check, X, Loader2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

type Profile = { id: string; handle: string; active: boolean }

export function ProfileManager() {
  const qc = useQueryClient()
  const { activeCampaignId } = useCampaign()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['profiles-tracked', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getProfiles(activeCampaignId) : Promise.resolve({ ok: true as const, profiles: [] }),
    enabled: Boolean(activeCampaignId),
  })

  const add = useMutation({
    mutationFn: (handle: string) => activeCampaignId ? api.addProfile(activeCampaignId, handle) : Promise.reject(new Error('No campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles-tracked', activeCampaignId] }); setInput('') },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.updateProfile(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles-tracked', activeCampaignId] }),
  })

  const rename = useMutation({
    mutationFn: ({ id, handle }: { id: string; handle: string }) => api.updateProfile(id, { handle }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles-tracked', activeCampaignId] }); setEditingId(null) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles-tracked', activeCampaignId] }),
  })

  const collect = useMutation({
    mutationFn: () => activeCampaignId ? api.triggerProfileCollection(activeCampaignId) : Promise.reject(new Error('No campaign')),
    onSettled: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })

  const profiles = (data?.profiles ?? []) as Profile[]
  const activeCount = profiles.filter(p => p.active).length

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) add.mutate(input.trim())
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">Tracked Profiles</CardTitle>
              <CardDescription>{activeCount} active · collected every 30 min</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={collect.isPending || activeCount === 0}
              onClick={() => collect.mutate()}
              title="Collect profiles now"
            >
              {collect.isPending
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : <Zap className="mr-1 h-3 w-3" />}
              Collect now
            </Button>
            <Badge variant="secondary">{profiles.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
            <Input placeholder="Add profile…" className="pl-7" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={!input.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {isLoading && <div className="h-32 animate-pulse rounded-lg bg-muted" />}

        {!isLoading && profiles.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No profiles yet. Add one above.</p>
          </div>
        )}

        {profiles.length > 0 && (
          <ScrollArea className="h-[240px]">
            <ul className="space-y-1 pr-3">
              {profiles.map((p, i) => (
                <li key={p.id}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <Switch
                      checked={p.active}
                      onCheckedChange={(checked) => toggle.mutate({ id: p.id, active: checked })}
                      className="flex-shrink-0"
                    />
                    {editingId === p.id ? (
                      <form className="flex flex-1 items-center gap-1"
                        onSubmit={(e) => { e.preventDefault(); rename.mutate({ id: p.id, handle: editValue }) }}>
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-sm" autoFocus />
                        <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-medium ${!p.active ? 'text-muted-foreground line-through' : ''}`}>
                          @{p.handle}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingId(p.id); setEditValue(p.handle) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove.mutate(p.id)} disabled={remove.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {i < profiles.length - 1 && <Separator className="opacity-40" />}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
