/**
 * VocabularyConstellation.tsx — Phase 3 Progress Page
 *
 * Phase 3 additions over Phase 2:
 *   • Word Journey Card — intimate "museum placard" card replacing the quick tooltip
 *   • StageMiniTimeline — horizontal dot-line journey mark inside the card
 *   • ConfidenceDots — three-dot self-assessment indicator
 *   • Cluster nebula hints — barely-visible ambient glow behind theme regions
 *   • Refined empty state — poetic, inviting, full of potential
 *   • Mobile interaction polish — touchEnd + SVG-level dismiss, bottom-sheet card
 *   • Card is stable (anchored to star position), not cursor-chasing
 *
 * Design intent:
 *   The learner should feel: "These words have histories.
 *   I can see them becoming part of me."
 *
 * Architecture invariants (Phase 2 + Phase 3):
 *   • No physics, no D3, no Framer Motion
 *   • Positions deterministic — same ID always same (x, y)
 *   • CSS keyframes only for ambient animation
 *   • prefers-reduced-motion: all animations suspended
 *   • feGaussianBlur only on glow/halo/nebula circles, never core dots
 *   • Hit targets always r=8
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { DisplayStage } from '@/lib/progressionLogic'
import type { ConstellationNode } from '@/lib/progressPageLogic'
import { relativeTime } from '@/lib/progressPageLogic'

// ── Stage visual config ────────────────────────────────────────────────────────

interface StageVisual {
  coreR: number
  glowR: number
  haloR: number
  coreColor: string
  glowColor: string
  coreOpacity: number
  glowOpacity: number
  haloOpacity: number
  glowFilter: '' | 'csb-glow-sm' | 'csb-glow-md' | 'csb-glow-lg'
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

const STAGE_Z: Record<DisplayStage, number> = {
  new: 0, introduced: 1, drilling: 2, activate: 3, mastered: 4,
}

const STAGE_LEGEND_COLOR: Record<DisplayStage, string> = {
  new:        '#334155',
  introduced: '#7dd3fc',
  drilling:   '#c4b5fd',
  activate:   '#fcd34d',
  mastered:   '#fef9c3',
}

const STAGE_LABEL: Record<DisplayStage, string> = {
  new: 'New', introduced: 'Introduced', drilling: 'Drilling',
  activate: 'Activate', mastered: 'Mastered',
}

const STAGE_SHORT: Record<DisplayStage, string> = {
  new: 'New', introduced: 'Intro', drilling: 'Drill', activate: 'Act', mastered: 'Mast',
}

const STAGES_ORDERED: DisplayStage[] = ['new', 'introduced', 'drilling', 'activate', 'mastered']

const STAGE_IDX: Record<DisplayStage, number> = {
  new: 0, introduced: 1, drilling: 2, activate: 3, mastered: 4,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VB_W = 800
const VB_H = 480

// ── CSS animations (inside SVG <defs>) ────────────────────────────────────────

const CONSTELLATION_CSS = `
  @media (prefers-reduced-motion: no-preference) {
    .csb-glow-activate  { animation: csbBreathActivate 7s ease-in-out infinite; }
    .csb-glow-mastered  { animation: csbBreathMastered 5s ease-in-out infinite; }
    .csb-halo-activate  { animation: csbBreathActivate 7s ease-in-out infinite; }
    .csb-halo-mastered  { animation: csbBreathMastered 5s ease-in-out infinite; }
  }
  @keyframes csbBreathActivate {
    0%, 100% { opacity: 0.12; }
    50%       { opacity: 0.36; }
  }
  @keyframes csbBreathMastered {
    0%, 100% { opacity: 0.22; }
    50%       { opacity: 0.58; }
  }
  @keyframes csbCardIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .csb-card-enter { animation: csbCardIn 150ms ease forwards; }
  }
`

// ── StageMiniTimeline ──────────────────────────────────────────────────────────

/**
 * A tiny horizontal dot-line timeline showing the 5 stages.
 * Trail (left of current) is dimly lit; current is full-color + larger;
 * future (right of current) is dim slate.
 * Conveys "where this word has travelled" at a glance.
 */
function StageMiniTimeline({ stage }: { stage: DisplayStage }) {
  const currentIdx = STAGE_IDX[stage]
  const stageColor = STAGE_LEGEND_COLOR[stage]

  // Five x-positions in a 160px-wide viewBox
  const dotY = 9
  const labelY = 22
  const xs = [10, 47, 84, 121, 150]

  return (
    <svg
      viewBox="0 0 160 26"
      className="w-full"
      style={{ height: 26 }}
      aria-label={`Stage journey: ${STAGE_LABEL[stage]}`}
      role="img"
    >
      {/* Connecting lines */}
      {xs.slice(0, -1).map((x, i) => {
        const isTrailSegment  = i < currentIdx
        const isCurrent       = i === currentIdx - 1  // segment ending at current dot
        const stroke = isTrailSegment || isCurrent
          ? stageColor
          : '#334155'
        const opacity = isTrailSegment || isCurrent ? 0.35 : 0.25

        return (
          <line
            key={i}
            x1={x + (i < currentIdx ? 4 : i === currentIdx ? 6 : 4)}
            y1={dotY}
            x2={xs[i + 1] - 4}
            y2={dotY}
            stroke={stroke}
            strokeWidth={1}
            opacity={opacity}
          />
        )
      })}

      {/* Stage dots */}
      {xs.map((x, i) => {
        const isTrail   = i < currentIdx
        const isCurrent = i === currentIdx
        const r   = isCurrent ? 4.5 : 2.5
        const fill = isCurrent ? stageColor : isTrail ? stageColor : '#334155'
        const opacity = isCurrent ? 1 : isTrail ? 0.4 : 0.3

        return (
          <g key={i}>
            {/* Subtle outer ring on current dot */}
            {isCurrent && (
              <circle cx={x} cy={dotY} r={7} fill={stageColor} opacity={0.12} />
            )}
            <circle
              cx={x}
              cy={dotY}
              r={r}
              fill={fill}
              opacity={opacity}
            />
          </g>
        )
      })}

      {/* Stage labels */}
      {xs.map((x, i) => (
        <text
          key={i}
          x={x}
          y={labelY}
          textAnchor="middle"
          fontSize="6"
          fill={i === currentIdx ? stageColor : '#475569'}
          opacity={i === currentIdx ? 0.9 : 0.5}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {STAGE_SHORT[STAGES_ORDERED[i]]}
        </text>
      ))}
    </svg>
  )
}

// ── ConfidenceDots ─────────────────────────────────────────────────────────────

/**
 * Three dots representing self-reported confidence:
 *   0 = unset, 1 = red (recognise), 2 = yellow (prompted), 3 = green (natural)
 */
function ConfidenceDots({ level }: { level: number }) {
  const DOT_COLORS = ['#f87171', '#fbbf24', '#34d399']   // red, amber, green

  if (level === 0) {
    return <span className="text-xs text-slate-600">Not yet assessed</span>
  }

  return (
    <div className="flex items-center gap-1.5" aria-label={`Confidence level ${level} of 3`}>
      {DOT_COLORS.map((color, i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: i < level ? color : '#1e293b',
            opacity: i < level ? 1 : 0.5,
          }}
          aria-hidden="true"
        />
      ))}
      <span className="text-xs text-slate-500 ml-0.5">
        {['', 'recognise', 'prompted', 'natural'][level]}
      </span>
    </div>
  )
}

// ── WordJourneyCard ────────────────────────────────────────────────────────────

interface CardPosition {
  /** screen-space position of the anchoring star (clientX/Y) */
  starX: number
  starY: number
}

interface WordJourneyCardProps {
  node: ConstellationNode
  position: CardPosition
  isMobile: boolean
}

/**
 * The museum-placard card.
 *
 * Desktop: appears near the star's screen position, offset right/above.
 *   Clamped so it never leaves the viewport.
 * Mobile: fixed bottom sheet — avoids all viewport clamping complexity.
 *
 * The card is intentionally stable (anchored to the star, not cursor-chasing).
 */
function WordJourneyCard({ node, position, isMobile }: WordJourneyCardProps) {
  const vis = STAGE_VISUAL[node.stage]
  const W = 240   // card width in px

  let style: React.CSSProperties

  if (isMobile) {
    style = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      // Pad out of the iPhone home-indicator safe area.
      // Use longhands only — shorthand `padding` would override paddingBottom.
      paddingTop: 0,
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    }
  } else {
    // Place card to the right of the star, offset slightly upward
    const raw_left = position.starX + 20
    const raw_top  = position.starY - 60
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const left = Math.min(raw_left, vw - W - 16)
    const top  = Math.max(8, Math.min(raw_top, vh - 320))
    style = { position: 'fixed', left, top, width: W, zIndex: 50 }
  }

  return (
    <div style={style} className="pointer-events-none select-none">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl csb-card-enter"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(148,163,184,0.12)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          marginBottom: isMobile ? 16 : 0,
        }}
      >
        {/* Pill dismissal affordance — mobile only */}
        {isMobile && (
          <div className="flex justify-center pt-2.5 pb-0.5" aria-hidden="true">
            <div
              className="w-8 rounded-full"
              style={{ height: 3, backgroundColor: 'rgba(148,163,184,0.22)' }}
            />
          </div>
        )}

        {/* Stage accent strip */}
        <div
          className="h-0.5 w-full"
          style={{ backgroundColor: vis.coreColor, opacity: 0.7 }}
          aria-hidden="true"
        />

        <div className="px-4 pt-3.5 pb-4 space-y-3">
          {/* Term + stage dot */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{ width: 6, height: 6, backgroundColor: vis.coreColor, opacity: 0.9 }}
                aria-hidden="true"
              />
              <span className="text-xs font-medium uppercase tracking-widest"
                style={{ color: vis.coreColor, opacity: 0.8 }}>
                {STAGE_LABEL[node.stage]}
              </span>
            </div>
            <h3 className="text-lg font-medium text-slate-100 leading-tight">
              {node.term}
            </h3>
          </div>

          {/* Stage mini timeline */}
          <div>
            <StageMiniTimeline stage={node.stage} />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800" />

          {/* Details */}
          <div className="space-y-2">
            {/* Theme */}
            {node.primaryTheme && (
              <div className="text-xs text-slate-500 truncate">
                {node.primaryTheme}
              </div>
            )}

            {/* Confidence */}
            <ConfidenceDots level={node.confidenceLevel} />

            {/* Usage count */}
            {node.usageCount > 0 ? (
              <div className="text-xs text-slate-500">
                {node.usageCount} real-life use{node.usageCount !== 1 ? 's' : ''}
              </div>
            ) : node.stage !== 'new' && node.stage !== 'introduced' ? (
              <div className="text-xs text-slate-600 italic">
                Not yet used in real life
              </div>
            ) : null}

            {/* Temporal anchors — the emotional core of the card */}
            <div className="space-y-1 pt-0.5">
              <div className="text-xs text-slate-600">
                <span className="text-slate-500">First seen</span>
                {' '}
                <span>{relativeTime(node.createdAt)}</span>
              </div>
              {node.lastActiveAt && (
                <div className="text-xs text-slate-600">
                  <span className="text-slate-500">Last active</span>
                  {' '}
                  <span>{relativeTime(node.lastActiveAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Cluster nebula computation ─────────────────────────────────────────────────

/** Average position (centroid) of all nodes belonging to each theme. */
function computeClusterCentroids(
  nodes: ConstellationNode[],
): Map<string, { cx: number; cy: number }> {
  const acc = new Map<string, { x: number; y: number; n: number }>()
  for (const node of nodes) {
    if (!node.primaryTheme) continue
    const a = acc.get(node.primaryTheme) ?? { x: 0, y: 0, n: 0 }
    a.x += node.x; a.y += node.y; a.n++
    acc.set(node.primaryTheme, a)
  }
  const result = new Map<string, { cx: number; cy: number }>()
  for (const [theme, { x, y, n }] of acc) {
    result.set(theme, { cx: x / n, cy: y / n })
  }
  return result
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyConstellation() {
  // A scatter of placeholder stars — more varied than Phase 2
  const stars = [
    { cx: 60,  cy: 100, r: 1.5, opacity: 0.20 },
    { cx: 150, cy:  55, r: 1.0, opacity: 0.15 },
    { cx: 240, cy: 130, r: 2.0, opacity: 0.25 },
    { cx: 340, cy:  70, r: 1.5, opacity: 0.18 },
    { cx: 400, cy: 150, r: 1.0, opacity: 0.20 },
    { cx: 480, cy:  45, r: 2.5, opacity: 0.28 },
    { cx: 560, cy: 115, r: 1.5, opacity: 0.18 },
    { cx: 640, cy:  80, r: 1.0, opacity: 0.15 },
    { cx: 720, cy: 140, r: 2.0, opacity: 0.22 },
    { cx: 110, cy: 170, r: 1.0, opacity: 0.14 },
    { cx: 290, cy: 180, r: 1.5, opacity: 0.16 },
    { cx: 520, cy: 175, r: 1.0, opacity: 0.14 },
    { cx: 680, cy: 165, r: 1.5, opacity: 0.18 },
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden bg-slate-950"
      aria-label="Vocabulary constellation — your sky is waiting"
    >
      <svg
        viewBox="0 0 800 220"
        preserveAspectRatio="xMidYMid meet"
        className="w-full block"
        aria-hidden="true"
      >
        <defs>
          <filter id="empty-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          {/* One faint amber star for atmosphere */}
          <radialGradient id="empty-gold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background stars */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#475569" opacity={s.opacity} />
        ))}

        {/* One glowing "first star" in the centre — potential */}
        <circle cx={400} cy={108} r={18} fill="url(#empty-gold)" filter="url(#empty-glow)" />
        <circle cx={400} cy={108} r={3}  fill="#fde68a" opacity={0.45} />
      </svg>

      <div className="px-6 pb-8 pt-2 text-center">
        <p className="text-slate-400 text-sm font-light leading-relaxed">
          Your sky is waiting.
        </p>
        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
          Each word you learn becomes a point of light —<br />
          dim at first, brightening as it becomes yours.
        </p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface VocabularyConstellationProps {
  nodes: ConstellationNode[]
  totalItems?: number
}

export function VocabularyConstellation({ nodes, totalItems }: VocabularyConstellationProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Fade-in on mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Hover state: which node is "active", where its star is on screen, which cluster is lit
  const [activeNodeId,  setActiveNodeId]  = useState<string | null>(null)
  const [cardPosition,  setCardPosition]  = useState<CardPosition | null>(null)
  const [activeCluster, setActiveCluster] = useState<string | null>(null)

  // Detect mobile once — stable across renders
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.innerWidth < 640,
    [],
  )

  // Respect prefers-reduced-motion for inline CSS transitions
  // (keyframe animations are already wrapped in the @media block in CONSTELLATION_CSS)
  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // Sort nodes back-to-front
  const sorted = useMemo(
    () => [...nodes].sort((a, b) => STAGE_Z[a.stage] - STAGE_Z[b.stage]),
    [nodes],
  )

  // Animation stagger delays for breathing nodes
  const animDelayMap = useMemo(() => {
    const map = new Map<string, string>()
    let i = 0
    for (const node of sorted) {
      if (node.stage === 'activate' || node.stage === 'mastered') {
        map.set(node.id, `${((i * 0.71) % 6).toFixed(2)}s`)
        i++
      }
    }
    return map
  }, [sorted])

  // Cluster centroids for nebula hints
  const clusterCentroids = useMemo(() => computeClusterCentroids(nodes), [nodes])

  // Map from id → node for quick lookup when dismissing
  const nodeById = useMemo(() => {
    const m = new Map<string, ConstellationNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  // ── Interaction helpers ────────────────────────────────────────────────────

  /**
   * Convert a node's normalized position to screen-space coordinates.
   * Used to anchor the card near the star.
   */
  const toScreenPos = useCallback((node: ConstellationNode): CardPosition | null => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    // The SVG fills its container with preserveAspectRatio="xMidYMid meet".
    // For a container that matches the aspect ratio exactly, the mapping is linear.
    // We use the rect dimensions (which the browser has already resolved).
    return {
      starX: rect.left + node.x * rect.width,
      starY: rect.top  + node.y * rect.height,
    }
  }, [])

  const activateNode = useCallback((node: ConstellationNode) => {
    setActiveNodeId(node.id)
    setActiveCluster(node.primaryTheme ?? null)
    setCardPosition(toScreenPos(node))
  }, [toScreenPos])

  const clearActive = useCallback(() => {
    setActiveNodeId(null)
    setCardPosition(null)
    setActiveCluster(null)
  }, [])

  // Close on scroll
  useEffect(() => {
    window.addEventListener('scroll', clearActive, { passive: true })
    return () => window.removeEventListener('scroll', clearActive)
  }, [clearActive])

  const activeNode = activeNodeId ? nodeById.get(activeNodeId) : null

  // ── Empty state ────────────────────────────────────────────────────────────
  if (nodes.length === 0) return <EmptyConstellation />

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
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full block"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.9s ease' }}
        aria-hidden="true"
        onMouseLeave={clearActive}
        // SVG-level touch dismiss: fires when touching the background (not a node,
        // because nodes call stopPropagation on their touchEnd)
        onTouchEnd={clearActive}
      >
        <defs>
          <filter id="csb-glow-sm" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          <filter id="csb-glow-md" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" />
          </filter>
          <filter id="csb-glow-lg" x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>

          {/* Nebula gradient for cluster hints */}
          <radialGradient id="csb-nebula" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"   />
          </radialGradient>

          <style>{CONSTELLATION_CSS}</style>
        </defs>

        {/* ── Cluster nebula hints ──────────────────────────────────────────── */}
        {/* Extremely soft theme territory indicators. Visible only when a node  */}
        {/* in that cluster is hovered. CSS transition handles fade in/out.       */}
        {Array.from(clusterCentroids.entries()).map(([theme, { cx, cy }]) => (
          <circle
            key={`nebula-${theme}`}
            cx={cx * VB_W}
            cy={cy * VB_H}
            r={95}
            fill="url(#csb-nebula)"
            filter="url(#csb-glow-lg)"
            style={{
              opacity: activeCluster === theme ? 1 : 0,
              transition: 'opacity 0.9s ease',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* ── Vocabulary nodes, back-to-front ──────────────────────────────── */}
        {sorted.map((node) => {
          const vis       = STAGE_VISUAL[node.stage]
          const px        = node.x * VB_W
          const py        = node.y * VB_H
          const delay     = animDelayMap.get(node.id)
          const isActive  = activeNodeId === node.id

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
              // Desktop: show card on hover
              onMouseEnter={() => activateNode(node)}
              // Mobile: touchEnd toggles card; stopPropagation prevents SVG from clearing
              onTouchEnd={(e) => {
                e.stopPropagation()
                if (activeNodeId === node.id) {
                  clearActive()
                } else {
                  activateNode(node)
                }
              }}
            >
              {/* Wide ambient halo — activate/mastered only */}
              {vis.haloR > 0 && (
                <circle
                  cx={px} cy={py}
                  r={isActive ? vis.haloR * 1.5 : vis.haloR}
                  fill={vis.glowColor}
                  opacity={isActive ? vis.haloOpacity * 1.8 : vis.haloOpacity}
                  filter="url(#csb-glow-lg)"
                  className={haloClass}
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
                    ...(delay ? { animationDelay: delay } : {}),
                  }}
                />
              )}

              {/* Focused glow */}
              {vis.glowR > 0 && (
                <circle
                  cx={px} cy={py}
                  r={isActive ? vis.glowR * 1.4 : vis.glowR}
                  fill={vis.glowColor}
                  opacity={isActive ? vis.glowOpacity * 1.6 : vis.glowOpacity}
                  filter={vis.glowFilter ? `url(#${vis.glowFilter})` : undefined}
                  className={glowClass}
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
                    ...(delay ? { animationDelay: delay } : {}),
                  }}
                />
              )}

              {/* Core dot */}
              <circle
                cx={px} cy={py}
                r={isActive ? vis.coreR * 1.35 : vis.coreR}
                fill={isActive ? '#ffffff' : vis.coreColor}
                opacity={isActive ? 1 : vis.coreOpacity}
                style={{ transition: prefersReducedMotion ? 'none' : 'fill 0.15s ease, opacity 0.15s ease' }}
              />

              {/* Hit target — larger on mobile for touch accuracy */}
              <circle cx={px} cy={py} r={isMobile ? 22 : 8} fill="transparent" />
            </g>
          )
        })}
      </svg>

      {/* Footer */}
      <div className="px-4 pb-3.5 pt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-600 flex-shrink-0">
          {isCapped
            ? `${nodes.length} of ${totalItems} words shown`
            : `${nodes.length} word${nodes.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {STAGES_ORDERED.filter((stage) => nodes.some((n) => n.stage === stage)).map((stage) => {
            const vis = STAGE_VISUAL[stage]
            return (
              <div key={stage} className="flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full flex-shrink-0"
                  style={{
                    width: vis.coreR * 2.2, height: vis.coreR * 2.2,
                    backgroundColor: vis.coreColor, opacity: vis.coreOpacity,
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

      {/* Word Journey Card — stable, anchored to the star's screen position */}
      {activeNode && cardPosition && (
        <WordJourneyCard
          node={activeNode}
          position={cardPosition}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
