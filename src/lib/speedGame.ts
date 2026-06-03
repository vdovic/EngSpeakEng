/**
 * speedGame.ts — Pure logic for the Speed Practice game
 *
 * Responsibilities:
 *   • Select eligible vocabulary items by scope (focus / active / full)
 *   • Generate randomised multiple-choice questions from existing word data
 *   • Define durations, scopes, and result types — no React, no side effects
 *
 * Word scope model:
 *   'focus'  — words in My Current Focus (inFocus / weeklyFocus) — 20–50 words
 *   'active' — all words currently in training (inbox → activate) — ~100–200 words
 *   'full'   — entire library including mastered words — 1000+ words
 *
 * Progress rule:
 *   Correct answers call recordExposure(id, true) at most once per word per session.
 *   Enforced by the caller (SpeedGamePage) via a per-session Set.
 *   canGainExposure() gates the call — mastered/maxed words are not advanced.
 *
 * CLAUDE.md compliance:
 *   • No AI calls — questions are built from existing word data only
 *   • No recognition-only questions ("Do you know this word?")
 *   • No points/XP stored persistently — session counts only
 *   • MAX_EXPOSURE cap respected via canGainExposure()
 */

import type { VocabItem } from '@/types/vocabulary'
import { MAX_EXPOSURE } from '@/lib/constants'

// ── Word scope ─────────────────────────────────────────────────────────────────

/**
 * The set of words the speed game draws from in a given session.
 *
 *   focus  — words currently in My Current Focus (inFocus / weeklyFocus)
 *   active — all words being actively learned (not mastered, not archived)
 *   full   — entire library including mastered words (good for general review)
 */
export type WordScope = 'focus' | 'active' | 'full'

export const WORD_SCOPE_LABELS: Record<WordScope, string> = {
  focus:  'Focus',
  active: 'Active learning',
  full:   'Everything',
}

// ── Result record ─────────────────────────────────────────────────────────────

/**
 * A single completed speed game session.
 * Stored in speedGameStore and included in Drive sync exports.
 * Never stores a "score" label — just objective counts.
 */
export interface SpeedGameResult {
  /** Stable unique ID (crypto.randomUUID). */
  id:             string
  /** ISO timestamp of when the game ended. */
  playedAt:       string
  durationSecs:   number
  correct:        number
  wrong:          number
  /** 0–100 integer, pre-computed to avoid division in display. */
  accuracy:       number
  wordsPracticed: number
  /** Words that received a recordExposure(true) call this session. */
  wordsGained:    number
  /** Word pool scope used for this session. */
  scope:          WordScope
  /**
   * @deprecated  Use scope instead.
   * Kept for backward compatibility with results saved before the scope field
   * was introduced.  New results never set this.
   */
  focusOnly?:     boolean
}

// ── Durations ──────────────────────────────────────────────────────────────────

export const SPEED_GAME_DURATIONS = [60, 180, 300, 420, 600] as const
export type SpeedGameDuration = (typeof SPEED_GAME_DURATIONS)[number]

export const SPEED_GAME_DURATION_LABELS: Record<SpeedGameDuration, string> = {
  60:  '1 min',
  180: '3 min',
  300: '5 min',
  420: '7 min',
  600: '10 min',
}

// ── Question types ─────────────────────────────────────────────────────────────
//
// All types require active retrieval — no "do you recognise this word?" allowed.

export type SpeedQuestionType =
  | 'fill-blank'         // sentence with word removed → pick the word from 4 choices
  | 'definition-to-term' // definition shown → pick the correct term
  | 'term-to-definition' // term shown → pick the correct definition
  | 'synonym-to-term'    // synonym shown → pick the matching term

export interface SpeedQuestion {
  itemId:      string
  term:        string
  type:        SpeedQuestionType
  prompt:      string
  choices:     string[]
  correctIndex: number
}

// ── Eligibility ────────────────────────────────────────────────────────────────

/**
 * Eligible for 'active' scope: not archived, not mastered, has a definition.
 * This is the baseline requirement for any meaningful question.
 */
export function isEligibleActive(item: VocabItem): boolean {
  return (
    !item.archived &&
    item.status !== 'mastered' &&
    Boolean(item.definitionEn?.trim())
  )
}

/**
 * Eligible for 'full' scope: not archived, has a definition.
 * Mastered words are included — good for general vocabulary review.
 * The game does not advance their exposure (canGainExposure returns false).
 */
export function isEligibleFull(item: VocabItem): boolean {
  return !item.archived && Boolean(item.definitionEn?.trim())
}

/** @deprecated Use isEligibleActive. Kept for any external callers. */
export const isEligible = isEligibleActive

/**
 * True when calling recordExposure(id, true) would advance the exposure count.
 * Words at MAX_EXPOSURE (8) are still playable for reinforcement,
 * but recordExposure should be skipped — there is nothing to advance.
 */
export function canGainExposure(item: VocabItem): boolean {
  return (item.exposureCount ?? 0) < MAX_EXPOSURE
}

// ── Pool selection ─────────────────────────────────────────────────────────────

/**
 * Return the word count for a given scope — used by the setup screen
 * to show availability next to each scope button.
 */
export function countScope(items: VocabItem[], scope: WordScope): number {
  switch (scope) {
    case 'focus':
      return items.filter((i) => isEligibleActive(i) && (i.inFocus || i.weeklyFocus)).length
    case 'active':
      return items.filter(isEligibleActive).length
    case 'full':
      return items.filter(isEligibleFull).length
  }
}

/**
 * Select and shuffle words for a speed game session.
 *
 * No upper cap — returns the full eligible set for the chosen scope so the
 * game can cycle through the entire library in long sessions.
 *
 * Focus words are sorted first in the 'active' scope so they appear more
 * often in the early question batches before the pool is shuffled for refills.
 *
 * Falls back to a wider scope when the requested scope yields < 4 items
 * (distractor generation requires at least 4 candidates).
 */
export function selectPool(items: VocabItem[], scope: WordScope = 'active'): VocabItem[] {
  switch (scope) {
    case 'focus': {
      const focus = items.filter((i) => isEligibleActive(i) && (i.inFocus || i.weeklyFocus))
      // Need ≥ 4 for distractor generation; widen to active if not met
      if (focus.length >= 4) return shuffle(focus)
      return shuffle(items.filter(isEligibleActive))
    }
    case 'active': {
      const eligible = items.filter(isEligibleActive)
      // Focus words first — they appear in early batches before pool reshuffles
      const focus = eligible.filter((i) => i.inFocus || i.weeklyFocus)
      const rest  = eligible.filter((i) => !i.inFocus && !i.weeklyFocus)
      return [...shuffle(focus), ...shuffle(rest)]
    }
    case 'full': {
      return shuffle(items.filter(isEligibleFull))
    }
  }
}

/**
 * Count how many focus words are eligible.
 * @deprecated Use countScope(items, 'focus').
 */
export function countFocusPool(items: VocabItem[]): number {
  return countScope(items, 'focus')
}

// ── Question generation ────────────────────────────────────────────────────────

/**
 * Generate a single question for `item` using distractors from `pool`.
 * Returns null when the item lacks sufficient data for any question type.
 */
export function generateQuestion(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  const types = preferredTypes(item)
  // Shuffle so all eligible types appear across repeated calls
  for (const type of shuffle(types)) {
    const q = tryBuildQuestion(type, item, pool)
    if (q) return q
  }
  return null
}

/**
 * Build a sequence of questions from the pool, cycling randomly.
 * Suitable for pre-generating a batch at game start.
 */
export function generateBatch(pool: VocabItem[], count: number): SpeedQuestion[] {
  if (pool.length === 0) return []

  const questions: SpeedQuestion[] = []
  const shuffledPool = shuffle(pool)
  let idx = 0

  while (questions.length < count) {
    const item = shuffledPool[idx % shuffledPool.length]
    idx++
    const q = generateQuestion(item, pool)
    if (q) questions.push(q)
    if (idx > count * 3) break  // safety: prevent infinite loop on tiny pools
  }

  return questions
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function preferredTypes(item: VocabItem): SpeedQuestionType[] {
  const types: SpeedQuestionType[] = []
  if (item.exampleSentence || item.workSentence) types.push('fill-blank')
  if (item.definitionEn)                         types.push('definition-to-term')
  if ((item.synonyms?.length ?? 0) > 0)          types.push('synonym-to-term')
  if (item.definitionEn)                         types.push('term-to-definition')
  return types
}

function tryBuildQuestion(
  type: SpeedQuestionType,
  item: VocabItem,
  pool: VocabItem[],
): SpeedQuestion | null {
  switch (type) {
    case 'fill-blank':          return buildFillBlank(item, pool)
    case 'definition-to-term':  return buildDefinitionToTerm(item, pool)
    case 'synonym-to-term':     return buildSynonymToTerm(item, pool)
    case 'term-to-definition':  return buildTermToDefinition(item, pool)
  }
}

function buildFillBlank(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  const sentence = item.exampleSentence || item.workSentence
  if (!sentence) return null
  const re = new RegExp(`\\b${escapeRegex(item.term)}\\b`, 'i')
  if (!re.test(sentence)) return null
  const prompt      = sentence.replace(re, '___')
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null
  return makeQuestion(item, 'fill-blank', `Complete the sentence:\n"${prompt}"`,
    [item.term, ...distractors.map((d) => d.term)])
}

function buildDefinitionToTerm(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  if (!item.definitionEn) return null
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null
  return makeQuestion(item, 'definition-to-term',
    `Which word matches this meaning?\n"${truncate(item.definitionEn, 120)}"`,
    [item.term, ...distractors.map((d) => d.term)])
}

function buildTermToDefinition(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  if (!item.definitionEn) return null
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null
  return makeQuestion(item, 'term-to-definition',
    `What does "${item.term}" mean?`,
    [item.definitionEn, ...distractors.map((d) => d.definitionEn!)].map((d) => truncate(d, 100)))
}

function buildSynonymToTerm(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  const synonyms = item.synonyms?.filter((s) => s.trim().length > 0)
  if (!synonyms?.length) return null
  const syn = synonyms[Math.floor(Math.random() * synonyms.length)]
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null
  return makeQuestion(item, 'synonym-to-term',
    `Which word is synonymous with "${syn}"?`,
    [item.term, ...distractors.map((d) => d.term)])
}

function makeQuestion(
  item:       VocabItem,
  type:       SpeedQuestionType,
  prompt:     string,
  rawChoices: string[],   // rawChoices[0] = correct answer
): SpeedQuestion {
  const shuffled = shuffleIndexed(rawChoices)
  return { itemId: item.id, term: item.term, type, prompt, choices: shuffled.items, correctIndex: shuffled.originalFirstIndex }
}

function pickDistractors(
  target: VocabItem,
  pool:   VocabItem[],
  n:      number,
  filter?: (item: VocabItem) => boolean,
): VocabItem[] {
  return shuffle(pool.filter((i) => i.id !== target.id && (!filter || filter(i)))).slice(0, n)
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function shuffleIndexed<T>(arr: T[]): { items: T[]; originalFirstIndex: number } {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return { items: copy, originalFirstIndex: copy.indexOf(arr[0]) }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
