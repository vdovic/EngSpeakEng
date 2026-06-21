/**
 * phraseGameStore.ts — persisted history of completed Phrase Builder sessions.
 *
 * Same pattern as speedGameStore: immutable results, union-merged on sync,
 * sorted newest-first. Store version + migrate() per CLAUDE.md data-safety rules.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PhraseGameResult, PhraseScope, PhraseRoundCount } from '@/lib/phraseGame'

interface PhraseGameStoreState {
  results:        PhraseGameResult[]
  lastScope:      PhraseScope
  lastRoundCount: PhraseRoundCount
}

interface PhraseGameStoreActions {
  addResult(result: PhraseGameResult): void
  setResults(results: PhraseGameResult[]): void
  saveLastSettings(scope: PhraseScope, roundCount: PhraseRoundCount): void
}

type PhraseGameStore = PhraseGameStoreState & PhraseGameStoreActions

export const usePhraseGameStore = create<PhraseGameStore>()(
  persist(
    (set) => ({
      results:        [],
      lastScope:      'full',
      lastRoundCount: 10,

      addResult(result) {
        set((s) => ({ results: [result, ...s.results] }))
      },

      setResults(results) {
        set({ results })
      },

      saveLastSettings(scope, roundCount) {
        set({ lastScope: scope, lastRoundCount: roundCount })
      },
    }),
    {
      name:    'ese-phrase-game',
      version: 1,
      migrate(persisted, _version) {
        const p = persisted as Partial<PhraseGameStoreState>
        return {
          results:        p.results        ?? [],
          lastScope:      p.lastScope      ?? 'full',
          lastRoundCount: p.lastRoundCount ?? 10,
        } as PhraseGameStoreState
      },
    },
  ),
)
