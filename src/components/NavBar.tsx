import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, RefreshCw, Library, Target, BarChart2, Zap } from 'lucide-react'

const links = [
  { to: '/',          icon: LayoutDashboard, label: 'Home' },
  { to: '/inbox',     icon: BookOpen,        label: 'Inbox' },
  { to: '/review',    icon: RefreshCw,       label: 'Review' },
  { to: '/challenge', icon: Zap,             label: 'Challenge' },
  { to: '/library',   icon: Library,         label: 'Library' },
  { to: '/week',      icon: Target,          label: 'This Week' },
  { to: '/stats',     icon: BarChart2,       label: 'Stats' },
]

export function NavBar() {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200 py-6 px-3 gap-1">
        <div className="px-3 mb-6">
          <span className="text-lg font-bold text-brand-700 tracking-tight">SpeakEnglish</span>
        </div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 safe-area-inset-bottom">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
