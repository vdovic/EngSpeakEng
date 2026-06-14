import { useState, useMemo } from 'react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from './WordPeek'

interface Props {
  item: VocabItem
  allItems: VocabItem[]
  onAnswer: (result: ExerciseResult) => void
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
 * Pick 3 distractor collocations from other items in the pool.
 * Prioritises items with the same partOfSpeech so distractors are
 * plausibly similar (e.g. other verb collocations for a verb question).
 */
function pickCollocationDistractors(
  item: VocabItem,
  allItems: VocabItem[],
  exclude: string,
  n: number,
): string[] {
  const withColls = allItems.filter(
    (i) => i.id !== item.id && (i.collocations?.length ?? 0) > 0,
  )

  const tier1 = item.partOfSpeech
    ? withColls.filter((i) => i.partOfSpeech === item.partOfSpeech)
    : []
  const tier1Ids = new Set(tier1.map((i) => i.id))
  const tier2    = withColls.filter((i) => !tier1Ids.has(i.id))

  const result: string[] = []
  for (const other of [...shuffle(tier1), ...shuffle(tier2)]) {
    if (result.length >= n) break
    const picks = (other.collocations ?? []).filter(
      (c) => c.trim() && c !== exclude && !result.includes(c),
    )
    if (picks.length > 0) {
      result.push(picks[Math.floor(Math.random() * picks.length)])
    }
  }
  return result
}

/**
 * Collocation-choice exercise: show the term, pick the phrase that uses it naturally.
 *
 * Harder than definition-choice because the learner must know HOW the word
 * is used in context, not just WHAT it means.  Requires item.collocations
 * to be non-empty — callers should verify before mounting.
 *
 * Distractors are real collocations from other library items, making them
 * plausible rather than obviously wrong.
 */
export function CollocationChoiceExercise({ item, allItems, onAnswer }: Props) {
  // ⚠️  allItems intentionally NOT in deps — same reason as MultipleChoiceExercise:
  // recordExposure() emits a new allItems ref immediately after the user picks,
  // which would reshuffle options while selected is already set.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { correctCollocation, options } = useMemo(() => {
    const colls = (item.collocations ?? []).filter((c) => c.trim().length > 0)
    const correctCollocation = colls[Math.floor(Math.random() * colls.length)] ?? colls[0]

    const distractors = pickCollocationDistractors(item, allItems, correctCollocation, 3)

    return {
      correctCollocation,
      options: shuffle([correctCollocation, ...distractors]),
    }
  }, [item])

  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(opt: string) {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === correctCollocation
    onAnswer({
      itemId: item.id,
      exerciseType: 'collocation-choice',
      points: correct ? 10 : 0,
      userAnswer: opt,
      correct,
      correctAnswer: correctCollocation,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Pick the natural phrase
      </p>

      {/* Term card */}
      <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200 text-center">
        <p className="text-2xl font-bold text-slate-900">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 mt-1 italic">{item.partOfSpeech}</p>
        )}
        {item.definitionEn && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
            {item.definitionEn}
          </p>
        )}
      </div>

      <p className="text-sm text-slate-600 font-medium text-center">
        Which phrase uses{' '}
        <span className="font-bold text-slate-900">{item.term}</span> naturally?
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const isCorrect  = opt === correctCollocation
          const isSelected = selected === opt

          let cls =
            'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors '

          if (!selected) {
            cls += 'border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50 text-slate-800'
          } else if (isCorrect) {
            cls += 'border-emerald-500 bg-emerald-50 text-emerald-800'
          } else if (isSelected) {
            cls += 'border-red-400 bg-red-50 text-red-700'
          } else {
            cls += 'border-slate-200 bg-white text-slate-400 opacity-60'
          }

          return (
            <button key={opt} className={cls} onClick={() => handleSelect(opt)}>
              <span className="mr-2">
                {selected && isCorrect ? '✓' : selected && isSelected ? '✗' : ''}
              </span>
              {opt}
            </button>
          )
        })}
      </div>

      <WordPeek item={item} />
    </div>
  )
}
