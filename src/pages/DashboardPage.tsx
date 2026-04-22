import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Flame, BookOpen, RefreshCw, Target, Zap } from 'lucide-react'
import { useVocabStore, useDueItems, useWeeklyFocusItems } from '@/store/vocabStore'
import { QuickAddModal } from '@/components/QuickAddModal'
import { VocabCard } from '@/components/VocabCard'
import { isWithinInterval, subDays, startOfDay } from 'date-fns'

function getStreak(items: ReturnType<typeof useVocabStore.getState>['items']): number {
  const logs = items.flatMap((i) => i.activation.usageLogs)
  const today = startOfDay(new Date())
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const day = subDays(today, i)
    const nextDay = subDays(today, i - 1)
    const hasActivity = logs.some((l) =>
      isWithinInterval(new Date(l.usedAt), { start: day, end: nextDay })
    )
    if (hasActivity) streak++
    else if (i > 0) break
  }
  return streak
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const items = useVocabStore((s) => s.items)
  const dueItems = useDueItems()
  const weeklyItems = useWeeklyFocusItems()

  const inboxCount = items.filter((i) => i.status === 'inbox').length
  const activationCount = items.filter((i) => i.status === 'activation').length
  const masteredCount = items.filter((i) => i.status === 'mastered').length

  const thisWeekStart = subDays(new Date(), 7)
  const usesThisWeek = items
    .flatMap((i) => i.activation.usageLogs)
    .filter((l) => new Date(l.usedAt) >= thisWeekStart).length

  const streak = getStreak(items)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good day</h1>
          <p className="text-sm text-slate-500 mt-0.5">Let's build your vocabulary.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Quick add</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<RefreshCw size={18} className="text-blue-600" />}
          label="Due today"
          value={dueItems.length}
          bg="bg-blue-50"
          onClick={() => navigate('/review')}
          highlight={dueItems.length > 0}
        />
        <StatCard
          icon={<BookOpen size={18} className="text-slate-600" />}
          label="Inbox"
          value={inboxCount}
          bg="bg-slate-50"
          onClick={() => navigate('/inbox')}
        />
        <StatCard
          icon={<Zap size={18} className="text-amber-600" />}
          label="Activating"
          value={activationCount}
          bg="bg-amber-50"
          onClick={() => navigate('/library?status=activation')}
        />
        <StatCard
          icon={<Flame size={18} className="text-emerald-600" />}
          label="Streak"
          value={streak}
          bg="bg-emerald-50"
          suffix="days"
        />
      </div>

      {/* Due today */}
      {dueItems.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Due for review</h2>
            <button
              onClick={() => navigate('/review')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Start review →
            </button>
          </div>
          <div className="space-y-2">
            {dueItems.slice(0, 3).map((item) => (
              <VocabCard key={item.id} item={item} compact />
            ))}
            {dueItems.length > 3 && (
              <button
                onClick={() => navigate('/review')}
                className="w-full text-center py-2.5 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
              >
                +{dueItems.length - 3} more — start review
              </button>
            )}
          </div>
        </section>
      )}

      {/* Active this week */}
      {weeklyItems.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Active this week</h2>
            <button
              onClick={() => navigate('/week')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              See all →
            </button>
          </div>
          <div className="space-y-2">
            {weeklyItems.slice(0, 4).map((item) => (
              <VocabCard key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      )}

      {/* Progress summary */}
      <section className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">This week</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-xl font-bold text-slate-900">{usesThisWeek}</div>
            <div className="text-xs text-slate-500">Real-life uses</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="text-xl font-bold text-slate-900">{masteredCount}</div>
            <div className="text-xs text-slate-500">Mastered total</div>
          </div>
        </div>
      </section>

      {/* Target status */}
      <div className="mt-4 p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-start gap-3">
        <Target size={16} className="text-brand-600 mt-0.5 shrink-0" />
        <p className="text-xs text-brand-700">
          <strong>Goal:</strong> 1500 advanced items in 6 months.{' '}
          <span className="opacity-70">You have {items.length} items so far.</span>
        </p>
      </div>

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
  suffix?: string
  onClick?: () => void
  highlight?: boolean
}

function StatCard({ icon, label, value, bg, suffix, onClick, highlight }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`${bg} rounded-xl p-3 text-left w-full ${
        onClick ? 'hover:opacity-80 transition-opacity cursor-pointer' : ''
      } ${highlight ? 'ring-2 ring-brand-400' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-2xl font-bold text-slate-900">
        {value}
        {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-slate-600">{label}</div>
    </Tag>
  )
}
