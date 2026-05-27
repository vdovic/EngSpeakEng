/**
 * VocabularyConstellation.tsx — Phase 2 Progress Page
 *
 * The Living Vocabulary Constellation: a dark, atmospheric SVG panel in
 * which each vocabulary item becomes a point of light.  Stage is encoded
 * as luminance — dormant potential → warm, alive, mastered glow.
 *
 * Design intent:
 *   The learner should feel: "This is the language I am gradually bringing
 *   into active life."
 *
 * Technical constraints observed:
 *   • No physics engine, no force simulation, no D3
 *   • No Framer Motion — CSS keyframes only, inside SVG <defs>
 *   • prefers-reduced-motion respected via @media in injected CSS
 *   • Positions are deterministic — stable across every render
 *   • SVG feGaussianBlur only on glow circles (not core dots) to limit cost
 *   • Hit targets are always r=8 regardless of visual size
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { DisplayStage } from '@/lib/progressionLogic'
import type { ConstellationNode } from '@/lib/progressPageLogic'

// ── Visual configuration per stage ────────────────────────────────────────────

interface StageVisual {
  /** Core dot radius in SVG units (viewBox 800×480). */
  coreR: number
  /** Outer glow circle radius. 0 = no glow. */
  glowR: number
  /** Wide ambient halo radius (mastered/activate only). */
  haloR: number
  /** Core dot fill colour. */
  coreColor: string
  /** Glow circle fill colour. */
  glowColor: string
  /** Core dot opacity. */
  coreOpacity: number
  /** Glow circle base opacity (before animation). */
  glowOpacity: number
  /** Halo base opacity. */
  haloOpacity: number
  /** SVG filter id for the glow circle. Empty = no filter. */
  glowFilter: '' | 'csb-glow-sm' | 'csb-glow-md' | 'csb-glow-lg'
  /** Whether this stage's glow breathes (CSS animation). */
  animated: boolean
}

const STAGE_VISUAL: Record<DisplayStage, StageVisual> = {
  new: {
    coreR: 2,     glowR: 0,  haloR: 0,
    coreColor:  '#334155',  glowColor: 'transparent',
    coreOpacity: 0.28,      glowOpacity: 0,     haloOpacity: 0,
    glowFilter:  '',         animated: false,
  },
  introduced: {
    coreR: 2.5,   glowR: 7,  haloR: 0,
    coreColor:  '#7dd3fc',  glowColor: '#38bdf8',
    coreOpacity: 0.65,      glowOpacity: 0.14,  haloOpacity: 0,
    glowFilter:  'csb-glow-sm', animated: false,
  },
  drilling: {
    coreR: 3,     glowR: 9,  haloR: 0,
    coreColor:  '#c4b5fd',  glowColor: '#818cf8',
    coreOpacity: 0.80,      glowOpacity: 0.20,  haloOpacity: 0,
    glowFilter:  'csb-glow-sm', animated: false,
  },
  activate: {
    coreR: 4,     glowR: 13, haloR: 24,
    coreColor:  '#fcd34d',  glowColor: '#f59e0b',
    coreOpacity: 0.95,      glowOpacity: 0.28,  haloOpacity: 0.06,
    glowFilter:  'csb-glow-md', animated: true,
  },
  mastered: {
    coreR: 5,     glowR: 15, haloR: 28,
    coreColor:  '#fef9c3',  glowColor: '#fde68a',
    coreOpacity: 1.0,       glowOpacity: 0.38,  haloOpacity: 0.10,
    glowFilter:  'csb-glow-lg', animated: true,
  },
}

/** Render order: new first (behind everything), mastered last (on top). */
const STAGE_Z: Record<DisplayStage, number> = {
  new: 0, introduced: 1, drilling: 2, activate: 3, mastered: 4,
}

/** Tiny dot color used in the legend footer. */
const STAGE_LEGEND_COLOR: Record<DisplayStage, string> = {
  new:        '#334155',
  introduced: '#7dd3fc',
  drilling:   '#c4b5fd',
  activate:   '#fcd34d',
  mastered:   '#fef9c3',
}

/** Human label shown in tooltip. */
const STAGE_LABEL: Record<DisplayStage, string> = {
  new: 'New', introduced: 'Introduced', drilling: 'Drilling',
  activate: 'Activate', mastered: 'Mastered',
}

const STAGES_ORDERED: DisplayStage[] = ['new', 'introduced', 'drilling', 'activate', 'mastered']

// ── ViewBox ───────────────────────────────────────────────────────────────────

const VB_W = 800
const VB_H = 480

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipData {
  node: ConstellationNode
  clientX: number
  clientY: number
}

function ConstellationTooltip({ node, clientX, clientY }: TooltipData) {
  // Clamp so tooltip never escapes the viewport
  const left = Math.min(clientX + 14, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200)
  const top  = Math.max(clientY - 72, 8)

  return (
    <div
      className="fixed z-50 pointer-events-none select-none"
      style={{ left, top }}
    >
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm">
        {/* Term */}
        <div className="font-medium text-slate-100 text-sm leading-tight mb-1.5">
          {node.term}
        </div>

        {/* Stage indicator */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STAGE_LEGEND_COLOR[node.stage] }}
            aria-hidden="true"
          />
          <span className="text-xs text-slate-400">{STAGE_LABEL[node.stage]}</span>
        </div>

        {/* Theme */}
        {node.primaryTheme && (
          <div className="text-xs text-slate-500 truncate max-w-[160px]">
            {node.primaryTheme}
          </div>
        )}

        {/* Usage count */}
        {node.usageCount > 0 && (
          <div className="text-xs text-slate-500 mt-0.5">
            {node.usageCount} real-life use{node.usageCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Confidence */}
        {node.confidenceLevel > 0 && (
          <div className="text-xs text-slate-500 mt-0.5">
            Confidence: {['', 'recognise', 'prompted', 'natural'][node.confidenceLevel]}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CSS animation injection ────────────────────────────────────────────────────

/**
 * The breathing animation is injected as SVG-embedded CSS so it lives
 * entirely inside the SVG's <defs>, is scoped to the constellation,
 * and properly handles prefers-reduced-motion.
 */
const CONSTELLATION_CSS = `
  @media (prefers-reduced-motion: no-preference) {
    .csb-glow-activate {
      animation: csbBreathActivate 7s ease-in-out infinite;
    }
    .csb-glow-mastered {
      animation: csbBreathMastered 5s ease-in-out infinite;
    }
    .csb-halo-activate {
      animation: csbBreathActivate 7s ease-in-out infinite;
    }
    .csb-halo-mastered {
      animation: csbBreathMastered 5s ease-in-out infinite;
    }
    .csb-fade-in {
      animation: csbFadeIn 1.4s ease-out forwards;
    }
  }
  @keyframes csbBreathActivate {
    0%, 100% { opacity: 0.12; }
    50%       { opacity: 0.36; }
  }
  @keyframes csbBreathMastered {
    0%, 100% { opacity: 0.22; }
    50%       { opacity: 0.58; }
  }
  @keyframes csbFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`

// ── Main component ─────────────────────────────────────────────────────────────

interface VocabularyConstellationProps {
  nodes: ConstellationNode[]
  /** Total library size, for the "showing X of Y" footer when capped. */
  totalItems?: number
}

export function VocabularyConstellation({
  nodes,
  totalItems,
}: VocabularyConstellationProps) {
  const [tooltip, setTooltip]   = useState<TooltipData | null>(null)
  const [mounted, setMounted]   = useState(false)

  // Trigger fade-in after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Dismiss tooltip on scroll or any click outside
  useEffect(() => {
    const dismiss = () => setTooltip(null)
    window.addEventListener('scroll',   dismiss, { passive: true })
    window.addEventListener('touchstart', dismiss, { passive: true })
    return () => {
      window.removeEventListener('scroll',    dismiss)
      window.removeEventListener('touchstart', dismiss)
    }
  }, [])

  const showTooltip = useCallback((node: ConstellationNode, e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const t = e.touches[0] ?? e.changedTouches[0]
      setTooltip({ node, clientX: t.clientX, clientY: t.clientY })
    } else {
      setTooltip({ node, clientX: (e as React.MouseEvent).clientX, clientY: (e as React.MouseEvent).clientY })
    }
  }, [])

  const updateTooltipPos = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip((prev) => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null)
    }
  }, [tooltip])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  // Sort for rendering: new at back, mastered at front
  const sorted = useMemo(
    () => [...nodes].sort((a, b) => STAGE_Z[a.stage] - STAGE_Z[b.stage]),
    [nodes],
  )

  // Compute animation delays — stagger animated nodes so they don't all pulse together
  const animDelayMap = useMemo(() => {
    const map = new Map<string, string>()
    let animIdx = 0
    for (const node of sorted) {
      if (node.stage === 'activate' || node.stage === 'mastered') {
        map.set(node.id, `${((animIdx * 0.71) % 6).toFixed(2)}s`)
        animIdx++
      }
    }
    return map
  }, [sorted])

  // ── Empty state ────────────────────────────────────────────────────────────

  if (nodes.length === 0) {
    return (
      <div
        className="rounded-2xl overflow-hidden bg-slate-950 relative"
        aria-label="Vocabulary constellation — empty"
      >
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <svg
            viewBox="0 0 200 80"
            className="w-48 mb-6 opacity-40"
            aria-hidden="true"
          >
            {/* A handful of placeholder stars */}
            {[
              [40, 40, 2], [80, 25, 1.5], [120, 50, 2.5],
              [155, 30, 1.5], [60, 60, 1], [100, 40, 1],
            ].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="#475569" opacity={0.4 + i * 0.05} />
            ))}
          </svg>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your constellation will form as you build your vocabulary.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Each word becomes a point of light.
          </p>
        </div>
      </div>
    )
  }

  const isCapped = totalItems !== undefined && nodes.length < totalItems

  return (
    <div
      className="rounded-2xl overflow-hidden bg-slate-950 relative"
      role="region"
      aria-label={`Vocabulary constellation — ${nodes.length} words`}
    >
      {/* Atmospheric centre glow — purely decorative */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
            'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 65%)',
            'radial-gradient(ellipse 30% 25% at 72% 35%, rgba(251,191,36,0.03) 0%, transparent 55%)',
          ].join(', '),
        }}
      />

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full block"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1.4s ease',
        }}
        aria-hidden="true"   // Screen reader gets the region label above
        onMouseLeave={hideTooltip}
      >
        <defs>
          {/* Glow filters — only applied to outer glow circles, not core dots */}
          <filter id="csb-glow-sm" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          <filter id="csb-glow-md" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" />
          </filter>
          <filter id="csb-glow-lg" x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>

          {/* Breathing animations (CSS inside SVG defs — standard, well-supported) */}
          <style>{CONSTELLATION_CSS}</style>
        </defs>

        {/* Render nodes back-to-front by stage */}
        {sorted.map((node) => {
          const vis  = STAGE_VISUAL[node.stage]
          const px   = node.x * VB_W
          const py   = node.y * VB_H
          const delay = animDelayMap.get(node.id)
          const isHovered = tooltip?.node.id === node.id

          // For the glow animation class
          const glowClass = vis.animated
            ? `csb-glow-${node.stage as 'activate' | 'mastered'}`
            : undefined
          const haloClass = vis.animated
            ? `csb-halo-${node.stage as 'activate' | 'mastered'}`
            : undefined

          return (
            <g
              key={node.id}
              style={{ cursor: 'crosshair' }}
              onMouseEnter={(e) => showTooltip(node, e)}
              onMouseMove={updateTooltipPos}
              onMouseLeave={hideTooltip}
              onTouchStart={(e) => { e.stopPropagation(); showTooltip(node, e) }}
            >
              {/* Wide ambient halo (activate + mastered only) */}
              {vis.haloR > 0 && (
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? vis.haloR * 1.4 : vis.haloR}
                  fill={vis.glowColor}
                  opacity={isHovered ? vis.haloOpacity * 1.6 : vis.haloOpacity}
                  filter={`url(#csb-glow-lg)`}
                  className={haloClass}
                  style={delay ? { animationDelay: delay } : undefined}
                />
              )}

              {/* Focused glow circle */}
              {vis.glowR > 0 && (
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? vis.glowR * 1.3 : vis.glowR}
                  fill={vis.glowColor}
                  opacity={isHovered ? vis.glowOpacity * 1.5 : vis.glowOpacity}
                  filter={vis.glowFilter ? `url(#${vis.glowFilter})` : undefined}
                  className={glowClass}
                  style={delay ? { animationDelay: delay } : undefined}
                />
              )}

              {/* Core dot — sharp, no filter */}
              <circle
                cx={px}
                cy={py}
                r={isHovered ? vis.coreR * 1.25 : vis.coreR}
                fill={isHovered ? '#ffffff' : vis.coreColor}
                opacity={isHovered ? 1 : vis.coreOpacity}
                style={{ transition: 'r 0.15s ease, opacity 0.15s ease' }}
              />

              {/* Invisible hit target — always r=8 for comfortable interaction */}
              <circle
                cx={px}
                cy={py}
                r={8}
                fill="transparent"
              />
            </g>
          )
        })}
      </svg>

      {/* Footer: word count + legend */}
      <div className="px-4 pb-3.5 pt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-600 flex-shrink-0">
          {isCapped
            ? `${nodes.length} of ${totalItems} words shown`
            : `${nodes.length} word${nodes.length !== 1 ? 's' : ''}`}
        </p>

        {/* Stage legend — five dots in order */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {STAGES_ORDERED.map((stage) => {
            const vis = STAGE_VISUAL[stage]
            return (
              <div key={stage} className="flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full flex-shrink-0"
                  style={{
                    width:           vis.coreR * 2.2,
                    height:          vis.coreR * 2.2,
                    backgroundColor: vis.coreColor,
                    opacity:         vis.coreOpacity,
                  }}
                  aria-hidden="true"
                />
                <span className="text-xs text-slate-600 hidden sm:inline">
                  {STAGE_LABEL[stage]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip — portal-like fixed overlay */}
      {tooltip && <ConstellationTooltip {...tooltip} />}
    </div>
  )
}
