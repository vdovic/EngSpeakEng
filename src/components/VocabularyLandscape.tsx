/**
 * VocabularyLandscape.tsx
 *
 * Canvas 2D strip scatter — one dot per word, 1 000+ rendered efficiently.
 *
 * Layout
 * ──────
 *   Y-axis : fixed stage bands (New / Introduced / Drilling / Activate / Mastered)
 *            Only bands that contain at least one word are shown.
 *   X-axis : user-selectable dimension
 *              • Exposure   — 0–8 challenge steps
 *              • Age        — days since added to library
 *              • Recency    — days since last practice (never → right edge)
 *   Color  : user-selectable lens
 *              • Stage      — the five learning stages
 *              • Confidence — self-reported comfort (grey if unrated)
 *              • Vitality   — how recently the word was practised
 *
 * Interaction
 * ───────────
 *   Hover  → floating word tooltip (word name + stage + exposure)
 *   Click  → navigate to /library/:id
 *
 * Performance notes
 * ─────────────────
 *   • All dots drawn via ctx.arc — no per-element DOM nodes.
 *   • O(n) nearest-neighbour search on mousemove is < 1 ms for 1 500 items.
 *   • Dot positions memoised; color-only changes avoid re-computing positions.
 *   • canvas.style is NEVER touched imperatively — CSS handles display size.
 *     Only canvas.width/height attributes are set (internal resolution).
 *   • hoveredId stored in a ref, not state — hover changes do NOT trigger
 *     React re-renders. drawCanvas is called via requestAnimationFrame instead.
 *   • ResizeObserver debounced with rAF; stable because CSS controls display size.
 */

import {
  useRef, useEffect, useMemo, useState, useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { getDisplayStage } from '@/lib/progressionLogic'
import type { DisplayStage } from '@/lib/progressionLogic'
import type { VocabItem } from '@/types/vocabulary'

// ── Public type ───────────────────────────────────────────────────────────────

export interface VocabularyLandscapeProps {
  items: VocabItem[]
}

// ── Dimension types ───────────────────────────────────────────────────────────

type XDim    = 'exposure' | 'age' | 'recency'
type ColorDim = 'stage' | 'confidence' | 'vitality'

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_ORDER: DisplayStage[] = [
  'new', 'introduced', 'drilling', 'activate', 'mastered',
]

const STAGE_LABEL: Record<DisplayStage, string> = {
  new:        'New',
  introduced: 'Introduced',
  drilling:   'Drilling',
  activate:   'Activate',
  mastered:   'Mastered',
}

const STAGE_HEX: Record<DisplayStage, string> = {
  new:        '#94a3b8',
  introduced: '#38bdf8',
  drilling:   '#fbbf24',
  activate:   '#a78bfa',
  mastered:   '#10b981',
}

// ── Layout constants ──────────────────────────────────────────────────────────

const DOT_R     = 2.5
const LABEL_W   = 74    // left column for stage labels
const PAD_R     = 8     // right padding
const PAD_T     = 6     // top padding
const PAD_B     = 22    // bottom: x-axis tick labels
const BAND_PAD  = 0.15  // fraction of band height reserved top + bottom
const CANVAS_H  = 296   // fixed canvas height (CSS px)

// ── Colour helpers ────────────────────────────────────────────────────────────

function confidenceHex(level: number | undefined): string {
  if (level === 3) return '#10b981'
  if (level === 2) return '#fbbf24'
  if (level === 1) return '#f87171'
  return '#64748b'
}

function vitalityHex(lastMs: number | null): string {
  if (lastMs === null) return '#334155'
  const d = (Date.now() - lastMs) / 86_400_000
  if (d <= 7)  return '#f97316'
  if (d <= 30) return '#fbbf24'
  if (d <= 90) return '#60a5fa'
  return '#475569'
}

// ── Deterministic jitter ──────────────────────────────────────────────────────

/** Returns a stable float in [0, 1) seeded from id + salt, so dot positions
 *  never jump on re-render. */
function seededRand(id: string, salt: number): number {
  let h = salt | 0
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) ^ id.charCodeAt(i)
  }
  return (h >>> 0) / 0xFFFFFFFF
}

// ── Per-dot data ──────────────────────────────────────────────────────────────

interface DotDatum {
  baseXFrac : number   // normalised [0, 1] before mapping to canvas
  yFrac     : number   // normalised [0, 1] within its band inner area
  item      : VocabItem
  stage     : DisplayStage
}

// ── Compute normalised x for chosen dimension ─────────────────────────────────

function computeXFrac(item: VocabItem, xDim: XDim, maxAgeDays: number): number {
  if (xDim === 'exposure') {
    return (item.exposureCount ?? 0) / 8
  }
  if (xDim === 'age') {
    const days = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / 86_400_000)
    return maxAgeDays > 0 ? Math.min(1, days / maxAgeDays) : 0
  }
  // recency: 0 = active today, 1 = never / ≥ 90 days
  const lastLog = item.activation?.usageLogs?.at(-1)?.usedAt
  if (!lastLog) return 1
  const days = Math.max(0, (Date.now() - new Date(lastLog).getTime()) / 86_400_000)
  return Math.min(1, days / 90)
}

// ── X-axis tick definitions ───────────────────────────────────────────────────

function buildXTicks(
  xDim: XDim,
  maxAgeDays: number,
): Array<{ frac: number; label: string }> {
  if (xDim === 'exposure') {
    return [0, 2, 4, 6, 8].map(v => ({ frac: v / 8, label: String(v) }))
  }
  if (xDim === 'age') {
    const step = maxAgeDays <= 30 ? 7 : maxAgeDays <= 90 ? 30 : 90
    const ticks: Array<{ frac: number; label: string }> = []
    for (let d = 0; d <= maxAgeDays; d += step) {
      ticks.push({ frac: d / maxAgeDays, label: d === 0 ? 'today' : `${d}d` })
    }
    if (ticks[ticks.length - 1].frac < 1) {
      ticks.push({ frac: 1, label: `${maxAgeDays}d` })
    }
    return ticks
  }
  return [
    { frac: 0,     label: 'today' },
    { frac: 7/90,  label: '7d'    },
    { frac: 30/90, label: '30d'   },
    { frac: 1,     label: 'never' },
  ]
}

// ── Colour legend definitions ─────────────────────────────────────────────────

function buildColorLegend(
  colorDim: ColorDim,
  activeBands: DisplayStage[],
): Array<{ hex: string; label: string }> {
  if (colorDim === 'stage') {
    return activeBands.map(s => ({ hex: STAGE_HEX[s], label: STAGE_LABEL[s] }))
  }
  if (colorDim === 'confidence') {
    return [
      { hex: '#10b981', label: 'Comfortable'  },
      { hex: '#fbbf24', label: 'Getting there' },
      { hex: '#f87171', label: 'Not yet'       },
      { hex: '#64748b', label: 'Unrated'       },
    ]
  }
  return [
    { hex: '#f97316', label: 'This week'  },
    { hex: '#fbbf24', label: 'This month' },
    { hex: '#60a5fa', label: '1–3 months' },
    { hex: '#475569', label: 'Dormant'    },
    { hex: '#334155', label: 'Never'      },
  ]
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────

function drawCanvas(
  ctx           : CanvasRenderingContext2D,
  canvasW       : number,
  dots          : DotDatum[],
  activeBands   : DisplayStage[],
  xDim          : XDim,
  colorDim      : ColorDim,
  maxAgeDays    : number,
  hoveredId     : string | null,
) {
  const plotW = canvasW - LABEL_W - PAD_R
  const plotH = CANVAS_H - PAD_T - PAD_B
  const bandH = plotH / Math.max(activeBands.length, 1)

  ctx.clearRect(0, 0, canvasW, CANVAS_H)

  // ── Band backgrounds + stage labels ──────────────────────────────────────
  ctx.font = '10.5px system-ui,-apple-system,sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'right'

  activeBands.forEach((stage, i) => {
    const bandY = PAD_T + i * bandH
    ctx.fillStyle = i % 2 === 0 ? 'rgba(241,245,249,0.75)' : 'rgba(248,250,252,0.4)'
    ctx.fillRect(LABEL_W, bandY, plotW, bandH)

    ctx.fillStyle = '#94a3b8'
    ctx.fillText(STAGE_LABEL[stage], LABEL_W - 6, bandY + bandH / 2)
  })

  // ── X-axis ticks ──────────────────────────────────────────────────────────
  const ticks = buildXTicks(xDim, maxAgeDays)
  ctx.strokeStyle = 'rgba(203,213,225,0.45)'
  ctx.lineWidth   = 1
  ctx.font        = '9px system-ui,-apple-system,sans-serif'
  ctx.textAlign   = 'center'
  ctx.textBaseline = 'top'

  for (const { frac, label } of ticks) {
    const x = LABEL_W + frac * plotW
    ctx.beginPath()
    ctx.moveTo(x, PAD_T)
    ctx.lineTo(x, PAD_T + plotH)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(label, x, PAD_T + plotH + 4)
  }

  // ── Dots ──────────────────────────────────────────────────────────────────
  for (const dot of dots) {
    const bandIdx = activeBands.indexOf(dot.stage)
    if (bandIdx < 0) continue
    const bandTopY  = PAD_T + bandIdx * bandH
    const innerTopY = bandTopY + bandH * BAND_PAD
    const innerH    = bandH * (1 - 2 * BAND_PAD)
    const cx = LABEL_W + dot.baseXFrac * plotW
    const cy = innerTopY + dot.yFrac * innerH

    let hex: string
    if (colorDim === 'stage') {
      hex = STAGE_HEX[dot.stage]
    } else if (colorDim === 'confidence') {
      hex = confidenceHex(dot.item.activation?.confidenceLevel)
    } else {
      const lastLog = dot.item.activation?.usageLogs?.at(-1)?.usedAt
      hex = vitalityHex(lastLog ? new Date(lastLog).getTime() : null)
    }

    const isHovered = hoveredId === dot.item.id
    const alpha     = isHovered ? 1 : 0.68
    const r         = isHovered ? DOT_R * 1.8 : DOT_R

    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
    ctx.fill()

    if (isHovered) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2)
      ctx.strokeStyle = hex + 'cc'
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function VocabularyLandscape({ items }: VocabularyLandscapeProps) {
  const navigate  = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  const [xDim,     setXDim]     = useState<XDim>('exposure')
  const [colorDim, setColorDim] = useState<ColorDim>('stage')
  const [canvasW,  setCanvasW]  = useState(480)

  // Hover state stored in refs — hover changes never trigger React re-renders.
  // drawHover() is called via rAF directly from mousemove.
  const hoveredIdRef = useRef<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; item: VocabItem; stage: DisplayStage
  } | null>(null)

  // ── Responsive width ────────────────────────────────────────────────────────
  // We only adjust the canvas internal resolution; CSS controls display size.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let rafId = 0
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width)
      if (w > 0) setCanvasW(w)
    }
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(measure)
    })
    obs.observe(el)
    measure()  // initial measurement
    return () => { obs.disconnect(); cancelAnimationFrame(rafId) }
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeBands = useMemo((): DisplayStage[] => {
    const present = new Set(items.map(it => getDisplayStage(it)))
    return STAGE_ORDER.filter(s => present.has(s))
  }, [items])

  const maxAgeDays = useMemo(() => {
    let max = 0
    for (const it of items) {
      const d = (Date.now() - new Date(it.createdAt).getTime()) / 86_400_000
      if (d > max) max = d
    }
    return Math.max(Math.ceil(max), 7)
  }, [items])

  // Dot positions — stable per items + xDim + maxAgeDays
  const dots = useMemo((): DotDatum[] => {
    return items.map(item => {
      const stage = getDisplayStage(item)
      const xFrac = computeXFrac(item, xDim, maxAgeDays)
      const jx    = seededRand(item.id, 7) * 0.01 - 0.005  // ±0.5% jitter
      const yFrac = seededRand(item.id, 3)
      return {
        baseXFrac: Math.max(0, Math.min(1, xFrac + jx)),
        yFrac,
        item,
        stage,
      }
    })
  }, [items, xDim, maxAgeDays])

  // ── Canvas internal resolution setup ───────────────────────────────────────
  // Only sets canvas.width / canvas.height (internal buffer size).
  // canvas.style.width/height is NEVER set here — JSX controls display size.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width  = canvasW * dpr
    canvas.height = CANVAS_H * dpr
  }, [canvasW])

  // ── Full canvas repaint — triggered by data/dimension changes ──────────────
  // Does NOT depend on hoveredId — hover uses a separate lightweight redraw.
  const scheduleRedraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)
    drawCanvas(ctx, canvasW, dots, activeBands, xDim, colorDim, maxAgeDays, hoveredIdRef.current)
    ctx.restore()
  }, [canvasW, dots, activeBands, xDim, colorDim, maxAgeDays])

  useEffect(() => {
    scheduleRedraw()
  }, [scheduleRedraw])

  // ── Hit detection ──────────────────────────────────────────────────────────
  const findNearestDot = useCallback((mx: number, my: number): DotDatum | null => {
    const plotW = canvasW - LABEL_W - PAD_R
    const plotH = CANVAS_H - PAD_T - PAD_B
    const bandH = plotH / Math.max(activeBands.length, 1)

    let best: DotDatum | null = null
    let bestD2 = 10 * 10   // 10 px threshold

    for (const dot of dots) {
      const bandIdx = activeBands.indexOf(dot.stage)
      if (bandIdx < 0) continue
      const bandTopY  = PAD_T + bandIdx * bandH
      const innerTopY = bandTopY + bandH * BAND_PAD
      const innerH    = bandH * (1 - 2 * BAND_PAD)
      const cx = LABEL_W + dot.baseXFrac * plotW
      const cy = innerTopY + dot.yFrac * innerH
      const dx = cx - mx, dy = cy - my
      const d2 = dx * dx + dy * dy
      if (d2 < bestD2) { bestD2 = d2; best = dot }
    }
    return best
  }, [canvasW, activeBands, dots])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const hit = findNearestDot(mx, my)
    const newId = hit ? hit.item.id : null

    if (newId !== hoveredIdRef.current) {
      hoveredIdRef.current = newId
      // Redraw canvas without triggering React re-render
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const dpr = window.devicePixelRatio || 1
          ctx.save()
          ctx.scale(dpr, dpr)
          drawCanvas(ctx, canvasW, dots, activeBands, xDim, colorDim, maxAgeDays, newId)
          ctx.restore()
        }
      }
    }

    if (hit) {
      setTooltip({ x: mx, y: my, item: hit.item, stage: hit.stage })
    } else {
      setTooltip(null)
    }
  }, [findNearestDot, canvasW, dots, activeBands, xDim, colorDim, maxAgeDays])

  const handleMouseLeave = useCallback(() => {
    if (hoveredIdRef.current !== null) {
      hoveredIdRef.current = null
      scheduleRedraw()
    }
    setTooltip(null)
  }, [scheduleRedraw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const hit  = findNearestDot(e.clientX - rect.left, e.clientY - rect.top)
    if (hit) navigate(`/item/${hit.item.id}`)
  }, [findNearestDot, navigate])

  // ── Legend + axis label ────────────────────────────────────────────────────
  const colorLegend = useMemo(
    () => buildColorLegend(colorDim, activeBands),
    [colorDim, activeBands],
  )

  const xAxisLabel =
    xDim === 'exposure' ? '← less practised · challenge exposure (0 – 8 steps) · more practised →'
    : xDim === 'age'    ? '← recently added · days in your library · older →'
    :                     '← active recently · days since last practice · dormant / never →'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Controls ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* X-axis selector */}
        <div
          className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-full"
          role="group"
          aria-label="X axis dimension"
        >
          {(
            [
              ['exposure', 'Exposure'],
              ['age',      'Age'],
              ['recency',  'Recency'],
            ] as [XDim, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setXDim(id)}
              aria-pressed={xDim === id}
              className={[
                'px-3 py-1 rounded-full text-[11px] font-semibold transition-all',
                xDim === id
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Color selector */}
        <div
          className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-full"
          role="group"
          aria-label="Colour dimension"
        >
          {(
            [
              ['stage',      'Stage'],
              ['confidence', 'Confidence'],
              ['vitality',   'Vitality'],
            ] as [ColorDim, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setColorDim(id)}
              aria-pressed={colorDim === id}
              className={[
                'px-3 py-1 rounded-full text-[11px] font-semibold transition-all',
                colorDim === id
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Word count */}
        <span className="ml-auto text-[10px] text-slate-400">
          {items.length.toLocaleString()} words
        </span>
      </div>

      {/* Canvas wrapper ───────────────────────────────────────────────────── */}
      <div
        ref={wrapRef}
        className="relative rounded-xl overflow-hidden border border-slate-100 bg-white"
      >
        {/* CSS controls all display sizing; JS only sets internal buffer resolution */}
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair"
          style={{ width: '100%', height: CANVAS_H }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          aria-label={`Vocabulary landscape — ${items.length} words shown as dots`}
          role="img"
        />

        {/* Tooltip ──────────────────────────────────────────────────────────── */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg bg-white border border-slate-200 shadow-lg px-2.5 py-2 text-left"
            style={
              tooltip.x > canvasW * 0.65
                ? { right: canvasW - tooltip.x + 14, top: Math.max(4, tooltip.y - 30) }
                : { left: tooltip.x + 14,            top: Math.max(4, tooltip.y - 30) }
            }
          >
            <p className="text-[12px] font-semibold text-slate-800 leading-tight">
              {tooltip.item.term}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 space-x-2">
              <span>{STAGE_LABEL[tooltip.stage]}</span>
              <span>·</span>
              <span>{tooltip.item.exposureCount ?? 0}/8 exp</span>
              {(tooltip.item.activation?.confidenceLevel ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span>
                    conf&nbsp;{tooltip.item.activation!.confidenceLevel}/3
                  </span>
                </>
              )}
            </p>
            <p className="text-[9px] text-indigo-400 mt-1">click to open →</p>
          </div>
        )}
      </div>

      {/* X-axis label ─────────────────────────────────────────────────────── */}
      <p className="mt-1.5 text-[10px] text-slate-400 text-center leading-tight">
        {xAxisLabel}
      </p>

      {/* Colour legend ───────────────────────────────────────────────────── */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {colorLegend.map(({ hex, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: hex }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
