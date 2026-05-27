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
 * region's centroid with stage-based radial offsets and deterministic jitter.
 * Words with no theme drift to the centre with loose scatter.
 *
 * ── Determinism guarantee ─────────────────────────────────────────────────────
 *
 * All positions are derived from FNV-1a hash32(item.id).
 * Math.random() is NEVER called.  Same items → same positions, every session.
 *
 * ── Stage colour palette (single lens) ───────────────────────────────────────
 *
 *   new        slate    #64748b   radius 4   glow off
 *   introduced indigo   #818cf8   radius 5   glow low
 *   drilling   amber    #fbbf24   radius 6   glow medium
 *   activate   warm wh  #f8f4ef   radius 7   glow high
 *   mastered   green    #4ade80   radius 8   glow full
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

// ── Stage visual config ───────────────────────────────────────────────────────

const STAGE_CONFIG: Record<AtlasStage, AtlasNodeStyle> = {
  new:        { color: '#64748b', radius: 4,  glowColor: 'rgba(100, 116, 139, 0)',    glowBlur: 0  },
  introduced: { color: '#818cf8', radius: 5,  glowColor: 'rgba(129, 140, 248, 0.5)', glowBlur: 6  },
  drilling:   { color: '#fbbf24', radius: 6,  glowColor: 'rgba(251, 191, 36, 0.6)',  glowBlur: 10 },
  activate:   { color: '#f8f4ef', radius: 7,  glowColor: 'rgba(248, 244, 239, 0.8)', glowBlur: 14 },
  mastered:   { color: '#4ade80', radius: 8,  glowColor: 'rgba(74, 222, 128, 0.7)',  glowBlur: 12 },
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

// ── Stage derivation ──────────────────────────────────────────────────────────

function toAtlasStage(item: VocabItem): AtlasStage {
  const stage = getDisplayStage(item)
  if (stage === 'new')        return 'new'
  if (stage === 'introduced') return 'introduced'
  if (stage === 'drilling')   return 'drilling'
  if (stage === 'activate')   return 'activate'
  return 'mastered'
}

// ── Stage-based radial band ───────────────────────────────────────────────────
//
// Words are placed within a radius band that grows with stage.
// This creates a visible spatial gradient from centre-ish (new) to outer (mastered).
// The scatter RANGE is wide to avoid obvious rings — only the base shifts.

const STAGE_RADIAL_BASE: Record<AtlasStage, number> = {
  new:        30,
  introduced: 60,
  drilling:   90,
  activate:   130,
  mastered:   160,
}
const STAGE_RADIAL_SCATTER: Record<AtlasStage, number> = {
  new:        40,
  introduced: 50,
  drilling:   60,
  activate:   60,
  mastered:   70,
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

// ── Word position within a region ─────────────────────────────────────────────

function placeWord(
  item: VocabItem,
  stage: AtlasStage,
  region: AtlasRegion | null,
): { x: number; y: number } {
  const cx = region ? region.cx : CANVAS_W / 2
  const cy = region ? region.cy : CANVAS_H / 2

  const baseRadius = STAGE_RADIAL_BASE[stage]
  const scatter    = STAGE_RADIAL_SCATTER[stage]

  // Deterministic radial offset for this word
  const radiusJitter = hashFloat(item.id, 'radius') * scatter
  const radius = baseRadius + radiusJitter

  // Deterministic angle — full circle (2π)
  const angle = hashFloat(item.id, 'angle') * Math.PI * 2

  // Cap within halo bounds if we have a region
  const maxR = region ? Math.min(region.rx, region.ry) * 0.92 : 800

  const r = Math.min(radius, maxR)

  return {
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
  }
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
    const stage   = toAtlasStage(item)
    const style   = STAGE_CONFIG[stage]
    const theme   = item.themes?.[0]
    const region  = (theme && regionMap.has(theme)) ? regionMap.get(theme)! : null

    const { x, y } = placeWord(item, stage, region)

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
