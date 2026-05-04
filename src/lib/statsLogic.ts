/**
 * statsLogic.ts
 *
 * Pure helper functions for the Stats dashboard.
 * All functions are side-effect-free — they accept plain data and return
 * plain data.  No React, no store, no async.
 */

import { VocabItem, Level, UsageContext, UsageLog } from '@/types/vocabulary'
import { usagePoints } from '@/lib/mastery'
import { getCanonicalLevel } from '@/lib/progressionLogic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LearningGoal {
  targetWords: number
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

export interface GoalProgress {
  targetWords: number
  masteredWords: number
  startedWords: number
  /** How many words should be mastered by today to stay on track. */
  expectedMasteredByToday: number
  /** masteredWords / targetWords × 100, clamped 0–100 */
  percentComplete: number
  /** Elapsed time / total time × 100, clamped 0–100 */
  percentTimeElapsed: number
  isOnTrack: boolean
  wordsPerWeekNeeded: number
}

export type ExposureBand = '0' | '1-2' | '3-7' | '8'

// ── Default goal (1 500 words / 6 months from today) ─────────────────────────

export function defaultGoal(): LearningGoal {
  const today = new Date()
  const end = new Date(today)
  end.setMonth(end.getMonth() + 6)
  return {
    targetWords: 1500,
    startDate: today.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

// ── Count helpers ─────────────────────────────────────────────────────────────

/**
 * Words the learner has encountered at least once
 * (exposureCount > 0 OR moved out of inbox).
 */
export function getStartedWordsCount(items: VocabItem[]): number {
  return items.filter(
    (i) => (i.exposureCount ?? 0) > 0 || i.status !== 'inbox',
  ).length
}

/**
 * Words at Level 3 (exp ≥ 8 AND activation evidence).
 * Uses canonical derived level — never the potentially-stale stored field.
 */
export function getMasteredWordsCount(items: VocabItem[]): number {
  return items.filter((i) => getCanonicalLevel(i) === 3).length
}

/**
 * Words at Level 1 (Learning) or Level 2 (Familiar).
 * Uses canonical derived level — never the potentially-stale stored field.
 */
export function getInProgressWordsCount(items: VocabItem[]): number {
  return items.filter((i) => {
    const l = getCanonicalLevel(i)
    return l === 1 || l === 2
  }).length
}

/** Words currently in the active focus list. */
export function getFocusWordsCount(items: VocabItem[]): number {
  return items.filter((i) => i.inFocus || i.weeklyFocus).length
}

// ── Goal progress ─────────────────────────────────────────────────────────────

export function getGoalProgress(
  items: VocabItem[],
  goal: LearningGoal,
): GoalProgress {
  const masteredWords = getMasteredWordsCount(items)
  const startedWords  = getStartedWordsCount(items)
  const { targetWords, startDate, endDate } = goal

  const now      = Date.now()
  const start    = new Date(startDate).getTime()
  const end      = new Date(endDate).getTime()
  const totalMs  = Math.max(end - start, 1)
  const elapsed  = Math.max(0, Math.min(now - start, totalMs))

  const percentTimeElapsed      = Math.round((elapsed / totalMs) * 100)
  const expectedMasteredByToday = Math.round((elapsed / totalMs) * targetWords)
  const percentComplete         =
    targetWords > 0 ? Math.round((masteredWords / targetWords) * 100) : 0
  const isOnTrack               = masteredWords >= expectedMasteredByToday

  const msLeft             = Math.max(0, end - now)
  const weeksLeft          = msLeft / (7 * 24 * 60 * 60 * 1000)
  const remaining          = Math.max(0, targetWords - masteredWords)
  const wordsPerWeekNeeded =
    weeksLeft > 0.1 ? Math.ceil(remaining / weeksLeft) : remaining

  return {
    targetWords,
    masteredWords,
    startedWords,
    expectedMasteredByToday,
    percentComplete,
    percentTimeElapsed,
    isOnTrack,
    wordsPerWeekNeeded: Math.max(0, wordsPerWeekNeeded),
  }
}

// ── Level distribution ────────────────────────────────────────────────────────

/**
 * Returns counts per level, derived from live item data.
 * Uses getCanonicalLevel so the distribution stays accurate even when
 * stored item.level values are stale.
 */
export function getLevelDistribution(items: VocabItem[]): Record<Level, number> {
  const dist: Record<Level, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const item of items) {
    const l = getCanonicalLevel(item)
    dist[l]++
  }
  return dist
}

// ── Exposure distribution (banded) ───────────────────────────────────────────

export function getExposureDistribution(
  items: VocabItem[],
): Record<ExposureBand, number> {
  const dist: Record<ExposureBand, number> = {
    '0': 0, '1-2': 0, '3-7': 0, '8': 0,
  }
  for (const item of items) {
    const exp = item.exposureCount ?? 0
    if (exp === 0)     dist['0']++
    else if (exp <= 2) dist['1-2']++
    else if (exp <= 7) dist['3-7']++
    else               dist['8']++
  }
  return dist
}

// ── Phase-6 real-life usage stats ────────────────────────────────────────────

/** Items that have been used at least 3 times in real life. */
export function getActivatedCount(items: VocabItem[]): number {
  return items.filter((i) => usagePoints(i.activation.usageLogs) >= 3).length
}

/**
 * Total number of usage log entries created in the past 7 days
 * (rolling 7 days, not tied to calendar week).
 */
export function getUsageLogsThisWeek(items: VocabItem[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return items.flatMap((i) => i.activation.usageLogs).filter((log: UsageLog) => {
    return new Date(log.usedAt).getTime() >= cutoff
  }).length
}

/**
 * Counts usage logs grouped by context (Phase-6 only).
 * Legacy logs with only `channel` are grouped under 'other'.
 */
export function getContextBreakdown(
  items: VocabItem[],
): Partial<Record<UsageContext | 'speaking' | 'writing', number>> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    for (const log of item.activation.usageLogs) {
      const key = log.context ?? log.channel ?? 'other'
      counts[key] = (counts[key] ?? 0) + 1
    }
  }
  return counts as Partial<Record<UsageContext | 'speaking' | 'writing', number>>
}

/**
 * Items that have been well-drilled (exposureCount >= 5) but have ZERO
 * confirmed real-life uses.  These are "passive-only" learners that need
 * activation.
 */
export function getHighExposureNoUsage(items: VocabItem[]): VocabItem[] {
  return items.filter(
    (i) =>
      (i.exposureCount ?? 0) >= 5 &&
      usagePoints(i.activation.usageLogs) === 0,
  )
}
