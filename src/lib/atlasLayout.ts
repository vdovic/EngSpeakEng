/**
 * atlasLayout.ts
 *
 * Pure layout engine for the Language Atlas.
 * No React, no DOM, no side effects — accepts VocabItem[] and returns AtlasLayout.
 *
 * ── Architecture ──────────────────────────────────────────────────────────────
 *
 * The canvas is 4000 × 2800 world units.  The camera starts centred.
 * Themes are placed as "regions" — soft elliptical halos — at golden-angle
 * positions on an ellipse.  Words within each theme cluster around their
 * region's centroid using Gaussian scatter (Box-Muller transform).
 *
 * ── Spatial semantics ─────────────────────────────────────────────────────────
 *
 * Mastered words settle NEAR their region centroid (sigma=35 — the settled core).
 * New words scatter FAR from the centroid (sigma=220 — the frontier cloud).
 * This makes the learner's owned vocabulary feel dense and inhabited, while
 * unlearned words feel distant, numerous, and waiting.
 *
 * ── Visual weight ─────────────────────────────────────────────────────────────
 *
 * Node radius is derived from engagement: exposure + recalls + usage.
 * A word the learner has wrestled with repeatedly appears large and solid.
 * A fresh, untouched word appears as a faint point.
 * Stage colour provides the hue layer; engagement provides the mass.
 *
 * ── Lens system ───────────────────────────────────────────────────────────────
 *
 * The same layout supports three interpretive lenses:
 *   progress    — stage-based colour (default, existing behaviour)
 *   vitality    — recent activity / engagement warmth
 *   confidence  — self-assessed comfort level
 *
 * Positions never change between lenses; only visual interpretation does.
 * Lens rendering is handled in AtlasCanvas, not in this module.
 *
 * ── Determinism guarantee ─────────────────────────────────────────────────────
 *
 * All positions are derived from FNV-1a hash32(item.id).
 * Math.random() is NEVER called.  Same items → same positions, every session.
 *
 * ── Stage colour palette ──────────────────────────────────────────────────────
 *
 *   new        slate    #64748b   glow off
 *   introduced indigo   #818cf8   glow low
 *   drilling   amber    #fbbf24   glow medium
 *   activate   warm wh  #f8f4ef   glow high
 *   mastered   green    #4ade80   glow full
 */

import type { VocabItem } from '@/types/vocabulary'
import { getDisplayStage } from '@/lib/progressionLogic'

// ── Canvas dimensions ─────────────────────────────────────────────────────────

export const CANVAS_W = 4000
export const CANVAS_H = 2800

// ── Types ─────────────────────────────────────────────────────────────────────

export type AtlasStage = 'new' | 'introduced' | 'drilling' | 'activate' | 'mastered'

/** Three interpretive lenses — same world, different visual truth. */
export type AtlasLens = 'progress' | 'vitality' | 'confidence'

export interface AtlasNodeStyle {
  color: string
  radius: number
  glowColor: string
  glowBlur: number
}

export interface AtlasNode {
  id: string
  term: string
  x: number             // world-space X
  y: number             // world-space Y
  stage: AtlasStage
  style: AtlasNodeStyle // base Progress-lens style; other lenses computed at render time
  /** Deterministic drift phase (0–2π), derived from hash */
  driftPhase: number
  /** Deterministic drift axis (0–2π), for figure-8 motion */
  driftAxisPhase: number

  // ── Lens computation data (precomputed from VocabItem) ─────────────────────
  /** Confidence lens: self-assessed comfort level. 0 = unrated. */
  confidenceLevel: 0 | 1 | 2 | 3
  /** Vitality lens: timestamp (ms) of last challenge, review, or real-life use. */
  lastActivityMs: number | null
  /** True if item is currently in the learner's Focus portfolio. */
  isInFocus: boolean
  /** True if the learner logged real-life use in the past 30 days. */
  isRecentlyUsed: boolean
  /** Raw exposure count (0–8), for exposure-level archipelago grouping. */
  exposureCount: number
}

export interface AtlasRegion {
  theme: string
  cx: number            // world-space centroid X
  cy: number            // world-space centroid Y
  rx: number            // halo ellipse half-width
  ry: number            // halo ellipse half-height
}

export interface AtlasBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface AtlasLayout {
  nodes: AtlasNode[]
  regions: AtlasRegion[]
  bounds: AtlasBounds
}

// ── Stage visual config (radius excluded — computed from engagement) ───────────

type AtlasNodeStyleConfig = Omit<AtlasNodeStyle, 'radius'>

const STAGE_CONFIG: Record<AtlasStage, AtlasNodeStyleConfig> = {
  new:        { color: '#64748b', glowColor: 'rgba(100, 116, 139, 0)',    glowBlur: 0  },
  introduced: { color: '#818cf8', glowColor: 'rgba(129, 140, 248, 0.5)', glowBlur: 6  },
  drilling:   { color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.6)',  glowBlur: 10 },
  activate:   { color: '#f8f4ef', glowColor: 'rgba(248, 244, 239, 0.8)', glowBlur: 14 },
  mastered:   { color: '#4ade80', glowColor: 'rgba(74, 222, 128, 0.7)',  glowBlur: 12 },
}

/** Canonical stage ordering — used for projection and display logic. */
export const STAGE_ORDER: readonly AtlasStage[] = [
  'new', 'introduced', 'drilling', 'activate', 'mastered',
]

// ── Gaussian scatter sigma per stage ─────────────────────────────────────────
//
// Mastered words (sigma=35) settle tightly near the region centroid — the
// inhabited, owned core.  New words (sigma=220) scatter widely — the frontier
// cloud the learner is approaching.

const STAGE_SIGMA: Record<AtlasStage, number> = {
  mastered:   35,
  activate:   55,
  drilling:   80,
  introduced: 130,
  new:        220,
}

// ── FNV-1a hash32 ─────────────────────────────────────────────────────────────

/**
 * FNV-1a 32-bit hash.  Deterministic, no Math.random().
 * Returns an unsigned 32-bit integer.
 */
export function hash32(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Derive a float in [0, 1) from a hash and a salt.
 * Use different salts to get independent values from the same ID.
 */
function hashFloat(id: string, salt: string): number {
  return (hash32(id + salt) / 0x100000000)
}

// ── Box-Muller Gaussian pair ───────────────────────────────────────────────────

function gaussianPair(u1: number, u2: number): [number, number] {
  const u1Safe = Math.max(u1, 1e-7)
  const mag = Math.sqrt(-2 * Math.log(u1Safe))
  return [
    mag * Math.cos(2 * Math.PI * u2),
    mag * Math.sin(2 * Math.PI * u2),
  ]
}

// ── Engagement-based radius ────────────────────────────────────────────────────
//
// Range: 2.5 (no engagement) → 9.5 (full engagement, max 21 points)

function engagementRadius(item: VocabItem): number {
  const exposure = Math.min(item.exposureCount ?? 0, 8)
  const recalls  = Math.min(item.review?.successfulRecalls ?? 0, 8)
  const usageLogs = item.activation?.usageLogs
  const usage    = Math.min(Array.isArray(usageLogs) ? usageLogs.length : 0, 5)
  const score    = (exposure + recalls + usage) / 21
  return 2.5 + score * 7.0
}

// ── Lens data computation ─────────────────────────────────────────────────────

function getLastActivityMs(item: VocabItem): number | null {
  const candidates = [
    item.activation?.lastUsedAt,
    item.review?.lastReviewedAt,
    item.lastExposureAt,
    item.activation?.usageLogs?.slice(-1)[0]?.usedAt,
  ]
  const valid = candidates
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s) => new Date(s).getTime())
    .filter((t) => !isNaN(t) && t > 0)
  return valid.length > 0 ? Math.max(...valid) : null
}

function computeIsRecentlyUsed(item: VocabItem): boolean {
  const logs = item.activation?.usageLogs ?? []
  if (logs.length === 0) return false
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000
  return logs.some((log) => {
    const t = new Date(log.usedAt).getTime()
    return !isNaN(t) && t > cutoffMs
  })
}

// ── Stage derivation ──────────────────────────────────────────────────────────

function toAtlasStage(item: VocabItem): AtlasStage {
  const stage = getDisplayStage(item)
  if (stage === 'new')        return 'new'
  if (stage === 'introduced') return 'introduced'
  if (stage === 'drilling')   return 'drilling'
  if (stage === 'activate')   return 'activate'
  return 'mastered'
}

// ── Theme centroid placement ──────────────────────────────────────────────────

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const REGION_ELLIPSE_RX = 1350
const REGION_ELLIPSE_RY = 950
const REGION_HALO_BASE_RX = 250
const REGION_HALO_BASE_RY = 220
const REGION_HALO_PER_WORD = 7

function computeRegions(
  themes: string[],
  themeCounts: Map<string, number>,
): Map<string, AtlasRegion> {
  const result = new Map<string, AtlasRegion>()
  const cx = CANVAS_W / 2
  const cy = CANVAS_H / 2

  themes.forEach((theme, idx) => {
    const angle = idx * GOLDEN_ANGLE
    const regionCx = cx + Math.cos(angle) * REGION_ELLIPSE_RX
    const regionCy = cy + Math.sin(angle) * REGION_ELLIPSE_RY
    const count = themeCounts.get(theme) ?? 1
    const rx = REGION_HALO_BASE_RX + count * REGION_HALO_PER_WORD
    const ry = REGION_HALO_BASE_RY + count * REGION_HALO_PER_WORD

    result.set(theme, { theme, cx: regionCx, cy: regionCy, rx, ry })
  })

  return result
}

// ── Word position within a region (Gaussian scatter) ─────────────────────────

const MAX_SIGMA_MULT = 3.0

function placeWord(
  item: VocabItem,
  stage: AtlasStage,
  region: AtlasRegion | null,
): { x: number; y: number } {
  const cx = region ? region.cx : CANVAS_W / 2
  const cy = region ? region.cy : CANVAS_H / 2
  const sigma = STAGE_SIGMA[stage]
  const u1 = hashFloat(item.id, 'gauss_u1')
  const u2 = hashFloat(item.id, 'gauss_u2')
  const [z0, z1] = gaussianPair(u1, u2)
  const clamp = sigma * MAX_SIGMA_MULT
  return {
    x: cx + Math.max(-clamp, Math.min(clamp, z0 * sigma)),
    y: cy + Math.max(-clamp, Math.min(clamp, z1 * sigma)),
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Compute the full atlas layout for a set of VocabItems.
 * Only non-archived items are included.
 * Items without themes float near the centre.
 */
export function computeAtlasLayout(items: VocabItem[]): AtlasLayout {
  const visible = items.filter((i) => !i.archived)

  // ── 1. Gather theme counts (min 2 items for a named region) ──────────────
  const themeCounts = new Map<string, number>()
  for (const item of visible) {
    const primaryTheme = item.themes?.[0]
    if (primaryTheme) {
      themeCounts.set(primaryTheme, (themeCounts.get(primaryTheme) ?? 0) + 1)
    }
  }

  const qualifiedThemes = [...themeCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
    .map(([theme]) => theme)

  // ── 2. Place region centroids ─────────────────────────────────────────────
  const regionMap = computeRegions(qualifiedThemes, themeCounts)

  // ── 3. Place each word ────────────────────────────────────────────────────
  const nodes: AtlasNode[] = visible.map((item) => {
    const stage  = toAtlasStage(item)
    const theme  = item.themes?.[0]
    const region = (theme && regionMap.has(theme)) ? regionMap.get(theme)! : null
    const { x, y } = placeWord(item, stage, region)
    const baseStyle = STAGE_CONFIG[stage]
    const style: AtlasNodeStyle = { ...baseStyle, radius: engagementRadius(item) }

    return {
      id:             item.id,
      term:           item.term,
      x,
      y,
      stage,
      style,
      driftPhase:     hashFloat(item.id, 'drift')    * Math.PI * 2,
      driftAxisPhase: hashFloat(item.id, 'driftAxis') * Math.PI * 2,
      // Lens data
      confidenceLevel: (item.activation?.confidenceLevel ?? 0) as 0 | 1 | 2 | 3,
      lastActivityMs:  getLastActivityMs(item),
      isInFocus:       (item.inFocus ?? item.weeklyFocus) === true,
      isRecentlyUsed:  computeIsRecentlyUsed(item),
      exposureCount:   Math.min(item.exposureCount ?? 0, 8),
    }
  })

  // ── 4. Compute bounds ────────────────────────────────────────────────────
  const bounds: AtlasBounds =
    nodes.length === 0
      ? { minX: 0, minY: 0, maxX: CANVAS_W, maxY: CANVAS_H }
      : nodes.reduce(
          (acc, n) => ({
            minX: Math.min(acc.minX, n.x),
            minY: Math.min(acc.minY, n.y),
            maxX: Math.max(acc.maxX, n.x),
            maxY: Math.max(acc.maxY, n.y),
          }),
          { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
        )

  return {
    nodes,
    regions: qualifiedThemes.map((t) => regionMap.get(t)!),
    bounds,
  }
}

// ── Future You projection ─────────────────────────────────────────────────────
//
// Projects the learner's vocabulary forward in time — a deterministic simulation
// of approximately 6 months of continued practice at the current pace.
//
// Rules:
//   • Positions are UNCHANGED — the learner recognises their own map.
//   • Stage advances 1–2 steps (seeded from item ID, so it's deterministic).
//   • Visual weight (radius) is boosted slightly — more practice = more mass.
//   • All real data (confidence, activity, focus) carries over unchanged.
//   • This is clearly labelled as a simulation.  It is never the default view.
//   • It must not make the real Atlas feel inferior.

function projectStage(stage: AtlasStage, id: string): AtlasStage {
  const idx = STAGE_ORDER.indexOf(stage)
  // 60% advance by 2, 40% by 1 — deterministic from item id
  const advance = hashFloat(id, 'future_adv') > 0.40 ? 2 : 1
  return STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, idx + advance)]
}

export function projectAtlasLayout(layout: AtlasLayout): AtlasLayout {
  const nodes: AtlasNode[] = layout.nodes.map((node) => {
    const projStage = projectStage(node.stage, node.id)
    // Slight radius boost: simulates more practice
    const projRadius = Math.min(9.5, node.style.radius * 1.15 + 1.0)
    const style: AtlasNodeStyle = {
      ...STAGE_CONFIG[projStage],
      radius: projRadius,
    }
    return { ...node, stage: projStage, style }
  })
  return { ...layout, nodes }
}
