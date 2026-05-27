/**
 * StatsPage.tsx — Phase 1 Progress Page
 *
 * A reflective, emotionally meaningful view of the learner's vocabulary journey.
 * This page answers: "What does my learning look like right now?"
 *
 * Architecture:
 *   1. HeadlineSection   — hero metric + context-aware headline
 *   2. MomentumTrail     — 90-day SVG activity waveform
 *   3. StageSpectrum     — proportional stage distribution bar
 *   4. ActivationSpotlight — words ready for real-life use
 *   5. DeepInsights      — collapsed detailed analytics
 *
 * Design principles:
 *   • Show state, not scores
 *   • No streaks framed as pressure
 *   • Calm, typographic — not dashboard
 *   • Emotional hierarchy over information density
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ArrowRight, Target } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import {
  getStageDistribution,
  getAliveVocabCount,
  getActivateStageItems,
  get90DayActivity,
  buildProgressHeadline,
  relativeTime,
  type StageDistribution,
} from '@/lib/progressPageLogic'
import {
  getMasteredWordsCount,
  getConfidenceDistribution,
  getUsageLogsThisWeek,
} from '@/lib/statsLogic'
import { DisplayStage } from '@/lib/progressionLogic'

// ── Stage colour palette ───────────────────────────────────────────────────────

const STAGE_COLOR: Record<DisplayStage, string> = {
  new:        '#94a3b8',   // slate-400
  introduced: '#38bdf8',   // sky-400
  drilling:   '#fbbf24',   // amber-400
  activate:   '#a78bfa',   // violet-400
  mastered:   '#10b981',   // emerald-500
}

const STAGE_LABEL: Record<DisplayStage, string> = {
  new:        'New',
  introduced: 'Introduced',
  drilling:   'Drilling',
  activate:   'Activate',
  mastered:   'Mastered',
}

const STAGE_ORDER: DisplayStage[] = ['new', 'introduced', 'drilling', 'activate', 'mastered']

// ── Section 1: Headline ────────────────────────────────────────────────────────

interface HeadlineSectionProps {
  aliveCount: number
  main: string
  sub: string
}

function HeadlineSection({ aliveCount, main, sub }: HeadlineSectionProps) {
  return (
    <div className="pt-8 pb-4 px-1">
      {/* Hero number */}
      <div
        className="text-6xl font-extralight tracking-tight text-slate-800 leading-none"
        aria-label={`${aliveCount} words in your active vocabulary`}
      >
        {aliveCount.toLocaleString()}
      </div>
      <div className="mt-1 text-sm font-medium text-emerald-600 uppercase tracking-widest">
        alive in your vocabulary
      </div>

      {/* Headline */}
      <p className="mt-5 text-2xl font-light text-slate-700 leading-snug max-w-sm">
        {main}
      </p>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed">
        {sub}
      </p>
    </div>
  )
}

// ── Section 2: Momentum Trail ──────────────────────────────────────────────────

interface MomentumTrailProps {
  pointsHistory: Record<string, number>
}

function MomentumTrail({ pointsHistory }: MomentumTrailProps) {
  const dots = useMemo(() => get90DayActivity(pointsHistory), [pointsHistory])

  // Normalize bar heights — max points in window → full height bar
  const maxPts = Math.max(...dots.map((d) => d.points), 1)
  const W = 900
  const H = 56
  const barW = Math.floor(W / dots.length) - 1   // ~9 px gap between bars

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          90-day activity
        </span>
        <span className="text-xs text-slate-300">today →</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full rounded-sm"
        style={{ height: 40 }}
        aria-label="90-day learning activity trail"
        role="img"
      >
        {dots.map((dot, i) => {
          const x = i * (barW + 1)
          const heightFraction = dot.active ? Math.max(0.25, dot.points / maxPts) : 0.08
          const barH = Math.round(H * heightFraction)
          const y = H - barH
          return (
            <rect
              key={dot.dateKey}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={1}
              fill={dot.active ? '#fbbf24' : '#e2e8f0'}
              aria-label={dot.active ? `${dot.label}: ${dot.points} pts` : dot.label}
            />
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-slate-300">
        Each bar is one day. Gold = challenge activity.
      </p>
    </div>
  )
}

// ── Section 3: Stage Spectrum ──────────────────────────────────────────────────

interface StageSpectrumProps {
  distribution: StageDistribution
}

function StageSpectrum({ distribution }: StageSpectrumProps) {
  const total = STAGE_ORDER.reduce((s, k) => s + distribution[k], 0)
  if (total === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          stage distribution
        </span>
        <span className="text-xs text-slate-400">{total} words</span>
      </div>

      {/* Proportional bar */}
      <div
        className="flex w-full rounded-full overflow-hidden"
        style={{ height: 10 }}
        role="img"
        aria-label="Stage distribution bar"
      >
        {STAGE_ORDER.map((stage) => {
          const count = distribution[stage]
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={stage}
              style={{ width: `${pct}%`, backgroundColor: STAGE_COLOR[stage] }}
              title={`${STAGE_LABEL[stage]}: ${count}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {STAGE_ORDER.map((stage) => {
          const count = distribution[stage]
          if (count === 0) return null
          return (
            <div key={stage} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STAGE_COLOR[stage] }}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-500">
                {STAGE_LABEL[stage]}
              </span>
              <span className="text-xs font-medium text-slate-700">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section 4: Activation Spotlight ───────────────────────────────────────────

interface WordJourneyCardProps {
  term: string
  daysKnown: number
  createdAt: string
  onNavigate: () => void
}

function WordJourneyCard({ term, daysKnown, createdAt, onNavigate }: WordJourneyCardProps) {
  return (
    <button
      onClick={onNavigate}
      className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl hover:bg-violet-100 transition-colors text-left group"
    >
      <div>
        <div className="font-medium text-slate-800 text-sm">{term}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Known for {daysKnown} day{daysKnown !== 1 ? 's' : ''} · added {relativeTime(createdAt)}
        </div>
      </div>
      <ArrowRight
        size={14}
        className="text-violet-400 group-hover:text-violet-600 flex-shrink-0 ml-3 transition-colors"
        aria-hidden="true"
      />
    </button>
  )
}

interface ActivationSpotlightProps {
  items: ReturnType<typeof getActivateStageItems>
  allItems: Array<{ id: string; createdAt: string }>
  onNavigate: (id: string) => void
}

function ActivationSpotlight({ items, allItems, onNavigate }: ActivationSpotlightProps) {
  const visible = items.slice(0, 5)

  const createdAtById = useMemo(() => {
    const map = new Map<string, string>()
    for (const i of allItems) map.set(i.id, i.createdAt)
    return map
  }, [allItems])

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          ready to use in real life
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          These words are fully drilled. The next step happens outside the app.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 py-5 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <p className="text-sm text-slate-400">
            No words at the Activate stage yet.
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Keep practising — Activate appears after 8 challenge exposures.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <WordJourneyCard
              key={item.id}
              term={item.term}
              daysKnown={item.daysKnown}
              createdAt={createdAtById.get(item.id) ?? new Date().toISOString()}
              onNavigate={() => onNavigate(item.id)}
            />
          ))}
          {items.length > 5 && (
            <p className="text-xs text-slate-400 text-center pt-1">
              + {items.length - 5} more waiting
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Section 5: Deep Insights (collapsed) ──────────────────────────────────────

interface GoalWidgetProps {
  masteredCount: number
  goalTarget: number
  goalStartDate: string
  goalDeadline: string
}

function GoalWidget({ masteredCount, goalTarget, goalStartDate, goalDeadline }: GoalWidgetProps) {
  const gp = useMemo(() => {
    const msLeft = new Date(goalDeadline).getTime() - Date.now()
    const totalMs = Math.max(new Date(goalDeadline).getTime() - new Date(goalStartDate).getTime(), 1)
    const elapsed = Math.max(0, Math.min(Date.now() - new Date(goalStartDate).getTime(), totalMs))
    const percentTimeElapsed = Math.round((elapsed / totalMs) * 100)
    const expectedByToday = Math.round((elapsed / totalMs) * goalTarget)
    const percentComplete = goalTarget > 0 ? Math.min(100, Math.round((masteredCount / goalTarget) * 100)) : 0
    const weeksLeft = msLeft / (7 * 24 * 60 * 60 * 1000)
    const remaining = Math.max(0, goalTarget - masteredCount)
    const wordsPerWeekNeeded = weeksLeft > 0.1 ? Math.ceil(remaining / weeksLeft) : remaining
    return {
      percentComplete,
      percentTimeElapsed,
      expectedByToday,
      isOnTrack: masteredCount >= expectedByToday,
      wordsPerWeekNeeded: Math.max(0, wordsPerWeekNeeded),
      remaining,
      weeksLeft: Math.max(0, Math.ceil(weeksLeft)),
    }
  }, [masteredCount, goalTarget, goalStartDate, goalDeadline])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
          <Target size={12} aria-hidden="true" />
          Mastery goal
        </div>
        <span className="text-xs text-slate-400">
          {masteredCount} / {goalTarget.toLocaleString()} words
        </span>
      </div>

      {/* Dual progress bar */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        {/* Time elapsed (background) */}
        <div
          className="absolute inset-y-0 left-0 bg-slate-200 rounded-full"
          style={{ width: `${gp.percentTimeElapsed}%` }}
          title={`${gp.percentTimeElapsed}% of time elapsed`}
        />
        {/* Words mastered (foreground) */}
        <div
          className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all"
          style={{ width: `${gp.percentComplete}%` }}
          title={`${gp.percentComplete}% of goal reached`}
          role="progressbar"
          aria-valuenow={gp.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${gp.percentComplete}% of mastery goal`}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span
          className={gp.isOnTrack ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}
        >
          {gp.isOnTrack ? 'On track' : 'Behind pace'}
        </span>
        <span>
          {gp.weeksLeft > 0
            ? `${gp.wordsPerWeekNeeded}/week needed · ${gp.weeksLeft}w left`
            : 'Goal deadline passed'}
        </span>
      </div>
    </div>
  )
}

interface ConfidenceBarProps {
  label: string
  count: number
  total: number
  color: string
}

function ConfidenceBar({ label, count, total, color }: ConfidenceBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  )
}

interface DeepInsightsProps {
  items: import('@/types/vocabulary').VocabItem[]
  gamification: {
    points: number
    streakDays: number
    challengeCompletions: number
    goalTarget: number
    goalStartDate: string
    goalDeadline: string
  }
  usesThisWeek: number
}

function DeepInsights({ items, gamification, usesThisWeek }: DeepInsightsProps) {
  const [open, setOpen] = useState(false)
  const masteredCount = useMemo(() => getMasteredWordsCount(items), [items])
  const confidence = useMemo(() => getConfidenceDistribution(items), [items])
  const confTotal = confidence.unset + confidence.red + confidence.yellow + confidence.green

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
          Detailed insights
        </span>
        {open
          ? <ChevronUp size={14} className="text-slate-400" aria-hidden="true" />
          : <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
        }
      </button>

      {open && (
        <div className="px-4 py-5 space-y-8 bg-white">

          {/* Goal progress */}
          <GoalWidget
            masteredCount={masteredCount}
            goalTarget={gamification.goalTarget}
            goalStartDate={gamification.goalStartDate}
            goalDeadline={gamification.goalDeadline}
          />

          {/* Confidence distribution */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              Self-reported confidence
            </h3>
            <p className="text-xs text-slate-400">
              How comfortable do you feel using these words naturally?
            </p>
            <div className="space-y-2.5">
              <ConfidenceBar label="Comfortable (green)" count={confidence.green}  total={confTotal} color="#10b981" />
              <ConfidenceBar label="Prompted (yellow)"   count={confidence.yellow} total={confTotal} color="#fbbf24" />
              <ConfidenceBar label="Recognise (red)"     count={confidence.red}    total={confTotal} color="#f87171" />
              <ConfidenceBar label="Not assessed"         count={confidence.unset}  total={confTotal} color="#cbd5e1" />
            </div>
          </div>

          {/* Challenge stats */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              Challenge activity
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Completions', value: gamification.challengeCompletions },
                { label: 'Total points', value: gamification.points },
                { label: 'Uses this week', value: usesThisWeek },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-light text-slate-700">{value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function StatsPage() {
  const navigate = useNavigate()
  const items    = useVocabStore((s) => s.items)
  const {
    pointsHistory,
    points,
    streakDays,
    challengeCompletions,
    goalTarget,
    goalStartDate,
    goalDeadline,
  } = useGamificationStore()

  const nonArchived     = useMemo(() => items.filter((i) => !i.archived), [items])
  const stageDistrib    = useMemo(() => getStageDistribution(nonArchived), [nonArchived])
  const aliveCount      = useMemo(() => getAliveVocabCount(nonArchived), [nonArchived])
  const masteredCount   = useMemo(() => getMasteredWordsCount(nonArchived), [nonArchived])
  const activateItems   = useMemo(() => getActivateStageItems(nonArchived), [nonArchived])
  const usesThisWeek    = useMemo(() => getUsageLogsThisWeek(nonArchived), [nonArchived])

  const headline = useMemo(() => buildProgressHeadline({
    aliveCount,
    masteredCount,
    activateCount: stageDistrib.activate,
    totalInLibrary: nonArchived.length,
    stageDistribution: stageDistrib,
    usesThisWeek,
    streakDays,
  }), [aliveCount, masteredCount, stageDistrib, nonArchived.length, usesThisWeek, streakDays])

  const gamification = {
    points,
    streakDays,
    challengeCompletions,
    goalTarget,
    goalStartDate,
    goalDeadline,
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 space-y-10">

      {/* 1. Headline + hero metric */}
      <HeadlineSection
        aliveCount={aliveCount}
        main={headline.main}
        sub={headline.sub}
      />

      {/* 2. 90-day momentum trail */}
      <MomentumTrail pointsHistory={pointsHistory} />

      {/* 3. Stage distribution spectrum */}
      <StageSpectrum distribution={stageDistrib} />

      {/* 4. Activation spotlight */}
      <ActivationSpotlight
        items={activateItems}
        allItems={nonArchived}
        onNavigate={(id) => navigate(`/library/${id}`)}
      />

      {/* 5. Deep insights (collapsed) */}
      <DeepInsights
        items={nonArchived}
        gamification={gamification}
        usesThisWeek={usesThisWeek}
      />

    </div>
  )
}
