import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react'
import { useVocabStore, useDueItems } from '@/store/vocabStore'
import { VocabItem, ReviewOutcome } from '@/types/vocabulary'
import { TypeBadge } from '@/components/TypeBadge'
import { StatusBadge } from '@/components/StatusBadge'

type ReviewMode =
  | 'recall-meaning'
  | 'recall-term'
  | 'sentence-completion'
  | 'collocation-drill'
  | 'sentence-production'
  | 'work-context'

function pickMode(item: VocabItem): ReviewMode {
  const reviewCount = item.review.reviewCount
  if (reviewCount <= 1) return 'recall-meaning'

  const modes: ReviewMode[] = [
    'recall-meaning',
    'recall-term',
    'sentence-completion',
    'collocation-drill',
    'sentence-production',
    'work-context',
  ]

  if (!item.definitionEn) return 'recall-meaning'
  if (!item.exampleSentence) return modes[reviewCount % 3]
  if (item.collocations.length === 0) return modes[reviewCount % 4]
  return modes[reviewCount % modes.length]
}

const WORK_PROMPTS: Record<string, string[]> = {
  default: [
    'Use this in a sentence about project delivery.',
    'Use this in a stakeholder update.',
    'Use this when discussing team capacity.',
    'Use this in an email about scope or timelines.',
    'Use this when raising a risk in a meeting.',
  ],
}

function getWorkPrompt(item: VocabItem): string {
  const prompts = WORK_PROMPTS.default
  return prompts[item.review.reviewCount % prompts.length]
}

function getCompletionSentence(item: VocabItem): { before: string; after: string } | null {
  const sentence = item.exampleSentence || item.workSentence
  if (!sentence) return null
  const term = item.term.split(' ')[0].toLowerCase()
  const lower = sentence.toLowerCase()
  const idx = lower.indexOf(term)
  if (idx < 0) return { before: sentence.replace(/[^.!?]+$/, '___'), after: '' }
  return {
    before: sentence.slice(0, idx),
    after: sentence.slice(idx + term.length),
  }
}

interface CardProps {
  item: VocabItem
  mode: ReviewMode
  onOutcome: (outcome: ReviewOutcome) => void
}

function ReviewCard({ item, mode, onOutcome }: CardProps) {
  const [revealed, setReveal] = useState(false)
  const [userInput, setUserInput] = useState('')
  const completionSentence = getCompletionSentence(item)

  const isProduction = mode === 'sentence-production' || mode === 'work-context'
  const needsReveal = !isProduction

  function handleReveal() {
    setReveal(true)
  }

  const modeLabel: Record<ReviewMode, string> = {
    'recall-meaning': 'Recall the meaning',
    'recall-term': 'Recall the term',
    'sentence-completion': 'Complete the sentence',
    'collocation-drill': 'Collocation drill',
    'sentence-production': 'Write a sentence',
    'work-context': 'Work-context production',
  }

  return (
    <div className="space-y-4">
      {/* Mode label */}
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">
        {modeLabel[mode]}
      </div>

      {/* Card front */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-40 flex flex-col items-center justify-center text-center">
        {mode === 'recall-meaning' && (
          <>
            <p className="text-xs text-slate-400 mb-3">What does this mean?</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">{item.term}</h2>
            <div className="flex gap-1.5">
              <TypeBadge type={item.type} />
              <StatusBadge status={item.status} />
            </div>
          </>
        )}

        {mode === 'recall-term' && (
          <>
            <p className="text-xs text-slate-400 mb-3">What is the term for this?</p>
            {item.definitionEn && (
              <p className="text-lg text-slate-800 font-medium leading-snug max-w-xs mb-3">
                {item.definitionEn}
              </p>
            )}
            {item.exampleSentence && (
              <p className="text-sm text-slate-500 italic">"{item.exampleSentence}"</p>
            )}
          </>
        )}

        {mode === 'sentence-completion' && completionSentence && (
          <>
            <p className="text-xs text-slate-400 mb-3">Fill in the missing word or phrase</p>
            <p className="text-lg text-slate-800 font-medium leading-snug">
              {completionSentence.before}
              <span className="inline-block bg-slate-200 text-slate-200 rounded px-6 mx-1">___</span>
              {completionSentence.after}
            </p>
          </>
        )}

        {mode === 'collocation-drill' && (
          <>
            <p className="text-xs text-slate-400 mb-3">What collocations go with this word?</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{item.term}</h2>
            <p className="text-xs text-slate-400">Think of 2–3 natural word combinations</p>
          </>
        )}

        {mode === 'sentence-production' && (
          <>
            <p className="text-xs text-slate-400 mb-3">Write your own sentence using this</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{item.term}</h2>
            {item.definitionEn && (
              <p className="text-xs text-slate-500 max-w-xs">{item.definitionEn}</p>
            )}
          </>
        )}

        {mode === 'work-context' && (
          <>
            <p className="text-xs text-slate-400 mb-3">Work-context challenge</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{item.term}</h2>
            <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {getWorkPrompt(item)}
            </p>
          </>
        )}
      </div>

      {/* Production input */}
      {isProduction && (
        <textarea
          rows={3}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Write your sentence here…"
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 resize-none"
        />
      )}

      {/* Answer reveal */}
      {!revealed && needsReveal && (
        <button
          onClick={handleReveal}
          className="w-full py-3.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
        >
          Show answer
        </button>
      )}

      {(revealed || isProduction) && (
        <>
          {/* Answer panel */}
          {revealed && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Answer</h3>
              {mode === 'recall-meaning' && item.definitionEn && (
                <p className="text-sm text-slate-900 font-medium">{item.definitionEn}</p>
              )}
              {mode === 'recall-term' && (
                <p className="text-xl font-bold text-brand-700">{item.term}</p>
              )}
              {mode === 'sentence-completion' && (
                <p className="text-sm font-bold text-brand-700">{item.term}</p>
              )}
              {mode === 'collocation-drill' && item.collocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.collocations.map((c) => (
                    <span key={c} className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {item.exampleSentence && (
                <p className="text-sm text-slate-600 italic">"{item.exampleSentence}"</p>
              )}
              {item.nuance && (
                <p className="text-xs text-slate-500 bg-white rounded-lg px-2 py-1.5 border border-slate-200">
                  💡 {item.nuance}
                </p>
              )}
            </div>
          )}

          {/* Outcome buttons */}
          <div className="grid grid-cols-4 gap-2">
            {(['again', 'hard', 'good', 'easy'] as ReviewOutcome[]).map((outcome) => (
              <button
                key={outcome}
                onClick={() => onOutcome(outcome)}
                className={`py-3 text-xs font-semibold rounded-xl border capitalize transition-colors ${
                  outcome === 'again'
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : outcome === 'hard'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    : outcome === 'good'
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {outcome}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ReviewPage() {
  const navigate = useNavigate()
  const dueItems = useDueItems()
  const recordReview = useVocabStore((s) => s.recordReview)

  const [queue, setQueue] = useState<VocabItem[]>(() => [...dueItems])
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(0)

  const item = queue[current]
  const mode = useMemo(() => (item ? pickMode(item) : 'recall-meaning'), [item])

  async function handleOutcome(outcome: ReviewOutcome) {
    if (!item) return
    await recordReview(item.id, outcome)

    if (outcome === 'again') {
      // Put back at end of queue
      setQueue((q) => [...q, item])
    }
    setDone((d) => d + 1)
    setCurrent((c) => c + 1)
  }

  const total = queue.length
  const progress = total > 0 ? Math.min(current / total, 1) : 1

  if (dueItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h2>
        <p className="text-sm text-slate-500 mb-6">No items due for review right now. Come back later.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Review complete!</h2>
        <p className="text-sm text-slate-500 mb-2">You reviewed {done} items.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {current + 1}/{total}
        </span>
      </div>

      <ReviewCard key={`${item.id}-${current}`} item={item} mode={mode} onOutcome={handleOutcome} />

      {/* Skip / view item */}
      <div className="mt-4 flex justify-between text-xs text-slate-400">
        <button
          onClick={() => navigate(`/item/${item.id}`)}
          className="hover:text-slate-600 flex items-center gap-1"
        >
          View full item
        </button>
        <button
          onClick={() => { setCurrent((c) => c + 1) }}
          className="hover:text-slate-600 flex items-center gap-1"
        >
          Skip <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
