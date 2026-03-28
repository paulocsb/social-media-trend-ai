import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Lock, Pencil, Loader2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useT } from '@/lib/i18n'

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileCard() {
  const t = useT()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['user', 'me'], queryFn: () => api.getMe() })
  const user = data?.user

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  function startEdit() {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setEditing(true)
  }

  const save = useMutation({
    mutationFn: () => api.updateMe({ name: name.trim() || undefined, email: email.trim() || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', 'me'] }); setEditing(false) },
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">{t.profile.title}</CardTitle>
              <CardDescription>{t.profile.subtitle}</CardDescription>
            </div>
          </div>
          {!editing && !isLoading && (
            <Button variant="ghost" size="sm" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t.profile.loading}
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t.profile.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profile.namePlaceholder} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t.profile.email}</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.profile.emailPlaceholder} type="email" />
            </div>
            {save.isError && <p className="text-sm text-destructive">{t.profile.saveError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> {t.profile.save}</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={save.isPending}>
                {t.profile.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label={t.profile.name} value={user?.name || undefined} placeholder={t.profile.notSet} />
            <Row label={t.profile.email} value={user?.email || undefined} placeholder={t.profile.notSet} />
            <Row
              label={t.profile.memberSince}
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
              placeholder={t.profile.notSet}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, placeholder }: { label: string; value?: string; placeholder: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? <span className="italic text-muted-foreground/60">{placeholder}</span>}</span>
    </div>
  )
}

// ─── Change Password ───────────────────────────────────────────────────────────

function PasswordCard() {
  const t = useT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)

  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => { setSuccess(true); setCurrent(''); setNext(''); setConfirm('') },
  })

  const mismatch = next && confirm && next !== confirm
  const weak = next && next.length < 8
  const canSubmit = current && next && confirm && !mismatch && !weak && !change.isPending

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base">{t.password.title}</CardTitle>
            <CardDescription>{t.password.subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.password.current}</label>
            <Input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setSuccess(false) }} autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.password.new}</label>
            <Input type="password" value={next} onChange={(e) => { setNext(e.target.value); setSuccess(false) }} autoComplete="new-password" />
            {weak && <p className="text-xs text-amber-600 dark:text-amber-400">{t.password.tooShort}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t.password.confirm}</label>
            <Input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setSuccess(false) }} autoComplete="new-password" />
            {mismatch && <p className="text-xs text-destructive">{t.password.mismatch}</p>}
          </div>
          {change.isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(change.error as Error)?.message ?? t.password.changeError}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              {t.password.success}
            </p>
          )}
          <Button size="sm" disabled={!canSubmit} onClick={() => change.mutate()}>
            {change.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.password.submit}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ContaPage() {
  const t = useT()
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">{t.pages.account.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.pages.account.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
      </div>
    </>
  )
}
