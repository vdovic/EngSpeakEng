import { ExerciseResult, ChallengeType } from '@/types/vocabulary'

export const CHALLENGE_SESSION_KEY = 'ese-challenge-session'

/**
 * One slot as stored in localStorage.
 * Phase 3: uses ChallengeType (not legacy ExerciseType).
 * Old sessions with exerciseType are detected and discarded at load time.
 */
export interface SessionSlot {
  itemId: string
  challengeType: ChallengeType
}

export interface ChallengeSession {
  /** "YYYY-MM-DD" in local time — used to detect a new day and discard stale data. */
  date: string
  slots: SessionSlot[]
  /** 0-based index of the *next* exercise to show (same as results.length). */
  currentIndex: number
  results: ExerciseResult[]
  completed: boolean
  isBonus: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function saveSession(session: ChallengeSession): void {
  try {
    localStorage.setItem(CHALLENGE_SESSION_KEY, JSON.stringify(session))
  } catch {
    // quota exceeded or private-browsing mode — silently ignore
  }
}

/**
 * Returns today's saved session, or null if there is none or it is from a
 * different day (which is also deleted to avoid stale data building up).
 */
export function loadTodaySession(): ChallengeSession | null {
  try {
    const raw = localStorage.getItem(CHALLENGE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ChallengeSession
    if (parsed.date !== todayKey()) {
      localStorage.removeItem(CHALLENGE_SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(CHALLENGE_SESSION_KEY)
}
