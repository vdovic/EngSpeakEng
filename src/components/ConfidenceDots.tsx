/**
 * ConfidenceDots.tsx
 *
 * Lightweight 3-dot confidence indicator for real-life usage comfort.
 * Replaces the heavy LogUsageModal as the primary usage signal.
 *
 *   ● ○ ○  — level 1 (red)    "Not comfortable yet"
 *   ● ● ○  — level 2 (yellow) "Somewhat comfortable"
 *   ● ● ●  — level 3 (green)  "Comfortable using it"
 *   ○ ○ ○  — level 0 / unset
 *
 * Tapping a dot sets the confidence to that level (or clears it if already set).
 * The component is purely presentational when `onChange` is omitted.
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfidenceLevel = 0 | 1 | 2 | 3

interface ConfidenceDotsProps {
  /** Full VocabItem (reads activation.confidenceLevel). Used in most contexts. */
  item?: VocabItem
  /** Override: pass value directly (ignores item). Useful when item isn't available. */
  value?: ConfidenceLevel
  /** Called when a dot is clicked with the new confidence level (0 = cleared). */
  onChange?: (level: ConfidenceLevel) => void
  /** Show dots smaller, without labels (for library cards and compact rows). */
  compact?: boolean
  /** Extra class applied to the container. */
  className?: string
}

// ── Dot colours ───────────────────────────────────────────────────────────────

const DOT_CONFIGS = [
  {
    level: 1 as ConfidenceLevel,
    title: 'Not comfortable yet',
    // Red
    filled: 'bg-rose-500 border-rose-500',
    empty:  'bg-transparent border-slate-300 hover:border-rose-400',
  },
  {
    level: 2 as ConfidenceLevel,
    title: 'Somewhat comfortable',
    // Yellow / amber
    filled: 'bg-amber-400 border-amber-400',
    empty:  'bg-transparent border-slate-300 hover:border-amber-400',
  },
  {
    level: 3 as ConfidenceLevel,
    title: 'Comfortable using it',
    // Green
    filled: 'bg-emerald-500 border-emerald-500',
    empty:  'bg-transparent border-slate-300 hover:border-emerald-500',
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfidenceDots({
  item,
  value,
  onChange,
  compact = false,
  className = '',
}: ConfidenceDotsProps) {
  // Resolve current level: explicit value > item.activation.confidenceLevel > 0
  const current: ConfidenceLevel =
    value !== undefined
      ? value
      : ((item?.activation?.confidenceLevel ?? 0) as ConfidenceLevel)

  const interactive = !!onChange

  function handleClick(dotLevel: ConfidenceLevel) {
    if (!onChange) return
    // Toggle off if clicking the already-active dot
    const next: ConfidenceLevel = dotLevel === current ? 0 : dotLevel
    onChange(next)
  }

  const dotSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
  const gap     = compact ? 'gap-0.5'    : 'gap-1'

  return (
    <div
      className={`inline-flex items-center ${gap} ${className}`}
      aria-label={`Confidence level: ${current === 0 ? 'not set' : DOT_CONFIGS[current - 1]?.title ?? ''}`}
    >
      {DOT_CONFIGS.map((cfg) => {
        const isFilled = current >= cfg.level
        return (
          <button
            key={cfg.level}
            type="button"
            disabled={!interactive}
            title={cfg.title}
            aria-label={cfg.title}
            onClick={() => handleClick(cfg.level)}
            className={[
              // Expanded hit area for desktop mouse clicks (visual dot sits inside)
              'p-1.5 -m-1.5 flex items-center justify-center rounded-full',
              interactive ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            <span
              className={[
                `${dotSize} rounded-full border transition-all block`,
                isFilled ? cfg.filled : cfg.empty,
              ].join(' ')}
            />
          </button>
        )
      })}

      {/* Label — shown only in non-compact mode when a level is set */}
      {!compact && current > 0 && (
        <span className="ml-1 text-xs text-slate-400">
          {DOT_CONFIGS[current - 1]?.title}
        </span>
      )}
    </div>
  )
}

// ── Utility: colour class for a given level (for external consumers) ──────────

export function confidenceColorClass(level: ConfidenceLevel | undefined): string {
  switch (level) {
    case 1: return 'text-rose-500'
    case 2: return 'text-amber-400'
    case 3: return 'text-emerald-500'
    default: return 'text-slate-300'
  }
}
