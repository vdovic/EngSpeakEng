/**
 * RecognitionChallenge.tsx
 *
 * The simplest challenge type: show the word and ask whether the learner
 * recognises it.  Appropriate for exposure 0–1 when the word is brand-new.
 *
 * "I know it"  → correct   (+5 pts)
 * "Not yet"    → incorrect  (0 pts — schedules a retry in 10 min)
 *
 * The feedback overlay in DailyChallengePage handles the post-answer UI.
 */

import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from '../exercises/WordPeek'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

export function RecognitionChallenge({ item, onAnswer }: Props) {
  function handleKnow() {
    onAnswer({
      itemId: item.id,
      exerciseType: 'recognition',
      points: 5,
      userAnswer: 'know',
      correct: true,
      correctAnswer: item.term,
    })
  }

  function handleNotYet() {
    onAnswer({
      itemId: item.id,
      exerciseType: 'recognition',
      points: 0,
      userAnswer: 'not-yet',
      correct: false,
      correctAnswer: item.term,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Do you know this word?
      </p>

      {/* Word card */}
      <div className="bg-slate-50 rounded-xl px-4 py-6 border border-slate-200 text-center">
        <p className="text-3xl font-bold text-slate-900 mb-1">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 italic">{item.partOfSpeech}</p>
        )}
      </div>

      {/* Definition — shown as a hint (learners can peek before answering) */}
      {item.definitionEn && (
        <details className="text-sm group">
          <summary className="cursor-pointer text-brand-600 hover:text-brand-700 font-medium select-none text-center">
            Show definition hint
          </summary>
          <div className="mt-2 px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl">
            <p className="text-sm text-slate-700 leading-relaxed">{item.definitionEn}</p>
          </div>
        </details>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleNotYet}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] transition-all"
        >
          <ThumbsDown size={16} />
          Not yet
        </button>
        <button
          onClick={handleKnow}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.98] transition-all"
        >
          <ThumbsUp size={16} />
          I know it
        </button>
      </div>

      <WordPeek item={item} />
    </div>
  )
}
