import { useState, useMemo } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from './WordPeek'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

type PromptMode = 'frame' | 'sentence' | 'definition'

interface Prompt {
  blanked: string
  mode: PromptMode
  /** The exact word/phrase removed from the sentence (may be an inflected form). */
  expectedAnswer: string
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Fill-in-the-blank exercise.
 *
 * Priority for the prompt:
 *  1. A single-blank sentence frame where the term is NOT already visible
 *     (i.e. the blank IS the term).  Multi-blank frames are skipped.
 *  2. The example or work sentence with the term blanked out (exact match).
 *  3. Fallback: show the definition and ask the learner to recall the term.
 *
 * Answer checking accepts both the exact word removed AND the base term so
 * inflected forms (e.g. "scrutinised" for "scrutinise") are not penalised.
 */
export function FillBlankExercise({ item, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const prompt = useMemo((): Prompt => {
    const escaped = escapeRegex(item.term)

    // ── 1. Single-blank sentence frame where the blank represents the term ──
    for (const frame of item.sentenceFrames) {
      if ((frame.match(/___/g) ?? []).length !== 1) continue
      // The term must NOT already appear in the visible (non-blank) parts —
      // otherwise the blank is for a different word.
      const visibleText = frame.replace(/___/g, '')
      if (!new RegExp(escaped, 'i').test(visibleText)) {
        return { blanked: frame, mode: 'frame', expectedAnswer: item.term }
      }
    }

    // ── 2. Blank the term inside an existing sentence ───────────────────────
    const termRegex = new RegExp(escaped, 'gi')
    for (const s of [item.exampleSentence, item.workSentence]) {
      if (!s) continue
      const match = termRegex.exec(s)
      termRegex.lastIndex = 0
      if (match) {
        const actualWord = match[0]               // preserve exact form (e.g. "scrutinised")
        const blanked = s.replace(termRegex, '___')
        return { blanked, mode: 'sentence', expectedAnswer: actualWord }
      }
    }

    // ── 3. Definition-recall fallback ────────────────────────────────────────
    return {
      blanked: item.definitionEn ?? `What is the word for "${item.term}"?`,
      mode: 'definition',
      expectedAnswer: item.term,
    }
  }, [item])

  function handleSubmit() {
    if (!answer.trim() || submitted) return
    setSubmitted(true)
    const userAnswer = answer.trim().toLowerCase()
    // Accept the exact blanked word OR the canonical base form of the term.
    const correct =
      userAnswer === prompt.expectedAnswer.toLowerCase() ||
      userAnswer === item.term.toLowerCase()
    onAnswer({
      itemId: item.id,
      exerciseType: 'fill-blank',
      points: correct ? 10 : 0,
      userAnswer: answer.trim(),
      correct,
    })
  }

  // Show a base-form hint when sentence blanking removed an inflected variant
  const showBaseHint =
    prompt.mode === 'sentence' &&
    prompt.expectedAnswer.toLowerCase() !== item.term.toLowerCase()

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
        </div>
      ) : (
        <div>
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
          {showBaseHint && (
            <p className="text-xs text-slate-400 mt-2">
              Hint: base form is{' '}
              <strong className="text-slate-600">{item.term}</strong>
            </p>
          )}
        </div>
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
