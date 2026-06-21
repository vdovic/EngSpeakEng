/**
 * naturalPhrasesGame.ts — question generation for Natural Phrases Sprint.
 *
 * One question type: show a word, pick which of the four phrases uses it naturally.
 * The three wrong options are deliberate learner-mistake distractors, not random
 * words from the library.  Distractor strategy (in priority order):
 *
 *   1. Verb swap  — if the collocation opens with a common confusable verb
 *      (make/do/take/have/give/…), replace it with similar verbs that learners
 *      habitually mix up: "make a decision" → "do a decision", "take a decision"
 *
 *   2. Prep swap  — if the collocation contains a preposition, swap it with
 *      adjacent prepositions learners frequently confuse:
 *      "rely on" → "rely to", "rely in", "rely at"
 *
 *   3. Fallback   — if neither verb nor prep swap yields enough options, fill
 *      remaining slots with collocations from other library items (same part of
 *      speech preferred, so they look plausible).
 *
 * No AI calls at runtime.  Pure deterministic / random logic only.
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NaturalPhrasesScope = 'focus' | 'full'

export const NATURAL_PHRASES_DURATIONS     = [60, 120, 180] as const
export type  NaturalPhrasesDuration        = typeof NATURAL_PHRASES_DURATIONS[number]
export const NATURAL_PHRASES_DURATION_LABELS: Record<NaturalPhrasesDuration, string> = {
  60:  '1 min',
  120: '2 min',
  180: '3 min',
}

export interface NaturalPhrasesQuestion {
  itemId:             string
  term:               string
  partOfSpeech?:      string
  definitionEn?:      string
  correctCollocation: string
  choices:            string[]   // always 4, shuffled
  correctIndex:       number
}

export interface NaturalPhrasesAttempt {
  itemId:             string
  term:               string
  correctCollocation: string
  givenAnswer:        string
  wasCorrect:         boolean
}

export interface NaturalPhrasesResult {
  id:             string
  playedAt:       string
  durationSecs:   number
  correct:        number
  wrong:          number
  accuracy:       number
  wordsPracticed: number
  scope:          NaturalPhrasesScope
}

// ── Distractor tables ──────────────────────────────────────────────────────────

// Verbs learners most commonly confuse in collocations (B2–C1 level)
const VERB_ALTERNATES: Record<string, string[]> = {
  'make':   ['do', 'take', 'have'],
  'do':     ['make', 'take', 'perform'],
  'take':   ['make', 'do', 'have'],
  'have':   ['make', 'do', 'take'],
  'give':   ['make', 'do', 'take'],
  'get':    ['take', 'make', 'have'],
  'pay':    ['make', 'give', 'do'],
  'hold':   ['keep', 'have', 'make'],
  'keep':   ['hold', 'maintain', 'have'],
  'run':    ['hold', 'make', 'do'],
  'reach':  ['make', 'get', 'come to'],
  'raise':  ['rise', 'lift', 'increase'],
  'bring':  ['take', 'carry', 'come with'],
  'put':    ['place', 'set', 'lay'],
  'set':    ['put', 'place', 'establish'],
  'draw':   ['pull', 'attract', 'make'],
  'pull':   ['draw', 'drag', 'push'],
  'carry':  ['bring', 'take', 'hold'],
  'place':  ['put', 'set', 'lay'],
  'build':  ['make', 'create', 'develop'],
  'create': ['make', 'build', 'produce'],
  'form':   ['make', 'create', 'build'],
  'cause':  ['make', 'lead to', 'bring'],
  'face':   ['deal with', 'handle', 'meet'],
  'meet':    ['face', 'achieve', 'get'],
  'achieve': ['reach', 'meet', 'gain'],
  'gain':   ['get', 'achieve', 'earn'],
  'lose':   ['miss', 'waste', 'drop'],
  'miss':   ['lose', 'skip', 'avoid'],
  'avoid':  ['prevent', 'miss', 'escape'],
}

// Prepositions learners most commonly confuse in collocations
const PREP_ALTERNATES: Record<string, string[]> = {
  'on':    ['in', 'at', 'to'],
  'in':    ['on', 'at', 'into'],
  'at':    ['in', 'on', 'to'],
  'to':    ['at', 'for', 'into'],
  'for':   ['to', 'on', 'in'],
  'with':  ['by', 'for', 'to'],
  'by':    ['with', 'from', 'through'],
  'from':  ['of', 'by', 'out of'],
  'of':    ['from', 'about', 'with'],
  'about': ['of', 'on', 'around'],
  'over':  ['about', 'above', 'across'],
  'under': ['below', 'beneath', 'in'],
  'into':  ['in', 'to', 'onto'],
  'upon':  ['on', 'at', 'to'],
  'out':   ['off', 'up', 'away'],
  'up':    ['out', 'off', 'away'],
  'down':  ['up', 'off', 'below'],
  'off':   ['out', 'up', 'away'],
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Distractor generation ──────────────────────────────────────────────────────

function tryVerbSwap(collocation: string, n: number): string[] {
  const words    = collocation.split(' ')
  const firstW   = words[0].toLowerCase()
  const alts     = VERB_ALTERNATES[firstW]
  if (!alts) return []
  const rest = words.slice(1).join(' ')
  return alts.slice(0, n).map((alt) => `${alt} ${rest}`)
}

function tryPrepSwap(collocation: string, n: number): string[] {
  const words   = collocation.split(' ')
  const results: string[] = []
  // Scan every position (not just last) but skip the opening word
  for (let i = 1; i < words.length; i++) {
    const alts = PREP_ALTERNATES[words[i].toLowerCase()]
    if (!alts) continue
    for (const alt of alts) {
      if (results.length >= n) break
      const swapped = [...words.slice(0, i), alt, ...words.slice(i + 1)].join(' ')
      if (swapped !== collocation && !results.includes(swapped)) {
        results.push(swapped)
      }
    }
    if (results.length > 0) break // one swap position is enough
  }
  return results
}

function fallbackDistractors(
  item:    VocabItem,
  pool:    VocabItem[],
  exclude: Set<string>,
  n:       number,
): string[] {
  const candidates = pool.filter(
    (i) => i.id !== item.id && (i.collocations?.length ?? 0) > 0,
  )
  const samePOS  = item.partOfSpeech
    ? candidates.filter((i) => i.partOfSpeech === item.partOfSpeech)
    : []
  const samePOSIds = new Set(samePOS.map((i) => i.id))
  const other    = candidates.filter((i) => !samePOSIds.has(i.id))

  const result: string[] = []
  for (const candidate of [...shuffle(samePOS), ...shuffle(other)]) {
    if (result.length >= n) break
    const picks = (candidate.collocations ?? []).filter(
      (c) => c.trim() && !exclude.has(c) && !result.includes(c),
    )
    if (picks.length > 0) {
      result.push(picks[Math.floor(Math.random() * picks.length)])
    }
  }
  return result
}

function buildDistractors(
  correct: string,
  item:    VocabItem,
  pool:    VocabItem[],
): string[] {
  const exclude = new Set<string>([correct])
  const result: string[] = []

  // 1. Verb swap
  for (const d of tryVerbSwap(correct, 3)) {
    if (!exclude.has(d)) { result.push(d); exclude.add(d) }
    if (result.length >= 3) return result
  }

  // 2. Prep swap
  for (const d of tryPrepSwap(correct, 3)) {
    if (!exclude.has(d)) { result.push(d); exclude.add(d) }
    if (result.length >= 3) return result
  }

  // 3. Fallback — other words' collocations
  for (const d of fallbackDistractors(item, pool, exclude, 3 - result.length)) {
    result.push(d); exclude.add(d)
    if (result.length >= 3) break
  }

  return result.slice(0, 3)
}

// ── Public question builder ────────────────────────────────────────────────────

function buildQuestion(
  item: VocabItem,
  pool: VocabItem[],
): NaturalPhrasesQuestion | null {
  const colls = (item.collocations ?? []).filter((c) => c.trim())
  if (colls.length === 0) return null

  const correct     = colls[Math.floor(Math.random() * colls.length)]
  const distractors = buildDistractors(correct, item, pool)
  if (distractors.length < 2) return null  // too few — skip this word

  // Pad to exactly 3 distractors if buildDistractors returned only 2
  const choices = shuffle([correct, ...distractors.slice(0, 3)])
  return {
    itemId:             item.id,
    term:               item.term,
    partOfSpeech:       item.partOfSpeech,
    definitionEn:       item.definitionEn ?? item.shortDefinition,
    correctCollocation: correct,
    choices,
    correctIndex:       choices.indexOf(correct),
  }
}

// ── Pool helpers ───────────────────────────────────────────────────────────────

export function selectPool(items: VocabItem[], scope: NaturalPhrasesScope): VocabItem[] {
  const base = items.filter(
    (i) => !i.archived && (i.collocations?.length ?? 0) > 0,
  )
  if (scope === 'focus') {
    const focused = base.filter((i) => i.inFocus || i.weeklyFocus)
    return focused.length >= 4 ? focused : base
  }
  return base
}

export function countScope(items: VocabItem[], scope: NaturalPhrasesScope): number {
  return selectPool(items, scope).length
}

/** Generate a fresh batch of questions, cycling the pool if it is small. */
export function generateBatch(pool: VocabItem[], batchSize: number): NaturalPhrasesQuestion[] {
  if (pool.length < 4) return []
  const shuffled  = shuffle(pool)
  const questions: NaturalPhrasesQuestion[] = []
  let   idx       = 0
  let   attempts  = 0
  const maxAttempts = batchSize * 4

  while (questions.length < batchSize && attempts < maxAttempts) {
    const item = shuffled[idx % shuffled.length]
    idx++
    attempts++
    const q = buildQuestion(item, pool)
    if (q) questions.push(q)
  }

  return questions
}
