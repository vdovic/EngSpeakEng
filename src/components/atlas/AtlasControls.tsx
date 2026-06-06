/**
 * AtlasControls.tsx
 *
 * Minimal overlay controls for the Language Atlas.
 * Positioned over the canvas — not a panel, not a dashboard.
 *
 * Contains:
 *   • Lens selector (Progress / Vitality / Confidence)
 *   • Future You toggle
 *
 * Design intent: controls feel like they belong to the map, not to a UI shell.
 * Glass-morphism dark background, small type, subtle active state.
 */

import type { AtlasLens } from '@/lib/atlasLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AtlasControlsProps {
  lens: AtlasLens
  onLensChange: (lens: AtlasLens) => void
  isFutureMode: boolean
  onToggleFuture: () => void
  showExposurePanel: boolean
  onToggleExposurePanel: () => void
}

// ── Lens metadata ─────────────────────────────────────────────────────────────

const LENSES: { id: AtlasLens; label: string; description: string }[] = [
  { id: 'progress',   label: 'Progress',   description: 'Stage-based view: where each word is in your learning journey' },
  { id: 'vitality',   label: 'Vitality',   description: 'Recency view: which words are alive, which are dormant' },
  { id: 'confidence', label: 'Confidence', description: 'Comfort view: how natural each word feels to use' },
]

// ── AtlasControls ─────────────────────────────────────────────────────────────

export function AtlasControls({
  lens,
  onLensChange,
  isFutureMode,
  onToggleFuture,
  showExposurePanel,
  onToggleExposurePanel,
}: AtlasControlsProps) {
  return (
    <div
      className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none"
      aria-label="Atlas controls"
    >
      {/* Lens selector */}
      <div
        className="flex items-center gap-1 p-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/8 pointer-events-auto"
        role="group"
        aria-label="Atlas lens"
      >
        {LENSES.map(({ id, label, description }) => (
          <button
            key={id}
            onClick={() => onLensChange(id)}
            title={description}
            aria-pressed={lens === id}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
              lens === id
                ? 'bg-white/15 text-slate-100 shadow-inner'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Exposure levels panel toggle */}
      <button
        onClick={onToggleExposurePanel}
        title="Browse vocabulary by exposure level"
        className={`pointer-events-auto px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 backdrop-blur-sm border ${
          showExposurePanel
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25'
            : 'bg-black/30 text-slate-500 border-white/8 hover:text-slate-300'
        }`}
        aria-pressed={showExposurePanel}
      >
        Levels
      </button>

      {/* Future You toggle */}
      <button
        onClick={onToggleFuture}
        title={
          isFutureMode
            ? 'Return to your real Atlas'
            : 'See a simulation of your vocabulary in approximately 6 months'
        }
        className={`pointer-events-auto px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 backdrop-blur-sm border ${
          isFutureMode
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/25 hover:bg-amber-500/20'
            : 'bg-black/30 text-slate-500 border-white/8 hover:text-slate-300'
        }`}
        aria-pressed={isFutureMode}
      >
        {isFutureMode ? '← Return to now' : 'Future You ↗'}
      </button>
    </div>
  )
}
