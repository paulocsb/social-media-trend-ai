import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, BarChart2, History, Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCampaign } from '../../lib/campaign';
import { supabase } from '../../lib/supabase';

const NAV = [
  { to: '/',         icon: Home,     label: 'Home' },
  { to: '/analysis', icon: Search,   label: 'Analysis' },
  { to: '/history',  icon: History,  label: 'History' },
  { to: '/setup',    icon: BarChart2, label: 'Setup' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { campaigns, activeCampaign, setActiveCampaignId } = useCampaign();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <aside className="flex flex-col w-[220px] min-h-screen glass-sidebar shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border-subtle">
        <span className="text-[15px] font-semibold text-primary tracking-tight">Trend Intel</span>
      </div>

      {/* Campaign picker */}
      {campaigns.length > 0 && (
        <div className="px-3 pt-3">
          <div className="relative">
            <select
              value={activeCampaign?.id ?? ''}
              onChange={(e) => setActiveCampaignId(e.target.value)}
              className={cn(
                'w-full appearance-none rounded-md bg-white/5 px-3 pr-7 py-2',
                'text-[13px] font-medium text-primary border border-border-subtle',
                'hover:border-border transition-colors cursor-pointer',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary pointer-events-none" />
          </div>
          {activeCampaign?.description && (
            <p className="text-[11px] text-tertiary px-1 mt-1 truncate">{activeCampaign.description}</p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent font-medium shadow-glow-sm'
                  : 'text-secondary hover:bg-white/5 hover:text-primary',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-border-subtle pt-3 space-y-0.5">
        <NavLink
          to="/account"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] transition-colors',
              isActive
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-secondary hover:bg-white/5 hover:text-primary',
            )
          }
        >
          <User className="w-4 h-4 shrink-0" />
          Account
        </NavLink>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-[14px] text-secondary hover:bg-white/5 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
