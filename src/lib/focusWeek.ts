/**
 * focusWeek.ts
 *
 * Utilities for the "Focus This Week" feature:
 *  - Priority score calculation
 *  - Weekly reset (keep top 65% by priority, replace rest)
 *  - Week-start key (Monday-based)
 *  - Auto-promote rules A & B
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Week key ──────────────────────────────────────────────────────────────────

/** Returns ISO date string of the most recent Monday (week start). */
export function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()                      // 0 = Sun, 1 = Mon …
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  return monday.toISOString().split('T')[0]     // "YYYY-MM-DD"
}

/** localStorage key for the stored week start */
export const FOCUS_WEEK_LS_KEY = 'focus-week-start'

// ── Priority score ────────────────────────────────────────────────────────────

export const FOCUS_MAX = 150   // raised from 50 in Phase 1
export const FOCUS_RECOMMENDED_MIN = 15
export const FOCUS_RECOMMENDED_MAX = 25
export const WEEKLY_KEEP_RATIO = 0.65           // keep top 65% on reset

/**
 * Computes a focus priority score for a single item.
 * Higher score = more important to keep / promote to Focus.
 *
 *   Recent failures  → up to 125 pts   (struggling word needs real-life practice)
 *   Sweet-spot recalls → 20 pts        (reviewed 2–6 times: ready but not fluent)
 *   Low challenge exposure → up to 40  (hasn't been drilled enough yet)
 *   Recently added → 15 pts            (fresh vocab benefits from active usage)
 *   Active theme relevance → 15 pts    (aligned with user's current goals)
 */
export function calcFocusPriority(item: VocabItem, activeThemeNames: string[]): number {
  let score = 0

  // How many reviews ended in failure?
  const failures = Math.max(0, item.review.reviewCount - item.review.successfulRecalls)
  score += Math.min(failures, 5) * 25

  // Sweet spot: recalled 2–6 times — knows it but hasn't activated it
  const recalls = item.review.successfulRecalls
  if (recalls >= 2 && recalls <= 6) score += 20

  // Low challenge exposure
  const exp = item.exposureCount ?? 0
  score += Math.max(0, 4 - exp) * 10

  // Freshness (recently added to library)
  const daysSinceAdded =
    (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
  if (daysSinceAdded < 14) score += 15

  // Theme relevance
  const inActiveTheme = (item.themes ?? []).some((t) => activeThemeNames.includes(t))
  if (inActiveTheme) score += 15

  return score
}

// ── Candidate selection for auto-promote ──────────────────────────────────────

/**
 * Rule A — Ready to use: 2–3 successful recalls, not yet in Focus.
 * These are words the user knows well enough to try using in real life.
 */
export function getRuleACandidates(items: VocabItem[]): VocabItem[] {
  return items.filter(
    (i) =>
      !i.weeklyFocus && !i.inFocus &&
      !i.archived &&
      i.status !== 'inbox' &&
      i.status !== 'mastered' &&
      i.review.successfulRecalls >= 2 &&
      i.review.successfulRecalls <= 3,
  )
}

/**
 * Rule B — Struggling: more failures than successes, reviewed ≥ 3 times.
 * Actively practicing in real life helps break the recall block.
 * Returns items sorted by most-struggling first.
 */
export function getRuleBCandidates(items: VocabItem[]): VocabItem[] {
  return items
    .filter(
      (i) =>
        !i.weeklyFocus && !i.inFocus &&
        !i.archived &&
        i.status !== 'inbox' &&
        i.review.reviewCount >= 3 &&
        i.review.reviewCount - i.review.successfulRecalls >= 2,
    )
    .sort(
      (a, b) =>
        b.review.reviewCount -
        b.review.successfulRecalls -
        (a.review.reviewCount - a.review.successfulRecalls),
    )
}

// ── Weekly reset ──────────────────────────────────────────────────────────────

export interface WeeklyResetResult {
  keptIds: string[]
  removedIds: string[]
}

/**
 * Computes which focus items to keep and which to evict at the start of a new week.
 * Keeps the top WEEKLY_KEEP_RATIO by priority score; removes the rest.
 */
export function computeWeeklyReset(
  focusItems: VocabItem[],
  activeThemeNames: string[],
): WeeklyResetResult {
  if (focusItems.length === 0) return { keptIds: [], removedIds: [] }

  const scored = focusItems
    .map((i) => ({ id: i.id, score: calcFocusPriority(i, activeThemeNames) }))
    .sort((a, b) => b.score - a.score)

  const keepCount = Math.max(1, Math.round(scored.length * WEEKLY_KEEP_RATIO))
  const keptIds = scored.slice(0, keepCount).map((x) => x.id)
  const removedIds = scored.slice(keepCount).map((x) => x.id)

  return { keptIds, removedIds }
}
