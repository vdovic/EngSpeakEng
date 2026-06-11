/**
 * practiceAnalytics.ts — pure aggregation for the Progress & Effort tab.
 *
 * All functions are side-effect-free: they take PracticeSession[] (+ an optional
 * `now` for testability) and return plain data. No React, no store, no async.
 *
 * Centralising aggregation here means a new activity logs sessions and every
 * metric/chart updates automatically — no per-activity analytics code.
 *
 * Date bucketing uses UTC date keys (YYYY-MM-DD), consistent with the rest of
 * the app (see dateUtils.todayDateKey and gamificationStore.pointsHistory).
 */

import type { PracticeSession } from '@/lib/practice'
import { activityLabel } from '@/lib/practice'

const DAY_MS = 24 * 60 * 60 * 1000

// ── Date helpers ─────────────────────────────────────────────────────────────────

/** UTC date key for a Date. */
function dateKeyOf(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Short human label for a YYYY-MM-DD key, e.g. "7 Jun". */
export function shortDayLabel(dateKey: string): string {
  // Parse as UTC midday to avoid timezone drift in the label.
  const d = new Date(`${dateKey}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Daily buckets ────────────────────────────────────────────────────────────────

export interface DayBucket {
  dateKey: string
  label: string
  /** Active seconds practised that day. */
  secs: number
  /** Internal advancement aggregate ("learning progress") that day. */
  advancement: number
}

/**
 * Build a zero-filled series of the last `days` days (oldest first, today last).
 */
export function buildDailyBuckets(
  sessions: PracticeSession[],
  days: number,
  now: Date = new Date(),
): DayBucket[] {
  const todayMs = new Date(`${dateKeyOf(now)}T00:00:00Z`).getTime()
  const buckets: DayBucket[] = []
  const index = new Map<string, DayBucket>()

  for (let i = days - 1; i >= 0; i--) {
    const key = dateKeyOf(new Date(todayMs - i * DAY_MS))
    const bucket: DayBucket = { dateKey: key, label: shortDayLabel(key), secs: 0, advancement: 0 }
    buckets.push(bucket)
    index.set(key, bucket)
  }

  for (const s of sessions) {
    const key = s.endedAt.slice(0, 10)
    const bucket = index.get(key)
    if (bucket) {
      bucket.secs += s.durationSecs
      bucket.advancement += s.advancement
    }
  }

  return buckets
}

// ── Headline metrics ─────────────────────────────────────────────────────────────

export interface PracticeMetrics {
  todaySecs: number
  /** Rolling last-7-days total active seconds. */
  weekSecs: number
  /** weekSecs / 7, rounded. */
  avgDailySecs7d: number
  /** Consecutive active days ending today (or yesterday if today is idle). */
  currentConsistencyDays: number
  /** Longest run of consecutive active days ever recorded. */
  longestConsistencyDays: number
  todayAdvancement: number
  weekAdvancement: number
  avgDailyAdvancement7d: number
  totalAdvancement: number
  totalSecs: number
  /** Total sessions ever recorded. */
  sessionCount: number
}

/** Set of active (≥1 session) UTC date keys. */
function activeDayKeys(sessions: PracticeSession[]): Set<string> {
  const set = new Set<string>()
  for (const s of sessions) set.add(s.endedAt.slice(0, 10))
  return set
}

/** Consecutive active days ending at today, or yesterday if today is idle. */
export function currentConsistency(sessions: PracticeSession[], now: Date = new Date()): number {
  const active = activeDayKeys(sessions)
  if (active.size === 0) return 0

  const todayMs = new Date(`${dateKeyOf(now)}T00:00:00Z`).getTime()
  // Anchor on today if active, else yesterday if active, else the run is broken.
  let cursorMs: number
  if (active.has(dateKeyOf(new Date(todayMs)))) cursorMs = todayMs
  else if (active.has(dateKeyOf(new Date(todayMs - DAY_MS)))) cursorMs = todayMs - DAY_MS
  else return 0

  let count = 0
  while (active.has(dateKeyOf(new Date(cursorMs)))) {
    count++
    cursorMs -= DAY_MS
  }
  return count
}

/** Longest run of consecutive active days across all history. */
export function longestConsistency(sessions: PracticeSession[]): number {
  const keys = Array.from(activeDayKeys(sessions)).sort()
  if (keys.length === 0) return 0

  let longest = 1
  let run = 1
  for (let i = 1; i < keys.length; i++) {
    const prevMs = new Date(`${keys[i - 1]}T00:00:00Z`).getTime()
    const curMs = new Date(`${keys[i]}T00:00:00Z`).getTime()
    if (curMs - prevMs === DAY_MS) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }
  return longest
}

export function computePracticeMetrics(
  sessions: PracticeSession[],
  now: Date = new Date(),
): PracticeMetrics {
  const todayKey = dateKeyOf(now)
  const weekCutoff = now.getTime() - 7 * DAY_MS

  let todaySecs = 0
  let weekSecs = 0
  let todayAdvancement = 0
  let weekAdvancement = 0
  let totalAdvancement = 0
  let totalSecs = 0

  for (const s of sessions) {
    totalSecs += s.durationSecs
    totalAdvancement += s.advancement
    if (s.endedAt.slice(0, 10) === todayKey) {
      todaySecs += s.durationSecs
      todayAdvancement += s.advancement
    }
    if (new Date(s.endedAt).getTime() >= weekCutoff) {
      weekSecs += s.durationSecs
      weekAdvancement += s.advancement
    }
  }

  return {
    todaySecs,
    weekSecs,
    avgDailySecs7d: Math.round(weekSecs / 7),
    currentConsistencyDays: currentConsistency(sessions, now),
    longestConsistencyDays: longestConsistency(sessions),
    todayAdvancement,
    weekAdvancement,
    avgDailyAdvancement7d: Math.round(weekAdvancement / 7),
    totalAdvancement,
    totalSecs,
    sessionCount: sessions.length,
  }
}

// ── Distribution by activity ─────────────────────────────────────────────────────

export interface ActivityShare {
  activity: string
  label: string
  secs: number
  advancement: number
  /** Percentage of total active time (0–100, rounded). */
  pct: number
}

/**
 * Time + advancement grouped by activity, sorted by time descending.
 * `pct` is the share of total active time.
 */
export function distributionByActivity(sessions: PracticeSession[]): ActivityShare[] {
  const byActivity = new Map<string, { secs: number; advancement: number }>()
  let totalSecs = 0

  for (const s of sessions) {
    const entry = byActivity.get(s.activity) ?? { secs: 0, advancement: 0 }
    entry.secs += s.durationSecs
    entry.advancement += s.advancement
    byActivity.set(s.activity, entry)
    totalSecs += s.durationSecs
  }

  return Array.from(byActivity.entries())
    .map(([activity, { secs, advancement }]) => ({
      activity,
      label: activityLabel(activity),
      secs,
      advancement,
      pct: totalSecs > 0 ? Math.round((secs / totalSecs) * 100) : 0,
    }))
    .sort((a, b) => b.secs - a.secs)
}

// ── Rolling average ──────────────────────────────────────────────────────────────

export interface RollingPoint extends DayBucket {
  /** Trailing-window average of the chosen metric. */
  avg: number
}

/**
 * Attach a trailing rolling average of the chosen metric to each bucket.
 * Window is inclusive of the current day (e.g. 7 → current + 6 prior).
 */
export function withRollingAverage(
  buckets: DayBucket[],
  metric: 'secs' | 'advancement',
  window = 7,
): RollingPoint[] {
  return buckets.map((bucket, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = buckets.slice(start, i + 1)
    const sum = slice.reduce((acc, b) => acc + b[metric], 0)
    return { ...bucket, avg: sum / slice.length }
  })
}

// ── Rolling median ────────────────────────────────────────────────────────────────

function calcMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Trailing rolling median aligned to the input bucket array.
 * More robust than rolling average for noisy daily data: spikes and
 * missed days don't distort it. Suitable for habit trend lines.
 */
export function withRollingMedian(
  buckets: DayBucket[],
  metric: 'secs' | 'advancement',
  window: number,
): number[] {
  return buckets.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    return calcMedian(buckets.slice(start, i + 1).map((b) => b[metric]))
  })
}

// ── Variable time-range bucket builder ───────────────────────────────────────────

export type TimeRange = 7 | 30 | 90 | 'all'

/**
 * Like buildDailyBuckets but accepts a TimeRange.
 * 'all' spans from the first recorded session to today (minimum 30 days).
 */
export function buildDailyBucketsForRange(
  sessions: PracticeSession[],
  range: TimeRange,
  now: Date = new Date(),
): DayBucket[] {
  if (range === 'all') {
    if (sessions.length === 0) return buildDailyBuckets(sessions, 30, now)
    const earliest = sessions.reduce(
      (min, s) => (s.endedAt < min ? s.endedAt : min),
      sessions[0].endedAt,
    )
    const firstMs  = new Date(`${earliest.slice(0, 10)}T00:00:00Z`).getTime()
    const todayMs  = new Date(`${dateKeyOf(now)}T00:00:00Z`).getTime()
    const days     = Math.max(30, Math.round((todayMs - firstMs) / DAY_MS) + 1)
    return buildDailyBuckets(sessions, days, now)
  }
  return buildDailyBuckets(sessions, range, now)
}

// ── Streak and record stats ───────────────────────────────────────────────────────

export interface StreakStats {
  /** Consecutive active days ending today (or yesterday). */
  currentDays: number
  /** Longest ever run of consecutive active days. */
  longestDays: number
  /** Highest 7-calendar-day practice total in history. */
  bestWeekSecs: number
  /** Highest single-day practice total in history. */
  recordDaySecs: number
  /** UTC date key of the record day, or null if no sessions. */
  recordDayKey: string | null
}

/**
 * Compute streak and record stats from all sessions.
 * Uses a sliding-window O(n log n) algorithm for best-week to stay
 * responsive even with years of history.
 */
export function getStreakStats(
  sessions: PracticeSession[],
  now: Date = new Date(),
): StreakStats {
  const dayMap = new Map<string, number>()
  for (const s of sessions) {
    const key = s.endedAt.slice(0, 10)
    dayMap.set(key, (dayMap.get(key) ?? 0) + s.durationSecs)
  }

  // Best week: sliding 7-calendar-day window over sorted practice days.
  const sortedEntries = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b))
  let bestWeekSecs = 0
  let windowSecs = 0
  let left = 0
  for (let right = 0; right < sortedEntries.length; right++) {
    windowSecs += sortedEntries[right][1]
    const rightMs = new Date(`${sortedEntries[right][0]}T00:00:00Z`).getTime()
    while (left <= right) {
      const leftMs = new Date(`${sortedEntries[left][0]}T00:00:00Z`).getTime()
      if (rightMs - leftMs > 6 * DAY_MS) { windowSecs -= sortedEntries[left][1]; left++ }
      else break
    }
    bestWeekSecs = Math.max(bestWeekSecs, windowSecs)
  }

  // Record day
  let recordDaySecs = 0
  let recordDayKey: string | null = null
  for (const [k, v] of dayMap.entries()) {
    if (v > recordDaySecs) { recordDaySecs = v; recordDayKey = k }
  }

  return {
    currentDays:   currentConsistency(sessions, now),
    longestDays:   longestConsistency(sessions),
    bestWeekSecs,
    recordDaySecs,
    recordDayKey,
  }
}

// ── Day sessions ─────────────────────────────────────────────────────────────────

/**
 * Return all sessions that ended on a given UTC date key (YYYY-MM-DD).
 * Used to populate the day-detail panel in the practice time chart.
 */
export function getDaySessions(
  sessions: PracticeSession[],
  dateKey: string,
): PracticeSession[] {
  return sessions.filter((s) => s.endedAt.slice(0, 10) === dateKey)
}

// ── Formatting ───────────────────────────────────────────────────────────────────

/** Human duration from seconds: "0m", "8m", "1h 5m", "2h". */
export function formatDuration(secs: number): string {
  if (secs <= 0) return '0m'
  const totalMin = Math.round(secs / 60)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Minutes (rounded) from seconds — for chart axes. */
export function toMinutes(secs: number): number {
  return Math.round(secs / 60)
}
