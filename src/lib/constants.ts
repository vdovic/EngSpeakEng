import type { ItemStatus } from '@/types/vocabulary'

// ── Daily Challenge ───────────────────────────────────────────────────────────

/** Maximum words per Daily Challenge session (default session size). */
export const CHALLENGE_SESSION_CAP = 25

/** Selectable session sizes in the Daily Challenge picker. */
export const SESSION_SIZES = [15, 25, 40] as const

/** Number of challenge exposure steps before a word is fully drilled. */
export const MAX_EXPOSURE = 8

// ── Mastery ───────────────────────────────────────────────────────────────────

/** Successful recalls required to reach mastered status. */
export const MASTERY_RECALLS = 3

/** Real-life uses required to reach mastered status. */
export const MASTERY_USES = 3

// ── Vocabulary status ─────────────────────────────────────────────────────────

/** Canonical progression order — used for status advance logic. */
export const STATUS_FLOW: ItemStatus[] = [
  'inbox', 'learning', 'stable', 'activation', 'mastered',
]

/** Numeric sort weight per status — used for UI ordering. */
export const STATUS_ORDER: Record<string, number> = {
  inbox: 0, learning: 1, stable: 2, activation: 3, mastered: 4,
}
