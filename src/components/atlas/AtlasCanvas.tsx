/**
 * AtlasCanvas.tsx
 *
 * Canvas 2D renderer for the Language Atlas.
 *
 * ── Rendering pipeline (each animation frame) ──────────────────────────────
 *
 *   1. Update interpolated node styles (lens transition via exponential lerp).
 *   2. Draw background (offscreen canvas, painted once).
 *   3. Draw region halos (world-space, inside setTransform).
 *   4. Draw landmark halos (screen-space, behind nodes).
 *   5. Draw nodes (screen-space, shadowBlur stable).
 *   6. Draw persistent labels (zoom-threshold emergence, non-overlapping).
 *   7. Draw Future You watermark (if isFutureMode).
 *   8. Draw hover tooltip.
 *
 * ── Lens system ───────────────────────────────────────────────────────────────
 *
 *   Three lenses share the same world positions; only colour/glow changes.
 *   progress    — stage-based palette (default)
 *   vitality    — recency of activity (amber = active, slate = dormant)
 *   confidence  — self-assessed comfort (green = natural, orange = uncertain)
 *
 *   Transitions use an exponential lerp per node per frame (≈400ms to 95%).
 *   prefers-reduced-motion: instant snap.
 *
 * ── Coordinate system ───────────────────────────────────────────────────────
 *
 *   camera = { x, y, scale }
 *   world→screen: screenX = (worldX - camera.x) * scale * dpr
 *
 * ── Interactions ────────────────────────────────────────────────────────────
 *
 *   Drag: pan   |   Wheel/pinch: zoom   |   Hover: nearest node tooltip
 *   Click (no drag): opens inline word card via onNodeClick callback
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { AtlasLayout, AtlasNode, AtlasLens } from '@/lib/atlasLayout'
import { CANVAS_W, CANVAS_H } from '@/lib/atlasLayout'
import { SpatialGrid } from '@/lib/atlasQuadtree'

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE    = 0.20
const MAX_SCALE    = 4.00
const INITIAL_SCALE = 1.20
const HOVER_HIT_WORLD  = 28     // world-unit radius for hover
const CLICK_HIT_WORLD  = 36     // slightly wider for click
const CLICK_MAX_DRAG   = 6      // px: if pointer moves less than this, it's a click
const DRIFT_AMPLITUDE  = 7.0    // px max drift (perceptible, breathing-like)
const DRIFT_SPEED      = 0.0004 // radians per ms
const REGION_HALO_ALPHA = 0.07
const BG_COLOR = '#08111f'
const LENS_LERP_SPEED  = 0.007  // lerp α per ms (≈400ms to 95%)
const TRANSITION_DURATION = 600 // ms — for reference / docs

// Persistent label zoom thresholds
const LABEL_THRESHOLD: Partial<Record<string, number>> = {
  mastered: 0.75,
  activate: 0.90,
  drilling: 1.30,
}

// ── Camera ────────────────────────────────────────────────────────────────────

interface Camera { x: number; y: number; scale: number }

// ── Internal colour types ─────────────────────────────────────────────────────

type RGB = readonly [number, number, number]

interface FrameStyle {
  fr: number; fg: number; fb: number    // fill RGB
  gr: number; gg: number; gb: number    // glow RGB
  ga: number                            // glow alpha
  glowBlur: number
}

// ── Colour utilities ──────────────────────────────────────────────────────────

function hexToRGB(hex: string): RGB {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as const
}

function lerpFS(a: FrameStyle, b: FrameStyle, t: number): FrameStyle {
  const L = (x: number, y: number) => x + (y - x) * t
  return {
    fr: L(a.fr, b.fr), fg: L(a.fg, b.fg), fb: L(a.fb, b.fb),
    gr: L(a.gr, b.gr), gg: L(a.gg, b.gg), gb: L(a.gb, b.gb),
    ga: L(a.ga, b.ga),
    glowBlur: L(a.glowBlur, b.glowBlur),
  }
}

function fillCSS(fs: FrameStyle): string {
  return `rgb(${Math.round(fs.fr)},${Math.round(fs.fg)},${Math.round(fs.fb)})`
}

function glowCSS(fs: FrameStyle): string {
  return `rgba(${Math.round(fs.gr)},${Math.round(fs.gg)},${Math.round(fs.gb)},${fs.ga.toFixed(3)})`
}

// ── Progress lens — pre-parsed stage colours ──────────────────────────────────

const PROG_RGB: Record<string, RGB> = {
  new:        hexToRGB('#64748b'),
  introduced: hexToRGB('#818cf8'),
  drilling:   hexToRGB('#fbbf24'),
  activate:   hexToRGB('#f8f4ef'),
  mastered:   hexToRGB('#4ade80'),
}
const PROG_GLOW: Record<string, [number,number,number,number]> = {
  new:        [100,116,139, 0.00],
  introduced: [129,140,248, 0.50],
  drilling:   [251,191, 36, 0.60],
  activate:   [248,244,239, 0.80],
  mastered:   [ 74,222,128, 0.70],
}
const PROG_BLUR: Record<string, number> = {
  new: 0, introduced: 6, drilling: 10, activate: 14, mastered: 12,
}

function progressFS(node: AtlasNode): FrameStyle {
  const [fr,fg,fb] = PROG_RGB[node.stage] ?? [100,116,139]
  const [gr,gg,gb,ga] = PROG_GLOW[node.stage] ?? [100,116,139,0]
  return { fr,fg,fb, gr,gg,gb,ga, glowBlur: PROG_BLUR[node.stage] ?? 0 }
}

// ── Vitality lens ─────────────────────────────────────────────────────────────
//
// Dormant → low-activity → moderate → recent → very active
// Maps to a colour gradient: slate → blue → sky → amber → orange

const VITALITY_GRADIENT: RGB[] = [
  hexToRGB('#475569'),  // dormant     — slate-600
  hexToRGB('#93c5fd'),  // low         — blue-300
  hexToRGB('#7dd3fc'),  // moderate    — sky-300
  hexToRGB('#fcd34d'),  // recent      — amber-300
  hexToRGB('#fb923c'),  // very active — orange-400
]

function vitalityScore(node: AtlasNode, nowMs: number): number {
  let v = 0
  if (node.lastActivityMs !== null) {
    const days = (nowMs - node.lastActivityMs) / 86_400_000
    if (days <= 7)       v = 1.00
    else if (days <= 14) v = 0.80
    else if (days <= 30) v = 0.60
    else if (days <= 60) v = 0.40
    else if (days <= 90) v = 0.20
  }
  if (node.isInFocus) v = Math.min(1.0, v + 0.15)
  return v
}

function vitalityFS(node: AtlasNode, nowMs: number): FrameStyle {
  const v    = vitalityScore(node, nowMs)
  const pos  = v * (VITALITY_GRADIENT.length - 1)
  const lo   = Math.floor(pos)
  const hi   = Math.min(VITALITY_GRADIENT.length - 1, lo + 1)
  const t    = pos - lo
  const [ar,ag,ab] = VITALITY_GRADIENT[lo]
  const [br,bg,bb] = VITALITY_GRADIENT[hi]
  const r = ar + (br-ar)*t, g = ag + (bg-ag)*t, b = ab + (bb-ab)*t
  const glowBlur = Math.max(0, (v - 0.35) * 22)
  const ga       = Math.max(0, (v - 0.35) * 0.85)
  return { fr:r,fg:g,fb:b, gr:r,gg:g,gb:b, ga, glowBlur }
}

// ── Confidence lens ───────────────────────────────────────────────────────────
//
//   0 = unrated    → slate (quiet, not judged)
//   1 = uncertain  → orange (warm attention, not alarm)
//   2 = getting there → amber
//   3 = natural    → green (calm ownership)

const CONF_FS: Record<0|1|2|3, FrameStyle> = {
  0: { fr:71,  fg:85,  fb:105, gr:71,  gg:85,  gb:105, ga:0.00, glowBlur: 0  },
  1: { fr:251, fg:146, fb:60,  gr:251, gg:146, gb:60,  ga:0.50, glowBlur: 8  },
  2: { fr:251, fg:191, fb:36,  gr:251, gg:191, gb:36,  ga:0.55, glowBlur: 8  },
  3: { fr:74,  fg:222, fb:128, gr:74,  gg:222, gb:128, ga:0.65, glowBlur: 12 },
}

function confidenceFS(node: AtlasNode): FrameStyle {
  return CONF_FS[node.confidenceLevel]
}

// ── Lens dispatch ─────────────────────────────────────────────────────────────

function getLensStyle(node: AtlasNode, lens: AtlasLens, nowMs: number): FrameStyle {
  if (lens === 'vitality')    return vitalityFS(node, nowMs)
  if (lens === 'confidence')  return confidenceFS(node)
  return progressFS(node)
}

// ── Background offscreen canvas ───────────────────────────────────────────────

function buildBackground(w: number, h: number): HTMLCanvasElement {
  const bg = document.createElement('canvas')
  bg.width = w; bg.height = h
  const ctx = bg.getContext('2d')!

  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, w, h)

  const grd = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h) * 0.65)
  grd.addColorStop(0,   'rgba(20, 40, 80, 0.35)')
  grd.addColorStop(0.5, 'rgba(10, 20, 50, 0.15)')
  grd.addColorStop(1,   'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)

  let seed = 0xdeadbeef
  function lcg() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000 }
  ctx.fillStyle = 'rgba(200, 210, 255, 0.03)'
  for (let i = 0; i < 1800; i++) {
    ctx.beginPath()
    ctx.arc(lcg() * w, lcg() * h, lcg() * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  return bg
}

// ── Shared node screen-position helper ────────────────────────────────────────

function nodeScreenPos(
  node: AtlasNode, camera: Camera, dpr: number, now: number,
): { sx: number; sy: number } {
  const scale = camera.scale * dpr
  const driftX = Math.sin(now * DRIFT_SPEED + node.driftPhase) * DRIFT_AMPLITUDE
  const driftY = Math.cos(now * DRIFT_SPEED + node.driftAxisPhase) * DRIFT_AMPLITUDE
  return {
    sx: (node.x - camera.x) * scale + driftX * dpr,
    sy: (node.y - camera.y) * scale + driftY * dpr,
  }
}

// ── Region halos ──────────────────────────────────────────────────────────────

function drawRegions(
  ctx: CanvasRenderingContext2D,
  layout: AtlasLayout,
  camera: Camera,
  dpr: number,
) {
  ctx.save()
  ctx.setTransform(
    camera.scale * dpr, 0, 0,
    camera.scale * dpr,
    -camera.x * camera.scale * dpr,
    -camera.y * camera.scale * dpr,
  )

  for (const region of layout.regions) {
    const grd = ctx.createRadialGradient(
      region.cx, region.cy, 0,
      region.cx, region.cy, Math.max(region.rx, region.ry),
    )
    grd.addColorStop(0,   `rgba(100, 120, 200, ${REGION_HALO_ALPHA * 1.4})`)
    grd.addColorStop(0.6, `rgba(80, 100, 180, ${REGION_HALO_ALPHA})`)
    grd.addColorStop(1,   'rgba(60, 80, 160, 0)')

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(region.cx, region.cy, region.rx, region.ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()
    ctx.restore()

    // Atmospheric centroid label — italic, low opacity, embedded in terrain
    ctx.save()
    const labelSize = Math.max(18, Math.min(32, region.rx * 0.09))
    ctx.font = `italic ${labelSize}px -apple-system, BlinkMacSystemFont, Georgia, serif`
    ctx.fillStyle = 'rgba(180, 195, 235, 0.15)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const titleCase = region.theme
      .split(' ')
      .map((w) => w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
      .join(' ')
    ctx.fillText(titleCase, region.cx, region.cy)
    ctx.restore()
  }

  ctx.restore()
}

// ── Landmark halos (Progress lens only) ───────────────────────────────────────
//
// Draws a very soft atmospheric halo behind personally meaningful nodes:
//   isRecentlyUsed → warm amber aura  ("I've used this word recently")
//   isInFocus      → cool indigo aura ("this is in my active focus")
//
// These are spatial anchors — not badges, not metrics.
// Hidden in Vitality/Confidence lenses where the node colour already carries
// the signal directly.

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  layout: AtlasLayout,
  camera: Camera,
  dpr: number,
  now: number,
  lens: AtlasLens,
) {
  if (lens !== 'progress') return

  for (const node of layout.nodes) {
    if (!node.isRecentlyUsed && !node.isInFocus) continue

    const { sx, sy } = nodeScreenPos(node, camera, dpr, now)
    const r = node.style.radius * camera.scale * dpr

    ctx.save()

    if (node.isRecentlyUsed) {
      const hR = r * 6
      const grd = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, hR)
      grd.addColorStop(0, 'rgba(251, 191, 36, 0.16)')
      grd.addColorStop(1, 'rgba(251, 191, 36, 0)')
      ctx.beginPath()
      ctx.arc(sx, sy, hR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    if (node.isInFocus) {
      const hR = r * 5
      const grd = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, hR)
      grd.addColorStop(0, 'rgba(99, 102, 241, 0.14)')
      grd.addColorStop(1, 'rgba(99, 102, 241, 0)')
      ctx.beginPath()
      ctx.arc(sx, sy, hR, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Node draw ─────────────────────────────────────────────────────────────────

function drawNodes(
  ctx: CanvasRenderingContext2D,
  layout: AtlasLayout,
  camera: Camera,
  dpr: number,
  now: number,
  canvasW: number,
  canvasH: number,
  hoveredId: string | null,
  nodeStyles: Map<string, FrameStyle>,
) {
  for (const node of layout.nodes) {
    const { sx, sy } = nodeScreenPos(node, camera, dpr, now)
    const margin = 60 * dpr
    if (sx < -margin || sx > canvasW + margin || sy < -margin || sy > canvasH + margin) continue

    const r = node.style.radius * camera.scale * dpr
    const isHovered = node.id === hoveredId
    const fs = nodeStyles.get(node.id)

    ctx.save()

    if (fs && (fs.glowBlur > 0 || isHovered)) {
      ctx.shadowColor = isHovered ? 'rgba(255,255,255,0.9)' : glowCSS(fs)
      ctx.shadowBlur  = (isHovered ? Math.max(14, fs.glowBlur * 2.5) : fs.glowBlur) * dpr
    }

    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = isHovered ? '#ffffff' : (fs ? fillCSS(fs) : node.style.color)
    ctx.fill()

    ctx.restore()
  }
}

// ── Persistent label emergence ────────────────────────────────────────────────
//
// Labels surface for mastered/activate/drilling nodes as zoom threshold is crossed.
// Alpha fades in smoothly. Non-overlapping: lower-priority nodes are skipped.
// Colour matches the current lens style for the node.

function drawLabels(
  ctx: CanvasRenderingContext2D,
  layout: AtlasLayout,
  camera: Camera,
  dpr: number,
  now: number,
  canvasW: number,
  canvasH: number,
  nodeStyles: Map<string, FrameStyle>,
) {
  const scale = camera.scale

  const eligible = layout.nodes.filter((n) => {
    const thr = LABEL_THRESHOLD[n.stage]
    if (thr === undefined || scale < thr) return false
    if (n.stage === 'drilling' && n.style.radius < 4.5) return false
    return true
  })
  if (eligible.length === 0) return

  const STAGE_PRIO: Record<string, number> = { mastered: 0, activate: 1, drilling: 2 }
  eligible.sort((a, b) => {
    const d = (STAGE_PRIO[a.stage] ?? 9) - (STAGE_PRIO[b.stage] ?? 9)
    return d !== 0 ? d : b.style.radius - a.style.radius
  })

  const FONT_SIZE = 11 * dpr
  ctx.font = `500 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`
  const placed: Array<[number, number, number, number]> = []

  for (const node of eligible) {
    const thr = LABEL_THRESHOLD[node.stage]!
    const alpha = Math.min(0.65, Math.max(0, (scale - thr) / 0.35) * 0.65)
    if (alpha < 0.01) continue

    const { sx, sy } = nodeScreenPos(node, camera, dpr, now)
    const margin = 100 * dpr
    if (sx < -margin || sx > canvasW + margin || sy < -margin || sy > canvasH + margin) continue

    const textW  = ctx.measureText(node.term).width
    const nodeR  = node.style.radius * camera.scale * dpr
    const labelX = sx
    const labelY = sy - nodeR - 5 * dpr

    const rect: [number,number,number,number] = [
      labelX - textW/2 - 3*dpr, labelY - FONT_SIZE - 2*dpr,
      textW + 6*dpr, FONT_SIZE + 4*dpr,
    ]
    if (placed.some(([px,py,pw,ph]) =>
      !(rect[0] > px+pw || rect[0]+rect[2] < px || rect[1] > py+ph || rect[1]+rect[3] < py)
    )) continue
    placed.push(rect)

    ctx.save()
    ctx.font = `500 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'alphabetic'

    // Use the current lens colour for this node
    const fs = nodeStyles.get(node.id)
    if (fs) {
      ctx.fillStyle = `rgba(${Math.round(fs.fr)},${Math.round(fs.fg)},${Math.round(fs.fb)},${alpha})`
    } else {
      ctx.fillStyle = `rgba(134, 239, 172, ${alpha})`
    }

    ctx.fillText(node.term, labelX, labelY)
    ctx.restore()
  }
}

// ── Future You watermark ──────────────────────────────────────────────────────

function drawFutureWatermark(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  dpr: number,
) {
  ctx.save()
  ctx.font = `600 ${11 * dpr}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillStyle = 'rgba(251, 191, 36, 0.28)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('SIMULATION', canvasW - 12 * dpr, 12 * dpr)
  ctx.restore()
}

// ── Tooltip draw ──────────────────────────────────────────────────────────────

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  node: AtlasNode,
  camera: Camera,
  dpr: number,
  canvasW: number,
  _canvasH: number,
  now: number,
) {
  const { sx, sy } = nodeScreenPos(node, camera, dpr, now)

  const PAD_X = 12 * dpr, PAD_Y = 8 * dpr, FONT_SIZE = 13 * dpr
  ctx.font = `600 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`
  const textW = ctx.measureText(node.term).width
  const boxW  = textW + PAD_X * 2, boxH = FONT_SIZE + PAD_Y * 2
  const nodeR = node.style.radius * camera.scale * dpr
  let bx = Math.max(4*dpr, Math.min(canvasW - boxW - 4*dpr, sx - boxW/2))
  let by = sy - nodeR - boxH - 8 * dpr
  by = Math.max(4 * dpr, by)
  if (by < 0) by = sy + nodeR + 8 * dpr

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur  = 10 * dpr
  ctx.fillStyle   = 'rgba(15, 23, 42, 0.92)'
  ctx.beginPath()
  ctx.roundRect(bx, by, boxW, boxH, 6 * dpr)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.font = `600 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillStyle = '#f8fafc'
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.fillText(node.term, bx + PAD_X, by + boxH / 2)
  ctx.restore()
}

// ── AtlasCanvas component ─────────────────────────────────────────────────────

interface AtlasCanvasProps {
  layout: AtlasLayout
  lens: AtlasLens
  isFutureMode: boolean
  onNodeClick: (node: AtlasNode, screenX: number, screenY: number) => void
}

export function AtlasCanvas({ layout, lens, isFutureMode, onNodeClick }: AtlasCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const bgRef      = useRef<HTMLCanvasElement | null>(null)

  const cameraRef  = useRef<Camera>({
    x: CANVAS_W / 2 - 550 / INITIAL_SCALE,
    y: CANVAS_H / 2 - 300 / INITIAL_SCALE,
    scale: INITIAL_SCALE,
  })
  const cameraInitialized = useRef(false)
  const gridRef    = useRef<SpatialGrid | null>(null)
  const rafRef     = useRef<number>(0)
  const dragRef    = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null)
  const pinchRef   = useRef<{ dist: number; scale: number } | null>(null)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  // Refs for props that the render loop reads without restarting
  const lensRef        = useRef<AtlasLens>(lens)
  const isFutureModeRef = useRef(isFutureMode)
  const onNodeClickRef  = useRef(onNodeClick)
  useEffect(() => { lensRef.current = lens },           [lens])
  useEffect(() => { isFutureModeRef.current = isFutureMode }, [isFutureMode])
  useEffect(() => { onNodeClickRef.current = onNodeClick },   [onNodeClick])

  // Per-node interpolated styles — persist across frames, updated by lerp each frame
  const nodeStylesRef = useRef<Map<string, FrameStyle>>(new Map())

  // Detect prefers-reduced-motion once at mount
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  // Track last frame timestamp for dt-based lerp
  const lastFrameMsRef = useRef<number>(0)

  const [hoveredNode, setHoveredNode] = useState<AtlasNode | null>(null)
  const hoveredRef = useRef<AtlasNode | null>(null)
  useEffect(() => { hoveredRef.current = hoveredNode }, [hoveredNode])

  // ── Spatial grid ────────────────────────────────────────────────────────────
  useEffect(() => {
    gridRef.current = new SpatialGrid(layout.nodes)
  }, [layout])

  // ── Render loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animRunning = true

    function frame(now: number) {
      if (!animRunning || !canvas) return
      const dpr = window.devicePixelRatio || 1
      const cw  = canvas.width, ch = canvas.height
      const cam = cameraRef.current
      const currentLens = lensRef.current
      const futureModeOn = isFutureModeRef.current

      // ── 1. Update node styles (lens transition) ──────────────────────────
      const dt = lastFrameMsRef.current === 0 ? 16 : Math.min(50, now - lastFrameMsRef.current)
      lastFrameMsRef.current = now
      const α = prefersReducedMotion.current ? 1.0 : Math.min(1.0, dt * LENS_LERP_SPEED)

      for (const node of layout.nodes) {
        const target  = getLensStyle(node, currentLens, now)
        const current = nodeStylesRef.current.get(node.id)
        nodeStylesRef.current.set(node.id, current && α < 1.0 ? lerpFS(current, target, α) : target)
      }
      const styles = nodeStylesRef.current

      // ── 2. Draw ──────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, cw, ch)

      if (bgRef.current) {
        ctx.drawImage(bgRef.current, 0, 0)
      } else {
        ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, cw, ch)
      }

      drawRegions(ctx, layout, cam, dpr)
      drawLandmarks(ctx, layout, cam, dpr, now, currentLens)
      drawNodes(ctx, layout, cam, dpr, now, cw, ch, hoveredRef.current?.id ?? null, styles)
      drawLabels(ctx, layout, cam, dpr, now, cw, ch, styles)

      if (futureModeOn) drawFutureWatermark(ctx, cw, dpr)
      if (hoveredRef.current) drawTooltip(ctx, hoveredRef.current, cam, dpr, cw, ch, now)

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { animRunning = false; cancelAnimationFrame(rafRef.current) }
  }, [layout])

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function sizeCanvas() {
      const c   = canvas!  // eslint-disable-line @typescript-eslint/no-non-null-assertion
      const dpr = window.devicePixelRatio || 1
      c.width  = c.offsetWidth  * dpr
      c.height = c.offsetHeight * dpr
      bgRef.current = buildBackground(c.width, c.height)
      if (!cameraInitialized.current) {
        const cam = cameraRef.current
        cam.x = CANVAS_W / 2 - c.offsetWidth  / (2 * cam.scale)
        cam.y = CANVAS_H / 2 - c.offsetHeight / (2 * cam.scale)
        cameraInitialized.current = true
      }
    }

    const obs = new ResizeObserver(sizeCanvas)
    obs.observe(canvas)
    sizeCanvas()
    return () => obs.disconnect()
  }, [])

  // ── Wheel zoom (non-passive) ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const cam   = cameraRef.current
      const delta = e.deltaY > 0 ? 0.92 : 1 / 0.92
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * delta))
      const c = canvasRef.current; if (!c) return
      const rect = c.getBoundingClientRect()
      const dpr  = window.devicePixelRatio || 1
      const sx   = (e.clientX - rect.left) * dpr
      const sy   = (e.clientY - rect.top)  * dpr
      const wx   = sx / (cam.scale * dpr) + cam.x
      const wy   = sy / (cam.scale * dpr) + cam.y
      cam.x = wx - (wx - cam.x) * (cam.scale / newScale)
      cam.y = wy - (wy - cam.y) * (cam.scale / newScale)
      cam.scale = newScale
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── World coordinate helper ──────────────────────────────────────────────────
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { wx: 0, wy: 0 }
    const rect = canvas.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    const cam  = cameraRef.current
    return {
      wx: (clientX - rect.left) * dpr / (cam.scale * dpr) + cam.x,
      wy: (clientY - rect.top)  * dpr / (cam.scale * dpr) + cam.y,
    }
  }, [])

  // ── Mouse events ──────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const cam = cameraRef.current
      cam.x = dragRef.current.camX - dx / cam.scale
      cam.y = dragRef.current.camY - dy / cam.scale
      return
    }
    const { wx, wy } = screenToWorld(e.clientX, e.clientY)
    const node = gridRef.current?.nearest(wx, wy, HOVER_HIT_WORLD) ?? null
    if (node?.id !== hoveredRef.current?.id) setHoveredNode(node)
  }, [screenToWorld])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      camX: cameraRef.current.x, camY: cameraRef.current.y,
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const down = pointerDownPos.current
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y
      if (Math.sqrt(dx*dx + dy*dy) < CLICK_MAX_DRAG) {
        // Click: find nearest node and invoke callback
        const { wx, wy } = screenToWorld(e.clientX, e.clientY)
        const node = gridRef.current?.nearest(wx, wy, CLICK_HIT_WORLD) ?? null
        if (node) onNodeClickRef.current(node, e.clientX, e.clientY)
      }
    }
    pointerDownPos.current = null
    dragRef.current = null
  }, [screenToWorld])

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    pointerDownPos.current = null
    setHoveredNode(null)
  }, [])

  // ── Touch events ──────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        camX: cameraRef.current.x, camY: cameraRef.current.y,
      }
      pinchRef.current = null
    } else if (e.touches.length === 2) {
      dragRef.current = null
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchRef.current = { dist: Math.hypot(dx, dy), scale: cameraRef.current.scale }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1 && dragRef.current) {
      const dx = e.touches[0].clientX - dragRef.current.startX
      const dy = e.touches[0].clientY - dragRef.current.startY
      const cam = cameraRef.current
      cam.x = dragRef.current.camX - dx / cam.scale
      cam.y = dragRef.current.camY - dy / cam.scale
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dx   = e.touches[1].clientX - e.touches[0].clientX
      const dy   = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.hypot(dx, dy)
      const cam  = cameraRef.current
      cam.scale  = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
        pinchRef.current.scale * (dist / pinchRef.current.dist)))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    dragRef.current = null
    pinchRef.current = null
  }, [])

  // ── Suppress unused-variable warning for TRANSITION_DURATION ─────────────────
  void TRANSITION_DURATION

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Language Atlas — interactive vocabulary map"
      role="img"
    />
  )
}
