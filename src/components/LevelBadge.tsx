/**
 * LevelBadge.tsx
 *
 * Compact pill that shows a vocabulary item's learning level (0–3).
 * Accepts either a `level` value directly or an `item` to derive from.
 *
 *   0 = New       (gray)
 *   1 = Learning  (orange)
 *   2 = Familiar  (blue)
 *   3 = Mastered  (green)
 */

import type { VocabItem, Level } from '@/types/vocabulary'
import { deriveLevel } from '@/lib/progressionLogic'

// ── Config ────────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<Level, { label: string; className: string }> = {
  0: { label: 'New',      className: 'bg-slate-100 text-slate-500 border-slate-200' },
  1: { label: 'Learning', className: 'bg-orange-50 text-orange-600 border-orange-200' },
  2: { label: 'Familiar', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  3: { label: 'Mastered', className: 'bg-green-50 text-green-600 border-green-200' },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** Pass the item and the level is derived automatically. */
  item?: VocabItem
  /** Pass a level directly (takes precedence over item). */
  level?: Level
  className?: string
}

export function LevelBadge({ item, level, className = '' }: Props) {
  const lvl: Level =
    level !== undefined
      ? level
      : item !== undefined
        ? (item.level ?? deriveLevel(item))
        : 0

  const { label, className: cls } = LEVEL_CONFIG[lvl]

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${cls} ${className}`}
    >
      {label}
    </span>
  )
}
