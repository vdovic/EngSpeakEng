import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, RefreshCw, Library,
  Target, BarChart2, Zap, Layers, GraduationCap, Sparkles,
  MoreHorizontal, X,
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
      { to: '/', icon: LayoutDashboard, label: 'Home' },
    ],
  },
  {
    label: 'Learn',
    links: [
      { to: '/inbox',     icon: BookOpen,  label: 'Inbox',          badge: 'inbox' as const },
      { to: '/review',    icon: RefreshCw, label: 'Review' },
      { to: '/challenge', icon: Zap,       label: 'Daily Challenge' },
    ],
  },
  {
    label: 'Organise',
    links: [
      { to: '/library', icon: Library, label: 'All Vocabulary' },
      { to: '/themes',  icon: Layers,  label: 'Themes' },
      { to: '/week',    icon: Target,  label: 'Focus This Week' },
    ],
  },
  {
    label: 'Track',
    links: [
      { to: '/stats', icon: BarChart2, label: 'Stats' },
    ],
  },
]

// ── Mobile bottom bar — 5 tabs, with "More" overflow ──────────────────────────
//
// Primary tabs cover the daily workflow (Home → Add → Challenge → Review).
// "More" opens a sheet containing everything else.

const MOBILE_PRIMARY: NavLinkDef[] = [
  { to: '/',          icon: LayoutDashboard, label: 'Home' },
  { to: '/inbox',     icon: BookOpen,        label: 'New',       badge: 'inbox' as const },
  { to: '/challenge', icon: Zap,             label: 'Challenge' },
  { to: '/review',    icon: RefreshCw,       label: 'Review' },
  // 5th slot = "More" button (rendered separately below)
]

const MOBILE_MORE: NavLinkDef[] = [
  { to: '/library', icon: Library,     label: 'All Vocabulary' },
  { to: '/week',    icon: Target,      label: 'Focus This Week' },
  { to: '/themes',  icon: Layers,      label: 'Themes' },
  { to: '/stats',   icon: BarChart2,   label: 'Stats' },
]

// Routes that belong to the "More" drawer — used to highlight the More tab
const MORE_ROUTES = new Set(MOBILE_MORE.map((l) => l.to))

// ── SidebarValueCard ───────────────────────────────────────────────────────────

function SidebarValueCard() {
  return (
    <div className="mx-1 mt-4">
      <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-3.5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles size={12} className="text-brand-600 shrink-0" />
          <span className="text-[11px] font-bold text-brand-900 leading-none">ESE adapts to you</span>
        </div>
        <ul className="space-y-1.5">
          {[
            'Personalize by role & goals',
            'Focus on what matters',
            'AI-powered learning that sticks',
          ].map((text) => (
            <li key={text} className="flex items-start gap-1.5">
              <span className="text-brand-400 text-xs shrink-0 mt-0.5">·</span>
              <span className="text-[10px] text-brand-700 leading-snug">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── MoreDrawer ─────────────────────────────────────────────────────────────────

function MoreDrawer({
  open,
  onClose,
  badgeFor,
}: {
  open: boolean
  onClose: () => void
  badgeFor: (key?: 'inbox') => number | null
}) {
  // Close on back-navigation / route change
  const location = useLocation()
  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trap body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet — anchored at bottom-0 so translate-y-full hides it fully off-screen */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">More</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Links grid — 2 columns */}
        <div className="grid grid-cols-2 gap-2 p-4 pb-6">
          {MOBILE_MORE.map(({ to, icon: Icon, label, badge }) => {
            const count = badgeFor(badge)
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-200 hover:bg-brand-50'
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />
                <span className="text-sm font-medium leading-tight">{label}</span>
                {count != null && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── NavBar ─────────────────────────────────────────────────────────────────────

export function NavBar() {
  const items = useVocabStore((s) => s.items)
  const inboxCount = items.filter((i) => i.status === 'inbox').length
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  function badgeFor(key?: 'inbox') {
    if (key === 'inbox' && inboxCount > 0) return inboxCount
    return null
  }

  // Is the current route inside the "More" overflow group?
  const moreIsActive = MORE_ROUTES.has(location.pathname)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200 py-5 px-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap size={14} className="text-white" />
          </div>
          <div className="leading-none">
            <span className="block text-[15px] font-extrabold text-slate-900 tracking-tight">ESE</span>
            <span className="block text-[9px] text-slate-400 tracking-wide mt-0.5">Advanced Vocabulary, Tailored to You</span>
          </div>
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

        {/* Sidebar value card */}
        <SidebarValueCard />
      </nav>

      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-1 safe-area-inset-bottom">

        {/* Primary tab links */}
        {MOBILE_PRIMARY.map(({ to, icon: Icon, label, badge }) => {
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

        {/* "More" tab */}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors min-w-0 ${
            moreOpen || moreIsActive
              ? 'text-brand-700 bg-brand-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* ── More drawer (mobile only) ── */}
      <div className="md:hidden">
        <MoreDrawer
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          badgeFor={badgeFor}
        />
      </div>
    </>
  )
}
