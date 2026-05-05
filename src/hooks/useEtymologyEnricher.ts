/**
 * useEtymologyEnricher — DISABLED
 *
 * This hook previously auto-processed ALL vocabulary items missing etymology
 * on every Library page mount, firing 100+ AI API calls without user awareness.
 *
 * DISABLED: 2026-05-05 — AI calls must never run automatically.
 * Per CLAUDE.md: AI must be explicit, optional, and controlled.
 *
 * Etymology enrichment can be re-introduced as an explicit user action
 * (e.g., a "Enrich selected words" button) with:
 *   - a confirmation dialog showing how many items will be processed
 *   - a hard cap of 10–20 items per batch
 *   - a progress + cancel UI
 */

export interface EtymologyProgress {
  done: number
  total: number
}

/** Stub — always returns null. No AI calls are made. */
export function useEtymologyEnricher(): EtymologyProgress | null {
  return null
}
