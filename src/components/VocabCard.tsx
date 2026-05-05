/**
 * VocabCard.tsx
 *
 * Used in the Library page for non-inbox vocabulary items.
 * Supports:
 *   - navigation to detail page
 *   - focus toggle (star button)
 *   - bulk selection (checkbox)
 *   - LevelBadge + ExposureProgress on every card
 */

import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Star, Check } from 'lucide-react'
import { VocabItem } from '@/types/vocabulary'
import { TypeBadge } from './TypeBadge'
import { LevelBadge } from './LevelBadge'
import { ExposureProgress } from './ExposureProgress'
import { ConfidenceDots } from './ConfidenceDots'
import { useVocabStore } from '@/store/vocabStore'

interface Props {
  item: VocabItem
  compact?: boolean

  // ── Focus toggle ──────────────────────────────────────────────────────────
  /** Whether this item is currently in focus (controls star appearance). */
  inFocus?: boolean
  /** Called when user clicks the star to add or remove from focus. */
  onFocusToggle?: () => void

  // ── Selection (bulk mode) ────────────────────────────────────────────────
  /** Whether this card is currently selected. */
  selected?: boolean
  /** Providing this prop renders a checkbox and enables selection mode. */
  onSelect?: (id: string, checked: boolean) => void
}

export function VocabCard({
  item,
  compact = false,
  inFocus,
  onFocusToggle,
  selected = false,
  onSelect,
}: Props) {
  const navigate           = useNavigate()
  const setConfidenceLevel = useVocabStore((s) => s.setConfidenceLevel)
  const isPending          = item.generationStatus === 'pending'
  const isFailed           = item.generationStatus === 'failed'
  const hasCheckbox        = onSelect !== undefined
  const hasFocusStar       = onFocusToggle !== undefined

  return (
    <div
      className={`relative bg-white border rounded-xl transition-all ${
        selected
          ? 'border-brand-300 ring-1 ring-brand-200 shadow-sm'
          : inFocus
            ? 'border-orange-200 ring-1 ring-orange-100'
            : 'border-slate-200'
      }`}
    >
      {/* ── Checkbox (selection mode) — top-left ── */}
      {hasCheckbox && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(item.id, !selected) }}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'border-brand-600 bg-brand-600'
              : 'border-slate-300 hover:border-brand-400 bg-white'
          }`}
        >
          {selected && <Check size={11} className="text-white" />}
        </button>
      )}

      {/* ── Focus star — top-right ── */}
      {hasFocusStar && (
        <button
          onClick={(e) => { e.stopPropagation(); onFocusToggle() }}
          title={inFocus ? 'Remove from My Current Focus' : 'Add to My Current Focus'}
          className={`absolute top-2.5 right-2.5 z-10 p-1 rounded-lg transition-colors ${
            inFocus
              ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
              : 'text-slate-300 hover:text-orange-400 hover:bg-orange-50'
          }`}
        >
          <Star size={14} fill={inFocus ? 'currentColor' : 'none'} />
        </button>
      )}

      {/* ── Main clickable area ── */}
      <button
        onClick={() => navigate(`/item/${item.id}`)}
        className={`w-full text-left p-4 group hover:bg-slate-50/50 rounded-xl transition-colors ${
          hasCheckbox ? 'pl-10' : ''
        } ${hasFocusStar ? 'pr-9' : ''}`}
      >
        {/* Term + badges row */}
        <div className="flex items-start gap-2 mb-2">
          <span className="font-semibold text-slate-900 text-sm group-hover:text-brand-700 transition-colors leading-tight flex-1 min-w-0">
            {item.term}
          </span>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <TypeBadge type={item.type} />
            <LevelBadge item={item} />
            {isPending && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                <Loader2 size={9} className="animate-spin" />
                Generating…
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                <AlertCircle size={9} />
                Failed
              </span>
            )}
          </div>
        </div>

        {/* Definition */}
        {!compact && (
          <>
            {isPending && !item.definitionEn && (
              <p className="text-sm text-slate-400 italic mb-2 animate-pulse">
                Generating definition…
              </p>
            )}
            {!isPending && item.definitionEn && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2 leading-snug">
                {item.definitionEn}
              </p>
            )}
          </>
        )}

        {/* Footer row: tags · themes · exposure */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
              #{tag}
            </span>
          ))}
          {(item.themes ?? []).slice(0, 2).map((theme) => (
            <span key={theme} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
              {theme}
            </span>
          ))}

          {/* Exposure dots + count — always shown */}
          <ExposureProgress
            exposureCount={item.exposureCount ?? 0}
            compact={compact}
            className="ml-auto"
          />
        </div>
      </button>

      {/* Confidence dots — interactive, outside navigate button to avoid conflict */}
      {!compact && item.status !== 'inbox' && (
        <div
          className="px-4 pb-3 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-slate-400">Comfort:</span>
          <ConfidenceDots
            item={item}
            onChange={(level) => setConfidenceLevel(item.id, level)}
            compact
          />
        </div>
      )}
    </div>
  )
}
