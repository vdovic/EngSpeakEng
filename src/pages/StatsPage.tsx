import { useVocabStore } from '@/store/vocabStore'
import { useDueItems } from '@/store/vocabStore'
import { isWeak } from '@/lib/srs'
import { BarChart2, Flame, CheckCircle, Zap, BookOpen, RefreshCw, TrendingUp } from 'lucide-react'
import { subDays, startOfDay, isWithinInterval, format } from 'date-fns'

function last7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))
}

export function StatsPage() {
  const items = useVocabStore((s) => s.items)
  const dueItems = useDueItems()

  const inboxCount = items.filter((i) => i.status === 'inbox').length
  const learningCount = items.filter((i) => i.status === 'learning').length
  const stableCount = items.filter((i) => i.status === 'stable').length
  const activationCount = items.filter((i) => i.status === 'activation').length
  const masteredCount = items.filter((i) => i.status === 'mastered').length
  const weakCount = items.filter((i) => isWeak(i.review.ease, i.review.reviewCount)).length

  const allLogs = items.flatMap((i) => i.activation.usageLogs)
  const thisWeekStart = subDays(new Date(), 7)
  const usesThisWeek = allLogs.filter((l) => new Date(l.usedAt) >= thisWeekStart).length

  const activatedThisWeek = items.filter(
    (i) =>
      i.status === 'mastered' &&
      i.activation.usageLogs.some((l) => new Date(l.usedAt) >= thisWeekStart)
  ).length

  // Daily uses per day (last 7)
  const days = last7Days()
  const dailyUses = days.map((day) => {
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    return allLogs.filter((l) =>
      isWithinInterval(new Date(l.usedAt), { start: startOfDay(day), end: nextDay })
    ).length
  })
  const maxDaily = Math.max(...dailyUses, 1)

  // Streak
  let streak = 0
  const today = startOfDay(new Date())
  for (let i = 0; i < 30; i++) {
    const day = subDays(today, i)
    const next = subDays(today, i - 1)
    const has = allLogs.some((l) =>
      isWithinInterval(new Date(l.usedAt), { start: day, end: next })
    )
    if (has) streak++
    else if (i > 0) break
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Progress</h1>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <MetricCard icon={<RefreshCw size={16} className="text-blue-600" />} label="Due today" value={dueItems.length} bg="bg-blue-50" />
        <MetricCard icon={<Flame size={16} className="text-orange-500" />} label="Streak" value={streak} suffix="days" bg="bg-orange-50" />
        <MetricCard icon={<CheckCircle size={16} className="text-emerald-600" />} label="Mastered" value={masteredCount} bg="bg-emerald-50" />
        <MetricCard icon={<Zap size={16} className="text-amber-600" />} label="Activating" value={activationCount} bg="bg-amber-50" />
        <MetricCard icon={<TrendingUp size={16} className="text-brand-600" />} label="Uses this week" value={usesThisWeek} bg="bg-brand-50" />
        <MetricCard icon={<BookOpen size={16} className="text-slate-500" />} label="Total items" value={items.length} bg="bg-slate-50" />
      </div>

      {/* Status breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Vocabulary lifecycle</h2>
        <div className="space-y-2">
          <StatusRow label="Inbox" count={inboxCount} total={items.length} color="bg-slate-400" />
          <StatusRow label="Learning" count={learningCount} total={items.length} color="bg-blue-500" />
          <StatusRow label="Stable" count={stableCount} total={items.length} color="bg-teal-500" />
          <StatusRow label="Activation" count={activationCount} total={items.length} color="bg-amber-500" />
          <StatusRow label="Mastered" count={masteredCount} total={items.length} color="bg-emerald-500" />
        </div>
      </div>

      {/* Daily usage chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Daily real-life uses (last 7 days)</h2>
        <div className="flex items-end gap-2 h-24">
          {days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                <div
                  className="w-full bg-brand-500 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max((dailyUses[i] / maxDaily) * 72, dailyUses[i] > 0 ? 4 : 0)}px`,
                  }}
                />
              </div>
              <span className="text-xs text-slate-400">{format(day, 'EEE')}</span>
            </div>
          ))}
        </div>
        {usesThisWeek === 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">Log real-life uses to see your chart.</p>
        )}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {weakCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <strong>{weakCount} weak items</strong> — these have low ease scores and need more practice.
          </div>
        )}
        {activatedThisWeek > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <strong>🎉 {activatedThisWeek} item{activatedThisWeek > 1 ? 's' : ''} mastered this week!</strong>
          </div>
        )}
        {inboxCount > 5 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <strong>{inboxCount} items in inbox</strong> — consider enriching and moving them to learning.
          </div>
        )}
      </div>

      {/* Long-term goal */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">6-month goal</h2>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full"
              style={{ width: `${Math.min((items.length / 1500) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700">{items.length}/1500</span>
        </div>
        <p className="text-xs text-slate-500">
          {Math.max(0, 1500 - items.length)} items remaining to reach your goal.
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  icon, label, value, suffix, bg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className="mb-1">{icon}</div>
      <div className="text-2xl font-bold text-slate-900">
        {value}
        {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  )
}

function StatusRow({
  label, count, total, color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-20">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
    </div>
  )
}
