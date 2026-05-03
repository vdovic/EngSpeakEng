import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Star } from 'lucide-react'
import { VocabItem } from '@/types/vocabulary'
import { TypeBadge } from './TypeBadge'
import { LevelBadge } from './LevelBadge'
import { ExposureProgress } from './ExposureProgress'
import { UsageProgress } from './UsageProgress'
import { usagePoints } from '@/lib/mastery'
import { format } from 'date-fns'

interface Props {
  item: VocabItem
  compact?: boolean
  /** When provided, renders a star/focus toggle button at the card's top-right. */
  inFocus?: boolean
  onFocusToggle?: () => void
}

export function VocabCard({ item, compact = false, inFocus, onFocusToggle }: Props) {
  const navigate = useNavigate()
  const usesDone = usagePoints(item.activation.usageLogs)
  const isPending = item.generationStatus === 'pending'
  const isFailed  = item.generationStatus === 'failed'
  const hasFocusToggle = onFocusToggle !== undefined

  return (
    <div
      className={`relative bg-white border rounded-xl transition-all ${
        inFocus
          ? 'border-orange-300 ring-1 ring-orange-100'
          : 'border-slate-200 hover:border-brand-300 hover:shadow-sm'
      }`}
    >
      {/* Focus toggle button — top-right */}
      {hasFocusToggle && (
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

      {/* Main clickable area */}
      <button
        onClick={() => navigate(`/item/${item.id}`)}
        className="w-full text-left p-4 group"
      >
        {/* Top row: term + badges */}
        <div className={`flex items-start gap-2 mb-2 ${hasFocusToggle ? 'pr-7' : ''}`}>
          <span className="font-semibold text-slate-900 text-base group-hover:text-brand-700 transition-colors leading-tight flex-1 min-w-0">
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
                Generating definition and examples…
              </p>
            )}
            {!isPending && item.definitionEn && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{item.definitionEn}</p>
            )}
          </>
        )}

        {/* Usage progress (activation / mastered) */}
        {!compact && (item.status === 'activation' || item.status === 'mastered') && (
          <div className="mb-2">
            <UsageProgress done={usesDone} needed={3} size="sm" />
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          {/* Tags */}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
              #{tag}
            </span>
          ))}
          {/* Themes */}
          {(item.themes ?? []).slice(0, 2).map((theme) => (
            <span key={theme} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
              {theme}
            </span>
          ))}

          {/* Exposure progress — always shown */}
          <ExposureProgress count={item.exposureCount ?? 0} showLabel className="ml-auto" />

          {/* Next review date */}
          {item.review.nextReviewAt && item.status !== 'inbox' && (
            <span>
              Next: {format(new Date(item.review.nextReviewAt), 'MMM d')}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}
