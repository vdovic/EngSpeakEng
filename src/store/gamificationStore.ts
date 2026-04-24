import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Badge, BadgeId } from '@/types/vocabulary'

// ── Badge catalogue ───────────────────────────────────────────────────────────

const BADGE_DEFS: Omit<Badge, 'unlockedAt'>[] = [
  {
    id: 'first-step',
    label: 'First Step',
    description: 'Complete your first daily challenge',
    emoji: '🎯',
  },
  {
    id: 'early-bird',
    label: 'Early Bird',
    description: 'Complete 10 daily challenges',
    emoji: '🐦',
  },
  {
    id: 'on-a-roll',
    label: 'On a Roll',
    description: 'Reach a 3-day challenge streak',
    emoji: '🔥',
  },
  {
    id: 'week-warrior',
    label: 'Week Warrior',
    description: 'Reach a 7-day challenge streak',
    emoji: '⚔️',
  },
  {
    id: 'century',
    label: 'Century',
    description: 'Earn 100 total points',
    emoji: '💯',
  },
  {
    id: 'grand-scholar',
    label: 'Grand Scholar',
    description: 'Earn 500 total points',
    emoji: '🎓',
  },
  {
    id: 'diligent',
    label: 'Diligent',
    description: 'Complete 30 daily challenges',
    emoji: '📚',
  },
]

/** All badge definitions including locked ones (no unlockedAt). */
export const ALL_BADGES: Badge[] = BADGE_DEFS.map((d) => ({ ...d }))

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ── Store interface ───────────────────────────────────────────────────────────

interface GamificationStore {
  points: number
  streakDays: number
  lastChallengeDate: string | null // YYYY-MM-DD or null
  badges: Badge[]                  // only unlocked badges
  challengeCompletions: number

  addPoints: (n: number) => void
  recordChallengeCompletion: () => void
  /** Evaluate badge criteria and unlock newly earned ones.
   *  Returns the array of badges unlocked in this call (may be empty). */
  checkBadges: () => Badge[]
  /** Reset all state — useful for development / testing. */
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

      addPoints: (n) => set((s) => ({ points: s.points + n })),

      recordChallengeCompletion: () => {
        const { streakDays, lastChallengeDate } = get()
        const today = todayKey()

        // Only update once per calendar day
        if (lastChallengeDate === today) return

        const newStreak =
          lastChallengeDate === yesterdayKey()
            ? streakDays + 1 // continuing streak
            : 1              // streak broken or first time

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
            if (def) {
              newlyUnlocked.push({ ...def, unlockedAt: now })
            }
          }
        }

        if (newlyUnlocked.length > 0) {
          set((s) => ({ badges: [...s.badges, ...newlyUnlocked] }))
        }

        return newlyUnlocked
      },

      resetAll: () =>
        set({
          points: 0,
          streakDays: 0,
          lastChallengeDate: null,
          badges: [],
          challengeCompletions: 0,
        }),
    }),
    { name: 'speak-english-gamification' },
  ),
)
