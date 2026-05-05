/**
 * useRelationshipEnricher — DISABLED
 *
 * This hook previously auto-processed ALL vocabulary items missing word
 * relationship graphs on every Library page mount, firing 1000+ AI API calls
 * without user awareness or control.
 *
 * DISABLED: 2026-05-05 — AI calls must never run automatically.
 * Per CLAUDE.md: AI must be explicit, optional, and controlled.
 *
 * Relationship graph generation can be re-introduced as an explicit user action
 * (e.g., a "Build word graph" button on the word detail page) with:
 *   - explicit per-word trigger
 *   - no bulk auto-processing
 */

export interface RelationshipEnrichProgress {
  done: number
  total: number
  currentTerm: string
}

/** Stub — always returns null. No AI calls are made. */
export function useRelationshipEnricher(): RelationshipEnrichProgress | null {
  return null
}
