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
      version: 2,
      migrate(persisted, version) {
        // v1 → v2: WordScope expanded; old 'active' scope value kept as-is in stored records
        // for backward-compat display. missedItemIds is additive (optional field).
        void version
        return persisted as SpeedGameStoreState
      },
    },
  ),
)
