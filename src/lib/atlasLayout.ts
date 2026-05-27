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
  style: AtlasNodeStyle
  /** Deterministic drift phase (0–2π), derived from hash */
  driftPhase: number
  /** Deterministic drift axis (0–2π), for figure-8 motion */
  driftAxisPhase: number
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

// ── Gaussian scatter sigma per stage ─────────────────────────────────────────
//
// Mastered words (sigma=35) settle tightly near the region centroid — the
// inhabited, owned core.  New words (sigma=220) scatter widely — the frontier
// cloud the learner is approaching.  This is the OPPOSITE of a progress meter:
// it encodes spatial ownership, not distance-to-goal.

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
//
// Converts two uniform [0,1) values into two standard-normal values.
// Both u1 and u2 are expected to come from hashFloat (deterministic, in [0,1)).

function gaussianPair(u1: number, u2: number): [number, number] {
  const u1Safe = Math.max(u1, 1e-7)   // avoid log(0)
  const mag = Math.sqrt(-2 * Math.log(u1Safe))
  return [
    mag * Math.cos(2 * Math.PI * u2),
    mag * Math.sin(2 * Math.PI * u2),
  ]
}

// ── Engagement-based radius ────────────────────────────────────────────────────
//
// Radius encodes the learner's lived relationship with the word.
// A word trained many times, recalled successfully, and used in real life
// appears large.  An untouched word appears as a faint point.
//
// Components:
//   exposure  — how many challenge rounds the word has gone through (0–8)
//   recalls   — successful SRS recalls (0–8)
//   usage     — number of real-life usage logs, capped at 5
//
// Range: 2.5 (no engagement) → 9.5 (full engagement, max 21 points)

function engagementRadius(item: VocabItem): number {
  const exposure = Math.min(item.exposureCount ?? 0, 8)
  const recalls  = Math.min(item.review?.successfulRecalls ?? 0, 8)
  const usageLogs = item.activation?.usageLogs
  const usage    = Math.min(Array.isArray(usageLogs) ? usageLogs.length : 0, 5)
  const maxScore = 21
  const score    = (exposure + recalls + usage) / maxScore
  return 2.5 + score * 7.0
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
//
// Themes are placed at golden-angle intervals on an ellipse.
// The golden angle (~137.5°) ensures maximal angular spacing.
// A minimum of 2 items is required for a named region.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))   // ≈ 2.399963
const REGION_ELLIPSE_RX = 1350    // outer ellipse half-width for centroid placement
const REGION_ELLIPSE_RY = 950     // outer ellipse half-height
const REGION_HALO_BASE_RX = 250   // base halo half-width
const REGION_HALO_BASE_RY = 220   // base halo half-height
const REGION_HALO_PER_WORD = 7    // halo grows by this per word in the theme

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
//
// Each word's offset from its region centroid is drawn from a bivariate
// Gaussian with standard deviation STAGE_SIGMA[stage].  Mastered words
// huddle near the centre; new words populate the frontier.
//
// The maximum sigma multiplier (3.0) limits outliers while preserving the
// natural Gaussian cloud shape.

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

  // Clamp to MAX_SIGMA_MULT standard deviations
  const clamp = sigma * MAX_SIGMA_MULT
  const ox = Math.max(-clamp, Math.min(clamp, z0 * sigma))
  const oy = Math.max(-clamp, Math.min(clamp, z1 * sigma))

  return { x: cx + ox, y: cy + oy }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Compute the full atlas layout for a set of VocabItems.
 *
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

  // Sort themes by count desc (largest regions placed first), then alphabetically
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

    // Radius from engagement; stage config provides colour and glow
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
