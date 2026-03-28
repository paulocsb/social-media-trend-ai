import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Bell, Plus, Loader2, BellOff, Trash2, Pencil, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useCampaign } from '@/lib/campaign'

type Alert = { id: string; hashtag: string; threshold: number; active: boolean }
type AlertsData = { ok: boolean; alerts: Alert[] }

export function AlertManager() {
  const qc = useQueryClient()
  const { activeCampaignId } = useCampaign()
  const [hashtag, setHashtag] = useState('')
  const [threshold, setThreshold] = useState(70)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editThreshold, setEditThreshold] = useState(70)

  const { data, isLoading } = useQuery({ queryKey: ['alerts', activeCampaignId], queryFn: () => activeCampaignId ? api.getAlerts(activeCampaignId) : Promise.resolve({ ok: true as const, alerts: [] }) })

  const create = useMutation({
    mutationFn: () => activeCampaignId ? api.createAlert(activeCampaignId, hashtag.trim(), threshold) : Promise.reject(new Error('No campaign')),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts', activeCampaignId] }); setHashtag('') },
  })

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.updateAlert(id, { active }),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: ['alerts'] })
      const prev = qc.getQueryData<AlertsData>(['alerts'])
      qc.setQueryData<AlertsData>(['alerts'], (old) => old
        ? { ...old, alerts: old.alerts.map((a) => a.id === id ? { ...a, active } : a) }
        : old
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['alerts'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['alerts', activeCampaignId] }),
  })

  const saveThreshold = useMutation({
    mutationFn: ({ id, threshold: t }: { id: string; threshold: number }) => api.updateAlert(id, { threshold: t }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts', activeCampaignId] }); setEditingId(null) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAlert(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['alerts'] })
      const prev = qc.getQueryData<AlertsData>(['alerts'])
      qc.setQueryData<AlertsData>(['alerts'], (old) => old
        ? { ...old, alerts: old.alerts.filter((a) => a.id !== id) }
        : old
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['alerts'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['alerts', activeCampaignId] }),
  })

  const alerts = (data?.alerts ?? []) as Alert[]
  const activeCount = alerts.filter((a) => a.active).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Spike Alerts</CardTitle>
              <CardDescription>{activeCount} active · fires when trend score exceeds threshold</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{alerts.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => { e.preventDefault(); if (hashtag.trim()) create.mutate() }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">#</span>
            <Input
              placeholder="hashtag"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              className="pl-6"
            />
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20"
            title="Threshold (0–100)"
          />
          <Button type="submit" size="sm" disabled={!hashtag.trim() || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {isLoading && <div className="h-32 animate-pulse rounded-lg bg-muted" />}

        {!isLoading && alerts.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed gap-2 text-muted-foreground">
            <BellOff className="h-4 w-4" />
            <span className="text-sm">No alerts configured.</span>
          </div>
        )}

        {alerts.length > 0 && (
          <ScrollArea className="h-[220px]">
            <ul className="space-y-1 pr-3">
              {alerts.map((alert, i) => (
                <li key={alert.id}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <Switch
                      checked={alert.active}
                      onCheckedChange={(checked) => toggle.mutate({ id: alert.id, active: checked })}
                      className="flex-shrink-0"
                    />

                    <span className={`flex-1 text-sm font-medium ${!alert.active ? 'text-muted-foreground line-through' : ''}`}>
                      #{alert.hashtag}
                    </span>

                    {editingId === alert.id ? (
                      <form
                        className="flex items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          saveThreshold.mutate({ id: alert.id, threshold: editThreshold })
                        }}
                      >
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Number(e.target.value))}
                          className="h-7 w-16 text-sm"
                          autoFocus
                        />
                        <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-emerald-600"
                          disabled={saveThreshold.isPending}>
                          {saveThreshold.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Check className="h-3.5 w-3.5" />
                          }
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 tabular-nums">
                          ≥ {alert.threshold}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingId(alert.id); setEditThreshold(alert.threshold) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove.mutate(alert.id)}
                          disabled={remove.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {i < alerts.length - 1 && <Separator className="opacity-40" />}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
