/**
 * AtlasExposurePanel.tsx
 *
 * Exposure-level archipelago panel for the Language Atlas.
 *
 * Desktop: a scrollable overlay panel (right side of canvas).
 * The same grouping logic is exported for use in MobileAtlasView.
 *
 * Structure:
 *   • Mini histogram — proportional bars per level (0-8 + mastered)
 *   • Recommended for practice — activate words + near-mastery focus words
 *   • All levels — collapsible sections with tappable word chips → /item/:id
 *
 * Design: dark glassmorphism to match the canvas aesthetic.
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import type { AtlasNode } from '@/lib/atlasLayout'

// ── Exposure level groups ─────────────────────────────────────────────────────

export interface ExposureGroup {
  key:        string
  label:      string
  sublabel:   string
  color:      string   // hex, matches atlas canvas palette
  barClass:   string   // Tailwind class for bars/dots
  nodes:      AtlasNode[]
}

function isGroupMastered(n: AtlasNode): boolean {
  return n.stage === 'mastered'
}

function isGroupActivate(n: AtlasNode): boolean {
  return n.stage === 'activate'   // exp=8, not yet mastered
}

/**
 * Build the six exposure groups from a node list.
 * Mastered words are extracted first (stage = mastered),
 * then activate (stage = activate / exp=8),
 * then the rest are binned by exposureCount.
 */
export function buildExposureGroups(nodes: AtlasNode[]): ExposureGroup[] {
  const bins: Record<string, AtlasNode[]> = {
    '0':        [],
    '1-2':      [],
    '3-5':      [],
    '6-7':      [],
    'activate': [],
    'mastered': [],
  }

  for (const n of nodes) {
    if (isGroupMastered(n))  { bins['mastered'].push(n);  continue }
    if (isGroupActivate(n))  { bins['activate'].push(n);  continue }
    const exp = n.exposureCount
    if (exp === 0)              bins['0'].push(n)
    else if (exp <= 2)          bins['1-2'].push(n)
    else if (exp <= 5)          bins['3-5'].push(n)
    else                        bins['6-7'].push(n)
  }

  return [
    {
      key:      '0',
      label:    '0 — Untouched',
      sublabel: 'Not yet challenged',
      color:    '#64748b',
      barClass: 'bg-slate-500',
      nodes:    bins['0'],
    },
    {
      key:      '1-2',
      label:    '1–2 — Introduced',
      sublabel: 'First impressions forming',
      color:    '#818cf8',
      barClass: 'bg-indigo-400',
      nodes:    bins['1-2'],
    },
    {
      key:      '3-5',
      label:    '3–5 — Drilling',
      sublabel: 'Active repetition in progress',
      color:    '#fbbf24',
      barClass: 'bg-amber-400',
      nodes:    bins['3-5'],
    },
    {
      key:      '6-7',
      label:    '6–7 — Near mastery',
      sublabel: '1–2 challenges from Activate',
      color:    '#fb923c',
      barClass: 'bg-orange-400',
      nodes:    bins['6-7'],
    },
    {
      key:      'activate',
      label:    '8 — Activate',
      sublabel: 'Fully drilled — use in real life',
      color:    '#a78bfa',
      barClass: 'bg-violet-400',
      nodes:    bins['activate'],
    },
    {
      key:      'mastered',
      label:    'Mastered',
      sublabel: 'Confirmed in active vocabulary',
      color:    '#4ade80',
      barClass: 'bg-emerald-400',
      nodes:    bins['mastered'],
    },
  ]
}

// ── Shared sub-components ─────────────────────────────────────────────────────

/** Single word chip linking to /item/:id */
function ExposureChip({ node, dotClass }: { node: AtlasNode; dotClass: string }) {
  const isFocus = node.isInFocus
  return (
    <Link
      to={`/item/${node.id}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        isFocus
          ? 'border-white/20 bg-white/10 text-slate-200 hover:bg-white/15'
          : 'border-white/8 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      {node.term}
      {isFocus && (
        <span className="text-[9px] text-slate-500 leading-none" aria-label="in focus">●</span>
      )}
    </Link>
  )
}

/** Mini histogram bar row */
function MiniBar({ group, maxCount }: { group: ExposureGroup; maxCount: number }) {
  const width = maxCount > 0 ? (group.nodes.length / maxCount) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-4 shrink-0 text-right font-mono text-slate-500">
        {group.key === 'activate' ? '8' : group.key === 'mastered' ? '✓' : group.key.split('-')[0]}
      </span>
      <div className="flex-1 h-2.5 rounded-sm overflow-hidden bg-white/5">
        {group.nodes.length > 0 && (
          <div
            className={`h-full rounded-sm ${group.barClass} opacity-80`}
            style={{ width: `${width}%` }}
          />
        )}
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-slate-500">
        {group.nodes.length > 0 ? group.nodes.length : '–'}
      </span>
    </div>
  )
}

/** Collapsible group card (shared by desktop panel and mobile view) */
export function ExposureGroupCard({
  group,
  defaultOpen = false,
}: {
  group: ExposureGroup
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sorted = useMemo(() => {
    // Focus words first, then alphabetical within
    return [...group.nodes].sort((a, b) => {
      if (a.isInFocus !== b.isInFocus) return a.isInFocus ? -1 : 1
      return a.term.localeCompare(b.term)
    })
  }, [group.nodes])

  if (group.nodes.length === 0) return null

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: group.color }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{group.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.nodes.length} word{group.nodes.length !== 1 ? 's' : ''} · {group.sublabel}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-slate-600">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {open && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sorted.map((n) => (
            <ExposureChip key={n.id} node={n} dotClass={group.barClass} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Desktop overlay panel ─────────────────────────────────────────────────────

interface AtlasExposurePanelProps {
  nodes:   AtlasNode[]
  onClose: () => void
}

export function AtlasExposurePanel({ nodes, onClose }: AtlasExposurePanelProps) {
  const groups  = useMemo(() => buildExposureGroups(nodes), [nodes])
  const maxCount = useMemo(
    () => Math.max(...groups.map((g) => g.nodes.length), 1),
    [groups],
  )
  const total = nodes.length

  // Recommended: activate-stage words + near-mastery in-focus words
  const recommended = useMemo(() => {
    const activate   = groups.find((g) => g.key === 'activate')?.nodes ?? []
    const nearFocus  = (groups.find((g) => g.key === '6-7')?.nodes ?? []).filter((n) => n.isInFocus)
    return [...activate, ...nearFocus]
  }, [groups])

  return (
    <div
      className="absolute right-0 top-0 h-full w-72 flex flex-col border-l border-white/8 bg-black/50 backdrop-blur-md overflow-hidden"
      aria-label="Exposure levels panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div>
          <p className="text-sm font-semibold text-slate-200">Exposure Levels</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{total} words · {groups.find(g => g.key === 'mastered')?.nodes.length ?? 0} mastered</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors"
          aria-label="Close panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">

        {/* Mini histogram */}
        <div className="space-y-1.5">
          {groups.map((g) => (
            <MiniBar key={g.key} group={g} maxCount={maxCount} />
          ))}
        </div>

        {/* Recommended */}
        {recommended.length > 0 && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <p className="text-xs font-semibold text-violet-300 mb-0.5">Recommended for practice</p>
            <p className="text-[11px] text-slate-500 mb-3">
              Activate words need real-life use. Near-mastery focus words need 1–2 more challenges.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommended.map((n) => {
                const isActivate = n.stage === 'activate'
                return (
                  <Link
                    key={n.id}
                    to={`/item/${n.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      isActivate
                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20'
                        : 'border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20'
                    }`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isActivate ? 'bg-violet-400' : 'bg-orange-400'}`} />
                    {n.term}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* All level groups */}
        <div className="space-y-2">
          {groups.map((g) => (
            <ExposureGroupCard
              key={g.key}
              group={g}
              defaultOpen={g.key === 'activate' && g.nodes.length > 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
