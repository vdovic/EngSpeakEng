import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowLeft, Trophy, Flame, CheckCircle, XCircle,
  ChevronDown, PlayCircle, X, Plus, Search, Shuffle, Layers, RotateCcw, BookOpen,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemesStore } from '@/store/themesStore'
import { LogUsageModal } from '@/components/LogUsageModal'
import { isDueChallengeNow, intervalLabel } from '@/lib/challengeSchedule'
import { getChallengeType, CHALLENGE_TYPE_LABEL, ChallengeType } from '@/lib/challengeLogic'
import { CHALLENGE_SESSION_CAP, SESSION_SIZES, STATUS_ORDER, MAX_EXPOSURE, MASTERY_USES } from '@/lib/constants'
import { usagePoints } from '@/lib/mastery'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { LevelBadge } from '@/components/LevelBadge'
import { ExposureProgress } from '@/components/ExposureProgress'
import { DefinitionChoiceChallenge } from '@/components/challenges/DefinitionChoiceChallenge'
import { FillGapChallenge } from '@/components/challenges/FillGapChallenge'
import { SentenceProductionChallenge } from '@/components/challenges/SentenceProductionChallenge'
import { RealLifeUseCheckChallenge } from '@/components/challenges/RealLifeUseCheckChallenge'
import { WordDetailModal } from '@/components/WordDetailModal'
import {
  saveSession, loadTodaySession, clearSession, todayKey,
} from '@/lib/challengeSession'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChallengeSlot {
  item: VocabItem
  challengeType: ChallengeType
}

type FeedbackState = {
  correct: boolean
  points: number
  userAnswer: string
  correctAnswer: string
  exampleSentence?: string
  itemId: string
  /** exposureCount of the item BEFORE this answer was recorded */
  oldExposureCount: number
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          <h2 className="flex-1 text-base font-bold text-slate-900">Add from library</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
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
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {available.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No matching words found</div>
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
                  <LevelBadge item={item} />
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
  item: slotItem,
  allItems,
  onRemove,
}: {
  item: VocabItem
  allItems: VocabItem[]
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const item = allItems.find((i) => i.id === slotItem.id) ?? slotItem
  const usesDone = usagePoints(item.activation.usageLogs)
  const challengesDone = item.exposureCount ?? 0

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-stretch">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors min-w-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">{item.term}</span>
              {item.partOfSpeech && (
                <span className="text-xs text-slate-400 italic">{item.partOfSpeech}</span>
              )}
              <LevelBadge item={item} compact className="shrink-0" />
            </div>
            {/* Progress indicators */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {/* Usage (real-life practice) */}
              <div className="flex items-center gap-1">
                {Array.from({ length: MASTERY_USES }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full border-2 transition-colors ${
                      i < usesDone
                        ? 'bg-brand-500 border-brand-500'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                ))}
                <span className="text-[11px] text-slate-400 ml-0.5 tabular-nums">
                  {usesDone}/{MASTERY_USES} used
                </span>
              </div>
              {/* Challenge exposure dots */}
              <ExposureProgress exposureCount={challengesDone} compact />
            </div>
          </div>
          <ChevronDown size={14} className={`shrink-0 text-slate-400 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
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
            <p className="text-xs text-slate-400 italic">&ldquo;{item.exampleSentence}&rdquo;</p>
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
  const recordChallengeAttempt = useVocabStore((s) => s.recordChallengeAttempt)
  const { addPoints, recordChallengeCompletion, checkBadges, streakDays, points } =
    useGamificationStore()
  const allThemes = useThemesStore((s) => s.themes)

  const [slots, setSlots] = useState<ChallengeSlot[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [phase, setPhase] = useState<'loading' | 'preview' | 'exercising' | 'complete'>('loading')
  const [newBadges, setNewBadges] = useState<ReturnType<typeof checkBadges>>([])
  const [isBonus, setIsBonus] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [reshaking, setReshaking] = useState(false)
  const [sessionSize, setSessionSize] = useState<number>(CHALLENGE_SESSION_CAP)

  const [wordDetailItem, setWordDetailItem]           = useState<VocabItem | null>(null)
  const [resumeBanner, setResumeBanner]               = useState<string | null>(null)
  const [usageModalItemId, setUsageModalItemId]       = useState<string | null>(null)
  const [usageModalTerm, setUsageModalTerm]           = useState<string>('')

  const usedItemIds = useRef<Set<string>>(new Set())
  const pendingAdvance = useRef<(() => void) | null>(null)
  const slotIds = useMemo(() => new Set(slots.map((s) => s.item.id)), [slots])

  // ── Slot builders ────────────────────────────────────────────────────────────

  function buildDueSlots(cap = sessionSize): ChallengeSlot[] {
    // Pool A: Standard SRS-due items (exposure 0–7)
    const standardDue = allItems.filter(
      (i) =>
        !i.archived &&
        i.status !== 'mastered' &&
        isDueChallengeNow(i.exposureCount, i.nextChallengeDate),
    )

    // Pool B: exposure=8 items that still need sentence production (not yet Level 3)
    const needsSentence = allItems.filter(
      (i) =>
        !i.archived &&
        i.status !== 'mastered' &&
        (i.exposureCount ?? 0) >= 8 &&
        !i.review.sentenceProduced,
    )
    // Merge pools, deduplicate
    const standardIds = new Set(standardDue.map((i) => i.id))
    const allDue = [...standardDue, ...needsSentence.filter((i) => !standardIds.has(i.id))]

    // Prioritise: My Current Focus first, then lower exposure, then higher difficulty
    const focusDue  = shuffle(allDue.filter((i) => i.inFocus || i.weeklyFocus))
    const normalDue = shuffle(allDue.filter((i) => !i.inFocus && !i.weeklyFocus))

    const focusTarget = Math.ceil(cap * 0.6)
    const focusPick   = focusDue.slice(0, Math.min(focusTarget, focusDue.length))
    const normalPick  = normalDue.slice(0, cap - focusPick.length)

    return shuffle([...focusPick, ...normalPick])
      .slice(0, cap)
      .map((item) => ({ item, challengeType: getChallengeType(item) }))
  }

  function buildThemeSlots(theme: string, cap = sessionSize): ChallengeSlot[] {
    const pool = allItems.filter(
      (i) =>
        !i.archived &&
        (i.themes ?? []).includes(theme) &&
        i.definitionEn &&
        i.status !== 'mastered' &&
        (i.exposureCount ?? 0) < 8,
    )
    const due    = shuffle(pool.filter((i) =>  isDueChallengeNow(i.exposureCount, i.nextChallengeDate)))
    const notDue = shuffle(pool.filter((i) => !isDueChallengeNow(i.exposureCount, i.nextChallengeDate)))
    return [...due, ...notDue]
      .slice(0, cap)
      .map((item) => ({ item, challengeType: getChallengeType(item) }))
  }

  // ── Mount: restore session OR build fresh ────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = loadTodaySession()

    if (saved && !saved.isBonus) {
      // Guard: discard sessions saved before Phase 3 (they use `exerciseType`)
      const isPhase3Session = saved.slots.every((s) => 'challengeType' in s && s.challengeType)
      if (isPhase3Session) {
        const restoredSlots: ChallengeSlot[] = saved.slots
          .map((s) => {
            const item = allItems.find((i) => i.id === s.itemId)
            return item ? { item, challengeType: s.challengeType } : null
          })
          .filter((s): s is ChallengeSlot => s !== null)

        if (restoredSlots.length > 0) {
          restoredSlots.forEach((s) => usedItemIds.current.add(s.item.id))
          setSlots(restoredSlots)
          setResults(saved.results)

          if (saved.completed) {
            setPhase('complete')
            return
          }

          if (saved.currentIndex > 0) {
            setCurrentIndex(saved.currentIndex)
            setPhase('exercising')
            const n = saved.currentIndex + 1
            setResumeBanner(`Resuming your challenge · ${n}/${restoredSlots.length}`)
            return
          }
        }
      }
    }

    // Build fresh
    const initial = buildDueSlots()
    if (initial.length === 0) {
      setPhase('complete')
      return
    }
    initial.forEach((s) => usedItemIds.current.add(s.item.id))
    setSlots(initial)
    setPhase('preview')
  }, []) // run once on mount only

  useEffect(() => {
    if (!resumeBanner) return
    const t = setTimeout(() => setResumeBanner(null), 3000)
    return () => clearTimeout(t)
  }, [resumeBanner])

  // ── Persist session ────────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isBonus || slots.length === 0) return
    if (phase !== 'exercising' && phase !== 'complete') return
    saveSession({
      date: todayKey(),
      slots: slots.map((s) => ({ itemId: s.item.id, challengeType: s.challengeType })),
      currentIndex,
      results,
      completed: phase === 'complete',
      isBonus: false,
    })
  }, [phase, currentIndex, results]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reshuffle ─────────────────────────────────────────────────────────────────

  function handleReshuffle() {
    const newSlots = selectedGroup ? buildThemeSlots(selectedGroup) : buildDueSlots()
    if (newSlots.length === 0) return
    usedItemIds.current = new Set(newSlots.map((s) => s.item.id))
    setSlots(newSlots)
    setReshaking(true)
    setTimeout(() => setReshaking(false), 400)
  }

  function handleGroupChange(group: string) {
    setSelectedGroup(group)
    const newSlots = group ? buildThemeSlots(group) : buildDueSlots()
    usedItemIds.current = new Set(newSlots.map((s) => s.item.id))
    setSlots(newSlots)
  }

  function handleSessionSizeChange(size: number) {
    setSessionSize(size)
    const newSlots = selectedGroup ? buildThemeSlots(selectedGroup, size) : buildDueSlots(size)
    usedItemIds.current = new Set(newSlots.map((s) => s.item.id))
    setSlots(newSlots)
  }

  function handleRemove(itemId: string) {
    setSlots((prev) => prev.filter((s) => s.item.id !== itemId))
    usedItemIds.current.delete(itemId)
  }

  function handleAdd(item: VocabItem) {
    usedItemIds.current.add(item.id)
    setSlots((prev) => [...prev, { item, challengeType: getChallengeType(item) }])
  }

  // ── Restart / fresh ───────────────────────────────────────────────────────────

  function restartSameWords() {
    clearSession()
    // Always look up live item data from the Zustand store so that exposureCount
    // and other fields updated during the just-completed session are reflected in
    // the new session's challenge type selection and preview card.
    const liveSlots = slots.map((s) => {
      const liveItem = allItems.find((i) => i.id === s.item.id) ?? s.item
      return { item: liveItem, challengeType: getChallengeType(liveItem) }
    })
    usedItemIds.current = new Set(liveSlots.map((s) => s.item.id))
    setSlots(liveSlots)
    setCurrentIndex(0)
    setResults([])
    setIsBonus(false)
    setFeedback(null)
    setPhase('preview')
  }

  function startFreshChallenge() {
    clearSession()
    const fresh = buildDueSlots()
    usedItemIds.current = new Set(fresh.map((s) => s.item.id))
    setSlots(fresh)
    setCurrentIndex(0)
    setResults([])
    setIsBonus(false)
    setFeedback(null)
    setPhase(fresh.length === 0 ? 'complete' : 'preview')
  }

  // ── Bonus round ───────────────────────────────────────────────────────────────

  function startBonusRound() {
    const available = shuffle(
      allItems.filter((i) => !usedItemIds.current.has(i.id) && !i.archived && i.definitionEn),
    ).slice(0, CHALLENGE_SESSION_CAP)
    if (available.length === 0) return
    available.forEach((i) => usedItemIds.current.add(i.id))
    setSlots(available.map((item) => ({ item, challengeType: getChallengeType(item) })))
    setCurrentIndex(0)
    setResults([])
    setIsBonus(true)
    setPhase('preview')
  }

  // ── Answer handler ────────────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (result: ExerciseResult) => {
      const currentSlot = slots[currentIndex]
      if (!currentSlot) return

      const oldExposureCount =
        allItems.find((i) => i.id === result.itemId)?.exposureCount ?? 0

      // Route through recordChallengeAttempt so sentence-production and
      // real-life-use-check get their special side-effects.
      recordChallengeAttempt(
        result.itemId,
        currentSlot.challengeType,
        result.correct,
        result.userAnswer,
      )
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

      // Production-style challenges handle their own feedback UI — advance immediately.
      const skipFeedbackOverlay =
        result.exerciseType === 'sentence-create' ||
        result.exerciseType === 'sentence-production' ||
        result.exerciseType === 'real-life-use-check'

      if (skipFeedbackOverlay) {
        advance()
        return
      }

      pendingAdvance.current = advance
      setFeedback({
        correct: result.correct,
        points: result.points,
        userAnswer: result.userAnswer,
        correctAnswer: result.correctAnswer ?? currentSlot.item.term,
        exampleSentence: currentSlot.item.exampleSentence ?? undefined,
        itemId: result.itemId,
        oldExposureCount,
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, slots, isBonus, recordChallengeAttempt, addPoints, recordChallengeCompletion, checkBadges],
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

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────────────────────

  if (phase === 'preview') {
    return (
      <div className="max-w-lg mx-auto px-4 py-4 pb-36">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
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

        <div className="mb-3">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {isBonus ? '🎯 Bonus round' : "Today's words"}
          </h1>
          <p className="text-sm text-slate-500">
            Review the list, remove words you want to skip, or change the group.
          </p>
        </div>

        {/* Toolbar */}
        {!isBonus && (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                onClick={handleReshuffle}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all ${reshaking ? 'animate-spin-once' : ''}`}
              >
                <Shuffle size={15} />
                Reshuffle
              </button>
              {allThemes.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm">
                  <Layers size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={selectedGroup}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                  >
                    <option value="">Due words</option>
                    <optgroup label="Pick from theme">
                      {allThemes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}
              <span className="text-xs text-slate-400 ml-auto">
                {slots.length} word{slots.length !== 1 ? 's' : ''}
                {selectedGroup && <span className="ml-1 text-indigo-500 font-medium">· {selectedGroup}</span>}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-slate-500 shrink-0">Session size:</span>
              <div className="flex gap-1.5">
                {SESSION_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSessionSizeChange(size)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      sessionSize === size
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {slots.length === 0 && selectedGroup && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-sm font-medium text-slate-600 mb-1">No words in "{selectedGroup}"</p>
            <p className="text-xs text-slate-400 mb-3">Choose a different group or go back to due words.</p>
            <button onClick={() => handleGroupChange('')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              ← Back to due words
            </button>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {slots.map(({ item }) => (
            <PreviewRow key={item.id} item={item} allItems={allItems} onRemove={() => handleRemove(item.id)} />
          ))}
        </div>

        {slots.length < sessionSize && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Plus size={16} />
            Add from library
          </button>
        )}

        {/* Pinned start CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[5.5rem] md:pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <button
            onClick={() => { clearSession(); setPhase('exercising') }}
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

  // ── Complete ──────────────────────────────────────────────────────────────────

  if (phase === 'complete') {
    const totalPoints = results.reduce((s, r) => s + r.points, 0)
    const correctCount = results.filter((r) => r.correct).length
    const total = results.length
    const bonusAvailable = !isBonus && allItems.some(
      (i) => !usedItemIds.current.has(i.id) && !i.archived && i.definitionEn,
    )

    return (
      <div className="max-w-md mx-auto px-4 py-10 pb-32 text-center">
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
              <ScoreCard label="Correct"       value={`${correctCount}/${total}`} color="text-emerald-600" bg="bg-emerald-50" />
              <ScoreCard label="Streak"        value={`${streakDays}d`} color="text-orange-600" bg="bg-orange-50" />
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 mb-6 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total points</span>
              <span className="text-lg font-bold text-brand-700">{points}</span>
            </div>

            {/* Per-word summary */}
            <div className="bg-white border border-slate-200 rounded-2xl mb-6 overflow-hidden text-left">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Words practised</p>
                <p className="text-xs text-slate-400">Challenge progress (0–{MAX_EXPOSURE})</p>
              </div>
              <div className="divide-y divide-slate-50">
                {results.map((result) => {
                  const liveItem = allItems.find((i) => i.id === result.itemId)
                  const currentCount = liveItem?.exposureCount ?? 0
                  const oldCount = result.correct
                    ? Math.max(0, currentCount - 1)
                    : currentCount
                  return (
                    <div key={result.itemId} className="flex items-center gap-3 px-4 py-2.5">
                      {result.correct
                        ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                        : <XCircle    size={13} className="text-red-400 shrink-0" />}
                      <span className="text-sm font-semibold text-slate-800 flex-1 truncate min-w-0">
                        {liveItem?.term ?? '…'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ExposureProgress
                          exposureCount={currentCount}
                          compact
                        />
                        {result.correct && oldCount < currentCount ? (
                          <span className="text-[10px] font-bold text-emerald-600 tabular-nums">+1</span>
                        ) : !result.correct ? (
                          <span className="text-[10px] text-slate-400 tabular-nums">retry</span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {newBadges.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">New badges unlocked!</p>
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
              Continue practising
            </button>
          )}

          {!isBonus && slots.length > 0 && (
            <button
              onClick={restartSameWords}
              className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              Same words again
            </button>
          )}

          <button
            onClick={startFreshChallenge}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              bonusAvailable || (!isBonus && slots.length > 0)
                ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            Start fresh challenge
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
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

  // ── Exercising ────────────────────────────────────────────────────────────────

  const currentSlot = slots[currentIndex]
  if (!currentSlot) return null

  const { challengeType } = currentSlot
  // Normalise legacy 'recognition' type from old saved sessions → definition-choice.
  // getChallengeType() no longer returns 'recognition', but sessions persisted before
  // this change may still contain it.
  const activeType: ChallengeType = challengeType === 'recognition' ? 'definition-choice' : challengeType

  // Always read the live item so progress reflects the latest recordExposure writes.
  const item = allItems.find((i) => i.id === currentSlot.item.id) ?? currentSlot.item
  const progress = (results.length / slots.length) * 100

  // Types that embed the term/word in their own card UI — no separate heading needed.
  // definition-choice: definition is the prompt; term appears as an answer option.
  // fill-gap: answer IS the term; showing it as a heading spoils the exercise.
  // sentence-production + real-life-use-check: each component shows the word prominently.
  const embedsTerm =
    activeType === 'definition-choice' ||
    activeType === 'fill-gap' ||
    activeType === 'sentence-production' ||
    activeType === 'real-life-use-check'

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24 min-h-screen relative">

      {/* Resume banner */}
      {resumeBanner && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-100 rounded-xl text-xs font-medium text-brand-700">
          <RotateCcw size={12} className="shrink-0" />
          {resumeBanner}
          <button onClick={() => setResumeBanner(null)} className="ml-auto text-brand-400 hover:text-brand-700">
            <X size={12} />
          </button>
        </div>
      )}

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
        <button
          onClick={() => setWordDetailItem(item)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="View word details"
        >
          <BookOpen size={16} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Flame size={14} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-600">{streakDays}d</span>
          {/* Position indicator — "3 of 10" */}
          <span className="text-xs font-semibold text-slate-700 ml-2 tabular-nums">
            {currentIndex + 1}/{slots.length}
          </span>
        </div>
      </div>

      {/* Session progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Word header (for non-embedding challenges) ── */}
      {!embedsTerm && (
        <div className="mb-4">
          <h2 className="text-3xl font-bold text-slate-900">{item.term}</h2>
          {item.partOfSpeech && (
            <p className="text-sm text-slate-400 italic mt-0.5">{item.partOfSpeech}</p>
          )}
        </div>
      )}

      {/* ── Level + Exposure + Challenge type label ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <LevelBadge item={item} />
        <ExposureProgress exposureCount={item.exposureCount ?? 0} compact />
        <span className="ml-auto text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {CHALLENGE_TYPE_LABEL[activeType]}
        </span>
      </div>

      {/* ── Challenge card ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        {activeType === 'definition-choice' && (
          <DefinitionChoiceChallenge key={`${item.id}-def`} item={item} allItems={allItems} onAnswer={handleAnswer} />
        )}
        {activeType === 'fill-gap' && (
          <FillGapChallenge key={`${item.id}-fill`} item={item} allItems={allItems} onAnswer={handleAnswer} />
        )}
        {activeType === 'sentence-production' && (
          <SentenceProductionChallenge key={`${item.id}-sent`} item={item} onAnswer={handleAnswer} />
        )}
        {activeType === 'real-life-use-check' && (
          <RealLifeUseCheckChallenge key={`${item.id}-rluc`} item={item} onAnswer={handleAnswer} />
        )}
      </div>

      {/* ── Feedback overlay ── */}
      {feedback && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={dismissFeedback} />

          <div className={`fixed bottom-0 left-0 right-0 z-50 border-t-2 rounded-t-3xl shadow-2xl ${
            feedback.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="max-w-lg mx-auto px-5 py-5 pb-8">

              {/* Result header */}
              <div className="flex items-center gap-3 mb-4">
                {feedback.correct
                  ? <CheckCircle size={28} className="text-emerald-600 shrink-0" />
                  : <XCircle    size={28} className="text-red-600 shrink-0" />}
                <div className="flex-1">
                  <p className={`text-lg font-bold leading-tight ${feedback.correct ? 'text-emerald-800' : 'text-red-800'}`}>
                    {feedback.correct ? 'Correct!' : 'Not quite'}
                  </p>
                  {feedback.correct && (
                    <p className="text-sm text-emerald-600 font-semibold">+{feedback.points} pts</p>
                  )}
                </div>
              </div>

              {/* Correct answer (shown when the learner answered incorrectly) */}
              {!feedback.correct && feedback.correctAnswer && (
                <div className="rounded-xl px-4 py-3 mb-3 bg-red-100 border border-red-200">
                  <p className="text-xs font-semibold text-red-600 mb-0.5 uppercase tracking-wide">Correct answer</p>
                  <p className="text-base font-bold text-red-900">{feedback.correctAnswer}</p>
                </div>
              )}

              {/* Definition reminder on a wrong answer — helps consolidate the learning */}
              {!feedback.correct && item.definitionEn && (
                <div className="rounded-xl px-4 py-3 mb-3 bg-slate-100 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-0.5 uppercase tracking-wide">Definition</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{item.definitionEn}</p>
                </div>
              )}

              {/* Example sentence */}
              {feedback.exampleSentence && (
                <p className="text-sm text-slate-600 italic leading-relaxed mb-3">
                  &ldquo;{feedback.exampleSentence}&rdquo;
                </p>
              )}

              {/* Challenge journey dots */}
              {(() => {
                const oldCount = feedback.oldExposureCount
                const newCount = feedback.correct
                  ? Math.min(oldCount + 1, MAX_EXPOSURE)
                  : oldCount
                const nextInterval = feedback.correct
                  ? intervalLabel(newCount)
                  : '10 min'
                return (
                  <div className={`rounded-xl px-3.5 py-2.5 mb-4 ${
                    feedback.correct
                      ? 'bg-emerald-100/70 border border-emerald-200'
                      : 'bg-slate-100 border border-slate-200'
                  }`}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Challenge journey
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex gap-1">
                        {Array.from({ length: MAX_EXPOSURE }, (_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border-2 transition-colors ${
                              i < oldCount
                                ? 'bg-brand-400 border-brand-400'
                                : 'bg-white border-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      {feedback.correct && oldCount < MAX_EXPOSURE && (
                        <>
                          <span className="text-slate-400 text-sm font-bold">→</span>
                          <div className="flex gap-1">
                            {Array.from({ length: MAX_EXPOSURE }, (_, i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                                  i < newCount
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'bg-white border-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      {newCount >= MAX_EXPOSURE
                        ? '🎉 Challenge mastered!'
                        : feedback.correct
                        ? `Step ${oldCount + 1} of ${MAX_EXPOSURE} · next review in ${nextInterval}`
                        : `Staying at step ${oldCount} of ${MAX_EXPOSURE} · retry in ${nextInterval}`}
                    </p>
                  </div>
                )
              })()}

              {/* ── Real-life usage nudge for familiar words ── */}
              {(() => {
                if (!feedback.correct) return null
                const nudgeItem = allItems.find((i) => i.id === feedback.itemId)
                if (!nudgeItem) return null
                const exp = nudgeItem.exposureCount ?? 0
                if (exp < 5) return null                           // only for familiar words
                if (nudgeItem.activation.usageLogs.length > 0) return null  // already logged
                if (challengeType === 'real-life-use-check') return null
                return (
                  <div className="mb-3 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
                    <p className="text-xs font-semibold text-brand-700 mb-2">
                      💬 Can you use &ldquo;{nudgeItem.term}&rdquo; in real life today?
                    </p>
                    <button
                      onClick={() => {
                        setUsageModalItemId(nudgeItem.id)
                        setUsageModalTerm(nudgeItem.term)
                        dismissFeedback()
                      }}
                      className="text-xs font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900 transition-colors"
                    >
                      Log a real-life use →
                    </button>
                  </div>
                )
              })()}

              {/* Action buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    const it = allItems.find((i) => i.id === feedback.itemId)
                    if (it) setWordDetailItem(it)
                  }}
                  className="px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shrink-0"
                >
                  Word details
                </button>
                <button
                  onClick={dismissFeedback}
                  className={`flex-1 py-3 text-sm font-bold text-white rounded-2xl transition-colors ${
                    feedback.correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Continue →
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 mt-3">or press any key to continue</p>
            </div>
          </div>
        </>
      )}

      {/* Inline word detail modal */}
      {wordDetailItem && (
        <WordDetailModal item={wordDetailItem} onClose={() => setWordDetailItem(null)} />
      )}

      {/* Real-life usage modal (triggered from usage nudge in feedback overlay) */}
      {usageModalItemId && (
        <LogUsageModal
          itemId={usageModalItemId}
          term={usageModalTerm}
          onClose={() => setUsageModalItemId(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
