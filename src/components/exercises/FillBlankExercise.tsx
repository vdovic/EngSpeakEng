import { useState, useMemo } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from './WordPeek'

interface Props {
  item: VocabItem
  allItems: VocabItem[]
  onAnswer: (result: ExerciseResult) => void
}

type PromptMode = 'sentence' | 'definition'

interface Prompt {
  blanked: string
  mode: PromptMode
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Return up to `n` distractor VocabItems, prioritised by linguistic
 * similarity (same partOfSpeech → same type → anything else).
 */
function pickDistractors(item: VocabItem, others: VocabItem[], n: number): VocabItem[] {
  const tier1 = item.partOfSpeech
    ? others.filter((i) => i.partOfSpeech === item.partOfSpeech)
    : []
  const tier1Ids = new Set(tier1.map((i) => i.id))

  const tier2 = others.filter(
    (i) => !tier1Ids.has(i.id) && i.type === item.type,
  )
  const tier2Ids = new Set(tier2.map((i) => i.id))

  const tier3 = others.filter((i) => !tier1Ids.has(i.id) && !tier2Ids.has(i.id))

  return [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)].slice(0, n)
}

// ── Component ─────────────────────────────────────────────────────────────────

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
 * Hint system:
 *  - "💡 Show hint" button opens a 4-option word grid.
 *  - Correct pick → +5 pts, submit immediately.
 *  - Wrong pick   → 0 pts, auto-expand word details, show "Got it, continue" button.
 */
export function FillBlankExercise({ item, allItems, onAnswer }: Props) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Hint state
  const [hintOpen, setHintOpen]   = useState(false)
  const [hintPicked, setHintPicked] = useState<string | null>(null)

  const hintCorrect = hintPicked === item.term
  const hintUsed    = hintPicked !== null

  // ── Prompt ──────────────────────────────────────────────────────────────────

  const prompt = useMemo((): Prompt => {
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

    return {
      blanked: item.definitionEn ?? `What is the word for "${item.term}"?`,
      mode: 'definition',
    }
  }, [item])

  // ── Hint options ─────────────────────────────────────────────────────────────

  const hintOptions = useMemo(() => {
    const others = allItems.filter((i) => i.id !== item.id && i.term)
    if (others.length < 3) return []            // not enough vocab for a real hint
    const distractors = pickDistractors(item, others, 3).map((i) => i.term)
    return shuffle([item.term, ...distractors])
  }, [item, allItems])

  const canHint = hintOptions.length === 4

  // ── Submit (typed answer) ────────────────────────────────────────────────────

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

  // ── Hint pick ────────────────────────────────────────────────────────────────

  function handleHintPick(opt: string) {
    if (hintPicked !== null || submitted) return
    const correct = opt === item.term
    setHintPicked(opt)
    if (correct) {
      // Submit immediately — feedback overlay will say "Correct! +5 pts"
      setSubmitted(true)
      onAnswer({
        itemId: item.id,
        exerciseType: 'fill-blank',
        points: 5,
        userAnswer: opt,
        correct: true,
        correctAnswer: item.term,
      })
    }
    // Wrong: don't submit yet — let user read word details, then click "Got it"
  }

  function handleHintContinue() {
    setSubmitted(true)
    onAnswer({
      itemId: item.id,
      exerciseType: 'fill-blank',
      points: 0,
      userAnswer: hintPicked ?? '',
      correct: false,
      correctAnswer: item.term,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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

      {/* Input — disabled once hint is opened */}
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !hintOpen && handleSubmit()}
        placeholder="Type your answer…"
        disabled={submitted || hintOpen}
        className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300 disabled:opacity-60"
        autoFocus={!hintOpen}
      />

      {/* ── Normal submit (only when hint not open) ── */}
      {!hintOpen && !hintUsed && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || submitted}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 transition-colors"
        >
          Submit
        </button>
      )}

      {/* ── Hint section ── */}
      {canHint && !submitted && !hintUsed && (
        <>
          {!hintOpen ? (
            /* Hint trigger button */
            <button
              onClick={() => setHintOpen(true)}
              className="flex items-center gap-1.5 w-full justify-center py-2 text-xs font-medium text-slate-400 hover:text-amber-600 transition-colors group"
            >
              <Lightbulb size={13} className="shrink-0 group-hover:text-amber-500" />
              Show hint
              <span className="text-slate-300 group-hover:text-amber-400">· correct = +5 pts</span>
              <ChevronDown size={12} className="shrink-0 ml-auto" />
            </button>
          ) : (
            /* Hint options grid */
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb size={12} className="text-amber-500" />
                Choose the correct word
                <span className="font-normal normal-case tracking-normal text-slate-300 ml-1">· +5 pts if correct</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {hintOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleHintPick(opt)}
                    className="px-3 py-2.5 text-sm font-medium rounded-xl border-2 border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.98] transition-all text-left"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── After hint pick: show coloured result ── */}
      {hintUsed && !submitted && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb size={12} className="text-amber-500" />
            Hint result
          </p>
          <div className="grid grid-cols-2 gap-2">
            {hintOptions.map((opt) => {
              const isCorrect  = opt === item.term
              const isPicked   = opt === hintPicked
              let cls = 'px-3 py-2.5 text-sm font-medium rounded-xl border-2 text-left '
              if (isCorrect) {
                cls += 'border-emerald-400 bg-emerald-50 text-emerald-800'
              } else if (isPicked) {
                cls += 'border-red-400 bg-red-50 text-red-700'
              } else {
                cls += 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
              }
              return (
                <div key={opt} className={cls}>
                  <span className="mr-1.5">
                    {isCorrect ? '✓' : isPicked ? '✗' : ''}
                  </span>
                  {opt}
                </div>
              )
            })}
          </div>

          {/* Wrong hint: auto-show word details + "Got it" button */}
          {!hintCorrect && (
            <>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                The correct answer was{' '}
                <span className="font-bold text-slate-800">{item.term}</span>.
                Study the word below, then continue.
              </p>

              <button
                onClick={handleHintContinue}
                className="w-full py-3 bg-slate-700 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                Got it, continue →
              </button>
            </>
          )}
        </div>
      )}

      {/* Word peek — auto-expanded when hint was used and wrong */}
      <WordPeek item={item} forceOpen={hintUsed && !hintCorrect} />
    </div>
  )
}
