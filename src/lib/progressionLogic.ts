/**
 * progressionLogic.ts
 *
 * Pure functions for the learning level and display-stage systems.
 *
 * ── Level system (4-point, internal) ────────────────────────────────────────
 *   0 = new       — never exposed via Daily Challenge
 *   1 = learning  — 1–2 exposures
 *   2 = familiar  — 3–7 exposures (also: 8 exposures without activation)
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
 *
 * ── DisplayStage system (5-point, learner-facing) ────────────────────────────
 *   'new'        — in Focus, never practiced
 *   'introduced' — 1–2 challenge exposures
 *   'drilling'   — 3–7 challenge exposures
 *   'activate'   — 8 exposures complete, awaiting real-life activation
 *   'mastered'   — 8 exposures AND activation evidence (or legacy-mastered)
 *
 * Use `getDisplayStage(item)` for all user-facing progression display.
 * Never store the result — always derive fresh from live item data.
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

// ── DisplayStage system ───────────────────────────────────────────────────────

/**
 * The learner-facing 5-stage progression model.
 *
 *   new        — word is in Focus but has never been challenged
 *   introduced — 1–2 challenge exposures (early recall forming)
 *   drilling   — 3–7 challenge exposures (active SRS training)
 *   activate   — 8 exposures complete; recall built, real-life use needed
 *   mastered   — 8 exposures AND activation evidence (or legacy-mastered)
 *
 * Never stored on VocabItem — always derived fresh via getDisplayStage().
 */
export type DisplayStage = 'new' | 'introduced' | 'drilling' | 'activate' | 'mastered'

/** Full labels shown in pipelines, detail views, and descriptive UI. */
export const DISPLAY_STAGE_LABEL: Record<DisplayStage, string> = {
  new:        'New',
  introduced: 'Introduced',
  drilling:   'Drilling',
  activate:   'Activate',
  mastered:   'Mastered',
}

/**
 * Abbreviated labels for space-constrained contexts.
 * Used only when the full label cannot fit (e.g. narrow columns).
 * Prefer DISPLAY_STAGE_LABEL in all normal contexts.
 */
export const DISPLAY_STAGE_SHORT_LABEL: Record<DisplayStage, string> = {
  new:        'New',
  introduced: 'Intro',
  drilling:   'Drill',
  activate:   'Act',
  mastered:   'Done',
}

/**
 * Single-sentence descriptions for popovers, tooltips, and milestone views.
 * Describes the stage from the learner's perspective.
 */
export const DISPLAY_STAGE_DESCRIPTION: Record<DisplayStage, string> = {
  new:        'Just added. You\'ll meet it in an upcoming challenge.',
  introduced: 'You\'ve encountered this word a couple of times. The impression is just starting to form.',
  drilling:   'Regular challenge practice is making this word stick.',
  activate:   'You\'ve drilled this enough — now try it in real conversation, writing, or work.',
  mastered:   'Drilled and used in real life. Part of your active vocabulary.',
}

/**
 * Derives the learner-facing display stage from live item data.
 *
 * This is the single source of truth for user-visible progression labels.
 * It is intentionally re-computed on every render — never stored, never cached.
 *
 * Stage derivation rules:
 *   1. Legacy-mastered guard: if item.status === 'mastered', return 'mastered'
 *      regardless of exposureCount.  Words mastered through the old review
 *      system may have exposureCount < 8; their stored status is authoritative.
 *   2. exp === 0         → 'new'
 *   3. exp 1–2           → 'introduced'
 *   4. exp 3–7           → 'drilling'
 *   5. exp >= 8, no activation evidence → 'activate'
 *   6. exp >= 8, activation evidence    → 'mastered'
 *
 * Activation evidence (mirrors deriveLevel Level-3 gate exactly):
 *   review.sentenceProduced = true  OR
 *   activation.usageCount >= 3      OR
 *   activation.confidenceLevel >= 3
 *
 * The confidenceLevel gate only triggers mastery at exp >= 8.
 * At lower exposures, confidenceLevel only affects getChallengeType().
 */
export function getDisplayStage(item: VocabItem): DisplayStage {
  // ── Legacy-mastered guard ──────────────────────────────────────────────────
  // Words mastered through the old review system (successfulRecalls + usageLogs)
  // may have exposureCount < 8.  The stored status is authoritative for these.
  // For modern words, status === 'mastered' only when deriveStatus() confirms it,
  // which is consistent with Level 3 — so this guard never contradicts the
  // exposure-based path for any word created after the SRS system was introduced.
  if (item.status === 'mastered') return 'mastered'

  const exp = item.exposureCount ?? 0

  if (exp === 0) return 'new'
  if (exp <= 2)  return 'introduced'
  if (exp <= 7)  return 'drilling'

  // exp >= 8: Mastered if activation evidence exists; Activate otherwise.
  // Uses item.activation?.usageCount (the integer counter) to match
  // deriveLevel() exactly — not usagePoints(usageLogs) which counts valid logs.
  const usageCount      = item.activation?.usageCount ?? 0
  const confidenceLevel = item.activation?.confidenceLevel ?? 0
  const hasActivation   =
    item.review.sentenceProduced ||
    usageCount >= 3              ||
    confidenceLevel >= 3

  return hasActivation ? 'mastered' : 'activate'
}
