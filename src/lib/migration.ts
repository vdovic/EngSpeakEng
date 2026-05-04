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
 * Returns a fully normalised copy of `item` with all fields populated.
 * Does not mutate the original.
 *
 * Covers:
 *   Phase-1: level, inFocus, difficultyScore
 *   Phase-6: activation.usageLogs (old items may have no activation object)
 *   All phases: array fields default to []
 */
export function migrateItem(item: VocabItem): VocabItem {
  // Detect whether any field needs fixing before allocating a new object.
  const needsActivationFix =
    !item.activation ||
    !Array.isArray(item.activation.usageLogs)

  const needsPhase1Fix =
    item.level === undefined ||
    item.level === null ||
    item.inFocus === undefined ||
    item.inFocus === null ||
    item.difficultyScore === undefined ||
    item.difficultyScore === null

  const needsArrayFix =
    !item.tags || !item.themes || !item.synonyms ||
    !item.antonyms || !item.collocations ||
    !item.sentenceFrames || !item.relatedPhrases

  // Fast-path: nothing to do if everything is already present
  if (!needsActivationFix && !needsPhase1Fix && !needsArrayFix) {
    return item
  }

  const migrated = { ...item }

  // ── activation (Phase-6) ───────────────────────────────────────────────────
  // Old items may have no activation object at all, or have one without
  // usageLogs. Ensure the full shape is always present.
  if (needsActivationFix) {
    const existing = item.activation as Partial<VocabItem['activation']> | undefined
    migrated.activation = {
      requiredUses: existing?.requiredUses ?? 3,
      usageCount:   existing?.usageCount   ?? 0,
      usageLogs:    Array.isArray(existing?.usageLogs) ? existing.usageLogs : [],
    }
  }

  // ── level ──────────────────────────────────────────────────────────────────
  if (migrated.level === undefined || migrated.level === null) {
    const exp = item.exposureCount ?? 0
    migrated.level = exp > 0
      ? deriveLevel(item)
      : levelFromStatus(item.status)
  }

  // ── inFocus ────────────────────────────────────────────────────────────────
  if (migrated.inFocus === undefined || migrated.inFocus === null) {
    migrated.inFocus = item.weeklyFocus ?? false
  }

  // ── difficultyScore ────────────────────────────────────────────────────────
  if (migrated.difficultyScore === undefined || migrated.difficultyScore === null) {
    const review = item.review ?? { reviewCount: 0, successfulRecalls: 0 }
    const failures = Math.max(0, review.reviewCount - review.successfulRecalls)
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
