/**
 * Vocabulary search and duplicate-detection utilities.
 *
 * All heavy logic lives here so UI components stay thin.
 * Each search call is O(n) over items; memoize in React via useMemo().
 */

import { VocabItem } from '@/types/vocabulary'

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Canonical normalisation for search comparisons.
 * - lowercase  • trim  • collapse whitespace  • strip surrounding punctuation
 */
export function normalizeSearchTerm(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^\w\s]+|[^\w\s]+$/g, '')
    .trim()
}

/**
 * Normalisation for duplicate detection — additionally removes parenthetical
 * variants so "get along (with)" and "get along with" are treated as identical.
 */
function normalizeDuplicate(input: string): string {
  return normalizeSearchTerm(
    input.replace(/\s*\([^)]*\)/g, ' '), // strip "(with)", "(something)", etc.
  )
}

// ── Searchable text pre-computation ──────────────────────────────────────────

/**
 * Returns all searchable text for an item as a single lowercase string.
 * Call once and cache (e.g. with useMemo) to avoid repeated work per keystroke.
 */
export function getSearchableText(item: VocabItem): string {
  return [
    item.term,
    item.definitionEn ?? '',
    ...item.synonyms,
    ...item.antonyms,
    item.exampleSentence ?? '',
    item.workSentence ?? '',
    item.nuance ?? '',
    item.memoryCue ?? '',
    ...item.collocations,
    ...item.sentenceFrames,
    ...item.tags,
    item.partOfSpeech ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

// ── Search result types ───────────────────────────────────────────────────────

export type MatchField = 'term' | 'synonym' | 'definition' | 'example' | 'tag' | 'other'

export interface SearchResult {
  item: VocabItem
  score: number
  matchField: MatchField
  /** The raw text that matched (used to build contextual snippets). */
  matchSnippet?: string
}

// Relevance scores — higher = floated to top
const SCORE = {
  exactTerm:       100,
  termStartsWith:   80,
  termContains:     60,
  synonymExact:     50,
  synonymContains:  40,
  definition:       25,
  example:          20,
  tag:              15,
} as const

// ── Core search ───────────────────────────────────────────────────────────────

/**
 * Searches items by relevance and returns up to `limit` ranked results.
 *
 * Matching priority:
 *   1. Exact term  2. Term starts-with  3. Term contains
 *   4. Synonym exact  5. Synonym contains
 *   6. Definition  7. Example sentence  8. Tag
 *
 * Performance: single O(n) pass; memoize the call in React with useMemo().
 */
export function searchVocabulary(
  items: VocabItem[],
  query: string,
  limit = 10,
): SearchResult[] {
  const q = normalizeSearchTerm(query)
  if (!q) return []

  const results: SearchResult[] = []

  for (const item of items) {
    const termNorm = normalizeSearchTerm(item.term)
    let score = 0
    let matchField: MatchField = 'other'
    let matchSnippet: string | undefined

    if (termNorm === q) {
      score = SCORE.exactTerm
      matchField = 'term'
    } else if (termNorm.startsWith(q)) {
      score = SCORE.termStartsWith
      matchField = 'term'
    } else if (termNorm.includes(q)) {
      score = SCORE.termContains
      matchField = 'term'
    } else {
      // Synonyms
      const synMatch = item.synonyms.find((s) => {
        const sn = normalizeSearchTerm(s)
        return sn === q || sn.includes(q)
      })
      if (synMatch) {
        const exact = normalizeSearchTerm(synMatch) === q
        score = exact ? SCORE.synonymExact : SCORE.synonymContains
        matchField = 'synonym'
        matchSnippet = synMatch
      }
      // Definition
      else if (item.definitionEn && item.definitionEn.toLowerCase().includes(q)) {
        score = SCORE.definition
        matchField = 'definition'
        matchSnippet = item.definitionEn
      }
      // Examples
      else {
        const exampleHit = [item.exampleSentence, item.workSentence].find(
          (s) => s && s.toLowerCase().includes(q),
        )
        if (exampleHit) {
          score = SCORE.example
          matchField = 'example'
          matchSnippet = exampleHit
        }
        // Tags
        else if (item.tags.some((t) => t.toLowerCase().includes(q))) {
          score = SCORE.tag
          matchField = 'tag'
          matchSnippet = item.tags.find((t) => t.toLowerCase().includes(q))
        }
      }
    }

    if (score > 0) {
      results.push({ item, score, matchField, matchSnippet })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}

// ── Duplicate detection ───────────────────────────────────────────────────────

/**
 * Finds an item whose normalised (duplicate-aware) term exactly matches the
 * input.  Returns null if no exact duplicate exists.
 *
 * Handles:
 *   - case differences ("Mitigate" = "mitigate")
 *   - parenthetical variants ("get along (with)" = "get along with")
 */
export function findExactDuplicate(
  items: VocabItem[],
  input: string,
): VocabItem | null {
  const normalized = normalizeDuplicate(input)
  if (!normalized) return null
  return items.find((i) => normalizeDuplicate(i.term) === normalized) ?? null
}

/**
 * Finds items that are *similar* to the input but not an exact duplicate.
 *
 * Two criteria:
 *   1. One term contains the other after normalization
 *      (e.g. "piece of cake" ↔ "a piece of cake")
 *   2. Sørensen–Dice coefficient ≥ threshold (default 0.62)
 *
 * Returns up to 5 results ordered by similarity descending.
 */
export function findNearDuplicates(
  items: VocabItem[],
  input: string,
  threshold = 0.62,
): VocabItem[] {
  const normalized = normalizeDuplicate(input)
  if (normalized.length < 2) return []

  const scored: { item: VocabItem; sim: number }[] = []

  for (const item of items) {
    const termNorm = normalizeDuplicate(item.term)
    if (termNorm === normalized) continue // exact duplicate — skip

    let sim = 0

    // Containment — one is a substring of the other
    if (termNorm.includes(normalized) || normalized.includes(termNorm)) {
      const shorter = Math.min(termNorm.length, normalized.length)
      const longer = Math.max(termNorm.length, normalized.length)
      // Ratio: 1.0 means perfectly contained, lower for longer differences
      sim = shorter / longer
    } else {
      sim = diceCoefficient(normalized, termNorm)
    }

    if (sim >= threshold) {
      scored.push({ item, sim })
    }
  }

  return scored
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)
    .map((s) => s.item)
}

// ── Text highlighting ─────────────────────────────────────────────────────────

/**
 * Splits `text` into segments marking which parts match `query`.
 * Use to render highlighted search results — e.g. wrap highlight:true in <mark>.
 */
export function highlightMatches(
  text: string,
  query: string,
): { text: string; highlight: boolean }[] {
  const q = normalizeSearchTerm(query)
  if (!q) return [{ text, highlight: false }]

  const lower = text.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return [{ text, highlight: false }]

  const segments: { text: string; highlight: boolean }[] = []
  if (idx > 0) segments.push({ text: text.slice(0, idx), highlight: false })
  segments.push({ text: text.slice(idx, idx + q.length), highlight: true })
  if (idx + q.length < text.length) {
    segments.push({ text: text.slice(idx + q.length), highlight: false })
  }
  return segments
}

// ── Snippet helper ────────────────────────────────────────────────────────────

/**
 * Truncates a snippet string to `maxLength` characters, centred around the
 * first occurrence of `query`, with an ellipsis added when truncated.
 */
export function buildSnippet(text: string, query: string, maxLength = 80): string {
  if (text.length <= maxLength) return text

  const q = normalizeSearchTerm(query)
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text.slice(0, maxLength) + '…'

  const half = Math.floor(maxLength / 2)
  const start = Math.max(0, idx - half)
  const end = Math.min(text.length, start + maxLength)
  const snippet = text.slice(start, end)
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '')
}

// ── Fuzzy spell suggestions ("Did you mean…") ────────────────────────────────

/**
 * Classic Levenshtein edit-distance (character-level insertion/deletion/substitution).
 * Used to surface "Did you mean?" corrections for misspelled input.
 * O(m × n) time and space.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  // Use two rows to save memory
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/**
 * Returns up to `limit` Library items whose term is within `maxDist` edit
 * distance of `input`.  Suitable for "Did you mean…?" spell corrections.
 *
 * - Only considers the term field (not synonyms or definitions).
 * - Excludes exact matches (distance 0).
 * - Input must be at least 3 characters (below that, distance < 2 is too noisy).
 * - Results are sorted by distance ascending.
 */
export function fuzzySpellingSuggestions(
  items: VocabItem[],
  input: string,
  maxDist = 2,
  limit = 5,
): VocabItem[] {
  const norm = input.toLowerCase().trim()
  if (norm.length < 3) return []

  const scored: { item: VocabItem; dist: number }[] = []
  for (const item of items) {
    const termNorm = item.term.toLowerCase()
    if (termNorm === norm) continue // exact match — not a spelling error
    const dist = levenshteinDistance(norm, termNorm)
    if (dist > 0 && dist <= maxDist) {
      scored.push({ item, dist })
    }
  }
  return scored
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((s) => s.item)
}

// ── Internal ──────────────────────────────────────────────────────────────────

/** Sørensen–Dice coefficient for character-bigram similarity (0..1). */
function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const aBigrams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2)
    aBigrams.set(bg, (aBigrams.get(bg) ?? 0) + 1)
  }

  let hits = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2)
    const count = aBigrams.get(bg) ?? 0
    if (count > 0) {
      aBigrams.set(bg, count - 1)
      hits++
    }
  }

  return (2 * hits) / (a.length + b.length - 2)
}
