/**
 * RealLifeUseCheckChallenge.tsx
 *
 * Maintenance challenge for words at exposureCount = 8 that have already had
 * a sentence produced.  Asks the learner whether they have used the word in
 * real life — speaking or writing — since they last saw it.
 *
 * "Yes, I used it"  → correct   → store logs a usage entry (speaking channel)
 * "Not yet"         → incorrect → no exposure change; retry scheduled by SRS
 *
 * The component shows a brief inline confirmation before calling onAnswer,
 * so DailyChallengePage advances immediately (skips the generic feedback overlay).
 */

import { useState } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from '../exercises/WordPeek'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

type Phase = 'asking' | 'confirmed'

export function RealLifeUseCheckChallenge({ item, onAnswer }: Props) {
  const [phase, setPhase] = useState<Phase>('asking')
  const [usedIt, setUsedIt] = useState(false)

  function handleYes() {
    setUsedIt(true)
    setPhase('confirmed')
  }

  function handleNotYet() {
    setUsedIt(false)
    setPhase('confirmed')
  }

  function handleContinue() {
    onAnswer({
      itemId: item.id,
      exerciseType: 'real-life-use-check',
      points: usedIt ? 10 : 0,
      userAnswer: usedIt ? 'yes' : 'not-yet',
      correct: usedIt,
      correctAnswer: item.term,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Real-life use check
      </p>

      {/* Word card */}
      <div className="bg-slate-50 rounded-xl px-4 py-5 border border-slate-200">
        <p className="text-2xl font-bold text-slate-900 mb-1">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 italic mb-2">{item.partOfSpeech}</p>
        )}
        {item.definitionEn && (
          <p className="text-sm text-slate-600 leading-relaxed">{item.definitionEn}</p>
        )}
      </div>

      {/* Real-life task hint */}
      {item.realLifeTask && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
          <Sparkles size={13} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">{item.realLifeTask}</p>
        </div>
      )}

      {/* ── Asking phase ── */}
      {phase === 'asking' && (
        <>
          <p className="text-sm font-medium text-slate-700 text-center">
            Have you used <strong className="text-slate-900">&ldquo;{item.term}&rdquo;</strong> in real life recently?
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleNotYet}
              className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <Clock size={16} />
              Not yet
            </button>
            <button
              onClick={handleYes}
              className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 size={16} />
              Yes, I used it!
            </button>
          </div>
        </>
      )}

      {/* ── Confirmed phase ── */}
      {phase === 'confirmed' && (
        <>
          {usedIt ? (
            <div className="px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <p className="text-lg font-bold text-emerald-800">🎉 Excellent!</p>
              <p className="text-sm text-emerald-700">
                Using words in real life is the most powerful way to make them yours.
                We've logged this usage for you.
              </p>
            </div>
          ) : (
            <div className="px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
              <p className="text-base font-bold text-amber-800">No problem!</p>
              <p className="text-sm text-amber-700">
                Try to use <strong>{item.term}</strong> in conversation or writing today.
                We'll check back again later.
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            Continue →
          </button>
        </>
      )}

      <WordPeek item={item} />
    </div>
  )
}
