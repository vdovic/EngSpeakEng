/**
 * FillGapChallenge.tsx
 *
 * Phase-3 wrapper around FillBlankExercise.
 * Emits exerciseType: 'fill-gap' so challenge attempts are correctly classified
 * and recorded.  Appropriate for exposure 2–4 when a sentence context exists.
 */

import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { FillBlankExercise } from '../exercises/FillBlankExercise'

interface Props {
  item: VocabItem
  allItems: VocabItem[]
  onAnswer: (result: ExerciseResult) => void
}

export function FillGapChallenge({ item, allItems, onAnswer }: Props) {
  function handleAnswer(result: ExerciseResult) {
    onAnswer({ ...result, exerciseType: 'fill-gap' })
  }
  return <FillBlankExercise item={item} allItems={allItems} onAnswer={handleAnswer} />
}
