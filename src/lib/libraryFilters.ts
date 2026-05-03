/**
 * libraryFilters.ts
 *
 * Pure helpers for filtering and sorting vocabulary items in the Library page.
 *
 * Separating these from the component keeps LibraryPage leaner and makes the
 * logic testable in isolation.
 */

import type { VocabItem, Level } from '@/types/vocabulary'
import { deriveLevel } from '@/lib/progressionLogic'
import { MAX_EXPOSURE } from '@/lib/constants'

// ── Filter types ──────────────────────────────────────────────────────────────

export type LevelFilter = Level | 'all'

export type FocusFilter = 'all' | 'focus' | 'not-focus'

export type ExposureBandFilter =
  | 'all'
  | 'not-started'   // 0 steps
  | 'early'         // 1–2 steps
  | 'building'      // 3–7 steps
  | 'complete'      // 8 steps (MAX_EXPOSURE)

// ── Sort keys ─────────────────────────────────────────────────────────────────

export type LibrarySortKey =
  | 'newest'
  | 'oldest'
  | 'az'
  | 'za'
  | 'challenge-desc'   // most-practiced first
  | 'challenge-asc'    // least-practiced first
  | 'due'              // SRS due soonest
  | 'weak'             // lowest ease factor
  | 'difficulty-desc'  // hardest for learner first
  | 'difficulty-asc'   // easiest for learner first
  | 'level-asc'        // New → Mastered
  | 'level-desc'       // Mastered → New

// ── Item accessors ────────────────────────────────────────────────────────────

/** Returns the item's canonical learning level, deriving it if not yet stored. */
export function getItemLevel(item: VocabItem): Level {
  return item.level ?? deriveLevel(item)
}

/** Returns true when the item is in the learner's current focus. */
export function isInFocus(item: VocabItem): boolean {
  return !!(item.inFocus || item.weeklyFocus)
}

/** Returns the exposure band label for this item's challenge progress. */
export function getExposureBand(item: VocabItem): ExposureBandFilter {
  const exp = item.exposureCount ?? 0
  if (exp === 0)              return 'not-started'
  if (exp <= 2)               return 'early'
  if (exp < MAX_EXPOSURE)     return 'building'
  return 'complete'
}

// ── Filter ────────────────────────────────────────────────────────────────────

export interface LibraryFilters {
  level: LevelFilter
  focus: FocusFilter
  exposureBand: ExposureBandFilter
  tag: string          // 'all' or a tag string
  theme: string        // 'all' or a theme string
}

/** Returns true when the item passes all active filters. */
export function itemPassesFilters(item: VocabItem, filters: LibraryFilters): boolean {
  const { level, focus, exposureBand, tag, theme } = filters

  if (level !== 'all' && getItemLevel(item) !== level) return false
  if (focus === 'focus'     && !isInFocus(item))  return false
  if (focus === 'not-focus' &&  isInFocus(item))  return false
  if (exposureBand !== 'all' && getExposureBand(item) !== exposureBand) return false
  if (tag !== 'all'   && !item.tags.includes(tag))           return false
  if (theme !== 'all' && !(item.themes ?? []).includes(theme)) return false

  return true
}

/** Returns true when any non-default filter is active. */
export function hasActiveFilter(filters: LibraryFilters): boolean {
  return (
    filters.level !== 'all' ||
    filters.focus !== 'all' ||
    filters.exposureBand !== 'all' ||
    filters.tag !== 'all' ||
    filters.theme !== 'all'
  )
}

/** Counts how many individual filter dimensions are active (for badge display). */
export function activeFilterCount(filters: LibraryFilters): number {
  return [
    filters.level !== 'all',
    filters.focus !== 'all',
    filters.exposureBand !== 'all',
    filters.tag !== 'all',
    filters.theme !== 'all',
  ].filter(Boolean).length
}

// ── Sort ──────────────────────────────────────────────────────────────────────

export function sortLibraryItems(items: VocabItem[], sort: LibrarySortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    // Exposure-based sorts skip the mastered-sink rule
    if (sort === 'challenge-desc') return (b.exposureCount ?? 0) - (a.exposureCount ?? 0)
    if (sort === 'challenge-asc')  return (a.exposureCount ?? 0) - (b.exposureCount ?? 0)

    // Difficulty sorts
    if (sort === 'difficulty-desc')
      return (b.difficultyScore ?? 50) - (a.difficultyScore ?? 50)
    if (sort === 'difficulty-asc')
      return (a.difficultyScore ?? 50) - (b.difficultyScore ?? 50)

    // Level sorts
    if (sort === 'level-asc')  return getItemLevel(a) - getItemLevel(b)
    if (sort === 'level-desc') return getItemLevel(b) - getItemLevel(a)

    // All remaining sorts: mastered items sink to the bottom
    const aSink = a.status === 'mastered' ? 1 : 0
    const bSink = b.status === 'mastered' ? 1 : 0
    if (aSink !== bSink) return aSink - bSink

    switch (sort) {
      case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'az':     return a.term.localeCompare(b.term)
      case 'za':     return b.term.localeCompare(a.term)
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
