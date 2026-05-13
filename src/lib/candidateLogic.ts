/**
 * candidateLogic.ts
 *
 * Balance-aware candidate generation for the Focus page.
 *
 * Scoring weights (none of these are surfaced to the user):
 *   Theme relevance          → +40  matches the user's active learning themes
 *   Balance gap fill         → +30  prefer 0–5 exposure (under-represented tiers)
 *   Confidence (red/unset)   → +25  low confidence → higher candidate priority
 *   Low real-life usage      → +20  usageCount === 0 (never activated in real life)
 *   High difficulty          → +20  difficultyScore > 70 (hard for this learner)
 *   Not recently challenged  → +10  lastExposureAt > 7 days ago or never exposed
 *   focusPriority tiebreak   → up to +10
 *
 * The 30/30/30 balance logic (new / mid / advanced exposure tiers) is
 * maintained silently — it is never surfaced in the UI.
 */

import type { VocabItem } from '@/types/vocabulary'

/**
 * Returns the top candidates for adding to Focus.
 *
 * @param allItems     Every VocabItem in the store
 * @param focusItems   Items currently in the Focus Portfolio
 * @param activeItems  Items in the Active Focus view (already shown to user)
 * @param activeThemes User's active theme names (from themesStore)
 * @param limit        Max candidates to return (default 30)
 */
export function generateCandidates(
  allItems: VocabItem[],
  focusItems: VocabItem[],
  activeItems: VocabItem[],
  activeThemes: string[] = [],
  limit = 30,
): VocabItem[] {
  // Exclude anything already in the portfolio (which subsumes activeItems)
  // or flagged as archived / mastered / inbox.
  const excludeIds = new Set([
    ...focusItems.map((i) => i.id),
    ...activeItems.map((i) => i.id),
  ])

  const pool = allItems.filter(
    (i) =>
      !excludeIds.has(i.id) &&
      !i.weeklyFocus &&
      !i.inFocus &&
      !i.archived &&
      i.status !== 'mastered' &&
      i.status !== 'inbox',
  )

  if (pool.length === 0) return []

  // ── Measure current Active Focus tier balance (30/30/30 target) ───────────────
  const refItems  = activeItems.length > 0 ? activeItems : focusItems
  const refTotal  = refItems.length || 1
  const newCount  = refItems.filter((i) => (i.exposureCount ?? 0) <= 1).length
  const midCount  = refItems.filter((i) => { const e = i.exposureCount ?? 0; return e >= 2 && e <= 5 }).length
  const advCount  = refItems.filter((i) => (i.exposureCount ?? 0) >= 6).length
  const newPct    = newCount / refTotal
  const midPct    = midCount / refTotal
  const advPct    = advCount / refTotal

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1_000
  const now         = Date.now()

  // ── Score each candidate ──────────────────────────────────────────────────────
  const scored = pool.map((item) => {
    let score = 0
    const exp        = item.exposureCount ?? 0
    const confidence = item.activation?.confidenceLevel ?? 0

    // +40 — theme relevance
    if ((item.themes ?? []).some((t) => activeThemes.includes(t))) score += 40

    // +30 — fill under-represented exposure tier (prefer 0–5)
    const isNew = exp <= 1
    const isMid = exp >= 2 && exp <= 5
    const isAdv = exp >= 6
    if      (isNew && newPct < 0.30) score += 30
    else if (isMid && midPct < 0.30) score += 30
    else if (isAdv && advPct < 0.30) score += 30

    // +25 / +20 / +10 — confidence: red/unset words need Focus attention most
    if      (confidence === 1) score += 25  // red — actively struggling
    else if (confidence === 0) score += 20  // unset — not yet assessed
    else if (confidence === 2) score += 10  // yellow — progressing

    // +20 — low real-life usageCount (never activated)
    if ((item.activation?.usageCount ?? 0) === 0) score += 20

    // +20 — high learner-specific difficulty
    const difficulty = item.difficultyScore ?? 50
    if (difficulty > 70) score += 20
    else if (difficulty > 55) score += 10

    // +10 — not recently challenged (stale or brand-new to challenges)
    const lastExp = item.lastExposureAt
    const notRecentlyChallenged = !lastExp || (now - new Date(lastExp).getTime()) > sevenDaysMs
    if (notRecentlyChallenged) score += 10

    // Tiebreak — system/user-set priority (capped)
    score += Math.min(item.focusPriority ?? 0, 10)

    return { item, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.item)
}
