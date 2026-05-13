/**
 * libraryFilters.ts
 *
 * Pure helpers for filtering and sorting vocabulary items in LibraryPage.
 *
 * Keeping this logic separate from JSX:
 *  - keeps LibraryPage readable
 *  - makes helpers independently testable
 *  - prevents accidental re-renders from inline function recreation
 */

import type { VocabItem, Level } from '@/types/vocabulary'
import { getCanonicalLevel } from '@/lib/progressionLogic'
import { MAX_EXPOSURE } from '@/lib/constants'
import { searchVocabulary } from '@/utils/vocabSearch'

// ── Filter value types ────────────────────────────────────────────────────────

export type LevelFilter = Level | 'all'

export type FocusFilter = 'all' | 'in-focus' | 'not-in-focus'

/**
 * Self-assessed confidence level filter.
 *   '0'    = not assessed (confidenceLevel unset or 0)
 *   '1'    = red  — recognises but cannot produce spontaneously
 *   '2'    = yellow — can use when prompted
 *   '3'    = green  — comfortable / spontaneous use
 */
export type ConfidenceFilter = 'all' | '0' | '1' | '2' | '3'

/**
 * Exposure band values match the spec:
 *   '0'   = not started
 *   '1-2' = early learning
 *   '3-7' = building familiarity
 *   '8'   = challenge complete
 */
export type ExposureBandFilter = 'all' | '0' | '1-2' | '3-7' | '8'

// ── Sort keys ─────────────────────────────────────────────────────────────────

export type LibrarySortKey =
  | 'az'               // A → Z
  | 'newest'           // recently added first
  | 'oldest'           // oldest first
  | 'exposure-asc'     // 0 → 8 (least practiced first)
  | 'exposure-desc'    // 8 → 0 (most practiced first)
  | 'difficulty-desc'  // hardest for this learner first
  | 'difficulty-asc'   // easiest first
  | 'level-asc'        // New → Mastered
  | 'level-desc'       // Mastered → New
  | 'due'              // SRS due soonest
  | 'weak'             // lowest SRS ease factor

// ── Filters shape ─────────────────────────────────────────────────────────────

export interface LibraryFilters {
  search:       string
  level:        LevelFilter
  focus:        FocusFilter
  exposureBand: ExposureBandFilter
  confidence:   ConfidenceFilter
  tag:          string    // 'all' or a tag string
  theme:        string    // 'all' or a theme string
}

export const DEFAULT_FILTERS: LibraryFilters = {
  search:       '',
  level:        'all',
  focus:        'all',
  exposureBand: 'all',
  confidence:   'all',
  tag:          'all',
  theme:        'all',
}

// ── Item accessors ────────────────────────────────────────────────────────────

/**
 * Returns the item's canonical learning level — always derived from live data.
 *
 * Never reads `item.level` directly: the stored field may be stale if a store
 * write was missed between progression updates.  `getCanonicalLevel` (= `deriveLevel`)
 * recomputes from `exposureCount`, `sentenceProduced`, and `usageCount` each time.
 */
export function getItemLevel(item: VocabItem): Level {
  return getCanonicalLevel(item)
}

/** Returns true when the item is in the learner's current focus. */
export function isInFocus(item: VocabItem): boolean {
  return !!(item.inFocus || item.weeklyFocus)
}

/**
 * Returns the item's exposure band key.
 *   '0'   = not started
 *   '1-2' = 1 or 2 steps done
 *   '3-7' = 3–7 steps done
 *   '8'   = all 8 steps complete
 */
export function getExposureBand(item: VocabItem): ExposureBandFilter {
  const exp = item.exposureCount ?? 0
  if (exp === 0)          return '0'
  if (exp <= 2)           return '1-2'
  if (exp < MAX_EXPOSURE) return '3-7'
  return '8'
}

// ── Single-item filter predicate ──────────────────────────────────────────────

function itemPassesDimensionFilters(item: VocabItem, filters: LibraryFilters): boolean {
  const { level, focus, exposureBand, confidence, tag, theme } = filters

  if (level !== 'all' && getItemLevel(item) !== level) return false

  if (focus === 'in-focus'     && !isInFocus(item)) return false
  if (focus === 'not-in-focus' &&  isInFocus(item)) return false

  if (exposureBand !== 'all' && getExposureBand(item) !== exposureBand) return false

  if (confidence !== 'all') {
    const itemConfidence = item.activation?.confidenceLevel ?? 0
    if (String(itemConfidence) !== confidence) return false
  }

  if (tag   !== 'all' && !item.tags.includes(tag))             return false
  if (theme !== 'all' && !(item.themes ?? []).includes(theme)) return false

  return true
}

// ── filterLibraryItems ────────────────────────────────────────────────────────

/**
 * Applies all active filters (including text search) to `items`.
 *
 * When a search string is present:
 *   - runs fuzzy search, ranked by relevance
 *   - then applies dimension filters on top
 *
 * When no search string:
 *   - applies dimension filters and returns the result (to be sorted separately)
 */
export function filterLibraryItems(
  items: VocabItem[],
  filters: LibraryFilters,
): VocabItem[] {
  const { search } = filters
  const hasDimFilter = (
    filters.level        !== 'all' ||
    filters.focus        !== 'all' ||
    filters.exposureBand !== 'all' ||
    filters.confidence   !== 'all' ||
    filters.tag          !== 'all' ||
    filters.theme        !== 'all'
  )

  if (search.trim()) {
    const ranked = searchVocabulary(items, search.trim(), 200).map((r) => r.item)
    return hasDimFilter ? ranked.filter((i) => itemPassesDimensionFilters(i, filters)) : ranked
  }

  return hasDimFilter
    ? items.filter((i) => itemPassesDimensionFilters(i, filters))
    : [...items]
}

// ── hasActiveFilter / activeFilterCount ───────────────────────────────────────

/** True when any filter dimension is non-default. */
export function hasActiveFilter(filters: LibraryFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.level        !== 'all' ||
    filters.focus        !== 'all' ||
    filters.exposureBand !== 'all' ||
    filters.confidence   !== 'all' ||
    filters.tag          !== 'all' ||
    filters.theme        !== 'all'
  )
}

/** Count of non-default filter dimensions (for badge display). */
export function activeFilterCount(filters: LibraryFilters): number {
  return [
    filters.search.trim().length > 0,
    filters.level        !== 'all',
    filters.focus        !== 'all',
    filters.exposureBand !== 'all',
    filters.confidence   !== 'all',
    filters.tag          !== 'all',
    filters.theme        !== 'all',
  ].filter(Boolean).length
}

// ── sortLibraryItems ──────────────────────────────────────────────────────────

export function sortLibraryItems(items: VocabItem[], sort: LibrarySortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'az':
        return a.term.localeCompare(b.term)

      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

      case 'exposure-asc':
        return (a.exposureCount ?? 0) - (b.exposureCount ?? 0)

      case 'exposure-desc':
        return (b.exposureCount ?? 0) - (a.exposureCount ?? 0)

      case 'difficulty-desc':
        return (b.difficultyScore ?? 50) - (a.difficultyScore ?? 50)

      case 'difficulty-asc':
        return (a.difficultyScore ?? 50) - (b.difficultyScore ?? 50)

      case 'level-asc':
        return getItemLevel(a) - getItemLevel(b)

      case 'level-desc':
        return getItemLevel(b) - getItemLevel(a)

      case 'due': {
        const aT = a.review.nextReviewAt ? new Date(a.review.nextReviewAt).getTime() : Infinity
        const bT = b.review.nextReviewAt ? new Date(b.review.nextReviewAt).getTime() : Infinity
        return aT - bT
      }

      case 'weak':
        if (a.review.reviewCount < 2 && b.review.reviewCount < 2) return 0
        if (a.review.reviewCount < 2) return 1
        if (b.review.reviewCount < 2) return -1
        return a.review.ease - b.review.ease

      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })
}
