/**
 * progressPageLogic.ts
 *
 * Pure helper functions for the new Progress page (Phase 1).
 * No React, no store, no async — plain data in, plain data out.
 *
 * Design intent: the Progress page is a reflective, emotionally honest
 * view of where the learner actually stands.  Every function here serves
 * that goal — showing state, not scoring performance.
 */

import { subDays, format } from 'date-fns'
import type { VocabItem } from '@/types/vocabulary'
import { getDisplayStage, DisplayStage } from '@/lib/progressionLogic'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Per-stage word count, derived from live item data. */
export type StageDistribution = Record<DisplayStage, number>

/**
 * A word sitting at the Activate stage — drilled, waiting for real-life use.
 * daysKnown is the number of full days since the word was created.
 */
export interface ActivateItem {
  id: string
  term: string
  daysKnown: number
}

/**
 * One day's activity dot for the 90-day momentum trail.
 * `points` comes from the gamification pointsHistory store.
 * `active` is true if any points were earned that day.
 */
export interface DayActivityDot {
  dateKey: string   // YYYY-MM-DD
  label: string     // 'May 1'
  points: number
  active: boolean
}

/** Input for the headline engine. */
export interface HeadlineInput {
  aliveCount: number
  masteredCount: number
  activateCount: number
  totalInLibrary: number
  stageDistribution: StageDistribution
  usesThisWeek: number
  streakDays: number
}

/** The two-line headline result. */
export interface ProgressHeadline {
  /** Short, emotionally resonant main line. */
  main: string
  /** Calm, factual supporting line. */
  sub: string
}

// ── Stage distribution ─────────────────────────────────────────────────────────

/**
 * Count items per DisplayStage using live derivation.
 * Archived items and inbox-only items are excluded.
 */
export function getStageDistribution(items: VocabItem[]): StageDistribution {
  const dist: StageDistribution = {
    new: 0,
    introduced: 0,
    drilling: 0,
    activate: 0,
    mastered: 0,
  }
  for (const item of items) {
    if (item.archived) continue
    dist[getDisplayStage(item)]++
  }
  return dist
}

// ── Alive vocabulary count ────────────────────────────────────────────────────

/**
 * "Alive vocabulary" = words the learner has genuinely made their own.
 *
 * Includes:
 *   • Mastered words (display stage = 'mastered')
 *   • Activate-stage words with at least one logged real-life use
 *     (partial activation counts — the word has been attempted outside the app)
 *
 * Excludes archived items.
 */
export function getAliveVocabCount(items: VocabItem[]): number {
  let count = 0
  for (const item of items) {
    if (item.archived) continue
    const stage = getDisplayStage(item)
    if (stage === 'mastered') {
      count++
    } else if (stage === 'activate' && (item.activation?.usageCount ?? 0) > 0) {
      count++
    }
  }
  return count
}

// ── Activate-stage items ──────────────────────────────────────────────────────

/**
 * Returns all non-archived items at the Activate stage.
 * Sorted by daysKnown descending (words waiting longest come first).
 */
export function getActivateStageItems(items: VocabItem[]): ActivateItem[] {
  const now = Date.now()
  return items
    .filter((i) => !i.archived && getDisplayStage(i) === 'activate')
    .map((i) => ({
      id: i.id,
      term: i.term,
      daysKnown: Math.floor((now - new Date(i.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => b.daysKnown - a.daysKnown)
}

// ── 90-day activity trail ─────────────────────────────────────────────────────

/**
 * Build the 90-day activity trail from the gamification pointsHistory.
 * Returns one DayActivityDot per day, oldest first (index 0 = 89 days ago).
 */
export function get90DayActivity(
  pointsHistory: Record<string, number>,
  days = 90,
): DayActivityDot[] {
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(new Date(), days - 1 - i)
    const dateKey = day.toISOString().slice(0, 10)
    const points = pointsHistory[dateKey] ?? 0
    return {
      dateKey,
      label: format(day, 'MMM d'),
      points,
      active: points > 0,
    }
  })
}

// ── Relative time ─────────────────────────────────────────────────────────────

/**
 * Human-readable relative time string for display next to Activate-stage words.
 * Custom implementation — avoids importing formatDistanceToNow from date-fns
 * to keep the output phrasing exactly right for this context.
 *
 * Returns strings like "3 days ago", "2 weeks ago", "4 months ago".
 * For very recent items (< 2 days) returns "yesterday" or "today".
 */
export function relativeTime(isoDate: string): string {
  const ms   = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))

  if (days <= 0)  return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)   return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  return 'over a year ago'
}

// ── Headline engine ───────────────────────────────────────────────────────────

/**
 * Priority-based headline engine.
 *
 * Evaluates several signals and returns the highest-priority message.
 * The headline is intentionally calm, never punishing, never excessively
 * celebratory.  It answers: "What does this collection mean right now?"
 *
 * Priority order (first match wins):
 *   1. Significant milestone reached (alive ≥ 100, 250, 500, 1000…)
 *   2. Strong momentum this week (streak ≥ 7 or uses ≥ 5)
 *   3. Good momentum (streak ≥ 3 or uses ≥ 2)
 *   4. Activate backlog growing (≥ 10 words waiting)
 *   5. Just started (alive < 5)
 *   6. Default: steady progress
 */
export function buildProgressHeadline(input: HeadlineInput): ProgressHeadline {
  const { aliveCount, masteredCount, activateCount, totalInLibrary, usesThisWeek, streakDays } = input

  // ── Milestone: 1 000+ ─────────────────────────────────────────────────────
  if (aliveCount >= 1000) {
    return {
      main: 'A thousand words, genuinely yours.',
      sub: `${aliveCount.toLocaleString()} words you can actually reach for.`,
    }
  }

  // ── Milestone: 500+ ──────────────────────────────────────────────────────
  if (aliveCount >= 500) {
    return {
      main: 'Five hundred words in your active vocabulary.',
      sub: 'That is a substantial range — keep going.',
    }
  }

  // ── Milestone: 250+ ──────────────────────────────────────────────────────
  if (aliveCount >= 250) {
    return {
      main: 'A rich foundation is forming.',
      sub: `${aliveCount} words you have drilled and used.`,
    }
  }

  // ── Milestone: 100+ ──────────────────────────────────────────────────────
  if (aliveCount >= 100) {
    return {
      main: 'Over a hundred words alive in your vocabulary.',
      sub: `${masteredCount} mastered · ${activateCount} ready to use.`,
    }
  }

  // ── Strong momentum ───────────────────────────────────────────────────────
  if (streakDays >= 7 || usesThisWeek >= 5) {
    return {
      main: 'You are building real momentum.',
      sub: aliveCount > 0
        ? `${aliveCount} words in active use.`
        : 'Keep practising and logging real-life uses.',
    }
  }

  // ── Good momentum ─────────────────────────────────────────────────────────
  if (streakDays >= 3 || usesThisWeek >= 2) {
    return {
      main: 'Good progress this week.',
      sub: aliveCount > 0
        ? `${aliveCount} words you can genuinely use.`
        : `${totalInLibrary} words in your library.`,
    }
  }

  // ── Activate backlog ──────────────────────────────────────────────────────
  if (activateCount >= 10) {
    return {
      main: `${activateCount} words are ready for real-life use.`,
      sub: 'Try one in a conversation, email, or meeting today.',
    }
  }

  // ── Just started ──────────────────────────────────────────────────────────
  if (aliveCount < 5) {
    if (totalInLibrary === 0) {
      return {
        main: 'Your vocabulary journey starts here.',
        sub: 'Add words to your library to begin.',
      }
    }
    return {
      main: 'Your vocabulary is just getting started.',
      sub: `${totalInLibrary} word${totalInLibrary !== 1 ? 's' : ''} in your library — keep practising.`,
    }
  }

  // ── Default: steady ───────────────────────────────────────────────────────
  return {
    main: `${aliveCount} words you can genuinely reach for.`,
    sub: masteredCount > 0
      ? `${masteredCount} mastered · ${activateCount} in activation.`
      : `${activateCount} word${activateCount !== 1 ? 's' : ''} ready for real-life use.`,
  }
}
