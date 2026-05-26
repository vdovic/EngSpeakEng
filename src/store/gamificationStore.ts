import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Badge, BadgeId } from '@/types/vocabulary'
import { todayDateKey, yesterdayDateKey } from '@/lib/dateUtils'

// ── Badge catalogue ───────────────────────────────────────────────────────────

const BADGE_DEFS: Omit<Badge, 'unlockedAt'>[] = [
  { id: 'first-step',    label: 'First Step',    description: 'Complete your first daily challenge',  emoji: '🎯' },
  { id: 'early-bird',   label: 'Early Bird',    description: 'Complete 10 daily challenges',          emoji: '🐦' },
  { id: 'on-a-roll',    label: 'On a Roll',     description: 'Reach a 3-day challenge streak',        emoji: '🔥' },
  { id: 'week-warrior', label: 'Week Warrior',  description: 'Reach a 7-day challenge streak',        emoji: '⚔️' },
  { id: 'century',      label: 'Century',       description: 'Earn 100 total points',                 emoji: '💯' },
  { id: 'grand-scholar',label: 'Grand Scholar', description: 'Earn 500 total points',                 emoji: '🎓' },
  { id: 'diligent',     label: 'Diligent',      description: 'Complete 30 daily challenges',          emoji: '📚' },
]

/** All badge definitions including locked ones (no unlockedAt). */
export const ALL_BADGES: Badge[] = BADGE_DEFS.map((d) => ({ ...d }))

/** Progress thresholds for each badge — used to render progress bars. */
export const BADGE_THRESHOLDS: Record<BadgeId, { metric: 'completions' | 'streak' | 'points'; target: number }> = {
  'first-step':    { metric: 'completions', target: 1 },
  'early-bird':    { metric: 'completions', target: 10 },
  'on-a-roll':     { metric: 'streak',      target: 3 },
  'week-warrior':  { metric: 'streak',      target: 7 },
  'century':       { metric: 'points',      target: 100 },
  'grand-scholar': { metric: 'points',      target: 500 },
  'diligent':      { metric: 'completions', target: 30 },
}

// ── Local helpers ─────────────────────────────────────────────────────────────

/** Six months from today — the default goal horizon. */
function defaultDeadline(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().slice(0, 10)
}

function defaultStartDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Store interface ───────────────────────────────────────────────────────────

interface GamificationStore {
  points: number
  streakDays: number
  lastChallengeDate: string | null
  badges: Badge[]
  challengeCompletions: number
  /** Daily challenge points keyed by YYYY-MM-DD. */
  pointsHistory: Record<string, number>
  /** Customisable mastery goal */
  goalTarget: number
  goalStartDate: string
  goalDeadline: string

  /** Total practice games completed across all game modes. */
  gamesPlayed: number
  /** Best streak achieved across all practice games. */
  bestGameStreak: number

  addPoints: (n: number) => void
  recordChallengeCompletion: () => void
  checkBadges: () => Badge[]
  /** Record a completed practice game. streak is the run's best streak. */
  recordGameCompletion: (streak: number) => void
  /** Pass startDate as the third arg to update the goal start date. */
  setGoal: (target: number, deadline: string, startDate?: string) => void
  resetAll: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      points: 0,
      streakDays: 0,
      lastChallengeDate: null,
      badges: [],
      challengeCompletions: 0,
      pointsHistory: {},
      goalTarget: 1500,
      goalStartDate: defaultStartDate(),
      goalDeadline: defaultDeadline(),
      gamesPlayed: 0,
      bestGameStreak: 0,

      addPoints: (n) => {
        const today = todayDateKey()
        set((s) => ({
          points: s.points + n,
          pointsHistory: {
            ...s.pointsHistory,
            [today]: (s.pointsHistory[today] ?? 0) + n,
          },
        }))
      },

      recordChallengeCompletion: () => {
        const { streakDays, lastChallengeDate } = get()
        const today = todayDateKey()
        if (lastChallengeDate === today) return

        const newStreak =
          lastChallengeDate === yesterdayDateKey() ? streakDays + 1 : 1

        set((s) => ({
          streakDays: newStreak,
          lastChallengeDate: today,
          challengeCompletions: s.challengeCompletions + 1,
        }))
      },

      checkBadges: () => {
        const { points, streakDays, challengeCompletions, badges } = get()
        const unlockedIds = new Set<BadgeId>(badges.map((b) => b.id as BadgeId))

        const criteria: { id: BadgeId; unlocked: boolean }[] = [
          { id: 'first-step',    unlocked: challengeCompletions >= 1 },
          { id: 'early-bird',    unlocked: challengeCompletions >= 10 },
          { id: 'on-a-roll',     unlocked: streakDays >= 3 },
          { id: 'week-warrior',  unlocked: streakDays >= 7 },
          { id: 'century',       unlocked: points >= 100 },
          { id: 'grand-scholar', unlocked: points >= 500 },
          { id: 'diligent',      unlocked: challengeCompletions >= 30 },
        ]

        const now = new Date().toISOString()
        const newlyUnlocked: Badge[] = []

        for (const crit of criteria) {
          if (crit.unlocked && !unlockedIds.has(crit.id)) {
            const def = BADGE_DEFS.find((d) => d.id === crit.id)
            if (def) newlyUnlocked.push({ ...def, unlockedAt: now })
          }
        }

        if (newlyUnlocked.length > 0) {
          set((s) => ({ badges: [...s.badges, ...newlyUnlocked] }))
        }

        return newlyUnlocked
      },

      recordGameCompletion: (streak) =>
        set((s) => ({
          gamesPlayed: s.gamesPlayed + 1,
          bestGameStreak: Math.max(s.bestGameStreak, streak),
        })),

      setGoal: (target, deadline, startDate) =>
        set((s) => ({
          goalTarget: target,
          goalDeadline: deadline,
          goalStartDate: startDate ?? s.goalStartDate,
        })),

      resetAll: () =>
        set({
          points: 0,
          streakDays: 0,
          lastChallengeDate: null,
          badges: [],
          challengeCompletions: 0,
          pointsHistory: {},
          goalTarget: 1500,
          goalStartDate: defaultStartDate(),
          goalDeadline: defaultDeadline(),
          gamesPlayed: 0,
          bestGameStreak: 0,
        }),
    }),
    {
      name:    'speak-english-gamification',
      version: 1,
      /**
       * Migrate persisted state across store versions.
       *
       * v0 → v1: first versioned release — backfill any fields that may be
       * absent in older payloads.  All user progress (points, streakDays,
       * badges, challengeCompletions, pointsHistory, gamesPlayed,
       * bestGameStreak) is preserved; missing fields get safe defaults.
       */
      migrate(persisted: unknown, _fromVersion: number) {
        const old = (persisted ?? {}) as Partial<GamificationStore>
        return {
          points:               old.points               ?? 0,
          streakDays:           old.streakDays           ?? 0,
          lastChallengeDate:    old.lastChallengeDate     ?? null,
          badges:               old.badges               ?? [],
          challengeCompletions: old.challengeCompletions ?? 0,
          pointsHistory:        old.pointsHistory        ?? {},
          goalTarget:           old.goalTarget           ?? 1500,
          goalStartDate:        old.goalStartDate        ?? defaultStartDate(),
          goalDeadline:         old.goalDeadline         ?? defaultDeadline(),
          gamesPlayed:          old.gamesPlayed          ?? 0,
          bestGameStreak:       old.bestGameStreak       ?? 0,
        }
      },
    },
  ),
)
