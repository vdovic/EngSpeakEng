/**
 * AtlasPage.tsx
 *
 * The Language Atlas — your vocabulary as a living spatial universe.
 *
 * Desktop: full-viewport Canvas 2D atlas (pan + zoom + click).
 * Mobile (<768px): guided regional atlas with theme cards.
 *
 * ── State ────────────────────────────────────────────────────────────────────
 *
 *   lens          — interpretive lens: progress / vitality / confidence
 *   isFutureMode  — whether the projected "Future You" layout is shown
 *   selectedNodeId / cardPos — which node's word card is open and where
 *
 * ── Layout computation ───────────────────────────────────────────────────────
 *
 *   realLayout    — live vocabulary, computed once per items change
 *   futureLayout  — projected ~6-month simulation, derived from realLayout
 *   effectiveLayout — whichever is displayed (toggled by isFutureMode)
 *
 * The layout is read-only — Atlas never modifies vocabulary data.
 */

import { useMemo, useState, useCallback } from 'react'
import { useVocabStore } from '@/store/vocabStore'
import { computeAtlasLayout, projectAtlasLayout } from '@/lib/atlasLayout'
import type { AtlasLens, AtlasNode } from '@/lib/atlasLayout'
import type { VocabItem } from '@/types/vocabulary'
import { AtlasCanvas }   from '@/components/atlas/AtlasCanvas'
import { AtlasControls } from '@/components/atlas/AtlasControls'
import { AtlasWordCard } from '@/components/atlas/AtlasWordCard'
import { MobileAtlasView } from '@/components/atlas/MobileAtlasView'

export default function AtlasPage() {
  const items = useVocabStore((s) => s.items)

  // ── Layout ────────────────────────────────────────────────────────────────
  const realLayout   = useMemo(() => computeAtlasLayout(items), [items])
  const futureLayout = useMemo(() => projectAtlasLayout(realLayout), [realLayout])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [lens,          setLens]          = useState<AtlasLens>('progress')
  const [isFutureMode,  setIsFutureMode]  = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [cardPos,        setCardPos]        = useState<{ x: number; y: number } | null>(null)

  const effectiveLayout = isFutureMode ? futureLayout : realLayout

  // ── Item lookup for word card ─────────────────────────────────────────────
  const itemMap = useMemo(() => {
    const m = new Map<string, VocabItem>()
    for (const item of items) m.set(item.id, item)
    return m
  }, [items])

  const selectedItem = selectedNodeId ? itemMap.get(selectedNodeId) : undefined
  const selectedNode = selectedNodeId
    ? effectiveLayout.nodes.find((n) => n.id === selectedNodeId)
    : undefined

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    (node: AtlasNode, screenX: number, screenY: number) => {
      if (selectedNodeId === node.id) {
        // Second click on same node → close card
        setSelectedNodeId(null)
        setCardPos(null)
      } else {
        setSelectedNodeId(node.id)
        setCardPos({ x: screenX, y: screenY })
      }
    },
    [selectedNodeId],
  )

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setCardPos(null)
  }, [])

  const handleToggleFuture = useCallback(() => {
    setIsFutureMode((f) => !f)
    clearSelection()   // close any open word card when switching modes
  }, [clearSelection])

  return (
    /*
     * Fixed overlay that fills the visible viewport.
     * md:left-56 accounts for the 224px sidebar.
     * bottom-16 accounts for the mobile bottom nav bar.
     */
    <div className="fixed inset-0 md:left-56 bottom-16 md:bottom-0 z-10 overflow-hidden">

      {/* ── Desktop: full-viewport canvas ── */}
      <div className="hidden md:flex h-full w-full overflow-hidden relative">

        <AtlasCanvas
          layout={effectiveLayout}
          lens={lens}
          isFutureMode={isFutureMode}
          onNodeClick={handleNodeClick}
        />

        {/* Future You banner */}
        {isFutureMode && (
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-center py-1.5 bg-amber-500/10 border-b border-amber-500/15 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <p className="text-[11px] text-amber-400/75 font-medium tracking-wide">
              Simulation · estimated progress in ~6 months · based on your vocabulary patterns · not a prediction
            </p>
          </div>
        )}

        {/* Lens selector + Future You toggle */}
        <AtlasControls
          lens={lens}
          onLensChange={setLens}
          isFutureMode={isFutureMode}
          onToggleFuture={handleToggleFuture}
        />

        {/* Inline word card */}
        {selectedItem && selectedNode && cardPos && (
          <AtlasWordCard
            item={selectedItem}
            node={selectedNode}
            screenX={cardPos.x}
            screenY={cardPos.y}
            onClose={clearSelection}
          />
        )}
      </div>

      {/* ── Mobile: guided regional atlas ── */}
      <div className="flex md:hidden h-full w-full overflow-hidden">
        <MobileAtlasView
          layout={realLayout}
          lens={lens}
          onLensChange={setLens}
        />
      </div>

    </div>
  )
}
