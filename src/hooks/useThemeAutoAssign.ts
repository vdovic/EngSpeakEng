/**
 * useThemeAutoAssign
 *
 * React hook that drives the AI word-assignment workflow:
 *  1. Calls POST /api/assignTheme with the user's vocabulary
 *  2. Writes the returned assignments via vocabStore.assignThemes()
 *  3. Exposes loading / result / error state for UI feedback
 *
 * Usage:
 *   const { trigger, isProcessing, processingTheme, lastResult, error } = useThemeAutoAssign()
 *   // After creating a theme:
 *   void trigger(themeName)
 */

import { useState, useCallback } from 'react'
import { useVocabStore } from '@/store/vocabStore'
import { assignWordsToTheme } from '@/lib/aiThemeAssignment'

export interface AutoAssignResult {
  theme:    string
  assigned: number
  scanned:  number
}

export function useThemeAutoAssign() {
  const [processingTheme, setProcessingTheme] = useState<string | null>(null)
  const [lastResult, setLastResult]           = useState<AutoAssignResult | null>(null)
  const [error, setError]                     = useState<string | null>(null)

  const trigger = useCallback(async (themeName: string) => {
    setProcessingTheme(themeName)
    setLastResult(null)
    setError(null)

    try {
      const { items, assignThemes } = useVocabStore.getState()

      const { assignedIds, scanned } = await assignWordsToTheme(themeName, items)

      // Apply theme assignments additively — never strip existing themes
      for (const id of assignedIds) {
        const item = items.find((i) => i.id === id)
        if (!item) continue
        const merged = Array.from(new Set([...(item.themes ?? []), themeName]))
        await assignThemes(id, merged)
      }

      setLastResult({ theme: themeName, assigned: assignedIds.length, scanned })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProcessingTheme(null)
    }
  }, [])

  return {
    /** Call this immediately after addTheme(name) to trigger AI assignment */
    trigger,
    /** True while the API call + DB writes are in flight */
    isProcessing:    processingTheme !== null,
    /** The name of the theme currently being processed (null when idle) */
    processingTheme,
    /** Result of the most recent completed assignment (null until first run) */
    lastResult,
    /** Error message if the last call failed (null on success) */
    error,
    clearResult:     () => setLastResult(null),
    clearError:      () => setError(null),
  }
}
