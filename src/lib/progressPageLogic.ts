/**
 * progressPageLogic.ts
 *
 * Pure helper functions for the new Progress page (Phase 1).
 * No React, no store, no async — plain data in, plain data out.
 *
 * Design intent: the Progress page is a reflective, emotionally honest
 * view of where the learner actually stands.  Every function here serves
 * that goal — showing state, not scoring performance.
 */

import { subDays, format } from 'date-fns'
import type { VocabItem } from '@/types/vocabulary'
import { getDisplayStage, DisplayStage } from '@/lib/progressionLogic'

// ── Types ──────────────────────────────────────────────────────────────────────

/** Per-stage word count, derived from live item data. */
export type StageDistribution = Record<DisplayStage, number>

/**
 * A word sitting at the Activate stage — drilled, waiting for real-life use.
 * daysKnown is the number of full days since the word was created.
 */
export interface ActivateItem {
  id: string
  term: string
  daysKnown: number
}

/**
 * One day's activity dot for the 90-day momentum trail.
 * `points` comes from the gamification pointsHistory store.
 * `active` is true if any points were earned that day.
 */
export interface DayActivityDot {
  dateKey: string   // YYYY-MM-DD
  label: string     // 'May 1'
  points: number
  active: boolean
}

/** Input for the headline engine. */
export interface HeadlineInput {
  aliveCount: number
  masteredCount: number
  activateCount: number
  totalInLibrary: number
  stageDistribution: StageDistribution
  usesThisWeek: number
  streakDays: number
}

/** The two-line headline result. */
export interface ProgressHeadline {
  /** Short, emotionally resonant main line. */
  main: string
  /** Calm, factual supporting line. */
  sub: string
}

// ── Stage distribution ─────────────────────────────────────────────────────────

/**
 * Count items per DisplayStage using live derivation.
 * Archived items and inbox-only items are excluded.
 */
export function getStageDistribution(items: VocabItem[]): StageDistribution {
  const dist: StageDistribution = {
    new: 0,
    introduced: 0,
    drilling: 0,
    activate: 0,
    mastered: 0,
  }
  for (const item of items) {
    if (item.archived) continue
    dist[getDisplayStage(item)]++
  }
  return dist
}

// ── Alive vocabulary count ────────────────────────────────────────────────────

/**
 * "Alive vocabulary" = words the learner has genuinely made their own.
 *
 * Includes:
 *   • Mastered words (display stage = 'mastered')
 *   • Activate-stage words with at least one logged real-life use
 *     (partial activation counts — the word has been attempted outside the app)
 *
 * Excludes archived items.
 */
export function getAliveVocabCount(items: VocabItem[]): number {
  let count = 0
  for (const item of items) {
    if (item.archived) continue
    const stage = getDisplayStage(item)
    if (stage === 'mastered') {
      count++
    } else if (stage === 'activate' && (item.activation?.usageCount ?? 0) > 0) {
      count++
    }
  }
  return count
}

// ── Activate-stage items ──────────────────────────────────────────────────────

/**
 * Returns all non-archived items at the Activate stage.
 * Sorted by daysKnown descending (words waiting longest come first).
 */
export function getActivateStageItems(items: VocabItem[]): ActivateItem[] {
  const now = Date.now()
  return items
    .filter((i) => !i.archived && getDisplayStage(i) === 'activate')
    .map((i) => ({
      id: i.id,
      term: i.term,
      daysKnown: Math.floor((now - new Date(i.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => b.daysKnown - a.daysKnown)
}

// ── 90-day activity trail ─────────────────────────────────────────────────────

/**
 * Build the 90-day activity trail from the gamification pointsHistory.
 * Returns one DayActivityDot per day, oldest first (index 0 = 89 days ago).
 */
export function get90DayActivity(
  pointsHistory: Record<string, number>,
  days = 90,
): DayActivityDot[] {
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(new Date(), days - 1 - i)
    const dateKey = day.toISOString().slice(0, 10)
    const points = pointsHistory[dateKey] ?? 0
    return {
      dateKey,
      label: format(day, 'MMM d'),
      points,
      active: points > 0,
    }
  })
}

// ── Relative time ─────────────────────────────────────────────────────────────

/**
 * Human-readable relative time string for display next to Activate-stage words.
 * Custom implementation — avoids importing formatDistanceToNow from date-fns
 * to keep the output phrasing exactly right for this context.
 *
 * Returns strings like "3 days ago", "2 weeks ago", "4 months ago".
 * For very recent items (< 2 days) returns "yesterday" or "today".
 */
export function relativeTime(isoDate: string): string {
  const ms   = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))

  if (days <= 0)  return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)   return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`
  return 'over a year ago'
}

// ── Headline engine ───────────────────────────────────────────────────────────

/**
 * Priority-based headline engine.
 *
 * Evaluates several signals and returns the highest-priority message.
 * The headline is intentionally calm, never punishing, never excessively
 * celebratory.  It answers: "What does this collection mean right now?"
 *
 * Priority order (first match wins):
 *   1. Significant milestone reached (alive ≥ 100, 250, 500, 1000…)
 *   2. Strong momentum this week (streak ≥ 7 or uses ≥ 5)
 *   3. Good momentum (streak ≥ 3 or uses ≥ 2)
 *   4. Activate backlog growing (≥ 10 words waiting)
 *   5. Just started (alive < 5)
 *   6. Default: steady progress
 */
export function buildProgressHeadline(input: HeadlineInput): ProgressHeadline {
  const { aliveCount, masteredCount, activateCount, totalInLibrary, usesThisWeek, streakDays } = input

  // ── Milestone: 1 000+ ─────────────────────────────────────────────────────
  if (aliveCount >= 1000) {
    return {
      main: 'A thousand words, genuinely yours.',
      sub: `${aliveCount.toLocaleString()} words you can actually reach for.`,
    }
  }

  // ── Milestone: 500+ ──────────────────────────────────────────────────────
  if (aliveCount >= 500) {
    return {
      main: 'Five hundred words in your active vocabulary.',
      sub: 'That is a substantial range — keep going.',
    }
  }

  // ── Milestone: 250+ ──────────────────────────────────────────────────────
  if (aliveCount >= 250) {
    return {
      main: 'A rich foundation is forming.',
      sub: `${aliveCount} words you have drilled and used.`,
    }
  }

  // ── Milestone: 100+ ──────────────────────────────────────────────────────
  if (aliveCount >= 100) {
    return {
      main: 'Over a hundred words alive in your vocabulary.',
      sub: `${masteredCount} mastered · ${activateCount} ready to use.`,
    }
  }

  // ── Strong momentum ───────────────────────────────────────────────────────
  if (streakDays >= 7 || usesThisWeek >= 5) {
    return {
      main: 'You are building real momentum.',
      sub: aliveCount > 0
        ? `${aliveCount} words in active use.`
        : 'Keep practising and logging real-life uses.',
    }
  }

  // ── Good momentum ─────────────────────────────────────────────────────────
  if (streakDays >= 3 || usesThisWeek >= 2) {
    return {
      main: 'Good progress this week.',
      sub: aliveCount > 0
        ? `${aliveCount} words you can genuinely use.`
        : `${totalInLibrary} words in your library.`,
    }
  }

  // ── Activate backlog ──────────────────────────────────────────────────────
  if (activateCount >= 10) {
    return {
      main: `${activateCount} words are ready for real-life use.`,
      sub: 'Try one in a conversation, email, or meeting today.',
    }
  }

  // ── Just started ──────────────────────────────────────────────────────────
  if (aliveCount < 5) {
    if (totalInLibrary === 0) {
      return {
        main: 'Your vocabulary journey starts here.',
        sub: 'Add words to your library to begin.',
      }
    }
    return {
      main: 'Your vocabulary is just getting started.',
      sub: `${totalInLibrary} word${totalInLibrary !== 1 ? 's' : ''} in your library — keep practising.`,
    }
  }

  // ── Default: steady ───────────────────────────────────────────────────────
  return {
    main: `${aliveCount} words you can genuinely reach for.`,
    sub: masteredCount > 0
      ? `${masteredCount} mastered · ${activateCount} in activation.`
      : `${activateCount} word${activateCount !== 1 ? 's' : ''} ready for real-life use.`,
  }
}

// ── Growth cohorts (Phase 4 Observatory) ─────────────────────────────────────

/**
 * A monthly cohort of vocabulary items — used to render the Growth Rings visualization.
 * Items are grouped by their createdAt date; stage distribution reflects current live state.
 * Sorted oldest-first so the innermost ring = earliest cohort.
 */
export interface GrowthCohort {
  monthKey: string                // 'YYYY-MM' — sortable key
  label: string                   // 'Jan 2025' — display label
  total: number                   // words added in this month
  distribution: StageDistribution // current stage breakdown for these words
}

/**
 * Groups non-archived items by creation month.
 * Returns cohorts sorted oldest-first.
 */
export function buildGrowthCohorts(items: VocabItem[]): GrowthCohort[] {
  const map = new Map<string, { total: number; distribution: StageDistribution }>()

  for (const item of items) {
    if (item.archived) continue
    const d = new Date(item.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!map.has(key)) {
      map.set(key, {
        total: 0,
        distribution: { new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0 },
      })
    }
    const entry = map.get(key)!
    entry.total++
    entry.distribution[getDisplayStage(item)]++
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { total, distribution }]) => {
      const [yr, mo] = key.split('-')
      const label = format(new Date(Number(yr), Number(mo) - 1, 1), 'MMM yyyy')
      return { monthKey: key, label, total, distribution }
    })
}

// ── Theme territory (Phase 4 Observatory) ─────────────────────────────────────

/**
 * Per-theme aggregated data — used by the Territory lens.
 * Words assigned to multiple themes are counted in each.
 */
export interface ThemeTerritoryEntry {
  theme: string
  total: number
  distribution: StageDistribution
  aliveCount: number   // mastered + activate-stage words with usageCount > 0
}

/**
 * Aggregates non-archived items per user-defined theme.
 * Items assigned to multiple themes are counted in each.
 * Result sorted by total descending.
 */
export function buildThemeTerritory(
  items: VocabItem[],
  themes: string[],
): ThemeTerritoryEntry[] {
  const map = new Map<string, { total: number; distribution: StageDistribution; aliveCount: number }>()

  for (const theme of themes) {
    map.set(theme, {
      total: 0,
      distribution: { new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0 },
      aliveCount: 0,
    })
  }

  for (const item of items) {
    if (item.archived) continue
    const stage = getDisplayStage(item)
    const alive =
      stage === 'mastered' ||
      (stage === 'activate' && (item.activation?.usageCount ?? 0) > 0)

    for (const theme of (item.themes ?? [])) {
      const entry = map.get(theme)
      if (!entry) continue
      entry.total++
      entry.distribution[stage]++
      if (alive) entry.aliveCount++
    }
  }

  return Array.from(map.entries())
    .filter(([, e]) => e.total > 0)
    .map(([theme, e]): ThemeTerritoryEntry => ({
      theme,
      total: e.total,
      distribution: { ...e.distribution },
      aliveCount: e.aliveCount,
    }))
    .sort((a, b) => b.total - a.total)
}

// ── Long horizon (Phase 4 Observatory) ────────────────────────────────────────

/** One projected milestone in the Long Horizon view. */
export interface LongHorizonMilestone {
  target: number
  reached: boolean
  /**
   * Approximate weeks from now to reach this milestone.
   * null when velocity is zero or milestone is already reached.
   */
  weeksFromNow: number | null
}

/** Data for the Long Horizon visualization. */
export interface LongHorizon {
  /** Total non-archived items currently in the library. */
  currentTotal: number
  /** Average new words added per week over the last 28 days. */
  weeklyVelocity: number
  /** Standard milestone checkpoints toward the 1 500-word goal. */
  milestones: LongHorizonMilestone[]
}

const HORIZON_TARGETS = [100, 250, 500, 750, 1000, 1500] as const

/**
 * Computes a growth-rate projection from createdAt timestamps.
 * Velocity = words added in the last 28 days ÷ 4.
 * Milestones are projected forward from the current library size.
 */
export function buildLongHorizon(items: VocabItem[]): LongHorizon {
  const now    = Date.now()
  const active = items.filter((i) => !i.archived)
  const currentTotal = active.length

  const windowMs    = 28 * 24 * 60 * 60 * 1000
  const recentCount = active.filter((i) => now - new Date(i.createdAt).getTime() < windowMs).length
  const weeklyVelocity = recentCount / 4

  const milestones: LongHorizonMilestone[] = HORIZON_TARGETS.map((target) => {
    if (target <= currentTotal) {
      return { target, reached: true, weeksFromNow: null }
    }
    if (weeklyVelocity <= 0) {
      return { target, reached: false, weeksFromNow: null }
    }
    return {
      target,
      reached: false,
      weeksFromNow: Math.ceil((target - currentTotal) / weeklyVelocity),
    }
  })

  return { currentTotal, weeklyVelocity, milestones }
}

// ── Constellation (Phase 2) ───────────────────────────────────────────────────

/**
 * A single node in the Living Vocabulary Constellation.
 * Positions are normalized 0–1 (multiply by viewBox dimensions to get SVG coords).
 * Positions are fully deterministic — the same item ID always maps to the same point.
 *
 * Phase 3 additions: createdAt + lastActiveAt support the Word Journey Card.
 */
export interface ConstellationNode {
  id: string
  term: string
  stage: DisplayStage
  /** First alphabetical theme the item belongs to, or null. */
  primaryTheme: string | null
  usageCount: number
  confidenceLevel: number
  /** Normalized x position, 0–1, stable across renders. */
  x: number
  /** Normalized y position, 0–1, stable across renders. */
  y: number
  /** ISO date string of when the item was added to the library. */
  createdAt: string
  /**
   * ISO date string of the most recent meaningful interaction with this word
   * (last confidence update, last usage log, or last challenge exposure).
   * Undefined if the word has never been actively engaged with.
   */
  lastActiveAt?: string
}

/**
 * FNV-1a hash of a string — maps an item ID to a stable integer seed.
 * Produces good bit distribution from short strings.
 */
function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Knuth multiplicative LCG seeded from a 32-bit integer.
 * Returns a closure that yields numbers in [0, 1).
 * Two calls produce two independent coordinates for the same node.
 */
function lcg(seed: number): () => number {
  let s = seed === 0 ? 1 : seed >>> 0
  return function () {
    s = Math.imul(1664525, s) + 1013904223
    s = s >>> 0
    return s / 0x100000000
  }
}

/** Stage rendering priority — higher = rendered last (on top). */
const STAGE_RENDER_ORDER: Record<DisplayStage, number> = {
  new:        0,
  introduced: 1,
  drilling:   2,
  activate:   3,
  mastered:   4,
}

/**
 * Build constellation node data from vocabulary items and the user's theme list.
 *
 * Algorithm:
 *   1. Sort themes alphabetically (stable — matches themesStore ordering).
 *   2. Place each theme's cluster center on an ellipse around (0.5, 0.5).
 *   3. Unthemed items cluster near the centre with a wider scatter radius.
 *   4. Each item's final position = cluster_center + seededNoise(item.id).
 *   5. Cap at maxNodes by priority (mastered first, then activate, etc.).
 *
 * All positions are deterministic — same ID always yields same (x, y).
 */
export function buildConstellationNodes(
  items: VocabItem[],
  themes: string[],
  maxNodes = 300,
): ConstellationNode[] {
  const SCATTER   = 0.13   // normalized scatter radius within a cluster
  const UNSCATTER = 0.18   // slightly wider scatter for unthemed words
  const MARGIN    = 0.04   // keep nodes away from SVG edges

  // Filter archived items; cap by stage priority then creation date
  const active = items.filter((i) => !i.archived)
  const capped = [...active]
    .sort((a, b) => {
      const pa = STAGE_RENDER_ORDER[getDisplayStage(a)]
      const pb = STAGE_RENDER_ORDER[getDisplayStage(b)]
      if (pa !== pb) return pb - pa           // higher priority first
      return b.createdAt.localeCompare(a.createdAt)  // newer first within tier
    })
    .slice(0, maxNodes)

  // Build cluster centres: themes on an ellipse
  const sortedThemes = [...themes].sort()
  const centers = new Map<string, { cx: number; cy: number }>()
  centers.set('__unthemed__', { cx: 0.5, cy: 0.5 })

  if (sortedThemes.length > 0) {
    sortedThemes.forEach((theme, i) => {
      // Distribute themes evenly around an ellipse; offset by -π/2 so first theme starts at top
      const angle = (i / sortedThemes.length) * 2 * Math.PI - Math.PI / 2
      centers.set(theme, {
        cx: 0.5 + 0.33 * Math.cos(angle),
        cy: 0.5 + 0.27 * Math.sin(angle),
      })
    })
  }

  return capped.map((item) => {
    const stage        = getDisplayStage(item)
    // Pick the first alphabetically-sorted theme that's in the user's theme list
    const sortedItem   = [...(item.themes ?? [])].sort()
    const primaryTheme = sortedItem.find((t) => centers.has(t)) ?? null
    const clusterKey   = primaryTheme ?? '__unthemed__'
    const center       = centers.get(clusterKey)!
    const scatter      = primaryTheme ? SCATTER : UNSCATTER

    const rng   = lcg(hashId(item.id))
    const angle = rng() * 2 * Math.PI
    const r     = Math.sqrt(rng()) * scatter   // sqrt gives uniform disc distribution

    // Compute last meaningful interaction timestamp
    const candidates: string[] = []
    if (item.activation?.lastUsedAt)      candidates.push(item.activation.lastUsedAt)
    if (item.lastExposureAt)              candidates.push(item.lastExposureAt)
    const lastLog = item.activation?.usageLogs?.at?.(-1)
    if (lastLog?.usedAt)                  candidates.push(lastLog.usedAt)
    candidates.sort()
    const lastActiveAt = candidates.at(-1)  // latest ISO string

    return {
      id:             item.id,
      term:           item.term,
      stage,
      primaryTheme,
      usageCount:     item.activation?.usageCount ?? 0,
      confidenceLevel: item.activation?.confidenceLevel ?? 0,
      x: Math.max(MARGIN, Math.min(1 - MARGIN, center.cx + r * Math.cos(angle))),
      y: Math.max(MARGIN, Math.min(1 - MARGIN, center.cy + r * Math.sin(angle))),
      createdAt:      item.createdAt,
      lastActiveAt,
    }
  })
}
