/**
 * challengeLogic.ts
 *
 * Challenge type selection and attempt modelling for Phase 3 Daily Challenge.
 *
 * ChallengeType drives which UI component is rendered and how the attempt is
 * recorded.  It escalates difficulty naturally as exposureCount grows:
 *
 *   exposureCount 0   → recognition                    (pure encounter)
 *   exposureCount 1   → definition-choice              (first recall)
 *   exposureCount 2   → fill-gap (if example), else definition-choice
 *   exposureCount 3–4 → fill-gap or definition-choice  (stable, id-hashed)
 *   exposureCount 5–7 → sentence-production            (active recall)
 *   exposureCount 8   → real-life-use-check  (if sentenceProduced OR usageCount >= 3)
 *                     → sentence-production  (otherwise — needed for Level 3 mastery)
 *
 * Hard guarantees:
 *   • sentence-production is NEVER shown before exposureCount >= 2.
 *   • real-life-use-check is NEVER shown unless mastery evidence exists.
 *
 * Phase-11 hardening:
 *   • Replaced Math.random() with stableChoiceFromId() so the challenge type
 *     for a given item is deterministic and reproducible across sessions.
 *   • Exposure-8 check now recognises EITHER sentenceProduced OR usageCount >= 3
 *     as valid mastery evidence — matching deriveLevel() logic exactly.
 */

import type { VocabItem, ChallengeType } from '@/types/vocabulary'

// Re-export so callers can import from a single location.
export type { ChallengeType }

// ── Labels ────────────────────────────────────────────────────────────────────

export const CHALLENGE_TYPE_LABEL: Record<ChallengeType, string> = {
  recognition:           'Recognition',
  'definition-choice':   'Definition choice',
  'fill-gap':            'Fill the gap',
  'sentence-production': 'Write a sentence',
  'real-life-use-check': 'Real-life check',
}

// ── Attempt model ─────────────────────────────────────────────────────────────

/**
 * Lightweight record of one challenge attempt.
 * Stored transiently in session state; item-level fields are the durable store.
 */
export interface ChallengeAttempt {
  id: string
  itemId: string
  challengeType: ChallengeType
  correct: boolean
  createdAt: string
  userAnswer?: string
}

// ── Stable id hash ────────────────────────────────────────────────────────────

/**
 * Derives a stable boolean from an item's id string.
 *
 * Used to deterministically break ties at exposure bands where two challenge
 * types are equally appropriate (e.g. fill-gap vs definition-choice at
 * exposure 3–4).  The same item always gets the same choice, making
 * behaviour predictable and sessions reproducible.
 *
 * Algorithm: sum char codes of the id → even = true, odd = false.
 * Distributes roughly 50/50 for UUID-style ids.
 */
export function stableChoiceFromId(id: string): boolean {
  let sum = 0
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i)
  }
  return sum % 2 === 0
}

// ── getChallengeType ──────────────────────────────────────────────────────────

/**
 * Select the appropriate challenge type for an item based on its current
 * exposure count and production history.
 *
 * The selection is fully deterministic — no random calls.
 *
 * Mastery evidence (for the exposure-8 gate) is consistent with deriveLevel():
 *   review.sentenceProduced = true  OR  activation.usageCount >= 3
 */
export function getChallengeType(item: VocabItem): ChallengeType {
  const exp = item.exposureCount ?? 0

  // ── Recognition band (exposure 0) ────────────────────────────────────────
  if (exp === 0) return 'recognition'

  // ── First recall (exposure 1) ─────────────────────────────────────────────
  if (exp === 1) {
    return item.definitionEn ? 'definition-choice' : 'recognition'
  }

  // ── Early building band (exposure 2) ─────────────────────────────────────
  if (exp === 2) {
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    return hasSentence ? 'fill-gap' : 'definition-choice'
  }

  // ── Mid building band (exposures 3–4) ────────────────────────────────────
  // Use a stable id hash so the same item always gets the same type.
  // fill-gap requires a sentence to exist; fall back to definition-choice.
  if (exp <= 4) {
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    if (hasSentence) {
      // ~50% fill-gap, ~50% definition-choice — deterministic per item
      return stableChoiceFromId(item.id) ? 'fill-gap' : 'definition-choice'
    }
    return 'definition-choice'
  }

  // ── Familiar band (exposures 5–7) ────────────────────────────────────────
  // Active recall: learner must produce a sentence using the word.
  if (exp <= 7) {
    return 'sentence-production'
  }

  // ── Complete (exposure 8) ────────────────────────────────────────────────
  // Level 3 mastery requires activation evidence: sentenceProduced OR usageCount >= 3.
  // If the learner has either, the challenge becomes a maintenance check.
  // If neither, give one more sentence-production attempt to unlock Level 3.
  const usageCount    = item.activation?.usageCount ?? 0
  const hasMasteryEvidence = item.review.sentenceProduced || usageCount >= 3
  return hasMasteryEvidence ? 'real-life-use-check' : 'sentence-production'
}
