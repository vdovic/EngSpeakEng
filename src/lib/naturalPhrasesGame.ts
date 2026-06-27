/**
 * naturalPhrasesGame.ts — question generation for Natural Phrases Sprint.
 *
 * Format: a target word is shown; four options show what naturally collocates
 * with it, with "…" marking where the target sits.
 *
 *   optionPosition === 'after'   → target comes first, option follows
 *     Term: "collate"    Options: "… data ✓"  "… machinery"  "… refusal"
 *
 *   optionPosition === 'before'  → option comes first, target follows
 *     Term: "decision"   Options: "make a …" ✓  "do a …"  "take a …"
 *
 * Pool sources (priority order):
 *   1. NATURAL_PHRASE_PAIRS static file — cross-library pairs (both words in
 *      library). Bidirectional: each pair auto-generates a reverse question.
 *   2. item.collocations[] runtime scan — single-library-word questions.
 *
 * Distractor strategy (no AI at runtime):
 *   'before' options → verb-swap / prep-swap on the collocating part
 *   'after'  options → pull options from other pool entries at same position
 *
 * Cross-library behaviour:
 *   When a correct answer involves a partner library word, both the anchor and
 *   the partner receive an exposure credit (CLAUDE.md: AI safety, no auto calls).
 */

import type { VocabItem } from '@/types/vocabulary'
import { NATURAL_PHRASE_PAIRS } from '@/data/naturalPhrasesData'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NaturalPhrasesScope    = 'focus' | 'full'
export type NaturalPhrasesDuration = 60 | 120 | 180

export const NATURAL_PHRASES_DURATIONS: NaturalPhrasesDuration[] = [60, 120, 180]

export const NATURAL_PHRASES_DURATION_LABELS: Record<NaturalPhrasesDuration, string> = {
  60:  '1 min',
  120: '2 min',
  180: '3 min',
}

/** Internal pool unit — one potential question source. */
export interface PoolEntry {
  itemId:           string
  term:             string
  partOfSpeech?:    string
  definitionEn?:    string
  /** The collocating part to show as an answer option. */
  option:           string
  position:         'before' | 'after'
  /** The full collocation phrase. */
  phrase:           string
  /** Set when the completing option contains another library word. */
  partnerItemId?:   string
  partnerTerm?:     string
  exampleSentence?: string
  isCrossLibrary:   boolean
}

export interface NaturalPhrasesQuestion {
  itemId:             string
  term:               string
  partOfSpeech?:      string
  definitionEn?:      string
  /** The full correct collocation — shown in feedback. */
  correctCollocation: string
  /** Where the TARGET appears relative to each choice option. */
  optionPosition:     'before' | 'after'
  /** The collocating part only — 4 items. */
  choices:            string[]
  correctIndex:       number
  /** Set when the correct answer involves another library word. */
  partnerItemId?:     string
  exampleSentence?:   string
  isCrossLibrary:     boolean
}

export interface NaturalPhrasesAttempt {
  itemId:             string
  term:               string
  correctCollocation: string
  correctOption:      string
  givenOption:        string
  wasCorrect:         boolean
  optionPosition:     'before' | 'after'
  isCrossLibrary:     boolean
  partnerItemId?:     string
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
  'find':    ['seek', 'get', 'discover'],
  'seek':    ['find', 'look', 'pursue'],
  'show':    ['express', 'demonstrate', 'display'],
  'feel':    ['show', 'express', 'have'],
  'express': ['show', 'demonstrate', 'feel'],
  'suffer':  ['endure', 'face', 'experience'],
  'endure':  ['suffer', 'face', 'withstand'],
  'exert':   ['apply', 'use', 'exercise'],
  'exude':   ['project', 'radiate', 'carry'],
  'project': ['exude', 'display', 'show'],
  'harbour': ['hold', 'bear', 'keep'],
  'bear':    ['hold', 'carry', 'have'],
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
 * Returns null when the term sits in the middle or is the whole string.
 */
export function parseCollocation(
  collocation: string,
  term: string,
): { option: string; position: 'before' | 'after' } | null {
  const lc  = collocation.toLowerCase().trim()
  const lcT = term.toLowerCase().trim()
  const idx = lc.indexOf(lcT)
  if (idx === -1) return null

  const before = collocation.slice(0, idx).trim()
  const after  = collocation.slice(idx + term.length).trim()

  if (before && !after)  return { option: before, position: 'before' }
  if (after  && !before) return { option: after,  position: 'after'  }
  return null
}

// ── Distractor builders ────────────────────────────────────────────────────────

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

function distractorsFromPool(
  entry:    PoolEntry,
  pool:     PoolEntry[],
  position: 'before' | 'after',
  exclude:  Set<string>,
  n:        number,
): string[] {
  const result: string[] = []
  for (const other of shuffle(pool.filter(e => e.itemId !== entry.itemId && e.position === position))) {
    if (result.length >= n) break
    const lc = other.option.toLowerCase()
    if (!exclude.has(lc)) {
      result.push(other.option)
      exclude.add(lc)
    }
  }
  return result
}

// ── Pool builder ───────────────────────────────────────────────────────────────

/**
 * Build the unified pool from static cross-library pairs + runtime collocations.
 *
 * Priority: static NATURAL_PHRASE_PAIRS first (cross-library when possible),
 * then item.collocations[] scan as fallback / supplement.
 * Bidirectional: each cross-library pair auto-generates a reverse question.
 */
export function buildPool(items: VocabItem[], scope: NaturalPhrasesScope): PoolEntry[] {
  // Index ALL non-archived items by term (lowercase) — for partner resolution
  const termToItem = new Map<string, VocabItem>()
  for (const item of items) {
    if (!item.archived) termToItem.set(item.term.toLowerCase(), item)
  }

  // Scope filter
  const scopeItems = items.filter(
    i => !i.archived && (scope === 'full' || i.inFocus || i.weeklyFocus),
  )
  const anchorTerms = new Map<string, VocabItem>()
  for (const item of scopeItems) {
    anchorTerms.set(item.term.toLowerCase(), item)
  }

  const entries: PoolEntry[] = []
  const seen = new Set<string>()  // dedup: `${itemId}::${phraseLower}`

  function addEntry(e: PoolEntry) {
    const key = `${e.itemId}::${e.phrase.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    entries.push(e)
  }

  // 1. Static pairs
  for (const pair of NATURAL_PHRASE_PAIRS) {
    const anchorItem = anchorTerms.get(pair.anchor.toLowerCase())
    if (!anchorItem) continue

    const partnerItem = pair.partnerTerm
      ? termToItem.get(pair.partnerTerm.toLowerCase())
      : undefined
    const isCrossLibrary = !!partnerItem

    addEntry({
      itemId:          anchorItem.id,
      term:            anchorItem.term,
      partOfSpeech:    anchorItem.partOfSpeech,
      definitionEn:    (anchorItem.definitionEn ?? (anchorItem as any).shortDefinition) as string | undefined,
      option:          pair.option,
      position:        pair.position,
      phrase:          pair.phrase,
      partnerItemId:   partnerItem?.id,
      partnerTerm:     pair.partnerTerm,
      exampleSentence: pair.exampleSentence ?? anchorItem.exampleSentence,
      isCrossLibrary,
    })

    // Bidirectional: auto-generate reverse if partnerTerm is also in scope
    if (isCrossLibrary && pair.partnerTerm) {
      const partnerInScope = anchorTerms.get(pair.partnerTerm.toLowerCase())
      if (partnerInScope) {
        const parsed = parseCollocation(pair.phrase, partnerInScope.term)
        if (parsed) {
          addEntry({
            itemId:          partnerInScope.id,
            term:            partnerInScope.term,
            partOfSpeech:    partnerInScope.partOfSpeech,
            definitionEn:    (partnerInScope.definitionEn ?? (partnerInScope as any).shortDefinition) as string | undefined,
            option:          parsed.option,
            position:        parsed.position,
            phrase:          pair.phrase,
            partnerItemId:   anchorItem.id,
            partnerTerm:     anchorItem.term,
            exampleSentence: pair.exampleSentence ?? partnerInScope.exampleSentence,
            isCrossLibrary:  true,
          })
        }
      }
    }
  }

  // 2. Runtime collocations[] scan — supplement items that appear in static pairs
  //    or add entries for items that have no static pairs at all
  for (const item of scopeItems) {
    for (const coll of item.collocations ?? []) {
      const parsed = parseCollocation(coll, item.term)
      if (!parsed) continue
      addEntry({
        itemId:          item.id,
        term:            item.term,
        partOfSpeech:    item.partOfSpeech,
        definitionEn:    (item.definitionEn ?? (item as any).shortDefinition) as string | undefined,
        option:          parsed.option,
        position:        parsed.position,
        phrase:          coll,
        exampleSentence: item.exampleSentence,
        isCrossLibrary:  false,
      })
    }
  }

  return entries
}

// ── Question builder ───────────────────────────────────────────────────────────

function buildQuestion(entry: PoolEntry, pool: PoolEntry[]): NaturalPhrasesQuestion | null {
  const { option, position } = entry
  const exclude = new Set([option.toLowerCase()])

  let distractors: string[] = []

  if (position === 'before') {
    distractors = beforeDistractorsFromSwap(option, 3)
    distractors.forEach(d => exclude.add(d.toLowerCase()))
  }

  if (distractors.length < 3) {
    const extra = distractorsFromPool(entry, pool, position, exclude, 3 - distractors.length)
    distractors = [...distractors, ...extra]
  }

  if (distractors.length < 2) return null

  const choices = shuffle([option, ...distractors.slice(0, 3)])
  return {
    itemId:             entry.itemId,
    term:               entry.term,
    partOfSpeech:       entry.partOfSpeech,
    definitionEn:       entry.definitionEn,
    correctCollocation: entry.phrase,
    optionPosition:     entry.position,
    choices,
    correctIndex:       choices.indexOf(option),
    partnerItemId:      entry.partnerItemId,
    exampleSentence:    entry.exampleSentence,
    isCrossLibrary:     entry.isCrossLibrary,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function countScope(items: VocabItem[], scope: NaturalPhrasesScope): number {
  const pool = buildPool(items, scope)
  return new Set(pool.map(e => e.itemId)).size
}

/**
 * Generate a batch of questions from a pool.
 * Cross-library entries are prioritised; single-library entries fill the rest.
 */
export function generateBatch(pool: PoolEntry[], batchSize: number): NaturalPhrasesQuestion[] {
  if (pool.length < 4) return []

  const crossLib  = shuffle(pool.filter(e => e.isCrossLibrary))
  const singleLib = shuffle(pool.filter(e => !e.isCrossLibrary))
  const ordered   = [...crossLib, ...singleLib]

  const questions: NaturalPhrasesQuestion[] = []
  let idx = 0
  const max = batchSize * 5

  while (questions.length < batchSize && idx < max) {
    const entry = ordered[idx % ordered.length]
    idx++
    const q = buildQuestion(entry, pool)
    if (q) questions.push(q)
  }

  return questions
}
