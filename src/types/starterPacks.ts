import { ItemType } from './vocabulary'

// ── StarterPack data model ────────────────────────────────────────────────────

export interface StarterPackWord {
  term: string
  type: ItemType
  definitionEn: string
  partOfSpeech?: string
  exampleSentence?: string
  synonyms: string[]
  antonyms: string[]
  nuance?: string
  register?: 'formal' | 'neutral' | 'conversational'
  realLifeTask?: string
  tags: string[]
  themes: string[]
  translations?: { uk?: string; pl?: string; ru?: string }
}

export type PackDifficulty = 'B2' | 'C1' | 'Mixed'
export type PackCategory = 'Business' | 'Speaking' | 'Writing' | 'Grammar' | 'General'

/** Metadata only — served from index.json, no words loaded yet */
export interface StarterPackMeta {
  id: string
  title: string
  description: string
  emoji: string
  category: PackCategory
  difficulty: PackDifficulty
  wordCount: number
  estimatedTime: string   // e.g. "2 weeks", "3 sessions"
  theme: string           // theme name to auto-create on import
  isFeatured: boolean
}

/** Full pack — fetched on demand from /data/starter-packs/{id}.json */
export interface StarterPack extends StarterPackMeta {
  words: StarterPackWord[]
}
