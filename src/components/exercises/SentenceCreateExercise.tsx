import { useState } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

/**
 * Free sentence-creation exercise.
 * The learner writes their own sentence using the term.
 * Always awards +5 partial-credit points on submission (encourages production).
 */
export function SentenceCreateExercise({ item, onAnswer }: Props) {
  const [sentence, setSentence] = useState('')

  function handleSubmit() {
    const trimmed = sentence.trim()
    if (!trimmed) return
    onAnswer({
      itemId: item.id,
      exerciseType: 'sentence-create',
      points: 5,          // always partial credit
      userAnswer: trimmed,
      correct: false,     // no "correct" for open-ended production
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Create your own sentence
      </p>

      {/* Word card */}
      <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
        <p className="text-2xl font-bold text-slate-900 mb-1">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 italic mb-2">{item.partOfSpeech}</p>
        )}
        {item.definitionEn && (
          <p className="text-sm text-slate-600 leading-relaxed">{item.definitionEn}</p>
        )}
      </div>

      {/* Example (collapsed hint) */}
      {item.workSentence && (
        <details className="text-sm">
          <summary className="cursor-pointer text-brand-600 hover:text-brand-700 font-medium select-none">
            Show example sentence
          </summary>
          <p className="mt-2 text-slate-600 italic bg-brand-50 rounded-lg px-3 py-2 border border-brand-100">
            "{item.workSentence}"
          </p>
        </details>
      )}

      {/* Textarea */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Write a sentence using <strong className="text-slate-700">"{item.term}"</strong>
        </label>
        <textarea
          rows={3}
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="Type your sentence here…"
          className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300 resize-none"
          autoFocus
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">+5 points for any attempt</p>
        <button
          onClick={handleSubmit}
          disabled={!sentence.trim()}
          className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  )
}
