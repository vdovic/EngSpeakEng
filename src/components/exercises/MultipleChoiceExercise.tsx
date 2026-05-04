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
 * Return up to `n` distractor VocabItems prioritised by linguistic
 * similarity to the target item:
 *   Tier 1 — same partOfSpeech  (e.g. both "phrasal verb")
 *   Tier 2 — same item type     (word / phrase / chunk)
 *   Tier 3 — anything else
 *
 * Each tier is independently shuffled so the selection is random within
 * each priority band, then tiers are concatenated and sliced to `n`.
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

/**
 * Multiple-choice exercise: show the definition, pick the correct term.
 *
 * Distractors are chosen to be linguistically plausible — same part of
 * speech first, then same item type — so options are never absurdly
 * mismatched (e.g. a noun distractor for a phrasal-verb question).
 */
export function MultipleChoiceExercise({ item, allItems, onAnswer }: Props) {
  // ⚠️  allItems is intentionally NOT in the deps array.
  // recordExposure() runs immediately after the user picks an answer, which
  // emits a new allItems reference from the Zustand store.  If allItems were
  // a dep, the useMemo would re-run mid-question: options reshuffle while
  // `selected` is already set, causing a different button to show as green
  // before the feedback overlay even appears.  Since each question mounts as
  // a fresh component instance (key={item.id-mc}), dropping allItems from deps
  // is safe — options are always fresh on mount and stable during the question.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => {
    const others = allItems.filter((i) => i.id !== item.id && i.term)
    const distractors = pickDistractors(item, others, 3).map((i) => i.term)
    return shuffle([item.term, ...distractors])
  }, [item])

  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(opt: string) {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === item.term
    onAnswer({
      itemId: item.id,
      exerciseType: 'multiple-choice',
      points: correct ? 10 : 0,
      userAnswer: opt,
      correct,
      correctAnswer: item.term,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Select the correct term
      </p>

      {/* Definition card — the prompt */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Definition
        </p>
        <p className="text-base text-slate-900 leading-relaxed">
          {item.definitionEn ?? item.term}
        </p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 mt-1 italic">{item.partOfSpeech}</p>
        )}
        {item.exampleSentence && (
          <p className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-200 leading-relaxed">
            &ldquo;{item.exampleSentence}&rdquo;
          </p>
        )}
      </div>

      <p className="text-sm text-slate-600 font-medium text-center">
        Which of these words fits the definition above?
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const isCorrect = opt === item.term
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
