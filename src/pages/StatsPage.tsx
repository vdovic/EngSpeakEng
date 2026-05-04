import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, CheckCircle, Zap, BookOpen, Target,
  Lightbulb, TrendingUp, Trophy, Info, AlertTriangle, Layers,
  Calendar, ChevronRight, Star, ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore, ALL_BADGES, BADGE_THRESHOLDS } from '@/store/gamificationStore'
import { isWeak } from '@/lib/srs'
import { Badge, BadgeId, Level, VocabItem } from '@/types/vocabulary'
import {
  getDailyActivity,
  getDueProjection,
  getTypeBreakdown,
  getPartOfSpeechBreakdown,
  getInsights,
} from '@/utils/stats'
import {
  LearningGoal,
  getGoalProgress,
  getLevelDistribution,
  getExposureDistribution,
  getStartedWordsCount,
  getMasteredWordsCount,
  getInProgressWordsCount,
  getFocusWordsCount,
  getActivatedCount,
  getUsageLogsThisWeek,
  getContextBreakdown,
  getHighExposureNoUsage,
  ExposureBand,
} from '@/lib/statsLogic'

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

// ── Top summary stat cards (2×2 grid) ────────────────────────────────────────

function SummaryCard({
  icon, label, value, color, sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string   // tailwind bg class
  sub?: string
}) {
  return (
    <div className={`${color} rounded-2xl p-4`}>
      <div className="mb-2 opacity-75">{icon}</div>
      <div className="text-3xl font-bold text-slate-900 leading-none">{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Goal widget ───────────────────────────────────────────────────────────────

function GoalWidget({
  items,
  goal,
  onSave,
}: {
  items: VocabItem[]
  goal: LearningGoal
  onSave: (target: number, endDate: string, startDate: string) => void
}) {
  const [editing, setEditing]           = useState(false)
  const [draftTarget, setDraftTarget]   = useState(String(goal.targetWords))
  const [draftStart, setDraftStart]     = useState(goal.startDate)
  const [draftEnd, setDraftEnd]         = useState(goal.endDate)

  const prog = useMemo(() => getGoalProgress(items, goal), [items, goal])

  function openEdit() {
    setDraftTarget(String(goal.targetWords))
    setDraftStart(goal.startDate)
    setDraftEnd(goal.endDate)
    setEditing(true)
  }

  function save() {
    const t = Math.max(1, parseInt(draftTarget, 10) || goal.targetWords)
    onSave(t, draftEnd, draftStart)
    setEditing(false)
  }

  const onTrackColor = prog.isOnTrack ? 'text-emerald-700' : 'text-amber-700'
  const onTrackBg    = prog.isOnTrack ? 'bg-emerald-50'    : 'bg-amber-50'
  const barColor     = prog.isOnTrack ? 'bg-emerald-500'   : 'bg-amber-500'

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <label className="text-xs font-medium text-slate-500 block mb-1">Start date</label>
            <input
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">End date</label>
            <input
              type="date"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
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
    )
  }

  return (
    <div className="space-y-4">
      {/* Main number */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-4xl font-extrabold text-brand-700">{prog.masteredWords}</span>
          <span className="text-lg text-slate-400 ml-1">/ {prog.targetWords}</span>
          <div className="text-xs text-slate-500 mt-0.5">words mastered</div>
        </div>
        <button
          onClick={openEdit}
          className="shrink-0 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Edit goal
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>{prog.percentComplete}% mastered</span>
          <span>{prog.percentTimeElapsed}% time used</span>
        </div>
        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          {/* Time elapsed marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${Math.min(prog.percentTimeElapsed, 100)}%` }}
          />
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(prog.percentComplete, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          ▎ = expected position today ({prog.expectedMasteredByToday} words)
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-lg font-bold text-slate-800">{prog.percentComplete}%</div>
          <div className="text-[10px] text-slate-500">Complete</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5">
          <div className="text-lg font-bold text-slate-800">{prog.wordsPerWeekNeeded}</div>
          <div className="text-[10px] text-slate-500">Words/week</div>
        </div>
        <div className={`${onTrackBg} rounded-xl p-2.5`}>
          <div className={`flex items-center justify-center gap-0.5 text-sm font-bold ${onTrackColor}`}>
            {prog.isOnTrack
              ? <><ArrowUp size={12} /> Ahead</>
              : <><ArrowDown size={12} /> Behind</>
            }
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">vs. schedule</div>
        </div>
      </div>

      {/* Dates */}
      <p className="text-xs text-slate-400">
        {format(new Date(goal.startDate), 'MMM d, yyyy')} →{' '}
        {format(new Date(goal.endDate), 'MMM d, yyyy')}
      </p>
    </div>
  )
}

// ── Level distribution ────────────────────────────────────────────────────────

const LEVEL_ROWS: { level: Level; label: string; color: string; desc: string }[] = [
  { level: 0, label: 'New',      color: 'bg-slate-400',   desc: 'Not yet encountered' },
  { level: 1, label: 'Learning', color: 'bg-blue-500',    desc: '1–2 exposures' },
  { level: 2, label: 'Familiar', color: 'bg-amber-500',   desc: '3–7 exposures' },
  { level: 3, label: 'Mastered', color: 'bg-violet-500',  desc: '8+ exposures & activation evidence' },
]

function LevelSection({ dist, total }: { dist: Record<Level, number>; total: number }) {
  const max = total || 1
  return (
    <div className="space-y-2.5">
      {LEVEL_ROWS.map(({ level, label, color, desc }) => {
        const count = dist[level] ?? 0
        const pct   = (count / max) * 100
        return (
          <div key={level} className="flex items-center gap-3">
            <div className="w-20 shrink-0">
              <div className="text-xs font-semibold text-slate-700">{label}</div>
              <div className="text-[10px] text-slate-400">{desc}</div>
            </div>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
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

// ── Exposure bands ────────────────────────────────────────────────────────────

const BAND_ROWS: { band: ExposureBand; label: string; color: string }[] = [
  { band: '0',   label: 'Not started (0)',    color: 'bg-slate-300'  },
  { band: '1-2', label: 'Early (1–2)',        color: 'bg-blue-400'   },
  { band: '3-7', label: 'Progressing (3–7)', color: 'bg-indigo-400' },
  { band: '8',   label: 'Complete (8)',       color: 'bg-emerald-500'},
]

function ExposureBandSection({ dist }: { dist: Record<ExposureBand, number> }) {
  const max = Math.max(...Object.values(dist), 1)
  return (
    <div className="space-y-2">
      {BAND_ROWS.map(({ band, label, color }) => {
        const count = dist[band] ?? 0
        const pct   = (count / max) * 100
        return (
          <div key={band} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-600 w-8 text-right shrink-0">{count}</span>
          </div>
        )
      })}
      <p className="text-[10px] text-slate-400 mt-1">
        Complete = 8 challenge steps finished
      </p>
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
        <Bar dataKey="points" name="Challenge pts"  fill="#818cf8" radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="uses"   name="Real-life uses" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={18} />
      </ComposedChart>
    </ResponsiveContainer>
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
    { label: 'Due now',   value: proj.now,       accent: 'text-red-600',   bg: 'bg-red-50',   action: true  },
    { label: 'Tomorrow',  value: proj.oneDay,     accent: 'text-amber-600', bg: 'bg-amber-50', action: false },
    { label: 'In 3 days', value: proj.threeDays,  accent: 'text-blue-600',  bg: 'bg-blue-50',  action: false },
    { label: 'This week', value: proj.oneWeek,    accent: 'text-slate-700', bg: 'bg-slate-50', action: false },
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

function BreakdownList({
  rows, linkPrefix,
}: {
  rows: ReturnType<typeof getTypeBreakdown>
  linkPrefix?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center gap-2 ${linkPrefix ? 'cursor-pointer group' : ''}`}
          onClick={
            linkPrefix
              ? () => navigate(`/library?${linkPrefix}=${row.label.toLowerCase()}`)
              : undefined
          }
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
          <span
            className={`text-xs text-slate-600 flex-1 ${
              linkPrefix ? 'group-hover:text-brand-600 transition-colors' : ''
            }`}
          >
            {row.label}
          </span>
          <div className="flex-[2] h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${row.pct}%`, background: row.color }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-7 text-right shrink-0">
            {row.count}
          </span>
          <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">{row.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────

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
        const current   = threshold
          ? threshold.metric === 'points'  ? gamification.points
          : threshold.metric === 'streak'  ? gamification.streakDays
          : gamification.challengeCompletions
          : 0
        const target = threshold?.target ?? 1
        const pct    = Math.min(100, Math.round((current / target) * 100))

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
              <ProgressBar
                pct={pct}
                color={b.locked ? 'bg-slate-300' : 'bg-amber-400'}
                height="h-1.5"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Insights ──────────────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: ReturnType<typeof getInsights> }) {
  if (insights.length === 0) return null

  const style = {
    info:    { bg: 'bg-blue-50',    border: 'border-blue-100',    icon: <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />,          text: 'text-blue-800'    },
    warn:    { bg: 'bg-amber-50',   border: 'border-amber-100',   icon: <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />, text: 'text-amber-800'   },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />, text: 'text-emerald-800' },
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
  const items    = useVocabStore((s) => s.items)
  const {
    points, streakDays, challengeCompletions, badges,
    pointsHistory, goalTarget, goalStartDate, goalDeadline, setGoal,
  } = useGamificationStore()

  // ── Derived summary counts ────────────────────────────────────────────────
  const startedCount    = useMemo(() => getStartedWordsCount(items),    [items])
  const masteredCount   = useMemo(() => getMasteredWordsCount(items),   [items])
  const inProgressCount = useMemo(() => getInProgressWordsCount(items), [items])
  const focusCount      = useMemo(() => getFocusWordsCount(items),      [items])
  const weakCount       = useMemo(() => items.filter((i) => isWeak(i.review.ease, i.review.reviewCount)).length, [items])

  // ── Goal ──────────────────────────────────────────────────────────────────
  const goal = useMemo<LearningGoal>(
    () => ({
      targetWords: goalTarget,
      startDate:   goalStartDate ?? new Date().toISOString().slice(0, 10),
      endDate:     goalDeadline,
    }),
    [goalTarget, goalStartDate, goalDeadline],
  )

  // ── Distribution data ─────────────────────────────────────────────────────
  const levelDist    = useMemo(() => getLevelDistribution(items),    [items])
  const exposureDist = useMemo(() => getExposureDistribution(items), [items])

  // ── Phase-6 real-life usage stats ────────────────────────────────────────
  const activatedCount       = useMemo(() => getActivatedCount(items),                [items])
  const usageLogsThisWeek    = useMemo(() => getUsageLogsThisWeek(items),             [items])
  const contextBreakdown     = useMemo(() => getContextBreakdown(items),              [items])
  const highExpNoUsage       = useMemo(() => getHighExposureNoUsage(items),            [items])
  const topContexts          = useMemo(() => {
    const entries = Object.entries(contextBreakdown) as [string, number][]
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [contextBreakdown])

  // ── Chart / breakdown data ────────────────────────────────────────────────
  const allLogs      = useMemo(() => items.flatMap((i) => i.activation.usageLogs), [items])
  const usesThisWeek = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allLogs.filter((l) => new Date(l.usedAt).getTime() >= since).length
  }, [allLogs])

  const dailyActivity  = useMemo(() => getDailyActivity(items, pointsHistory, 30), [items, pointsHistory])
  const dueProjection  = useMemo(() => getDueProjection(items), [items])
  const typeBreakdown  = useMemo(() => getTypeBreakdown(items), [items])
  const posBreakdown   = useMemo(() => getPartOfSpeechBreakdown(items), [items])
  const insights       = useMemo(
    () => getInsights(items, { streakDays, challengeCompletions, points }, usesThisWeek),
    [items, streakDays, challengeCompletions, points, usesThisWeek],
  )

  // ── Badges ────────────────────────────────────────────────────────────────
  const unlockedIds = useMemo(() => new Set(badges.map((b) => b.id)), [badges])
  const allBadgesWithState = useMemo<(typeof ALL_BADGES[0] & { locked: boolean })[]>(
    () =>
      ALL_BADGES.map((def) => {
        const unlocked = badges.find((b) => b.id === def.id)
        return unlocked ? { ...unlocked, locked: false } : { ...def, locked: true }
      }),
    [badges],
  )

  const gamificationState = useMemo(
    () => ({ points, streakDays, challengeCompletions }),
    [points, streakDays, challengeCompletions],
  )

  const hasStartedLearning = useMemo(() => items.some((i) => i.status !== 'inbox'), [items])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Progress</h1>
      </div>

      {/* Onboarding banner */}
      {!hasStartedLearning && (
        <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Your journey starts here</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Start with <span className="font-semibold text-brand-700">10–20 words</span> from your
                library to unlock challenge history, streak tracking, and personalised learning insights.
              </p>
              <button
                onClick={() => navigate('/library')}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
              >
                Go to Library
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4 summary stat cards (2×2 on mobile, 4-col on desktop) ──────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={<BookOpen size={20} className="text-blue-600" />}
          label="Started"
          value={startedCount}
          color="bg-blue-50"
          sub="exposure > 0"
        />
        <SummaryCard
          icon={<TrendingUp size={20} className="text-amber-600" />}
          label="In Progress"
          value={inProgressCount}
          color="bg-amber-50"
          sub="Level 1–2"
        />
        <SummaryCard
          icon={<CheckCircle size={20} className="text-violet-600" />}
          label="Mastered"
          value={masteredCount}
          color="bg-violet-50"
          sub="Level 3"
        />
        <SummaryCard
          icon={<Star size={20} className="text-orange-500" />}
          label="In Focus"
          value={focusCount}
          color="bg-orange-50"
          sub="active focus"
        />
      </div>

      {/* ── Learning goal (prominent) ──────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Target size={14} />}>Learning goal</CardTitle>
        <GoalWidget
          items={items}
          goal={goal}
          onSave={(target, endDate, startDate) => setGoal(target, endDate, startDate)}
        />
      </Card>

      {/* ── Level distribution ─────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Layers size={14} />}>Level distribution</CardTitle>
        <LevelSection dist={levelDist} total={items.length} />
        {weakCount > 0 && (
          <p className="text-xs text-red-500 mt-3">
            ⚠ {weakCount} weak item{weakCount !== 1 ? 's' : ''} — low ease score, needs more practice.
          </p>
        )}
      </Card>

      {/* ── Exposure bands ─────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Zap size={14} />}>Challenge exposure</CardTitle>
        <ExposureBandSection dist={exposureDist} />
      </Card>

      {/* ── Real-life usage (Phase 6) ───────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<CheckCircle size={14} />}>Real-life usage</CardTitle>

        {/* 3 KPI tiles */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{activatedCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Activated</div>
          </div>
          <div className="bg-brand-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-brand-700">{usageLogsThisWeek}</div>
            <div className="text-xs text-slate-500 mt-0.5">Uses this week</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{highExpNoUsage.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Not yet used</div>
          </div>
        </div>

        {/* Context breakdown */}
        {topContexts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Most used contexts</p>
            <div className="space-y-1.5">
              {topContexts.map(([ctx, count]) => {
                const label: Record<string, string> = {
                  'conversation': 'Conversation', 'meeting': 'Meeting',
                  'work-email': 'Work email', 'writing-practice': 'Writing practice',
                  'note': 'Note', 'reading-listening': 'Heard / read', 'other': 'Other',
                  'speaking': 'Speaking', 'writing': 'Writing',
                }
                const total = Object.values(contextBreakdown).reduce((s, v) => s + (v ?? 0), 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={ctx} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-32 shrink-0">{label[ctx] ?? ctx}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* High-exposure / zero usage warning */}
        {highExpNoUsage.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              ⚡ {highExpNoUsage.length} word{highExpNoUsage.length !== 1 ? 's' : ''} drilled but never used in real life
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              These words have 5+ challenge exposures but zero logged real-life uses. Try using them in your next conversation or email.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {highExpNoUsage.slice(0, 6).map((i) => (
                <span key={i.id} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {i.term}
                </span>
              ))}
              {highExpNoUsage.length > 6 && (
                <span className="text-xs text-amber-500">+{highExpNoUsage.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {activatedCount === 0 && usageLogsThisWeek === 0 && (
          <p className="text-xs text-slate-400 italic mt-2">
            Start logging real-life uses from the word detail page or Daily Challenge to track your activation progress.
          </p>
        )}
      </Card>

      {/* ── Due & upcoming ─────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<Calendar size={14} />}>
          Challenge SRS — due & upcoming
        </CardTitle>
        <DueProjectionSection proj={dueProjection} onClickNow={() => navigate('/challenge')} />
      </Card>

      {/* ── Activity chart ─────────────────────────────────────────────────── */}
      <Card>
        <CardTitle icon={<TrendingUp size={14} />}>Daily activity — last 14 days</CardTitle>
        <ActivityChart data={dailyActivity} />
      </Card>

      {/* ── Challenge stats ────────────────────────────────────────────────── */}
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

      {/* ── Category breakdown ─────────────────────────────────────────────── */}
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

      {/* ── Badges ─────────────────────────────────────────────────────────── */}
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

      {/* ── Insights ───────────────────────────────────────────────────────── */}
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
