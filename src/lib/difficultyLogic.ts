/**
 * difficultyLogic.ts
 *
 * Simple difficulty scoring for vocabulary items.
 * Tracks how hard a specific word is for THIS learner, independent of SRS.
 *
 * Range:   0–100
 * Default: 50 (neutral — unknown history)
 *
 * Wrong answer → score climbs (word is harder than expected)
 * Right answer → score drops (word is easier than expected)
 *
 * Intentionally simple for Phase 1 — extend with decay/recency later.
 */

export const INITIAL_DIFFICULTY   = 50
export const DIFFICULTY_WRONG_DELTA   = 10   // wrong answer  → harder
export const DIFFICULTY_CORRECT_DELTA =  5   // correct answer → easier

/**
 * Returns the updated difficulty score, clamped to [0, 100].
 * Pass `current` as `undefined` to use INITIAL_DIFFICULTY.
 */
export function updateDifficulty(
  current: number | undefined,
  correct: boolean,
): number {
  const base = current ?? INITIAL_DIFFICULTY
  const delta = correct ? -DIFFICULTY_CORRECT_DELTA : DIFFICULTY_WRONG_DELTA
  return Math.max(0, Math.min(100, base + delta))
}

/** Describes the difficulty bucket for display purposes. */
export function difficultyLabel(score: number): 'easy' | 'moderate' | 'hard' {
  if (score < 35) return 'easy'
  if (score < 65) return 'moderate'
  return 'hard'
}
