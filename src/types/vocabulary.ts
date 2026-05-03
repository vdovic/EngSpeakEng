export type ItemType = 'word' | 'phrase' | 'chunk'

export type ItemStatus = 'inbox' | 'learning' | 'stable' | 'activation' | 'mastered'

/**
 * New 4-point learning level.
 *   0 = new       — never exposed
 *   1 = learning  — 1–2 exposures
 *   2 = familiar  — 3–7 exposures
 *   3 = mastered  — 8 exposures + sentence produced
 *
 * Stored alongside the legacy `status` field during the transition period.
 */
export type Level = 0 | 1 | 2 | 3

export type SourceType =
  | 'article'
  | 'podcast'
  | 'movie'
  | 'meeting'
  | 'email'
  | 'book'
  | 'other'

export type UsageChannel = 'speaking' | 'writing'

export type ReviewOutcome = 'again' | 'hard' | 'good' | 'easy'

export interface UsageLog {
  id: string
  usedAt: string
  channel: UsageChannel
  note?: string
  sentence?: string
}

export interface ReviewData {
  lastReviewedAt?: string
  nextReviewAt?: string
  intervalDays: number
  ease: number
  reviewCount: number
  successfulRecalls: number
  sentenceProduced: boolean
}

export interface ActivationData {
  requiredUses: number
  usageCount: number
  usageLogs: UsageLog[]
}

export interface VocabItem {
  id: string
  term: string
  type: ItemType
  status: ItemStatus
  createdAt: string
  updatedAt: string

  sourceType?: SourceType
  sourceText?: string
  tags: string[]
  themes: string[]

  definitionEn?: string
  translations?: {
    uk?: string
    pl?: string
    ru?: string
  }

  exampleSentence?: string
  workSentence?: string
  mySentence?: string

  synonyms: string[]
  antonyms: string[]
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  commonMistakes?: string

  collocations: string[]
  sentenceFrames: string[]
  relatedPhrases: string[]

  etymology?: string
  memoryCue?: string

  review: ReviewData
  activation: ActivationData

  weeklyFocus: boolean
  /** ISO timestamp when the item was added to Focus This Week */
  focusAddedAt?: string
  /** Computed priority score — higher = kept longer on weekly reset */
  focusPriority?: number
  archived: boolean

  // ── Phase-1 new fields (added alongside legacy fields for compatibility) ───

  /** 4-point learning level derived from exposureCount + sentence production. */
  level?: Level

  /**
   * "My Current Focus" flag — supersedes weeklyFocus.
   * Both are written together during the transition; prefer inFocus in new code.
   */
  inFocus?: boolean

  /** Learner-specific difficulty score, 0–100 (higher = harder for this user). */
  difficultyScore?: number

  /** ISO timestamp of the most recent Daily Challenge exposure. */
  lastExposureAt?: string

  // ── AI enrichment ──────────────────────────────────────────────────────────
  // Set by addItem() and updated by enrichItem() in the store.
  // undefined = seed data (pre-populated, no generation needed)
  // 'pending'  = generation in progress
  // 'complete' = generation succeeded
  // 'failed'   = generation failed (see generationError)
  generationStatus?: 'pending' | 'complete' | 'failed'
  generationError?: string
  // Returned by the API alongside definitionEn and synonyms, etc.
  partOfSpeech?: string
  realLifeTask?: string

  // ── Daily Challenge SRS ─────────────────────────────────────────────────────
  // exposureCount tracks progress through 8 challenge steps (0 = new, 8 = mastered via challenge).
  // nextChallengeDate is set after each challenge exercise; undefined means due immediately.
  exposureCount?: number       // 0–8; undefined treated as 0
  nextChallengeDate?: string   // ISO datetime; undefined = due now

  // ── Related words (within the app's own vocabulary) ──────────────────────
  relatedEntries?: RelatedEntry[]
  relatedEntriesStatus?: 'pending' | 'complete' | 'failed'
  /** AI-suggested words not yet in the library that are worth adding */
  relatedSuggestions?: RelatedSuggestion[]
}

// ── Related words ─────────────────────────────────────────────────────────────

export type RelationshipType =
  | 'meaning'
  | 'usage_context'
  | 'nuance'
  | 'etymology'
  | 'word_family'
  | 'similar_form'
  | 'confusable'

export type RelationshipDirection =
  | 'synonym'
  | 'contrast'
  | 'same_family'
  | 'soundalike'
  | 'same_context'
  | 'confusable'

export interface RelatedEntry {
  id: string
  term: string
  relationshipType: RelationshipType
  direction?: RelationshipDirection
  /** 1 = weak, 2 = moderate, 3 = strong */
  strength: 1 | 2 | 3
  explanation: string
}

/** A related word that the learner does NOT yet have in their library */
export interface RelatedSuggestion {
  term: string
  type: ItemType
  relationshipType: RelationshipType
  direction?: RelationshipDirection
  /** One-line plain-English definition to show in the graph card */
  definitionHint: string
  explanation: string
}

export type VocabItemDraft = Pick<VocabItem, 'term' | 'type'> &
  Partial<
    Pick<
      VocabItem,
      | 'sourceType'
      | 'sourceText'
      | 'tags'
      | 'definitionEn'
      | 'status'
    >
  >

// ── Gamification ─────────────────────────────────────────────────────────────

export type BadgeId =
  | 'first-step'
  | 'on-a-roll'
  | 'week-warrior'
  | 'century'
  | 'grand-scholar'
  | 'early-bird'
  | 'diligent'

export interface Badge {
  id: BadgeId
  label: string
  description: string
  emoji: string
  unlockedAt?: string // ISO datetime
}

export type ExerciseType =
  | 'fill-blank'
  | 'multiple-choice'
  | 'synonym-match'
  | 'sentence-create'

/**
 * Phase-3 challenge types — drive which challenge component is shown and
 * how the attempt is recorded.  Escalates with exposureCount:
 *   0–1  → recognition / definition-choice
 *   2–4  → fill-gap / definition-choice
 *   5–7  → sentence-production
 *   8    → real-life-use-check (or sentence-production if not yet produced)
 */
export type ChallengeType =
  | 'recognition'
  | 'definition-choice'
  | 'fill-gap'
  | 'sentence-production'
  | 'real-life-use-check'

export interface ExerciseResult {
  itemId: string
  /** Supports both legacy ExerciseType and new ChallengeType values. */
  exerciseType: ExerciseType | ChallengeType
  points: number      // 0, 5, or 10
  userAnswer: string
  correct: boolean    // false for partial-credit sentence-production
  /** The correct answer to show in the feedback overlay when the user was wrong. */
  correctAnswer?: string
}

// ── Legacy stats ──────────────────────────────────────────────────────────────

export interface WeeklyStats {
  dueToday: number
  inboxCount: number
  inActivation: number
  masteredTotal: number
  weakItems: number
  usesLoggedThisWeek: number
  activatedThisWeek: number
  streak: number
  reviewedToday: number
}
