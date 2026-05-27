/**
 * activationLogic.ts
 *
 * Pure helper functions for the "Use Now" real-world activation flow.
 * All functions are side-effect-free — they accept plain data and return
 * plain data.  No React, no store, no async.
 *
 * ── Selection heuristic (two tiers, capped at MAX_ACTIVATION_WORDS) ───────────
 *
 * Tier A — "Activate" stage words
 *   getDisplayStage(item) === 'activate'
 *   exposureCount >= 8 AND no activation evidence yet.
 *   These are definitionally ready for real-world use: fully drilled,
 *   waiting for the learner to deploy them in speech or writing.
 *
 * Tier B — High-exposure / passive-only words
 *   exposureCount >= 5 AND zero confirmed real-life usage logs.
 *   Well-drilled words the learner has never attempted in real life.
 *   Fills remaining slots when Tier A is small or empty.
 *
 * Within each tier, items are sorted by priority score:
 *   1. Focus words first (inFocus || weeklyFocus)
 *   2. Phrases/chunks/idioms/collocations before single words
 *      (more conversationally deployable)
 *   3. Exposure count descending (most drilled = most ready)
 */

import type { VocabItem } from '@/types/vocabulary'
import { getDisplayStage, getCanonicalLevel } from '@/lib/progressionLogic'
import { usagePoints } from '@/lib/mastery'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum words surfaced in the activation sheet. */
export const MAX_ACTIVATION_WORDS = 8

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivationTier = 'activate' | 'high-exposure'

// ── Internals ─────────────────────────────────────────────────────────────────

/**
 * True when the item type is a multi-word expression.
 * Phrases are prioritised — they tend to be more immediately deployable
 * in real conversation than isolated single words.
 */
function isMultiWord(item: VocabItem): boolean {
  return item.type !== 'word'
}

/**
 * Numeric sort key — higher = shown earlier.
 *
 * Intentional weighting:
 *   focus membership  → +1000  (in-focus words surface first)
 *   multi-word item   → +100   (phrases before single words)
 *   exposureCount     → +0–8   (more drilled = more ready)
 */
function activationSortScore(item: VocabItem): number {
  const focusBonus    = (item.inFocus || item.weeklyFocus) ? 1000 : 0
  const phraseBonus   = isMultiWord(item) ? 100 : 0
  const exposureScore = item.exposureCount ?? 0
  return focusBonus + phraseBonus + exposureScore
}

function sortedByPriority(items: VocabItem[]): VocabItem[] {
  return [...items].sort((a, b) => activationSortScore(b) - activationSortScore(a))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the curated list of words to show in the "Use Now" activation sheet.
 *
 * Result is at most MAX_ACTIVATION_WORDS items, with Tier A words taking
 * precedence over Tier B words.
 *
 * Excludes archived items and items already mastered (status === 'mastered'
 * OR canonical level 3 via deriveLevel — the getDisplayStage guard handles
 * the latter via the 'mastered' stage check).
 */
export function getActivationWords(items: VocabItem[]): VocabItem[] {
  // Exclude archived items and items that are already mastered.
  // We check both the stored status field (fast path for legacy-mastered items)
  // AND the canonical level (catches items where status is stale — e.g. an item
  // with status='activation' that has already met the mastery gate via
  // sentenceProduced / usageCount / confidenceLevel).
  const eligible = items.filter(
    (i) => !i.archived && i.status !== 'mastered' && getCanonicalLevel(i) < 3,
  )

  // Tier A: activate-stage — fully drilled, not yet activated in real life
  const tierA = eligible.filter((i) => getDisplayStage(i) === 'activate')

  // Tier B: high-exposure + zero real-life usage, not already in Tier A
  const tierAIds = new Set(tierA.map((i) => i.id))
  const tierB = eligible.filter(
    (i) =>
      !tierAIds.has(i.id) &&
      (i.exposureCount ?? 0) >= 5 &&
      usagePoints(i.activation.usageLogs) === 0,
  )

  return [
    ...sortedByPriority(tierA),
    ...sortedByPriority(tierB),
  ].slice(0, MAX_ACTIVATION_WORDS)
}

/**
 * Whether any words are eligible for the activation sheet.
 * Used by the Dashboard strip to decide whether to render.
 */
export function hasActivationWords(items: VocabItem[]): boolean {
  return getActivationWords(items).length > 0
}

/**
 * Best example sentence for a word card in the activation sheet.
 * Prefers the work-context sentence (more professionally relevant)
 * over the generic example sentence.
 *
 * Priority: workSentence > exampleSentence > undefined
 */
export function getActivationExample(item: VocabItem): string | undefined {
  return item.workSentence ?? item.exampleSentence
}
