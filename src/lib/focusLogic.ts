/**
 * focusLogic.ts
 *
 * Pure functions for the "My Current Focus" (inFocus) system.
 *
 * Key changes from the old focusWeek logic:
 *   • FOCUS_MAX raised from 50 → 150
 *   • Works with both `inFocus` (new) and `weeklyFocus` (legacy) during transition
 *   • Priority scoring now also rewards high difficultyScore
 *   • New helpers: selectEvictionCandidates, getFocusItems
 *
 * All functions are pure — they take data and return results.
 * The store applies the patches and writes to IndexedDB.
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum items that can be in focus simultaneously. */
export const FOCUS_MAX = 150

/** Suggested working range for optimal learning. */
export const FOCUS_RECOMMENDED_MIN = 20
export const FOCUS_RECOMMENDED_MAX = 50

/** Fraction of focus items to retain on weekly reset. */
export const WEEKLY_KEEP_RATIO = 0.65

// ── Priority score ────────────────────────────────────────────────────────────

/**
 * Computes a focus priority score for a single item.
 * Higher score = more important to keep / add to focus.
 *
 *  Recent failures      → up to 125 pts  (struggling word needs real-life practice)
 *  Sweet-spot recalls   → 20 pts         (reviewed 2–6×, not yet fluent)
 *  Low challenge count  → up to 40 pts   (not drilled enough yet)
 *  Recently added       → 15 pts         (fresh vocab benefits from active usage)
 *  Theme relevance      → 15 pts         (aligned with current goals)
 *  High difficulty      → up to 20 pts   (hard word, needs more attention)
 */
export function calcFocusPriority(item: VocabItem, activeThemeNames: string[]): number {
  let score = 0

  // Review failures
  const failures = Math.max(0, item.review.reviewCount - item.review.successfulRecalls)
  score += Math.min(failures, 5) * 25

  // Sweet-spot recalls (knows it but hasn't fully activated)
  const recalls = item.review.successfulRecalls
  if (recalls >= 2 && recalls <= 6) score += 20

  // Low challenge exposure (4 or fewer steps completed)
  const exp = item.exposureCount ?? 0
  score += Math.max(0, 4 - exp) * 10

  // Freshness (added within 14 days)
  const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
  if (daysSince < 14) score += 15

  // Theme alignment
  if ((item.themes ?? []).some((t) => activeThemeNames.includes(t))) score += 15

  // High learner-specific difficulty
  const difficulty = item.difficultyScore ?? 50
  if (difficulty > 70) score += 20
  else if (difficulty > 55) score += 10

  return score
}

// ── Eviction ──────────────────────────────────────────────────────────────────

/**
 * Given the current focus items and how many slots need to be freed,
 * returns the ids of the lowest-priority items to evict.
 */
export function selectEvictionCandidates(
  currentFocusItems: VocabItem[],
  slotsNeeded: number,
  activeThemeNames: string[],
): string[] {
  if (slotsNeeded <= 0) return []
  return currentFocusItems
    .map((i) => ({ id: i.id, score: calcFocusPriority(i, activeThemeNames) }))
    .sort((a, b) => a.score - b.score)   // ascending — lowest priority first
    .slice(0, slotsNeeded)
    .map((x) => x.id)
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Returns all focus items sorted by priority descending.
 * Checks both `inFocus` and `weeklyFocus` during the transition period.
 */
export function getFocusItems(items: VocabItem[]): VocabItem[] {
  return items
    .filter((i) => (i.inFocus || i.weeklyFocus) && !i.archived && i.status !== 'mastered')
    .sort((a, b) => (b.focusPriority ?? 0) - (a.focusPriority ?? 0))
}

// ── Weekly reset ──────────────────────────────────────────────────────────────

export interface FocusResetResult {
  keptIds: string[]
  removedIds: string[]
}

/**
 * Determines which focus items survive the weekly reset.
 * Keeps the top WEEKLY_KEEP_RATIO by priority score; evicts the rest.
 */
export function computeFocusReset(
  focusItems: VocabItem[],
  activeThemeNames: string[],
): FocusResetResult {
  if (focusItems.length === 0) return { keptIds: [], removedIds: [] }

  const scored = focusItems
    .map((i) => ({ id: i.id, score: calcFocusPriority(i, activeThemeNames) }))
    .sort((a, b) => b.score - a.score)

  const keepCount = Math.max(1, Math.round(scored.length * WEEKLY_KEEP_RATIO))
  return {
    keptIds:    scored.slice(0, keepCount).map((x) => x.id),
    removedIds: scored.slice(keepCount).map((x) => x.id),
  }
}

// ── Auto-promote candidates ───────────────────────────────────────────────────

/**
 * Rule A — "Ready to use": 2–3 successful recalls, not yet in focus.
 * These words are known well enough to practice in real conversation.
 */
export function getRuleACandidates(items: VocabItem[]): VocabItem[] {
  return items.filter(
    (i) =>
      !i.inFocus && !i.weeklyFocus &&
      !i.archived &&
      i.status !== 'inbox' && i.status !== 'mastered' &&
      i.review.successfulRecalls >= 2 && i.review.successfulRecalls <= 3,
  )
}

/**
 * Rule B — "Struggling": failures exceed successes, reviewed ≥ 3 times.
 * Real-life usage helps break the recall block for these items.
 * Sorted most-struggling first.
 */
export function getRuleBCandidates(items: VocabItem[]): VocabItem[] {
  return items
    .filter(
      (i) =>
        !i.inFocus && !i.weeklyFocus &&
        !i.archived &&
        i.status !== 'inbox' &&
        i.review.reviewCount >= 3 &&
        i.review.reviewCount - i.review.successfulRecalls >= 2,
    )
    .sort(
      (a, b) =>
        (b.review.reviewCount - b.review.successfulRecalls) -
        (a.review.reviewCount - a.review.successfulRecalls),
    )
}
