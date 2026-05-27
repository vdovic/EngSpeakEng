/**
 * AtlasCanvas.tsx
 *
 * Canvas 2D renderer for the Language Atlas.
 *
 * ── Rendering pipeline (each animation frame) ──────────────────────────────
 *
 *   1. Clear to transparent (background drawn on a separate offscreen canvas,
 *      painted once via drawImage each frame — avoids re-generating gradients).
 *   2. Draw region halos in world-space (inside setTransform).
 *   3. Draw nodes in screen-space (after ctx.restore()) for predictable shadowBlur.
 *   4. Draw hovered tooltip in screen-space.
 *
 * ── Coordinate system ───────────────────────────────────────────────────────
 *
 *   camera = { x, y, scale }   (stored in useRef for zero-react-render updates)
 *   world→screen: screenX = (worldX - camera.x) * scale
 *   screen→world: worldX  = screenX / scale + camera.x
 *
 * ── Interactions ────────────────────────────────────────────────────────────
 *
 *   Mouse drag / touch pan: updates camera.x / camera.y
 *   Wheel / pinch: updates camera.scale (clamped 0.25–4)
 *   Hover: nearest node within 24 world units; shows tooltip
 *   No click actions — Atlas is read-only / exploration only
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { AtlasLayout, AtlasNode } from '@/lib/atlasLayout'
import { CANVAS_W, CANVAS_H } from '@/lib/atlasLayout'
import { SpatialGrid } from '@/lib/atlasQuadtree'

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2
const MAX_SCALE = 4.0
const INITIAL_SCALE = 0.72
const HOVER_HIT_WORLD = 28      // world-unit radius for hover detection
const DRIFT_AMPLITUDE = 2.0     // px max drift per node
const DRIFT_SPEED = 0.0004      // radians per ms
const REGION_HALO_ALPHA = 0.07  // very subtle halo fill
const BG_COLOR = '#08111f'

// ── Camera ────────────────────────────────────────────────────────────────────

interface Camera {
  x: number
  y: number
  scale: number
}

// ── Background offscreen canvas ───────────────────────────────────────────────

function buildBackground(w: number, h: number): HTMLCanvasElement {
  const bg = document.createElement('canvas')
  bg.width  = w
  bg.height = h
  const ctx = bg.getContext('2d')!

  // Base fill
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, w, h)

  // Subtle radial brightening toward centre
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.65)
  grd.addColorStop(0,   'rgba(20, 40, 80, 0.35)')
  grd.addColorStop(0.5, 'rgba(10, 20, 50, 0.15)')
  grd.addColorStop(1,   'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)

  // Grain dots (deterministic pseudo-random via LCG)
  let seed = 0xdeadbeef
  function lcg() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000 }
  ctx.fillStyle = 'rgba(200, 210, 255, 0.03)'
  for (let i = 0; i < 1800; i++) {
    const gx = lcg() * w
    const gy = lcg() * h
    const gr = lcg() * 1.2
    ctx.beginPath()
    ctx.arc(gx, gy, gr, 0, Math.PI * 2)
    ctx.fill()
  }

  return bg
}

// ── Region halo draw ──────────────────────────────────────────────────────────

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

    // Region label — drawn in world space for consistent scale with zoom
    ctx.save()
    const labelSize = Math.max(11, Math.min(16, region.rx * 0.07))
    ctx.font = `${labelSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = 'rgba(148, 163, 220, 0.45)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(region.theme.toUpperCase(), region.cx, region.cy - region.ry * 0.72)
    ctx.restore()
  }

  ctx.restore()
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
) {
  const scale = camera.scale * dpr

  for (const node of layout.nodes) {
    // Ambient drift — ±DRIFT_AMPLITUDE px in screen space
    const driftX = Math.sin(now * DRIFT_SPEED + node.driftPhase) * DRIFT_AMPLITUDE
    const driftY = Math.cos(now * DRIFT_SPEED + node.driftAxisPhase) * DRIFT_AMPLITUDE

    // World → screen
    const sx = (node.x - camera.x) * scale + driftX * dpr
    const sy = (node.y - camera.y) * scale + driftY * dpr

    // Viewport cull — skip nodes outside canvas (+ margin)
    const margin = 60 * dpr
    if (sx < -margin || sx > canvasW + margin || sy < -margin || sy > canvasH + margin) continue

    const r  = node.style.radius * camera.scale * dpr
    const isHovered = node.id === hoveredId

    ctx.save()

    // Glow
    if (node.style.glowBlur > 0 || isHovered) {
      ctx.shadowColor  = isHovered ? 'rgba(255,255,255,0.9)' : node.style.glowColor
      ctx.shadowBlur   = (isHovered ? node.style.glowBlur * 2.5 : node.style.glowBlur) * dpr
    }

    // Fill
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = isHovered ? '#ffffff' : node.style.color
    ctx.fill()

    ctx.restore()
  }
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
  const driftX = Math.sin(now * DRIFT_SPEED + node.driftPhase) * DRIFT_AMPLITUDE
  const driftY = Math.cos(now * DRIFT_SPEED + node.driftAxisPhase) * DRIFT_AMPLITUDE
  const scale  = camera.scale * dpr

  let sx = (node.x - camera.x) * scale + driftX * dpr
  let sy = (node.y - camera.y) * scale + driftY * dpr

  const PAD_X = 12 * dpr
  const PAD_Y =  8 * dpr
  const FONT_SIZE = 13 * dpr
  ctx.font = `600 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, sans-serif`
  const textW = ctx.measureText(node.term).width
  const boxW  = textW + PAD_X * 2
  const boxH  = FONT_SIZE + PAD_Y * 2

  // Tooltip above the node; shift if it would clip the top
  const nodeR  = node.style.radius * camera.scale * dpr
  let bx = sx - boxW / 2
  let by = sy - nodeR - boxH - 8 * dpr

  // Clamp to canvas
  bx = Math.max(4 * dpr, Math.min(canvasW - boxW - 4 * dpr, bx))
  by = Math.max(4 * dpr, by)
  if (by < 0) by = sy + nodeR + 8 * dpr   // flip below if still off-screen

  // Background pill
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur  = 10 * dpr
  ctx.fillStyle   = 'rgba(15, 23, 42, 0.92)'
  const r = 6 * dpr
  ctx.beginPath()
  ctx.roundRect(bx, by, boxW, boxH, r)
  ctx.fill()
  ctx.restore()

  // Term text
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
}

export function AtlasCanvas({ layout }: AtlasCanvasProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const bgRef       = useRef<HTMLCanvasElement | null>(null)
  // Camera starts at a reasonable approximation of "world-center on screen-center".
  // ResizeObserver corrects it precisely on first render.
  // camera.x/y = world coords of the screen's top-left corner.
  const cameraRef   = useRef<Camera>({
    x: CANVAS_W / 2 - 550 / INITIAL_SCALE,   // 550 ≈ half typical canvas width
    y: CANVAS_H / 2 - 300 / INITIAL_SCALE,   // 300 ≈ half typical canvas height
    scale: INITIAL_SCALE,
  })
  const cameraInitialized = useRef(false)
  const gridRef     = useRef<SpatialGrid | null>(null)
  const rafRef      = useRef<number>(0)
  const dragRef     = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null)
  const pinchRef    = useRef<{ dist: number; scale: number } | null>(null)

  const [hoveredNode, setHoveredNode] = useState<AtlasNode | null>(null)
  const hoveredRef = useRef<AtlasNode | null>(null)

  // Sync ref ↔ state so the render loop doesn't need react state
  useEffect(() => { hoveredRef.current = hoveredNode }, [hoveredNode])

  // ── Build spatial grid when layout changes ──────────────────────────────────
  useEffect(() => {
    gridRef.current = new SpatialGrid(layout.nodes)
  }, [layout])

  // ── Build background once (or on canvas size change) ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    bgRef.current = buildBackground(canvas.offsetWidth * dpr, canvas.offsetHeight * dpr)
  }, [])

  // ── Render loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animRunning = true

    function frame(now: number) {
      if (!animRunning || !canvas) return
      const dpr   = window.devicePixelRatio || 1
      const cw    = canvas.width
      const ch    = canvas.height
      const cam   = cameraRef.current

      ctx.clearRect(0, 0, cw, ch)

      // Background
      if (bgRef.current) {
        ctx.drawImage(bgRef.current, 0, 0)
      } else {
        ctx.fillStyle = BG_COLOR
        ctx.fillRect(0, 0, cw, ch)
      }

      drawRegions(ctx, layout, cam, dpr)
      drawNodes(ctx, layout, cam, dpr, now, cw, ch, hoveredRef.current?.id ?? null)

      if (hoveredRef.current) {
        drawTooltip(ctx, hoveredRef.current, cam, dpr, cw, ch, now)
      }

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
      const c   = canvas!                       // eslint-disable-line @typescript-eslint/no-non-null-assertion
      const dpr = window.devicePixelRatio || 1
      c.width  = c.offsetWidth  * dpr
      c.height = c.offsetHeight * dpr
      bgRef.current = buildBackground(c.width, c.height)

      // On first size: centre camera on world-centre
      if (!cameraInitialized.current) {
        const cam = cameraRef.current
        cam.x = CANVAS_W / 2 - c.offsetWidth  / (2 * cam.scale)
        cam.y = CANVAS_H / 2 - c.offsetHeight / (2 * cam.scale)
        cameraInitialized.current = true
      }
    }

    const obs = new ResizeObserver(sizeCanvas)
    obs.observe(canvas)
    sizeCanvas()  // Initial size + camera init
    return () => obs.disconnect()
  }, [])

  // ── World coordinate from mouse/touch ────────────────────────────────────────
  const screenToWorld = useCallback((clientX: number, clientY: number): { wx: number; wy: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { wx: 0, wy: 0 }
    const rect  = canvas.getBoundingClientRect()
    const dpr   = window.devicePixelRatio || 1
    const cam   = cameraRef.current
    const sx    = (clientX - rect.left) * dpr
    const sy    = (clientY - rect.top)  * dpr
    return {
      wx: sx / (cam.scale * dpr) + cam.x,
      wy: sy / (cam.scale * dpr) + cam.y,
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
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
    }
  }, [])

  const handleMouseUp = useCallback(() => { dragRef.current = null }, [])

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    setHoveredNode(null)
  }, [])

  // Register wheel as a native non-passive listener so e.preventDefault() works.
  // React's synthetic onWheel is passive in some environments, breaking pinch-zoom prevention.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const cam   = cameraRef.current
      const delta = e.deltaY > 0 ? 0.92 : 1 / 0.92
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * delta))

      // Zoom toward cursor
      const c = canvasRef.current
      if (!c) return
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

  // ── Touch events ──────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
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
      cam.scale  = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.scale * (dist / pinchRef.current.dist)))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    dragRef.current  = null
    pinchRef.current = null
  }, [])

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
