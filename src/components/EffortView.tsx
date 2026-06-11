/**
 * EffortView — the "Effort" tab of the Progress page (Progress & Effort).
 *
 * Answers three questions, calmly and at a glance:
 *   1. Am I showing up consistently?   → practice time + consistency
 *   2. Am I actively progressing?      → learning-progress trend
 *   3. How far am I from full mastery?  → the north-star ring
 *
 * CLAUDE.md compliance:
 *   • Objective effort and progress state only — time on task, words advanced,
 *     exposure toward mastery. No points/XP/score/streak language.
 *   • Internal numeric aggregates ("advancement") are surfaced as "learning
 *     progress" / "mastery growth" — never as a score.
 *   • Bespoke SVG charts matching the existing StatsPage aesthetic (no new dep).
 *   • Colour reinforces meaning but every figure has a text label (a11y).
 */

import { useMemo } from 'react'
import type { PracticeSession } from '@/lib/practice'
import {
  buildDailyBuckets,
  computePracticeMetrics,
  distributionByActivity,
  withRollingAverage,
  formatDuration,
  type DayBucket,
} from '@/lib/practiceAnalytics'
import { activityColor } from '@/lib/practice'
import { getMasteryProgress } from '@/lib/statsLogic'
import { ExposureHistogram } from '@/components/ExposureHistogram'
import { PracticeTimeChart } from '@/components/PracticeTimeChart'
import type { VocabItem } from '@/types/vocabulary'

// ── Palette ──────────────────────────────────────────────────────────────────────

const EFFORT_COLOR = '#0ea5e9'   // sky-500   — time / effort
const GROWTH_COLOR = '#10b981'   // emerald-500 — learning progress
const MASTERY_COLOR = '#8b5cf6'  // violet-500 — mastery north-star

// ── Section header (mirrors StatsPage analytics headers) ──────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// ── Summary cards (Part 5) ────────────────────────────────────────────────────────

interface SummaryCard {
  label: string
  value: string
  sub?: string
  accent?: string
}

function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, sub, accent }) => (
        <div key={label} className="py-4 px-3 rounded-2xl bg-slate-50">
          <div
            className="text-2xl font-light tabular-nums"
            style={{ color: accent ?? '#1e293b' }}
          >
            {value}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 leading-tight font-medium">{label}</div>
          {sub && <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Mastery north-star ring (Part 3) ──────────────────────────────────────────────

interface MasteryNorthStarProps {
  percent: number
  earned: number
  totalPossible: number
  remaining: number
  wordCount: number
}

function MasteryNorthStar({ percent, earned, totalPossible, remaining, wordCount }: MasteryNorthStarProps) {
  const SIZE = 220
  const STROKE = 18
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * C
  const cx = SIZE / 2
  const cy = SIZE / 2

  return (
    <div>
      <SectionHeader
        title="Vocabulary mastery"
        subtitle="Your north star — total challenge progress across the whole library"
      />

      {totalPossible === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Add words to your library to start your mastery journey.
        </p>
      ) : (
        <div className="flex flex-col items-center">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full max-w-[220px]"
            role="img"
            aria-label={`Vocabulary mastery ${percent}% — ${earned} of ${totalPossible} progress reached`}
          >
            <defs>
              <linearGradient id="mastery-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={MASTERY_COLOR} />
                <stop offset="100%" stopColor={GROWTH_COLOR} />
              </linearGradient>
            </defs>

            {/* Track */}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {/* Progress arc — starts at 12 o'clock */}
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="url(#mastery-grad)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash.toFixed(2)} ${(C - dash).toFixed(2)}`}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />

            <text
              x={cx} y={cy - 2}
              textAnchor="middle"
              fontSize="44" fontWeight="300" fill="#334155"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {percent}%
            </text>
            <text
              x={cx} y={cy + 22}
              textAnchor="middle"
              fontSize="11" fill="#94a3b8"
              letterSpacing="0.1em"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              MASTERED
            </text>
          </svg>

          {/* Numeric breakdown */}
          <div className="mt-5 grid grid-cols-3 gap-2 w-full text-center">
            {[
              { label: 'Reached', value: earned.toLocaleString(), color: GROWTH_COLOR },
              { label: 'Remaining', value: remaining.toLocaleString(), color: '#94a3b8' },
              { label: 'Total possible', value: totalPossible.toLocaleString(), color: '#334155' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-slate-50 py-3">
                <div className="text-lg font-light tabular-nums" style={{ color }}>{value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Each of your {wordCount.toLocaleString()} words can reach 8 through challenges. Real-life use carries them the rest of the way.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Generic daily bar chart (Part 1A / Part 2A) ───────────────────────────────────

interface DailyBarChartProps {
  buckets: DayBucket[]
  /** Which metric to plot. */
  metric: 'secs' | 'advancement'
  color: string
  /** Optional rolling-average overlay line (same units as the metric). */
  averages?: number[]
  /** Format a value for the tooltip / aria. */
  formatValue: (v: number) => string
  /** Y-axis tick formatter. */
  formatTick: (v: number) => string
}

function DailyBarChart({ buckets, metric, color, averages, formatValue, formatTick }: DailyBarChartProps) {
  const n = buckets.length
  const values = buckets.map((b) => (metric === 'secs' ? b.secs : b.advancement))
  const maxVal = Math.max(...values, averages ? Math.max(...averages) : 0, 1)

  const hasData = values.some((v) => v > 0)

  const VBW = 480
  const VBH = 120
  const PL = 30, PR = 8, PT = 8, PB = 18
  const plotW = VBW - PL - PR
  const plotH = VBH - PT - PB
  const slot = plotW / n
  const barW = Math.max(2, slot * 0.62)

  const toX = (i: number) => PL + i * slot + (slot - barW) / 2
  const toY = (v: number) => PT + plotH - (v / maxVal) * plotH

  const yTicks = [0, maxVal / 2, maxVal]
  // Show ~6 evenly spaced date labels
  const labelEvery = Math.ceil(n / 6)

  const linePath =
    averages && averages.length === n
      ? averages
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(toX(i) + barW / 2).toFixed(1)} ${toY(v).toFixed(1)}`)
          .join(' ')
      : null

  if (!hasData) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Your daily activity will appear here as you practise.
      </p>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      className="w-full"
      style={{ height: 120 }}
      role="img"
      aria-label={`Daily ${metric === 'secs' ? 'practice time' : 'learning progress'} over the last ${n} days`}
    >
      {/* Gridlines + y labels */}
      {yTicks.map((tick) => {
        const y = toY(tick)
        return (
          <g key={tick}>
            <line x1={PL} y1={y} x2={VBW - PR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PL - 4} y={y + 3} textAnchor="end" fontSize="7.5" fill="#cbd5e1"
              fontFamily="system-ui,-apple-system,sans-serif">
              {formatTick(tick)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {buckets.map((b, i) => {
        const v = values[i]
        const y = toY(v)
        const h = v > 0 ? PT + plotH - y : 0
        return (
          <g key={b.dateKey}>
            <rect
              x={toX(i)} y={y} width={barW} height={h} rx={1.5}
              fill={color} opacity={0.85}
            >
              <title>{`${b.label}: ${formatValue(v)}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text
                x={toX(i) + barW / 2} y={VBH - 5}
                textAnchor="middle" fontSize="7" fill="#94a3b8"
                fontFamily="system-ui,-apple-system,sans-serif"
              >
                {b.label.split(' ')[0]}
              </text>
            )}
          </g>
        )
      })}

      {/* Rolling-average overlay */}
      {linePath && (
        <path d={linePath} fill="none" stroke="#334155" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
      )}
    </svg>
  )
}

// ── Practice distribution by activity (Part 1B) ───────────────────────────────────

function ActivityDistribution({
  shares,
}: {
  shares: ReturnType<typeof distributionByActivity>
}) {
  if (shares.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Once you practise across activities, your time split appears here.
      </p>
    )
  }

  return (
    <div>
      {/* Stacked bar */}
      <div
        className="flex w-full rounded-full overflow-hidden mb-4"
        style={{ height: 12 }}
        role="img"
        aria-label="Practice time split by activity"
      >
        {shares.map((s) => (
          <div
            key={s.activity}
            style={{ width: `${s.pct}%`, backgroundColor: activityColor(s.activity) }}
            title={`${s.label}: ${s.pct}%`}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="space-y-2.5">
        {shares.map((s) => (
          <div key={s.activity} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activityColor(s.activity) }}
                aria-hidden="true"
              />
              <span className="text-sm text-slate-600">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-slate-400">{formatDuration(s.secs)}</span>
              <span className="font-medium text-slate-700 tabular-nums w-9 text-right">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────

interface EffortViewProps {
  sessions: PracticeSession[]
  /** Non-archived library items, for the mastery north-star + distribution. */
  items: VocabItem[]
}

export function EffortView({ sessions, items }: EffortViewProps) {
  const now = useMemo(() => new Date(), [])

  const metrics = useMemo(() => computePracticeMetrics(sessions, now), [sessions, now])
  const mastery = useMemo(() => getMasteryProgress(items), [items])
  const distribution = useMemo(() => distributionByActivity(sessions), [sessions])

  const timeBuckets = useMemo(() => buildDailyBuckets(sessions, 30, now), [sessions, now])
  const progressBuckets = timeBuckets // same range; reused
  const progressRolling = useMemo(
    () => withRollingAverage(progressBuckets, 'advancement', 7),
    [progressBuckets],
  )
  const progressAverages = useMemo(() => progressRolling.map((p) => p.avg), [progressRolling])

  const summaryCards: SummaryCard[] = [
    { label: "Today's practice", value: formatDuration(metrics.todaySecs), accent: EFFORT_COLOR },
    { label: '7-day daily average', value: formatDuration(metrics.avgDailySecs7d), sub: `${formatDuration(metrics.weekSecs)} this week` },
    { label: 'Progress today', value: metrics.todayAdvancement.toLocaleString(), sub: 'words advanced', accent: GROWTH_COLOR },
    { label: 'Vocabulary mastery', value: `${mastery.percent}%`, accent: MASTERY_COLOR },
  ]

  return (
    <div className="space-y-12 mt-6">
      {/* Part 5 — summary cards */}
      <SummaryCards cards={summaryCards} />

      {/* Part 3 — north-star ring */}
      <MasteryNorthStar
        percent={mastery.percent}
        earned={mastery.earned}
        totalPossible={mastery.totalPossible}
        remaining={mastery.remaining}
        wordCount={mastery.wordCount}
      />

      {/* Part 4 — mastery distribution across levels (your progress so far) */}
      <div>
        <SectionHeader
          title="Your progress across levels"
          subtitle="Every word you've moved off level 0 is progress — here's the whole picture, 0 → 8 and mastered"
        />
        <ExposureHistogram items={items} />
      </div>

      {/* Part 1A — daily practice time dynamics */}
      <div>
        <SectionHeader
          title="Daily practice time"
          subtitle="Tap any day to inspect · orange line = 14-day median"
        />
        <PracticeTimeChart sessions={sessions} />
      </div>

      {/* Part 1B — practice distribution */}
      <div>
        <SectionHeader title="Where your time goes" subtitle="Time split across practice activities" />
        <ActivityDistribution shares={distribution} />
      </div>

      {/* Part 2A/B — learning progress trend + 7-day average line */}
      <div>
        <SectionHeader
          title="Learning progress"
          subtitle="Words advanced per day with a 7-day trend line"
        />
        <DailyBarChart
          buckets={progressBuckets}
          metric="advancement"
          color={GROWTH_COLOR}
          averages={progressAverages}
          formatValue={(v) => `${Math.round(v).toLocaleString()} advanced`}
          formatTick={(v) => `${Math.round(v)}`}
        />
      </div>
    </div>
  )
}
