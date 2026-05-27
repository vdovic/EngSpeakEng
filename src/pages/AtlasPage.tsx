/**
 * AtlasPage.tsx
 *
 * The Language Atlas — your vocabulary as a living spatial universe.
 *
 * Desktop: full-viewport Canvas 2D atlas (pan + zoom).
 * Mobile (<768px): regional card list companion (MobileAtlasView).
 *
 * The layout is computed once per mount from the live vocabulary store.
 * No controls, no filters, no settings — pure exploration.
 */

import { useMemo } from 'react'
import { useVocabStore } from '@/store/vocabStore'
import { computeAtlasLayout } from '@/lib/atlasLayout'
import { AtlasCanvas } from '@/components/atlas/AtlasCanvas'
import { MobileAtlasView } from '@/components/atlas/MobileAtlasView'

export default function AtlasPage() {
  const items  = useVocabStore((s) => s.items)

  const layout = useMemo(() => computeAtlasLayout(items), [items])

  return (
    /*
     * Fixed overlay that fills the visible viewport.
     * On desktop: left-56 accounts for the 224px sidebar (w-56).
     * On mobile: bottom-16 accounts for the 64px bottom nav bar.
     * z-10 sits below modals (z-50) but above content.
     */
    <div className="fixed inset-0 md:left-56 bottom-16 md:bottom-0 z-10 overflow-hidden">
      {/* Desktop: full-viewport canvas */}
      <div className="hidden md:flex h-full w-full overflow-hidden">
        <AtlasCanvas layout={layout} />
      </div>

      {/* Mobile: regional card list */}
      <div className="flex md:hidden h-full w-full overflow-hidden">
        <MobileAtlasView layout={layout} />
      </div>
    </div>
  )
}
