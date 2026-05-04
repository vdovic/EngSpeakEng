/**
 * onboardingStore.ts
 *
 * Persists onboarding completion state and the user's learning profile.
 * Version 2 adds `profile: UserLearningProfile | null`.
 * The legacy role/priority/selectedThemes fields are kept for backward compat.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserLearningProfile, LearningGoal } from '@/types/profile'

// ── Legacy types (kept for backward compat) ───────────────────────────────────

export type OnboardingRole = 'pm' | 'engineer' | 'consultant' | 'student' | 'other'
export type OnboardingPriority = 'meetings' | 'writing' | 'speaking' | 'all'

// ── Store shape ────────────────────────────────────────────────────────────────

interface OnboardingStore {
  /** True once the user has completed (or explicitly skipped) onboarding */
  completed: boolean

  // ── Phase-8 profile ──────────────────────────────────────────────────────────
  /** Full learning profile — null until onboarding v2 is completed */
  profile: UserLearningProfile | null

  // ── Legacy fields (Phase-1 onboarding, kept for compat) ─────────────────────
  role:           OnboardingRole     | null
  priority:       OnboardingPriority | null
  selectedThemes: string[]

  // ── Actions ──────────────────────────────────────────────────────────────────
  markComplete:      ()                          => void
  setProfile:        (p: UserLearningProfile)    => void
  /** @deprecated use setProfile */
  setRole:           (role: OnboardingRole)      => void
  /** @deprecated use setProfile */
  setPriority:       (priority: OnboardingPriority) => void
  /** @deprecated use setProfile */
  setSelectedThemes: (themes: string[])          => void
  /** Reset so the modal can be re-triggered from the dashboard */
  reset:             ()                          => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completed:      false,
      profile:        null,
      role:           null,
      priority:       null,
      selectedThemes: [],

      markComplete:      ()  => set({ completed: true }),
      setProfile:        (p) => set({ profile: p }),
      setRole:           (r) => set({ role: r }),
      setPriority:       (p) => set({ priority: p }),
      setSelectedThemes: (t) => set({ selectedThemes: t }),

      reset: () =>
        set({
          completed:      false,
          profile:        null,
          role:           null,
          priority:       null,
          selectedThemes: [],
        }),
    }),
    {
      name:    'speak-english-onboarding',
      version: 2,
      // Migrate v1 → v2: preserve completed flag, add profile: null
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const old = persisted as Partial<OnboardingStore>
          return {
            completed:      old.completed      ?? false,
            profile:        null,
            role:           old.role           ?? null,
            priority:       old.priority       ?? null,
            selectedThemes: old.selectedThemes ?? [],
          }
        }
        return persisted as OnboardingStore
      },
    },
  ),
)

// ── Pre-selection logic (Phase-8) ─────────────────────────────────────────────

/** Goal → 3 pre-selected theme names for the themes step */
export const GOAL_THEME_SUGGESTIONS: Record<LearningGoal, string[]> = {
  'work-communication': ['Business & Professional', 'Written Communication', 'Meetings & Presentations'],
  'meetings':           ['Meetings & Presentations', 'Leadership & Management', 'Business & Professional'],
  'presentations':      ['Meetings & Presentations', 'Leadership & Management', 'Business & Professional'],
  'writing':            ['Written Communication', 'Transitions & Connectors', 'Business & Professional'],
  'product-management': ['Business & Professional', 'Problem-solving & Analysis', 'Leadership & Management'],
  'general-fluency':    ['Everyday Conversation', 'Idioms & Expressions', 'Phrasal Verbs'],
  'exam-preparation':   ['Formal & Academic', 'Transitions & Connectors', 'Written Communication'],
  'other':              ['Business & Professional', 'Everyday Conversation', 'Written Communication'],
}

// ── Legacy helpers (kept for any existing callers) ────────────────────────────

/** Role → 3 suggested focus area names */
export const ROLE_THEMES: Record<OnboardingRole, string[]> = {
  pm:         ['Business & Professional', 'Meetings & Presentations', 'Problem-solving & Analysis'],
  engineer:   ['Problem-solving & Analysis', 'Written Communication', 'Formal & Academic'],
  consultant: ['Negotiations & Persuasion', 'Business & Professional', 'Meetings & Presentations'],
  student:    ['Formal & Academic', 'Everyday Conversation', 'Transitions & Connectors'],
  other:      ['Business & Professional', 'Everyday Conversation', 'Written Communication'],
}

const PRIORITY_MUST_HAVE: Record<OnboardingPriority, string> = {
  meetings: 'Meetings & Presentations',
  writing:  'Written Communication',
  speaking: 'Everyday Conversation',
  all:      'Business & Professional',
}

export function getPreselectedThemes(
  role: OnboardingRole,
  priority: OnboardingPriority,
): string[] {
  const base     = [...ROLE_THEMES[role]]
  const mustHave = PRIORITY_MUST_HAVE[priority]
  if (!base.includes(mustHave)) base[2] = mustHave
  return base
}

export function getBestPackId(themes: string[]): string {
  const priority: Array<[string, string]> = [
    ['Meetings & Presentations', 'meetings-presentations'],
    ['Business & Professional',  'business-essentials'],
    ['Written Communication',    'writing-email'],
    ['Everyday Conversation',    'everyday-fluency'],
    ['Phrasal Verbs',            'phrasal-verbs-work'],
  ]
  for (const [theme, packId] of priority) {
    if (themes.includes(theme)) return packId
  }
  return 'business-essentials'
}
