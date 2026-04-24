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
 * Return up to `n` distractor strings (synonyms preferred, term as fallback)
 * drawn from other items, prioritised by linguistic similarity:
 *   Tier 1 — same partOfSpeech
 *   Tier 2 — same item type  (word / phrase / chunk)
 *   Tier 3 — anything else
 */
function pickSynonymDistractors(
  item: VocabItem,
  others: VocabItem[],
  exclude: Set<string>,
  n: number,
): string[] {
  const tier1 = item.partOfSpeech
    ? others.filter((i) => i.partOfSpeech === item.partOfSpeech)
    : []
  const tier1Ids = new Set(tier1.map((i) => i.id))

  const tier2 = others.filter(
    (i) => !tier1Ids.has(i.id) && i.type === item.type,
  )
  const tier2Ids = new Set(tier2.map((i) => i.id))

  const tier3 = others.filter((i) => !tier1Ids.has(i.id) && !tier2Ids.has(i.id))

  const ordered = [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)]

  const result: string[] = []
  for (const other of ordered) {
    if (result.length >= n) break
    // Prefer a synonym from the other item; fall back to its term
    const word =
      other.synonyms.find((s) => s && !exclude.has(s) && !result.includes(s)) ??
      (other.term && !exclude.has(other.term) && !result.includes(other.term)
        ? other.term
        : undefined)
    if (word) result.push(word)
  }
  return result
}

/**
 * Synonym-match exercise: show the term + definition, pick the correct synonym.
 *
 * Distractors are drawn from same-partOfSpeech items first so options are
 * semantically plausible (e.g. other phrasal-verb synonyms for a phrasal-verb
 * question) rather than randomly mismatched words.
 */
export function SynonymMatchExercise({ item, allItems, onAnswer }: Props) {
  const [defExpanded, setDefExpanded] = useState(false)

  const { correctSynonym, options } = useMemo(() => {
    const syns = item.synonyms.filter(Boolean)
    const correctSynonym = syns[Math.floor(Math.random() * syns.length)] ?? item.synonyms[0]

    const others = allItems.filter((o) => o.id !== item.id)
    const exclude = new Set([correctSynonym, ...item.synonyms.filter(Boolean)])

    const distractors = pickSynonymDistractors(item, others, exclude, 3)

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
      correctAnswer: correctSynonym,
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
          <div
            className="mt-2 cursor-pointer"
            onClick={() => setDefExpanded((v) => !v)}
          >
            <p className={`text-sm text-slate-500 ${defExpanded ? '' : 'line-clamp-2'}`}>
              {item.definitionEn}
            </p>
            {/* Show expand hint only when long enough to be clamped */}
            {!defExpanded && item.definitionEn.length > 80 && (
              <span className="text-xs text-brand-500 font-medium">▾ show more</span>
            )}
            {defExpanded && (
              <span className="text-xs text-slate-400 font-medium">▴ show less</span>
            )}
          </div>
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
