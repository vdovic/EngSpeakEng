/**
 * profile.ts — Phase 8
 *
 * User learning profile stored locally via onboardingStore.
 * Drives personalised focus-set recommendations and Dashboard summary card.
 */

export type LearningGoal =
  | 'work-communication'
  | 'meetings'
  | 'presentations'
  | 'writing'
  | 'product-management'
  | 'general-fluency'
  | 'exam-preparation'
  | 'other'

export type LearningContext =
  | 'work-email'
  | 'meetings'
  | 'small-talk'
  | 'presentations'
  | 'reading'
  | 'listening'
  | 'travel'
  | 'academic'

export type LearningIntensity = 'light' | 'standard' | 'intensive'

export interface UserLearningProfile {
  goal: LearningGoal
  contexts: LearningContext[]
  preferredThemes: string[]
  intensity: LearningIntensity
  targetFocusSize: number
  createdAt: string
  updatedAt: string
}

// ── Derived helpers ────────────────────────────────────────────────────────────

export const INTENSITY_CONFIG: Record<
  LearningIntensity,
  { label: string; emoji: string; detail: string; wordsPerDay: number; defaultFocus: number }
> = {
  light:     { label: 'Light',     emoji: '🌱', detail: '5 words/day — steady and sustainable',    wordsPerDay: 5,  defaultFocus: 50  },
  standard:  { label: 'Standard',  emoji: '🚀', detail: '10 words/day — balanced and effective',   wordsPerDay: 10, defaultFocus: 100 },
  intensive: { label: 'Intensive', emoji: '⚡', detail: '15 words/day — fast progress, more effort', wordsPerDay: 15, defaultFocus: 150 },
}

export const GOAL_LABELS: Record<LearningGoal, string> = {
  'work-communication': 'Work communication',
  'meetings':           'Meetings',
  'presentations':      'Presentations',
  'writing':            'Writing',
  'product-management': 'Product management',
  'general-fluency':    'General fluency',
  'exam-preparation':   'Exam preparation',
  'other':              'Other',
}
