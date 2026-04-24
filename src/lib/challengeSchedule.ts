/**
 * SRS schedule for Daily Challenge exposure steps.
 *
 * Each item has an exposureCount (0–8).  After a successful challenge exercise
 * the count advances by 1 and the next challenge is scheduled at the interval
 * for that new step.  On an incorrect answer the count stays the same and the
 * item is retried after a short cooldown (10 minutes).
 *
 * Steps:  0→1      1→2    2→3    3→4     4→5     5→6      6→7       7→8
 */
const SRS_INTERVALS_MS: readonly number[] = [
  10 * 60 * 1_000,           // 10 minutes
  60 * 60 * 1_000,           // 1 hour
  1 * 24 * 60 * 60 * 1_000,  // 1 day
  2 * 24 * 60 * 60 * 1_000,  // 2 days
  3 * 24 * 60 * 60 * 1_000,  // 3 days
  7 * 24 * 60 * 60 * 1_000,  // 1 week
  14 * 24 * 60 * 60 * 1_000, // 2 weeks
  30 * 24 * 60 * 60 * 1_000, // 1 month
]

const INTERVAL_LABELS: readonly string[] = [
  '10 min', '1 h', '1 day', '2 days', '3 days', '1 week', '2 weeks', '1 month',
]

// Retry cooldown for incorrect answers — same as step-0 interval (10 minutes)
const RETRY_INTERVAL_MS = SRS_INTERVALS_MS[0]

/** True when an item should appear in the next daily challenge session. */
export function isDueChallengeNow(
  exposureCount: number | undefined,
  nextChallengeDate: string | undefined,
): boolean {
  const count = exposureCount ?? 0
  if (count >= 8) return false          // fully learned via challenge
  if (!nextChallengeDate) return true   // never practised → due immediately
  return Date.now() >= new Date(nextChallengeDate).getTime()
}

/**
 * Returns the ISO datetime for when this item should next appear in a challenge.
 *
 * @param exposureCount  The count AFTER this practice (already incremented on correct).
 * @param correct        Whether the answer was correct (or partial — sentence-create).
 */
export function getNextChallengeDate(exposureCount: number, correct: boolean): string {
  if (!correct) {
    return new Date(Date.now() + RETRY_INTERVAL_MS).toISOString()
  }
  const interval =
    SRS_INTERVALS_MS[Math.min(exposureCount, SRS_INTERVALS_MS.length - 1)] ??
    SRS_INTERVALS_MS[SRS_INTERVALS_MS.length - 1]
  return new Date(Date.now() + interval).toISOString()
}

/** Human-readable label for the interval at a given exposure step. */
export function intervalLabel(exposureCount: number): string {
  return INTERVAL_LABELS[Math.min(exposureCount, INTERVAL_LABELS.length - 1)] ?? '1 month'
}
