/**
 * src/lib/relatedEntries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Local utilities for the "Related words from your library" feature.
 *
 *  generateCandidates  — scores every other item heuristically and returns the
 *                        top N most likely to be related to a given item.
 *
 *  validateRelatedEntries — strips out any RelatedEntry whose id doesn't exist
 *                           in allItems (guards against model hallucination).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { VocabItem, RelatedEntry } from '@/types/vocabulary'

// ── Levenshtein distance (for confusable detection) ───────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ── Candidate generation ──────────────────────────────────────────────────────

/**
 * Heuristically scores every other item and returns the top `limit` candidates
 * most likely to have a meaningful relationship with `item`.
 *
 * Scoring signals:
 *  +4 — shared synonym (case-insensitive)
 *  +3 — stem overlap (first 5 chars, where term ≥ 5 chars)
 *  +3 — Levenshtein distance ≤ 2 for short words (≤ 8 chars) → confusables
 *  +2 — shared tag
 *  +1 — same partOfSpeech
 *
 * Only items with score > 0 are returned.
 */
export function generateCandidates(
  item: VocabItem,
  allItems: VocabItem[],
  limit = 15,
): VocabItem[] {
  const itemTermLc = item.term.toLowerCase()
  const itemSynSet = new Set(item.synonyms.map((s) => s.toLowerCase()))
  const itemTagSet = new Set(item.tags)
  const stemLen = 5
  const itemStem = itemTermLc.slice(0, stemLen)

  const scored = allItems
    .filter((other) => other.id !== item.id && !other.archived)
    .map((other) => {
      let score = 0

      // Shared synonyms
      for (const s of other.synonyms) {
        if (itemSynSet.has(s.toLowerCase())) {
          score += 4
          break // count once per item
        }
      }

      // One of the other item's synonyms appears in this item's synonyms
      // (reflexive: the other item considers *this* term a synonym)
      const otherTermLc = other.term.toLowerCase()
      if (itemSynSet.has(otherTermLc)) score += 4
      const otherSynSet = new Set(other.synonyms.map((s) => s.toLowerCase()))
      if (otherSynSet.has(itemTermLc)) score += 4

      // Stem overlap (word-family signal)
      if (
        itemStem.length >= stemLen &&
        otherTermLc.startsWith(itemStem)
      ) {
        score += 3
      }

      // Levenshtein confusable (short words only to keep it meaningful)
      if (
        itemTermLc.length <= 8 &&
        otherTermLc.length <= 8 &&
        Math.abs(itemTermLc.length - otherTermLc.length) <= 2
      ) {
        const dist = levenshtein(itemTermLc, otherTermLc)
        if (dist <= 2 && dist > 0) score += 3
      }

      // Shared tags
      for (const t of other.tags) {
        if (itemTagSet.has(t)) {
          score += 2
          break
        }
      }

      // Same part of speech
      if (
        item.partOfSpeech &&
        other.partOfSpeech &&
        item.partOfSpeech === other.partOfSpeech
      ) {
        score += 1
      }

      return { other, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map((s) => s.other)
}

// ── Post-generation validation ────────────────────────────────────────────────

/**
 * Strips any RelatedEntry whose `id` is not found in `allItems`.
 * Also normalises `strength` to 1 | 2 | 3 and trims explanations.
 * Call this after receiving model output to prevent hallucinated references.
 */
export function validateRelatedEntries(
  entries: RelatedEntry[],
  allItems: VocabItem[],
): RelatedEntry[] {
  const validIds = new Set(allItems.map((i) => i.id))
  return entries
    .filter((e) => validIds.has(e.id) && e.term && e.explanation)
    .map((e) => ({
      ...e,
      strength: ([1, 2, 3].includes(e.strength) ? e.strength : 1) as 1 | 2 | 3,
      explanation: e.explanation.trim().slice(0, 300),
    }))
}
