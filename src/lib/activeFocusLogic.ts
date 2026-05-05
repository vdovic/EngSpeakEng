/**
 * activeFocusLogic.ts
 *
 * Pure functions for the Active Focus concept.
 *
 * Active Focus (20–25 words) is a curated view-subset of the Focus Portfolio
 * (up to 150 words).  These functions are a selection / presentation layer only
 * — they do NOT write to the store or IndexedDB.
 *
 * Exports:
 *   ACTIVE_FOCUS_LIMIT          — target visible size (25)
 *   selectActiveFocusItems      — picks the best N items to show prominently
 *   getSuggestedUsagePrompt     — one compact "try using it" tip per item
 *   getFocusProgressSummary     — breakdowns for the Portfolio Overview panel
 *   getCandidateReasonBadge     — human-readable reason badge for candidates
 */

import type { VocabItem } from '@/types/vocabulary'
import { deriveLevel } from '@/lib/progressionLogic'
import { usagePoints } from '@/lib/mastery'
import { isDueChallengeNow } from '@/lib/challengeSchedule'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Target size of the Active Focus visible set. */
export const ACTIVE_FOCUS_LIMIT = 25

// ── selectActiveFocusItems ────────────────────────────────────────────────────

/**
 * Returns the best `limit` items to show in the Active Focus section.
 *
 * Selection priority:
 *   1. Due for challenge now               (+50)
 *   2. Low/mid exposure (0–5)             (+40 / +30 / +10)
 *   3. High difficulty score              (+20 / +10)
 *   4. Low real-life usage                (+20 / +10)
 *   5. Theme relevance                    (+15)
 *   6. Recently added to library          (+15 / +5)
 *   7. Mastered items deprioritised       (−40)
 *
 * Items are deterministically sorted — no Math.random().
 */
export function selectActiveFocusItems(
  focusItems: VocabItem[],
  limit: number = ACTIVE_FOCUS_LIMIT,
  activeThemes: string[] = [],
): VocabItem[] {
  const scored = focusItems.map((item) => {
    let score = 0
    const exp   = item.exposureCount ?? 0
    const uses  = usagePoints(item.activation.usageLogs)
    const level = deriveLevel(item)

    // Due for challenge → highest priority
    if (isDueChallengeNow(exp, item.nextChallengeDate)) score += 50

    // Low/mid exposure → actively learning
    if      (exp <= 1) score += 40
    else if (exp <= 5) score += 30
    else if (exp <= 7) score += 10

    // High difficulty → needs more attention
    const difficulty = item.difficultyScore ?? 50
    if      (difficulty > 70) score += 20
    else if (difficulty > 55) score += 10

    // Low real-life usage → encourage activation
    if      (uses === 0) score += 20
    else if (uses < 3)   score += 10

    // Theme relevance
    if ((item.themes ?? []).some((t) => activeThemes.includes(t))) score += 15

    // Mastered items → deprioritise (maintenance only)
    if (level === 3) score -= 40

    // Freshness boost — new words benefit from early active engagement
    const daysSince = (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000
    if      (daysSince < 7)  score += 15
    else if (daysSince < 14) score += 5

    return { item, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}

// ── getSuggestedUsagePrompt ───────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`
}

/**
 * Returns one compact "try using it" suggestion for an Active Focus word.
 *
 * Priority: realLifeTask → workSentence → exampleSentence → sentenceFrames →
 *           collocations → generic fallback.
 *
 * No AI call — derives from existing item fields only.
 */
export function getSuggestedUsagePrompt(item: VocabItem): string {
  if (item.realLifeTask)              return truncate(item.realLifeTask, 100)
  if (item.workSentence)             return `Try in an email or meeting: "${truncate(item.workSentence, 75)}"`
  if (item.exampleSentence)          return `Example: "${truncate(item.exampleSentence, 75)}"`
  if (item.sentenceFrames.length > 0) return `Start with: "${truncate(item.sentenceFrames[0], 75)}"`
  if (item.collocations.length > 0)  return `Try using: "${item.collocations[0]}…"`
  return 'Try using this word in a meeting, email, note, or conversation.'
}

// ── getFocusProgressSummary ───────────────────────────────────────────────────

export interface FocusProgressSummary {
  total: number
  activeCount: number
  newCount: number
  learningCount: number
  familiarCount: number
  masteredCount: number
}

/**
 * Aggregate stats for the Portfolio Overview panel.
 * Uses deriveLevel() so values are always fresh (never stale from stored level).
 */
export function getFocusProgressSummary(items: VocabItem[]): FocusProgressSummary {
  let newCount = 0
  let learningCount = 0
  let familiarCount = 0
  let masteredCount = 0

  for (const item of items) {
    const level = deriveLevel(item)
    if      (level === 0) newCount++
    else if (level === 1) learningCount++
    else if (level === 2) familiarCount++
    else                  masteredCount++
  }

  return {
    total:         items.length,
    activeCount:   Math.min(items.length, ACTIVE_FOCUS_LIMIT),
    newCount,
    learningCount,
    familiarCount,
    masteredCount,
  }
}

// ── getCandidateReasonBadge ───────────────────────────────────────────────────

export interface CandidateReasonBadge {
  label: string
  /** Tailwind classes for text + background + border colour. */
  colorClass: string
}

/**
 * Returns a human-readable reason badge for a Suggested Candidate.
 *
 * Priority: theme match → recall readiness → exposure tier → new.
 * Never surfaces internal scoring numbers or the 30/30/30 balance logic.
 */
export function getCandidateReasonBadge(
  item: VocabItem,
  activeThemes: string[],
): CandidateReasonBadge {
  if ((item.themes ?? []).some((t) => activeThemes.includes(t))) {
    return { label: 'Matches your themes', colorClass: 'text-brand-600 bg-brand-50 border-brand-100' }
  }
  if (item.review.successfulRecalls >= 2) {
    return { label: 'Ready to practise', colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
  }
  const exp = item.exposureCount ?? 0
  if (exp >= 2 && exp <= 5) {
    return { label: 'Good next step', colorClass: 'text-violet-600 bg-violet-50 border-violet-100' }
  }
  return { label: 'New', colorClass: 'text-slate-500 bg-slate-50 border-slate-200' }
}
