/**
 * SpeedGamePage — time-limited speed practice
 *
 * Phases:
 *   setup     → user picks duration
 *   playing   → countdown + question + 4-choice answer buttons
 *   feedback  → brief flash (correct ✓ / wrong ✗ + correct answer shown)
 *   results   → end-game summary
 *
 * Progress rule (CLAUDE.md §Progress):
 *   recordExposure(id, true) is called at most once per word per session.
 *   wordsGainedExposure tracks this in React state (never persisted).
 *   Words already at MAX_EXPOSURE (8) are still playable but skipped.
 *
 * Gamification guardrails (CLAUDE.md §Gamification Constraints):
 *   • No points, XP, or persistent score — session counts only
 *   • End-screen shows "correct answers / total" — objective state
 *   • No streaks, badges, or performance ratings
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Timer, CheckCircle2, XCircle, ChevronRight,
  Zap, RotateCcw, BookOpen,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import {
  SPEED_GAME_DURATIONS,
  SPEED_GAME_DURATION_LABELS,
  type SpeedGameDuration,
  type SpeedQuestion,
  selectPool,
  generateBatch,
  canGainExposure,
} from '@/lib/speedGame'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'playing' | 'feedback' | 'results'

interface FeedbackState {
  correct:       boolean
  correctAnswer: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** How long (ms) to show the feedback flash before advancing. */
const FEEDBACK_DURATION_MS = 900

/** How many questions to pre-generate at once before refilling the queue. */
const BATCH_SIZE = 40

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function accuracyPct(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TimerBar({
  remaining,
  total,
}: {
  remaining: number
  total:     number
}) {
  const pct = total === 0 ? 0 : (remaining / total) * 100
  const urgent = remaining <= 10

  return (
    <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear ${
          urgent ? 'bg-red-500' : 'bg-brand-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SpeedGamePage() {
  const navigate  = useNavigate()
  const { items, recordExposure } = useVocabStore()

  // ── Phase state ──────────────────────────────────────────────────────────
  const [phase,    setPhase]    = useState<Phase>('setup')
  const [duration, setDuration] = useState<SpeedGameDuration>(180)

  // ── Game state ───────────────────────────────────────────────────────────
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [questions, setQuestions] = useState<SpeedQuestion[]>([])
  const [qIndex,    setQIndex]    = useState(0)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [practiced, setPracticed] = useState<Set<string>>(new Set())
  const [feedback,  setFeedback]  = useState<FeedbackState | null>(null)

  /**
   * Per-session exposure cap — set of word IDs that already received
   * a recordExposure(true) call this session.  Lives in a ref (not state)
   * so it doesn't trigger re-renders and is always current inside callbacks.
   */
  const wordsGainedExposure = useRef<Set<string>>(new Set())

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          setPhase('results')
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [phase])

  // ── Auto-advance after feedback flash ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'feedback') return
    const id = setTimeout(() => {
      setFeedback(null)
      setQIndex((i) => i + 1)
      setPhase('playing')
    }, FEEDBACK_DURATION_MS)
    return () => clearTimeout(id)
  }, [phase])

  // ── Refill question queue when running low ────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const remaining = questions.length - qIndex
    if (remaining < 5) {
      const pool     = selectPool(items)
      const newBatch = generateBatch(pool, BATCH_SIZE)
      setQuestions((prev) => [...prev.slice(qIndex), ...newBatch])
      setQIndex(0)
    }
  }, [qIndex, questions.length, phase, items])

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    wordsGainedExposure.current = new Set()
    setCorrect(0)
    setWrong(0)
    setPracticed(new Set())
    setFeedback(null)
    setQIndex(0)

    const pool  = selectPool(items)
    const batch = generateBatch(pool, BATCH_SIZE)
    setQuestions(batch)
    setTimeLeft(duration)
    setPhase(batch.length === 0 ? 'results' : 'playing')
  }, [duration, items])

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = useCallback((choiceIndex: number) => {
    if (phase !== 'playing') return

    const q          = questions[qIndex]
    const isCorrect  = choiceIndex === q.correctIndex

    // Track unique words practiced
    setPracticed((prev) => new Set([...prev, q.itemId]))

    if (isCorrect) {
      setCorrect((c) => c + 1)
      // Session cap: only give exposure credit on first correct answer per word
      if (
        canGainExposure(items.find((i) => i.id === q.itemId) ?? { exposureCount: 0 } as any) &&
        !wordsGainedExposure.current.has(q.itemId)
      ) {
        wordsGainedExposure.current.add(q.itemId)
        void recordExposure(q.itemId, true)
      }
    } else {
      setWrong((w) => w + 1)
      // Wrong answers do NOT call recordExposure — speed game errors should
      // not reset a word's SRS schedule.
    }

    setFeedback({
      correct:       isCorrect,
      correctAnswer: q.choices[q.correctIndex],
    })
    setPhase('feedback')
  }, [phase, questions, qIndex, items, recordExposure])

  // ── Keyboard shortcut: 1–4 to answer ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return

    function onKey(e: KeyboardEvent) {
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= 4) handleAnswer(n - 1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleAnswer])

  // ── Render ────────────────────────────────────────────────────────────────

  const currentQuestion = questions[qIndex]

  // ── Phase: setup ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const pool = selectPool(items)
    const noWords = pool.length < 4

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Speed Practice</h1>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Answer quick questions about your vocabulary. Each correct answer
          counts once per word toward your progress.
        </p>

        {noWords && (
          <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <BookOpen size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p>
              You need at least 4 words with definitions in your library.
              Add more vocabulary to play.
            </p>
          </div>
        )}

        {/* Duration picker */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Select duration
          </p>
          <div className="grid grid-cols-5 gap-2">
            {SPEED_GAME_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  duration === d
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                {SPEED_GAME_DURATION_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 space-y-2 text-xs text-slate-500">
          <p className="flex items-start gap-2">
            <span className="text-brand-500 font-bold shrink-0">·</span>
            Questions pick from your {pool.length} eligible words
          </p>
          <p className="flex items-start gap-2">
            <span className="text-brand-500 font-bold shrink-0">·</span>
            Fill blanks, match definitions, synonyms, and more
          </p>
          <p className="flex items-start gap-2">
            <span className="text-brand-500 font-bold shrink-0">·</span>
            First correct answer per word adds one exposure to its progress
          </p>
          <p className="flex items-start gap-2">
            <span className="text-brand-500 font-bold shrink-0">·</span>
            Press <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5">1</kbd>–
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5">4</kbd> to answer on keyboard
          </p>
        </div>

        <button
          onClick={startGame}
          disabled={noWords}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <Zap size={16} />
          Start {SPEED_GAME_DURATION_LABELS[duration]} game
        </button>
      </div>
    )
  }

  // ── Phase: results ────────────────────────────────────────────────────────
  if (phase === 'results') {
    const total    = correct + wrong
    const accuracy = accuracyPct(correct, total)
    const gained   = wordsGainedExposure.current.size

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Session complete</h1>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{correct}</p>
            <p className="text-xs text-emerald-600 mt-1">Correct answers</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-rose-600">{wrong}</p>
            <p className="text-xs text-rose-500 mt-1">Wrong answers</p>
          </div>
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-brand-700">{accuracy}%</p>
            <p className="text-xs text-brand-600 mt-1">Accuracy</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-slate-700">{practiced.size}</p>
            <p className="text-xs text-slate-500 mt-1">Words practiced</p>
          </div>
        </div>

        {/* Progress update summary */}
        {gained > 0 && (
          <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <Zap size={15} className="shrink-0 mt-0.5 text-amber-500" />
            <p>
              <span className="font-semibold">{gained} word{gained !== 1 ? 's' : ''}</span>{' '}
              gained an exposure point toward their next stage.
            </p>
          </div>
        )}

        {total === 0 && (
          <p className="text-sm text-slate-400 text-center mb-4">
            No questions answered — try again!
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={() => setPhase('setup')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={15} />
            Play again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-2xl transition-colors"
          >
            Done
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: playing / feedback ─────────────────────────────────────────────
  if (!currentQuestion) {
    // Pool exhausted or generation failed
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-slate-500 text-sm">Loading questions…</p>
      </div>
    )
  }

  const urgent = timeLeft <= 10 && phase === 'playing'

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-8 flex flex-col min-h-screen">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setPhase('results')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="End game"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
          urgent ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
        }`}>
          <Timer size={14} className={urgent ? 'animate-pulse' : ''} />
          {formatTime(timeLeft)}
        </div>

        <div className="flex-1">
          <TimerBar remaining={timeLeft} total={duration} />
        </div>

        {/* Running score */}
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <span className="text-emerald-600">{correct}✓</span>
          <span className="text-slate-300">·</span>
          <span className="text-rose-500">{wrong}✗</span>
        </div>
      </div>

      {/* ── Question card ── */}
      <div className={`flex-1 rounded-2xl border p-5 mb-4 transition-colors ${
        phase === 'feedback'
          ? feedback?.correct
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-rose-50 border-rose-300'
          : 'bg-white border-slate-200'
      }`}>

        {/* Question type label */}
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {currentQuestion.type === 'fill-blank'         && 'Complete the sentence'}
          {currentQuestion.type === 'definition-to-term' && 'Name the word'}
          {currentQuestion.type === 'term-to-definition' && 'Pick the meaning'}
          {currentQuestion.type === 'synonym-to-term'    && 'Match the synonym'}
        </p>

        {/* Prompt */}
        <p className="text-base font-semibold text-slate-900 leading-snug mb-4 whitespace-pre-line">
          {currentQuestion.prompt}
        </p>

        {/* Feedback overlay */}
        {phase === 'feedback' && feedback && (
          <div className={`flex items-center gap-2 mb-4 text-sm font-semibold rounded-xl px-3 py-2 ${
            feedback.correct
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}>
            {feedback.correct
              ? <><CheckCircle2 size={16} /> Correct!</>
              : <><XCircle size={16} /> Correct answer: <span className="ml-1 font-bold">{feedback.correctAnswer}</span></>
            }
          </div>
        )}
      </div>

      {/* ── Answer choices ── */}
      <div className="grid grid-cols-1 gap-2">
        {currentQuestion.choices.map((choice, idx) => {
          const showCorrect = phase === 'feedback' && idx === currentQuestion.correctIndex

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={phase === 'feedback'}
              className={`relative w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors disabled:cursor-default ${
                phase === 'feedback' && showCorrect
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : phase === 'feedback'
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  phase === 'playing'
                    ? 'border-slate-300 text-slate-400'
                    : showCorrect
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-200 text-slate-300'
                }`}>
                  {idx + 1}
                </span>
                {choice}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
