/**
 * challengeLogic.ts
 *
 * Challenge type selection and attempt modelling for the Daily Challenge.
 *
 * ChallengeType drives which UI component is rendered and how the attempt is
 * recorded.  Difficulty escalates with exposureCount in three clear tiers:
 *
 *   Tier 1 — First encounters  (0–1)  → definition-choice
 *     Multiple-choice: show definition, pick the correct term from 4 options.
 *     Learner meets the word with full context; no recognition gate.
 *
 *   Tier 2 — Building recall   (2–5)  → fill-gap  (fallback: definition-choice)
 *     Fill-in-the-blank sentence or definition recall with a hint button
 *     always available.  Requires a sentence context; falls back to
 *     definition-choice when neither exampleSentence nor workSentence is set.
 *     Deterministic 50/50 split at 3–5 so variety doesn't feel random.
 *
 *   Tier 3 — Active production (6–7)  → sentence-production
 *     Write a sentence using the word; self-assess ("Looks good" / "Try again").
 *     No AI call required — learner is the judge.
 *
 *   Tier 4 — Mastery check     (8)    → real-life-use-check (or sentence-production)
 *     If mastery evidence exists (sentenceProduced OR usageCount ≥ 3),
 *     a lightweight real-life check is shown.  Otherwise one more
 *     sentence-production to unlock Level 3.
 *
 * Principles enforced here:
 *   • NO recognition questions — selection belongs in Focus, not Challenge.
 *   • Sentence-production is blocked before exposure 6 for unset, red, and
 *     yellow confidence words.  Green (self-assessed comfortable) may receive
 *     sentence-production from exposure 2, because the learner has explicitly
 *     declared they can use the word spontaneously.
 *   • real-life-use-check NEVER without mastery evidence (exp ≥ 8 AND
 *     sentenceProduced OR usageCount ≥ 3).  This gate applies to all
 *     confidence levels, including green.
 *   • All selection is deterministic (no Math.random).
 */

import type { VocabItem, ChallengeType } from '@/types/vocabulary'

// Re-export so callers can import from a single location.
export type { ChallengeType }

// ── Labels ────────────────────────────────────────────────────────────────────
// 'recognition' kept here only for backward-compatibility display of old
// session results — it is never returned by getChallengeType() anymore.

export const CHALLENGE_TYPE_LABEL: Record<ChallengeType, string> = {
  recognition:           'Meaning check',     // legacy label only
  'definition-choice':   'Choose the term',
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
 * Used to deterministically break ties where two challenge types are equally
 * appropriate (e.g. fill-gap vs definition-choice at exposure 3–5).
 * Same item always gets the same choice across sessions.
 *
 * Algorithm: sum char codes → even = true, odd = false (~50/50 for UUID ids).
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
 * exposure count AND self-assessed confidence level.
 *
 * Selection is fully deterministic — no Math.random() calls.
 *
 * Confidence layer (applied first when set):
 *   Level 1 red    → definition-choice only (learner struggles to use the word)
 *   Level 2 yellow → fill-gap or definition-choice (can use when prompted)
 *   Level 3 green  → sentence-production (if exp ≥ 2) or fill-gap (exp 0–1)
 *   Level 0 unset  → fall through to exposure-based tier logic (unchanged)
 *
 * Exposure-based tiers (used when confidence is unset):
 *   Tier 1 — 0–1 exposures → definition-choice
 *   Tier 2 — 2–5 exposures → fill-gap / definition-choice
 *   Tier 3 — 6–7 exposures → sentence-production
 *   Tier 4 — 8  exposures  → real-life-use-check or sentence-production
 *
 * Mastery evidence (for the exposure-8 gate) matches deriveLevel() logic:
 *   review.sentenceProduced = true  OR  activation.usageCount >= 3
 */
export function getChallengeType(item: VocabItem): ChallengeType {
  const exp        = item.exposureCount ?? 0
  const confidence = item.activation?.confidenceLevel ?? 0

  // ── Confidence layer — takes priority over exposure tiers ─────────────────
  //
  // Only applied when the learner has explicitly set their confidence.
  // Level 0 (unset) falls through to the standard exposure-based logic below,
  // preserving backward-compatible behaviour for any item not yet self-assessed.

  if (confidence === 1) {
    // Red — learner cannot produce this word yet.
    // Keep challenge at the recognition-level regardless of exposure count.
    return 'definition-choice'
  }

  if (confidence === 2) {
    // Yellow — learner can use when prompted, not spontaneously.
    // Fill-gap is the right exercise; definition-choice as fallback.
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    return hasSentence ? 'fill-gap' : 'definition-choice'
  }

  if (confidence === 3) {
    // Green — learner feels comfortable with spontaneous use.
    //
    // Mastery gate first: at exp 8 honour the real-life-use-check tier
    // exactly as the unset path does, so green words are not locked out
    // of the mastery-check challenge once they reach full exposure.
    if (exp >= 8) {
      const usageCount        = item.activation?.usageCount ?? 0
      const hasMasteryEvidence = item.review.sentenceProduced || usageCount >= 3
      return hasMasteryEvidence ? 'real-life-use-check' : 'sentence-production'
    }
    // Sentence-production from exposure 2 onward (earlier than unset words
    // because the learner has self-assessed as comfortable).
    if (exp >= 2) return 'sentence-production'
    // Very fresh item (0–1 exposures) — use fill-gap or fall back.
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    return hasSentence ? 'fill-gap' : 'definition-choice'
  }

  // ── Exposure-based tiers (confidence === 0 / unset) ───────────────────────

  // ── Tier 1: First encounters (0–1) ───────────────────────────────────────
  // Show the definition → pick the correct term from 4 options.
  // No recognition gate — the multiple-choice format provides the same
  // "first encounter" value without the binary "Do you know this?" UX.
  if (exp <= 1) {
    return 'definition-choice'
  }

  // ── Tier 2: Building recall (2–5) ─────────────────────────────────────────
  // Fill-in-the-blank is the primary exercise type when a sentence exists.
  // A "Show definition" hint is always available (see FillBlankExercise).
  // At 2: always fill-gap if sentence available (lower confidence expected).
  // At 3–5: stable 50/50 split between fill-gap and definition-choice to
  //         provide variety without random behaviour across sessions.
  if (exp <= 5) {
    const hasSentence = !!(item.exampleSentence || item.workSentence)
    if (!hasSentence) return 'definition-choice'

    if (exp === 2) return 'fill-gap'

    // exp 3–5: deterministic variety
    return stableChoiceFromId(item.id) ? 'fill-gap' : 'definition-choice'
  }

  // ── Tier 3: Active production (6–7) ──────────────────────────────────────
  // Learner writes their own sentence and self-assesses correctness.
  if (exp <= 7) {
    return 'sentence-production'
  }

  // ── Tier 4: Mastery check (8) ─────────────────────────────────────────────
  // Mastery evidence = sentence already produced OR ≥ 3 real-life uses logged.
  const usageCount        = item.activation?.usageCount ?? 0
  const hasMasteryEvidence = item.review.sentenceProduced || usageCount >= 3
  return hasMasteryEvidence ? 'real-life-use-check' : 'sentence-production'
}
