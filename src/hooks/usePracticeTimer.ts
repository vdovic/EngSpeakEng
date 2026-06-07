/**
 * usePracticeTimer — reusable active-time tracker for any practice activity.
 *
 * The single instrumentation primitive behind the Progress & Effort analytics.
 * A game or challenge calls `bump()` whenever the learner does something
 * (answers a question, advances a word). The hook accrues *active* time only:
 *
 *   • Time accrues in the gaps between interactions, so genuine think-time is
 *     captured but the clock never runs while nothing is happening.
 *   • Any single gap is capped at `idleLimitSecs` (default 60s), so a long pause,
 *     a phone left on the question, or a backgrounded tab cannot inflate the total.
 *   • Backgrounded time is excluded explicitly via the visibilitychange listener.
 *
 * When the component unmounts (or `finalize()` is called), a PracticeSession is
 * appended to the practice store — but only if it exceeds MIN_SESSION_SECS.
 *
 * Usage:
 *   const timer = usePracticeTimer('speed-game')
 *   // on each answer:
 *   timer.bump({ advancement: isCorrect ? 1 : 0, itemId })
 *   // optional explicit end (otherwise auto-logged on unmount):
 *   timer.finalize()
 *
 * CLAUDE.md: no AI, no side effects beyond appending an objective effort record.
 * Logs nothing to the console and runs no work on render.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { usePracticeStore } from '@/store/practiceStore'
import { MIN_SESSION_SECS, type ActivityType } from '@/lib/practice'

interface BumpInput {
  /** Internal progress aggregate to add (e.g. 1 per correct answer). */
  advancement?: number
  /** Distinct word touched — counted once toward itemsPracticed. */
  itemId?: string
}

interface UsePracticeTimer {
  /** Register an interaction; accrues active time and optional advancement. */
  bump: (input?: BumpInput) => void
  /** Finalize and log the session now (idempotent). Also runs on unmount. */
  finalize: () => void
  /** Re-arm for a fresh session after finalize (e.g. "play again"). */
  reset: () => void
}

export function usePracticeTimer(
  activity: ActivityType,
  options?: { idleLimitSecs?: number },
): UsePracticeTimer {
  const idleLimitMs = (options?.idleLimitSecs ?? 60) * 1000

  const activeMsRef    = useRef(0)
  const lastTickRef    = useRef(Date.now())
  const advancementRef = useRef(0)
  const itemIdsRef     = useRef<Set<string>>(new Set())
  const endedRef       = useRef(false)

  const accrue = useCallback(() => {
    const now = Date.now()
    const gap = now - lastTickRef.current
    activeMsRef.current += Math.min(Math.max(gap, 0), idleLimitMs)
    lastTickRef.current = now
  }, [idleLimitMs])

  const bump = useCallback(
    (input?: BumpInput) => {
      accrue()
      if (input?.advancement) advancementRef.current += input.advancement
      if (input?.itemId) itemIdsRef.current.add(input.itemId)
    },
    [accrue],
  )

  const finalize = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    const durationSecs = Math.round(activeMsRef.current / 1000)
    if (durationSecs < MIN_SESSION_SECS) return
    usePracticeStore.getState().addSession({
      id: crypto.randomUUID(),
      activity,
      endedAt: new Date().toISOString(),
      durationSecs,
      itemsPracticed: itemIdsRef.current.size,
      advancement: advancementRef.current,
    })
  }, [activity])

  const reset = useCallback(() => {
    activeMsRef.current    = 0
    advancementRef.current = 0
    itemIdsRef.current     = new Set()
    lastTickRef.current    = Date.now()
    endedRef.current       = false
  }, [])

  useEffect(() => {
    // Exclude backgrounded time: accrue the active slice before hiding, and
    // reset the tick on every transition so hidden time is never counted.
    function onVisibility() {
      if (document.visibilityState === 'hidden') accrue()
      lastTickRef.current = Date.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      finalize() // auto-log whatever was accrued when the screen unmounts
    }
  }, [accrue, finalize])

  // Stable object identity so callers can safely list it in useCallback deps.
  return useMemo(() => ({ bump, finalize, reset }), [bump, finalize, reset])
}
