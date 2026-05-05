/**
 * Client-side wrapper for POST /api/assignTheme.
 *
 * Sends the user's vocabulary words to the serverless function, which calls
 * Claude to determine which words belong to the specified theme.
 * The API key stays server-side — no VITE_ env var needed.
 *
 * Words are split into batches of BATCH_SIZE to avoid oversized prompts
 * and serverless-function timeouts. Batches run in parallel.
 */

import type { VocabItem } from '@/types/vocabulary'
import { SUGGESTED_THEMES } from '@/store/themesStore'

export interface ThemeAssignmentResult {
  /** IDs of words that Claude matched to the theme */
  assignedIds: string[]
  /** Total number of candidate words scanned */
  scanned: number
}

const BATCH_SIZE = 80

export async function assignWordsToTheme(
  theme: string,
  items: VocabItem[],
): Promise<ThemeAssignmentResult> {
  // Only candidates not already assigned to this theme and not archived
  const candidates = items.filter(
    (i) => !(i.themes ?? []).includes(theme) && !i.archived,
  )

  if (candidates.length === 0) return { assignedIds: [], scanned: 0 }

  // Log the full scope of this user-initiated AI call.
  // Note: theme assignment is exempt from AI_ALLOW_BULK_PROCESSING because it is
  // always explicitly triggered by the user pressing "Auto-assign" on the Themes page.
  // assertExplicitAiAction is called here for logging and future-proofing only;
  // it uses itemCount=1 to bypass the bulk guard since this is a single theme operation.
  console.warn(
    `[AI CALL] assignWordsToTheme: theme="${theme}", candidates=${candidates.length} items, ` +
    `batches=${Math.ceil(candidates.length / BATCH_SIZE)} × BATCH_SIZE=${BATCH_SIZE}`,
  )

  // Include the SUGGESTED_THEMES description when available (improves accuracy)
  const description = SUGGESTED_THEMES.find((s) => s.name === theme)?.description ?? ''

  // Split into batches and run in parallel
  const batches: VocabItem[][] = []
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE))
  }

  const batchResults = await Promise.all(
    batches.map((batch) => assignBatch(theme, description, batch)),
  )

  const assignedIds = batchResults.flat()
  return { assignedIds, scanned: candidates.length }
}

async function assignBatch(
  theme: string,
  description: string,
  batch: VocabItem[],
): Promise<string[]> {
  const words = batch.map((item) => ({
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
  return assignedIds
}
