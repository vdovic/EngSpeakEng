/**
 * naturalPhrasesStore.ts — persisted session history for Natural Phrases Sprint.
 *
 * Same pattern as speedGameStore: immutable results, union-merged on sync,
 * newest-first.  Store version + migrate() per CLAUDE.md data-safety rules.
 * No XP, no streaks, no performance ratings — objective counts only.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  NaturalPhrasesResult,
  NaturalPhrasesScope,
  NaturalPhrasesDuration,
} from '@/lib/naturalPhrasesGame'

interface NaturalPhrasesStoreState {
  results:      NaturalPhrasesResult[]
  lastScope:    NaturalPhrasesScope
  lastDuration: NaturalPhrasesDuration
}

interface NaturalPhrasesStoreActions {
  addResult(result: NaturalPhrasesResult): void
  setResults(results: NaturalPhrasesResult[]): void
  saveLastSettings(scope: NaturalPhrasesScope, duration: NaturalPhrasesDuration): void
}

type NaturalPhrasesStore = NaturalPhrasesStoreState & NaturalPhrasesStoreActions

export const useNaturalPhrasesStore = create<NaturalPhrasesStore>()(
  persist(
    (set) => ({
      results:      [],
      lastScope:    'full',
      lastDuration: 120,

      addResult(result) {
        set((s) => ({ results: [result, ...s.results] }))
      },

      setResults(results) {
        set({ results })
      },

      saveLastSettings(scope, duration) {
        set({ lastScope: scope, lastDuration: duration })
      },
    }),
    {
      name:    'ese-natural-phrases',
      version: 1,
      migrate(persisted, _version) {
        const p = persisted as Partial<NaturalPhrasesStoreState>
        return {
          results:      p.results      ?? [],
          lastScope:    p.lastScope    ?? 'full',
          lastDuration: p.lastDuration ?? 120,
        } as NaturalPhrasesStoreState
      },
    },
  ),
)
