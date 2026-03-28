import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Hash, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

type Hashtag = { id: string; hashtag: string; active: boolean }

export function HashtagManager() {
  const qc = useQueryClient()
  const { activeCampaignId } = useCampaign()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['hashtags-tracked', activeCampaignId],
    queryFn: () => activeCampaignId ? api.getTrackedHashtags(activeCampaignId) : Promise.resolve({ ok: true as const, hashtags: [] }),
    enabled: Boolean(activeCampaignId),
  })

  const add = useMutation({
    mutationFn: (hashtag: string) => activeCampaignId ? api.addHashtag(activeCampaignId, hashtag) : Promise.reject(new Error('No campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hashtags-tracked', activeCampaignId] }); setInput('') },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.updateHashtag(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags-tracked', activeCampaignId] }),
  })

  const rename = useMutation({
    mutationFn: ({ id, hashtag }: { id: string; hashtag: string }) => api.updateHashtag(id, { hashtag }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hashtags-tracked', activeCampaignId] }); setEditingId(null) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteHashtag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hashtags-tracked', activeCampaignId] }),
  })

  const hashtags = (data?.hashtags ?? []) as Hashtag[]
  const activeCount = hashtags.filter(h => h.active).length

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) add.mutate(input.trim())
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Hash className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Tracked Hashtags</CardTitle>
              <CardDescription>{activeCount} active · collected every 15 min</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{hashtags.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Add hashtag…" className="pl-8" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={!input.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {isLoading && <div className="h-32 animate-pulse rounded-lg bg-muted" />}

        {!isLoading && hashtags.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No hashtags yet. Add one above.</p>
          </div>
        )}

        {hashtags.length > 0 && (
          <ScrollArea className="h-[240px]">
            <ul className="space-y-1 pr-3">
              {hashtags.map((h, i) => (
                <li key={h.id}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <Switch
                      checked={h.active}
                      onCheckedChange={(checked) => toggle.mutate({ id: h.id, active: checked })}
                      className="flex-shrink-0"
                    />
                    {editingId === h.id ? (
                      <form className="flex flex-1 items-center gap-1"
                        onSubmit={(e) => { e.preventDefault(); rename.mutate({ id: h.id, hashtag: editValue }) }}>
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-sm" autoFocus />
                        <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-emerald-600">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-medium ${!h.active ? 'text-muted-foreground line-through' : ''}`}>
                          #{h.hashtag}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingId(h.id); setEditValue(h.hashtag) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove.mutate(h.id)} disabled={remove.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {i < hashtags.length - 1 && <Separator className="opacity-40" />}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
