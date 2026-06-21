/**
 * PhraseGamePage — collocation and phrase-pattern practice game.
 *
 * Three question types that teach phrases from both directions:
 *   pick-collocation — given the word, pick the phrase that uses it naturally
 *   find-the-word    — given a blanked phrase ("make a ___"), pick the word
 *   frame-to-word    — given a sentence frame, pick the word that fits
 *
 * Round-based (10 / 20 / 30 rounds) rather than timed — deliberate practice,
 * not speed pressure. After each answer the full phrase is revealed so the
 * learner can absorb the pattern before continuing.
 *
 * Gamification guardrails (CLAUDE.md): no XP, no streaks, no badges.
 * Results show objective counts: correct / wrong / accuracy / words practiced.
 */

import { useState, useRef, useCallback } from 'react'
import { useNavigate }                  from 'react-router-dom'
import {
  ArrowLeft, Quote, CheckCircle2, XCircle, ChevronRight,
  BookOpen, Plus, Check, ExternalLink,
} from 'lucide-react'
import { useVocabStore }      from '@/store/vocabStore'
import { usePhraseGameStore } from '@/store/phraseGameStore'
import { usePracticeTimer }   from '@/hooks/usePracticeTimer'
import {
  selectPhrasePool, countPhraseScope, generatePhraseQuestions,
  fillTerm, splitOnTerm,
  PHRASE_ROUND_COUNTS,
  type PhraseQuestion, type PhraseAttempt,
  type PhraseScope, type PhraseRoundCount,
} from '@/lib/phraseGame'
import type { VocabItem } from '@/types/vocabulary'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'playing' | 'results'

// ── Constants ──────────────────────────────────────────────────────────────────

const SCOPE_LABELS: Record<PhraseScope, string> = {
  focus: 'Focus words',
  full:  'All words',
}

const TYPE_LABELS: Record<PhraseQuestion['type'], string> = {
  'pick-collocation': 'Pick the phrase',
  'find-the-word':    'Find the word',
  'frame-to-word':    'Complete the frame',
}

const TYPE_PROMPTS: Record<PhraseQuestion['type'], string> = {
  'pick-collocation': 'Which phrase uses this word naturally?',
  'find-the-word':    'Which word fits naturally in this phrase?',
  'frame-to-word':    'Which word completes this sentence frame?',
}

// ── HighlightedPhrase ──────────────────────────────────────────────────────────
// Renders a collocation/frame with the target term bolded.

function HighlightedPhrase({ text, term }: { text: string; term: string }) {
  const [pre, match, post] = splitOnTerm(text, term)
  if (!match) return <span>{text}</span>
  return (
    <span>
      {pre}
      <strong className="text-slate-900 font-bold">{match}</strong>
      {post}
    </span>
  )
}

// ── RevealedPhrase — shown after the user answers ──────────────────────────────

function RevealedPhrase({ question }: { question: PhraseQuestion }) {
  const fullPhrase = question.type === 'frame-to-word'
    ? fillTerm(question.collocation, question.term)
    : question.collocation
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        The phrase
      </p>
      <p className="text-base font-semibold text-slate-700 leading-snug">
        <HighlightedPhrase text={fullPhrase} term={question.term} />
      </p>
      {question.definitionEn && (
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
          {question.definitionEn}
        </p>
      )}
    </div>
  )
}

// ── ResultsView ────────────────────────────────────────────────────────────────

function ResultsView({
  correct, wrong, roundCount, scope,
  attempts, items, addedToFocusIds, setAddedToFocusIds,
  addToFocus, onPlayAgain, onChangeSettings, navigate,
}: {
  correct:             number
  wrong:               number
  roundCount:          PhraseRoundCount
  scope:               PhraseScope
  attempts:            PhraseAttempt[]
  items:               VocabItem[]
  addedToFocusIds:     Set<string>
  setAddedToFocusIds:  React.Dispatch<React.SetStateAction<Set<string>>>
  addToFocus:          (ids: string[]) => Promise<{ added: number; evicted: number }>
  onPlayAgain:         () => void
  onChangeSettings:    () => void
  navigate:            ReturnType<typeof useNavigate>
}) {
  const total    = correct + wrong
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // Unique words practiced
  const wordsSet = new Set(attempts.map((a) => a.itemId))

  // Separate correct vs missed attempts (unique by itemId, keeping first wrong)
  const missedIds = new Set(attempts.filter((a) => !a.wasCorrect).map((a) => a.itemId))
  const uniqueMissed = [...missedIds].map(
    (id) => attempts.find((a) => a.itemId === id && !a.wasCorrect)!,
  )
  const correctAttempts = attempts
    .filter((a) => a.wasCorrect && !missedIds.has(a.itemId))
    .filter((a, i, arr) => arr.findIndex((b) => b.itemId === a.itemId) === i)

  async function handleAddToFocus(itemId: string) {
    await addToFocus([itemId])
    setAddedToFocusIds((prev) => new Set([...prev, itemId]))
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 md:pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          Phrase Builder · {roundCount} rounds · done
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
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
          <p className="text-3xl font-bold text-slate-700 tabular-nums">{wordsSet.size}</p>
          <p className="text-xs text-slate-500 mt-1">Words seen</p>
        </div>
      </div>

      {/* Missed phrases */}
      {uniqueMissed.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Missed — {uniqueMissed.length} phrase{uniqueMissed.length !== 1 ? 's' : ''}
          </p>
          <div className="bg-rose-50 border border-rose-200 rounded-xl overflow-hidden">
            {uniqueMissed.map((attempt) => {
              const vocabItem    = items.find((i) => i.id === attempt.itemId)
              const alreadyFocus = vocabItem?.inFocus || vocabItem?.weeklyFocus
              const justAdded    = addedToFocusIds.has(attempt.itemId)
              const fullPhrase   = attempt.type === 'frame-to-word'
                ? fillTerm(attempt.collocation, attempt.term)
                : attempt.collocation
              const [pre, match, post] = splitOnTerm(fullPhrase, attempt.term)
              return (
                <div key={attempt.itemId} className="flex items-center border-b border-rose-100 last:border-0">
                  <button
                    onClick={() => navigate(`/item/${attempt.itemId}`)}
                    className="flex-1 flex items-start gap-3 px-4 py-3 text-left hover:bg-rose-100 transition-colors"
                  >
                    <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {pre}
                        <strong className="text-rose-700">{match}</strong>
                        {post}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{TYPE_LABELS[attempt.type]}</p>
                    </div>
                    <ExternalLink size={12} className="text-rose-300 shrink-0 mt-0.5" />
                  </button>
                  {!alreadyFocus && (
                    <button
                      onClick={() => handleAddToFocus(attempt.itemId)}
                      className={`mr-3 p-1.5 rounded-lg border transition-colors shrink-0 ${
                        justAdded
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                          : 'bg-white border-rose-200 text-rose-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50'
                      }`}
                      aria-label={justAdded ? 'Added to Focus' : `Add ${attempt.term} to Focus`}
                    >
                      {justAdded ? <Check size={12} /> : <Plus size={12} />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Correct phrases */}
      {correctAttempts.length > 0 && (
        <CorrectPhrasesList attempts={correctAttempts} navigate={navigate} />
      )}

      {total === 0 && (
        <p className="text-sm text-slate-400 text-center mb-5">No questions answered.</p>
      )}

      {/* Actions */}
      <div className="space-y-2.5">
        <button onClick={onPlayAgain}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-2xl transition-colors">
          <Quote size={15} />
          Play again · {roundCount} rounds · {SCOPE_LABELS[scope]}
        </button>
        <div className="flex gap-2.5">
          <button onClick={onChangeSettings}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-slate-50 transition-colors">
            Change settings
          </button>
          <button onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-2xl transition-colors">
            Done <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CorrectPhrasesList({
  attempts, navigate,
}: {
  attempts: PhraseAttempt[]
  navigate: ReturnType<typeof useNavigate>
}) {
  const [expanded, setExpanded] = useState(false)
  const SHOW = 5
  const shown = expanded ? attempts : attempts.slice(0, SHOW)
  return (
    <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold text-slate-500">
          Got right — {attempts.length} phrase{attempts.length !== 1 ? 's' : ''}
        </span>
        <ChevronRight size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="divide-y divide-slate-100">
          {shown.map((attempt, i) => {
            const fullPhrase = attempt.type === 'frame-to-word'
              ? fillTerm(attempt.collocation, attempt.term)
              : attempt.collocation
            const [pre, match, post] = splitOnTerm(fullPhrase, attempt.term)
            return (
              <button key={`${attempt.itemId}-${i}`}
                onClick={() => navigate(`/item/${attempt.itemId}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">
                    {pre}
                    <strong className="text-slate-900">{match}</strong>
                    {post}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{TYPE_LABELS[attempt.type]}</p>
                </div>
                <ExternalLink size={12} className="text-slate-300 shrink-0" />
              </button>
            )
          })}
          {!expanded && attempts.length > SHOW && (
            <button onClick={() => setExpanded(true)}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors bg-white">
              Show {attempts.length - SHOW} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── PhraseGamePage (main) ──────────────────────────────────────────────────────

export function PhraseGamePage() {
  const navigate                              = useNavigate()
  const { items, recordExposure, addToFocus } = useVocabStore()
  const { addResult, saveLastSettings }       = usePhraseGameStore()
  const pastResults = usePhraseGameStore((s) => s.results)
  const storedSettings = useRef({
    scope:      usePhraseGameStore.getState().lastScope,
    roundCount: usePhraseGameStore.getState().lastRoundCount,
  }).current
  const practiceTimer = usePracticeTimer('phrase-builder')

  // ── Settings ─────────────────────────────────────────────────────────────────
  const [scope,      setScope]      = useState<PhraseScope>(storedSettings.scope)
  const [roundCount, setRoundCount] = useState<PhraseRoundCount>(storedSettings.roundCount)

  // ── Phase ─────────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('setup')

  // ── Playing state ─────────────────────────────────────────────────────────────
  const [questions,      setQuestions]      = useState<PhraseQuestion[]>([])
  const [currentRound,   setCurrentRound]   = useState(0)
  const [selectedIndex,  setSelectedIndex]  = useState<number | null>(null)
  const [correct,        setCorrect]        = useState(0)
  const [wrong,          setWrong]          = useState(0)
  const [addedToFocusIds, setAddedToFocusIds] = useState<Set<string>>(new Set())

  const attemptsRef           = useRef<PhraseAttempt[]>([])
  const wordsGainedExposure   = useRef<Set<string>>(new Set())
  const resultSaved           = useRef(false)

  // ── Start game ─────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const pool = selectPhrasePool(items, scope)
    const qs   = generatePhraseQuestions(pool, roundCount)
    if (qs.length === 0) return
    attemptsRef.current         = []
    wordsGainedExposure.current = new Set()
    resultSaved.current         = false
    practiceTimer.reset()
    setQuestions(qs)
    setCurrentRound(0)
    setSelectedIndex(null)
    setCorrect(0)
    setWrong(0)
    setAddedToFocusIds(new Set())
    saveLastSettings(scope, roundCount)
    setPhase('playing')
  }, [items, scope, roundCount, practiceTimer, saveLastSettings])

  // ── Handle answer ──────────────────────────────────────────────────────────────
  const handleAnswer = useCallback((choiceIndex: number) => {
    if (selectedIndex !== null) return  // already answered
    const q          = questions[currentRound]
    const isCorrect  = choiceIndex === q.correctIndex

    setSelectedIndex(choiceIndex)
    if (isCorrect) setCorrect((c) => c + 1); else setWrong((w) => w + 1)

    attemptsRef.current.push({
      itemId:      q.itemId,
      term:        q.term,
      type:        q.type,
      collocation: q.collocation,
      wasCorrect:  isCorrect,
      givenAnswer: q.choices[choiceIndex],
    })

    // Award exposure (once per word per session, max exposure cap enforced in store)
    if (
      isCorrect &&
      !wordsGainedExposure.current.has(q.itemId)
    ) {
      wordsGainedExposure.current.add(q.itemId)
      void recordExposure(q.itemId, true)
    }

    practiceTimer.bump({ advancement: isCorrect ? 1 : 0, itemId: q.itemId })
  }, [selectedIndex, questions, currentRound, recordExposure, practiceTimer])

  // ── Advance to next round / finish ────────────────────────────────────────────
  const handleNext = useCallback(() => {
    const nextRound = currentRound + 1
    if (nextRound < questions.length) {
      setCurrentRound(nextRound)
      setSelectedIndex(null)
    } else {
      // Game complete
      if (!resultSaved.current) {
        resultSaved.current = true
        // correct/wrong are already updated synchronously by handleAnswer
        const total     = correct + wrong
        const finalAcc  = total > 0 ? Math.round((correct / total) * 100) : 0
        addResult({
          id:             crypto.randomUUID(),
          playedAt:       new Date().toISOString(),
          roundCount,
          correct,
          wrong,
          accuracy:       finalAcc,
          wordsPracticed: new Set(attemptsRef.current.map((a) => a.itemId)).size,
          scope,
        })
        practiceTimer.finalize()
      }
      setPhase('results')
    }
  }, [currentRound, questions, correct, wrong, selectedIndex, roundCount, scope, addResult, practiceTimer])

  // ── Keyboard: 1-4 to answer, Enter/Space to advance ──────────────────────────
  // (implemented inline via onKeyDown on the container)

  // ── Results phase ──────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <ResultsView
        correct={correct}
        wrong={wrong}
        roundCount={roundCount}
        scope={scope}
        attempts={attemptsRef.current}
        items={items}
        addedToFocusIds={addedToFocusIds}
        setAddedToFocusIds={setAddedToFocusIds}
        addToFocus={addToFocus}
        onPlayAgain={startGame}
        onChangeSettings={() => setPhase('setup')}
        navigate={navigate}
      />
    )
  }

  // ── Setup phase ───────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const focusCount = countPhraseScope(items, 'focus')
    const fullCount  = countPhraseScope(items, 'full')
    const scopeCounts: Record<PhraseScope, number> = { focus: focusCount, full: fullCount }
    const currentCount = scopeCounts[scope]
    const noWords      = fullCount < 4

    const totalSessions = pastResults.length
    const avgAccuracy   = totalSessions > 0
      ? Math.round(pastResults.reduce((s, r) => s + r.accuracy, 0) / totalSessions)
      : null

    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-28 md:pb-10">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <Quote size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Phrase Builder</h1>
          </div>
          {totalSessions > 0 && (
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span className="tabular-nums">{totalSessions} session{totalSessions !== 1 ? 's' : ''}</span>
              {avgAccuracy !== null && <span className="tabular-nums">{avgAccuracy}% avg</span>}
            </div>
          )}
        </div>

        {/* Scope picker */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Word selection</p>
          <div className="grid grid-cols-2 gap-2">
            {(['focus', 'full'] as PhraseScope[]).map((s) => {
              const cnt      = scopeCounts[s]
              const isActive = scope === s
              const disabled = cnt < 4
              const subtitle = s === 'focus'
                ? (cnt > 0 ? `${cnt} focus word${cnt !== 1 ? 's' : ''} with phrases` : 'None with phrase data')
                : `${cnt} word${cnt !== 1 ? 's' : ''} with phrases`
              return (
                <button key={s} onClick={() => !disabled && setScope(s)} disabled={disabled}
                  aria-pressed={isActive}
                  className={`px-3 py-3 rounded-xl border text-sm font-semibold text-left transition-colors disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : disabled
                      ? 'bg-slate-50 text-slate-400 border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}>
                  <span className="block">{SCOPE_LABELS[s]}</span>
                  <span className={`text-xs font-normal mt-0.5 block ${isActive ? 'text-brand-100' : disabled ? 'text-slate-300' : 'text-slate-400'}`}>
                    {subtitle}
                  </span>
                </button>
              )
            })}
          </div>
          {scope === 'focus' && focusCount < 4 && fullCount >= 4 && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
              <BookOpen size={12} className="shrink-0" />
              Fewer than 4 focus words with phrases — will use your full vocabulary instead.
            </p>
          )}
        </div>

        {noWords && (
          <div className="mb-5 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <BookOpen size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p>You need at least 4 words with collocations or sentence frames to play. Add more vocabulary or enrich existing words.</p>
          </div>
        )}

        {/* Round count picker */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rounds</p>
          <div className="grid grid-cols-3 gap-2">
            {PHRASE_ROUND_COUNTS.map((n) => {
              const history = pastResults.filter((r) => r.roundCount === n)
              const best    = history.length > 0 ? Math.max(...history.map((r) => r.accuracy)) : null
              const isActive = roundCount === n
              return (
                <button key={n} onClick={() => setRoundCount(n)}
                  className={`py-3 px-2 rounded-xl text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}>
                  <span>{n} rounds</span>
                  {best !== null && (
                    <span className={`text-[10px] font-normal leading-none ${isActive ? 'text-brand-200' : 'text-slate-400'}`}>
                      best {best}%
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
              {pastResults.slice(0, 6).map((r, i) => (
                <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-700 font-medium">
                      {new Date(r.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-slate-400 ml-1.5">
                      {new Date(r.playedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-slate-400 shrink-0">{r.roundCount} rounds</span>
                  <span className="font-semibold text-emerald-600 tabular-nums shrink-0">{r.correct}✓</span>
                  <span className="text-slate-400 tabular-nums shrink-0">{r.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What to expect */}
        <div className="mb-6 space-y-1.5 text-xs text-slate-400">
          <p>· Pick the natural collocation for a given word</p>
          <p>· Find which word fits a blanked-out phrase</p>
          <p>· Complete sentence frames with the right word</p>
          <p>· See the full phrase after every answer</p>
        </div>

        <button
          onClick={startGame}
          disabled={noWords || currentCount < 4}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <Quote size={16} />
          Start · {roundCount} rounds · {SCOPE_LABELS[scope]}
        </button>
      </div>
    )
  }

  // ── Playing phase ─────────────────────────────────────────────────────────────
  const q       = questions[currentRound]
  const total   = questions.length
  const answered = selectedIndex !== null
  const isLastRound = currentRound === total - 1

  if (!q) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28 md:pb-8">

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setPhase('setup')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Back to setup">
          <ArrowLeft size={20} />
        </button>

        {/* Progress */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">
              Round {currentRound + 1} of {total}
            </span>
            <span className="text-xs font-semibold">
              <span className="text-emerald-600 tabular-nums">{correct}✓</span>
              {' · '}
              <span className="text-rose-500 tabular-nums">{wrong}✗</span>
            </span>
          </div>
          <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${((currentRound) / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question type label */}
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {TYPE_LABELS[q.type]}
      </p>

      {/* Prompt area */}
      {q.type === 'pick-collocation' ? (
        /* Term card for pick-collocation */
        <div className="bg-slate-50 rounded-2xl border border-slate-200 px-5 py-5 mb-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{q.term}</p>
          {q.partOfSpeech && (
            <p className="text-xs text-slate-400 mt-1 italic">{q.partOfSpeech}</p>
          )}
          {q.definitionEn && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-3">
              {q.definitionEn}
            </p>
          )}
        </div>
      ) : (
        /* Phrase/frame display for find-the-word and frame-to-word */
        <div className="bg-white rounded-2xl border-2 border-slate-200 px-5 py-5 mb-4">
          <p className="text-xl font-semibold text-slate-800 leading-snug">
            {q.displayPhrase}
          </p>
        </div>
      )}

      {/* Question text */}
      <p className="text-sm text-slate-600 font-medium mb-4">
        {TYPE_PROMPTS[q.type]}
      </p>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        {q.choices.map((choice, idx) => {
          const isCorrectChoice = answered && idx === q.correctIndex
          const isWrongChoice   = answered && !isCorrectChoice && idx === selectedIndex
          const isNeutral       = answered && !isCorrectChoice && idx !== selectedIndex

          return (
            <button key={idx} onClick={() => handleAnswer(idx)}
              disabled={answered}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-colors disabled:cursor-default ${
                isCorrectChoice
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : isWrongChoice
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : isNeutral
                  ? 'border-slate-200 bg-white text-slate-400 opacity-50'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  !answered
                    ? 'border-slate-300 text-slate-400'
                    : isCorrectChoice
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isWrongChoice
                    ? 'bg-rose-400 border-rose-400 text-white'
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

      {/* Reveal card + Next button — shown after answering */}
      {answered && (
        <>
          {/* Inline feedback banner */}
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-sm font-semibold ${
            selectedIndex === q.correctIndex
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}>
            {selectedIndex === q.correctIndex
              ? <><CheckCircle2 size={16} /> Correct</>
              : <><XCircle size={16} /> The answer was: <strong className="ml-1">{q.choices[q.correctIndex]}</strong></>
            }
          </div>

          {/* Full phrase reveal */}
          <RevealedPhrase question={q} />

          {/* Next / Finish */}
          <button onClick={handleNext}
            className="mt-4 w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
            {isLastRound ? 'See results' : <>Next <ChevronRight size={15} /></>}
          </button>
        </>
      )}
    </div>
  )
}
