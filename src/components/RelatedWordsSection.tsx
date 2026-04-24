import { useNavigate } from 'react-router-dom'
import { Link2, ChevronRight, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { RelatedEntry, RelationshipType } from '@/types/vocabulary'

interface Props {
  entries: RelatedEntry[]
  /** undefined = not fetched yet, 'pending' = loading, 'complete' = done, 'failed' = error */
  status?: 'pending' | 'complete' | 'failed'
  /** Called when user clicks "Generate" (only shown when status is undefined and entries are empty) */
  onGenerate?: () => void
}

// ── Relationship labels and colours ──────────────────────────────────────────

const TYPE_META: Record<
  RelationshipType,
  { label: string; dot: string }
> = {
  meaning:       { label: 'Meaning',       dot: 'bg-indigo-400' },
  usage_context: { label: 'Usage',         dot: 'bg-sky-400' },
  nuance:        { label: 'Nuance',        dot: 'bg-violet-400' },
  etymology:     { label: 'Etymology',     dot: 'bg-amber-400' },
  word_family:   { label: 'Word family',   dot: 'bg-emerald-400' },
  similar_form:  { label: 'Similar form',  dot: 'bg-rose-400' },
  confusable:    { label: 'Confusable',    dot: 'bg-red-400' },
}

const DIRECTION_LABEL: Record<string, string> = {
  synonym:      'synonym',
  contrast:     'contrast',
  same_family:  'same family',
  soundalike:   'sounds like',
  same_context: 'same context',
  confusable:   'confusable',
}

function StrengthDots({ strength }: { strength: 1 | 2 | 3 }) {
  return (
    <span className="flex gap-0.5 items-center" title={`Strength ${strength}/3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`w-1.5 h-1.5 rounded-full ${n <= strength ? 'bg-indigo-400' : 'bg-indigo-100'}`}
        />
      ))}
    </span>
  )
}

function RelatedCard({ entry }: { entry: RelatedEntry }) {
  const navigate = useNavigate()
  const meta = TYPE_META[entry.relationshipType] ?? TYPE_META.meaning

  return (
    <button
      onClick={() => navigate(`/item/${entry.id}`)}
      className="w-full text-left bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-xl px-3.5 py-3 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Term + direction badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {entry.term}
            </span>
            {entry.direction && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                {DIRECTION_LABEL[entry.direction] ?? entry.direction}
              </span>
            )}
          </div>

          {/* Relationship type + strength */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {meta.label}
            </span>
            <StrengthDots strength={entry.strength} />
          </div>

          {/* Explanation */}
          <p className="text-xs text-slate-500 leading-relaxed">{entry.explanation}</p>
        </div>

        <ChevronRight
          size={14}
          className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors mt-0.5"
        />
      </div>
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function RelatedWordsSection({ entries, status, onGenerate }: Props) {
  // Loading state
  if (status === 'pending') {
    return (
      <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/30">
        <SectionHeader />
        <div className="px-4 py-5 flex items-center gap-2 text-indigo-500">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span className="text-xs">Finding related words in your library…</span>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'failed') {
    return (
      <div className="border border-indigo-100 rounded-xl overflow-hidden">
        <SectionHeader />
        <div className="px-4 py-4 flex items-start gap-2 text-slate-500">
          <AlertCircle size={14} className="shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-600">
              Couldn't load related words.
            </p>
            {onGenerate && (
              <button
                onClick={onGenerate}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Not yet generated (no status, no entries)
  if (status === undefined && entries.length === 0) {
    return (
      <div className="border border-indigo-100 rounded-xl overflow-hidden">
        <SectionHeader />
        <div className="px-4 py-4 flex items-start gap-2">
          <Sparkles size={14} className="shrink-0 text-indigo-300 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">
              No related words found in your library yet.
            </p>
            {onGenerate && (
              <button
                onClick={onGenerate}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Find related words
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Complete with no results
  if (status === 'complete' && entries.length === 0) {
    return (
      <div className="border border-indigo-100 rounded-xl overflow-hidden">
        <SectionHeader />
        <div className="px-4 py-4">
          <p className="text-xs text-slate-400 italic">
            No related words found in your library for this item.
          </p>
        </div>
      </div>
    )
  }

  // Has entries
  return (
    <div className="border border-indigo-100 rounded-xl overflow-hidden">
      <SectionHeader count={entries.length} />
      <div className="px-3 py-3 space-y-2">
        {entries
          .slice()
          .sort((a, b) => b.strength - a.strength)
          .map((entry) => (
            <RelatedCard key={entry.id} entry={entry} />
          ))}
      </div>
    </div>
  )
}

function SectionHeader({ count }: { count?: number }) {
  return (
    <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-2 border-b border-indigo-100">
      <Link2 size={14} className="text-indigo-400 shrink-0" />
      <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex-1">
        Related in your library
      </h3>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-100 rounded-full px-2 py-0.5">
          {count}
        </span>
      )}
    </div>
  )
}
