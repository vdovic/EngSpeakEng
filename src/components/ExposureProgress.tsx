/**
 * ExposureProgress.tsx
 *
 * Visual indicator for Daily Challenge exposure progress (0 – MAX_EXPOSURE steps).
 *
 * Renders a row of dots coloured by completion state, with an optional N/8 label.
 * Supports a compact mode (dots only, no label) for tight card footers.
 */

import { MAX_EXPOSURE } from '@/lib/constants'

// ── Band helpers ──────────────────────────────────────────────────────────────

/** Human-readable label for the learner's exposure band. */
export function exposureBandLabel(count: number): string {
  if (count === 0) return 'Not started'
  if (count <= 2) return 'Early'
  if (count < MAX_EXPOSURE) return 'Building'
  return 'Complete'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Raw exposure count (clamped to [0, MAX_EXPOSURE]). */
  count: number
  /** Whether to render the N/8 counter next to the dots (default: true). */
  showLabel?: boolean
  /** Extra classes applied to the outer wrapper. */
  className?: string
}

export function ExposureProgress({ count, showLabel = true, className = '' }: Props) {
  const filled = Math.min(Math.max(0, count), MAX_EXPOSURE)

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={`Daily Challenge: ${filled}/${MAX_EXPOSURE} steps completed`}
    >
      {/* Dot track */}
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: MAX_EXPOSURE }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < filled ? 'bg-brand-400' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* N / MAX label */}
      {showLabel && (
        <span className="text-[10px] tabular-nums text-slate-400 leading-none">
          {filled}/{MAX_EXPOSURE}
        </span>
      )}
    </div>
  )
}
