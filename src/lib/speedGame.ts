/**
 * speedGame.ts — Pure logic for the Speed Practice game
 *
 * Responsibilities:
 *   • Select eligible vocabulary items from the library
 *   • Generate randomised multiple-choice questions from existing word data
 *   • Define durations and session types — no React, no side effects
 *
 * Progress rule:
 *   Correct answers contribute one exposure increment per word per session.
 *   This is enforced by the caller (SpeedGamePage) via a per-session Set —
 *   the second correct answer for the same word only updates the session
 *   score, never calls recordExposure again.
 *
 * CLAUDE.md compliance:
 *   • No AI calls — questions are built from existing word data only
 *   • No recognition-only questions ("Do you know this word?")
 *   • No points/XP stored persistently — session counts only
 *   • MAX_EXPOSURE cap respected via canGainExposure()
 */

import type { VocabItem } from '@/types/vocabulary'
import { MAX_EXPOSURE } from '@/lib/constants'

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
  focusOnly:      boolean
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
  | 'fill-blank'        // sentence with word removed → pick the word from 4 choices
  | 'definition-to-term' // definition shown → pick the correct term
  | 'term-to-definition' // term shown → pick the correct definition
  | 'synonym-to-term'    // synonym shown → pick the matching term

export interface SpeedQuestion {
  /** The word this question is about */
  itemId: string
  term:   string
  type:   SpeedQuestionType
  /** Main prompt shown to the learner */
  prompt: string
  /** Exactly 4 choices (always) */
  choices: string[]
  /** Index into choices[] that is correct */
  correctIndex: number
}

// ── Word eligibility ───────────────────────────────────────────────────────────

/**
 * A word is eligible for the speed game if:
 *   • Not archived
 *   • Not mastered (mastered words have graduated from active practice)
 *   • Has a definition (required for question generation)
 */
export function isEligible(item: VocabItem): boolean {
  return (
    !item.archived &&
    item.status !== 'mastered' &&
    Boolean(item.definitionEn?.trim())
  )
}

/**
 * True when calling recordExposure(id, true) would advance the exposure count.
 * Words already at MAX_EXPOSURE (8) are still playable for reinforcement,
 * but there is nothing to advance — the caller should skip recordExposure.
 */
export function canGainExposure(item: VocabItem): boolean {
  return (item.exposureCount ?? 0) < MAX_EXPOSURE
}

/**
 * Select and shuffle words for a speed game session.
 *
 * @param focusOnly  When true, restrict to focus words (inFocus / weeklyFocus).
 *                   Falls back to the full eligible pool if focus yields < 4 items
 *                   so question generation (which needs 3 distractors) never fails.
 *
 * Priority order when focusOnly = false:
 *   1. Focus words first
 *   2. Rest of eligible library
 *
 * Returns up to `maxPool` items; caller re-uses pool when questions run out.
 */
export function selectPool(
  items:     VocabItem[],
  maxPool    = 80,
  focusOnly  = false,
): VocabItem[] {
  const eligible = items.filter(isEligible)
  const focus    = eligible.filter((i) => i.inFocus || i.weeklyFocus)

  if (focusOnly) {
    // Need at least 4 items for distractor generation; silently widen if not met
    const pool = focus.length >= 4 ? focus : eligible
    return shuffle(pool).slice(0, maxPool)
  }

  const rest = eligible.filter((i) => !i.inFocus && !i.weeklyFocus)
  const pool = [...shuffle(focus), ...shuffle(rest)].slice(0, maxPool)
  return pool.length > 0 ? pool : shuffle(eligible).slice(0, maxPool)
}

/**
 * Count how many focus words are eligible for the speed game.
 * Used by the setup screen to show availability and enable/disable the toggle.
 */
export function countFocusPool(items: VocabItem[]): number {
  return items.filter((i) => isEligible(i) && (i.inFocus || i.weeklyFocus)).length
}

// ── Question generation ────────────────────────────────────────────────────────

/**
 * Generate a single question for `item` using distractor items from `pool`.
 *
 * Returns null when the item lacks the data needed for any question type
 * (shouldn't happen since eligibility requires definitionEn, but guards exist).
 */
export function generateQuestion(
  item:  VocabItem,
  pool:  VocabItem[],
): SpeedQuestion | null {
  // Build the ordered list of types to try, best first
  const types = preferredTypes(item)

  // Shuffle so all eligible question types get used across many calls,
  // keeping variety high rather than always returning the first type.
  for (const type of shuffle(types)) {
    const q = tryBuildQuestion(type, item, pool)
    if (q) return q
  }
  return null
}

/**
 * Build a sequence of questions from the pool, cycling through items randomly.
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
    // Safety: if pool is too small to generate enough questions, stop
    if (idx > count * 3) break
  }

  return questions
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function preferredTypes(item: VocabItem): SpeedQuestionType[] {
  const types: SpeedQuestionType[] = []

  // fill-blank is the most engaging — requires contextual placement
  if (item.exampleSentence || item.workSentence) {
    types.push('fill-blank')
  }

  // definition-to-term: requires active recall of the word itself
  if (item.definitionEn) {
    types.push('definition-to-term')
  }

  // synonym-to-term: semantic understanding
  if ((item.synonyms?.length ?? 0) > 0) {
    types.push('synonym-to-term')
  }

  // term-to-definition: comprehension, lower bar — use as fallback
  if (item.definitionEn) {
    types.push('term-to-definition')
  }

  return types
}

function tryBuildQuestion(
  type: SpeedQuestionType,
  item: VocabItem,
  pool: VocabItem[],
): SpeedQuestion | null {
  switch (type) {
    case 'fill-blank':        return buildFillBlank(item, pool)
    case 'definition-to-term': return buildDefinitionToTerm(item, pool)
    case 'synonym-to-term':   return buildSynonymToTerm(item, pool)
    case 'term-to-definition': return buildTermToDefinition(item, pool)
  }
}

/** "Complete the sentence: She tried to ___ with her colleagues." */
function buildFillBlank(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  const sentence = item.exampleSentence || item.workSentence
  if (!sentence) return null

  // Replace the term in the sentence with a blank (case-insensitive)
  const re = new RegExp(`\\b${escapeRegex(item.term)}\\b`, 'i')
  if (!re.test(sentence)) return null

  const prompt = sentence.replace(re, '___')

  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null

  return makeQuestion(
    item,
    'fill-blank',
    `Complete the sentence:\n"${prompt}"`,
    [item.term, ...distractors.map((d) => d.term)],
  )
}

/** "Which word means: [definition]?" */
function buildDefinitionToTerm(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  if (!item.definitionEn) return null

  const definition = truncate(item.definitionEn, 120)
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null

  return makeQuestion(
    item,
    'definition-to-term',
    `Which word matches this meaning?\n"${definition}"`,
    [item.term, ...distractors.map((d) => d.term)],
  )
}

/** "What does [term] mean?" */
function buildTermToDefinition(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  if (!item.definitionEn) return null

  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null

  const correctDef = truncate(item.definitionEn, 100)
  const wrongDefs  = distractors.map((d) => truncate(d.definitionEn!, 100))

  return makeQuestion(
    item,
    'term-to-definition',
    `What does "${item.term}" mean?`,
    [correctDef, ...wrongDefs],
  )
}

/** "Which word is synonymous with [synonym]?" */
function buildSynonymToTerm(item: VocabItem, pool: VocabItem[]): SpeedQuestion | null {
  const synonyms = item.synonyms?.filter((s) => s.trim().length > 0)
  if (!synonyms || synonyms.length === 0) return null

  const syn = synonyms[Math.floor(Math.random() * synonyms.length)]
  const distractors = pickDistractors(item, pool, 3, (d) => !!d.definitionEn)
  if (distractors.length < 3) return null

  return makeQuestion(
    item,
    'synonym-to-term',
    `Which word is synonymous with "${syn}"?`,
    [item.term, ...distractors.map((d) => d.term)],
  )
}

/**
 * Construct a SpeedQuestion with shuffled choices and a resolved correctIndex.
 * `rawChoices[0]` must always be the correct answer before shuffling.
 */
function makeQuestion(
  item:       VocabItem,
  type:       SpeedQuestionType,
  prompt:     string,
  rawChoices: string[],    // rawChoices[0] = correct answer
): SpeedQuestion {
  const shuffled = shuffleIndexed(rawChoices)
  return {
    itemId:       item.id,
    term:         item.term,
    type,
    prompt,
    choices:      shuffled.items,
    correctIndex: shuffled.originalFirstIndex,
  }
}

/** Pick `n` distractors from the pool — not the target item, with an optional filter. */
function pickDistractors(
  target:  VocabItem,
  pool:    VocabItem[],
  n:       number,
  filter?: (item: VocabItem) => boolean,
): VocabItem[] {
  const candidates = pool.filter(
    (i) => i.id !== target.id && (!filter || filter(i)),
  )
  return shuffle(candidates).slice(0, n)
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

/** Shuffle an array and report where index 0 ended up (for correctIndex). */
function shuffleIndexed<T>(arr: T[]): { items: T[]; originalFirstIndex: number } {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  // Find where the original first element landed
  const originalFirstIndex = copy.indexOf(arr[0])
  return { items: copy, originalFirstIndex }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
