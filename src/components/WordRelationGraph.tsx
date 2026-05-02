/**
 * WordRelationGraph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive SVG graph showing how a vocabulary item relates to others in the
 * library — plus AI-suggested words to discover and add.
 *
 * Layout: current word at centre, related/suggested nodes on a circle.
 * • Solid nodes   = already in library → tap to select, button to navigate
 * • Dashed nodes  = AI suggestions     → tap to select, button to add
 * • Tap a selected node again to navigate / add (shortcut)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2, Loader2, AlertCircle, Sparkles, Plus, ArrowRight, RefreshCw,
} from 'lucide-react'
import { RelatedEntry, RelatedSuggestion } from '@/types/vocabulary'

// ── Colour map by relationship direction ──────────────────────────────────────

interface DirColor { stroke: string; fill: string; badge: string; text: string }

const DIR_COLORS: Record<string, DirColor> = {
  synonym:      { stroke: '#10b981', fill: '#ecfdf5', badge: '#bbf7d0', text: '#059669' },
  contrast:     { stroke: '#f43f5e', fill: '#fff1f2', badge: '#fecdd3', text: '#e11d48' },
  same_family:  { stroke: '#8b5cf6', fill: '#f5f3ff', badge: '#ddd6fe', text: '#7c3aed' },
  same_context: { stroke: '#0ea5e9', fill: '#f0f9ff', badge: '#bae6fd', text: '#0284c7' },
  soundalike:   { stroke: '#f59e0b', fill: '#fffbeb', badge: '#fde68a', text: '#d97706' },
  confusable:   { stroke: '#f97316', fill: '#fff7ed', badge: '#fed7aa', text: '#ea580c' },
}
const FALLBACK: DirColor = { stroke: '#6366f1', fill: '#eef2ff', badge: '#c7d2fe', text: '#4f46e5' }

function dirColor(direction?: string): DirColor {
  return (direction ? DIR_COLORS[direction] : undefined) ?? FALLBACK
}

const DIRECTION_LABEL: Record<string, string> = {
  synonym:      'synonym',
  contrast:     'contrast',
  same_family:  'same family',
  same_context: 'same context',
  soundalike:   'sounds like',
  confusable:   'confusable',
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function circlePositions(n: number, cx: number, cy: number, r: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

// ── SVG text that wraps long terms across two lines ───────────────────────────

function NodeText({
  term, x, y, fill, fontSize,
}: {
  term: string; x: number; y: number; fill: string; fontSize: number
}) {
  // Try to split on last space before maxLen
  const maxLen = fontSize >= 11 ? 10 : 8
  let l1 = term
  let l2: string | null = null
  if (term.length > maxLen) {
    const mid = term.lastIndexOf(' ', maxLen)
    if (mid > 1) {
      l1 = term.slice(0, mid)
      l2 = term.slice(mid + 1)
    } else {
      l1 = term.slice(0, maxLen - 1) + '…'
    }
  }
  const baseStyle: React.CSSProperties = { pointerEvents: 'none', userSelect: 'none' }
  if (!l2) {
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontWeight={700} fill={fill} style={baseStyle}>
        {l1}
      </text>
    )
  }
  return (
    <>
      <text x={x} y={y - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize - 1} fontWeight={700} fill={fill} style={baseStyle}>
        {l1}
      </text>
      <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize - 1} fontWeight={700} fill={fill} style={baseStyle}>
        {l2}
      </text>
    </>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyNode =
  | { kind: 'entry';      data: RelatedEntry }
  | { kind: 'suggestion'; data: RelatedSuggestion }

export interface WordRelationGraphProps {
  entries:      RelatedEntry[]
  suggestions?: RelatedSuggestion[]
  status?:      'pending' | 'complete' | 'failed'
  currentTerm:  string
  onGenerate?:  () => void
  onAdd?:       (s: RelatedSuggestion) => void
}

// ── Main export ───────────────────────────────────────────────────────────────

export function WordRelationGraph({
  entries, suggestions = [], status, currentTerm, onGenerate, onAdd,
}: WordRelationGraphProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = useState(480)
  const [selected, setSelected] = useState<AnyNode | null>(null)

  // Measure container width responsively
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setSvgWidth(el.clientWidth || 480))
    obs.observe(el)
    setSvgWidth(el.clientWidth || 480)
    return () => obs.disconnect()
  }, [])

  // ── Non-graph states ──────────────────────────────────────────────────────

  if (status === 'pending') {
    return (
      <Shell>
        <div className="px-4 py-8 flex flex-col items-center gap-3">
          <div className="relative w-16 h-16">
            {/* Pulsing orbit */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-200 animate-ping opacity-60" />
            <div className="absolute inset-2 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 size={20} className="text-indigo-400 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Mapping your word network…</p>
        </div>
      </Shell>
    )
  }

  if (status === 'failed') {
    return (
      <Shell>
        <div className="px-4 py-5 flex items-start gap-3">
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Couldn't build the graph</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              This usually happens when the library is very small, or the
              connection timed out. Retry once your library has more words.
            </p>
            {onGenerate && (
              <button
                onClick={onGenerate}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw size={11} />
                Try again
              </button>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  if (!status && entries.length === 0 && suggestions.length === 0) {
    return (
      <Shell>
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Link2 size={16} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">Word relationship graph</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              See how this word connects to others in your library — and
              discover related words worth adding.
            </p>
          </div>
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 active:scale-95 transition-all"
            >
              <Sparkles size={12} />
              Build graph
            </button>
          )}
        </div>
      </Shell>
    )
  }

  if (status === 'complete' && entries.length === 0 && suggestions.length === 0) {
    return (
      <Shell>
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 italic">
            No connections found — try adding more vocabulary to your library.
          </p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="shrink-0 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>
      </Shell>
    )
  }

  // ── Graph layout ──────────────────────────────────────────────────────────

  const H = 300
  const cx = svgWidth / 2
  const cy = H / 2
  const CENTER_R = 36
  const NODE_R = 28
  const SUGGEST_R = 24

  const allNodes: AnyNode[] = [
    ...entries.map((e) => ({ kind: 'entry' as const, data: e })),
    ...suggestions.map((s) => ({ kind: 'suggestion' as const, data: s })),
  ]

  const graphR = Math.max(
    Math.min(svgWidth / 2 - NODE_R - 28, 130),
    60,
  )
  const positions = circlePositions(allNodes.length, cx, cy, graphR)

  function nodeKey(n: AnyNode) {
    return n.kind === 'entry' ? n.data.id : `suggest:${n.data.term}`
  }
  function selectedKey(n: AnyNode | null) {
    return n ? nodeKey(n) : null
  }

  function handleNodeClick(node: AnyNode) {
    if (selectedKey(selected) === nodeKey(node)) {
      // Second tap: trigger primary action
      if (node.kind === 'entry') navigate(`/item/${node.data.id}`)
      else onAdd?.(node.data)
      setSelected(null)
    } else {
      setSelected(node)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Shell entryCount={entries.length} suggestionCount={suggestions.length}>
      <div ref={containerRef} className="select-none">

        {/* ── SVG ── */}
        <svg
          width={svgWidth}
          height={H}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label={`Relationship graph for ${currentTerm}`}
        >
          {/* Edges */}
          {allNodes.map((node, i) => {
            const pos = positions[i]
            const c = dirColor(node.data.direction)
            const r = node.kind === 'entry' ? NODE_R : SUGGEST_R
            const dx = cx - pos.x
            const dy = cy - pos.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const ux = dx / dist
            const uy = dy / dist
            const isSelected = selectedKey(selected) === nodeKey(node)

            return (
              <line
                key={`edge-${i}`}
                x1={pos.x + ux * (r + 2)}
                y1={pos.y + uy * (r + 2)}
                x2={cx - ux * (CENTER_R + 2)}
                y2={cy - uy * (CENTER_R + 2)}
                stroke={c.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeOpacity={isSelected ? 0.85 : 0.4}
                strokeDasharray={node.kind === 'suggestion' ? '5 3' : undefined}
              />
            )
          })}

          {/* Centre node */}
          <circle cx={cx} cy={cy} r={CENTER_R} fill="#eef2ff" stroke="#6366f1" strokeWidth={2.5} />
          <NodeText term={currentTerm} x={cx} y={cy} fill="#4f46e5" fontSize={12} />

          {/* Related / suggestion nodes */}
          {allNodes.map((node, i) => {
            const pos = positions[i]
            const c = dirColor(node.data.direction)
            const r = node.kind === 'entry' ? NODE_R : SUGGEST_R
            const isSelected = selectedKey(selected) === nodeKey(node)
            const fontSize = node.data.term.length > 9 ? 9 : 11

            return (
              <g
                key={`node-${i}`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={node.data.term}
              >
                {/* Invisible larger hit area */}
                <circle cx={pos.x} cy={pos.y} r={r + 10} fill="transparent" />

                {/* Main circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={isSelected ? c.badge : c.fill}
                  stroke={c.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={node.kind === 'suggestion' ? '5 3' : undefined}
                />

                {/* Term text */}
                <NodeText
                  term={node.data.term}
                  x={pos.x} y={pos.y}
                  fill={c.text}
                  fontSize={fontSize}
                />

                {/* "+" badge on suggestion nodes */}
                {node.kind === 'suggestion' && (
                  <>
                    <circle
                      cx={pos.x + r - 7} cy={pos.y - r + 7}
                      r={8} fill="#6366f1"
                    />
                    <text
                      x={pos.x + r - 7} y={pos.y - r + 7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={13} fontWeight={800} fill="white"
                      style={{ pointerEvents: 'none' }}
                    >
                      +
                    </text>
                  </>
                )}

                {/* Direction label — only when selected, shown outside node */}
                {isSelected && node.data.direction && (
                  <text
                    x={pos.x + (pos.x - cx) / Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2) * (r + 13)}
                    y={pos.y + (pos.y - cy) / Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2) * (r + 13)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontWeight={700}
                    fill={c.stroke}
                    style={{ pointerEvents: 'none' }}
                  >
                    {DIRECTION_LABEL[node.data.direction] ?? node.data.direction}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* ── Selected node detail card ── */}
        {selected && (
          <div
            className="mx-3 mb-2 rounded-xl px-3.5 py-3 border"
            style={{
              borderColor: `${dirColor(selected.data.direction).stroke}55`,
              background: dirColor(selected.data.direction).fill,
            }}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 leading-tight">
                    {selected.data.term}
                  </span>
                  {selected.data.direction && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                      style={{
                        background: dirColor(selected.data.direction).badge,
                        color: dirColor(selected.data.direction).text,
                      }}
                    >
                      {DIRECTION_LABEL[selected.data.direction] ?? selected.data.direction}
                    </span>
                  )}
                </div>
                {selected.kind === 'suggestion' && (
                  <p className="text-xs text-slate-500 italic mb-1 leading-snug">
                    {(selected.data as RelatedSuggestion).definitionHint}
                  </p>
                )}
                <p className="text-xs text-slate-500 leading-relaxed">
                  {selected.data.explanation}
                </p>
              </div>
              <div className="shrink-0">
                {selected.kind === 'entry' ? (
                  <button
                    onClick={() => navigate(`/item/${(selected.data as RelatedEntry).id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg active:scale-95 transition-all"
                    style={{ background: dirColor(selected.data.direction).stroke }}
                  >
                    View <ArrowRight size={11} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onAdd?.(selected.data as RelatedSuggestion)
                      setSelected(null)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 active:scale-95 transition-all"
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Colour legend ── */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-3 mt-0.5">
          {Object.entries(DIR_COLORS).map(([dir, c]) => (
            <span
              key={dir}
              className="flex items-center gap-1 text-[9px] font-semibold"
              style={{ color: c.text }}
            >
              <svg width={14} height={5} style={{ display: 'inline' }}>
                <line x1={0} y1={2.5} x2={14} y2={2.5} stroke={c.stroke} strokeWidth={1.5} />
              </svg>
              {dir.replace('_', ' ')}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
            <svg width={14} height={5} style={{ display: 'inline' }}>
              <line x1={0} y1={2.5} x2={14} y2={2.5} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" />
            </svg>
            to add
          </span>
        </div>

      </div>
    </Shell>
  )
}

// ── Section shell ─────────────────────────────────────────────────────────────

function Shell({
  children,
  entryCount,
  suggestionCount,
}: {
  children: React.ReactNode
  entryCount?: number
  suggestionCount?: number
}) {
  const total = (entryCount ?? 0) + (suggestionCount ?? 0)
  return (
    <div className="border border-indigo-100 rounded-xl overflow-hidden">
      <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-2 border-b border-indigo-100">
        <Link2 size={14} className="text-indigo-400 shrink-0" />
        <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex-1">
          Word relationships
        </h3>
        {total > 0 && (
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-100 rounded-full px-2 py-0.5">
            {total}
          </span>
        )}
        {(suggestionCount ?? 0) > 0 && (
          <span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-0.5">
            <Plus size={9} />
            {suggestionCount} to discover
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
