/**
 * SpeedGamePage — time-limited speed practice
 *
 * Phases:
 *   setup     → pick duration + word scope; see previous session history
 *   playing   → countdown + question + 4-choice answer buttons
 *   feedback  → brief flash (correct ✓ / wrong ✗ + correct answer shown)
 *   results   → end-game summary with comparison to previous best
 *
 * Progress rule (CLAUDE.md §Progress):
 *   recordExposure(id, true) is called at most once per word per session.
 *   wordsGainedExposure ref tracks the per-session cap; no stale closure.
 *   Words already at MAX_EXPOSURE (8) are still playable but skipped.
 *
 * Gamification guardrails (CLAUDE.md §Gamification Constraints):
 *   • No points, XP, or persistent score — session counts only
 *   • "Personal best" shown as objective comparison ("previously X, now Y")
 *     — quiet one-line note, no animations, no celebration language
 *   • No streaks, badges, or performance ratings stored
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Timer, CheckCircle2, XCircle, ChevronRight,
  Zap, RotateCcw, BookOpen, TrendingUp,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useSpeedGameStore } from '@/store/speedGameStore'
import {
  SPEED_GAME_DURATIONS,
  SPEED_GAME_DURATION_LABELS,
  type SpeedGameDuration,
  type SpeedGameResult,
  type SpeedQuestion,
  selectPool,
  countFocusPool,
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

const FEEDBACK_DURATION_MS = 900
const BATCH_SIZE            = 40

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Best correct-answer count for a given duration, or null if no history. */
function bestForDuration(
  results: SpeedGameResult[],
  durationSecs: number,
): number | null {
  const matching = results.filter((r) => r.durationSecs === durationSecs)
  if (matching.length === 0) return null
  return Math.max(...matching.map((r) => r.correct))
}

// ── TimerBar ──────────────────────────────────────────────────────────────────

function TimerBar({ remaining, total }: { remaining: number; total: number }) {
  const pct    = total === 0 ? 0 : (remaining / total) * 100
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
  const navigate             = useNavigate()
  const { items, recordExposure } = useVocabStore()
  const addResult            = useSpeedGameStore((s) => s.addResult)
  const pastResults          = useSpeedGameStore((s) => s.results)

  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase,     setPhase]     = useState<Phase>('setup')
  const [duration,  setDuration]  = useState<SpeedGameDuration>(180)
  const [focusOnly, setFocusOnly] = useState(false)

  // ── Game state ───────────────────────────────────────────────────────────
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [questions, setQuestions] = useState<SpeedQuestion[]>([])
  const [qIndex,    setQIndex]    = useState(0)
  const [correct,   setCorrect]   = useState(0)
  const [wrong,     setWrong]     = useState(0)
  const [practiced, setPracticed] = useState<Set<string>>(new Set())
  const [feedback,  setFeedback]  = useState<FeedbackState | null>(null)

  // Refs — always current inside timer/callback closures
  const wordsGainedExposure = useRef<Set<string>>(new Set())
  const latestStats         = useRef({ correct: 0, wrong: 0, practiced: new Set<string>() })
  /** Guard against double-save (timer expiry + manual end coinciding). */
  const resultSaved         = useRef(false)

  // ── Save result ───────────────────────────────────────────────────────────
  const saveResult = useCallback((
    finalCorrect:   number,
    finalWrong:     number,
    finalPracticed: Set<string>,
  ) => {
    if (resultSaved.current) return   // already saved — skip duplicate
    resultSaved.current = true

    const total = finalCorrect + finalWrong
    addResult({
      id:             crypto.randomUUID(),
      playedAt:       new Date().toISOString(),
      durationSecs:   duration,
      correct:        finalCorrect,
      wrong:          finalWrong,
      accuracy:       total > 0 ? Math.round((finalCorrect / total) * 100) : 0,
      wordsPracticed: finalPracticed.size,
      wordsGained:    wordsGainedExposure.current.size,
      focusOnly,
    })
  }, [duration, focusOnly, addResult])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          const { correct: c, wrong: w, practiced: p } = latestStats.current
          saveResult(c, w, p)
          setPhase('results')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, saveResult])

  // ── Feedback auto-advance ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'feedback') return
    const id = setTimeout(() => {
      setFeedback(null)
      setQIndex((i) => i + 1)
      setPhase('playing')
    }, FEEDBACK_DURATION_MS)
    return () => clearTimeout(id)
  }, [phase])

  // ── Refill question queue ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (questions.length - qIndex >= 5) return
    const pool     = selectPool(items, 80, focusOnly)
    const newBatch = generateBatch(pool, BATCH_SIZE)
    setQuestions((prev) => [...prev.slice(qIndex), ...newBatch])
    setQIndex(0)
  }, [qIndex, questions.length, phase, items, focusOnly])

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    wordsGainedExposure.current = new Set()
    latestStats.current         = { correct: 0, wrong: 0, practiced: new Set() }
    resultSaved.current         = false
    setCorrect(0)
    setWrong(0)
    setPracticed(new Set())
    setFeedback(null)
    setQIndex(0)

    const pool  = selectPool(items, 80, focusOnly)
    const batch = generateBatch(pool, BATCH_SIZE)
    setQuestions(batch)
    setTimeLeft(duration)
    setPhase(batch.length === 0 ? 'results' : 'playing')
  }, [duration, focusOnly, items])

  // End game manually (← button while playing)
  const endGame = useCallback(() => {
    const { correct: c, wrong: w, practiced: p } = latestStats.current
    saveResult(c, w, p)
    setPhase('results')
  }, [saveResult])

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = useCallback((choiceIndex: number) => {
    if (phase !== 'playing') return
    const q         = questions[qIndex]
    const isCorrect = choiceIndex === q.correctIndex

    setPracticed((prev) => {
      const next = new Set([...prev, q.itemId])
      latestStats.current.practiced = next
      return next
    })

    if (isCorrect) {
      setCorrect((c) => { latestStats.current.correct = c + 1; return c + 1 })
      if (
        canGainExposure(items.find((i) => i.id === q.itemId) ?? { exposureCount: 0 } as any) &&
        !wordsGainedExposure.current.has(q.itemId)
      ) {
        wordsGainedExposure.current.add(q.itemId)
        void recordExposure(q.itemId, true)
      }
    } else {
      setWrong((w) => { latestStats.current.wrong = w + 1; return w + 1 })
    }

    setFeedback({ correct: isCorrect, correctAnswer: q.choices[q.correctIndex] })
    setPhase('feedback')
  }, [phase, questions, qIndex, items, recordExposure])

  // ── Keyboard shortcuts 1–4 ────────────────────────────────────────────────
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

  // ── Setup phase ───────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const focusCount    = countFocusPool(items)
    const allPool       = selectPool(items)
    const focusDisabled = focusCount < 4
    const focusWarning  = focusOnly && focusCount < 4
    const activeCount   = focusOnly && !focusDisabled ? focusCount : allPool.length
    const noWords       = activeCount < 4

    return (
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Speed Practice</h1>
          </div>
        </div>

        {/* Word scope */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Word selection</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setFocusOnly(false)}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-colors ${
                !focusOnly
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
              }`}>
              <span className="block">All vocabulary</span>
              <span className={`text-xs font-normal mt-0.5 block ${!focusOnly ? 'text-brand-100' : 'text-slate-400'}`}>
                {allPool.length} eligible words
              </span>
            </button>
            <button onClick={() => !focusDisabled && setFocusOnly(true)} disabled={focusDisabled}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-colors disabled:cursor-not-allowed ${
                focusOnly && !focusDisabled
                  ? 'bg-brand-600 text-white border-brand-600'
                  : focusDisabled
                  ? 'bg-slate-50 text-slate-400 border-slate-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
              }`}>
              <span className="block">Focus words only</span>
              <span className={`text-xs font-normal mt-0.5 block ${focusOnly && !focusDisabled ? 'text-brand-100' : focusDisabled ? 'text-slate-300' : 'text-slate-400'}`}>
                {focusCount > 0 ? `${focusCount} word${focusCount !== 1 ? 's' : ''} in focus` : 'No focus words yet'}
              </span>
            </button>
          </div>
          {focusWarning && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
              <BookOpen size={12} className="shrink-0" />
              Fewer than 4 focus words — using full library instead.
            </p>
          )}
        </div>

        {noWords && (
          <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <BookOpen size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p>You need at least 4 words with definitions in your library. Add more vocabulary to play.</p>
          </div>
        )}

        {/* Duration — with personal best hint */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Duration</p>
          <div className="grid grid-cols-5 gap-2">
            {SPEED_GAME_DURATIONS.map((d) => {
              const best      = bestForDuration(pastResults, d)
              const isActive  = duration === d
              return (
                <button key={d} onClick={() => setDuration(d)}
                  className={`py-2.5 px-1 rounded-xl text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}>
                  <span>{SPEED_GAME_DURATION_LABELS[d]}</span>
                  {best !== null && (
                    <span className={`text-[10px] font-normal leading-none ${isActive ? 'text-brand-200' : 'text-slate-400'}`}>
                      best {best}✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Session history — always visible when there is any */}
        {pastResults.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Recent sessions
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {pastResults.slice(0, 8).map((r, i) => {
                const b = bestForDuration(pastResults, r.durationSecs)
                const isBest = b !== null && r.correct === b && pastResults.filter(x => x.durationSecs === r.durationSecs && x.correct === b).length === 1
                return (
                  <div key={r.id}
                    className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-700 font-medium">
                        {new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-slate-400 ml-1.5">
                        {new Date(r.playedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {r.focusOnly && (
                        <span className="ml-1.5 text-[10px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">Focus</span>
                      )}
                    </div>
                    <span className="text-slate-400 shrink-0 font-mono">
                      {SPEED_GAME_DURATION_LABELS[r.durationSecs as SpeedGameDuration] ?? `${r.durationSecs}s`}
                    </span>
                    <span className="font-semibold text-emerald-600 shrink-0 tabular-nums w-8 text-right">
                      {r.correct}✓
                    </span>
                    <span className="text-slate-400 shrink-0 tabular-nums w-8 text-right">
                      {r.accuracy}%
                    </span>
                    {isBest && (
                      <span className="text-[10px] font-bold text-amber-600 shrink-0">best</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Hints */}
        <div className="mb-6 space-y-1.5 text-xs text-slate-400">
          <p>· Fill blanks, match definitions, synonyms &amp; more</p>
          <p>· First correct answer per word adds one exposure</p>
          <p>
            · Press{' '}
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-600">1</kbd>–
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-600">4</kbd>
            {' '}to answer on keyboard
          </p>
        </div>

        <button onClick={startGame} disabled={noWords}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
          <Zap size={16} />
          Start {SPEED_GAME_DURATION_LABELS[duration]} game
          {focusOnly && !focusWarning && (
            <span className="text-brand-200 font-normal text-xs ml-1">· focus words</span>
          )}
        </button>
      </div>
    )
  }

  // ── Results phase ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    const total    = correct + wrong
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const gained   = wordsGainedExposure.current.size

    // Compare against previous best for this duration (excluding current game).
    // pastResults[0] is the current game (just saved). Slice past it.
    const prevResults = pastResults.slice(1)
    const prevBest    = bestForDuration(prevResults.filter(r => r.durationSecs === duration), duration)
    const isPersonalBest = prevBest === null
      ? (total > 0)               // first ever game for this duration — always a "best"
      : correct > prevBest

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {SPEED_GAME_DURATION_LABELS[duration]} · done
          </h1>
        </div>

        {/* Personal best note — quiet, per CLAUDE.md tone */}
        {isPersonalBest && total > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <TrendingUp size={14} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              {prevBest === null
                ? 'First session for this duration — good start.'
                : `Personal best for ${SPEED_GAME_DURATION_LABELS[duration]} — up from ${prevBest} correct.`}
            </p>
          </div>
        )}

        {/* Main stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700 tabular-nums">{correct}</p>
            <p className="text-xs text-emerald-600 mt-1">Correct</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-rose-600 tabular-nums">{wrong}</p>
            <p className="text-xs text-rose-500 mt-1">Wrong</p>
          </div>
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-brand-700 tabular-nums">{accuracy}%</p>
            <p className="text-xs text-brand-600 mt-1">Accuracy</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-slate-700 tabular-nums">{practiced.size}</p>
            <p className="text-xs text-slate-500 mt-1">Words seen</p>
          </div>
        </div>

        {/* Comparison row */}
        {prevBest !== null && (
          <div className="mb-4 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs">
            <span className="text-slate-500">Your best for {SPEED_GAME_DURATION_LABELS[duration]}</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              {Math.max(correct, prevBest)}✓
              {correct > prevBest && (
                <span className="ml-1.5 text-emerald-600">↑ {correct - prevBest} more</span>
              )}
              {correct < prevBest && (
                <span className="ml-1.5 text-slate-400">({prevBest} prev)</span>
              )}
            </span>
          </div>
        )}

        {/* Exposure gain note */}
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
          <p className="text-sm text-slate-400 text-center mb-4">No questions answered — try again!</p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={() => { resultSaved.current = false; setPhase('setup') }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-slate-50 transition-colors">
            <RotateCcw size={15} />
            Play again
          </button>
          <button onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-2xl transition-colors">
            Done
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── Playing / feedback ────────────────────────────────────────────────────
  if (!currentQuestion) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-slate-500 text-sm">Loading questions…</p>
      </div>
    )
  }

  const urgent = timeLeft <= 10 && phase === 'playing'

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-8 flex flex-col min-h-screen">

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={endGame}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="End game">
          <ArrowLeft size={20} />
        </button>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
          urgent ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
        }`}>
          <Timer size={14} className={urgent ? 'animate-pulse' : ''} />
          {formatTime(timeLeft)}
        </div>
        <div className="flex-1">
          <TimerBar remaining={timeLeft} total={duration} />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <span className="text-emerald-600 tabular-nums">{correct}✓</span>
          <span className="text-slate-300">·</span>
          <span className="text-rose-500 tabular-nums">{wrong}✗</span>
        </div>
      </div>

      {/* Question card */}
      <div className={`flex-1 rounded-2xl border p-5 mb-4 transition-colors ${
        phase === 'feedback'
          ? feedback?.correct
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-rose-50 border-rose-300'
          : 'bg-white border-slate-200'
      }`}>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {currentQuestion.type === 'fill-blank'          && 'Complete the sentence'}
          {currentQuestion.type === 'definition-to-term'  && 'Name the word'}
          {currentQuestion.type === 'term-to-definition'  && 'Pick the meaning'}
          {currentQuestion.type === 'synonym-to-term'     && 'Match the synonym'}
        </p>
        <p className="text-base font-semibold text-slate-900 leading-snug mb-4 whitespace-pre-line">
          {currentQuestion.prompt}
        </p>
        {phase === 'feedback' && feedback && (
          <div className={`flex items-center gap-2 mb-4 text-sm font-semibold rounded-xl px-3 py-2 ${
            feedback.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {feedback.correct
              ? <><CheckCircle2 size={16} /> Correct!</>
              : <><XCircle size={16} /> Answer: <span className="ml-1 font-bold">{feedback.correctAnswer}</span></>
            }
          </div>
        )}
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-2">
        {currentQuestion.choices.map((choice, idx) => {
          const showCorrect = phase === 'feedback' && idx === currentQuestion.correctIndex
          return (
            <button key={idx} onClick={() => handleAnswer(idx)}
              disabled={phase === 'feedback'}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors disabled:cursor-default ${
                phase === 'feedback' && showCorrect
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : phase === 'feedback'
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]'
              }`}>
              <span className="inline-flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  phase === 'playing'
                    ? 'border-slate-300 text-slate-400'
                    : showCorrect
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-200 text-slate-300'
                }`}>{idx + 1}</span>
                {choice}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
