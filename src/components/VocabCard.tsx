import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { VocabItem } from '@/types/vocabulary'
import { StatusBadge } from './StatusBadge'
import { TypeBadge } from './TypeBadge'
import { UsageProgress } from './UsageProgress'
import { usagePoints } from '@/lib/mastery'
import { format } from 'date-fns'

interface Props {
  item: VocabItem
  compact?: boolean
}

export function VocabCard({ item, compact = false }: Props) {
  const navigate = useNavigate()
  const usesDone = usagePoints(item.activation.usageLogs)
  const isPending = item.generationStatus === 'pending'
  const isFailed = item.generationStatus === 'failed'

  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-slate-900 text-base group-hover:text-brand-700 transition-colors leading-tight">
          {item.term}
        </span>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
          {/* Generation status badges */}
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

      {!compact && (item.status === 'activation' || item.status === 'mastered') && (
        <div className="mb-2">
          <UsageProgress done={usesDone} needed={3} size="sm" />
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
            #{tag}
          </span>
        ))}
        {item.review.nextReviewAt && item.status !== 'inbox' && (
          <span className="ml-auto">
            Next: {format(new Date(item.review.nextReviewAt), 'MMM d')}
          </span>
        )}
      </div>
    </button>
  )
}
