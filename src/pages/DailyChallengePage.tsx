import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowLeft, Trophy, Flame, CheckCircle, XCircle,
  ChevronDown, PlayCircle, X, Plus, Search,
} from 'lucide-react'
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
  correctAnswer: string
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
  const available: ExerciseType[] = ['sentence-create', 'fill-blank']
  if (item.definitionEn && allItems.length >= 4) available.push('multiple-choice')
  if (item.synonyms.length >= 1 && allItems.length >= 4) available.push('synonym-match')
  return available[Math.floor(Math.random() * available.length)]
}

const MAX_ITEMS = 25

const STATUS_ORDER: Record<string, number> = {
  inbox: 0, learning: 1, stable: 2, activation: 3, mastered: 4,
}

// ── Word picker modal ─────────────────────────────────────────────────────────

function WordPickerModal({
  allItems,
  excludeIds,
  onSelect,
  onClose,
}: {
  allItems: VocabItem[]
  excludeIds: Set<string>
  onSelect: (item: VocabItem) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems
      .filter((i) => {
        if (excludeIds.has(i.id) || i.archived) return false
        if (!q) return true
        return (
          i.term.toLowerCase().includes(q) ||
          (i.definitionEn ?? '').toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        const sA = STATUS_ORDER[a.status] ?? 0
        const sB = STATUS_ORDER[b.status] ?? 0
        if (sA !== sB) return sA - sB
        return a.term.localeCompare(b.term)
      })
  }, [allItems, excludeIds, search])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          <h2 className="flex-1 text-base font-bold text-slate-900">Add from library</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms, definitions, tags…"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 bg-slate-50"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 pl-0.5">
            {available.length} word{available.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {available.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No matching words found
            </div>
          ) : (
            available.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); onClose() }}
                className="w-full text-left px-4 py-3 hover:bg-brand-50 active:bg-brand-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{item.term}</span>
                      {item.partOfSpeech && (
                        <span className="text-xs text-slate-400 italic shrink-0">{item.partOfSpeech}</span>
                      )}
                    </div>
                    {item.definitionEn && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.definitionEn}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                    item.status === 'mastered'   ? 'bg-emerald-50 text-emerald-700' :
                    item.status === 'activation' ? 'bg-purple-50 text-purple-700'  :
                    item.status === 'stable'     ? 'bg-blue-50 text-blue-700'      :
                    item.status === 'learning'   ? 'bg-amber-50 text-amber-700'    :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Preview row ───────────────────────────────────────────────────────────────

function PreviewRow({
  item,
  onRemove,
}: {
  item: VocabItem
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-stretch">
        {/* Expand / collapse area */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors min-w-0"
        >
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-900">{item.term}</span>
            {item.partOfSpeech && (
              <span className="ml-2 text-xs text-slate-400 italic">{item.partOfSpeech}</span>
            )}
          </div>
          <ChevronDown
            size={14}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Remove button — visually separated */}
        <button
          onClick={onRemove}
          className="px-3 border-l border-slate-100 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
          title="Remove from session"
        >
          <X size={14} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-3 pt-2.5 border-t border-slate-100 space-y-1.5">
          {item.definitionEn ? (
            <p className="text-sm text-slate-600 leading-relaxed">{item.definitionEn}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No definition yet.</p>
          )}
          {item.exampleSentence && (
            <p className="text-xs text-slate-400 italic">
              &ldquo;{item.exampleSentence}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DailyChallengePage() {
  const navigate = useNavigate()
  const allItems = useVocabStore((s) => s.items)
  const recordExposure = useVocabStore((s) => s.recordExposure)
  const { addPoints, recordChallengeCompletion, checkBadges, streakDays, points } =
    useGamificationStore()

  const [slots, setSlots] = useState<ChallengeSlot[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [phase, setPhase] = useState<'loading' | 'preview' | 'exercising' | 'complete'>('loading')
  const [newBadges, setNewBadges] = useState<ReturnType<typeof checkBadges>>([])
  const [isBonus, setIsBonus] = useState(false)

  // Track all item ids used so far (main + bonus) to avoid repeats in bonus
  const usedItemIds = useRef<Set<string>>(new Set())
  // Stores the advance() fn that runs when the feedback overlay is dismissed
  const pendingAdvance = useRef<(() => void) | null>(null)

  // Set of ids currently in preview slots (drives picker exclusion list)
  const slotIds = useMemo(() => new Set(slots.map((s) => s.item.id)), [slots])

  // Build challenge slots on mount (main round only)
  useEffect(() => {
    const due = shuffle(
      allItems.filter((i) => isDueChallengeNow(i.exposureCount, i.nextChallengeDate)),
    ).slice(0, MAX_ITEMS)

    if (due.length === 0) {
      setPhase('complete')
      return
    }

    due.forEach((i) => usedItemIds.current.add(i.id))
    setSlots(due.map((item) => ({ item, exerciseType: pickExerciseType(item, allItems) })))
    setPhase('preview')
  }, [allItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview: remove a word ──────────────────────────────────────────────────
  function handleRemove(itemId: string) {
    setSlots((prev) => prev.filter((s) => s.item.id !== itemId))
    usedItemIds.current.delete(itemId) // allow re-adding later via picker
  }

  // ── Preview: add a word from the picker ────────────────────────────────────
  function handleAdd(item: VocabItem) {
    usedItemIds.current.add(item.id)
    setSlots((prev) => [...prev, { item, exerciseType: pickExerciseType(item, allItems) }])
  }

  // ── Start bonus round ───────────────────────────────────────────────────────
  function startBonusRound() {
    const available = shuffle(
      allItems.filter((i) => !usedItemIds.current.has(i.id) && !i.archived && i.definitionEn),
    ).slice(0, MAX_ITEMS)
    if (available.length === 0) return
    available.forEach((i) => usedItemIds.current.add(i.id))
    setSlots(available.map((item) => ({ item, exerciseType: pickExerciseType(item, allItems) })))
    setCurrentIndex(0)
    setResults([])
    setIsBonus(true)
    setPhase('preview')
  }

  // ── Answer handler ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback(
    (result: ExerciseResult) => {
      recordExposure(result.itemId, result.correct)
      addPoints(result.points)
      setResults((prev) => [...prev, result])

      function advance() {
        if (currentIndex + 1 >= slots.length) {
          if (!isBonus) {
            recordChallengeCompletion()
            const unlocked = checkBadges()
            setNewBadges(unlocked)
          }
          setPhase('complete')
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }

      if (result.exerciseType === 'sentence-create') {
        advance()
        return
      }

      pendingAdvance.current = advance
      setFeedback({
        correct: result.correct,
        points: result.points,
        userAnswer: result.userAnswer,
        correctAnswer: result.correctAnswer ?? slots[currentIndex]?.item.term ?? '',
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, slots, isBonus, recordExposure, addPoints, recordChallengeCompletion, checkBadges],
  )

  const dismissFeedback = useCallback(() => {
    if (!feedback) return
    setFeedback(null)
    pendingAdvance.current?.()
    pendingAdvance.current = null
  }, [feedback])

  useEffect(() => {
    if (!feedback) return
    const onKey = () => dismissFeedback()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedback, dismissFeedback])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  if (phase === 'preview') {
    return (
      <div className="max-w-lg mx-auto px-4 py-4 pb-32">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">
              {isBonus ? 'Bonus Round' : 'Daily Challenge'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-600">{streakDays}d</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {isBonus ? '🎯 Bonus round' : "Today's words"}
          </h1>
          <p className="text-sm text-slate-500">
            {slots.length} word{slots.length !== 1 ? 's' : ''} selected.
            {' '}Remove any you don't want, or add others from your library.
          </p>
        </div>

        {/* Word list */}
        <div className="space-y-2 mb-4">
          {slots.map(({ item }) => (
            <PreviewRow
              key={item.id}
              item={item}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>

        {/* Add from library button */}
        {slots.length < MAX_ITEMS && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Plus size={16} />
            Add from library
          </button>
        )}

        {/* Pinned start button */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <button
            onClick={() => setPhase('exercising')}
            disabled={slots.length === 0}
            className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 bg-brand-600 text-white rounded-2xl font-bold text-base hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg shadow-brand-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            <PlayCircle size={20} />
            Start{isBonus ? ' bonus round' : ' challenge'}
            {slots.length > 0 && (
              <span className="ml-1 text-brand-200 font-normal text-sm">
                · {slots.length} word{slots.length !== 1 ? 's' : ''}
              </span>
            )}
          </button>
        </div>

        {/* Word picker modal */}
        {showPicker && (
          <WordPickerModal
            allItems={allItems}
            excludeIds={slotIds}
            onSelect={handleAdd}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    )
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  if (phase === 'complete') {
    const totalPoints = results.reduce((s, r) => s + r.points, 0)
    const correctCount = results.filter((r) => r.correct).length
    const total = results.length
    const bonusAvailable = allItems.some(
      (i) => !usedItemIds.current.has(i.id) && !i.archived && i.definitionEn,
    )

    return (
      <div className="max-w-md mx-auto px-4 py-10 pb-24 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
          <Trophy size={28} className="text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {total === 0 ? 'All caught up!' : isBonus ? 'Bonus round done!' : 'Challenge complete!'}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {total === 0
            ? 'No items are due for practice right now.'
            : `You practised ${total} word${total !== 1 ? 's' : ''}.`}
        </p>

        {total > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <ScoreCard label="Points earned" value={`+${totalPoints}`} color="text-brand-600" bg="bg-brand-50" />
              <ScoreCard label="Correct" value={`${correctCount}/${total}`} color="text-emerald-600" bg="bg-emerald-50" />
              <ScoreCard label="Streak" value={`${streakDays}d`} color="text-orange-600" bg="bg-orange-50" />
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-6 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total points</span>
              <span className="text-lg font-bold text-brand-700">{points}</span>
            </div>
          </>
        )}

        {newBadges.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              New badges unlocked!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {newBadges.map((b) => (
                <div key={b.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                  <span>{b.emoji}</span>
                  <span className="text-sm font-semibold text-amber-800">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {streakDays > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-orange-600 mb-8">
            <Flame size={16} />
            <span className="font-semibold">{streakDays}-day streak — keep it up!</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {bonusAvailable && (
            <button
              onClick={startBonusRound}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Start bonus round
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              bonusAvailable
                ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
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
  const progress = (currentIndex / slots.length) * 100

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 min-h-screen relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setPhase('preview')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          title="Back to word list"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">
            {isBonus ? 'Bonus Round' : 'Daily Challenge'}
          </span>
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

      {exerciseType !== 'multiple-choice' && exerciseType !== 'fill-blank' && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900">{item.term}</h2>
          {item.partOfSpeech && (
            <p className="text-sm text-slate-400 italic mt-0.5">{item.partOfSpeech}</p>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {exerciseType === 'fill-blank' && (
          <FillBlankExercise key={`${item.id}-fill`} item={item} onAnswer={handleAnswer} />
        )}
        {exerciseType === 'multiple-choice' && (
          <MultipleChoiceExercise key={`${item.id}-mc`} item={item} allItems={allItems} onAnswer={handleAnswer} />
        )}
        {exerciseType === 'synonym-match' && (
          <SynonymMatchExercise key={`${item.id}-syn`} item={item} allItems={allItems} onAnswer={handleAnswer} />
        )}
        {exerciseType === 'sentence-create' && (
          <SentenceCreateExercise key={`${item.id}-sent`} item={item} onAnswer={handleAnswer} />
        )}
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div
          role="button"
          tabIndex={0}
          onClick={dismissFeedback}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dismissFeedback() }}
          className={`fixed inset-0 flex flex-col items-center justify-center z-50 cursor-pointer select-none ${
            feedback.correct ? 'bg-emerald-600/90' : 'bg-red-600/90'
          }`}
        >
          <div className="text-white text-center px-6">
            {feedback.correct ? (
              <>
                <CheckCircle size={56} className="mx-auto mb-4 opacity-90" />
                <p className="text-3xl font-bold mb-1">Correct!</p>
                <p className="text-lg opacity-80">+{feedback.points} pts</p>
              </>
            ) : (
              <>
                <XCircle size={56} className="mx-auto mb-4 opacity-90" />
                <p className="text-3xl font-bold mb-2">Not quite</p>
                <p className="text-lg opacity-90">
                  Answer: <strong>{feedback.correctAnswer}</strong>
                </p>
              </>
            )}
          </div>
          <p className="text-white/50 text-sm mt-10 tracking-wide">
            tap anywhere or press any key to continue
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
