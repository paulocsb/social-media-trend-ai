import { NavLink, useNavigate } from 'react-router-dom'
import { TrendingUp, Sparkles, Settings, UserCircle, LogOut, Sun, Moon, History, Megaphone, ChevronDown, Check, Home, SlidersHorizontal } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { useT } from '@/lib/i18n'
import { useCampaign } from '@/lib/campaign'

function CampaignSwitcher() {
  const { campaigns, activeCampaign, setActiveCampaignId } = useCampaign()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!activeCampaign) return null

  return (
    <div ref={ref} className="relative px-2 pb-2 pt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
      >
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeCampaign.color }} />
        <span className="flex-1 truncate text-left font-medium text-sidebar-foreground">{activeCampaign.name}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border bg-card text-card-foreground py-1 shadow-lg">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCampaignId(c.id); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="flex-1 truncate text-left">{c.name}</span>
              {c.id === activeCampaign.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
          <div className="my-1 border-t" />
          <NavLink
            to="/setup"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Manage campaigns
          </NavLink>
        </div>
      )}
    </div>
  )
}

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const t = useT()

  function handleLogout() {
    localStorage.removeItem('jwt')
    onLogout()
    navigate('/', { replace: true })
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm leading-tight">{t.appName}</span>
      </div>

      {/* Campaign switcher */}
      <div className="border-b">
        <CampaignSwitcher />
      </div>

      {/* Primary nav */}
      <nav className="space-y-0.5 p-2 pt-3">
        <NavItem to="/" label={t.nav.home} icon={Home} end />
        <NavItem to="/analysis" label={t.nav.analysis} icon={Sparkles} />
      </nav>

      {/* Divider + secondary nav */}
      <div className="px-2 pb-2">
        <div className="my-1 border-t" />
        <NavItem to="/history" label={t.nav.history} icon={History} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav — maintenance */}
      <div className="space-y-0.5 border-t p-2">
        <NavItem to="/setup" label={t.nav.setup} icon={SlidersHorizontal} />
        <NavItem to="/settings" label={t.nav.settings} icon={Settings} />
        <NavItem to="/account" label={t.nav.account} icon={UserCircle} />
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t.nav.signOut}
        </button>
      </div>
    </aside>
  )
}
