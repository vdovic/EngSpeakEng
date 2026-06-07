/**
 * practiceStore.ts — persisted log of practice sessions across all activities.
 *
 * One PracticeSession is appended when a practice stretch ends (via the
 * usePracticeTimer hook). The full array powers the Progress & Effort analytics
 * tab and is included in Drive sync exports so effort history follows the user
 * across devices.
 *
 * Merge strategy (same as speed game results / usage logs): union by `id`.
 * Sessions are immutable once recorded — no field changes after append.
 *
 * CLAUDE.md compliance:
 *   • Records objective effort (time, words practised) — what is true, not a score
 *   • "advancement" is an internal numeric aggregate, never surfaced as points/XP
 *   • Store version + migrate() pattern per the data-safety rules
 *   • Additive only — no protected field is ever cleared or downgraded
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PracticeSession } from '@/lib/practice'

// ── Store shape ──────────────────────────────────────────────────────────────────

interface PracticeStoreState {
  sessions: PracticeSession[]
}

interface PracticeStoreActions {
  /** Append a newly completed practice session. */
  addSession(session: PracticeSession): void
  /** Replace the full sessions array — used by Drive sync merge. */
  setSessions(sessions: PracticeSession[]): void
}

type PracticeStore = PracticeStoreState & PracticeStoreActions

// ── Store ──────────────────────────────────────────────────────────────────────

export const usePracticeStore = create<PracticeStore>()(
  persist(
    (set) => ({
      sessions: [],

      addSession(session) {
        set((s) => ({ sessions: [session, ...s.sessions] }))
      },

      setSessions(sessions) {
        set({ sessions })
      },
    }),
    {
      name:    'ese-practice-sessions',
      version: 1,
      migrate(persisted, _version) {
        // v1 — first versioned release. Backfill missing array defensively.
        const old = (persisted ?? {}) as Partial<PracticeStoreState>
        return { sessions: old.sessions ?? [] } as PracticeStoreState
      },
    },
  ),
)

/**
 * Union-merge two session lists by id, newest-first.
 * Pure helper shared by Drive sync merge logic.
 */
export function mergePracticeSessions(
  a: PracticeSession[],
  b: PracticeSession[],
): PracticeSession[] {
  const byId = new Map<string, PracticeSession>()
  for (const s of [...a, ...b]) {
    if (!byId.has(s.id)) byId.set(s.id, s)
  }
  return Array.from(byId.values()).sort(
    (x, y) => new Date(y.endedAt).getTime() - new Date(x.endedAt).getTime(),
  )
}
