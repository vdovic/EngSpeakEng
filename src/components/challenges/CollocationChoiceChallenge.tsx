/**
 * CollocationChoiceChallenge.tsx
 *
 * Wrapper around CollocationChoiceExercise for the Daily Challenge.
 * Emits exerciseType: 'collocation-choice' so challenge attempts are correctly
 * classified and recorded.  Appropriate for exposure 2–5 when collocations exist.
 */

import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { CollocationChoiceExercise } from '../exercises/CollocationChoiceExercise'

interface Props {
  item: VocabItem
  allItems: VocabItem[]
  onAnswer: (result: ExerciseResult) => void
}

export function CollocationChoiceChallenge({ item, allItems, onAnswer }: Props) {
  function handleAnswer(result: ExerciseResult) {
    onAnswer({ ...result, exerciseType: 'collocation-choice' })
  }
  return <CollocationChoiceExercise item={item} allItems={allItems} onAnswer={handleAnswer} />
}
