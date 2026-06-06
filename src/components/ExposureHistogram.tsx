/**
 * ExposureHistogram — Vocabulary Portfolio Distribution
 *
 * Primary analytics visualization: shows how many words sit at each
 * exposure level (0–8) and how many are mastered.
 *
 * Design principles:
 * - One row per level; bars proportional to the largest count
 * - Color zones communicate progress bands at a glance
 * - Mastered words are separated from the drilling ladder
 * - Mobile-first layout: bar + count + percentage fit in ~300px
 */

import { useMemo } from 'react'
import { getCanonicalLevel } from '@/lib/progressionLogic'
import type { VocabItem } from '@/types/vocabulary'

// ── Color zones ───────────────────────────────────────────────────────────────

interface BucketDef {
  key:       string
  label:     string
  barClass:  string   // Tailwind bg color class
  zone:      string   // zone name for legend
  zoneColor: string   // Tailwind text color for legend dot
}

const BUCKETS: BucketDef[] = [
  { key: '0',        label: '0',  barClass: 'bg-slate-300',   zone: 'Untouched',    zoneColor: 'bg-slate-400'   },
  { key: '1',        label: '1',  barClass: 'bg-sky-300',     zone: 'Introduced',   zoneColor: 'bg-sky-400'     },
  { key: '2',        label: '2',  barClass: 'bg-sky-400',     zone: 'Introduced',   zoneColor: 'bg-sky-400'     },
  { key: '3',        label: '3',  barClass: 'bg-amber-300',   zone: 'Drilling',     zoneColor: 'bg-amber-400'   },
  { key: '4',        label: '4',  barClass: 'bg-amber-400',   zone: 'Drilling',     zoneColor: 'bg-amber-400'   },
  { key: '5',        label: '5',  barClass: 'bg-amber-400',   zone: 'Drilling',     zoneColor: 'bg-amber-400'   },
  { key: '6',        label: '6',  barClass: 'bg-orange-300',  zone: 'Near mastery', zoneColor: 'bg-orange-400'  },
  { key: '7',        label: '7',  barClass: 'bg-orange-400',  zone: 'Near mastery', zoneColor: 'bg-orange-400'  },
  { key: 'activate', label: '8',  barClass: 'bg-violet-400',  zone: 'Activate',     zoneColor: 'bg-violet-400'  },
  { key: 'mastered', label: '✓',  barClass: 'bg-emerald-500', zone: 'Mastered',     zoneColor: 'bg-emerald-500' },
]

// Unique zone labels in order (for legend)
const LEGEND_ZONES: Array<{ zone: string; dotClass: string }> = [
  { zone: 'Untouched',    dotClass: 'bg-slate-400'   },
  { zone: 'Introduced',   dotClass: 'bg-sky-400'     },
  { zone: 'Drilling',     dotClass: 'bg-amber-400'   },
  { zone: 'Near mastery', dotClass: 'bg-orange-400'  },
  { zone: 'Activate',     dotClass: 'bg-violet-400'  },
  { zone: 'Mastered',     dotClass: 'bg-emerald-500' },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface ExposureHistogramProps {
  items: VocabItem[]
}

export function ExposureHistogram({ items }: ExposureHistogramProps) {
  const { counts, total, maxCount } = useMemo(() => {
    const c: Record<string, number> = {
      '0': 0, '1': 0, '2': 0, '3': 0, '4': 0,
      '5': 0, '6': 0, '7': 0, 'activate': 0, 'mastered': 0,
    }

    for (const item of items) {
      if (item.archived) continue
      if (getCanonicalLevel(item) === 3) {
        c['mastered']++
      } else {
        const exp = Math.min(item.exposureCount ?? 0, 8)
        if (exp === 8) c['activate']++
        else           c[String(exp)]++
      }
    }

    const total    = Object.values(c).reduce((s, n) => s + n, 0)
    const maxCount = Math.max(...Object.values(c), 1)
    return { counts: c, total, maxCount }
  }, [items])

  if (total === 0) return null

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
          Portfolio distribution
        </span>
        <span className="text-xs text-slate-400 tabular-nums">{total.toLocaleString()} words</span>
      </div>

      {/* Histogram rows */}
      <div className="space-y-1.5" role="list" aria-label="Vocabulary distribution by exposure level">
        {BUCKETS.map(({ key, label, barClass }) => {
          const count = counts[key]
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0

          return (
            <div
              key={key}
              className="flex items-center gap-2"
              role="listitem"
              aria-label={`Level ${label}: ${count} words (${pct}%)`}
            >
              {/* Level label */}
              <span className="w-5 shrink-0 text-right font-mono text-[11px] text-slate-400 select-none">
                {label}
              </span>

              {/* Bar track */}
              <div className="flex-1 h-[14px] bg-slate-100 rounded-sm overflow-hidden">
                {count > 0 && (
                  <div
                    className={`h-full rounded-sm ${barClass}`}
                    style={{ width: `${width}%` }}
                  />
                )}
              </div>

              {/* Count */}
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-700 font-medium">
                {count > 0 ? count.toLocaleString() : '–'}
              </span>

              {/* Percentage */}
              <span className="w-7 shrink-0 text-[11px] tabular-nums text-slate-400">
                {count > 0 ? `${pct}%` : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Zone legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {LEGEND_ZONES.map(({ zone, dotClass }) => (
          <span key={zone} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
            {zone}
          </span>
        ))}
      </div>
    </div>
  )
}
