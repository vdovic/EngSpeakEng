/**
 * practice.ts — Practice-session primitives for the Progress & Effort analytics.
 *
 * A PracticeSession is the single, universal log of time spent and progress made
 * in any practice activity (daily challenge, speed game, experimental games, and
 * any future activity). It is the source of truth for the Effort analytics tab.
 *
 * Design notes (CLAUDE.md compliance):
 *   • This is objective effort state — time on task, words practised, exposures
 *     gained — not a score or performance rating.
 *   • "advancement" is an internal numeric aggregate (progress events). It is
 *     surfaced to learners only as "learning progress" / "mastery growth", never
 *     as points/XP. No arcade framing.
 *   • Extensible: a new activity only needs a new ActivityType entry + label.
 *     Aggregation and UI are activity-agnostic.
 *
 * Persistence & safety:
 *   • Sessions are immutable once recorded and merged union-by-id (like speed
 *     game results), so device sync never loses or mutates history.
 */

// ── Activity taxonomy ───────────────────────────────────────────────────────────

/**
 * Every practice activity that can log time. Adding a future game means adding
 * one entry here and one label below — no aggregation or UI changes required.
 */
export type ActivityType =
  | 'daily-challenge'
  | 'speed-game'
  | 'sentence-repair'
  | 'phrase-upgrade'
  | 'recall'
  | 'natural-phrases'

/** Learner-facing labels. Calm, descriptive — no arcade language. */
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  'daily-challenge': 'Daily Challenge',
  'speed-game':      'Speed Practice',
  'sentence-repair': 'Sentence Repair',
  'phrase-upgrade':  'Phrase Upgrade',
  'recall':          'Recall',
  'natural-phrases': 'Natural Phrases Sprint',
}

/**
 * Stable display colours per activity (used by distribution charts). Chosen to
 * match the existing palette: effort = sky/rose, growth = emerald/indigo.
 */
export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  'daily-challenge': '#6366f1', // indigo-500
  'speed-game':      '#f43f5e', // rose-500
  'sentence-repair': '#14b8a6', // teal-500
  'phrase-upgrade':  '#0ea5e9', // sky-500
  'recall':          '#a78bfa', // violet-400
  'natural-phrases': '#f59e0b', // amber-500
}

/** Resolve a label for any stored value, including unknown/future activities. */
export function activityLabel(activity: string): string {
  return ACTIVITY_LABELS[activity as ActivityType] ?? activity
}

/** Resolve a colour for any stored value, falling back to a neutral slate. */
export function activityColor(activity: string): string {
  return ACTIVITY_COLORS[activity as ActivityType] ?? '#94a3b8'
}

// ── Session record ──────────────────────────────────────────────────────────────

/**
 * A single completed stretch of practice in one activity.
 * Active time only — idle and backgrounded time is trimmed by the timer hook.
 */
export interface PracticeSession {
  /** Stable unique ID (crypto.randomUUID). */
  id: string
  /** Which activity produced this session. */
  activity: ActivityType
  /** ISO timestamp of when the session ended (used for day/week bucketing). */
  endedAt: string
  /** Active, idle-trimmed seconds spent in the session. */
  durationSecs: number
  /** Distinct words touched in the session (objective effort). */
  itemsPracticed: number
  /**
   * Internal numeric progress aggregate ("progress events"). Surfaced only as
   * "learning progress" — e.g. correct answers or exposures gained this session.
   */
  advancement: number
}

/** Sessions shorter than this are discarded as noise (e.g. accidental opens). */
export const MIN_SESSION_SECS = 3
