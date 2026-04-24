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
 * Synonym-match exercise: show the term, pick the correct synonym from
 * four options (one real synonym + three distractors from other items).
 */
export function SynonymMatchExercise({ item, allItems, onAnswer }: Props) {
  const { correctSynonym, options } = useMemo(() => {
    const syns = item.synonyms.filter(Boolean)
    const correctSynonym = syns[Math.floor(Math.random() * syns.length)] ?? item.synonyms[0]

    // Build a pool of distractor words from other items' synonyms + terms
    const distractorPool: string[] = []
    for (const other of allItems) {
      if (other.id === item.id) continue
      if (other.synonyms.length > 0) distractorPool.push(other.synonyms[0])
      else distractorPool.push(other.term)
    }

    const distractors = shuffle(
      distractorPool.filter((d) => d && d !== correctSynonym),
    ).slice(0, 3)

    return {
      correctSynonym,
      options: shuffle([correctSynonym, ...distractors]),
    }
  }, [item, allItems])

  const [selected, setSelected] = useState<string | null>(null)

  function handleSelect(opt: string) {
    if (selected !== null) return
    setSelected(opt)
    const correct = opt === correctSynonym
    onAnswer({
      itemId: item.id,
      exerciseType: 'synonym-match',
      points: correct ? 10 : 0,
      userAnswer: opt,
      correct,
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Pick a synonym
      </p>

      {/* Term card */}
      <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200 text-center">
        <p className="text-2xl font-bold text-slate-900">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 mt-1 italic">{item.partOfSpeech}</p>
        )}
        {item.definitionEn && (
          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.definitionEn}</p>
        )}
      </div>

      <p className="text-sm text-slate-600 text-center font-medium">
        Which word is closest in meaning?
      </p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isCorrect = opt === correctSynonym
          const isSelected = selected === opt

          let cls =
            'w-full text-center px-3 py-3 rounded-xl border-2 text-sm font-medium transition-colors '

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
              {selected && isCorrect ? '✓ ' : selected && isSelected ? '✗ ' : ''}
              {opt}
            </button>
          )
        })}
      </div>

      <WordPeek item={item} />
    </div>
  )
}
