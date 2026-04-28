import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, GraduationCap } from 'lucide-react'
import { VocabItem } from '@/types/vocabulary'
import { StatusBadge } from './StatusBadge'
import { TypeBadge } from './TypeBadge'
import { UsageProgress } from './UsageProgress'
import { usagePoints } from '@/lib/mastery'
import { MAX_EXPOSURE } from '@/lib/constants'
import { format } from 'date-fns'

function ExposureDots({ count }: { count: number }) {
  const filled = Math.min(count, MAX_EXPOSURE)
  return (
    <div className="flex gap-0.5 items-center" title={`Challenge: ${filled}/${MAX_EXPOSURE} steps`}>
      {Array.from({ length: MAX_EXPOSURE }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-brand-400' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

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
          {item.learned ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700">
              <GraduationCap size={10} />
              LEARNED
            </span>
          ) : (
            <StatusBadge status={item.status} />
          )}
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
        {(item.themes ?? []).slice(0, 2).map((theme) => (
          <span key={theme} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
            {theme}
          </span>
        ))}
        {(item.exposureCount ?? 0) > 0 && (
          <ExposureDots count={item.exposureCount ?? 0} />
        )}
        {item.review.nextReviewAt && item.status !== 'inbox' && (
          <span className="ml-auto">
            Next: {format(new Date(item.review.nextReviewAt), 'MMM d')}
          </span>
        )}
      </div>
    </button>
  )
}
