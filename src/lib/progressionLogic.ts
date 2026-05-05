/**
 * progressionLogic.ts
 *
 * Pure functions for the 4-point learning level system.
 *
 *   0 = new       — never exposed via Daily Challenge
 *   1 = learning  — 1–2 exposures
 *   2 = familiar  — 3–7 exposures
 *   3 = mastered  — 8+ exposures AND activation evidence
 *
 * Level 3 (Mastered) requires BOTH:
 *   • exposureCount >= 8  (full challenge drilling completed)
 *   • activation evidence — at least one of:
 *       – review.sentenceProduced = true        (produced a sentence in a challenge), OR
 *       – activation.usageCount >= 3            (logged ≥ 3 real-life uses), OR
 *       – activation.confidenceLevel >= 3       (self-reported comfort via ConfidenceDots)
 *
 * The legacy `status` field is preserved for backward compatibility.
 * Use `getCanonicalLevel` (= `deriveLevel`) for all runtime logic.
 * Use `levelFromStatus` only in migration.
 *
 * Do NOT use stored `item.level` for UI or calculations — it may be stale
 * if the store write was skipped or occurred before the mastery criteria
 * were updated.  Always call `getCanonicalLevel(item)` instead.
 */

import type { VocabItem, ItemStatus, Level } from '@/types/vocabulary'

export const LEVEL_LABEL: Record<Level, string> = {
  0: 'new',
  1: 'learning',
  2: 'familiar',
  3: 'mastered',
}

/**
 * Derives the current learning level from live item data.
 *
 * This is the single source of truth for level in all runtime code.
 * It is intentionally re-computed each time so that it can never be stale.
 *
 * Level 3 (Mastered) requires:
 *   • exposureCount >= 8, AND
 *   • proof of active production in any form:
 *       – review.sentenceProduced = true, OR
 *       – activation.usageCount >= 3 (≥ 3 logged real-life uses), OR
 *       – activation.confidenceLevel >= 3 (self-reported comfort via ConfidenceDots)
 *
 * Items without exposureCount >= 8 stay at Level 2 even with max confidence.
 * Old items that became mastered via sentenceProduced alone still qualify.
 */
export function deriveLevel(item: VocabItem): Level {
  const exp = item.exposureCount ?? 0
  if (exp === 0) return 0
  if (exp <= 2)  return 1
  if (exp <= 7)  return 2
  // 8+ exposures: Level 3 (Mastered) when the learner has activated the word
  const usageCount       = item.activation?.usageCount ?? 0
  const confidenceLevel  = item.activation?.confidenceLevel ?? 0
  if (item.review.sentenceProduced || usageCount >= 3 || confidenceLevel >= 3) return 3
  return 2   // fully drilled but not yet activated — stays at Familiar
}

/**
 * Canonical level accessor — use this everywhere in UI and calculations.
 *
 * Alias of `deriveLevel`.  Having an explicit canonical name makes it
 * easy to grep for stale `item.level` usages and enforce the standard:
 *
 *   ✓ getCanonicalLevel(item)   — always correct
 *   ✗ item.level                — may be stale after missed store writes
 *   ✗ item.level ?? deriveLevel — still risks using a stale stored value
 */
export const getCanonicalLevel = deriveLevel

/**
 * Maps a legacy ItemStatus to the closest Level equivalent.
 * Used in migration only — do not use in runtime logic.
 */
export function levelFromStatus(status: ItemStatus): Level {
  switch (status) {
    case 'inbox':      return 0
    case 'learning':   return 1
    case 'stable':     return 2
    case 'activation': return 2
    case 'mastered':   return 3
    default:           return 0
  }
}
