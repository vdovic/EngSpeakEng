/**
 * migration.ts
 *
 * Normalises VocabItem records from any previous schema version to the current one.
 *
 * Design principles:
 *   • Idempotent — safe to run on already-migrated items
 *   • Non-destructive — never removes existing data
 *   • Deterministic — same input always produces same output
 *
 * Called inside vocabStore.load() on every startup;
 * items that already have all fields are returned unchanged.
 */

import type { VocabItem } from '@/types/vocabulary'
import { deriveLevel, levelFromStatus } from '@/lib/progressionLogic'
import { INITIAL_DIFFICULTY } from '@/lib/difficultyLogic'

/**
 * Returns a fully normalised copy of `item` with all Phase-1 fields populated.
 * Does not mutate the original.
 */
export function migrateItem(item: VocabItem): VocabItem {
  // Fast-path: nothing to do if all new fields are already present
  if (
    item.level !== undefined &&
    item.inFocus !== undefined &&
    item.difficultyScore !== undefined
  ) {
    return item
  }

  const migrated = { ...item }

  // ── level ──────────────────────────────────────────────────────────────────
  // Prefer deriving from exposureCount (runtime signal); fall back to status
  // for seed / imported items that have never been through Daily Challenge.
  if (migrated.level === undefined || migrated.level === null) {
    const exp = item.exposureCount ?? 0
    migrated.level = exp > 0
      ? deriveLevel(item)
      : levelFromStatus(item.status)
  }

  // ── inFocus ────────────────────────────────────────────────────────────────
  // Sync from the legacy weeklyFocus field so no focus data is lost.
  if (migrated.inFocus === undefined || migrated.inFocus === null) {
    migrated.inFocus = item.weeklyFocus ?? false
  }

  // ── difficultyScore ────────────────────────────────────────────────────────
  // Estimate from review history: items that were failed more than succeeded
  // start with a higher difficulty rating.
  if (migrated.difficultyScore === undefined || migrated.difficultyScore === null) {
    const failures = Math.max(
      0,
      item.review.reviewCount - item.review.successfulRecalls,
    )
    // Cap bump at +40 so even very weak items don't start at 100
    migrated.difficultyScore = Math.min(100, INITIAL_DIFFICULTY + failures * 8)
  }

  // ── Array fields — ensure they are never undefined ─────────────────────────
  migrated.tags            = item.tags            ?? []
  migrated.themes          = item.themes          ?? []
  migrated.synonyms        = item.synonyms        ?? []
  migrated.antonyms        = item.antonyms        ?? []
  migrated.collocations    = item.collocations    ?? []
  migrated.sentenceFrames  = item.sentenceFrames  ?? []
  migrated.relatedPhrases  = item.relatedPhrases  ?? []

  return migrated
}
