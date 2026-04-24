import { useState, useMemo } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from './WordPeek'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

/**
 * Fill-in-the-blank exercise.
 *
 * Priority for the prompt:
 *  1. A sentence frame that already contains ___ as a placeholder.
 *  2. The example or work sentence with the term blanked out (case-insensitive match).
 *  3. Fallback: show the definition and ask the learner to recall the term.
 */
export function FillBlankExercise({ item, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')

  const prompt = useMemo((): { blanked: string; useDefinition: boolean } => {
    // 1. Sentence frame with ___ placeholder
    if (item.sentenceFrames.length > 0) {
      return { blanked: item.sentenceFrames[0], useDefinition: false }
    }

    // 2. Blank the term inside an existing sentence
    const termRegex = new RegExp(
      item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'gi',
    )
    for (const s of [item.exampleSentence, item.workSentence]) {
      if (s && termRegex.test(s)) {
        return { blanked: s.replace(termRegex, '___'), useDefinition: false }
      }
    }

    // 3. Definition-recall fallback
    return {
      blanked: item.definitionEn ?? `What is the word for "${item.term}"?`,
      useDefinition: true,
    }
  }, [item])

  function handleSubmit() {
    if (!answer.trim()) return
    const correct = answer.trim().toLowerCase() === item.term.toLowerCase()
    onAnswer({
      itemId: item.id,
      exerciseType: 'fill-blank',
      points: correct ? 10 : 0,
      userAnswer: answer.trim(),
      correct,
    })
  }

  return (
    <div className="space-y-5">
      {/* Instruction label */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {prompt.useDefinition ? 'Recall the word' : 'Fill in the blank'}
      </p>

      {/* Prompt */}
      {prompt.useDefinition ? (
        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Definition</p>
          <p className="text-base text-slate-900 leading-relaxed">{prompt.blanked}</p>
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
        className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300"
        autoFocus
      />

      <button
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 transition-colors"
      >
        Submit
      </button>

      <WordPeek item={item} />
    </div>
  )
}
