import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Plus, Trash2, Copy, Check, Loader2, Eye, EyeOff } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertManager } from '@/features/alerts/AlertManager'
import { JobsPanel } from '@/features/jobs/JobsPanel'
import { api } from '@/lib/api'
import { useT } from '@/lib/i18n'

// ─── Token reveal ─────────────────────────────────────────────────────────────

function TokenReveal({ rawToken, onDismiss }: { rawToken: string; onDismiss: () => void }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  function copy() {
    navigator.clipboard.writeText(rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
      <p className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        {t.apiTokens.revealNotice}
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-white/70 px-2 py-1.5 font-mono text-[11px] dark:bg-black/30">
          {visible ? rawToken : '•'.repeat(Math.min(rawToken.length, 48))}
        </code>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <button onClick={onDismiss} className="mt-2 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
        {t.apiTokens.dismissReveal}
      </button>
    </div>
  )
}

// ─── API Tokens tab ───────────────────────────────────────────────────────────

function ApiTokensTab() {
  const t = useT()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['user', 'tokens'], queryFn: () => api.getTokens() })
  const tokens = data?.tokens ?? []

  const [newName, setNewName] = useState('')
  const [revealedToken, setRevealedToken] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => api.createToken(newName.trim()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user', 'tokens'] })
      setNewName('')
      setRevealedToken(res.token.rawToken)
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'tokens'] }),
  })

  const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base">{t.apiTokens.title}</CardTitle>
            <CardDescription>{t.apiTokens.subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate() }}
          className="flex gap-2"
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.apiTokens.namePlaceholder}
            className="h-9 text-sm"
          />
          <Button type="submit" size="sm" disabled={!newName.trim() || create.isPending} className="shrink-0">
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> {t.apiTokens.create}</>}
          </Button>
        </form>

        {revealedToken && <TokenReveal rawToken={revealedToken} onDismiss={() => setRevealedToken(null)} />}

        <Separator />

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t.apiTokens.loading}
          </div>
        ) : tokens.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.apiTokens.empty}</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => {
              const lastUsed = token.lastUsedAt
                ? fmt.format(Math.round((new Date(token.lastUsedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 'day')
                : t.apiTokens.never
              return (
                <div key={token.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{token.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.apiTokens.createdLabel} {new Date(token.createdAt).toLocaleDateString('en-US')} · {t.apiTokens.usedLabel} {lastUsed}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => revoke.mutate(token.id)}
                    disabled={revoke.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
            <p className="text-right text-[11px] text-muted-foreground">
              <Badge variant="secondary">{tokens.length}</Badge> token{tokens.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ConfiguracoesPage() {
  const t = useT()
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">{t.pages.settings.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.pages.settings.subtitle}</p>
      </div>
      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">{t.pages.settings.tabs.alerts}</TabsTrigger>
          <TabsTrigger value="tokens">{t.pages.settings.tabs.apiTokens}</TabsTrigger>
          <TabsTrigger value="system">{t.pages.settings.tabs.system}</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts">
          <AlertManager />
        </TabsContent>
        <TabsContent value="tokens">
          <ApiTokensTab />
        </TabsContent>
        <TabsContent value="system">
          <JobsPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}
