import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OnboardingRole = 'pm' | 'engineer' | 'consultant' | 'student' | 'other'
export type OnboardingPriority = 'meetings' | 'writing' | 'speaking' | 'all'

interface OnboardingStore {
  /** True once the user has completed (or explicitly skipped) onboarding */
  completed: boolean
  /** Role chosen in step 1 */
  role: OnboardingRole | null
  /** Priority chosen in step 2 */
  priority: OnboardingPriority | null
  /** The 3 focus area names chosen in step 3 */
  selectedThemes: string[]

  markComplete: () => void
  setRole: (role: OnboardingRole) => void
  setPriority: (priority: OnboardingPriority) => void
  setSelectedThemes: (themes: string[]) => void
  /** Reset so the modal can be re-triggered from the dashboard */
  reset: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completed: false,
      role: null,
      priority: null,
      selectedThemes: [],

      markComplete: () => set({ completed: true }),
      setRole: (role) => set({ role }),
      setPriority: (priority) => set({ priority }),
      setSelectedThemes: (themes) => set({ selectedThemes: themes }),
      reset: () =>
        set({ completed: false, role: null, priority: null, selectedThemes: [] }),
    }),
    {
      name: 'speak-english-onboarding',
      version: 1,
    },
  ),
)

// ── Pre-selection logic ───────────────────────────────────────────────────────

/** Role → 3 suggested focus area names */
export const ROLE_THEMES: Record<OnboardingRole, string[]> = {
  pm:         ['Business & Professional', 'Meetings & Presentations', 'Problem-solving & Analysis'],
  engineer:   ['Problem-solving & Analysis', 'Written Communication', 'Formal & Academic'],
  consultant: ['Negotiations & Persuasion', 'Business & Professional', 'Meetings & Presentations'],
  student:    ['Formal & Academic', 'Everyday Conversation', 'Transitions & Connectors'],
  other:      ['Business & Professional', 'Everyday Conversation', 'Written Communication'],
}

/** Priority → the theme that must be in the selection */
const PRIORITY_MUST_HAVE: Record<OnboardingPriority, string> = {
  meetings: 'Meetings & Presentations',
  writing:  'Written Communication',
  speaking: 'Everyday Conversation',
  all:      'Business & Professional',
}

/**
 * Returns 3 pre-selected theme names based on role + priority.
 * If the priority's "must-have" theme isn't already in the role defaults,
 * it replaces the last slot.
 */
export function getPreselectedThemes(
  role: OnboardingRole,
  priority: OnboardingPriority,
): string[] {
  const base = [...ROLE_THEMES[role]]
  const mustHave = PRIORITY_MUST_HAVE[priority]
  if (!base.includes(mustHave)) {
    base[2] = mustHave
  }
  return base
}

/** Returns the best matching starter pack ID for the selected themes */
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
