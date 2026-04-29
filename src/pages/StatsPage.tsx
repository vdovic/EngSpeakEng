import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, Flame, CheckCircle, Zap, BookOpen, Target,
  Lightbulb, TrendingUp, Trophy, Info, AlertTriangle, Layers,
  Calendar, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore, ALL_BADGES, BADGE_THRESHOLDS } from '@/store/gamificationStore'
import { isWeak } from '@/lib/srs'
import { Badge, BadgeId } from '@/types/vocabulary'
import {
  getDailyActivity,
  getDueProjection,
  getExposureDistribution,
  getTypeBreakdown,
  getPartOfSpeechBreakdown,
  getGoalProgress,
  getInsights,
} from '@/utils/stats'

// ── Reusable primitives ───────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
      <h2 className="text-sm font-semibold text-slate-700">{children}</h2>
    </div>
  )
}

function ProgressBar({
  pct, color = 'bg-brand-500', height = 'h-2', className = '',
}: {
  pct: number; color?: string; height?: string; className?: string
}) {
  return (
    <div className={`w-full ${height} bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

// ── Overview metric cards ─────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, suffix, bg, sub,
}: {
  icon: React.ReactNode; label: string; value: number | string
  suffix?: string; bg: string; sub?: string
}) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className="mb-1.5 opacity-80">{icon}</div>
      <div className="text-2xl font-bold text-slate-900 leading-none">
        {value}
        {suffix && <span className="text-sm font-normal text-slate-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Activity chart (recharts) ─────────────────────────────────────────────────

function ActivityChart({ data }: { data: ReturnType<typeof getDailyActivity> }) {
  const hasData = data.some((d) => d.points > 0 || d.uses > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        Complete challenges and log real-life uses to see your activity chart.
      </div>
    )
  }

  // Show last 14 days for readability
  const slice = data.slice(-14)

  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={slice} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="shortLabel"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,.06)',
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="points" name="Challenge pts" fill="#818cf8" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="uses"   name="Real-life uses" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Vocabulary lifecycle bars ─────────────────────────────────────────────────

const STATUS_ROWS = [
  { key: 'inbox',      label: 'New',      color: 'bg-slate-400' },
  { key: 'learning',   label: 'Learning', color: 'bg-blue-500' },
  { key: 'stable',     label: 'Stable',   color: 'bg-teal-500' },
  { key: 'activation', label: 'Active',   color: 'bg-amber-500' },
  { key: 'mastered',   label: 'Mastered', color: 'bg-violet-500' },
]

function LifecycleSection({ items }: { items: { status: string }[] }) {
  const total = items.length || 1
  return (
    <div className="space-y-2.5">
      {STATUS_ROWS.map(({ key, label, color }) => {
        const count = items.filter((i) => i.status === key).length
        const pct = (count / total) * 100
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-[72px] shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-8 text-right shrink-0">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Exposure milestones ───────────────────────────────────────────────────────

function ExposureSection({ dist }: { dist: number[] }) {
  const max = Math.max(...dist, 1)
  const labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8✓']

  return (
    <div className="space-y-1.5">
      {dist.map((count, level) => {
        const pct = (count / max) * 100
        const isComplete = level === 8
        return (
          <div key={level} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 w-5 shrink-0 text-right">
              {labels[level]}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500' : 'bg-indigo-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-600 w-8 text-right shrink-0">{count}</span>
          </div>
        )
      })}
      <p className="text-[10px] text-slate-400 mt-1">
        Level 8 = fully learned via daily challenge (SRS complete)
      </p>
    </div>
  )
}

// ── Due projections ───────────────────────────────────────────────────────────

function DueProjectionSection({
  proj,
  onClickNow,
}: {
  proj: ReturnType<typeof getDueProjection>
  onClickNow: () => void
}) {
  const cells = [
    { label: 'Due now',    value: proj.now,       accent: 'text-red-600',    bg: 'bg-red-50',    action: true },
    { label: 'Tomorrow',   value: proj.oneDay,     accent: 'text-amber-600',  bg: 'bg-amber-50',  action: false },
    { label: 'In 3 days',  value: proj.threeDays,  accent: 'text-blue-600',   bg: 'bg-blue-50',   action: false },
    { label: 'This week',  value: proj.oneWeek,    accent: 'text-slate-700',  bg: 'bg-slate-50',  action: false },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map(({ label, value, accent, bg, action }) => (
        <button
          key={label}
          onClick={action ? onClickNow : undefined}
          disabled={!action}
          className={`${bg} rounded-xl p-3 text-center ${action ? 'hover:opacity-80 cursor-pointer transition-opacity' : 'cursor-default'}`}
        >
          <div className={`text-xl font-bold ${accent}`}>{value}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</div>
          {action && value > 0 && (
            <div className="text-[10px] text-red-500 font-semibold mt-1 flex items-center justify-center gap-0.5">
              Start <ChevronRight size={10} />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Category breakdown ────────────────────────────────────────────────────────

function BreakdownList({ rows, linkPrefix }: { rows: ReturnType<typeof getTypeBreakdown>; linkPrefix?: string }) {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center gap-2 ${linkPrefix ? 'cursor-pointer group' : ''}`}
          onClick={linkPrefix ? () => navigate(`/library?${linkPrefix}=${row.label.toLowerCase()}`) : undefined}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
          <span className={`text-xs text-slate-600 flex-1 ${linkPrefix ? 'group-hover:text-brand-600 transition-colors' : ''}`}>
            {row.label}
          </span>
          <div className="flex-[2] h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${row.pct}%`, background: row.color }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-7 text-right shrink-0">{row.count}</span>
          <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">{row.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Badges with progress ──────────────────────────────────────────────────────

function BadgeSection({
  allBadgesWithState,
  gamification,
}: {
  allBadgesWithState: (Badge & { locked: boolean })[]
  gamification: { points: number; streakDays: number; challengeCompletions: number }
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {allBadgesWithState.map((b) => {
        const threshold = BADGE_THRESHOLDS[b.id as BadgeId]
        const current = threshold
          ? threshold.metric === 'points'       ? gamification.points
          : threshold.metric === 'streak'       ? gamification.streakDays
          : gamification.challengeCompletions
          : 0
        const target  = threshold?.target ?? 1
        const pct     = Math.min(100, Math.round((current / target) * 100))

        return (
          <div
            key={b.id}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
              b.locked ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <span className="text-xl mt-0.5">{b.locked ? '🔒' : b.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className={`text-sm font-semibold leading-none ${b.locked ? 'text-slate-400' : 'text-slate-900'}`}>
                  {b.label}
                </p>
                {!b.locked && b.unlockedAt ? (
                  <span className="text-[10px] text-amber-600 font-medium shrink-0">
                    {format(new Date(b.unlockedAt), 'MMM d')}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {Math.min(current, target)}/{target}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-1.5">{b.description}</p>
              {b.locked && (
                <ProgressBar
                  pct={pct}
                  color="bg-slate-300"
                  height="h-1.5"
                />
              )}
              {!b.locked && (
                <ProgressBar pct={100} color="bg-amber-400" height="h-1.5" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Goal widget ───────────────────────────────────────────────────────────────

function GoalWidget({
  masteredCount,
  goalTarget,
  goalDeadline,
  onSave,
}: {
  masteredCount: number
  goalTarget: number
  goalDeadline: string
  onSave: (target: number, deadline: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftTarget, setDraftTarget] = useState(String(goalTarget))
  const [draftDeadline, setDraftDeadline] = useState(goalDeadline)

  const prog = useMemo(
    () => getGoalProgress(masteredCount, goalTarget, goalDeadline),
    [masteredCount, goalTarget, goalDeadline],
  )

  function save() {
    const t = Math.max(1, parseInt(draftTarget, 10) || goalTarget)
    onSave(t, draftDeadline)
    setEditing(false)
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Target (mastered words)
              </label>
              <input
                type="number"
                min={1}
                value={draftTarget}
                onChange={(e) => setDraftTarget(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Deadline</label>
              <input
                type="date"
                value={draftDeadline}
                onChange={(e) => setDraftDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700"
            >
              Save goal
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-2xl font-bold text-brand-700">{masteredCount}</span>
              <span className="text-sm text-slate-400"> / {goalTarget} mastered</span>
            </div>
            <button
              onClick={() => { setDraftTarget(String(goalTarget)); setDraftDeadline(goalDeadline); setEditing(true) }}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Edit goal
            </button>
          </div>

          <ProgressBar
            pct={prog.pct}
            color={prog.onTrack ? 'bg-emerald-500' : 'bg-amber-500'}
            height="h-3"
          />

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2.5">
              <div className="text-lg font-bold text-slate-800">{prog.pct}%</div>
              <div className="text-[10px] text-slate-500">Complete</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5">
              <div className="text-lg font-bold text-slate-800">{prog.weeksLeft}</div>
              <div className="text-[10px] text-slate-500">Weeks left</div>
            </div>
            <div className={`rounded-xl p-2.5 ${prog.onTrack ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <div className={`text-lg font-bold ${prog.onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>
                {prog.paceNeeded}
              </div>
              <div className="text-[10px] text-slate-500">Needed/week</div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Deadline: {format(new Date(goalDeadline), 'MMM d, yyyy')} ·{' '}
            {prog.remaining} words remaining ·{' '}
            <span className={prog.onTrack ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
              {prog.onTrack ? 'On track ✓' : `Need ${prog.paceNeeded}/week to catch up`}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

// ── Insights panel ────────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: ReturnType<typeof getInsights> }) {
  if (insights.length === 0) return null

  const style = {
    info:    { bg: 'bg-blue-50',    border: 'border-blue-100',    icon: <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />,          text: 'text-blue-800'   },
    warn:    { bg: 'bg-amber-50',   border: 'border-amber-100',   icon: <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />, text: 'text-amber-800'  },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />, text: 'text-emerald-800'},
  }

  return (
    <div className="space-y-2">
      {insights.map((ins, i) => {
        const s = style[ins.type]
        return (
          <div key={i} className={`flex items-start gap-2.5 ${s.bg} border ${s.border} rounded-xl px-3.5 py-3`}>
            {s.icon}
            <p className={`text-sm ${s.text} leading-snug`}>{ins.text}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function StatsPage() {
  const navigate = useNavigate()
  const items = useVocabStore((s) => s.items)
  const {
    points, streakDays, challengeCompletions, badges,
    pointsHistory, goalTarget, goalDeadline, setGoal,
  } = useGamificationStore()

  // ── Derived values ──────────────────────────────────────────────────────────
  const masteredCount    = useMemo(() => items.filter((i) => i.status === 'mastered').length, [items])
  const weakCount        = useMemo(() => items.filter((i) => isWeak(i.review.ease, i.review.reviewCount)).length, [items])
  const allLogs          = useMemo(() => items.flatMap((i) => i.activation.usageLogs), [items])
  const usesThisWeek     = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allLogs.filter((l) => new Date(l.usedAt).getTime() >= since).length
  }, [allLogs])

  const dailyActivity    = useMemo(() => getDailyActivity(items, pointsHistory, 30), [items, pointsHistory])
  const dueProjection    = useMemo(() => getDueProjection(items), [items])
  const exposureDist     = useMemo(() => getExposureDistribution(items), [items])
  const typeBreakdown    = useMemo(() => getTypeBreakdown(items), [items])
  const posBreakdown     = useMemo(() => getPartOfSpeechBreakdown(items), [items])
  const insights         = useMemo(() => getInsights(items, { streakDays, challengeCompletions, points }, usesThisWeek), [items, streakDays, challengeCompletions, points, usesThisWeek])

  const unlockedIds = useMemo(() => new Set(badges.map((b) => b.id)), [badges])
  const allBadgesWithState = useMemo<(typeof ALL_BADGES[0] & { locked: boolean })[]>(
    () => ALL_BADGES.map((def) => {
      const unlocked = badges.find((b) => b.id === def.id)
      return unlocked ? { ...unlocked, locked: false } : { ...def, locked: true }
    }),
    [badges],
  )

  const gamificationState = useMemo(
    () => ({ points, streakDays, challengeCompletions }),
    [points, streakDays, challengeCompletions],
  )

  // ── Onboarding check ────────────────────────────────────────────────────────
  const hasStartedLearning = useMemo(
    () => items.some((i) => i.status !== 'inbox'),
    [items],
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Progress</h1>
      </div>

      {/* ── Onboarding banner ─────────────────────────────────────────────────── */}
      {!hasStartedLearning && (
        <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Your journey starts here</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Activate <span className="font-semibold text-brand-700">10–20 words</span> from your Inbox to unlock
                challenge history, streak tracking, and personalised learning insights.
              </p>
              <button
                onClick={() => navigate('/inbox')}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
              >
                Go to Inbox
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overview metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <MetricCard icon={<Zap size={16} className="text-red-500" />}          label="Due now"        value={dueProjection.now}     bg="bg-red-50"     sub="challenge SRS" />
        <MetricCard icon={<Flame size={16} className="text-orange-500" />}     label="Streak"         value={streakDays}             suffix="d"    bg="bg-orange-50" />
        <MetricCard icon={<CheckCircle size={16} className="text-violet-600"/>} label="Mastered"       value={masteredCount}          bg="bg-violet-50" />
        <MetricCard icon={<Trophy size={16} className="text-amber-500" />}     label="Total pts"      value={points}                 bg="bg-amber-50" />
        <MetricCard icon={<TrendingUp size={16} className="text-brand-600" />} label="Uses this week" value={usesThisWeek}           bg="bg-brand-50" />
        <MetricCard icon={<BookOpen size={16} className="text-slate-500" />}   label="Library"        value={items.length}           bg="bg-slate-50" />
      </div>

      {/* ── Due & upcoming ───────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Calendar size={14} />}>
          Challenge SRS — due & upcoming
        </CardTitle>
        <DueProjectionSection
          proj={dueProjection}
          onClickNow={() => navigate('/challenge')}
        />
      </Card>

      {/* ── Activity chart ───────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<TrendingUp size={14} />}>
          Daily activity — last 14 days
        </CardTitle>
        <ActivityChart data={dailyActivity} />
      </Card>

      {/* ── Lifecycle + Exposure side-by-side on desktop ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={<Layers size={14} />}>Vocabulary lifecycle</CardTitle>
          <LifecycleSection items={items} />
          {weakCount > 0 && (
            <p className="text-xs text-red-500 mt-3">
              ⚠ {weakCount} weak item{weakCount !== 1 ? 's' : ''} — low ease score, needs more practice.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Zap size={14} />}>Exposure milestones (0 → 8)</CardTitle>
          <ExposureSection dist={exposureDist} />
        </Card>
      </div>

      {/* ── Category breakdown ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={<BookOpen size={14} />}>By type</CardTitle>
          {typeBreakdown.length > 0 ? (
            <BreakdownList rows={typeBreakdown} linkPrefix="type" />
          ) : (
            <p className="text-xs text-slate-400">No items yet.</p>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Layers size={14} />}>By part of speech</CardTitle>
          {posBreakdown.length > 0 ? (
            <BreakdownList rows={posBreakdown} />
          ) : (
            <p className="text-xs text-slate-400">
              Part of speech data will appear after AI enrichment runs on your items.
            </p>
          )}
        </Card>
      </div>

      {/* ── Challenge stats row ───────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Trophy size={14} />}>Daily challenge</CardTitle>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-brand-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-brand-700">{points}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total pts</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{streakDays}</div>
            <div className="text-xs text-slate-500 mt-0.5">Day streak</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-slate-700">{challengeCompletions}</div>
            <div className="text-xs text-slate-500 mt-0.5">Completed</div>
          </div>
        </div>
      </Card>

      {/* ── Badges ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Trophy size={14} />}>
          Badges{' '}
          <span className="text-slate-400 font-normal ml-1">
            ({unlockedIds.size}/{ALL_BADGES.length})
          </span>
        </CardTitle>
        <BadgeSection
          allBadgesWithState={allBadgesWithState}
          gamification={gamificationState}
        />
      </Card>

      {/* ── Goal widget ───────────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Target size={14} />}>Learning goal</CardTitle>
        <GoalWidget
          masteredCount={masteredCount}
          goalTarget={goalTarget}
          goalDeadline={goalDeadline}
          onSave={setGoal}
        />
      </Card>

      {/* ── Actionable insights ───────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">What's next?</h2>
          </div>
          <InsightsPanel insights={insights} />
        </div>
      )}

    </div>
  )
}
