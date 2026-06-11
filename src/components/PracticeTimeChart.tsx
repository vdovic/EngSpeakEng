/**
 * PracticeTimeChart — Apple Health-style daily practice time visualisation.
 *
 * Features:
 *   • Vertical bar chart (sky-400) — one bar per day, zero-days shown as a tick
 *   • Rolling median overlay line (orange) — default 14-day window
 *   • Time range selector: 7d / 30d / 3mo / All
 *   • Habit consistency stats: current run, longest run, best week, record day
 *   • Active-day info header — updates on hover (desktop) or tap (mobile)
 *   • Persistent day selection with vertical guide line
 *   • Day detail panel — total time + breakdown by activity
 *   • 7-day and 30-day rolling averages shown in the header tooltip
 *
 * CLAUDE.md compliance:
 *   • "run" / "active days" language — not "streak" as a loss-aversion mechanic
 *   • No XP/points/score framing — objective time-on-task only
 *   • All expensive computations wrapped in useMemo
 *   • No AI calls anywhere in this component
 */

import { useState, useRef, useMemo, useCallback } from 'react'
import type { PracticeSession } from '@/lib/practice'
import { activityColor, activityLabel } from '@/lib/practice'
import {
  buildDailyBucketsForRange,
  withRollingMedian,
  withRollingAverage,
  getStreakStats,
  getDaySessions,
  formatDuration,
  toMinutes,
  type TimeRange,
  type DayBucket,
} from '@/lib/practiceAnalytics'

// ── Constants ──────────────────────────────────────────────────────────────────

const MEDIAN_WINDOW  = 14
const MEDIAN_COLOR   = '#f97316'  // orange-500 — Apple Health trend line feel
const BAR_NORMAL     = '#38bdf8'  // sky-400
const BAR_SELECTED   = '#0284c7'  // sky-600
const BAR_HOVER      = '#0ea5e9'  // sky-500
const BAR_EMPTY      = '#e2e8f0'  // slate-200

// SVG layout
const VBW = 480
const VBH = 150
const PL = 32, PR = 6, PT = 8, PB = 20
const PLOT_W = VBW - PL - PR
const PLOT_H = VBH - PT - PB

const RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '7d',   value: 7   },
  { label: '30d',  value: 30  },
  { label: '3mo',  value: 90  },
  { label: 'All',  value: 'all' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function niceYTicks(maxSecs: number): number[] {
  const maxMin = toMinutes(maxSecs)
  if (maxMin <= 0)   return [0]
  if (maxMin <= 10)  return [0, 5, 10]
  if (maxMin <= 30)  return [0, 15, 30]
  if (maxMin <= 60)  return [0, 30, 60]
  if (maxMin <= 90)  return [0, 30, 60, 90]
  if (maxMin <= 120) return [0, 60, 120]
  const step = Math.ceil(maxMin / 60) * 30
  return [0, step, step * 2].filter(t => t <= maxMin + step * 0.5)
}

// ── Main component ─────────────────────────────────────────────────────────────

interface PracticeTimeChartProps {
  sessions: PracticeSession[]
}

export function PracticeTimeChart({ sessions }: PracticeTimeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const [range,         setRange]         = useState<TimeRange>(30)
  const [hoveredIndex,  setHoveredIndex]  = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const now = useMemo(() => new Date(), [])

  // ── Data (all memoised) ────────────────────────────────────────────────────

  const buckets = useMemo(
    () => buildDailyBucketsForRange(sessions, range, now),
    [sessions, range, now],
  )

  const values = useMemo(() => buckets.map((b) => b.secs), [buckets])

  const medians = useMemo(
    () => withRollingMedian(buckets, 'secs', MEDIAN_WINDOW),
    [buckets],
  )

  const avg7d = useMemo(
    () => withRollingAverage(buckets, 'secs', 7).map((p) => p.avg),
    [buckets],
  )

  const avg30d = useMemo(
    () => withRollingAverage(buckets, 'secs', 30).map((p) => p.avg),
    [buckets],
  )

  const streakStats = useMemo(
    () => getStreakStats(sessions, now),
    [sessions, now],
  )

  const n      = buckets.length
  const maxVal = useMemo(
    () => Math.max(...values, ...medians, 1),
    [values, medians],
  )
  const hasData = useMemo(() => values.some((v) => v > 0), [values])

  // ── SVG geometry ───────────────────────────────────────────────────────────

  const slot      = PLOT_W / Math.max(n, 1)
  const barW      = Math.max(1, slot * 0.65)
  const toX       = (i: number) => PL + i * slot + (slot - barW) / 2
  const centerX   = (i: number) => PL + i * slot + slot / 2
  const toY       = (v: number) => PT + PLOT_H - (v / maxVal) * PLOT_H
  const labelEvery = Math.max(1, Math.ceil(n / 7))

  const getAxisLabel = useCallback(
    (b: DayBucket): string => {
      if (range === 7)  return b.label                          // "7 Jun"
      if (range === 30) return b.label.split(' ')[0]            // "7"
      // 90d / all: month abbreviation
      return new Date(`${b.dateKey}T12:00:00Z`)
        .toLocaleDateString('en-GB', { month: 'short' })
    },
    [range],
  )

  // Median SVG path
  const medianPath = useMemo(() => {
    if (!hasData || medians.every((m) => m === 0)) return null
    return medians
      .map((m, i) => `${i === 0 ? 'M' : 'L'} ${centerX(i).toFixed(1)} ${toY(m).toFixed(1)}`)
      .join(' ')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medians, n, maxVal, hasData])

  const yTicks = useMemo(() => niceYTicks(maxVal), [maxVal])

  // ── Pointer interaction ────────────────────────────────────────────────────

  function getIndexFromClientX(clientX: number): number {
    if (!svgRef.current) return 0
    const rect = svgRef.current.getBoundingClientRect()
    const svgX  = ((clientX - rect.left) / rect.width) * VBW
    const i     = Math.floor((svgX - PL) / slot)
    return Math.max(0, Math.min(n - 1, i))
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    setHoveredIndex(getIndexFromClientX(e.clientX))
  }

  function handlePointerLeave() {
    setHoveredIndex(null)
  }

  function handlePointerDown(e: React.PointerEvent) {
    const idx = getIndexFromClientX(e.clientX)
    setSelectedIndex((prev) => (prev === idx ? null : idx))
    if (e.pointerType === 'touch') setHoveredIndex(null)
  }

  // ── Active day display ─────────────────────────────────────────────────────

  const activeIndex   = hoveredIndex ?? selectedIndex
  const activeDay     = activeIndex !== null ? buckets[activeIndex]   : null
  const activeSecs    = activeIndex !== null ? values[activeIndex]    : null
  const activeMedian  = activeIndex !== null ? medians[activeIndex]   : null
  const active7dAvg   = activeIndex !== null ? avg7d[activeIndex]     : null
  const active30dAvg  = activeIndex !== null ? avg30d[activeIndex]    : null

  // Detail panel: only when a day is selected (not just hovered)
  const selectedDay = selectedIndex !== null ? buckets[selectedIndex] : null
  const selectedSecs = selectedIndex !== null ? values[selectedIndex] : null
  const selectedDaySessions = useMemo(
    () => (selectedDay ? getDaySessions(sessions, selectedDay.dateKey) : []),
    [sessions, selectedDay],
  )
  const selectedByActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of selectedDaySessions) {
      map.set(s.activity, (map.get(s.activity) ?? 0) + s.durationSecs)
    }
    return [...map.entries()]
      .map(([activity, secs]) => ({
        activity,
        label: activityLabel(activity),
        secs,
        color: activityColor(activity),
      }))
      .sort((a, b) => b.secs - a.secs)
  }, [selectedDaySessions])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Time range selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {RANGE_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setRange(value); setSelectedIndex(null); setHoveredIndex(null) }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                range === value
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums">
          {MEDIAN_WINDOW}-day median
        </span>
      </div>

      {/* Habit consistency stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          {
            label: 'Current run',
            value: streakStats.currentDays > 0 ? `${streakStats.currentDays}d` : '—',
            color: streakStats.currentDays > 0 ? '#0ea5e9' : undefined,
          },
          {
            label: 'Longest run',
            value: streakStats.longestDays > 0 ? `${streakStats.longestDays}d` : '—',
            color: streakStats.longestDays > 0 ? '#334155' : undefined,
          },
          {
            label: 'Best week',
            value: streakStats.bestWeekSecs > 0 ? formatDuration(streakStats.bestWeekSecs) : '—',
            color: streakStats.bestWeekSecs > 0 ? '#10b981' : undefined,
          },
          {
            label: 'Record day',
            value: streakStats.recordDaySecs > 0 ? formatDuration(streakStats.recordDaySecs) : '—',
            color: streakStats.recordDaySecs > 0 ? '#8b5cf6' : undefined,
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center rounded-xl bg-slate-50 py-2.5 px-1">
            <div
              className="text-base font-light tabular-nums leading-none"
              style={{ color: color ?? '#94a3b8' }}
            >
              {value}
            </div>
            <div className="text-[9px] text-slate-400 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Active-day info header — updates on hover/selection */}
      <div
        className="min-h-[54px] mb-2 rounded-xl bg-slate-50 px-3 py-2.5 transition-all"
        aria-live="polite"
        aria-atomic="true"
      >
        {activeDay ? (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 shrink-0">
                {new Date(`${activeDay.dateKey}T12:00:00Z`).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}
              </span>
              {activeSecs !== null && activeMedian !== null && activeMedian > 0 && activeSecs > 0 && (
                <span
                  className={`text-[10px] font-medium shrink-0 ${
                    activeSecs >= activeMedian ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {activeSecs >= activeMedian
                    ? `+${formatDuration(activeSecs - activeMedian)} above trend`
                    : `−${formatDuration(activeMedian - activeSecs)} below trend`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[11px] text-slate-500">
                Practice:{' '}
                <span className="font-semibold text-slate-700">
                  {formatDuration(activeSecs ?? 0)}
                </span>
              </span>
              {activeMedian !== null && activeMedian > 0 && (
                <span className="text-[11px] text-slate-500">
                  {MEDIAN_WINDOW}-day median:{' '}
                  <span className="font-semibold" style={{ color: MEDIAN_COLOR }}>
                    {formatDuration(activeMedian)}
                  </span>
                </span>
              )}
              {active7dAvg !== null && active7dAvg > 0 && (
                <span className="text-[11px] text-slate-400">
                  7-day avg:{' '}
                  <span className="font-medium text-slate-500">
                    {formatDuration(active7dAvg)}
                  </span>
                </span>
              )}
              {active30dAvg !== null && active30dAvg > 0 && range !== 7 && (
                <span className="text-[11px] text-slate-400">
                  30-day avg:{' '}
                  <span className="font-medium text-slate-500">
                    {formatDuration(active30dAvg)}
                  </span>
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 leading-relaxed">
            {hasData
              ? 'Tap any bar to inspect that day. Hover on desktop to preview.'
              : 'Your daily activity will appear here as you practise.'}
          </p>
        )}
      </div>

      {/* SVG Chart */}
      {hasData ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VBW} ${VBH}`}
          className="w-full cursor-pointer touch-none select-none"
          style={{ height: VBH }}
          role="img"
          aria-label={`Daily practice time — ${n} days`}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
        >
          {/* Y-axis grid + labels */}
          {yTicks.map((tickMin) => {
            const y = toY(tickMin * 60)
            return (
              <g key={tickMin}>
                <line
                  x1={PL} y1={y} x2={VBW - PR} y2={y}
                  stroke={tickMin === 0 ? '#e2e8f0' : '#f1f5f9'}
                  strokeWidth={tickMin === 0 ? 1 : 0.75}
                />
                <text
                  x={PL - 4} y={y + 3}
                  textAnchor="end" fontSize="7.5" fill="#cbd5e1"
                  fontFamily="system-ui,-apple-system,sans-serif"
                >
                  {tickMin}m
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {buckets.map((b, i) => {
            const v       = values[i]
            const isEmpty = v === 0
            const isHover = i === hoveredIndex
            const isSel   = i === selectedIndex

            const barColor = isEmpty
              ? BAR_EMPTY
              : isHover
              ? BAR_HOVER
              : isSel
              ? BAR_SELECTED
              : BAR_NORMAL

            const barH    = isEmpty ? 2 : Math.max(3, (v / maxVal) * PLOT_H)
            const barY    = isEmpty ? PT + PLOT_H - 2 : toY(v)
            const opacity = isEmpty ? 0.5 : (isHover || isSel) ? 1 : 0.82

            return (
              <g key={b.dateKey}>
                <rect
                  x={toX(i)}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={Math.min(barW / 3, 2.5)}
                  fill={barColor}
                  opacity={opacity}
                >
                  <title>{`${b.label}: ${formatDuration(v)}`}</title>
                </rect>

                {/* X-axis label */}
                {i % labelEvery === 0 && (
                  <text
                    x={centerX(i)} y={VBH - 5}
                    textAnchor="middle" fontSize="7" fill="#94a3b8"
                    fontFamily="system-ui,-apple-system,sans-serif"
                  >
                    {getAxisLabel(b)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Rolling median line */}
          {medianPath && (
            <path
              d={medianPath}
              fill="none"
              stroke={MEDIAN_COLOR}
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
          )}

          {/* Hover guide line */}
          {hoveredIndex !== null && (
            <line
              x1={centerX(hoveredIndex)} y1={PT}
              x2={centerX(hoveredIndex)} y2={PT + PLOT_H}
              stroke={BAR_HOVER} strokeWidth="1"
              strokeDasharray="3 2" opacity={0.45}
            />
          )}

          {/* Selection guide line (shown when not hovering) */}
          {selectedIndex !== null && hoveredIndex === null && (
            <line
              x1={centerX(selectedIndex)} y1={PT}
              x2={centerX(selectedIndex)} y2={PT + PLOT_H}
              stroke={BAR_SELECTED} strokeWidth="1"
              strokeDasharray="3 2" opacity={0.55}
            />
          )}
        </svg>
      ) : (
        <div
          className="flex items-center justify-center rounded-xl bg-slate-50"
          style={{ height: VBH }}
        >
          <p className="text-sm text-slate-400">
            Start practising to see your daily time chart.
          </p>
        </div>
      )}

      {/* Legend */}
      {hasData && (
        <div className="mt-1.5 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2.5 rounded-sm bg-sky-400 opacity-80" />
            <span className="text-[10px] text-slate-400">Daily time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-0.5 rounded-full"
              style={{ backgroundColor: MEDIAN_COLOR }}
            />
            <span className="text-[10px] text-slate-400">
              {MEDIAN_WINDOW}-day median
            </span>
          </div>
        </div>
      )}

      {/* Day detail panel — shown when a day is explicitly selected */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700">
              {new Date(`${selectedDay.dateKey}T12:00:00Z`).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
            <button
              onClick={() => setSelectedIndex(null)}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors px-1"
              aria-label="Close day detail"
            >
              ✕
            </button>
          </div>

          {(selectedSecs ?? 0) > 0 ? (
            <div className="px-4 py-3 space-y-2.5">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatDuration(selectedSecs ?? 0)}
                </span>
              </div>

              {/* Per-activity breakdown */}
              {selectedByActivity.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {selectedByActivity.map(({ activity, label, secs, color }) => (
                    <div key={activity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-slate-500">{label}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-600 tabular-nums">
                        {formatDuration(secs)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions count */}
              {selectedDaySessions.length > 1 && (
                <p className="text-[10px] text-slate-400 pt-0.5">
                  {selectedDaySessions.length} sessions
                </p>
              )}
            </div>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-400">
              No practice recorded on this day.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
