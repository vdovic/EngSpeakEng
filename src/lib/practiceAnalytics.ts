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
