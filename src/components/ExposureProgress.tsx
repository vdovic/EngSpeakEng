/**
 * ExposureProgress.tsx
 *
 * Visual indicator for Daily Challenge exposure progress (0 – 8 steps).
 *
 * Default (compact=false): row of 8 dots + "N/8" text label.
 * Compact: dots only — useful when space is tight.
 *
 * Accessibility: a title attribute describes the current band in plain English.
 */

import { MAX_EXPOSURE } from '@/lib/constants'

// ── Band helpers ──────────────────────────────────────────────────────────────

/**
 * Returns a human-readable description of the learner's exposure band.
 *   0   → Not started
 *   1–2 → Early learning
 *   3–7 → Building familiarity
 *   8   → Challenge complete
 */
export function exposureBandLabel(count: number): string {
  const n = Math.min(Math.max(0, count), MAX_EXPOSURE)
  if (n === 0)            return 'Not started'
  if (n <= 2)             return 'Early learning'
  if (n < MAX_EXPOSURE)   return 'Building familiarity'
  return 'Challenge complete'
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ExposureProgressProps {
  /** Raw exposure count (clamped to [0, MAX_EXPOSURE]). Defaults to 0. */
  exposureCount?: number
  /** compact=true hides the N/8 text label, showing dots only. */
  compact?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

export function ExposureProgress({
  exposureCount = 0,
  compact = false,
  className = '',
}: ExposureProgressProps) {
  const filled = Math.min(Math.max(0, exposureCount), MAX_EXPOSURE)
  const band   = exposureBandLabel(filled)

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={`Daily Challenge: ${filled}/${MAX_EXPOSURE} — ${band}`}
      aria-label={`Challenge progress: ${filled} of ${MAX_EXPOSURE} steps. ${band}.`}
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

      {/* N/MAX label — hidden in compact mode */}
      {!compact && (
        <span className="text-[10px] tabular-nums text-slate-400 leading-none">
          {filled}/{MAX_EXPOSURE}
        </span>
      )}
    </div>
  )
}
