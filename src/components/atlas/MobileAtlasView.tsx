/**
 * MobileAtlasView.tsx
 *
 * Mobile companion to AtlasCanvas.
 * On screens < 768px, the full canvas is replaced by a regional card list:
 * one card per theme showing the theme name, word count, and a compact
 * stage distribution bar.
 *
 * Design intent: spatial ownership without canvas complexity.
 * The learner sees their vocabulary grouped by theme, colour-coded by stage.
 * Tapping a card shows the words in that theme (stage-sorted).
 *
 * This is NOT a management interface — there are no edit actions.
 */

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AtlasLayout, AtlasNode, AtlasStage } from '@/lib/atlasLayout'

// ── Stage labels and colors ────────────────────────────────────────────────────

const STAGE_COLOR: Record<AtlasStage, string> = {
  new:        'bg-slate-500',
  introduced: 'bg-indigo-400',
  drilling:   'bg-amber-400',
  activate:   'bg-white/80',
  mastered:   'bg-emerald-400',
}

const STAGE_ORDER: AtlasStage[] = ['mastered', 'activate', 'drilling', 'introduced', 'new']

// ── Region card data ──────────────────────────────────────────────────────────

interface RegionCardData {
  theme: string
  nodes: AtlasNode[]
  stageCounts: Record<AtlasStage, number>
}

function buildRegionCards(layout: AtlasLayout): {
  cards: RegionCardData[]
  unthemed: AtlasNode[]
} {
  const themeMap = new Map<string, AtlasNode[]>()

  // Map nodes to their themes via regions
  for (const node of layout.nodes) {
    // We don't have the original VocabItem here, but we stored term.
    // Themes are stored per region — we need to back-map nodes to themes.
    // Since we placed nodes per-theme during layout, we rely on the regions list.
    // We'll re-derive by checking which region each node is closest to.
    // (Simple approach: already done in layout — region list gives us centroids.
    //  We assign node to closest region centroid.)
    let bestTheme: string | null = null
    let bestDist2 = Infinity
    for (const region of layout.regions) {
      const dx = node.x - region.cx
      const dy = node.y - region.cy
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist2) {
        bestDist2 = d2
        bestTheme = region.theme
      }
    }

    // Only assign to a region if within 1.5× its major axis
    const region = bestTheme ? layout.regions.find((r) => r.theme === bestTheme)! : null
    const withinRegion = region
      ? bestDist2 < (Math.max(region.rx, region.ry) * 1.5) ** 2
      : false

    if (bestTheme && withinRegion) {
      if (!themeMap.has(bestTheme)) themeMap.set(bestTheme, [])
      themeMap.get(bestTheme)!.push(node)
    }
    // Nodes far from any region are "unthemed" but we won't show them separately on mobile
  }

  const cards: RegionCardData[] = layout.regions.map((region) => {
    const nodes = themeMap.get(region.theme) ?? []
    const stageCounts: Record<AtlasStage, number> = {
      new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0,
    }
    for (const n of nodes) stageCounts[n.stage]++
    return { theme: region.theme, nodes, stageCounts }
  })

  // Sort by node count desc
  cards.sort((a, b) => b.nodes.length - a.nodes.length)

  return { cards, unthemed: [] }
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
            className={`h-full ${STAGE_COLOR[stage]} opacity-80`}
            style={{ width: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}

// ── Word chip list ─────────────────────────────────────────────────────────────

function WordList({ nodes }: { nodes: AtlasNode[] }) {
  const sorted = [...nodes].sort((a, b) => {
    const aIdx = STAGE_ORDER.indexOf(a.stage)
    const bIdx = STAGE_ORDER.indexOf(b.stage)
    return aIdx - bIdx
  })

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sorted.map((n) => (
        <span
          key={n.id}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300"
        >
          {n.term}
        </span>
      ))}
    </div>
  )
}

// ── Region card ───────────────────────────────────────────────────────────────

function RegionCard({ card }: { card: RegionCardData }) {
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
          <p className="mt-0.5 text-xs text-slate-500">{card.nodes.length} word{card.nodes.length !== 1 ? 's' : ''}</p>
          <StageBar counts={card.stageCounts} total={card.nodes.length} />
        </div>
        <div className="shrink-0 text-slate-600">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </button>

      {open && card.nodes.length > 0 && <WordList nodes={card.nodes} />}
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
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-200">{total} words in your vocabulary</p>
        <StageBar counts={stageCounts} total={total} />
      </div>
      <div className="flex gap-2">
        {STAGE_ORDER.slice(0, 3).map((stage) => stageCounts[stage] > 0 && (
          <div key={stage} className="text-center">
            <div className={`h-2 w-2 mx-auto rounded-full ${STAGE_COLOR[stage]}`} />
            <p className="mt-0.5 text-[10px] text-slate-600">{stageCounts[stage]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MobileAtlasView ───────────────────────────────────────────────────────────

interface MobileAtlasViewProps {
  layout: AtlasLayout
}

export function MobileAtlasView({ layout }: MobileAtlasViewProps) {
  const { cards } = useMemo(() => buildRegionCards(layout), [layout])

  return (
    <div
      className="h-full overflow-y-auto overscroll-contain px-4 py-5"
      style={{ background: '#08111f' }}
    >
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-lg font-bold text-slate-100">Language Atlas</h1>
          <p className="mt-0.5 text-xs text-slate-500">Your vocabulary, by region</p>
        </div>

        <SummaryRow layout={layout} />

        {/* Region cards */}
        {cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">
            Add words with themes to see your Atlas regions.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cards.map((card) => (
              <RegionCard key={card.theme} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
