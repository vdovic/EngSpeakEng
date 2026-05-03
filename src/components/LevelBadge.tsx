/**
 * LevelBadge.tsx
 *
 * Compact pill showing a vocabulary item's learning level (0–3).
 *
 *   0 = New       (gray)
 *   1 = Learning  (orange)
 *   2 = Familiar  (blue)
 *   3 = Mastered  (green)
 *
 * Uses `item.level` when stored; falls back to `deriveLevel(item)`.
 * compact=true renders a smaller coloured dot instead of the full label pill.
 */

import type { VocabItem, Level } from '@/types/vocabulary'
import { deriveLevel } from '@/lib/progressionLogic'

// ── Config ────────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  Level,
  { label: string; pill: string; dot: string }
> = {
  0: {
    label: 'New',
    pill: 'bg-slate-100 text-slate-500 border-slate-200',
    dot:  'bg-slate-400',
  },
  1: {
    label: 'Learning',
    pill: 'bg-orange-50 text-orange-600 border-orange-200',
    dot:  'bg-orange-400',
  },
  2: {
    label: 'Familiar',
    pill: 'bg-blue-50 text-blue-600 border-blue-200',
    dot:  'bg-blue-400',
  },
  3: {
    label: 'Mastered',
    pill: 'bg-green-50 text-green-600 border-green-200',
    dot:  'bg-green-400',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface LevelBadgeProps {
  item: VocabItem
  /** compact=true renders a small dot instead of the full label pill */
  compact?: boolean
  className?: string
}

export function LevelBadge({ item, compact = false, className = '' }: LevelBadgeProps) {
  const lvl: Level = item.level ?? deriveLevel(item)
  const cfg = LEVEL_CONFIG[lvl]

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${className}`}
        title={cfg.label}
        aria-label={`Level: ${cfg.label}`}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.pill} ${className}`}
      aria-label={`Level: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  )
}
