import { useState } from 'react'
import { TrendingUp, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setToken } from '@/lib/api'
import { useT } from '@/lib/i18n'

export function Login({ onLogin }: { onLogin: () => void }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as { ok: boolean; token?: string; message?: string }
      if (!res.ok || !data.token) {
        setError(data.message ?? t.auth.invalidCredentials)
        return
      }
      setToken(data.token)
      onLogin()
    } catch {
      setError(t.auth.connectionError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-r border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white">{t.appName}</span>
        </div>

        <div className="space-y-4">
          <blockquote className="text-2xl font-semibold leading-snug text-white">
            "{t.auth.tagline}"
          </blockquote>
          <p className="text-sm text-slate-400">{t.auth.description}</p>
        </div>

        <p className="text-xs text-slate-600">{t.auth.copyright}</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white">{t.appName}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{t.auth.signIn}</h1>
            <p className="text-sm text-slate-400">{t.auth.signInSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t.auth.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.auth.passwordPlaceholder}
                  className="border-white/10 bg-white/5 pl-9 pr-9 text-white placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 animate-fade-in">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              disabled={!email || !password || loading}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t.auth.signingIn}</> : t.auth.signIn}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600">
            {t.auth.noAccountHint}{' '}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-slate-400">ADMIN_PASSWORD</code>{' '}
            {t.auth.noAccountHintSuffix}
          </p>
        </div>
      </div>
    </div>
  )
}
