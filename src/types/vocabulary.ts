export type ItemType = 'word' | 'phrase' | 'chunk'

export type ItemStatus = 'inbox' | 'learning' | 'stable' | 'activation' | 'mastered'

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
  archived: boolean
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
