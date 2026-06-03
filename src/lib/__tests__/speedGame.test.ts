/**
 * speedGame.test.ts
 *
 * Covers:
 *   1. Word eligibility and pool selection
 *   2. Question generation — one question per type
 *   3. Session cap: recordExposure called at most once per word per session
 *   4. Progress ceiling: canGainExposure respects MAX_EXPOSURE (8)
 *   5. End-game summary calculations
 *   6. Batch generation size and variety
 *   7. Edge cases: pool too small, missing data fields
 */

import { describe, it, expect } from 'vitest'
import {
  isEligible,
  canGainExposure,
  selectPool,
  generateQuestion,
  generateBatch,
  shuffle,
  SPEED_GAME_DURATIONS,
  SPEED_GAME_DURATION_LABELS,
} from '../speedGame'
import type { VocabItem } from '@/types/vocabulary'
import { MAX_EXPOSURE } from '@/lib/constants'

// ── Fixture factory ────────────────────────────────────────────────────────────

let _idCounter = 1

function makeItem(overrides: Partial<VocabItem> & { term: string }): VocabItem {
  return {
    id:           String(_idCounter++),
    type:         'word',
    status:       'learning',
    createdAt:    '2024-01-01T00:00:00.000Z',
    updatedAt:    '2024-01-01T00:00:00.000Z',
    tags:         [],
    themes:       [],
    synonyms:     [],
    antonyms:     [],
    collocations: [],
    sentenceFrames: [],
    relatedPhrases: [],
    weeklyFocus:  false,
    inFocus:      false,
    archived:     false,
    exposureCount: 0,
    review: {
      reviewCount:       0,
      successfulRecalls: 0,
      ease:              2.5,
      intervalDays:      0,
      sentenceProduced:  false,
    },
    activation: {
      usageLogs:      [],
      usageCount:     0,
      requiredUses:   3,
      confidenceLevel: 0,
    },
    ...overrides,
  }
}

/** Build a minimum pool of 4 items with definition so distractors are available. */
function makePool(extras: Partial<VocabItem>[] = []): VocabItem[] {
  return [
    makeItem({ term: 'mitigate',    definitionEn: 'To lessen the severity of something.' }),
    makeItem({ term: 'vernacular',  definitionEn: 'The everyday language of a region.' }),
    makeItem({ term: 'alleviate',   definitionEn: 'To make suffering less severe.' }),
    makeItem({ term: 'meticulous',  definitionEn: 'Showing great attention to detail.' }),
    ...extras.map((o) => makeItem(o as Partial<VocabItem> & { term: string })),
  ]
}

// ── 1. Eligibility ─────────────────────────────────────────────────────────────

describe('isEligible', () => {
  it('accepts a normal learning word with a definition', () => {
    const item = makeItem({ term: 'mitigate', definitionEn: 'To lessen severity.' })
    expect(isEligible(item)).toBe(true)
  })

  it('rejects archived items', () => {
    const item = makeItem({ term: 'mitigate', definitionEn: 'x', archived: true })
    expect(isEligible(item)).toBe(false)
  })

  it('rejects mastered items', () => {
    const item = makeItem({ term: 'mitigate', definitionEn: 'x', status: 'mastered' })
    expect(isEligible(item)).toBe(false)
  })

  it('rejects items without a definition', () => {
    const item = makeItem({ term: 'mitigate' })
    expect(isEligible(item)).toBe(false)
  })

  it('rejects items with a blank definition', () => {
    const item = makeItem({ term: 'mitigate', definitionEn: '   ' })
    expect(isEligible(item)).toBe(false)
  })
})

// ── 2. Progress ceiling ────────────────────────────────────────────────────────

describe('canGainExposure', () => {
  it('returns true when exposure < MAX_EXPOSURE', () => {
    const item = makeItem({ term: 'x', definitionEn: 'x', exposureCount: 7 })
    expect(canGainExposure(item)).toBe(true)
  })

  it('returns false when exposure === MAX_EXPOSURE', () => {
    const item = makeItem({ term: 'x', definitionEn: 'x', exposureCount: MAX_EXPOSURE })
    expect(canGainExposure(item)).toBe(false)
  })

  it('returns false when exposure > MAX_EXPOSURE (defensive)', () => {
    const item = makeItem({ term: 'x', definitionEn: 'x', exposureCount: 10 })
    expect(canGainExposure(item)).toBe(false)
  })

  it('handles undefined exposureCount as 0', () => {
    const item = makeItem({ term: 'x', definitionEn: 'x' })
    delete (item as Partial<VocabItem>).exposureCount
    expect(canGainExposure(item)).toBe(true)
  })
})

// ── 3. Pool selection ──────────────────────────────────────────────────────────

describe('selectPool', () => {
  it('returns only eligible items', () => {
    const items = [
      makeItem({ term: 'a', definitionEn: 'x', archived: true }),
      makeItem({ term: 'b', definitionEn: 'x', status: 'mastered' }),
      makeItem({ term: 'c', definitionEn: 'valid word' }),
    ]
    const pool = selectPool(items)
    expect(pool).toHaveLength(1)
    expect(pool[0].term).toBe('c')
  })

  it('puts focus words before non-focus words', () => {
    const items = [
      makeItem({ term: 'non-focus-1', definitionEn: 'x' }),
      makeItem({ term: 'non-focus-2', definitionEn: 'x' }),
      makeItem({ term: 'focus-word',  definitionEn: 'x', inFocus: true }),
    ]
    const pool = selectPool(items, 10)
    // Focus word must appear before both non-focus words
    const focusIdx    = pool.findIndex((i) => i.term === 'focus-word')
    const nonFocusIdx = pool.findIndex((i) => i.term.startsWith('non-focus'))
    expect(focusIdx).toBeLessThan(nonFocusIdx)
  })

  it('respects maxPool cap', () => {
    const items = Array.from({ length: 100 }, (_, i) =>
      makeItem({ term: `word${i}`, definitionEn: 'x' }),
    )
    const pool = selectPool(items, 30)
    expect(pool.length).toBeLessThanOrEqual(30)
  })

  it('returns empty array when no eligible items exist', () => {
    const items = [makeItem({ term: 'a', definitionEn: '', archived: true })]
    expect(selectPool(items)).toHaveLength(0)
  })
})

// ── 4. Question generation ─────────────────────────────────────────────────────

describe('generateQuestion', () => {
  it('returns null when pool has fewer than 4 items', () => {
    const pool = [makeItem({ term: 'only', definitionEn: 'sole item' })]
    const q = generateQuestion(pool[0], pool)
    // Only one item — can't pick 3 distractors
    expect(q).toBeNull()
  })

  it('returns a question with exactly 4 choices', () => {
    const pool = makePool()
    const q = generateQuestion(pool[0], pool)
    expect(q).not.toBeNull()
    expect(q!.choices).toHaveLength(4)
  })

  it('correctIndex always points to the correct answer', () => {
    const pool = makePool()
    // Run many times to account for shuffling
    for (let i = 0; i < 20; i++) {
      const item = pool[0]
      const q = generateQuestion(item, pool)
      expect(q).not.toBeNull()
      // For definition-to-term: choices[correctIndex] should be the term
      if (q!.type === 'definition-to-term' || q!.type === 'fill-blank' || q!.type === 'synonym-to-term') {
        expect(q!.choices[q!.correctIndex]).toBe(item.term)
      }
      if (q!.type === 'term-to-definition') {
        // choices[correctIndex] should be a prefix/truncation of the definition
        expect(item.definitionEn!.startsWith(
          q!.choices[q!.correctIndex].replace('…', ''),
        ) || q!.choices[q!.correctIndex] === item.definitionEn).toBe(true)
      }
    }
  })

  it('generates fill-blank question when exampleSentence contains the term', () => {
    const pool = makePool()
    const item = makeItem({
      term:            'knuckle down',
      definitionEn:    'To start working hard.',
      exampleSentence: 'It was time to knuckle down and finish the report.',
    })
    pool.push(item)

    let foundFillBlank = false
    for (let i = 0; i < 30; i++) {
      const q = generateQuestion(item, pool)
      if (q?.type === 'fill-blank') { foundFillBlank = true; break }
    }
    expect(foundFillBlank).toBe(true)
  })

  it('fill-blank prompt contains ___ placeholder', () => {
    const pool = makePool()
    const item = makeItem({
      term:            'knuckle down',
      definitionEn:    'To start working hard.',
      exampleSentence: 'It was time to knuckle down and finish the report.',
    })
    pool.push(item)

    for (let i = 0; i < 30; i++) {
      const q = generateQuestion(item, pool)
      if (q?.type === 'fill-blank') {
        expect(q.prompt).toContain('___')
        break
      }
    }
  })

  it('generates synonym-to-term when synonyms exist', () => {
    const pool = makePool()
    const item = makeItem({
      term:         'astute',
      definitionEn: 'Clever and quick to notice things.',
      synonyms:     ['shrewd', 'perceptive'],
    })
    pool.push(item)

    let found = false
    for (let i = 0; i < 30; i++) {
      const q = generateQuestion(item, pool)
      if (q?.type === 'synonym-to-term') { found = true; break }
    }
    expect(found).toBe(true)
  })

  it('falls back to definition-to-term when no sentence or synonym data', () => {
    const pool = makePool()
    const item = makeItem({
      term:         'recalcitrant',
      definitionEn: 'Stubbornly resistant to authority.',
      // no exampleSentence, no synonyms
    })
    pool.push(item)

    const q = generateQuestion(item, pool)
    expect(q).not.toBeNull()
    expect(['definition-to-term', 'term-to-definition']).toContain(q!.type)
  })

  it('all choices are unique strings', () => {
    const pool = makePool()
    for (let i = 0; i < 10; i++) {
      const q = generateQuestion(pool[0], pool)
      if (!q) continue
      const unique = new Set(q.choices)
      expect(unique.size).toBe(4)
    }
  })
})

// ── 5. Batch generation ────────────────────────────────────────────────────────

describe('generateBatch', () => {
  it('returns the requested count when pool is large enough', () => {
    const pool = makePool(
      Array.from({ length: 10 }, (_, i) => ({
        term: `word${i}`,
        definitionEn: `Definition ${i}`,
      })),
    )
    const batch = generateBatch(pool, 20)
    expect(batch.length).toBe(20)
  })

  it('returns empty array for empty pool', () => {
    expect(generateBatch([], 10)).toHaveLength(0)
  })

  it('generates at least 1 question even with a minimal pool', () => {
    const pool = makePool()   // exactly 4 items — enough for 1 distractor set
    const batch = generateBatch(pool, 1)
    expect(batch.length).toBeGreaterThanOrEqual(1)
  })
})

// ── 6. Session cap logic (per-session Set) ─────────────────────────────────────
//
// The actual enforcement lives in SpeedGamePage (React state), but we can
// test the invariant here: each word should gain exposure at most once.

describe('session cap invariant', () => {
  it('simulates per-word cap: second correct answer does not call recordExposure', () => {
    const pool  = makePool()
    const target = pool[0]

    // Simulate the session Set
    const wordsGainedExposure = new Set<string>()
    let recordExposureCalls = 0

    function onCorrect(itemId: string) {
      if (!wordsGainedExposure.has(itemId)) {
        wordsGainedExposure.add(itemId)
        recordExposureCalls++
      }
      // score update always happens — not tracked here
    }

    // First correct answer → recordExposure fires
    onCorrect(target.id)
    expect(recordExposureCalls).toBe(1)

    // Second correct answer for the same word → no additional call
    onCorrect(target.id)
    expect(recordExposureCalls).toBe(1)

    // Different word → fires
    onCorrect(pool[1].id)
    expect(recordExposureCalls).toBe(2)
  })

  it('words at MAX_EXPOSURE do not gain more exposure', () => {
    const maxedItem = makeItem({
      term: 'maxed',
      definitionEn: 'Already fully drilled.',
      exposureCount: MAX_EXPOSURE,
    })
    expect(canGainExposure(maxedItem)).toBe(false)
    // Caller checks canGainExposure() before calling recordExposure
  })
})

// ── 7. End-game summary ────────────────────────────────────────────────────────

describe('end-game summary calculations', () => {
  it('calculates accuracy correctly', () => {
    const correct = 14
    const wrong   = 7
    const total   = correct + wrong
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    expect(accuracy).toBe(67)
  })

  it('handles zero attempts without division by zero', () => {
    const correct = 0
    const wrong   = 0
    const total   = correct + wrong
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    expect(accuracy).toBe(0)
  })

  it('100% accuracy when all correct', () => {
    const correct = 10
    const wrong   = 0
    const total   = correct + wrong
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    expect(accuracy).toBe(100)
  })
})

// ── 8. Duration constants ──────────────────────────────────────────────────────

describe('SPEED_GAME_DURATIONS', () => {
  it('contains exactly 5 durations', () => {
    expect(SPEED_GAME_DURATIONS).toHaveLength(5)
  })

  it('each duration has a label', () => {
    for (const d of SPEED_GAME_DURATIONS) {
      expect(SPEED_GAME_DURATION_LABELS[d]).toBeTruthy()
    }
  })

  it('durations are in ascending order', () => {
    for (let i = 1; i < SPEED_GAME_DURATIONS.length; i++) {
      expect(SPEED_GAME_DURATIONS[i]).toBeGreaterThan(SPEED_GAME_DURATIONS[i - 1])
    }
  })
})

// ── 9. shuffle utility ────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    shuffle(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})
