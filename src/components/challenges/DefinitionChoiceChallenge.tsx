/**
 * DefinitionChoiceChallenge.tsx
 *
 * Phase-3 wrapper around MultipleChoiceExercise.
 * Emits exerciseType: 'definition-choice' so challenge attempts are correctly
 * classified and recorded.  Appropriate for exposure 0–4.
 */

import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { MultipleChoiceExercise } from '../exercises/MultipleChoiceExercise'

interface Props {
  item: VocabItem
  allItems: VocabItem[]
  onAnswer: (result: ExerciseResult) => void
}

export function DefinitionChoiceChallenge({ item, allItems, onAnswer }: Props) {
  function handleAnswer(result: ExerciseResult) {
    onAnswer({ ...result, exerciseType: 'definition-choice' })
  }
  return <MultipleChoiceExercise item={item} allItems={allItems} onAnswer={handleAnswer} />
}
