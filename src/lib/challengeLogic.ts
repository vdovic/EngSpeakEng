/**
 * challengeLogic.ts
 *
 * Challenge type selection and attempt modelling for Phase 3 Daily Challenge.
 *
 * ChallengeType drives which UI component is rendered and how the attempt is
 * recorded.  It escalates difficulty naturally as exposureCount grows:
 *
 *   exposureCount 0–1  →  recognition / definition-choice   (recognition)
 *   exposureCount 2–4  →  fill-gap / definition-choice      (guided production)
 *   exposureCount 5–7  →  sentence-production               (active recall)
 *   exposureCount 8    →  real-life-use-check  (if sentenceProduced)
 *                      →  sentence-production  (if not yet produced — needed for Level 3)
 *
 * Hard guarantees:
 *   • sentence-production is NEVER shown before exposureCount >= 2.
 *   • AI sentence checking is NEVER triggered for exposureCount < 2.
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

// ── getChallengeType ──────────────────────────────────────────────────────────

/**
 * Select the appropriate challenge type for an item based on its current
 * exposure count and production history.
 *
 * Never returns sentence-production before exposureCount >= 2.
 * Never returns real-life-use-check before sentenceProduced is true.
 */
export function getChallengeType(item: VocabItem): ChallengeType {
  const exp = item.exposureCount ?? 0

  // ── Recognition band (0–1 exposures) ─────────────────────────────────────
  // Simple tasks: the learner is just encountering the word for the first time.
  if (exp <= 1) {
    if (!item.definitionEn) return 'recognition'   // no definition yet → pure recognition
    return exp === 0 ? 'recognition' : 'definition-choice'
  }

  // ── Building band (2–4 exposures) ────────────────────────────────────────
  // Mix fill-gap (contextual) with definition-choice (reinforcement).
  if (exp <= 4) {
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    if (hasSentence) {
      // 65% fill-gap (more challenging), 35% definition-choice (consolidation)
      return Math.random() < 0.65 ? 'fill-gap' : 'definition-choice'
    }
    return 'definition-choice'
  }

  // ── Familiar band (5–7 exposures) ────────────────────────────────────────
  // Active recall: learner must produce a sentence using the word.
  if (exp <= 7) {
    return 'sentence-production'
  }

  // ── Complete (8 exposures) ────────────────────────────────────────────────
  // Once the learner has produced a sentence (required for Level 3 / Mastered),
  // switch to the real-life use check (maintenance task).
  // If sentenceProduced is still false, give one more sentence-production attempt.
  if (item.review.sentenceProduced) {
    return 'real-life-use-check'
  }
  return 'sentence-production'
}
