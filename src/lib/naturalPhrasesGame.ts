/**
 * naturalPhrasesGame.ts — question generation for Natural Phrases Sprint.
 *
 * Format: a target word/phrase is shown; four options show what naturally
 * collocates with it, with "…" marking where the target sits.
 *
 *   optionPosition === 'after'   → target comes first, option follows
 *     Term: "collate"    Options: "… data ✓"  "… machinery"  "… refusal"  "… antique"
 *
 *   optionPosition === 'before'  → option comes first, target follows
 *     Term: "decision"   Options: "make a …" ✓  "do a …"  "take a …"  "have a …"
 *
 * Only words whose collocations[] field contains at least one phrase that can be
 * cleanly parsed (target at start or end, not buried in the middle) are included
 * in the pool — expected to be 30–500 words from a typical library.
 *
 * Distractor strategy (no AI at runtime):
 *   'before' options → verb-swap / prep-swap on the collocating part
 *   'after'  options → pull collocating parts from other library items at same position
 *   Fallback         → same-position parts from remaining pool items
 */

import type { VocabItem } from '@/types/vocabulary'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NaturalPhrasesScope    = 'focus' | 'full'
export type NaturalPhrasesDuration = 60 | 120 | 180

export const NATURAL_PHRASES_DURATIONS: NaturalPhrasesDuration[] = [60, 120, 180]

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
  /** The full correct collocation — shown as the correct answer after feedback. */
  correctCollocation: string
  /** Where the TARGET appears relative to each choice option.
   *  'after'  → target then option: "collate [___]"  choices shown as "… data"
   *  'before' → option then target: "[___] decision"  choices shown as "make a …" */
  optionPosition:     'before' | 'after'
  /** The collocating part only — NOT the full phrase. 4 items. */
  choices:            string[]
  correctIndex:       number
}

export interface NaturalPhrasesAttempt {
  itemId:             string
  term:               string
  correctCollocation: string
  correctOption:      string   // the collocating part of the correct answer
  givenOption:        string   // the collocating part the learner picked
  wasCorrect:         boolean
  optionPosition:     'before' | 'after'
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

// ── Confusion tables ───────────────────────────────────────────────────────────

const VERB_ALTERNATES: Record<string, string[]> = {
  'make':    ['do', 'take', 'have'],
  'do':      ['make', 'take', 'perform'],
  'take':    ['make', 'do', 'have'],
  'have':    ['make', 'do', 'take'],
  'give':    ['make', 'do', 'take'],
  'get':     ['take', 'make', 'have'],
  'pay':     ['make', 'give', 'do'],
  'hold':    ['keep', 'have', 'make'],
  'keep':    ['hold', 'maintain', 'have'],
  'run':     ['hold', 'make', 'do'],
  'reach':   ['make', 'get', 'achieve'],
  'raise':   ['rise', 'lift', 'increase'],
  'bring':   ['take', 'carry', 'fetch'],
  'put':     ['place', 'set', 'lay'],
  'set':     ['put', 'place', 'establish'],
  'draw':    ['pull', 'attract', 'make'],
  'pull':    ['draw', 'drag', 'push'],
  'carry':   ['bring', 'take', 'hold'],
  'build':   ['make', 'create', 'develop'],
  'create':  ['make', 'build', 'produce'],
  'form':    ['make', 'create', 'build'],
  'cause':   ['make', 'lead', 'bring'],
  'face':    ['handle', 'meet', 'deal'],
  'meet':    ['face', 'achieve', 'get'],
  'achieve': ['reach', 'meet', 'gain'],
  'gain':    ['get', 'achieve', 'earn'],
  'lose':    ['miss', 'waste', 'drop'],
  'miss':    ['lose', 'skip', 'avoid'],
  'avoid':   ['prevent', 'miss', 'escape'],
  'collect': ['gather', 'compile', 'assemble'],
  'gather':  ['collect', 'compile', 'bring'],
  'compile': ['gather', 'collect', 'create'],
}

const PREP_ALTERNATES: Record<string, string[]> = {
  'on':    ['in', 'at', 'to'],
  'in':    ['on', 'at', 'into'],
  'at':    ['in', 'on', 'to'],
  'to':    ['at', 'for', 'into'],
  'for':   ['to', 'on', 'in'],
  'with':  ['by', 'for', 'to'],
  'by':    ['with', 'from', 'through'],
  'from':  ['of', 'by', 'out'],
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

// ── Collocation parser ─────────────────────────────────────────────────────────

/**
 * Extract the collocating part (option) and its position from a full collocation.
 *
 * Returns null when the target sits in the middle (e.g. "heavily rely on")
 * or is the whole string.
 */
export function parseCollocation(
  collocation: string,
  term: string,
): { option: string; position: 'before' | 'after' } | null {
  const lc    = collocation.toLowerCase().trim()
  const lcT   = term.toLowerCase().trim()
  const idx   = lc.indexOf(lcT)
  if (idx === -1) return null

  const before = collocation.slice(0, idx).trim()
  const after  = collocation.slice(idx + term.length).trim()

  if (before && !after)  return { option: before, position: 'before' }
  if (after  && !before) return { option: after,  position: 'after'  }
  return null  // term in middle or is the full string
}

// ── Distractor builders ────────────────────────────────────────────────────────

/** For 'before' options: swap the opening verb or preposition. */
function beforeDistractorsFromSwap(option: string, n: number): string[] {
  const words  = option.split(' ')
  const first  = words[0].toLowerCase()
  const rest   = words.slice(1).join(' ')
  const result: string[] = []

  for (const table of [VERB_ALTERNATES, PREP_ALTERNATES]) {
    const alts = table[first]
    if (!alts) continue
    for (const alt of alts) {
      if (result.length >= n) break
      const d = rest ? `${alt} ${rest}` : alt
      if (!result.includes(d)) result.push(d)
    }
    if (result.length >= n) break
  }

  return result.slice(0, n)
}

/** For any position: pull collocating parts from other pool items at the same position. */
function distractorsFromPool(
  item:     VocabItem,
  pool:     VocabItem[],
  position: 'before' | 'after',
  exclude:  Set<string>,
  n:        number,
): string[] {
  const result: string[] = []
  for (const other of shuffle(pool.filter(i => i.id !== item.id))) {
    if (result.length >= n) break
    for (const coll of shuffle(other.collocations ?? [])) {
      const parsed = parseCollocation(coll, other.term)
      if (!parsed || parsed.position !== position) continue
      if (!exclude.has(parsed.option)) {
        result.push(parsed.option)
        exclude.add(parsed.option)
        break
      }
    }
  }
  return result
}

// ── Question builder ───────────────────────────────────────────────────────────

function buildQuestion(item: VocabItem, pool: VocabItem[]): NaturalPhrasesQuestion | null {
  // Collect all parseable collocations for this item
  const valid = (item.collocations ?? [])
    .map(coll => {
      const p = parseCollocation(coll, item.term)
      return p ? { collocation: coll, option: p.option, position: p.position } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (valid.length === 0) return null

  const { collocation, option, position } = valid[Math.floor(Math.random() * valid.length)]
  const exclude = new Set([option])

  // Build distractors
  let distractors: string[] = []

  if (position === 'before') {
    // Try verb/prep swap first
    distractors = beforeDistractorsFromSwap(option, 3)
    distractors.forEach(d => exclude.add(d))
  }

  // Fill remaining from pool (works for both positions)
  if (distractors.length < 3) {
    const extra = distractorsFromPool(item, pool, position, exclude, 3 - distractors.length)
    distractors = [...distractors, ...extra]
  }

  if (distractors.length < 2) return null

  const choices = shuffle([option, ...distractors.slice(0, 3)])
  return {
    itemId:             item.id,
    term:               item.term,
    partOfSpeech:       item.partOfSpeech,
    definitionEn:       (item.definitionEn ?? (item as any).shortDefinition) as string | undefined,
    correctCollocation: collocation,
    optionPosition:     position,
    choices,
    correctIndex:       choices.indexOf(option),
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Items with at least one cleanly parseable collocation. */
export function selectPool(items: VocabItem[], scope: NaturalPhrasesScope): VocabItem[] {
  const base = items.filter(
    i => !i.archived &&
      (i.collocations ?? []).some(c => parseCollocation(c, i.term) !== null),
  )
  if (scope === 'focus') {
    const focused = base.filter(i => i.inFocus || i.weeklyFocus)
    return focused.length >= 4 ? focused : base
  }
  return base
}

export function countScope(items: VocabItem[], scope: NaturalPhrasesScope): number {
  return selectPool(items, scope).length
}

export function generateBatch(pool: VocabItem[], batchSize: number): NaturalPhrasesQuestion[] {
  if (pool.length < 4) return []
  const shuffled = shuffle(pool)
  const questions: NaturalPhrasesQuestion[] = []
  let idx = 0, attempts = 0
  const max = batchSize * 4

  while (questions.length < batchSize && attempts < max) {
    const item = shuffled[idx % shuffled.length]
    idx++; attempts++
    const q = buildQuestion(item, pool)
    if (q) questions.push(q)
  }

  return questions
}
