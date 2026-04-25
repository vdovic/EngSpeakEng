import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, RefreshCw, Library,
  Target, BarChart2, Zap, Layers, GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'

interface NavLinkDef {
  to: string
  icon: LucideIcon
  label: string
  badge?: 'inbox'
}

interface NavGroup {
  label: string | null
  links: NavLinkDef[]
}

// ── Desktop sidebar structure ──────────────────────────────────────────────────

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    label: null,
    links: [
      { to: '/',          icon: LayoutDashboard, label: 'Home' },
    ],
  },
  {
    label: 'Learn',
    links: [
      { to: '/inbox',     icon: BookOpen,  label: 'New Words',         badge: 'inbox' as const },
      { to: '/review',    icon: RefreshCw, label: 'Review' },
      { to: '/challenge', icon: Zap,       label: 'Daily Challenge' },
    ],
  },
  {
    label: 'Organise',
    links: [
      { to: '/library',   icon: Library,   label: 'Vocabulary' },
      { to: '/themes',    icon: Layers,    label: 'Themes' },
      { to: '/week',      icon: Target,    label: "This Week's Focus" },
    ],
  },
  {
    label: 'Track',
    links: [
      { to: '/stats',     icon: BarChart2, label: 'Stats' },
    ],
  },
]

// ── Mobile bottom bar — 5 primary links only ───────────────────────────────────

const MOBILE_LINKS: NavLinkDef[] = [
  { to: '/',          icon: LayoutDashboard, label: 'Home' },
  { to: '/inbox',     icon: BookOpen,        label: 'New',       badge: 'inbox' as const },
  { to: '/challenge', icon: Zap,             label: 'Challenge' },
  { to: '/library',   icon: Library,         label: 'Vocab' },
  { to: '/stats',     icon: BarChart2,       label: 'Stats' },
]

// ── NavBar ─────────────────────────────────────────────────────────────────────

export function NavBar() {
  const items = useVocabStore((s) => s.items)
  const inboxCount = items.filter((i) => i.status === 'inbox').length

  function badgeFor(key?: 'inbox') {
    if (key === 'inbox' && inboxCount > 0) return inboxCount
    return null
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200 py-5 px-3">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 mb-6">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <GraduationCap size={15} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-900 tracking-tight">SpeakEnglish</span>
        </div>

        {/* Groups */}
        <div className="flex flex-col gap-4 flex-1">
          {SIDEBAR_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.links.map(({ to, icon: Icon, label, badge }) => {
                  const count = badgeFor(badge)
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active indicator bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-600 rounded-r-full" />
                          )}
                          <Icon size={16} className="shrink-0" />
                          <span className="flex-1 truncate">{label}</span>
                          {count != null && (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Mobile bottom bar (5 links) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-1 safe-area-inset-bottom">
        {MOBILE_LINKS.map(({ to, icon: Icon, label, badge }) => {
          const count = badgeFor(badge)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-0 ${
                  isActive
                    ? 'text-brand-700 bg-brand-50'
                    : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <div className="relative">
                <Icon size={20} />
                {count != null && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-brand-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[52px] text-center">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
