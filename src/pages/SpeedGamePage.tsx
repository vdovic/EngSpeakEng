/**
 * SpeedGamePage — timed vocabulary speed practice
 *
 * Phases:  setup → playing → paused → feedback → results
 *
 * UX improvements landed here:
 *   #1  Play again (same settings, no setup re-entry)
 *   #2  Settings persistence — scope + duration seeded from last session
 *   #3  Pause — ⏸ freezes timer; blurred overlay prevents peeking
 *   #4  Drill missed words — 60-second focused session on wrong answers
 *   #5  Add to Focus — one-tap from missed words list on results
 *   #6  Per-type accuracy — breakdown by question type on results
 *   #7  Live pace indicator — projected final correct count during play
 *   #9  Question type in wrong-answer feedback banner
 *   #10 Persistent struggles — amber banner when a word missed 3+ sessions
 *
 * Progress rule (CLAUDE.md):
 *   recordExposure(id, true) is called at most once per word per session,
 *   enforced by wordsGainedExposure ref.  Words at MAX_EXPOSURE are still
 *   playable but skipped for exposure recording.
 *
 * Gamification guardrails (CLAUDE.md §Gamification Constraints):
 *   • No points, XP, or performance ratings stored.
 *   • "Personal best" is an objective comparison — no animations.
 *   • No streaks or badges.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Timer, CheckCircle2, XCircle, ChevronRight,
  Zap, RotateCcw, BookOpen, TrendingUp, ExternalLink, X,
  Volume2, VolumeX, Pause, Play, Plus, Check, SlidersHorizontal,
  AlertCircle,
} from 'lucide-react'
import {
  playCorrectSound, playWrongSound,
  getSoundsEnabled, saveSoundsEnabled,
} from '@/lib/sounds'
import { useVocabStore } from '@/store/vocabStore'
import type { VocabItem } from '@/types/vocabulary'
import { useSpeedGameStore } from '@/store/speedGameStore'
import { usePracticeTimer } from '@/hooks/usePracticeTimer'
import {
  SPEED_GAME_DURATIONS,
  SPEED_GAME_DURATION_LABELS,
  WORD_SCOPE_LABELS,
  type SpeedGameDuration,
  type SpeedGameResult,
  type SpeedQuestion,
  type SpeedQuestionType,
  type WordScope,
  type WordAttempt,
  type ReviewSnapshot,
  selectPool,
  countScope,
  generateBatch,
  canGainExposure,
  getPersistentStruggleIds,
} from '@/lib/speedGame'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'playing' | 'paused' | 'feedback' | 'results'

interface FeedbackState {
  correct:       boolean
  correctAnswer: string
  questionType:  SpeedQuestionType
  selectedIndex: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CORRECT_FEEDBACK_MS = 700
const WRONG_FEEDBACK_MS   = 1500
const BATCH_SIZE          = 40

// ── Pure helpers ───────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isBetterThan(a: SpeedGameResult, b: SpeedGameResult): boolean {
  if (a.correct !== b.correct) return a.correct > b.correct
  return a.accuracy > b.accuracy
}

function bestForDuration(results: SpeedGameResult[], durationSecs: number): number | null {
  const matching = results.filter((r) => r.durationSecs === durationSecs)
  if (matching.length === 0) return null
  return Math.max(...matching.map((r) => r.correct))
}

function bestResultForDuration(
  results: SpeedGameResult[],
  durationSecs: number,
): SpeedGameResult | null {
  const matching = results.filter((r) => r.durationSecs === durationSecs)
  if (matching.length === 0) return null
  return matching.reduce((best, r) => (isBetterThan(r, best) ? r : best))
}

function overallAccuracy(results: SpeedGameResult[]): number | null {
  if (results.length === 0) return null
  const { c, w } = results.reduce(
    (acc, r) => ({ c: acc.c + r.correct, w: acc.w + r.wrong }),
    { c: 0, w: 0 },
  )
  const total = c + w
  return total > 0 ? Math.round((c / total) * 100) : null
}

// ── Question type labels ──────────────────────────────────────────────────────

const QUESTION_TYPE_SHORT: Record<SpeedQuestionType, string> = {
  'fill-blank':          'fill blank',
  'definition-to-term':  'definition',
  'term-to-definition':  'meaning',
  'synonym-to-term':     'synonym',
  'collocation-pick':    'phrase',
}

const QUESTION_TYPE_LABEL: Record<SpeedQuestionType, string> = {
  'fill-blank':          'Fill blank',
  'definition-to-term':  'Definition',
  'term-to-definition':  'Meaning',
  'synonym-to-term':     'Synonym',
  'collocation-pick':    'Collocation',
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

// ── PortfolioImpact ───────────────────────────────────────────────────────────

function PortfolioImpact({ gainedIds, items }: { gainedIds: Set<string>; items: VocabItem[] }) {
  const entries = (() => {
    const map = new Map<string, { from: number; to: number; count: number; reachedActivate: boolean }>()
    for (const id of gainedIds) {
      const item = items.find((i) => i.id === id)
      if (!item) continue
      const to   = Math.min(item.exposureCount ?? 0, 8)
      const from = Math.max(0, to - 1)
      const key  = `${from}→${to}`
      const ex   = map.get(key)
      const reachedActivate = to === 8
      if (ex) { ex.count++; if (reachedActivate) ex.reachedActivate = true }
      else     map.set(key, { from, to, count: 1, reachedActivate })
    }
    return [...map.values()].sort((a, b) => a.from - b.from)
  })()
  if (entries.length === 0) return null
  return (
    <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Portfolio impact</p>
        <p className="text-xs font-semibold text-emerald-600">+{gainedIds.size} point{gainedIds.size !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {entries.map(({ from, to, count, reachedActivate }) => (
          <div key={`${from}→${to}`} className="flex items-center gap-3 px-4 py-2 text-xs">
            <span className="font-mono text-slate-400 shrink-0 w-10">{from} → {to}</span>
            <span className="flex-1 text-slate-600">
              {count} word{count !== 1 ? 's' : ''}{reachedActivate ? ' — now ready to activate' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── WordQuickPanel ────────────────────────────────────────────────────────────

function WordQuickPanel({
  item, onClose, onOpenFull,
}: {
  item: VocabItem | null; onClose: () => void; onOpenFull: () => void
}) {
  if (!item) return null
  const exposure = Math.min(item.exposureCount ?? 0, 8)
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={`Word detail: ${item.term}`}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl safe-bottom">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{item.term}</h2>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{item.type.replace('-', ' ')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {(item.definitionEn || item.shortDefinition) && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Definition</p>
              <p className="text-sm text-slate-800 leading-relaxed">{item.definitionEn ?? item.shortDefinition}</p>
            </div>
          )}
          {item.exampleSentence && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Example</p>
              <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{item.exampleSentence}&rdquo;</p>
            </div>
          )}
          {item.nuance && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Usage tip</p>
              <p className="text-sm text-slate-600 leading-relaxed">{item.nuance}</p>
            </div>
          )}
          {item.synonyms.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Synonyms</p>
              <div className="flex flex-wrap gap-1.5">
                {item.synonyms.slice(0, 6).map((s) => (
                  <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Exposure</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i < exposure ? 'bg-brand-500' : 'bg-slate-200'}`} />
              ))}
              <span className="ml-2 text-xs text-slate-500 tabular-nums shrink-0">{exposure}/8</span>
            </div>
          </div>
        </div>
        <div className="px-5 pt-2 pb-8 border-t border-slate-100">
          <button onClick={onOpenFull}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-2xl transition-colors">
            Open full word detail <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── SessionHistoryTable ───────────────────────────────────────────────────────

const HISTORY_COLLAPSED = 8

function SessionHistoryTable({
  results, currentSessionId, durationLabel,
}: {
  results: SpeedGameResult[]; currentSessionId: string | undefined; durationLabel: string
}) {
  const [showAll, setShowAll] = useState(false)
  if (results.length === 0) return null
  const record   = results.reduce((best, r) => (isBetterThan(r, best) ? r : best))
  const isRecord = (r: SpeedGameResult) => r.correct === record.correct && r.accuracy === record.accuracy
  const shown  = showAll ? results : results.slice(0, HISTORY_COLLAPSED)
  const hidden = results.length - HISTORY_COLLAPSED
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{durationLabel} — all sessions</p>
      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
        {shown.map((r) => {
          const isCurrent = r.id === currentSessionId
          const rec       = isRecord(r)
          const effScope  = r.scope ?? (r.focusOnly ? 'focus' : 'active')
          return (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${rec ? 'bg-amber-50' : isCurrent ? 'bg-slate-50' : ''}`}>
              <div className="flex-1 min-w-0">
                {isCurrent ? (
                  <span className="font-semibold text-brand-600">This session</span>
                ) : (
                  <>
                    <span className="text-slate-700 font-medium">
                      {new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-slate-400 ml-1.5">
                      {new Date(r.playedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
                {effScope !== 'active' && effScope !== 'full' && (
                  <span className="ml-1.5 text-[10px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">
                    {WORD_SCOPE_LABELS[effScope]}
                  </span>
                )}
              </div>
              <span className="text-slate-400 shrink-0 font-mono">
                {SPEED_GAME_DURATION_LABELS[r.durationSecs as SpeedGameDuration] ?? `${r.durationSecs}s`}
              </span>
              <span className={`font-semibold tabular-nums w-8 text-right ${rec ? 'text-amber-700' : 'text-emerald-600'}`}>{r.correct}✓</span>
              <span className="text-slate-500 tabular-nums w-8 text-right">{r.accuracy}%</span>
              {rec
                ? <span className="text-[10px] font-bold text-amber-600 shrink-0 w-8 text-right">best</span>
                : <span className="w-8 shrink-0" />}
            </div>
          )
        })}
        {!showAll && hidden > 0 && (
          <button onClick={() => setShowAll(true)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors bg-white">
            Show {hidden} more
          </button>
        )}
      </div>
    </div>
  )
}

// ── QuestionTypeBreakdown (#6) ────────────────────────────────────────────────

function QuestionTypeBreakdown({ attempts }: { attempts: WordAttempt[] }) {
  if (attempts.length === 0) return null
  const stats = attempts.reduce((acc, a) => {
    const s = acc.get(a.type) ?? { correct: 0, total: 0 }
    acc.set(a.type, { correct: s.correct + (a.wasCorrect ? 1 : 0), total: s.total + 1 })
    return acc
  }, new Map<SpeedQuestionType, { correct: number; total: number }>())
  const rows = [...stats.entries()].filter(([, s]) => s.total > 0).sort(([, a], [, b]) => b.total - a.total)
  if (rows.length <= 1) return null
  return (
    <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">By question type</p>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map(([type, { correct: c, total: t }]) => {
          const pct = Math.round((c / t) * 100)
          return (
            <div key={type} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="flex-1 text-slate-700 font-medium">{QUESTION_TYPE_LABEL[type]}</span>
              <span className="text-slate-500 tabular-nums">{c}/{t}</span>
              <span className={`tabular-nums font-semibold w-8 text-right ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── WordReviewCorrect ─────────────────────────────────────────────────────────

function WordReviewCorrect({ attempts, onNavigate }: { attempts: WordAttempt[]; onNavigate: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        aria-expanded={expanded}>
        <span className="text-xs font-semibold text-slate-500">Got right — {attempts.length} word{attempts.length !== 1 ? 's' : ''}</span>
        <ChevronRight size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="divide-y divide-slate-100">
          {attempts.map((attempt) => (
            <button key={attempt.itemId} onClick={() => onNavigate(attempt.itemId)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-700">{attempt.term}</span>
                <span className="ml-2 text-[10px] text-slate-400">{QUESTION_TYPE_SHORT[attempt.type]}</span>
              </div>
              <ExternalLink size={12} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ResultsView ───────────────────────────────────────────────────────────────

function ResultsView({
  correct, wrong, practiced, isDrillMode,
  effectiveDuration, scope,
  wordsGainedExposureRef, wordAttemptsRef, resultSavedRef,
  items, addToFocus, addedToFocusIds, setAddedToFocusIds,
  startGame, clearReview, navigate, setPhase,
}: {
  correct:                number
  wrong:                  number
  practiced:              Set<string>
  isDrillMode:            boolean
  effectiveDuration:      SpeedGameDuration
  scope:                  WordScope
  wordsGainedExposureRef: React.MutableRefObject<Set<string>>
  wordAttemptsRef:        React.MutableRefObject<WordAttempt[]>
  resultSavedRef:         React.MutableRefObject<boolean>
  items:                  VocabItem[]
  addToFocus:             (ids: string[]) => Promise<{ added: number; evicted: number }>
  addedToFocusIds:        Set<string>
  setAddedToFocusIds:     React.Dispatch<React.SetStateAction<Set<string>>>
  startGame:              (opts?: { drill?: VocabItem[] }) => void
  clearReview:            () => void
  navigate:               ReturnType<typeof useNavigate>
  setPhase:               React.Dispatch<React.SetStateAction<Phase>>
}) {
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null)

  const total      = correct + wrong
  const accuracy   = total > 0 ? Math.round((correct / total) * 100) : 0
  const gained     = wordsGainedExposureRef.current.size
  const allResults = useSpeedGameStore.getState().results

  const durationHistory  = allResults.filter((r) => r.durationSecs === effectiveDuration)
  const currentSessionId = durationHistory[0]?.id
  const prevResults      = currentSessionId ? allResults.filter((r) => r.id !== currentSessionId) : allResults
  const prevBest         = bestResultForDuration(prevResults, effectiveDuration)
  const isPersonalBest   = total > 0 && (
    prevBest === null ||
    correct > prevBest.correct ||
    (correct === prevBest.correct && accuracy > prevBest.accuracy)
  )
  const durationLabel = SPEED_GAME_DURATION_LABELS[effectiveDuration] ?? `${effectiveDuration}s`

  // Missed / correct word lists
  const missedIds = new Set(wordAttemptsRef.current.filter((a) => !a.wasCorrect).map((a) => a.itemId))
  const uniqueMissed: WordAttempt[] = [...missedIds].map(
    (id) => wordAttemptsRef.current.find((a) => a.itemId === id && !a.wasCorrect)!,
  )
  const uniqueCorrectOnly = wordAttemptsRef.current
    .filter((a) => a.wasCorrect && !missedIds.has(a.itemId))
    .filter((a, i, arr) => arr.findIndex((b) => b.itemId === a.itemId) === i)

  // Persistent struggles (#10)
  const persistentStruggleIds = getPersistentStruggleIds(allResults, 3)
  const persistentStruggles   = persistentStruggleIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is VocabItem => !!i && !addedToFocusIds.has(i.id) && !(i.inFocus || i.weeklyFocus))

  async function handleAddToFocus(itemId: string) {
    await addToFocus([itemId])
    setAddedToFocusIds((prev) => new Set([...prev, itemId]))
  }

  async function handleAddAllStruggles() {
    const ids = persistentStruggles.map((i) => i.id)
    await addToFocus(ids)
    setAddedToFocusIds((prev) => new Set([...prev, ...ids]))
  }

  // Drill missed words (#4)
  function handleDrillMissed() {
    const missedItems = [...missedIds]
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is VocabItem => !!i && !!i.definitionEn && !i.archived)
    let drillPool = missedItems
    if (drillPool.length < 4) {
      const others = uniqueCorrectOnly
        .map((a) => items.find((i) => i.id === a.itemId))
        .filter((i): i is VocabItem => !!i)
      drillPool = [...missedItems, ...others].slice(0, Math.max(4, missedItems.length))
    }
    if (drillPool.length < 4) return
    startGame({ drill: drillPool })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 md:pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{durationLabel} · done</h1>
        {isDrillMode && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Missed words drill
          </span>
        )}
      </div>

      {/* Personal best */}
      {isPersonalBest && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <TrendingUp size={14} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800">
            {prevBest === null
              ? 'First session for this duration — good start.'
              : correct > prevBest.correct
              ? `Personal best for ${durationLabel} — up from ${prevBest.correct} correct.`
              : `Personal best for ${durationLabel} — same correct, better accuracy.`}
          </p>
        </div>
      )}

      {/* Main stats */}
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

      {/* Per-type accuracy (#6) */}
      <QuestionTypeBreakdown attempts={wordAttemptsRef.current} />

      {/* Session history table */}
      <SessionHistoryTable
        results={durationHistory}
        currentSessionId={currentSessionId}
        durationLabel={durationLabel}
      />

      {/* Exposure gain note */}
      {gained > 0 && (
        <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <Zap size={15} className="shrink-0 mt-0.5 text-amber-500" />
          <p><span className="font-semibold">{gained} word{gained !== 1 ? 's' : ''}</span> gained an exposure point.</p>
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-slate-400 text-center mb-4">No questions answered — try again!</p>
      )}

      {/* Persistent struggles (#10) */}
      {persistentStruggles.length > 0 && (
        <div className="mb-4 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                {persistentStruggles.length} word{persistentStruggles.length !== 1 ? 's' : ''} missed in 3+ sessions
              </p>
              <p className="text-xs text-amber-700 mb-2">
                {persistentStruggles.slice(0, 3).map((i) => i.term).join(', ')}
                {persistentStruggles.length > 3 ? ` + ${persistentStruggles.length - 3} more` : ''}
              </p>
              <button onClick={handleAddAllStruggles}
                className="text-xs font-semibold text-amber-800 bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                Add all to Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio impact */}
      {wordsGainedExposureRef.current.size > 0 && (
        <PortfolioImpact gainedIds={wordsGainedExposureRef.current} items={items} />
      )}

      {/* Word review */}
      {total > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Words this session</p>
            {/* Drill missed words button (#4) */}
            {uniqueMissed.length >= 1 && !isDrillMode && (
              <button onClick={handleDrillMissed}
                disabled={uniqueMissed.length + uniqueCorrectOnly.length < 4}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 hover:bg-rose-100 transition-colors disabled:opacity-40">
                <RotateCcw size={11} />
                Drill missed · 1 min
              </button>
            )}
          </div>

          {uniqueMissed.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-sm text-emerald-700">No wrong answers this time.</p>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-xl overflow-hidden mb-2">
              <div className="px-4 py-2 border-b border-rose-100">
                <p className="text-xs font-semibold text-rose-700">Missed — {uniqueMissed.length} word{uniqueMissed.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="divide-y divide-rose-100">
                {uniqueMissed.map((attempt) => {
                  const vocabItem    = items.find((i) => i.id === attempt.itemId)
                  const alreadyFocus = vocabItem?.inFocus || vocabItem?.weeklyFocus
                  const justAdded    = addedToFocusIds.has(attempt.itemId)
                  return (
                    <div key={attempt.itemId} className="flex items-center gap-2">
                      <button onClick={() => setSelectedWordId(attempt.itemId)}
                        className="flex-1 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-rose-100 transition-colors">
                        <XCircle size={14} className="text-rose-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-slate-800">{attempt.term}</span>
                          <span className="ml-2 text-[10px] text-slate-400">{QUESTION_TYPE_SHORT[attempt.type]}</span>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Correct: <span className="text-slate-700 font-medium">{attempt.correctAnswer}</span>
                          </p>
                        </div>
                        <ChevronRight size={12} className="text-rose-300 shrink-0" />
                      </button>
                      {/* Add to Focus (#5) */}
                      {!alreadyFocus && (
                        <button onClick={() => handleAddToFocus(attempt.itemId)}
                          className={`mr-3 p-1.5 rounded-lg border transition-colors shrink-0 ${
                            justAdded
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                              : 'bg-white border-rose-200 text-rose-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50'
                          }`}
                          aria-label={justAdded ? 'Added to Focus' : `Add ${attempt.term} to Focus`}>
                          {justAdded ? <Check size={12} /> : <Plus size={12} />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {uniqueCorrectOnly.length > 0 && (
            <WordReviewCorrect attempts={uniqueCorrectOnly} onNavigate={setSelectedWordId} />
          )}
        </div>
      )}

      {/* Action buttons (#1 Play again one-tap) */}
      <div className="space-y-2.5">
        <button onClick={() => startGame()}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-2xl transition-colors">
          <Zap size={15} />
          Play again · {durationLabel} · {WORD_SCOPE_LABELS[scope]}
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={() => { clearReview(); resultSavedRef.current = false; setPhase('setup') }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-slate-50 transition-colors">
            <SlidersHorizontal size={14} />
            Change settings
          </button>
          <button onClick={() => { clearReview(); navigate(-1) }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-2xl transition-colors">
            Done <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Word quick-look panel */}
      <WordQuickPanel
        item={items.find((i) => i.id === selectedWordId) ?? null}
        onClose={() => setSelectedWordId(null)}
        onOpenFull={() => navigate(`/item/${selectedWordId}`)}
      />
    </div>
  )
}

// ── SpeedGamePage (main component) ───────────────────────────────────────────

export function SpeedGamePage() {
  const navigate                              = useNavigate()
  const { items, recordExposure, addToFocus } = useVocabStore()
  const { addResult, setReview, clearReview, saveLastSettings } = useSpeedGameStore()
  const pastResults   = useSpeedGameStore((s) => s.results)
  const practiceTimer = usePracticeTimer('speed-game')

  // Read once at mount — not reactive subscriptions
  const initialReview  = useRef(useSpeedGameStore.getState().pendingReview).current
  const storedSettings = useRef({
    scope:    useSpeedGameStore.getState().lastScope,
    duration: useSpeedGameStore.getState().lastDuration,
  }).current

  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialReview ? 'results' : 'setup')

  // ── Settings — seeded from last session (#2) ─────────────────────────────
  const [duration, setDuration] = useState<SpeedGameDuration>(
    initialReview?.duration ??
    (SPEED_GAME_DURATIONS.includes(storedSettings.duration as SpeedGameDuration)
      ? storedSettings.duration as SpeedGameDuration
      : 180),
  )
  const [scope, setScope] = useState<WordScope>(() => {
    const fromReview = initialReview?.scope
    if (fromReview && fromReview !== 'active') return fromReview as WordScope
    if (storedSettings.scope) return storedSettings.scope
    return 'full'
  })

  const [soundEnabled,    setSoundEnabled]   = useState(getSoundsEnabled)
  const [addedToFocusIds, setAddedToFocusIds] = useState<Set<string>>(new Set())
  const [isDrillMode,     setIsDrillMode]    = useState(false)

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => { saveSoundsEnabled(!prev); return !prev })
  }, [])

  // ── Game state ───────────────────────────────────────────────────────────
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [questions, setQuestions] = useState<SpeedQuestion[]>([])
  const [qIndex,    setQIndex]    = useState(0)
  const [correct,   setCorrect]   = useState(initialReview?.correct ?? 0)
  const [wrong,     setWrong]     = useState(initialReview?.wrong   ?? 0)
  const [run,       setRun]       = useState(0)
  const [practiced, setPracticed] = useState<Set<string>>(
    () => new Set(initialReview?.practicedIds ?? []),
  )
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  // Refs — stable across timer closures
  const wordsGainedExposure  = useRef<Set<string>>(new Set(initialReview?.gainedIds ?? []))
  const latestStats          = useRef({ correct: 0, wrong: 0, practiced: new Set<string>() })
  const resultSaved          = useRef(initialReview != null)
  const feedbackDuration     = useRef(CORRECT_FEEDBACK_MS)
  const wordAttempts         = useRef<WordAttempt[]>(initialReview?.attempts ?? [])
  const drillPoolRef         = useRef<VocabItem[] | null>(null)
  const effectiveDurationRef = useRef<SpeedGameDuration>(
    initialReview?.duration ?? duration,
  )

  // ── Save result ───────────────────────────────────────────────────────────
  const saveResult = useCallback((
    finalCorrect:   number,
    finalWrong:     number,
    finalPracticed: Set<string>,
  ) => {
    if (resultSaved.current) return
    resultSaved.current = true
    const total      = finalCorrect + finalWrong
    const missedIds  = [...new Set(wordAttempts.current.filter((a) => !a.wasCorrect).map((a) => a.itemId))]
    const effectiveDur = effectiveDurationRef.current
    addResult({
      id:             crypto.randomUUID(),
      playedAt:       new Date().toISOString(),
      durationSecs:   effectiveDur,
      correct:        finalCorrect,
      wrong:          finalWrong,
      accuracy:       total > 0 ? Math.round((finalCorrect / total) * 100) : 0,
      wordsPracticed: finalPracticed.size,
      wordsGained:    wordsGainedExposure.current.size,
      scope,
      missedItemIds:  missedIds.length > 0 ? missedIds : undefined,
    })
    const snapshot: ReviewSnapshot = {
      correct:      finalCorrect,
      wrong:        finalWrong,
      duration:     effectiveDur,
      scope,
      practicedIds: [...finalPracticed],
      gainedIds:    [...wordsGainedExposure.current],
      attempts:     [...wordAttempts.current],
    }
    setReview(snapshot)
    practiceTimer.finalize()
  }, [scope, addResult, setReview, practiceTimer])

  // ── Timer (only fires while phase === 'playing') ──────────────────────────
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
    const ms = feedbackDuration.current
    const id = setTimeout(() => {
      setFeedback(null)
      setQIndex((i) => i + 1)
      setPhase('playing')
    }, ms)
    return () => clearTimeout(id)
  }, [phase])

  // ── Refill question queue ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (questions.length - qIndex >= 5) return
    const pool     = drillPoolRef.current ?? selectPool(items, scope)
    const newBatch = generateBatch(pool, BATCH_SIZE)
    setQuestions((prev) => [...prev.slice(qIndex), ...newBatch])
    setQIndex(0)
  }, [qIndex, questions.length, phase, items, scope])

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback((opts?: { drill?: VocabItem[] }) => {
    const drillPool    = opts?.drill ?? null
    const effectiveDur: SpeedGameDuration = drillPool ? 60 : duration
    drillPoolRef.current         = drillPool
    effectiveDurationRef.current = effectiveDur
    setIsDrillMode(!!drillPool)
    clearReview()
    practiceTimer.reset()
    wordsGainedExposure.current  = new Set()
    latestStats.current          = { correct: 0, wrong: 0, practiced: new Set() }
    resultSaved.current          = false
    wordAttempts.current         = []
    feedbackDuration.current     = CORRECT_FEEDBACK_MS
    setCorrect(0)
    setWrong(0)
    setRun(0)
    setPracticed(new Set())
    setFeedback(null)
    setQIndex(0)
    setAddedToFocusIds(new Set())
    if (!drillPool) saveLastSettings(scope, duration)
    const pool  = drillPool ?? selectPool(items, scope)
    const batch = generateBatch(pool, BATCH_SIZE)
    setQuestions(batch)
    setTimeLeft(effectiveDur)
    setPhase(batch.length === 0 ? 'results' : 'playing')
  }, [duration, scope, items, clearReview, practiceTimer, saveLastSettings])

  const endGame   = useCallback(() => {
    const { correct: c, wrong: w, practiced: p } = latestStats.current
    saveResult(c, w, p)
    setPhase('results')
  }, [saveResult])

  const pauseGame  = useCallback(() => setPhase('paused'),  [])
  const resumeGame = useCallback(() => setPhase('playing'), [])

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
    wordAttempts.current.push({
      itemId:        q.itemId,
      term:          q.term,
      type:          q.type,
      correctAnswer: q.choices[q.correctIndex],
      givenAnswer:   q.choices[choiceIndex],
      wasCorrect:    isCorrect,
    })
    if (soundEnabled) {
      if (isCorrect) playCorrectSound(); else playWrongSound()
    }
    let gainedExposure = false
    if (isCorrect) {
      setCorrect((c) => { latestStats.current.correct = c + 1; return c + 1 })
      setRun((r) => r + 1)
      if (
        canGainExposure(items.find((i) => i.id === q.itemId) ?? { exposureCount: 0 } as any) &&
        !wordsGainedExposure.current.has(q.itemId)
      ) {
        wordsGainedExposure.current.add(q.itemId)
        gainedExposure = true
        void recordExposure(q.itemId, true)
      }
    } else {
      setWrong((w) => { latestStats.current.wrong = w + 1; return w + 1 })
      setRun(0)
    }
    practiceTimer.bump({ advancement: gainedExposure ? 1 : 0, itemId: q.itemId })
    feedbackDuration.current = isCorrect ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS
    setFeedback({
      correct:       isCorrect,
      correctAnswer: q.choices[q.correctIndex],
      questionType:  q.type,
      selectedIndex: choiceIndex,
    })
    setPhase('feedback')
  }, [phase, questions, qIndex, items, recordExposure, practiceTimer, soundEnabled])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { pauseGame(); return }
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= 4) handleAnswer(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, handleAnswer, pauseGame])

  useEffect(() => {
    if (phase !== 'paused') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ') resumeGame()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, resumeGame])

  // ── Results phase ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <ResultsView
        correct={correct}
        wrong={wrong}
        practiced={practiced}
        isDrillMode={isDrillMode}
        effectiveDuration={effectiveDurationRef.current}
        scope={scope}
        wordsGainedExposureRef={wordsGainedExposure}
        wordAttemptsRef={wordAttempts}
        resultSavedRef={resultSaved}
        items={items}
        addToFocus={addToFocus}
        addedToFocusIds={addedToFocusIds}
        setAddedToFocusIds={setAddedToFocusIds}
        startGame={startGame}
        clearReview={clearReview}
        navigate={navigate}
        setPhase={setPhase}
      />
    )
  }

  // ── Setup phase ───────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const scopeCounts: Record<WordScope, number> = {
      focus:       countScope(items, 'focus'),
      'non-focus': countScope(items, 'non-focus'),
      full:        countScope(items, 'full'),
    }
    const currentCount = scopeCounts[scope]
    const poolTooSmall = currentCount < 4 && !(scope === 'focus' && scopeCounts.full >= 4)
    const noWords      = scopeCounts.full < 4
    const totalSessions = pastResults.length
    const avgAccuracy   = overallAccuracy(pastResults)

    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 md:pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Speed Practice</h1>
          </div>
          {totalSessions > 0 && (
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span className="tabular-nums">{totalSessions} session{totalSessions !== 1 ? 's' : ''}</span>
              {avgAccuracy !== null && <span className="tabular-nums">{avgAccuracy}% avg accuracy</span>}
            </div>
          )}
        </div>

        {/* Scope picker */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Word selection</p>
          <div className="grid grid-cols-3 gap-2">
            {(['focus', 'non-focus', 'full'] as WordScope[]).map((s) => {
              const cnt      = scopeCounts[s]
              const isActive = scope === s
              const disabled = s === 'focus' ? scopeCounts.full < 4 : cnt < 4
              const subtitle = {
                focus:       cnt > 0 ? `${cnt} word${cnt !== 1 ? 's' : ''} in focus` : 'None in focus',
                'non-focus': cnt > 0 ? `${cnt.toLocaleString()} words` : 'None outside focus',
                full:        `${cnt.toLocaleString()} words`,
              }[s]
              return (
                <button key={s} onClick={() => !disabled && setScope(s)} disabled={disabled} aria-pressed={isActive}
                  className={`px-3 py-3 rounded-xl border text-sm font-semibold text-left transition-colors disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : disabled
                      ? 'bg-slate-50 text-slate-400 border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}>
                  <span className="block">{WORD_SCOPE_LABELS[s]}</span>
                  <span className={`text-xs font-normal mt-0.5 block ${isActive ? 'text-brand-100' : disabled ? 'text-slate-300' : 'text-slate-400'}`}>
                    {subtitle}
                  </span>
                </button>
              )
            })}
          </div>
          {scope === 'focus' && scopeCounts.focus < 4 && scopeCounts.full >= 4 && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
              <BookOpen size={12} className="shrink-0" />
              Fewer than 4 focus words — will use your full active vocabulary instead.
            </p>
          )}
          {scope === 'non-focus' && scopeCounts['non-focus'] < 4 && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
              <BookOpen size={12} className="shrink-0" />
              {scopeCounts['non-focus'] === 0
                ? 'All your active words are in Focus right now.'
                : `Only ${scopeCounts['non-focus']} word${scopeCounts['non-focus'] !== 1 ? 's' : ''} outside Focus — need at least 4 to play.`}
            </p>
          )}
        </div>

        {noWords && (
          <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <BookOpen size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p>You need at least 4 words with definitions in your library. Add more vocabulary to play.</p>
          </div>
        )}

        {/* Duration picker */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Duration</p>
          <div className="grid grid-cols-5 gap-2">
            {SPEED_GAME_DURATIONS.map((d) => {
              const best     = bestForDuration(pastResults, d)
              const isActive = duration === d
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

        {/* Session history */}
        {pastResults.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recent sessions</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {pastResults.slice(0, 8).map((r, i) => {
                const b      = bestForDuration(pastResults, r.durationSecs)
                const isBest = b !== null && r.correct === b &&
                  pastResults.filter((x) => x.durationSecs === r.durationSecs && x.correct === b).length === 1
                const effScope = r.scope ?? (r.focusOnly ? 'focus' : 'active')
                return (
                  <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-700 font-medium">
                        {new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-slate-400 ml-1.5">
                        {new Date(r.playedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {effScope !== 'active' && effScope !== 'full' && (
                        <span className="ml-1.5 text-[10px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">
                          {WORD_SCOPE_LABELS[effScope]}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 shrink-0 font-mono">
                      {SPEED_GAME_DURATION_LABELS[r.durationSecs as SpeedGameDuration] ?? `${r.durationSecs}s`}
                    </span>
                    <span className="font-semibold text-emerald-600 shrink-0 tabular-nums w-8 text-right">{r.correct}✓</span>
                    <span className="text-slate-400 shrink-0 tabular-nums w-8 text-right">{r.accuracy}%</span>
                    {isBest && <span className="text-[10px] font-bold text-amber-600 shrink-0">best</span>}
                  </div>
                )
              })}
            </div>
            {SPEED_GAME_DURATIONS.some((d) => bestForDuration(pastResults, d) !== null) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {SPEED_GAME_DURATIONS.map((d) => {
                  const best = bestForDuration(pastResults, d)
                  if (best === null) return null
                  return (
                    <span key={d} className="text-[11px] text-slate-400">
                      <span className="font-medium text-slate-600">{SPEED_GAME_DURATION_LABELS[d]}</span>{' '}best{' '}
                      <span className="font-semibold text-emerald-600 tabular-nums">{best}✓</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Hints */}
        <div className="mb-6 space-y-1.5 text-xs text-slate-400">
          <p>· Fill blanks, match definitions, synonyms, phrases &amp; more</p>
          <p>· First correct answer per word adds one exposure</p>
          <p>· Wrong answers pause briefly — read the correct answer</p>
          <p>
            · Press{' '}
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-600">1</kbd>–
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-600">4</kbd>
            {' '}to answer · {' '}
            <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-slate-600">Esc</kbd>
            {' '}to pause
          </p>
        </div>

        <button onClick={() => startGame()} disabled={poolTooSmall || noWords}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
          <Zap size={16} />
          Start {SPEED_GAME_DURATION_LABELS[duration]} · {WORD_SCOPE_LABELS[scope]}
        </button>
      </div>
    )
  }

  // ── Playing / paused / feedback ───────────────────────────────────────────
  const currentQuestion = questions[qIndex]
  if (!currentQuestion) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-slate-500 text-sm">Loading questions…</p>
      </div>
    )
  }

  const urgent         = timeLeft <= 10
  const elapsed        = effectiveDurationRef.current - timeLeft
  // Live pace projection — only show after ≥5 s of play (#7)
  const paceProjection = elapsed >= 5 && correct > 0
    ? Math.round((correct / elapsed) * effectiveDurationRef.current)
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-8 flex flex-col min-h-screen">

      {/* Top bar */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center gap-3">
          <button onClick={endGame}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="End game">
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
            <TimerBar remaining={timeLeft} total={effectiveDurationRef.current} />
          </div>

          {isDrillMode && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Drill</span>
          )}

          {/* Pause / Resume (#3) */}
          {phase === 'playing' && (
            <button onClick={pauseGame}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
              aria-label="Pause" title="Pause (Esc)">
              <Pause size={16} />
            </button>
          )}
          {phase === 'paused' && (
            <button onClick={resumeGame}
              className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 transition-colors shrink-0"
              aria-label="Resume" title="Resume (Esc or Space)">
              <Play size={16} />
            </button>
          )}

          <button onClick={toggleSound}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-emerald-600 tabular-nums">{correct}✓</span>
            <span className="text-slate-300">·</span>
            <span className="text-rose-500 tabular-nums">{wrong}✗</span>
            {(correct + wrong) > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500 tabular-nums">{Math.round((correct / (correct + wrong)) * 100)}%</span>
              </>
            )}
            {/* Live pace projection (#7) */}
            {paceProjection !== null && paceProjection !== correct && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400 tabular-nums font-normal">≈{paceProjection} projected</span>
              </>
            )}
          </div>
          {run >= 3 && <span className="text-[11px] font-semibold text-amber-500">↑{run} in a row</span>}
        </div>
      </div>

      {/* Question card */}
      <div className={`flex-1 rounded-2xl border p-5 mb-4 transition-colors ${
        phase === 'feedback'
          ? feedback?.correct ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
          : phase === 'paused' ? 'bg-slate-50 border-slate-200 select-none'
          : 'bg-white border-slate-200'
      }`}>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
          {currentQuestion.type === 'fill-blank'         && 'Complete the sentence'}
          {currentQuestion.type === 'definition-to-term' && 'Name the word'}
          {currentQuestion.type === 'term-to-definition' && 'Pick the meaning'}
          {currentQuestion.type === 'synonym-to-term'    && 'Match the synonym'}
          {currentQuestion.type === 'collocation-pick'   && 'Pick the natural phrase'}
        </p>

        {/* Blur content when paused (#3) */}
        <div className={phase === 'paused' ? 'blur-sm pointer-events-none' : ''}>
          <p className="text-base font-semibold text-slate-900 leading-snug mb-4 whitespace-pre-line">
            {currentQuestion.prompt}
          </p>
        </div>

        {phase === 'feedback' && feedback && (
          <div className={`flex items-center gap-2 mb-4 text-sm font-semibold rounded-xl px-3 py-2 ${
            feedback.correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {feedback.correct
              ? <><CheckCircle2 size={16} /> Correct!</>
              : <>
                  <XCircle size={16} />
                  {/* Question type label in feedback (#9) */}
                  <span className="font-normal opacity-70">{QUESTION_TYPE_LABEL[feedback.questionType]} —</span>
                  {' '}The answer was: <strong className="ml-0.5">{feedback.correctAnswer}</strong>
                </>
            }
          </div>
        )}
      </div>

      {/* Choices */}
      <div className={`grid grid-cols-1 gap-2 ${phase === 'paused' ? 'blur-sm pointer-events-none select-none' : ''}`}>
        {currentQuestion.choices.map((choice, idx) => {
          const isCorrectChoice = phase === 'feedback' && idx === currentQuestion.correctIndex
          const isWrongChoice   = phase === 'feedback' && !feedback?.correct && idx === feedback?.selectedIndex
          return (
            <button key={idx} onClick={() => handleAnswer(idx)}
              disabled={phase === 'feedback' || phase === 'paused'}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors disabled:cursor-default ${
                isCorrectChoice
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : isWrongChoice
                  ? 'bg-rose-100 border-rose-400 text-rose-700'
                  : phase === 'feedback'
                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]'
              }`}>
              <span className="inline-flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  phase === 'playing'
                    ? 'border-slate-300 text-slate-400'
                    : isCorrectChoice ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isWrongChoice   ? 'bg-rose-400 border-rose-400 text-white'
                    : 'border-slate-200 text-slate-300'
                }`}>{idx + 1}</span>
                {choice}
              </span>
            </button>
          )
        })}
      </div>

      {/* Pause overlay (#3) */}
      {phase === 'paused' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-900/70 backdrop-blur-sm">
          <p className="text-white text-xl font-bold">Paused</p>
          <button onClick={resumeGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-white text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors">
            <Play size={16} /> Resume
          </button>
          <button onClick={endGame} className="text-xs text-white/50 hover:text-white/80 transition-colors">End session</button>
          <p className="text-xs text-white/40">Press Esc or Space to resume</p>
        </div>
      )}
    </div>
  )
}
