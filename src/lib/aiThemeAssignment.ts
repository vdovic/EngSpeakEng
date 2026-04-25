/**
 * Client-side wrapper for POST /api/assignTheme.
 *
 * Sends the user's vocabulary words to the serverless function, which calls
 * Claude to determine which words belong to the specified theme.
 * The API key stays server-side — no VITE_ env var needed.
 */

import type { VocabItem } from '@/types/vocabulary'
import { SUGGESTED_THEMES } from '@/store/themesStore'

export interface ThemeAssignmentResult {
  /** IDs of words that Claude matched to the theme */
  assignedIds: string[]
  /** Total number of candidate words scanned */
  scanned: number
}

export async function assignWordsToTheme(
  theme: string,
  items: VocabItem[],
): Promise<ThemeAssignmentResult> {
  // Only candidates not already assigned to this theme and not archived
  const candidates = items.filter(
    (i) => !(i.themes ?? []).includes(theme) && !i.archived,
  )

  if (candidates.length === 0) return { assignedIds: [], scanned: 0 }

  // Include the SUGGESTED_THEMES description when available (improves accuracy)
  const description = SUGGESTED_THEMES.find((s) => s.name === theme)?.description ?? ''

  const words = candidates.map((item) => ({
    id:         item.id,
    term:       item.term,
    type:       item.type,
    definition: item.definitionEn ?? item.translations?.uk ?? '',
  }))

  const res = await fetch('/api/assignTheme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, description, words }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  const { assignedIds } = (await res.json()) as { assignedIds: string[] }

  return { assignedIds, scanned: candidates.length }
}
