/**
 * candidateLogic.ts
 *
 * Balance-aware candidate generation for the Focus page.
 *
 * Scoring weights:
 *   Theme relevance                 → +40  (user's active learning themes)
 *   Balance gap fill (30% target)   → +30  (fills under-represented exposure tier)
 *   Recall readiness (2–6 recalls)  → +20  (ready to activate, not yet mastered)
 *   Recency (added < 14 days ago)   → +10  (fresh vocab benefits from active use)
 *   focusPriority field             → up to +20 (system/user-set priority)
 *
 * The 30/30/30 balance (new / mid / advanced) is maintained silently —
 * it is never surfaced to the user directly.
 *
 * Exposure tiers:
 *   new       0–1  exposures  (never/barely challenged)
 *   mid       2–5  exposures  (actively being challenged)
 *   advanced  6–8  exposures  (nearly / fully challenged)
 */

import type { VocabItem } from '@/types/vocabulary'

/**
 * Returns the top `limit` candidates for Focus, scored by relevance and balance.
 *
 * @param items        All vocab items in the store
 * @param focusItems   Items currently in focus (used to measure tier balance)
 * @param activeThemes User's active theme names from themesStore
 * @param limit        Maximum candidates to return (default 50)
 */
export function generateCandidates(
  items: VocabItem[],
  focusItems: VocabItem[],
  activeThemes: string[],
  limit = 50,
): VocabItem[] {
  // Pool: not in focus, not archived, not mastered, not inbox
  const focusIds = new Set(focusItems.map((i) => i.id))
  const pool = items.filter(
    (i) =>
      !focusIds.has(i.id) &&
      !i.weeklyFocus &&
      !i.inFocus &&
      !i.archived &&
      i.status !== 'mastered' &&
      i.status !== 'inbox',
  )

  if (pool.length === 0) return []

  // ── Measure current focus tier balance ────────────────────────────────────────
  const focusTotal = focusItems.length || 1
  const newCount = focusItems.filter((i) => (i.exposureCount ?? 0) <= 1).length
  const midCount = focusItems.filter((i) => {
    const e = i.exposureCount ?? 0
    return e >= 2 && e <= 5
  }).length
  const advCount = focusItems.filter((i) => (i.exposureCount ?? 0) >= 6).length

  const newPct = newCount / focusTotal
  const midPct = midCount / focusTotal
  const advPct = advCount / focusTotal

  // ── Score each candidate ──────────────────────────────────────────────────────
  const scored = pool.map((item) => {
    let score = 0
    const exp     = item.exposureCount ?? 0
    const recalls = item.review.successfulRecalls
    const daysSinceAdded =
      (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000

    // Theme relevance
    const inActiveTheme = (item.themes ?? []).some((t) => activeThemes.includes(t))
    if (inActiveTheme) score += 40

    // Balance gap fill — boost whichever tier is most under-represented
    const isNew = exp <= 1
    const isMid = exp >= 2 && exp <= 5
    const isAdv = exp >= 6
    if      (isNew && newPct < 0.30) score += 30
    else if (isMid && midPct < 0.30) score += 30
    else if (isAdv && advPct < 0.30) score += 30

    // Recall readiness — knows it well enough to try in real life
    if (recalls >= 2 && recalls <= 6) score += 20

    // Freshness — recently added words benefit from early activation
    if (daysSinceAdded < 14) score += 10

    // System/user-set priority (capped to avoid domination)
    score += Math.min(item.focusPriority ?? 0, 20)

    return { item, score }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.item)
}
