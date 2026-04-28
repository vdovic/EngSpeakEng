import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CheckCircle, ArrowLeft, X } from 'lucide-react'
import { useVocabStore, useDueItems } from '@/store/vocabStore'
import { VocabItem, ReviewOutcome } from '@/types/vocabulary'
import { TypeBadge } from '@/components/TypeBadge'
import { StatusBadge } from '@/components/StatusBadge'

// ── Review mode logic ──────────────────────────────────────────────────────────

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
  return WORK_PROMPTS.default[item.review.reviewCount % WORK_PROMPTS.default.length]
}

function getCompletionSentence(item: VocabItem): { before: string; after: string } | null {
  const sentence = item.exampleSentence || item.workSentence
  if (!sentence) return null
  const term = item.term.split(' ')[0].toLowerCase()
  const lower = sentence.toLowerCase()
  const idx = lower.indexOf(term)
  if (idx < 0) return { before: sentence.replace(/[^.!?]+$/, '___'), after: '' }
  return { before: sentence.slice(0, idx), after: sentence.slice(idx + term.length) }
}

// ── Outcome button config ──────────────────────────────────────────────────────

const OUTCOMES: ReviewOutcome[] = ['again', 'hard', 'good', 'easy']

const BTN: Record<ReviewOutcome, { label: string; ring: string; bg: string; tooltip: string }> = {
  again: {
    label: 'Forgot',
    ring: 'border-red-200',
    bg: 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200',
    tooltip: "Didn't remember. This word will repeat very soon.",
  },
  hard: {
    label: 'Struggled',
    ring: 'border-orange-200',
    bg: 'bg-orange-50 text-orange-700 hover:bg-orange-100 active:bg-orange-200',
    tooltip: "You struggled. We'll show it again soon.",
  },
  good: {
    label: 'Got it',
    ring: 'border-emerald-200',
    bg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200',
    tooltip: "You got it. We'll bring it back later.",
  },
  easy: {
    label: 'Too easy',
    ring: 'border-blue-200',
    bg: 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200',
    tooltip: "Too easy. You won't see it for a while.",
  },
}

// ── Interval estimator ────────────────────────────────────────────────────────

/**
 * Approximate the next review interval without running the full SRS algorithm.
 * Returns a human-readable string for the toast feedback.
 */
function estimateNextInterval(item: VocabItem, outcome: ReviewOutcome): string {
  if (outcome === 'again') return "We'll repeat this today"

  const { intervalDays, ease } = item.review
  let days: number

  if (intervalDays === 0) {
    // First successful review — approximate SM-2 step intervals
    days = outcome === 'hard' ? 1 : outcome === 'good' ? 3 : 7
  } else if (outcome === 'hard') {
    days = Math.max(1, Math.round(intervalDays * 0.8))
  } else if (outcome === 'good') {
    days = Math.max(1, Math.round(intervalDays * ease))
  } else {
    // easy
    days = Math.max(2, Math.round(intervalDays * ease * 1.3))
  }

  if (days === 1) return 'Next review tomorrow'
  if (days < 7)  return `Next review in ${days} days`
  if (days < 14) return 'Next review in about a week'
  if (days < 60) return `Next review in about ${Math.round(days / 7)} weeks`
  return `Next review in about ${Math.round(days / 30)} months`
}

// ── First-time tip ────────────────────────────────────────────────────────────

const TIP_KEY = 'ese-review-tip-v1'

function useTip() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(TIP_KEY))
  function dismiss() {
    localStorage.setItem(TIP_KEY, '1')
    setVisible(false)
  }
  return { visible, dismiss }
}

// ── ReviewCard ─────────────────────────────────────────────────────────────────

interface CardProps {
  item: VocabItem
  mode: ReviewMode
  onOutcome: (outcome: ReviewOutcome) => void
}

function ReviewCard({ item, mode, onOutcome }: CardProps) {
  const [revealed, setReveal] = useState(false)
  const [userInput, setUserInput] = useState('')
  // Which button is currently hovered — drives the dynamic helper-text tooltip
  const [hovered, setHovered] = useState<ReviewOutcome | null>(null)

  const completionSentence = getCompletionSentence(item)
  const isProduction = mode === 'sentence-production' || mode === 'work-context'
  const needsReveal = !isProduction

  const modeLabel: Record<ReviewMode, string> = {
    'recall-meaning':    'Recall the meaning',
    'recall-term':       'Recall the term',
    'sentence-completion':'Complete the sentence',
    'collocation-drill': 'Collocation drill',
    'sentence-production':'Write a sentence',
    'work-context':      'Work-context production',
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

      {/* Show answer */}
      {!revealed && needsReveal && (
        <button
          onClick={() => setReveal(true)}
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

          {/* ── Outcome buttons ─────────────────────────────────────────────── */}

          {/* Helper text — shows tooltip copy on hover, default prompt otherwise */}
          <p className="text-xs text-center text-slate-400 leading-relaxed min-h-[2rem] flex items-center justify-center transition-all duration-150">
            {hovered
              ? BTN[hovered].tooltip
              : 'Tell ESE how well you knew this — it adjusts when you\'ll see it again.'}
          </p>

          {/* 2×2 grid for clearer labels on mobile */}
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((outcome) => (
              <button
                key={outcome}
                onClick={() => onOutcome(outcome)}
                onMouseEnter={() => setHovered(outcome)}
                onMouseLeave={() => setHovered(null)}
                className={`py-3.5 text-sm font-semibold rounded-xl border transition-all active:scale-95 ${BTN[outcome].bg} ${BTN[outcome].ring}`}
              >
                {BTN[outcome].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── ReviewPage ─────────────────────────────────────────────────────────────────

export function ReviewPage() {
  const navigate = useNavigate()
  const dueItems = useDueItems()
  const recordReview = useVocabStore((s) => s.recordReview)
  const tip = useTip()

  const [queue, setQueue]   = useState<VocabItem[]>(() => [...dueItems])
  const [current, setCurrent] = useState(0)
  const [done, setDone]     = useState(0)
  const [toast, setToast]   = useState<string | null>(null)

  const item = queue[current]
  const mode = useMemo(() => (item ? pickMode(item) : 'recall-meaning'), [item])

  async function handleOutcome(outcome: ReviewOutcome) {
    if (!item) return

    // Show interval feedback toast
    const msg = estimateNextInterval(item, outcome)
    setToast(msg)
    const t = setTimeout(() => setToast(null), 1800)

    await recordReview(item.id, outcome)
    if (outcome === 'again') setQueue((q) => [...q, item])
    setDone((d) => d + 1)
    setCurrent((c) => c + 1)

    return () => clearTimeout(t)
  }

  const total    = queue.length
  const progress = total > 0 ? Math.min(current / total, 1) : 1

  // ── Empty / done states ───────────────────────────────────────────────────

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
        <p className="text-sm text-slate-500 mb-2">You reviewed {done} item{done !== 1 ? 's' : ''}.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  // ── Main review screen ────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-6 relative">

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
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          {current + 1}/{total}
        </span>
      </div>

      {/* First-time onboarding tip */}
      {tip.visible && (
        <div className="mb-4 flex items-start gap-2.5 bg-brand-50 border border-brand-100 rounded-xl px-3.5 py-3">
          <span className="text-base shrink-0 mt-0.5">💡</span>
          <p className="flex-1 text-xs text-brand-700 leading-relaxed">
            <span className="font-semibold">Tip:</span> Your choice controls how often this word
            appears again. Hard words return sooner, easy ones stay away longer.
          </p>
          <button
            onClick={tip.dismiss}
            className="shrink-0 text-brand-300 hover:text-brand-600 transition-colors mt-0.5"
            aria-label="Dismiss tip"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Review card */}
      <ReviewCard
        key={`${item.id}-${current}`}
        item={item}
        mode={mode}
        onOutcome={handleOutcome}
      />

      {/* Skip / view item */}
      <div className="mt-4 flex justify-between text-xs text-slate-400">
        <button
          onClick={() => navigate(`/item/${item.id}`)}
          className="hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          View full item
        </button>
        <button
          onClick={() => setCurrent((c) => c + 1)}
          className="hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          Skip <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Toast feedback ── */}
      {/* Sits above the new card; fades in then out without blocking interaction */}
      <div
        className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">
          {toast}
        </div>
      </div>
    </div>
  )
}
