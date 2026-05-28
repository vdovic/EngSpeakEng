/**
 * StatsPage.tsx — Phase 1 + 2 + 3 + 4 Progress Page
 *
 * A two-layer experience:
 *
 *   Layer 1 — The Sky (atmospheric, personal, non-analytical)
 *     1. HeadlineSection         — hero metric + context-aware headline
 *     2. VocabularyConstellation — living dark-sky vocabulary map
 *     3. MomentumTrail           — 90-day SVG activity waveform
 *     4. ActivationSpotlight     — words ready for real-life use
 *
 *   Layer 2 — The Observatory (reflective, exploratory, beautiful)
 *     [Journey lens]    GrowthRings + StageSpectrum
 *     [Territory lens]  ThemeTerritory — per-theme word counts + mastery
 *     [Horizon lens]    LongHorizon — growth projection to milestones
 *     [Details lens]    Confidence, goal progress, challenge stats
 *
 * Design principles:
 *   • Show state, not scores
 *   • Observatory answers: "What is true about my learning?"
 *   • Calm, typographic — not a dashboard
 *   • Each lens is collapsed by default; the Sky is always enough
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Target,
  Layers,
  Globe,
  Compass,
  Eye,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemesStore } from '@/store/themesStore'
import {
  getStageDistribution,
  getAliveVocabCount,
  getActivateStageItems,
  get90DayActivity,
  buildProgressHeadline,
  buildConstellationNodes,
  buildGrowthCohorts,
  buildThemeTerritory,
  buildLongHorizon,
  relativeTime,
  type StageDistribution,
  type GrowthCohort,
  type ThemeTerritoryEntry,
  type LongHorizon,
} from '@/lib/progressPageLogic'
import {
  getMasteredWordsCount,
  getConfidenceDistribution,
  getUsageLogsThisWeek,
} from '@/lib/statsLogic'
import type { DisplayStage } from '@/lib/progressionLogic'
import { VocabularyConstellation } from '@/components/VocabularyConstellation'
import { VocabularyLandscape } from '@/components/VocabularyLandscape'
import type { VocabItem } from '@/types/vocabulary'

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

// ── Constellation max-nodes — evaluated once at module load ───────────────────
const CONSTELLATION_MAX_NODES =
  typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 300

// ── SVG helper: annular sector path ───────────────────────────────────────────

/**
 * Generates an SVG path string for an annular (ring) sector.
 * sweepAngle is clamped to just under 2π to avoid degenerate full-circle paths.
 */
function annularSector(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  sweepAngle: number,
): string {
  const sweep    = Math.min(sweepAngle, 2 * Math.PI - 0.0001)
  const endAngle = startAngle + sweep
  const large    = sweep > Math.PI ? 1 : 0
  const f        = (n: number) => n.toFixed(3)

  const x0o = cx + outerR * Math.cos(startAngle)
  const y0o = cy + outerR * Math.sin(startAngle)
  const x1o = cx + outerR * Math.cos(endAngle)
  const y1o = cy + outerR * Math.sin(endAngle)
  const x0i = cx + innerR * Math.cos(startAngle)
  const y0i = cy + innerR * Math.sin(startAngle)
  const x1i = cx + innerR * Math.cos(endAngle)
  const y1i = cy + innerR * Math.sin(endAngle)

  return `M ${f(x0o)} ${f(y0o)} A ${outerR} ${outerR} 0 ${large} 1 ${f(x1o)} ${f(y1o)} L ${f(x1i)} ${f(y1i)} A ${innerR} ${innerR} 0 ${large} 0 ${f(x0i)} ${f(y0i)} Z`
}

// ── Section 1: Headline ────────────────────────────────────────────────────────

interface HeadlineSectionProps {
  /** The large number shown at the top — collection size when nothing is alive yet. */
  heroNumber: number
  /** The caption beneath the hero number. */
  heroLabel: string
  main: string
  sub: string
}

function HeadlineSection({ heroNumber, heroLabel, main, sub }: HeadlineSectionProps) {
  return (
    <div className="pt-8 pb-4 px-1">
      {/* Hero number */}
      <div
        className="text-6xl font-extralight tracking-tight text-slate-800 leading-none"
        aria-label={`${heroNumber} ${heroLabel}`}
      >
        {heroNumber.toLocaleString()}
      </div>
      <div className="mt-1 text-sm font-medium text-emerald-600 uppercase tracking-widest">
        {heroLabel}
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

  const hasActivity = dots.some((d) => d.active)
  const maxPts = Math.max(...dots.map((d) => d.points), 1)
  const W = 900
  const H = 56
  const barW = Math.floor(W / dots.length) - 1

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          90-day activity
        </span>
        {hasActivity && <span className="text-xs text-slate-300">today →</span>}
      </div>
      {!hasActivity && (
        <p className="text-xs text-slate-400 py-1">
          Your activity trail will appear here as you practise.
        </p>
      )}
      {hasActivity && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full rounded-sm"
          style={{ height: 40 }}
          aria-label="90-day learning activity trail"
          role="img"
        >
          {dots.map((dot, i) => {
            const x              = i * (barW + 1)
            const heightFraction = dot.active ? Math.max(0.25, dot.points / maxPts) : 0.08
            const barH           = Math.round(H * heightFraction)
            const y              = H - barH
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
      )}
    </div>
  )
}

// ── Stage Spectrum (used inside the Observatory Journey lens) ──────────────────

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
              <span className="text-xs text-slate-500">{STAGE_LABEL[stage]}</span>
              <span className="text-xs font-medium text-slate-700">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section 3: Activation Spotlight ───────────────────────────────────────────

interface ActivationCardProps {
  term: string
  daysKnown: number
  createdAt: string
  onNavigate: () => void
}

function ActivationCard({ term, daysKnown, createdAt, onNavigate }: ActivationCardProps) {
  return (
    <button
      onClick={onNavigate}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors text-left group"
    >
      <div>
        <div className="font-medium text-slate-800 text-sm">{term}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Known for {daysKnown} day{daysKnown !== 1 ? 's' : ''} · added {relativeTime(createdAt)}
        </div>
      </div>
      <ArrowRight
        size={14}
        className="text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-3 transition-colors"
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
        <p className="text-sm text-slate-400 text-center py-2">
          Words arrive here once they are fully drilled.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <ActivationCard
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

// ── Observatory: Growth Rings ─────────────────────────────────────────────────

function GrowthRings({ cohorts }: { cohorts: GrowthCohort[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const VB = 420
  const cx = 210
  const cy = 210
  const MAX_R  = 190
  const MAX_RINGS = 18

  const { visible, ringData } = useMemo(() => {
    const vis = cohorts.slice(-MAX_RINGS)
    const n   = vis.length
    if (n === 0) return { visible: [] as GrowthCohort[], ringData: [] as Array<{ cohort: GrowthCohort; arcs: Array<{ stage: DisplayStage; path: string }> }> }

    const pitch = MAX_R / n
    const width = pitch * 0.78

    const data = vis.map((cohort, i) => {
      const innerR = 10 + i * pitch
      const outerR = innerR + width
      const arcs: Array<{ stage: DisplayStage; path: string }> = []
      let angle = -Math.PI / 2

      for (const stage of STAGE_ORDER) {
        const count = cohort.distribution[stage]
        if (count === 0) continue
        const sweep = (count / cohort.total) * 2 * Math.PI
        arcs.push({ stage, path: annularSector(cx, cy, innerR, outerR, angle, sweep) })
        angle += sweep
      }

      return { cohort, arcs }
    })

    return { visible: vis, ringData: data }
  }, [cohorts])

  if (visible.length === 0) {
    return (
      <p className="py-5 text-center text-sm text-slate-400">
        Add words to see your vocabulary history.
      </p>
    )
  }

  const totalWords  = cohorts.reduce((s, c) => s + c.total, 0)
  const hoveredEntry = hoveredKey ? ringData.find((d) => d.cohort.monthKey === hoveredKey) : null

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className="w-full"
        style={{ maxHeight: 296 }}
        aria-label="Vocabulary growth rings — each ring represents one month"
        role="img"
      >
        {ringData.map(({ cohort, arcs }) => (
          <g
            key={cohort.monthKey}
            onMouseEnter={() => setHoveredKey(cohort.monthKey)}
            onMouseLeave={() => setHoveredKey(null)}
            style={{ cursor: 'default' }}
          >
            {arcs.map(({ stage, path }) => (
              <path
                key={stage}
                d={path}
                fill={STAGE_COLOR[stage]}
                opacity={hoveredKey === null || hoveredKey === cohort.monthKey ? 0.85 : 0.3}
                style={{ transition: 'opacity 0.2s ease' }}
              />
            ))}
          </g>
        ))}

        {/* Centre label */}
        <text
          x={cx} y={cy + 7}
          textAnchor="middle"
          fontSize="22"
          fontWeight="300"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {totalWords}
        </text>
        <text
          x={cx} y={cy + 23}
          textAnchor="middle"
          fontSize="8"
          fill="#475569"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.12em"
        >
          WORDS
        </text>
      </svg>

      {/* Hover info */}
      <div className="mt-1 text-center" style={{ minHeight: 20 }}>
        {hoveredEntry ? (
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-500">{hoveredEntry.cohort.label}</span>
            {' · '}
            {hoveredEntry.cohort.total} word{hoveredEntry.cohort.total !== 1 ? 's' : ''} added
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {visible[0].label}
            {visible.length > 1 && <> → {visible[visible.length - 1].label}</>}
          </p>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-400 text-center">
        Oldest month at centre · each ring = one month
      </p>
    </div>
  )
}

// ── Observatory: Theme Territory ──────────────────────────────────────────────

function ThemeTerritory({ entries }: { entries: ThemeTerritoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-5 text-center">
        <p className="text-sm text-slate-400">
          Assign words to themes to see your vocabulary territories.
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Open any word in the library and set a theme.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {entries.map((entry) => {
        const pct = (stage: DisplayStage) =>
          entry.total > 0 ? (entry.distribution[stage] / entry.total) * 100 : 0

        return (
          <div key={entry.theme}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-600">{entry.theme}</span>
              <div className="flex items-center gap-2 text-xs">
                {entry.aliveCount > 0 && (
                  <span className="text-emerald-600">{entry.aliveCount} alive</span>
                )}
                <span className="text-slate-400">{entry.total}</span>
              </div>
            </div>
            <div
              className="flex w-full rounded-full overflow-hidden"
              style={{ height: 6 }}
              role="img"
              aria-label={`${entry.theme} stage distribution`}
            >
              {STAGE_ORDER.map((stage) => {
                const p = pct(stage)
                if (p === 0) return null
                return (
                  <div
                    key={stage}
                    style={{ width: `${p}%`, backgroundColor: STAGE_COLOR[stage] }}
                    title={`${STAGE_LABEL[stage]}: ${entry.distribution[stage]}`}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Observatory: Long Horizon ─────────────────────────────────────────────────

function LongHorizonView({ horizon }: { horizon: LongHorizon }) {
  const { currentTotal, weeklyVelocity, milestones } = horizon

  if (currentTotal === 0) {
    return (
      <p className="py-5 text-sm text-center text-slate-400">
        Add words to your library to see your horizon.
      </p>
    )
  }

  const reached   = milestones.filter((m) => m.reached)
  const unreached = milestones.filter((m) => !m.reached)

  if (unreached.length === 0) {
    return (
      <div className="py-5 text-center space-y-1">
        <p className="text-slate-300 text-sm">You've surpassed all milestones.</p>
        <p className="text-slate-500 text-xs">
          {currentTotal.toLocaleString()} words in your library.
        </p>
      </div>
    )
  }

  const VBW = 480
  const VBH = 72
  const startX = 30
  const endX   = 458
  const lineY  = 36

  // Compute x-axis scale from the farthest projected milestone
  const projected = unreached.filter((m) => m.weeksFromNow !== null)
  const maxWeeks = weeklyVelocity > 0 && projected.length > 0
    ? Math.min(156, projected[projected.length - 1].weeksFromNow!)
    : 0

  const toX = (weeks: number) =>
    startX + (weeks / Math.max(maxWeeks, 1)) * (endX - startX)

  // Show up to 5 projected or static milestones
  const dots = weeklyVelocity > 0 ? projected.slice(0, 5) : []
  const staticDots = weeklyVelocity === 0 ? unreached.slice(0, 5) : []
  const staticGap  = staticDots.length > 0 ? (endX - startX) / (staticDots.length + 1) : 0

  return (
    <div>
      {reached.length > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          Already reached:{' '}
          {reached.map((m) => m.target.toLocaleString()).join(', ')} words
        </p>
      )}

      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="w-full"
        style={{ height: 64 }}
        aria-label="Vocabulary growth horizon — projected milestones"
        role="img"
      >
        <defs>
          <linearGradient id="lh-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.75" />
            <stop offset="72%"  stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Horizon line */}
        <line
          x1={startX} y1={lineY} x2={endX} y2={lineY}
          stroke="url(#lh-fade)" strokeWidth="1.5"
        />

        {/* Current position */}
        <circle cx={startX} cy={lineY} r="5" fill="#6366f1" opacity="0.9" />
        <text
          x={startX} y={lineY - 11}
          textAnchor="middle" fontSize="8.5" fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          now
        </text>
        <text
          x={startX} y={lineY + 18}
          textAnchor="middle" fontSize="9" fill="#64748b"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {currentTotal}
        </text>

        {/* Projected milestone dots */}
        {dots.map((m, i) => {
          if (!m.weeksFromNow) return null
          const x     = toX(m.weeksFromNow)
          const fade  = Math.max(0.2, 1 - (i / Math.max(dots.length - 1, 1)) * 0.7)
          const label = m.weeksFromNow < 9
            ? `${m.weeksFromNow}w`
            : `${Math.round(m.weeksFromNow / 4.33)}mo`

          return (
            <g key={m.target} opacity={fade}>
              <circle
                cx={x} cy={lineY} r="4"
                fill="none" stroke="#6366f1" strokeWidth="1.5"
              />
              <text
                x={x} y={lineY - 11}
                textAnchor="middle" fontSize="8" fill="#94a3b8"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {m.target >= 1000 ? `${m.target / 1000}k` : m.target}
              </text>
              <text
                x={x} y={lineY + 18}
                textAnchor="middle" fontSize="8" fill="#64748b"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Static dots when velocity = 0 */}
        {staticDots.map((m, i) => {
          const x = startX + (i + 1) * staticGap
          return (
            <g key={m.target} opacity={0.3}>
              <circle
                cx={x} cy={lineY} r="4"
                fill="none" stroke="#475569" strokeWidth="1.5"
              />
              <text
                x={x} y={lineY - 11}
                textAnchor="middle" fontSize="8" fill="#64748b"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {m.target >= 1000 ? `${m.target / 1000}k` : m.target}
              </text>
            </g>
          )
        })}
      </svg>

      {weeklyVelocity > 0 ? (
        <p className="mt-1 text-xs text-slate-500 text-right">
          ~{weeklyVelocity.toFixed(1)} words/week recently
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400 text-center">
          Add words regularly to see your projection.
        </p>
      )}
    </div>
  )
}

// ── Observatory: Detailed Insights ────────────────────────────────────────────

interface GoalWidgetProps {
  masteredCount: number
  goalTarget: number
  goalStartDate: string
  goalDeadline: string
}

function GoalWidget({
  masteredCount,
  goalTarget,
  goalStartDate,
  goalDeadline,
}: GoalWidgetProps) {
  const gp = useMemo(() => {
    const msLeft   = new Date(goalDeadline).getTime() - Date.now()
    const totalMs  = Math.max(
      new Date(goalDeadline).getTime() - new Date(goalStartDate).getTime(),
      1,
    )
    const elapsed  = Math.max(0, Math.min(Date.now() - new Date(goalStartDate).getTime(), totalMs))
    const percentTimeElapsed = Math.round((elapsed / totalMs) * 100)
    const expectedByToday    = Math.round((elapsed / totalMs) * goalTarget)
    const percentComplete    = goalTarget > 0
      ? Math.min(100, Math.round((masteredCount / goalTarget) * 100))
      : 0
    const weeksLeft          = msLeft / (7 * 24 * 60 * 60 * 1000)
    const remaining          = Math.max(0, goalTarget - masteredCount)
    const wordsPerWeekNeeded = weeksLeft > 0.1 ? Math.ceil(remaining / weeksLeft) : remaining

    return {
      percentComplete,
      percentTimeElapsed,
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

      {/* Dual progress bar: time elapsed (back) + words mastered (front) */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-slate-200 rounded-full"
          style={{ width: `${gp.percentTimeElapsed}%` }}
          title={`${gp.percentTimeElapsed}% of time elapsed`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all"
          style={{ width: `${gp.percentComplete}%` }}
          role="progressbar"
          aria-valuenow={gp.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${gp.percentComplete}% of mastery goal`}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {gp.remaining > 0
            ? `${gp.remaining.toLocaleString()} words remaining`
            : 'All words mastered'}
        </span>
        <span>
          {gp.weeksLeft > 0
            ? `${gp.weeksLeft}w left`
            : 'Goal period ended'}
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
        <span>
          {count} ({pct}%)
        </span>
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

interface DetailedInsightsProps {
  items: VocabItem[]
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

function DetailedInsightsContent({
  items,
  gamification,
  usesThisWeek,
}: DetailedInsightsProps) {
  const masteredCount = useMemo(() => getMasteredWordsCount(items), [items])
  const confidence    = useMemo(() => getConfidenceDistribution(items), [items])
  const confTotal     =
    confidence.unset + confidence.red + confidence.yellow + confidence.green

  return (
    <div className="space-y-8">
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
          <ConfidenceBar
            label="Comfortable"
            count={confidence.green}
            total={confTotal}
            color="#10b981"
          />
          <ConfidenceBar
            label="Somewhat comfortable"
            count={confidence.yellow}
            total={confTotal}
            color="#fbbf24"
          />
          <ConfidenceBar
            label="Not yet comfortable"
            count={confidence.red}
            total={confTotal}
            color="#f87171"
          />
          <ConfidenceBar
            label="Not assessed"
            count={confidence.unset}
            total={confTotal}
            color="#cbd5e1"
          />
        </div>
      </div>

      {/* Challenge stats */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          Challenge activity
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Completions',    value: gamification.challengeCompletions },
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
  )
}

// ── Observatory shell ──────────────────────────────────────────────────────────

interface ObservatoryLensProps {
  title: string
  description: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ObservatoryLens({
  title,
  description,
  icon,
  isOpen,
  onToggle,
  children,
}: ObservatoryLensProps) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between px-4 py-4 hover:bg-slate-50 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-slate-400 flex-shrink-0" aria-hidden="true">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">{title}</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</div>
          </div>
        </div>
        {isOpen
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0 mt-1 ml-2" aria-hidden="true" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0 mt-1 ml-2" aria-hidden="true" />
        }
      </button>

      {/* CSS grid accordion — animates without max-height artefacts */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 pb-6 pt-3 border-t border-slate-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ObservatoryProps {
  cohorts: GrowthCohort[]
  distribution: StageDistribution
  themeEntries: ThemeTerritoryEntry[]
  horizon: LongHorizon
  items: VocabItem[]
  gamification: DetailedInsightsProps['gamification']
  usesThisWeek: number
}

function Observatory({
  cohorts,
  distribution,
  themeEntries,
  horizon,
  items,
  gamification,
  usesThisWeek,
}: ObservatoryProps) {
  const [openLens, setOpenLens] = useState<string | null>(null)
  const toggle = (lens: string) =>
    setOpenLens((prev) => (prev === lens ? null : lens))

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          Observatory
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Look deeper into your vocabulary from different angles.
        </p>
      </div>

      <div className="space-y-2">
        {/* Journey lens: growth rings + stage distribution */}
        <ObservatoryLens
          title="Vocabulary History"
          description="How your collection has grown and shifted over time"
          icon={<Layers size={14} />}
          isOpen={openLens === 'journey'}
          onToggle={() => toggle('journey')}
        >
          <div className="space-y-7">
            <GrowthRings cohorts={cohorts} />
            <StageSpectrum distribution={distribution} />
          </div>
        </ObservatoryLens>

        {/* Territory lens: per-theme breakdown */}
        <ObservatoryLens
          title="Semantic Territory"
          description="The themes your vocabulary occupies, and how deeply"
          icon={<Globe size={14} />}
          isOpen={openLens === 'territory'}
          onToggle={() => toggle('territory')}
        >
          <ThemeTerritory entries={themeEntries} />
        </ObservatoryLens>

        {/* Horizon lens: growth projection */}
        <ObservatoryLens
          title="The Long Horizon"
          description="Where your vocabulary journey is heading at current pace"
          icon={<Compass size={14} />}
          isOpen={openLens === 'horizon'}
          onToggle={() => toggle('horizon')}
        >
          <LongHorizonView horizon={horizon} />
        </ObservatoryLens>

        {/* Detailed insights lens */}
        <ObservatoryLens
          title="Detailed Insights"
          description="Confidence distribution and your learning goal"
          icon={<Eye size={14} />}
          isOpen={openLens === 'details'}
          onToggle={() => toggle('details')}
        >
          <DetailedInsightsContent
            items={items}
            gamification={gamification}
            usesThisWeek={usesThisWeek}
          />
        </ObservatoryLens>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics view
//
// The Analytics tab is the "exploration" perspective — data-rich, historically
// oriented, and pattern-focused.  It answers: "What patterns are in my learning
// data?"
//
// Contrast with Observatory (atmospheric, present-tense, emotional) which
// answers: "What is true about my learning right now?"
//
// Both tabs receive the same pre-computed data from StatsPage — no logic
// duplication, two presentation modes.
// ─────────────────────────────────────────────────────────────────────────────

type ProgressView = 'observatory' | 'analytics'

// ── Segmented toggle ──────────────────────────────────────────────────────────

interface ViewToggleProps {
  view: ProgressView
  onChange: (v: ProgressView) => void
}

function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex justify-center pt-6 pb-1">
      <div
        className="flex bg-slate-100 rounded-full p-0.5"
        role="tablist"
        aria-label="Progress view"
      >
        {(['observatory', 'analytics'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => onChange(v)}
            className={[
              'px-5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide',
              'transition-all duration-200 select-none',
              view === v
                ? 'bg-white text-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-500',
            ].join(' ')}
          >
            {v === 'observatory' ? 'Observatory' : 'Analytics'}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Section header shared by all Analytics sections ───────────────────────────

function AnalyticsSectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

// ── Analytics: Snapshot ───────────────────────────────────────────────────────

interface AnalyticsSnapshotProps {
  totalInLibrary: number
  aliveCount: number
  masteredCount: number
  activateCount: number
  usesThisWeek: number
  avgExposure: number
}

function AnalyticsSnapshot({
  totalInLibrary,
  aliveCount,
  masteredCount,
  activateCount,
  usesThisWeek,
  avgExposure,
}: AnalyticsSnapshotProps) {
  const cells: Array<{ label: string; value: string }> = [
    { label: 'In library',     value: totalInLibrary.toLocaleString() },
    { label: 'Alive',          value: aliveCount.toLocaleString() },
    { label: 'Mastered',       value: masteredCount.toLocaleString() },
    { label: 'Ready to use',   value: activateCount.toLocaleString() },
    { label: 'Used this week', value: usesThisWeek.toLocaleString() },
    { label: 'Avg exposures',  value: avgExposure.toFixed(1) },
  ]

  return (
    <div>
      <AnalyticsSectionHeader title="At a glance" />
      <div className="grid grid-cols-3 gap-3">
        {cells.map(({ label, value }) => (
          <div key={label} className="py-4 text-center rounded-2xl bg-slate-50">
            <div className="text-2xl font-light text-slate-800">{value}</div>
            <div className="text-[11px] text-slate-400 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analytics: Growth Chart ───────────────────────────────────────────────────

function GrowthChart({ cohorts }: { cohorts: GrowthCohort[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Cumulative totals per month — derived inline, no exported helper needed
  const points = useMemo(() => {
    let running = 0
    return cohorts.map((c) => {
      running += c.total
      return {
        monthKey: c.monthKey,
        label:    c.label,
        cumTotal: running,
        added:    c.total,
      }
    })
  }, [cohorts])

  const vis = points.slice(-24)   // at most 24 months on screen
  const n   = vis.length

  if (n < 2) {
    return (
      <div>
        <AnalyticsSectionHeader title="Vocabulary growth" />
        <p className="text-sm text-slate-400 text-center py-8">
          Add words across multiple months to see your growth curve.
        </p>
      </div>
    )
  }

  const VBW = 480, VBH = 110
  const PL = 44, PR = 16, PT = 14, PB = 26
  const plotW = VBW - PL - PR
  const plotH = VBH - PT - PB

  const maxVal = Math.max(...vis.map((p) => p.cumTotal), 1)
  const toX = (i: number) => PL + (i / (n - 1)) * plotW
  const toY = (v: number) => PT + plotH - (v / maxVal) * plotH

  const linePath = vis
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.cumTotal).toFixed(1)}`)
    .join(' ')
  const areaPath =
    linePath +
    ` L ${toX(n - 1).toFixed(1)} ${(PT + plotH).toFixed(1)}` +
    ` L ${PL.toFixed(1)} ${(PT + plotH).toFixed(1)} Z`

  const yTicks  = [0, Math.round(maxVal / 2), maxVal]
  const xEvery  = n <= 12 ? 1 : n <= 18 ? 2 : 3

  return (
    <div>
      <AnalyticsSectionHeader
        title="Vocabulary growth"
        subtitle="Cumulative words added to your library over time"
      />
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="w-full"
        style={{ height: 100 }}
        aria-label={`Vocabulary grew from ${vis[0].cumTotal} to ${vis[n - 1].cumTotal} words over ${n} months`}
        role="img"
      >
        <defs>
          <linearGradient id="gc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines + labels */}
        {yTicks.map((tick) => {
          const y = toY(tick)
          return (
            <g key={tick}>
              <line
                x1={PL} y1={y} x2={VBW - PR} y2={y}
                stroke="#f1f5f9" strokeWidth="1"
              />
              <text
                x={PL - 5} y={y + 3.5}
                textAnchor="end" fontSize="8" fill="#94a3b8"
                fontFamily="system-ui,-apple-system,sans-serif"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#gc-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none" stroke="#6366f1" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Data points + X labels */}
        {vis.map((p, i) => {
          const x = toX(i)
          const y = toY(p.cumTotal)
          const showLabel = i % xEvery === 0 || i === n - 1
          const isHov = hoveredIdx === i
          return (
            <g
              key={p.monthKey}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'default' }}
            >
              {/* Larger invisible hit area so hovering is easy */}
              <circle cx={x} cy={y} r={8} fill="transparent" />
              <circle
                cx={x} cy={y}
                r={isHov ? 4 : 2.5}
                fill={isHov ? '#6366f1' : '#818cf8'}
                opacity={isHov ? 1 : 0.65}
                style={{ transition: 'r 0.1s ease, opacity 0.1s ease' }}
              />
              {showLabel && (
                <text
                  x={x} y={VBH - 4}
                  textAnchor="middle" fontSize="7.5" fill="#94a3b8"
                  fontFamily="system-ui,-apple-system,sans-serif"
                >
                  {p.label.slice(0, 3)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Hover caption below chart */}
      <div style={{ minHeight: 18 }} className="mt-0.5">
        {hoveredIdx !== null && vis[hoveredIdx] != null && (
          <p className="text-xs text-slate-400 text-center">
            <span className="font-medium text-slate-600">
              {vis[hoveredIdx].label}
            </span>
            {' — '}
            {vis[hoveredIdx].cumTotal.toLocaleString()} words
            {' · +'}
            {vis[hoveredIdx].added} that month
          </p>
        )}
      </div>
    </div>
  )
}

// ── Analytics: Stage Evolution Chart ─────────────────────────────────────────

function StageEvolutionChart({ cohorts }: { cohorts: GrowthCohort[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const vis = cohorts.slice(-12)
  const n   = vis.length

  if (n === 0) {
    return (
      <div>
        <AnalyticsSectionHeader title="Stage composition" />
        <p className="text-sm text-slate-400 text-center py-8">
          Add words to see how your library is maturing.
        </p>
      </div>
    )
  }

  const VBW = 480, VBH = 130
  const PL = 10, PR = 10, PT = 10, PB = 26
  const plotW  = VBW - PL - PR
  const plotH  = VBH - PT - PB
  const groupW = plotW / n
  const barW   = Math.max(groupW * 0.72, 6)
  const barOff = (groupW - barW) / 2

  const maxTotal = Math.max(...vis.map((c) => c.total), 1)
  const xEvery   = n <= 6 ? 1 : n <= 9 ? 2 : 3

  const hoveredEntry = hoveredKey != null
    ? vis.find((c) => c.monthKey === hoveredKey) ?? null
    : null

  return (
    <div>
      <AnalyticsSectionHeader
        title="Stage composition"
        subtitle="Monthly additions coloured by their current learning stage"
      />
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="w-full"
        style={{ height: 118 }}
        aria-label="Monthly vocabulary additions by stage"
        role="img"
      >
        {/* Baseline */}
        <line
          x1={PL} y1={PT + plotH} x2={VBW - PR} y2={PT + plotH}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {vis.map((cohort, i) => {
          const gx  = PL + i * groupW + barOff
          const isH = hoveredKey === cohort.monthKey
          let stackY = PT + plotH

          const parts = STAGE_ORDER
            .map((stage) => ({ stage, count: cohort.distribution[stage] }))
            .filter((s) => s.count > 0)
            .map(({ stage, count }) => {
              const h = (count / maxTotal) * plotH
              const y = stackY - h
              stackY -= h
              return { stage, y, h }
            })

          const showLabel = i % xEvery === 0 || i === n - 1

          return (
            <g
              key={cohort.monthKey}
              onMouseEnter={() => setHoveredKey(cohort.monthKey)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{ cursor: 'default' }}
            >
              {/* Wider invisible hit zone */}
              <rect
                x={gx - 4} y={PT}
                width={barW + 8} height={plotH}
                fill="transparent"
              />
              {parts.map(({ stage, y, h }) => (
                <rect
                  key={stage}
                  x={gx} y={y}
                  width={barW} height={Math.max(h, 0)}
                  fill={STAGE_COLOR[stage]}
                  opacity={hoveredKey === null || isH ? 0.85 : 0.3}
                  style={{ transition: 'opacity 0.18s ease' }}
                />
              ))}
              {showLabel && (
                <text
                  x={gx + barW / 2} y={VBH - 5}
                  textAnchor="middle" fontSize="7.5" fill="#94a3b8"
                  fontFamily="system-ui,-apple-system,sans-serif"
                >
                  {cohort.label.slice(0, 3)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Hover caption + legend */}
      <div className="flex items-start justify-between mt-1 gap-3 flex-wrap">
        <div style={{ minHeight: 18 }}>
          {hoveredEntry != null && (
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-600">
                {hoveredEntry.label}
              </span>
              {' — '}
              {hoveredEntry.total} word{hoveredEntry.total !== 1 ? 's' : ''} added
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STAGE_COLOR[stage] }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-slate-400">
                {STAGE_LABEL[stage]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Analytics: Activity Calendar ──────────────────────────────────────────────

function ActivityCalendar({
  pointsHistory,
}: {
  pointsHistory: Record<string, number>
}) {
  // Build 90 day × activity lookup, oldest first (index 0 = 89 days ago)
  const cells = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 90 }, (_, i) => {
      const d   = new Date(today)
      d.setDate(d.getDate() - (89 - i))
      const key = d.toISOString().slice(0, 10)
      const pts = pointsHistory[key] ?? 0
      const mon = d.toLocaleString('default', { month: 'short' })
      return {
        dateKey: key,
        points:  pts,
        active:  pts > 0,
        label:   `${mon} ${d.getDate()}${pts > 0 ? `: ${pts} pts` : ''}`,
      }
    })
  }, [pointsHistory])

  const maxPts = Math.max(...cells.map((c) => c.points), 1)
  const hasAny = cells.some((c) => c.active)

  // Grid: 7 rows × 13 columns.  col = ⌊i/7⌋, row = i % 7
  const ROWS = 7, COLS = 13
  const CELL = 22, GAP = 3, STEP = CELL + GAP
  const VBW  = COLS * STEP + GAP * 2
  const VBH  = ROWS * STEP + GAP * 2

  return (
    <div>
      <AnalyticsSectionHeader
        title="Activity pattern"
        subtitle="90 days of practice — each cell is one day"
      />
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="w-full"
        style={{ height: Math.round(VBH * 0.65) }}
        aria-label="90-day practice activity heatmap"
        role="img"
      >
        {cells.map((cell, i) => {
          const col     = Math.floor(i / ROWS)
          const row     = i % ROWS
          const x       = GAP + col * STEP
          const y       = GAP + row * STEP
          const opacity = cell.active ? Math.max(0.22, cell.points / maxPts) : 0
          const fill    = cell.active
            ? `rgba(251,191,36,${opacity.toFixed(2)})`
            : '#f1f5f9'
          return (
            <rect key={cell.dateKey} x={x} y={y} width={CELL} height={CELL} rx={3} fill={fill}>
              <title>{cell.label}</title>
            </rect>
          )
        })}
      </svg>

      <div className="flex items-center justify-between mt-2">
        {hasAny ? (
          <span />
        ) : (
          <p className="text-xs text-slate-400">
            Your activity pattern takes shape as you practise daily.
          </p>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-slate-400">Less</span>
          {[0.12, 0.35, 0.6, 1.0].map((op, k) => (
            <div
              key={k}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(251,191,36,${op})` }}
              aria-hidden="true"
            />
          ))}
          <span className="text-[10px] text-slate-400">More</span>
        </div>
      </div>
    </div>
  )
}

// ── Analytics: Confidence ─────────────────────────────────────────────────────

function ConfidenceAnalyticsSection({
  confidence,
}: {
  confidence: ReturnType<typeof getConfidenceDistribution>
}) {
  const total =
    confidence.green + confidence.yellow + confidence.red + confidence.unset

  const bars = [
    { label: 'Comfortable',           count: confidence.green,  color: '#10b981' },
    { label: 'Somewhat comfortable',  count: confidence.yellow, color: '#fbbf24' },
    { label: 'Not yet comfortable',   count: confidence.red,    color: '#f87171' },
    { label: 'Unrated',               count: confidence.unset,  color: '#cbd5e1' },
  ]

  if (total === 0) {
    return (
      <div>
        <AnalyticsSectionHeader title="Confidence" />
        <p className="text-sm text-slate-400 text-center py-6">
          Rate your confidence on word detail pages to see the breakdown.
        </p>
      </div>
    )
  }

  return (
    <div>
      <AnalyticsSectionHeader
        title="Confidence"
        subtitle="Self-reported comfort using these words naturally in context"
      />

      {/* Summary bar */}
      <div
        className="flex w-full rounded-full overflow-hidden mb-5"
        style={{ height: 10 }}
        role="img"
        aria-label="Confidence distribution overview"
      >
        {bars.map(({ label, count, color }) => {
          const pct = total > 0 ? (count / total) * 100 : 0
          return pct > 0 ? (
            <div
              key={label}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${label}: ${Math.round(pct)}%`}
            />
          ) : null
        })}
      </div>

      {/* Individual bars */}
      <div className="space-y-4">
        {bars.map(({ label, count, color }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 text-xs">
                  <span className="font-medium text-slate-700">{count}</span>
                  <span className="text-slate-400">({pct}%)</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
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
        })}
      </div>
    </div>
  )
}

// ── Analytics: Theme Coverage ─────────────────────────────────────────────────

function ThemeCoverageSection({
  entries,
}: {
  entries: ThemeTerritoryEntry[]
}) {
  if (entries.length === 0) return null

  return (
    <div>
      <AnalyticsSectionHeader
        title="Semantic coverage"
        subtitle="Vocabulary depth and stage spread across your active themes"
      />
      <div className="space-y-6">
        {entries.map((entry) => {
          const stages = STAGE_ORDER.filter((s) => entry.distribution[s] > 0)

          return (
            <div key={entry.theme}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {entry.theme}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  {entry.aliveCount > 0 && (
                    <span className="text-emerald-600">
                      {entry.aliveCount} alive
                    </span>
                  )}
                  <span className="text-slate-400">{entry.total} total</span>
                </div>
              </div>

              {/* Stage composition bar */}
              <div
                className="flex w-full rounded-full overflow-hidden"
                style={{ height: 8 }}
                role="img"
                aria-label={`${entry.theme} stage distribution`}
              >
                {stages.map((stage) => (
                  <div
                    key={stage}
                    style={{
                      width: `${(entry.distribution[stage] / entry.total) * 100}%`,
                      backgroundColor: STAGE_COLOR[stage],
                    }}
                    title={`${STAGE_LABEL[stage]}: ${entry.distribution[stage]}`}
                  />
                ))}
              </div>

              {/* Stage breakdown labels */}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {stages.map((stage) => (
                  <span key={stage} className="text-[11px] text-slate-400">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                      style={{ backgroundColor: STAGE_COLOR[stage] }}
                      aria-hidden="true"
                    />
                    {STAGE_LABEL[stage]}{' '}{entry.distribution[stage]}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Analytics: View assembler ─────────────────────────────────────────────────

interface AnalyticsViewProps {
  nonArchived:   VocabItem[]
  aliveCount:    number
  masteredCount: number
  activateCount: number
  usesThisWeek:  number
  cohorts:       GrowthCohort[]
  themeEntries:  ThemeTerritoryEntry[]
  pointsHistory: Record<string, number>
}

function AnalyticsView({
  nonArchived,
  aliveCount,
  masteredCount,
  activateCount,
  usesThisWeek,
  cohorts,
  themeEntries,
  pointsHistory,
}: AnalyticsViewProps) {
  const confidence = useMemo(
    () => getConfidenceDistribution(nonArchived),
    [nonArchived],
  )
  const avgExposure = useMemo(
    () =>
      nonArchived.length > 0
        ? nonArchived.reduce((s, i) => s + (i.exposureCount ?? 0), 0) /
          nonArchived.length
        : 0,
    [nonArchived],
  )

  return (
    <div className="space-y-12 mt-6">
      <AnalyticsSnapshot
        totalInLibrary={nonArchived.length}
        aliveCount={aliveCount}
        masteredCount={masteredCount}
        activateCount={activateCount}
        usesThisWeek={usesThisWeek}
        avgExposure={avgExposure}
      />

      {/* ── Word Space ── */}
      <div>
        <AnalyticsSectionHeader
          title="Word Space"
          subtitle="Every word as a dot — hover to identify, click to open"
        />
        <VocabularyLandscape items={nonArchived} />
      </div>

      <GrowthChart cohorts={cohorts} />
      <StageEvolutionChart cohorts={cohorts} />
      <ActivityCalendar pointsHistory={pointsHistory} />
      <ConfidenceAnalyticsSection confidence={confidence} />
      <ThemeCoverageSection entries={themeEntries} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function StatsPage() {
  const navigate    = useNavigate()
  const [activeView, setActiveView] = useState<ProgressView>('observatory')
  const items    = useVocabStore((s) => s.items)
  const themes   = useThemesStore((s) => s.themes)
  const {
    pointsHistory,
    points,
    streakDays,
    challengeCompletions,
    goalTarget,
    goalStartDate,
    goalDeadline,
  } = useGamificationStore()

  const nonArchived   = useMemo(() => items.filter((i) => !i.archived), [items])
  const stageDistrib  = useMemo(() => getStageDistribution(nonArchived), [nonArchived])
  const aliveCount    = useMemo(() => getAliveVocabCount(nonArchived), [nonArchived])
  const masteredCount = useMemo(() => getMasteredWordsCount(nonArchived), [nonArchived])
  const activateItems = useMemo(() => getActivateStageItems(nonArchived), [nonArchived])
  const usesThisWeek  = useMemo(() => getUsageLogsThisWeek(nonArchived), [nonArchived])

  // Constellation nodes — deterministic, stable
  const constellationNodes = useMemo(
    () => buildConstellationNodes(nonArchived, themes, CONSTELLATION_MAX_NODES),
    [nonArchived, themes],
  )

  // Observatory lenses — all pure, memoized on library data
  const growthCohorts  = useMemo(() => buildGrowthCohorts(nonArchived), [nonArchived])
  const themeTerritory = useMemo(() => buildThemeTerritory(nonArchived, themes), [nonArchived, themes])
  const longHorizon    = useMemo(() => buildLongHorizon(nonArchived), [nonArchived])

  const headline = useMemo(
    () =>
      buildProgressHeadline({
        aliveCount,
        masteredCount,
        activateCount: stageDistrib.activate,
        totalInLibrary: nonArchived.length,
        stageDistribution: stageDistrib,
        usesThisWeek,
        streakDays,
      }),
    [aliveCount, masteredCount, stageDistrib, nonArchived.length, usesThisWeek, streakDays],
  )

  const gamification = {
    points,
    streakDays,
    challengeCompletions,
    goalTarget,
    goalStartDate,
    goalDeadline,
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">

      {/* ── View selector ── */}
      <ViewToggle view={activeView} onChange={setActiveView} />

      {activeView === 'observatory' ? (

        /* ── Observatory: atmospheric, present-tense, reflective ── */
        <div className="space-y-10 mt-2">

          {/* 1. Headline + hero metric */}
          <HeadlineSection
            heroNumber={aliveCount === 0 ? nonArchived.length : aliveCount}
            heroLabel={aliveCount === 0 ? 'words in your collection' : 'alive in your vocabulary'}
            main={headline.main}
            sub={headline.sub}
          />

          {/* 2. Living Vocabulary Constellation */}
          <VocabularyConstellation
            nodes={constellationNodes}
            totalItems={nonArchived.length}
          />

          {/* 3. 90-day momentum trail */}
          <MomentumTrail pointsHistory={pointsHistory} />

          {/* 4. Activation spotlight */}
          <ActivationSpotlight
            items={activateItems}
            allItems={nonArchived}
            onNavigate={(id) => navigate(`/library/${id}`)}
          />

          {/* 5. Observatory lenses */}
          <Observatory
            cohorts={growthCohorts}
            distribution={stageDistrib}
            themeEntries={themeTerritory}
            horizon={longHorizon}
            items={nonArchived}
            gamification={gamification}
            usesThisWeek={usesThisWeek}
          />

        </div>

      ) : (

        /* ── Analytics: exploratory, historical, pattern-focused ── */
        <AnalyticsView
          nonArchived={nonArchived}
          aliveCount={aliveCount}
          masteredCount={masteredCount}
          activateCount={stageDistrib.activate}
          usesThisWeek={usesThisWeek}
          cohorts={growthCohorts}
          themeEntries={themeTerritory}
          pointsHistory={pointsHistory}
        />

      )}

    </div>
  )
}
