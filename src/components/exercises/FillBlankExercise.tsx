import { useState, useMemo } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from './WordPeek'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

type PromptMode = 'sentence' | 'definition'

interface Prompt {
  blanked: string
  mode: PromptMode
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Fill-in-the-blank exercise.
 *
 * Priority:
 *  1. Blank the term inside the example sentence using a word-boundary regex
 *     so that partial matches (e.g. "plead" inside "pleaded") are never used —
 *     those would leave broken fragments like "___ed" in the sentence.
 *  2. Same attempt with the work/professional sentence.
 *  3. Fallback: show the definition and ask the learner to recall the term.
 *
 * Sentence frames from the data are intentionally skipped — they were
 * generated as conversation-practice templates with multiple blanks for
 * arbitrary words, not as fill-in-the-term exercises.
 *
 * The word header in DailyChallengePage is hidden for this exercise type
 * (same reason as multiple-choice) so the answer is never on screen.
 */
export function FillBlankExercise({ item, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const prompt = useMemo((): Prompt => {
    // Word-boundary regex: ensures "plead" only matches "plead" as a whole
    // word, not "pleaded", "pleads", "pleading" etc.
    const escaped = escapeRegex(item.term)
    const termRegex = new RegExp(`\\b${escaped}\\b`, 'gi')

    for (const s of [item.exampleSentence, item.workSentence]) {
      if (!s) continue
      if (termRegex.test(s)) {
        termRegex.lastIndex = 0
        const blanked = s.replace(termRegex, '___')
        return { blanked, mode: 'sentence' }
      }
      termRegex.lastIndex = 0
    }

    // Fallback: definition recall
    return {
      blanked: item.definitionEn ?? `What is the word for "${item.term}"?`,
      mode: 'definition',
    }
  }, [item])

  function handleSubmit() {
    if (!answer.trim() || submitted) return
    setSubmitted(true)
    const correct = answer.trim().toLowerCase() === item.term.toLowerCase()
    onAnswer({
      itemId: item.id,
      exerciseType: 'fill-blank',
      points: correct ? 10 : 0,
      userAnswer: answer.trim(),
      correct,
      correctAnswer: item.term,
    })
  }

  return (
    <div className="space-y-5">
      {/* Instruction label */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {prompt.mode === 'definition' ? 'Recall the word' : 'Fill in the blank'}
      </p>

      {/* Prompt */}
      {prompt.mode === 'definition' ? (
        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Definition</p>
          <p className="text-base text-slate-900 leading-relaxed">{prompt.blanked}</p>
          {item.partOfSpeech && (
            <p className="text-xs text-slate-400 mt-1 italic">{item.partOfSpeech}</p>
          )}
        </div>
      ) : (
        <p className="text-lg text-slate-900 leading-relaxed font-medium">
          {prompt.blanked.split('___').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="inline-block min-w-[5rem] border-b-2 border-brand-400 mx-1 align-bottom" />
              )}
            </span>
          ))}
        </p>
      )}

      {/* Input */}
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Type your answer…"
        disabled={submitted}
        className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300 disabled:opacity-60"
        autoFocus
      />

      <button
        onClick={handleSubmit}
        disabled={!answer.trim() || submitted}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 transition-colors"
      >
        Submit
      </button>

      <WordPeek item={item} />
    </div>
  )
}
