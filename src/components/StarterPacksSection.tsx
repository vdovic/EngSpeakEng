import { useEffect, useState } from 'react'
import { BookOpen, Download, Loader2, Zap, CheckCircle2 } from 'lucide-react'
import { StarterPackMeta, StarterPack } from '@/types/starterPacks'
import { useVocabStore } from '@/store/vocabStore'

// ── Types ────────────────────────────────────────────────────────────────────

type PackCardState = 'idle' | 'loading' | 'activating' | 'done'

// ── Difficulty badge colour ────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: string }) {
  const colour =
    level === 'C1'
      ? 'bg-purple-100 text-purple-700'
      : level === 'B2'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-slate-100 text-slate-600'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colour}`}>
      {level}
    </span>
  )
}

// ── "Activate N words?" modal ─────────────────────────────────────────────────

interface ActivateModalProps {
  packTitle: string
  importedIds: string[]
  onActivate: (ids: string[]) => void
  onDismiss: () => void
}

function ActivateModal({ packTitle, importedIds, onActivate, onDismiss }: ActivateModalProps) {
  const MAX = 10
  const suggested = importedIds.slice(0, MAX)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Zap size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-snug">
              Start learning today?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Activate the first {suggested.length} words from{' '}
              <span className="font-medium text-slate-700">{packTitle}</span> so they appear in
              your Daily Challenge right now.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onActivate(suggested)}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap size={15} />
            Activate {suggested.length} words now
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            I'll add them manually
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single pack card ──────────────────────────────────────────────────────────

interface PackCardProps {
  meta: StarterPackMeta
}

function PackCard({ meta }: PackCardProps) {
  const { importPack, moveToLearning } = useVocabStore()
  const [state, setState] = useState<PackCardState>('idle')
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  async function handleImport() {
    if (state !== 'idle') return
    setState('loading')
    try {
      const res = await fetch(`/data/starter-packs/${meta.id}.json`)
      if (!res.ok) throw new Error(`Failed to load pack: HTTP ${res.status}`)
      const pack: StarterPack = await res.json()
      const outcome = await importPack(pack)
      setResult(outcome)

      if (outcome.imported === 0) {
        // All words already in library
        setState('done')
        return
      }

      setPendingIds(outcome.ids)
      setState('activating')
    } catch (err) {
      console.error('[StarterPacksSection] import failed:', err)
      setState('idle')
    }
  }

  async function handleActivate(ids: string[]) {
    await moveToLearning(ids)
    setPendingIds(null)
    setState('done')
  }

  function handleDismiss() {
    setPendingIds(null)
    setState('done')
  }

  const isDone = state === 'done'

  return (
    <>
      <div className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 transition-all ${isDone ? 'border-green-200 bg-green-50/40' : 'border-slate-200 hover:border-brand-200 hover:shadow-sm'}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none mt-0.5">{meta.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="font-semibold text-slate-900 text-sm leading-snug">{meta.title}</span>
              {isDone && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 leading-snug line-clamp-2">{meta.description}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <DifficultyBadge level={meta.difficulty} />
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <BookOpen size={10} />
            {meta.wordCount} words
          </span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10px] text-slate-400">{meta.estimatedTime}</span>
        </div>

        {/* Action */}
        {isDone ? (
          <div className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={12} />
            {result?.imported === 0
              ? 'Already in your library'
              : `${result?.imported} word${result?.imported !== 1 ? 's' : ''} added to your library`}
          </div>
        ) : (
          <button
            onClick={handleImport}
            disabled={state === 'loading'}
            className="mt-auto w-full py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {state === 'loading' ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Download size={12} />
                Add to my library
              </>
            )}
          </button>
        )}
      </div>

      {/* Activation modal */}
      {state === 'activating' && pendingIds && (
        <ActivateModal
          packTitle={meta.title}
          importedIds={pendingIds}
          onActivate={handleActivate}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface StarterPacksSectionProps {
  /** If true, show all packs; if false, show featured only */
  showAll?: boolean
}

export function StarterPacksSection({ showAll = false }: StarterPacksSectionProps) {
  const [packs, setPacks] = useState<StarterPackMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/starter-packs/index.json')
      .then((r) => r.json())
      .then((data: StarterPackMeta[]) => {
        setPacks(showAll ? data : data.filter((p) => p.isFeatured))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [showAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-brand-400" />
      </div>
    )
  }

  if (packs.length === 0) return null

  return (
    <section className="mt-8">
      {/* Section header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Zap size={16} className="text-brand-500" />
            Starter Packs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hand-picked vocabulary — import a pack and start learning in seconds.
          </p>
        </div>
      </div>

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packs.map((meta) => (
          <PackCard key={meta.id} meta={meta} />
        ))}
      </div>
    </section>
  )
}
