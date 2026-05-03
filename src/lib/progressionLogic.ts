/**
 * progressionLogic.ts
 *
 * Pure functions for the new 4-point learning level system.
 *
 *   0 = new       — never exposed via Daily Challenge
 *   1 = learning  — 1–2 exposures
 *   2 = familiar  — 3–7 exposures
 *   3 = mastered  — 8 exposures AND sentence produced
 *
 * The legacy `status` field is preserved for backward compatibility.
 * Use `deriveLevel` for any new logic; use `levelFromStatus` only in migration.
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
 * This is the single source of truth for level in new code paths.
 *
 * Level 3 (Mastered) requires:
 *   • exposureCount >= 8  (full challenge drilling), AND
 *   • proof of active production:
 *       – sentenceProduced = true  (wrote a sentence in challenge), OR
 *       – usageCount >= 3          (logged ≥ 3 real-life uses in Phase 6)
 *
 * Backward compat: old items that became mastered via sentenceProduced still
 * qualify.  Items with usageCount >= 3 but exp < 8 stay at Level 2.
 */
export function deriveLevel(item: VocabItem): Level {
  const exp = item.exposureCount ?? 0
  if (exp === 0) return 0
  if (exp <= 2) return 1
  if (exp <= 7) return 2
  // 8+ exposures: Level 3 if the learner has produced the word in any form
  const usageCount = item.activation?.usageCount ?? 0
  if (item.review.sentenceProduced || usageCount >= 3) return 3
  return 2 // drilled but not yet activated — still familiar
}

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
