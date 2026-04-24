import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft, Trophy, Flame, CheckCircle, XCircle } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { isDueChallengeNow } from '@/lib/challengeSchedule'
import { VocabItem, ExerciseType, ExerciseResult } from '@/types/vocabulary'
import { FillBlankExercise } from '@/components/exercises/FillBlankExercise'
import { MultipleChoiceExercise } from '@/components/exercises/MultipleChoiceExercise'
import { SynonymMatchExercise } from '@/components/exercises/SynonymMatchExercise'
import { SentenceCreateExercise } from '@/components/exercises/SentenceCreateExercise'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChallengeSlot {
  item: VocabItem
  exerciseType: ExerciseType
}

type FeedbackState = {
  correct: boolean
  points: number
  userAnswer: string
  isSentence: boolean
} | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickExerciseType(item: VocabItem, allItems: VocabItem[]): ExerciseType {
  const available: ExerciseType[] = ['sentence-create']

  // fill-blank: always feasible (worst case uses definition-recall)
  available.push('fill-blank')

  // multiple-choice: needs a definition + enough items to draw from
  if (item.definitionEn && allItems.length >= 4) {
    available.push('multiple-choice')
  }

  // synonym-match: needs at least one synonym
  if (item.synonyms.length >= 1 && allItems.length >= 4) {
    available.push('synonym-match')
  }

  return available[Math.floor(Math.random() * available.length)]
}

const MAX_ITEMS = 25
const FEEDBACK_DURATION_MS = 1_800

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyChallengePage() {
  const navigate = useNavigate()
  const allItems = useVocabStore((s) => s.items)
  const recordExposure = useVocabStore((s) => s.recordExposure)
  const { addPoints, recordChallengeCompletion, checkBadges, streakDays, points } =
    useGamificationStore()

  const [slots, setSlots] = useState<ChallengeSlot[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [phase, setPhase] = useState<'loading' | 'exercising' | 'complete'>('loading')
  const [newBadges, setNewBadges] = useState<ReturnType<typeof checkBadges>>([])

  // Build challenge slots on mount
  useEffect(() => {
    const due = shuffle(
      allItems.filter((i) => isDueChallengeNow(i.exposureCount, i.nextChallengeDate)),
    ).slice(0, MAX_ITEMS)

    if (due.length === 0) {
      setPhase('complete') // no items due — show summary early
      return
    }

    setSlots(
      due.map((item) => ({
        item,
        exerciseType: pickExerciseType(item, allItems),
      })),
    )
    setPhase('exercising')
  }, [allItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(
    (result: ExerciseResult) => {
      // 1. Record exposure in vocab store
      recordExposure(result.itemId, result.correct || result.exerciseType === 'sentence-create')

      // 2. Add points
      addPoints(result.points)

      // 3. Collect result
      const newResults = [...results, result]
      setResults(newResults)

      // 4. Show feedback overlay
      setFeedback({
        correct: result.correct,
        points: result.points,
        userAnswer: result.userAnswer,
        isSentence: result.exerciseType === 'sentence-create',
      })

      // 5. After delay advance or complete
      setTimeout(() => {
        setFeedback(null)
        if (currentIndex + 1 >= slots.length) {
          // Challenge complete
          recordChallengeCompletion()
          const unlocked = checkBadges()
          setNewBadges(unlocked)
          setPhase('complete')
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }, FEEDBACK_DURATION_MS)
    },
    [results, currentIndex, slots.length, recordExposure, addPoints, recordChallengeCompletion, checkBadges],
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const totalPoints = results.reduce((s, r) => s + r.points, 0)
    const correctCount = results.filter((r) => r.correct).length
    const total = results.length

    return (
      <div className="max-w-md mx-auto px-4 py-10 pb-24 text-center">
        {/* Trophy */}
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
          <Trophy size={28} className="text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {total === 0 ? 'All caught up!' : 'Challenge complete!'}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {total === 0
            ? 'No items are due for practice right now. Come back later!'
            : `You practised ${total} word${total !== 1 ? 's' : ''} today.`}
        </p>

        {total > 0 && (
          <>
            {/* Score cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <ScoreCard
                label="Points earned"
                value={`+${totalPoints}`}
                color="text-brand-600"
                bg="bg-brand-50"
              />
              <ScoreCard
                label="Correct"
                value={`${correctCount}/${total}`}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <ScoreCard
                label="Streak"
                value={`${streakDays}d`}
                color="text-orange-600"
                bg="bg-orange-50"
              />
            </div>

            {/* Total points running tally */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-6 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total points</span>
              <span className="text-lg font-bold text-brand-700">{points}</span>
            </div>
          </>
        )}

        {/* Newly unlocked badges */}
        {newBadges.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              New badges unlocked!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {newBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5"
                >
                  <span>{b.emoji}</span>
                  <span className="text-sm font-semibold text-amber-800">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Streak reminder */}
        {streakDays > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-orange-600 mb-8">
            <Flame size={16} />
            <span className="font-semibold">{streakDays}-day streak — keep it up!</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            Back to home
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            View stats & badges
          </button>
        </div>
      </div>
    )
  }

  // ── Exercising ─────────────────────────────────────────────────────────────
  const currentSlot = slots[currentIndex]
  const { item, exerciseType } = currentSlot
  const progress = ((currentIndex) / slots.length) * 100

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 min-h-screen relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          title="Exit challenge"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">Daily Challenge</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Flame size={14} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-600">{streakDays}d</span>
          <span className="text-xs text-slate-400 ml-2">
            {currentIndex + 1}/{slots.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Word header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">{item.term}</h2>
        {item.partOfSpeech && (
          <p className="text-sm text-slate-400 italic mt-0.5">{item.partOfSpeech}</p>
        )}
      </div>

      {/* Exercise */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {exerciseType === 'fill-blank' && (
          <FillBlankExercise
            key={`${item.id}-fill`}
            item={item}
            onAnswer={handleAnswer}
          />
        )}
        {exerciseType === 'multiple-choice' && (
          <MultipleChoiceExercise
            key={`${item.id}-mc`}
            item={item}
            allItems={allItems}
            onAnswer={handleAnswer}
          />
        )}
        {exerciseType === 'synonym-match' && (
          <SynonymMatchExercise
            key={`${item.id}-syn`}
            item={item}
            allItems={allItems}
            onAnswer={handleAnswer}
          />
        )}
        {exerciseType === 'sentence-create' && (
          <SentenceCreateExercise
            key={`${item.id}-sent`}
            item={item}
            onAnswer={handleAnswer}
          />
        )}
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity ${
            feedback.isSentence
              ? 'bg-brand-600/80'
              : feedback.correct
              ? 'bg-emerald-600/80'
              : 'bg-red-600/80'
          }`}
        >
          <div className="text-white text-center px-6">
            {feedback.isSentence ? (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 opacity-90" />
                <p className="text-2xl font-bold mb-1">Good practice!</p>
                <p className="text-lg opacity-80">+{feedback.points} points</p>
              </>
            ) : feedback.correct ? (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 opacity-90" />
                <p className="text-2xl font-bold mb-1">Correct!</p>
                <p className="text-lg opacity-80">+{feedback.points} points</p>
              </>
            ) : (
              <>
                <XCircle size={48} className="mx-auto mb-3 opacity-90" />
                <p className="text-2xl font-bold mb-1">Not quite</p>
                <p className="text-base opacity-80 mt-1">
                  Answer: <strong>{item.term}</strong>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
