/**
 * Unit tests for activationLogic.ts
 *
 * Tests cover:
 *   - getActivationWords: Tier A selection (activate stage)
 *   - getActivationWords: Tier B selection (high-exposure / passive-only)
 *   - getActivationWords: exclusion rules (archived, mastered)
 *   - getActivationWords: sort priority (focus > phrase > exposure)
 *   - getActivationWords: cap at MAX_ACTIVATION_WORDS
 *   - getActivationWords: Tier A takes precedence over Tier B
 *   - hasActivationWords: boolean helper
 *   - getActivationExample: sentence preference order
 */

import { describe, it, expect } from 'vitest'
import {
  getActivationWords,
  hasActivationWords,
  getActivationExample,
  MAX_ACTIVATION_WORDS,
} from '@/lib/activationLogic'
import type { VocabItem, ActivationData, ReviewData } from '@/types/vocabulary'

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeReview(overrides: Partial<ReviewData> = {}): ReviewData {
  return {
    intervalDays:      1,
    ease:              2.5,
    reviewCount:       0,
    successfulRecalls: 0,
    sentenceProduced:  false,
    ...overrides,
  }
}

function makeActivation(overrides: Partial<ActivationData> = {}): ActivationData {
  return {
    requiredUses:   3,
    usageCount:     0,
    usageLogs:      [],
    confidenceLevel: 0,
    ...overrides,
  }
}

let _idCounter = 0
function makeItem(overrides: Partial<VocabItem> = {}): VocabItem {
  _idCounter++
  return {
    id:             `item-${_idCounter}`,
    term:           `word-${_idCounter}`,
    type:           'word',
    status:         'learning',
    createdAt:      '2024-01-01T00:00:00Z',
    updatedAt:      '2024-01-01T00:00:00Z',
    tags:           [],
    themes:         [],
    synonyms:       [],
    antonyms:       [],
    collocations:   [],
    sentenceFrames: [],
    relatedPhrases: [],
    weeklyFocus:    false,
    archived:       false,
    exposureCount:  0,
    review:         makeReview(),
    activation:     makeActivation(),
    ...overrides,
  } as VocabItem
}

/** An item at "activate" stage: exp=8, no activation evidence. */
function makeActivateItem(overrides: Partial<VocabItem> = {}): VocabItem {
  return makeItem({
    status:        'activation',
    exposureCount: 8,
    review:        makeReview({ sentenceProduced: false }),
    activation:    makeActivation({ usageCount: 0, confidenceLevel: 0, usageLogs: [] }),
    ...overrides,
  })
}

/** An item at "high-exposure passive-only" state: exp=5, zero usage logs. */
function makeHighExposureItem(overrides: Partial<VocabItem> = {}): VocabItem {
  return makeItem({
    status:        'learning',
    exposureCount: 5,
    activation:    makeActivation({ usageCount: 0, usageLogs: [] }),
    ...overrides,
  })
}

// ── getActivationWords — Tier A ───────────────────────────────────────────────

describe('getActivationWords — Tier A (activate stage)', () => {
  it('includes an item at activate stage', () => {
    const item = makeActivateItem()
    expect(getActivationWords([item])).toContain(item)
  })

  it('excludes an item that reached mastery via sentenceProduced', () => {
    const item = makeActivateItem({
      review: makeReview({ sentenceProduced: true }),
    })
    // getDisplayStage would return 'mastered', not 'activate'
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('excludes an item that reached mastery via usageCount >= 3', () => {
    const item = makeActivateItem({
      activation: makeActivation({ usageCount: 3, usageLogs: [] }),
    })
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('excludes an item that reached mastery via confidenceLevel 3', () => {
    const item = makeActivateItem({
      activation: makeActivation({ confidenceLevel: 3, usageLogs: [] }),
    })
    expect(getActivationWords([item])).not.toContain(item)
  })
})

// ── getActivationWords — Tier B ───────────────────────────────────────────────

describe('getActivationWords — Tier B (high-exposure, zero usage)', () => {
  it('includes an item with exposureCount >= 5 and zero usage logs', () => {
    const item = makeHighExposureItem()
    expect(getActivationWords([item])).toContain(item)
  })

  it('excludes an item with exposureCount < 5', () => {
    const item = makeItem({ exposureCount: 4, activation: makeActivation({ usageLogs: [] }) })
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('excludes an item with exposureCount >= 5 but has at least one usage log', () => {
    const item = makeItem({
      exposureCount: 6,
      activation: makeActivation({
        usageLogs: [{ id: 'log-1', usedAt: '2024-01-01', context: 'meeting' }],
      }),
    })
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('does not include Tier B items that are also Tier A (no duplicates)', () => {
    // An activate-stage item with exp=8 and zero usage: should appear once via Tier A
    const item = makeActivateItem({ exposureCount: 8 })
    const result = getActivationWords([item])
    const count = result.filter((i) => i.id === item.id).length
    expect(count).toBe(1)
  })
})

// ── getActivationWords — exclusion rules ──────────────────────────────────────

describe('getActivationWords — exclusion rules', () => {
  it('excludes archived items', () => {
    const item = makeActivateItem({ archived: true })
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('excludes items with status === "mastered"', () => {
    const item = makeActivateItem({ status: 'mastered' })
    expect(getActivationWords([item])).not.toContain(item)
  })

  it('returns an empty array when no items qualify', () => {
    const items = [
      makeItem({ exposureCount: 0 }),    // too new
      makeItem({ exposureCount: 3 }),    // not high-exposure
      makeActivateItem({ archived: true }),
    ]
    expect(getActivationWords(items)).toHaveLength(0)
  })
})

// ── getActivationWords — sort priority ────────────────────────────────────────

describe('getActivationWords — sort priority', () => {
  it('places focus words before non-focus words within the same tier', () => {
    const nonFocus = makeActivateItem({ inFocus: false, weeklyFocus: false, exposureCount: 8 })
    const focused  = makeActivateItem({ inFocus: true,  weeklyFocus: false, exposureCount: 8 })
    const result = getActivationWords([nonFocus, focused])
    expect(result.indexOf(focused)).toBeLessThan(result.indexOf(nonFocus))
  })

  it('places phrase-type items before word-type items at equal exposure', () => {
    const word   = makeActivateItem({ type: 'word',   exposureCount: 8 })
    const phrase = makeActivateItem({ type: 'phrase', exposureCount: 8 })
    const result = getActivationWords([word, phrase])
    expect(result.indexOf(phrase)).toBeLessThan(result.indexOf(word))
  })

  it('places higher-exposure items before lower-exposure within same type/focus', () => {
    const lower  = makeActivateItem({ type: 'word', exposureCount: 8 })
    const higher = makeActivateItem({ type: 'word', exposureCount: 9 })
    const result = getActivationWords([lower, higher])
    expect(result.indexOf(higher)).toBeLessThan(result.indexOf(lower))
  })

  it('places all Tier A items before Tier B items', () => {
    const tierA = makeActivateItem()
    const tierB = makeHighExposureItem()
    const result = getActivationWords([tierB, tierA])
    expect(result.indexOf(tierA)).toBeLessThan(result.indexOf(tierB))
  })
})

// ── getActivationWords — cap ──────────────────────────────────────────────────

describe('getActivationWords — cap at MAX_ACTIVATION_WORDS', () => {
  it('returns at most MAX_ACTIVATION_WORDS items', () => {
    const items = Array.from({ length: 20 }, () => makeActivateItem())
    expect(getActivationWords(items).length).toBeLessThanOrEqual(MAX_ACTIVATION_WORDS)
  })

  it('returns fewer than MAX_ACTIVATION_WORDS when fewer qualify', () => {
    const items = [makeActivateItem(), makeHighExposureItem()]
    expect(getActivationWords(items)).toHaveLength(2)
  })
})

// ── hasActivationWords ────────────────────────────────────────────────────────

describe('hasActivationWords', () => {
  it('returns true when at least one item qualifies', () => {
    expect(hasActivationWords([makeActivateItem()])).toBe(true)
  })

  it('returns true for Tier B items', () => {
    expect(hasActivationWords([makeHighExposureItem()])).toBe(true)
  })

  it('returns false when no items qualify', () => {
    expect(hasActivationWords([makeItem({ exposureCount: 0 })])).toBe(false)
  })

  it('returns false for an empty array', () => {
    expect(hasActivationWords([])).toBe(false)
  })
})

// ── getActivationExample ──────────────────────────────────────────────────────

describe('getActivationExample', () => {
  it('returns workSentence when both sentences are present', () => {
    const item = makeItem({ workSentence: 'Work sentence.', exampleSentence: 'Example sentence.' })
    expect(getActivationExample(item)).toBe('Work sentence.')
  })

  it('returns exampleSentence when workSentence is absent', () => {
    const item = makeItem({ exampleSentence: 'Example sentence.' })
    expect(getActivationExample(item)).toBe('Example sentence.')
  })

  it('returns undefined when neither sentence is present', () => {
    const item = makeItem()
    expect(getActivationExample(item)).toBeUndefined()
  })
})
