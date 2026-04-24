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
 * Multiple-choice exercise: show the definition, pick the correct term
 * from four options (correct + 3 random distractors).
 */
export function MultipleChoiceExercise({ item, allItems, onAnswer }: Props) {
  const options = useMemo(() => {
    const distractors = allItems
      .filter((i) => i.id !== item.id && i.term)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((i) => i.term)

    return shuffle([item.term, ...distractors])
  }, [item, allItems])

  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(opt: string) {
    if (selected !== null) return // already answered
    setSelected(opt)
    const correct = opt === item.term
    onAnswer({
      itemId: item.id,
      exerciseType: 'multiple-choice',
      points: correct ? 10 : 0,
      userAnswer: opt,
      correct,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Which word matches this definition?
      </p>

      {/* Definition card */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <p className="text-base text-slate-900 leading-relaxed">
          {item.definitionEn ?? item.term}
        </p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 mt-1 italic">{item.partOfSpeech}</p>
        )}
      </div>

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
