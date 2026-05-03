/**
 * SentenceProductionChallenge.tsx
 *
 * Phase-3 wrapper around SentenceCreateExercise.
 * Emits exerciseType: 'sentence-production' so the store can set
 * review.sentenceProduced = true on a correct answer.
 * Appropriate for exposure 5–8.
 */

import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { SentenceCreateExercise } from '../exercises/SentenceCreateExercise'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

export function SentenceProductionChallenge({ item, onAnswer }: Props) {
  function handleAnswer(result: ExerciseResult) {
    onAnswer({ ...result, exerciseType: 'sentence-production' })
  }
  return <SentenceCreateExercise item={item} onAnswer={handleAnswer} />
}
