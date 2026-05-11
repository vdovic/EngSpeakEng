/**
 * todayLogic.ts
 *
 * Pure deterministic helpers for the Today page (DashboardPage).
 *
 * All functions are side-effect-free — they accept plain data and return
 * plain data.  No React, no store, no async, no AI.
 */

import type { VocabItem } from '@/types/vocabulary'
import type { ConfidenceDistribution } from '@/lib/statsLogic'
import { isDueChallengeNow } from '@/lib/challengeSchedule'
import { usagePoints } from '@/lib/mastery'
import { getCanonicalLevel } from '@/lib/progressionLogic'
import { todayDateKey } from '@/lib/dateUtils'

// ── Session state ─────────────────────────────────────────────────────────────

export type SessionSize = 'quick' | 'normal' | 'deep'

export interface TodaySessionState {
  /** Number of items currently due for a challenge. */
  dueForChallenge: number
  /** True when the learner has already completed a challenge session today. */
  sessionDoneToday: boolean
  /**
   * Suggested session size based on the due count.
   *   'quick'  — ≤ 10 items
   *   'normal' — ≤ 25 items
   *   'deep'   — > 25 items
   */
  suggestedSize: SessionSize
}

/**
 * Computes the current challenge session state without side effects.
 */
export function getTodaySessionState(
  items: VocabItem[],
  lastChallengeDate: string | null,
): TodaySessionState {
  const dueForChallenge = items.filter((i) =>
    isDueChallengeNow(i.exposureCount, i.nextChallengeDate),
  ).length

  const sessionDoneToday = lastChallengeDate === todayDateKey()

  const suggestedSize: SessionSize =
    dueForChallenge <= 10 ? 'quick'
    : dueForChallenge <= 25 ? 'normal'
    : 'deep'

  return { dueForChallenge, sessionDoneToday, suggestedSize }
}

// ── Almost-mastered items ─────────────────────────────────────────────────────

/**
 * Items that are well-drilled but not yet activated in real life.
 *
 * Criteria:
 *   • exposureCount >= 6    (close to or at full challenge completion)
 *   • usagePoints < 3       (not yet confirmed in real-life use)
 *   • not archived
 *   • canonical level < 3   (not already mastered)
 *
 * Sorted by exposureCount descending (highest-drilled first), then alphabetically.
 * Limited to `limit` items for the strip preview (default 4).
 */
export function getAlmostMasteredItems(items: VocabItem[], limit = 4): VocabItem[] {
  return items
    .filter(
      (i) =>
        !i.archived &&
        (i.exposureCount ?? 0) >= 6 &&
        usagePoints(i.activation.usageLogs) < 3 &&
        getCanonicalLevel(i) < 3,
    )
    .sort((a, b) => {
      const expDiff = (b.exposureCount ?? 0) - (a.exposureCount ?? 0)
      return expDiff !== 0 ? expDiff : a.term.localeCompare(b.term)
    })
    .slice(0, limit)
}

// ── Focus confidence summary ──────────────────────────────────────────────────

/**
 * Returns the confidence distribution for the active focus items only.
 *
 * Scoped to focus items — deliberately different from `getConfidenceDistribution`
 * in statsLogic.ts, which covers the whole library (excluding inbox).
 * Different denominator; do not mix these two functions.
 *
 * An item is "unset" when confidenceLevel is 0 or absent.
 */
export function getFocusConfidenceSummary(focusItems: VocabItem[]): ConfidenceDistribution {
  const dist: ConfidenceDistribution = { unset: 0, red: 0, yellow: 0, green: 0 }
  for (const item of focusItems) {
    const level = item.activation?.confidenceLevel ?? 0
    if      (level === 1) dist.red++
    else if (level === 2) dist.yellow++
    else if (level === 3) dist.green++
    else                  dist.unset++
  }
  return dist
}

// ── Today nudge ───────────────────────────────────────────────────────────────

export interface TodayNudge {
  text: string
  action: string | null
  actionLabel: string
}

/**
 * Returns the single highest-priority nudge for the Today page.
 *
 * Priority order:
 *   1. No focus words → prompt to set up focus
 *   2. Red confidence > 35% of focus → challenge encouragement
 *   3. Almost-mastered items exist → real-life use prompt
 *   4. dueCount > 10 → prompt a session
 *   5. Session done today → post-session encouragement
 *   6. Default → general encouragement
 */
export function getTodayNudge(
  items: VocabItem[],
  focusItems: VocabItem[],
  sessionDoneToday: boolean,
  dueCount: number,
): TodayNudge {
  // 1. No focus words yet
  if (focusItems.length === 0) {
    return {
      text: 'Add words to your Focus to start tracking real-life practice.',
      action: '/focus',
      actionLabel: 'Set up focus',
    }
  }

  // 2. Red confidence dominant (> 35% of focus items)
  const conf  = getFocusConfidenceSummary(focusItems)
  const total = focusItems.length
  if (total > 0 && conf.red / total > 0.35) {
    return {
      text: `${conf.red} focus word${conf.red !== 1 ? 's' : ''} still feel${conf.red === 1 ? 's' : ''} out of reach. A Challenge session will help.`,
      action: '/challenge',
      actionLabel: 'Start Challenge',
    }
  }

  // 3. Almost-mastered items ready for real-life activation
  const totalAlmost = getAlmostMasteredItems(items).length
  if (totalAlmost > 0) {
    return {
      text: `${totalAlmost} word${totalAlmost !== 1 ? 's are' : ' is'} well-drilled and ready for real-life use.`,
      action: '/focus',
      actionLabel: 'See focus words',
    }
  }

  // 4. High due count
  if (dueCount > 10) {
    return {
      text: `${dueCount} words are ready to practise. A session now keeps your learning on track.`,
      action: '/challenge',
      actionLabel: 'Start Challenge',
    }
  }

  // 5. Session done today — soft encouragement
  if (sessionDoneToday) {
    return {
      text: 'Great work today. Try using one of your focus words in a real conversation.',
      action: '/focus',
      actionLabel: 'See focus words',
    }
  }

  // 6. Default
  return {
    text: 'Consistent daily practice is the fastest path to vocabulary mastery.',
    action: null,
    actionLabel: '',
  }
}

// ── Goal momentum ─────────────────────────────────────────────────────────────

export interface GoalMomentum {
  masteredCount: number
  startedCount: number
  comfortableCount: number
  percentComplete: number
  goalTarget: number
}

/**
 * Lightweight goal-progress summary for the Today health strip.
 *
 * comfortableCount = items with confidenceLevel >= 2 (yellow or green).
 * percentComplete  = masteredCount / goalTarget × 100, clamped 0–100.
 */
export function getGoalMomentum(items: VocabItem[], goalTarget = 1500): GoalMomentum {
  const masteredCount    = items.filter((i) => getCanonicalLevel(i) === 3).length
  const startedCount     = items.filter((i) => (i.exposureCount ?? 0) > 0 || i.status !== 'inbox').length
  const comfortableCount = items.filter((i) => (i.activation?.confidenceLevel ?? 0) >= 2).length
  const percentComplete  = Math.min(100, Math.round((masteredCount / Math.max(goalTarget, 1)) * 100))

  return { masteredCount, startedCount, comfortableCount, percentComplete, goalTarget }
}
