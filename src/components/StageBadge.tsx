/**
 * StageBadge.tsx
 *
 * Compact learner-facing badge for the 5-stage progression model:
 *
 *   new        → slate   — not yet practiced
 *   introduced → sky     — 1–2 challenge exposures
 *   drilling   → amber   — 3–7 challenge exposures (active SRS)
 *   activate   → violet  — training complete, real-life use needed
 *   mastered   → emerald — drilled and used in real life
 *
 * Always derives stage from live item data via getDisplayStage() — never
 * reads a pre-computed or stored stage value.
 *
 * Two rendering modes:
 *   compact=false (default) — colored pill: background + text label (no inner dot)
 *   compact=true            — colored dot only (for tight row layouts)
 *
 * The "activate" stage uses a visually distinct treatment because it is the
 * only stage that requires action outside the app.  Its violet color stands
 * apart from the amber→emerald progression of the other stages.
 */

import type { VocabItem } from '@/types/vocabulary'
import {
  getDisplayStage,
  DISPLAY_STAGE_LABEL,
  DISPLAY_STAGE_DESCRIPTION,
  type DisplayStage,
} from '@/lib/progressionLogic'

// ── Per-stage config ──────────────────────────────────────────────────────────

interface StageConfig {
  /** Tailwind classes for the full pill (dot + label). */
  pill: string
  /** Tailwind class for the dot in both modes. */
  dot: string
}

const STAGE_CONFIG: Record<DisplayStage, StageConfig> = {
  new: {
    pill: 'bg-slate-50 text-slate-500 border-slate-200',
    dot:  'bg-slate-400',
  },
  introduced: {
    pill: 'bg-sky-50 text-sky-700 border-sky-200',
    dot:  'bg-sky-500',
  },
  drilling: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot:  'bg-amber-500',
  },
  activate: {
    // Deliberately more prominent than the other stages:
    // violet stands apart to signal "do something different now."
    pill: 'bg-violet-50 text-violet-700 border-violet-200',
    dot:  'bg-violet-500',
  },
  mastered: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot:  'bg-emerald-600',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface StageBadgeProps {
  item: VocabItem
  /** compact=true renders a small colored dot instead of the full label pill. */
  compact?: boolean
  className?: string
}

export function StageBadge({ item, compact = false, className = '' }: StageBadgeProps) {
  // Always derive from live item data — never trust a pre-computed stage.
  const stage = getDisplayStage(item)
  const cfg   = STAGE_CONFIG[stage]
  const label = DISPLAY_STAGE_LABEL[stage]
  const desc  = DISPLAY_STAGE_DESCRIPTION[stage]

  // Accessible label for screen readers: includes both stage name and description.
  const ariaLabel = `Stage: ${label} — ${desc}`

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${className}`}
        title={label}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.pill} ${className}`}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  )
}
