/**
 * speedGameStore.ts — persisted history of completed Speed Practice sessions.
 *
 * Each result is appended once at the end of a game (SpeedGamePage).
 * The full results array is included in Drive sync exports so history is
 * shared across devices.
 *
 * Merge strategy (same as usage logs): union by `id`.
 * Results are immutable once recorded — no field can decrease or change.
 * Sorted newest-first after every merge.
 *
 * CLAUDE.md compliance:
 *   • No points, XP, or performance ratings stored
 *   • Results are objective counts (correct answers, accuracy %) — what is true
 *   • Store version + migrate() pattern per CLAUDE.md data-safety rules
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpeedGameResult } from '@/lib/speedGame'

// ── Store shape ────────────────────────────────────────────────────────────────

interface SpeedGameStoreState {
  results: SpeedGameResult[]
}

interface SpeedGameStoreActions {
  /** Append a newly completed game result. */
  addResult(result: SpeedGameResult): void
  /** Replace the full results array — used by Drive sync merge. */
  setResults(results: SpeedGameResult[]): void
}

type SpeedGameStore = SpeedGameStoreState & SpeedGameStoreActions

// ── Store ──────────────────────────────────────────────────────────────────────

export const useSpeedGameStore = create<SpeedGameStore>()(
  persist(
    (set) => ({
      results: [],

      addResult(result) {
        set((s) => ({
          results: [result, ...s.results],
        }))
      },

      setResults(results) {
        set({ results })
      },
    }),
    {
      name:    'ese-speed-game',
      version: 1,
      migrate(persisted, version) {
        // Version 1 is the initial shape — no migrations needed yet.
        // Add cases here if fields are renamed in future versions.
        void version
        return persisted as SpeedGameStoreState
      },
    },
  ),
)
