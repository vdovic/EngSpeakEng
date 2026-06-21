/**
 * phraseGame.ts — Question generation for the Phrase Builder game.
 *
 * Three question types teach collocations from both directions:
 *   pick-collocation — given the word, pick which phrase uses it naturally
 *   find-the-word    — given a blanked phrase ("make a ___"), pick the word
 *   frame-to-word    — given a sentence frame, pick the word that fits
 *
 * Only uses words that have collocations or sentence frames — never runs on
 * words without phrase data. No AI calls at runtime.
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PhraseQuestionType = 'pick-collocation' | 'find-the-word' | 'frame-to-word'
export type PhraseScope        = 'focus' | 'full'

export const PHRASE_ROUND_COUNTS  = [10, 20, 30] as const
export type  PhraseRoundCount     = typeof PHRASE_ROUND_COUNTS[number]

export interface PhraseQuestion {
  type:         PhraseQuestionType
  itemId:       string
  term:         string
  partOfSpeech?: string
  definitionEn?: string
  /** Blanked collocation or sentence frame shown to the learner.
   *  Empty string for pick-collocation (term card is shown instead). */
  displayPhrase: string
  choices:       string[]
  correctIndex:  number
  /** The full correct collocation/frame — revealed after answering. */
  collocation:   string
}

export interface PhraseAttempt {
  itemId:      string
  term:        string
  type:        PhraseQuestionType
  collocation: string
  wasCorrect:  boolean
  givenAnswer: string
}

export interface PhraseGameResult {
  id:             string
  playedAt:       string
  roundCount:     number
  correct:        number
  wrong:          number
  accuracy:       number
  wordsPracticed: number
  scope:          PhraseScope
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

function containsTerm(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase())
}

/** Replace first occurrence of term with ___ (case-insensitive). */
export function blankTerm(text: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'i'), '___')
}

/** For the reveal card: replace ___ with the term in a frame. */
export function fillTerm(frame: string, term: string): string {
  return frame.replace('___', term)
}

/** Split text into [pre, termMatch, post] for bolding the term in a phrase. */
export function splitOnTerm(text: string, term: string): [string, string, string] {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match   = text.match(new RegExp(escaped, 'i'))
  if (!match || match.index === undefined) return [text, '', '']
  const start = match.index
  return [
    text.slice(0, start),
    text.slice(start, start + match[0].length),
    text.slice(start + match[0].length),
  ]
}

// ── Distractor pickers ─────────────────────────────────────────────────────────

function pickCollocationDistractors(
  item: VocabItem,
  pool: VocabItem[],
  exclude: string,
  n: number,
): string[] {
  const withColls = pool.filter(
    (i) => i.id !== item.id && (i.collocations?.length ?? 0) > 0,
  )
  const samePOS   = item.partOfSpeech
    ? withColls.filter((i) => i.partOfSpeech === item.partOfSpeech)
    : []
  const samePOSIds = new Set(samePOS.map((i) => i.id))
  const other      = withColls.filter((i) => !samePOSIds.has(i.id))

  const result: string[] = []
  for (const candidate of [...shuffle(samePOS), ...shuffle(other)]) {
    if (result.length >= n) break
    const picks = (candidate.collocations ?? []).filter(
      (c) => c.trim() && c !== exclude && !result.includes(c),
    )
    if (picks.length > 0) result.push(picks[Math.floor(Math.random() * picks.length)])
  }
  return result
}

function pickDistractorTerms(item: VocabItem, pool: VocabItem[], n: number): string[] {
  const samePOS = pool.filter(
    (i) => i.id !== item.id && i.partOfSpeech === item.partOfSpeech && i.term !== item.term,
  )
  const other = pool.filter(
    (i) => i.id !== item.id && i.partOfSpeech !== item.partOfSpeech && i.term !== item.term,
  )
  return [...shuffle(samePOS), ...shuffle(other)].slice(0, n).map((i) => i.term)
}

// ── Question generation ────────────────────────────────────────────────────────

function buildQuestion(item: VocabItem, pool: VocabItem[]): PhraseQuestion | null {
  const colls         = (item.collocations   ?? []).filter((c) => c.trim())
  const frames        = (item.sentenceFrames ?? []).filter((f) => f.trim())
  const blankableColls = colls.filter((c) => containsTerm(c, item.term))

  const available: PhraseQuestionType[] = []
  if (colls.length > 0)         available.push('pick-collocation')
  if (blankableColls.length > 0) available.push('find-the-word')
  if (frames.length > 0)        available.push('frame-to-word')
  if (available.length === 0)   return null

  const type = available[Math.floor(Math.random() * available.length)]

  if (type === 'pick-collocation') {
    const correct     = colls[Math.floor(Math.random() * colls.length)]
    const distractors = pickCollocationDistractors(item, pool, correct, 3)
    if (distractors.length < 2) return null
    const options = shuffle([correct, ...distractors])
    return {
      type, itemId: item.id, term: item.term,
      partOfSpeech: item.partOfSpeech, definitionEn: item.definitionEn,
      displayPhrase: '',
      choices: options, correctIndex: options.indexOf(correct), collocation: correct,
    }
  }

  if (type === 'find-the-word') {
    const coll   = blankableColls[Math.floor(Math.random() * blankableColls.length)]
    const blanked = blankTerm(coll, item.term)
    const distractors = pickDistractorTerms(item, pool, 3)
    if (distractors.length < 2) return null
    const options = shuffle([item.term, ...distractors])
    return {
      type, itemId: item.id, term: item.term,
      partOfSpeech: item.partOfSpeech, definitionEn: item.definitionEn,
      displayPhrase: blanked,
      choices: options, correctIndex: options.indexOf(item.term), collocation: coll,
    }
  }

  // frame-to-word
  const frame      = frames[Math.floor(Math.random() * frames.length)]
  const distractors = pickDistractorTerms(item, pool, 3)
  if (distractors.length < 2) return null
  const options = shuffle([item.term, ...distractors])
  return {
    type, itemId: item.id, term: item.term,
    partOfSpeech: item.partOfSpeech, definitionEn: item.definitionEn,
    displayPhrase: frame,
    choices: options, correctIndex: options.indexOf(item.term), collocation: frame,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function selectPhrasePool(items: VocabItem[], scope: PhraseScope): VocabItem[] {
  const base = items.filter(
    (i) =>
      !i.archived &&
      ((i.collocations?.length ?? 0) > 0 || (i.sentenceFrames?.length ?? 0) > 0),
  )
  if (scope === 'focus') {
    const focusItems = base.filter((i) => i.inFocus || i.weeklyFocus)
    return focusItems.length >= 4 ? focusItems : base
  }
  return base
}

export function countPhraseScope(items: VocabItem[], scope: PhraseScope): number {
  return selectPhrasePool(items, scope).length
}

/** Generate exactly `count` questions from pool, cycling if the pool is small. */
export function generatePhraseQuestions(
  pool: VocabItem[],
  count: number,
): PhraseQuestion[] {
  if (pool.length < 4) return []
  const shuffled  = shuffle(pool)
  const questions: PhraseQuestion[] = []
  let   poolIdx   = 0
  let   attempts  = 0
  const maxAttempts = count * 4

  while (questions.length < count && attempts < maxAttempts) {
    const item = shuffled[poolIdx % shuffled.length]
    poolIdx++
    attempts++
    const q = buildQuestion(item, pool)
    if (q) questions.push(q)
  }

  return questions
}
