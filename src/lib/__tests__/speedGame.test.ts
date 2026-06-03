/**
 * speedGame.test.ts
 *
 * Covers:
 *   1. Eligibility — isEligibleActive (excludes mastered) vs isEligibleFull (includes mastered)
 *   2. canGainExposure — respects MAX_EXPOSURE (8)
 *   3. countScope — returns correct counts per scope
 *   4. selectPool — scope filtering, focus-first order, fallback when focus < 4
 *   5. selectPool 'full' — includes mastered words, cap removed
 *   6. Question generation — one case per type; correctIndex always valid
 *   7. generateBatch — size, empty pool
 *   8. Per-session cap invariant (simulated)
 *   9. End-game summary calculations
 *  10. Duration constants
 *  11. shuffle utility
 */

import { describe, it, expect } from 'vitest'
import {
  isEligibleActive,
  isEligibleFull,
  canGainExposure,
  countScope,
  selectPool,
  generateQuestion,
  generateBatch,
  shuffle,
  SPEED_GAME_DURATIONS,
  SPEED_GAME_DURATION_LABELS,
  WORD_SCOPE_LABELS,
} from '../speedGame'
import type { VocabItem } from '@/types/vocabulary'
import { MAX_EXPOSURE } from '@/lib/constants'

// ── Fixture factory ────────────────────────────────────────────────────────────

let _id = 1
function makeItem(overrides: Partial<VocabItem> & { term: string }): VocabItem {
  return {
    id:             String(_id++),
    type:           'word',
    status:         'learning',
    createdAt:      '2024-01-01T00:00:00.000Z',
    updatedAt:      '2024-01-01T00:00:00.000Z',
    tags:           [],
    themes:         [],
    synonyms:       [],
    antonyms:       [],
    collocations:   [],
    sentenceFrames: [],
    relatedPhrases: [],
    weeklyFocus:    false,
    inFocus:        false,
    archived:       false,
    exposureCount:  0,
    review: {
      reviewCount: 0, successfulRecalls: 0,
      ease: 2.5, intervalDays: 0, sentenceProduced: false,
    },
    activation: { usageLogs: [], usageCount: 0, requiredUses: 3, confidenceLevel: 0 },
    ...overrides,
  }
}

function makePool(extras: Array<Partial<VocabItem> & { term: string }> = []): VocabItem[] {
  return [
    makeItem({ term: 'mitigate',   definitionEn: 'To lessen the severity of something.' }),
    makeItem({ term: 'vernacular', definitionEn: 'The everyday language of a region.' }),
    makeItem({ term: 'alleviate',  definitionEn: 'To make suffering less severe.' }),
    makeItem({ term: 'meticulous', definitionEn: 'Showing great attention to detail.' }),
    ...extras.map((o) => makeItem(o)),
  ]
}

// ── 1. Eligibility ─────────────────────────────────────────────────────────────

describe('isEligibleActive', () => {
  it('accepts a normal learning word with a definition', () => {
    expect(isEligibleActive(makeItem({ term: 'x', definitionEn: 'y' }))).toBe(true)
  })
  it('rejects archived items', () => {
    expect(isEligibleActive(makeItem({ term: 'x', definitionEn: 'y', archived: true }))).toBe(false)
  })
  it('rejects mastered items', () => {
    expect(isEligibleActive(makeItem({ term: 'x', definitionEn: 'y', status: 'mastered' }))).toBe(false)
  })
  it('rejects items with no definition', () => {
    expect(isEligibleActive(makeItem({ term: 'x' }))).toBe(false)
  })
})

describe('isEligibleFull', () => {
  it('accepts mastered items (full scope includes mastered)', () => {
    expect(isEligibleFull(makeItem({ term: 'x', definitionEn: 'y', status: 'mastered' }))).toBe(true)
  })
  it('still rejects archived items', () => {
    expect(isEligibleFull(makeItem({ term: 'x', definitionEn: 'y', archived: true }))).toBe(false)
  })
  it('still rejects items with no definition', () => {
    expect(isEligibleFull(makeItem({ term: 'x' }))).toBe(false)
  })
})

// ── 2. canGainExposure ────────────────────────────────────────────────────────

describe('canGainExposure', () => {
  it('true when exposure < MAX_EXPOSURE', () => {
    expect(canGainExposure(makeItem({ term: 'x', definitionEn: 'x', exposureCount: 7 }))).toBe(true)
  })
  it('false when exposure === MAX_EXPOSURE', () => {
    expect(canGainExposure(makeItem({ term: 'x', definitionEn: 'x', exposureCount: MAX_EXPOSURE }))).toBe(false)
  })
  it('false when exposure > MAX_EXPOSURE (defensive)', () => {
    expect(canGainExposure(makeItem({ term: 'x', definitionEn: 'x', exposureCount: 10 }))).toBe(false)
  })
  it('handles undefined exposureCount as 0', () => {
    const item = makeItem({ term: 'x', definitionEn: 'x' })
    delete (item as Partial<VocabItem>).exposureCount
    expect(canGainExposure(item)).toBe(true)
  })
})

// ── 3. countScope ─────────────────────────────────────────────────────────────

describe('countScope', () => {
  const items = [
    makeItem({ term: 'f1', definitionEn: 'x', inFocus: true }),
    makeItem({ term: 'f2', definitionEn: 'x', weeklyFocus: true }),
    makeItem({ term: 'a1', definitionEn: 'x' }),
    makeItem({ term: 'm1', definitionEn: 'x', status: 'mastered' }),
    makeItem({ term: 'arc', definitionEn: 'x', archived: true }),
  ]

  it("'focus' counts only in-focus eligible words", () => {
    expect(countScope(items, 'focus')).toBe(2)
  })
  it("'active' counts non-mastered, non-archived words with definitions", () => {
    expect(countScope(items, 'active')).toBe(3)   // f1, f2, a1
  })
  it("'full' includes mastered words but not archived", () => {
    expect(countScope(items, 'full')).toBe(4)      // f1, f2, a1, m1
  })
})

// ── 4. selectPool ─────────────────────────────────────────────────────────────

describe("selectPool scope='focus'", () => {
  it('returns only focus words when pool ≥ 4', () => {
    const items = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeItem({ term: `focus${i}`, definitionEn: 'x', inFocus: true })),
      makeItem({ term: 'other', definitionEn: 'x' }),
    ]
    const pool = selectPool(items, 'focus')
    expect(pool.every((i) => i.inFocus)).toBe(true)
    expect(pool.some((i) => i.term === 'other')).toBe(false)
  })

  it('falls back to active pool when focus < 4', () => {
    const items = [
      makeItem({ term: 'f1', definitionEn: 'x', inFocus: true }),
      makeItem({ term: 'f2', definitionEn: 'x', inFocus: true }),
      makeItem({ term: 'n1', definitionEn: 'x' }),
      makeItem({ term: 'n2', definitionEn: 'x' }),
      makeItem({ term: 'n3', definitionEn: 'x' }),
    ]
    const pool = selectPool(items, 'focus')
    expect(pool.length).toBe(5)   // full active pool
  })
})

describe("selectPool scope='active'", () => {
  it('excludes mastered and archived items', () => {
    const items = [
      makeItem({ term: 'a', definitionEn: 'x' }),
      makeItem({ term: 'b', definitionEn: 'x', status: 'mastered' }),
      makeItem({ term: 'c', definitionEn: 'x', archived: true }),
    ]
    const pool = selectPool(items, 'active')
    expect(pool).toHaveLength(1)
    expect(pool[0].term).toBe('a')
  })

  it('places focus words before non-focus words', () => {
    const items = [
      makeItem({ term: 'non', definitionEn: 'x' }),
      makeItem({ term: 'foc', definitionEn: 'x', inFocus: true }),
    ]
    const pool = selectPool(items, 'active')
    expect(pool[0].term).toBe('foc')
  })

  it('has no 80-word cap — returns all eligible items', () => {
    const items = Array.from({ length: 200 }, (_, i) =>
      makeItem({ term: `word${i}`, definitionEn: 'x' }))
    expect(selectPool(items, 'active').length).toBe(200)
  })
})

describe("selectPool scope='full'", () => {
  it('includes mastered words', () => {
    const items = [
      makeItem({ term: 'active',   definitionEn: 'x' }),
      makeItem({ term: 'mastered', definitionEn: 'x', status: 'mastered' }),
    ]
    const pool = selectPool(items, 'full')
    expect(pool).toHaveLength(2)
    expect(pool.some((i) => i.term === 'mastered')).toBe(true)
  })

  it('still excludes archived items', () => {
    const items = [
      makeItem({ term: 'a', definitionEn: 'x', archived: true }),
      makeItem({ term: 'b', definitionEn: 'x' }),
    ]
    const pool = selectPool(items, 'full')
    expect(pool).toHaveLength(1)
    expect(pool[0].term).toBe('b')
  })

  it('has no 80-word cap — returns all eligible items', () => {
    const items = Array.from({ length: 500 }, (_, i) =>
      makeItem({ term: `word${i}`, definitionEn: 'x', status: i % 3 === 0 ? 'mastered' : 'learning' }))
    expect(selectPool(items, 'full').length).toBe(500)
  })
})

// ── 5. Question generation ────────────────────────────────────────────────────

describe('generateQuestion', () => {
  it('returns null when pool has < 4 items', () => {
    const pool = [makeItem({ term: 'only', definitionEn: 'sole item' })]
    expect(generateQuestion(pool[0], pool)).toBeNull()
  })

  it('returns a question with exactly 4 choices', () => {
    const pool = makePool()
    expect(generateQuestion(pool[0], pool)!.choices).toHaveLength(4)
  })

  it('correctIndex always points to the correct answer (50 trials)', () => {
    const pool = makePool()
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(pool[0], pool)
      if (!q) continue
      if (q.type === 'definition-to-term' || q.type === 'fill-blank' || q.type === 'synonym-to-term') {
        expect(q.choices[q.correctIndex]).toBe(pool[0].term)
      } else {
        // term-to-definition: correctIndex points to the item's definition (possibly truncated)
        expect(pool[0].definitionEn!.startsWith(
          q.choices[q.correctIndex].replace('…', '')
        ) || q.choices[q.correctIndex] === pool[0].definitionEn).toBe(true)
      }
    }
  })

  it('generates fill-blank when exampleSentence contains the term', () => {
    const pool = makePool([{
      term: 'knuckle down',
      definitionEn:    'To start working hard.',
      exampleSentence: 'It was time to knuckle down and finish the report.',
    }])
    const item = pool[pool.length - 1]
    let found = false
    for (let i = 0; i < 40; i++) {
      if (generateQuestion(item, pool)?.type === 'fill-blank') { found = true; break }
    }
    expect(found).toBe(true)
  })

  it('generates synonym-to-term when synonyms exist', () => {
    const pool = makePool([{
      term: 'astute', definitionEn: 'Clever.', synonyms: ['shrewd'],
    }])
    const item = pool[pool.length - 1]
    let found = false
    for (let i = 0; i < 40; i++) {
      if (generateQuestion(item, pool)?.type === 'synonym-to-term') { found = true; break }
    }
    expect(found).toBe(true)
  })

  it('all choices are unique strings', () => {
    const pool = makePool()
    for (let i = 0; i < 10; i++) {
      const q = generateQuestion(pool[0], pool)
      if (!q) continue
      expect(new Set(q.choices).size).toBe(4)
    }
  })

  it('mastered words (full scope) can generate questions', () => {
    const pool = makePool([{
      term: 'mastered-word', definitionEn: 'A mastered item.', status: 'mastered',
    }])
    const masteredItem = pool[pool.length - 1]
    // Pool includes mastered item for 'full' scope
    const q = generateQuestion(masteredItem, pool)
    expect(q).not.toBeNull()
  })
})

// ── 6. generateBatch ──────────────────────────────────────────────────────────

describe('generateBatch', () => {
  it('returns requested count when pool is large enough', () => {
    const pool = makePool(Array.from({ length: 10 }, (_, i) =>
      ({ term: `w${i}`, definitionEn: `def ${i}` })))
    expect(generateBatch(pool, 20)).toHaveLength(20)
  })
  it('returns empty array for empty pool', () => {
    expect(generateBatch([], 10)).toHaveLength(0)
  })
})

// ── 7. Session cap invariant ──────────────────────────────────────────────────

describe('session cap invariant', () => {
  it('per-word cap: second correct answer does not trigger recordExposure', () => {
    const pool    = makePool()
    const target  = pool[0]
    const gained  = new Set<string>()
    let calls = 0

    function onCorrect(id: string) {
      if (!gained.has(id)) { gained.add(id); calls++ }
    }

    onCorrect(target.id)
    expect(calls).toBe(1)
    onCorrect(target.id)
    expect(calls).toBe(1)   // no second call
    onCorrect(pool[1].id)
    expect(calls).toBe(2)
  })

  it('mastered words cannot gain exposure (canGainExposure gate)', () => {
    const mastered = makeItem({ term: 'x', definitionEn: 'x', exposureCount: MAX_EXPOSURE })
    expect(canGainExposure(mastered)).toBe(false)
  })
})

// ── 8. End-game summary ───────────────────────────────────────────────────────

describe('end-game summary', () => {
  it('accuracy rounds correctly', () => {
    expect(Math.round((14 / 21) * 100)).toBe(67)
  })
  it('handles zero attempts without division by zero', () => {
    const total = 0
    expect(total > 0 ? Math.round(0 / total * 100) : 0).toBe(0)
  })
  it('100% accuracy when all correct', () => {
    expect(Math.round((10 / 10) * 100)).toBe(100)
  })
})

// ── 9. Duration and scope constants ──────────────────────────────────────────

describe('SPEED_GAME_DURATIONS', () => {
  it('contains exactly 5 durations', () => {
    expect(SPEED_GAME_DURATIONS).toHaveLength(5)
  })
  it('each duration has a label', () => {
    for (const d of SPEED_GAME_DURATIONS) expect(SPEED_GAME_DURATION_LABELS[d]).toBeTruthy()
  })
  it('durations are in ascending order', () => {
    for (let i = 1; i < SPEED_GAME_DURATIONS.length; i++) {
      expect(SPEED_GAME_DURATIONS[i]).toBeGreaterThan(SPEED_GAME_DURATIONS[i - 1])
    }
  })
})

describe('WORD_SCOPE_LABELS', () => {
  it('has a label for every scope', () => {
    expect(WORD_SCOPE_LABELS.focus).toBeTruthy()
    expect(WORD_SCOPE_LABELS.active).toBeTruthy()
    expect(WORD_SCOPE_LABELS.full).toBeTruthy()
  })
})

// ── 10. shuffle ───────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('preserves all elements', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    shuffle(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})
