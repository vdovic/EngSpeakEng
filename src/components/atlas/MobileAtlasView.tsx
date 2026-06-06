/**
 * MobileAtlasView.tsx
 *
 * Mobile companion to AtlasCanvas.
 * On screens < 768px, the full canvas is replaced by a guided regional atlas:
 *
 *   • Lens selector  — 3 interpretive views (Progress / Vitality / Confidence)
 *   • Summary row    — total words + stage distribution bar
 *   • Special collections — Ready to Use, Recently Active
 *   • Region cards   — one card per theme, expandable, with tappable word chips
 *
 * Design intent: designed, not degraded.  The mobile view is a different
 * experience from the canvas, not a simplified version of it.  Spatial
 * ownership is expressed through lists, colour signals, and legible labels.
 *
 * Word chips are tappable → navigate to /item/:id.
 * The lens changes the colour signal on each chip's stage dot.
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AtlasLayout, AtlasNode, AtlasStage, AtlasLens } from '@/lib/atlasLayout'
import { buildExposureGroups, ExposureGroupCard } from './AtlasExposurePanel'

// ── Stage colours ─────────────────────────────────────────────────────────────

const STAGE_BG: Record<AtlasStage, string> = {
  new:        'bg-slate-500',
  introduced: 'bg-indigo-400',
  drilling:   'bg-amber-400',
  activate:   'bg-white/80',
  mastered:   'bg-emerald-400',
}

const STAGE_ORDER: AtlasStage[] = ['mastered', 'activate', 'drilling', 'introduced', 'new']

// ── Lens chip dot colour ──────────────────────────────────────────────────────

function chipDotColor(node: AtlasNode, lens: AtlasLens): string {
  if (lens === 'vitality') {
    if (node.lastActivityMs === null) return 'bg-slate-700'
    const days = (Date.now() - node.lastActivityMs) / 86_400_000
    if (days <= 7)   return 'bg-orange-400'
    if (days <= 30)  return 'bg-amber-300'
    if (days <= 90)  return 'bg-blue-300'
    return 'bg-slate-600'
  }
  if (lens === 'confidence') {
    const lvl = node.confidenceLevel
    if (lvl === 3) return 'bg-emerald-400'
    if (lvl === 2) return 'bg-amber-400'
    if (lvl === 1) return 'bg-orange-400'
    return 'bg-slate-700'
  }
  if (lens === 'exposure') {
    if (node.stage === 'mastered')  return 'bg-emerald-400'
    const exp = node.exposureCount
    if (exp === 0) return 'bg-slate-500'
    if (exp <= 2)  return 'bg-indigo-400'
    if (exp <= 5)  return 'bg-amber-400'
    if (exp <= 7)  return 'bg-orange-400'
    return 'bg-violet-400'  // exp === 8, activate
  }
  // progress
  return STAGE_BG[node.stage]
}

// ── Region card data ──────────────────────────────────────────────────────────

interface RegionCardData {
  theme: string
  nodes: AtlasNode[]
  stageCounts: Record<AtlasStage, number>
}

function buildRegionCards(layout: AtlasLayout): RegionCardData[] {
  const themeMap = new Map<string, AtlasNode[]>()

  for (const node of layout.nodes) {
    let bestTheme: string | null = null
    let bestDist2 = Infinity
    for (const region of layout.regions) {
      const dx = node.x - region.cx, dy = node.y - region.cy
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist2) { bestDist2 = d2; bestTheme = region.theme }
    }
    const region = bestTheme ? layout.regions.find((r) => r.theme === bestTheme)! : null
    const withinRegion = region ? bestDist2 < (Math.max(region.rx, region.ry) * 1.5) ** 2 : false
    if (bestTheme && withinRegion) {
      if (!themeMap.has(bestTheme)) themeMap.set(bestTheme, [])
      themeMap.get(bestTheme)!.push(node)
    }
  }

  return layout.regions.map((region) => {
    const nodes = themeMap.get(region.theme) ?? []
    const stageCounts: Record<AtlasStage, number> = {
      new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0,
    }
    for (const n of nodes) stageCounts[n.stage]++
    return { theme: region.theme, nodes, stageCounts }
  }).sort((a, b) => b.nodes.length - a.nodes.length)
}

// ── Stage distribution bar ────────────────────────────────────────────────────

function StageBar({ counts, total }: { counts: Record<AtlasStage, number>; total: number }) {
  if (total === 0) return null
  return (
    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      {STAGE_ORDER.map((stage) => {
        const pct = (counts[stage] / total) * 100
        if (pct < 1) return null
        return (
          <div
            key={stage}
            className={`h-full ${STAGE_BG[stage]} opacity-80`}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}

// ── Word chip ─────────────────────────────────────────────────────────────────

function WordChip({ node, lens }: { node: AtlasNode; lens: AtlasLens }) {
  return (
    <Link
      to={`/item/${node.id}`}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${chipDotColor(node, lens)}`} />
      {node.term}
    </Link>
  )
}

// ── Word chip list ────────────────────────────────────────────────────────────

function WordList({ nodes, lens }: { nodes: AtlasNode[]; lens: AtlasLens }) {
  const sorted = [...nodes].sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.stage), bi = STAGE_ORDER.indexOf(b.stage)
    return ai - bi
  })
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sorted.map((n) => <WordChip key={n.id} node={n} lens={lens} />)}
    </div>
  )
}

// ── Region card ───────────────────────────────────────────────────────────────

function RegionCard({ card, lens }: { card: RegionCardData; lens: AtlasLens }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">{card.theme}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {card.nodes.length} word{card.nodes.length !== 1 ? 's' : ''}
          </p>
          <StageBar counts={card.stageCounts} total={card.nodes.length} />
        </div>
        <div className="shrink-0 text-slate-600">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </button>
      {open && card.nodes.length > 0 && <WordList nodes={card.nodes} lens={lens} />}
    </div>
  )
}

// ── Special collection card ───────────────────────────────────────────────────

function CollectionCard({
  title,
  subtitle,
  nodes,
  lens,
  accentClass,
}: {
  title: string
  subtitle: string
  nodes: AtlasNode[]
  lens: AtlasLens
  accentClass: string
}) {
  const [open, setOpen] = useState(true)
  if (nodes.length === 0) return null

  return (
    <div className={`rounded-xl border px-4 py-3 ${accentClass}`}>
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {nodes.length} word{nodes.length !== 1 ? 's' : ''} · {subtitle}
          </p>
        </div>
        <div className="shrink-0 text-slate-600">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </button>
      {open && <WordList nodes={nodes} lens={lens} />}
    </div>
  )
}

// ── Summary row ────────────────────────────────────────────────────────────────

function SummaryRow({ layout }: { layout: AtlasLayout }) {
  const total = layout.nodes.length
  const stageCounts = useMemo(() => {
    const counts: Record<AtlasStage, number> = {
      new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0,
    }
    for (const n of layout.nodes) counts[n.stage]++
    return counts
  }, [layout])

  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-200">{total} words in your vocabulary</p>
        <StageBar counts={stageCounts} total={total} />
      </div>
      <div className="flex gap-2">
        {STAGE_ORDER.slice(0, 3).map((stage) => stageCounts[stage] > 0 && (
          <div key={stage} className="text-center">
            <div className={`h-2 w-2 mx-auto rounded-full ${STAGE_BG[stage]}`} />
            <p className="mt-0.5 text-[10px] text-slate-600">{stageCounts[stage]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Lens selector ──────────────────────────────────────────────────────────────

const LENS_LABELS: Record<AtlasLens, string> = {
  progress:   'Progress',
  exposure:   'Exposure',
  vitality:   'Vitality',
  confidence: 'Confidence',
}

function LensSelector({
  lens,
  onLensChange,
}: {
  lens: AtlasLens
  onLensChange: (l: AtlasLens) => void
}) {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/8 mb-4 self-start"
      role="group"
      aria-label="Atlas lens"
    >
      {(Object.keys(LENS_LABELS) as AtlasLens[]).map((l) => (
        <button
          key={l}
          onClick={() => onLensChange(l)}
          aria-pressed={lens === l}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
            lens === l
              ? 'bg-white/15 text-slate-100'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {LENS_LABELS[l]}
        </button>
      ))}
    </div>
  )
}

// ── MobileAtlasView ───────────────────────────────────────────────────────────

interface MobileAtlasViewProps {
  layout: AtlasLayout
  lens: AtlasLens
  onLensChange: (lens: AtlasLens) => void
}

export function MobileAtlasView({ layout, lens, onLensChange }: MobileAtlasViewProps) {
  const cards          = useMemo(() => buildRegionCards(layout),            [layout])
  const exposureGroups = useMemo(() => buildExposureGroups(layout.nodes),   [layout])

  // Special collections
  const readyToUse = useMemo(
    () => layout.nodes.filter((n) => n.stage === 'activate'),
    [layout],
  )
  const recentlyActive = useMemo(() => {
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000
    return layout.nodes.filter(
      (n) => n.lastActivityMs !== null && n.lastActivityMs > cutoffMs,
    )
  }, [layout])

  // Mobile exposure section toggle
  const [showExposure, setShowExposure] = useState(false)

  return (
    <div
      className="h-full overflow-y-auto overscroll-contain px-4 py-5"
      style={{ background: '#08111f' }}
    >
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-100">Language Atlas</h1>
          <p className="mt-0.5 text-xs text-slate-500">Your vocabulary, by region</p>
        </div>

        {/* Lens selector */}
        <LensSelector lens={lens} onLensChange={onLensChange} />

        {/* Summary */}
        <SummaryRow layout={layout} />

        {/* Special collections */}
        {(readyToUse.length > 0 || recentlyActive.length > 0) && (
          <div className="flex flex-col gap-2 mb-3">
            <CollectionCard
              title="Ready to Use"
              subtitle="fully drilled — bring them into real life"
              nodes={readyToUse}
              lens={lens}
              accentClass="border-white/80/20 bg-white/5"
            />
            <CollectionCard
              title="Recently Active"
              subtitle="worked on in the last 2 weeks"
              nodes={recentlyActive}
              lens={lens}
              accentClass="border-indigo-500/20 bg-indigo-500/5"
            />
          </div>
        )}

        {/* Exposure Islands — vocabulary by level */}
        <div className="mb-3">
          <button
            className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left"
            onClick={() => setShowExposure((v) => !v)}
            aria-expanded={showExposure}
          >
            <div>
              <p className="text-sm font-semibold text-slate-200">Exposure Islands</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Browse vocabulary by level · {layout.nodes.length} words
              </p>
            </div>
            <div className="shrink-0 text-slate-600">
              {showExposure ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </div>
          </button>

          {showExposure && (
            <div className="mt-2 flex flex-col gap-2">
              {exposureGroups.map((g) => (
                <ExposureGroupCard
                  key={g.key}
                  group={g}
                  defaultOpen={g.key === 'activate'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Region cards */}
        {cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">
            Add words with themes to see your Atlas regions.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cards.map((card) => (
              <RegionCard key={card.theme} card={card} lens={lens} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
