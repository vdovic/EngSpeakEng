/**
 * Unit tests for getDisplayStage()
 *
 * Tests cover:
 *   - All exposure boundaries (0, 1, 2, 3, 7, 8, 9+)
 *   - Each activation evidence gate (sentenceProduced, usageCount, confidenceLevel)
 *   - Activation gate boundary conditions (2 vs 3 uses, confidenceLevel 2 vs 3)
 *   - Legacy-mastered guard (status === 'mastered' with low exposureCount)
 *   - Null / undefined safety (missing exposureCount, missing activation)
 *   - No false mastery from high confidence below exp 8
 */

import { describe, it, expect } from 'vitest'
import { getDisplayStage } from '@/lib/progressionLogic'
import type { VocabItem, ActivationData, ReviewData } from '@/types/vocabulary'

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeReview(overrides: Partial<ReviewData> = {}): ReviewData {
  return {
    intervalDays:     1,
    ease:             2.5,
    reviewCount:      0,
    successfulRecalls: 0,
    sentenceProduced: false,
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

/**
 * Creates a minimal valid VocabItem with sensible defaults.
 * Every field required by getDisplayStage() can be overridden.
 */
function makeItem(overrides: {
  status?:        VocabItem['status']
  exposureCount?: number | undefined
  review?:        Partial<ReviewData>
  activation?:    Partial<ActivationData>
} = {}): VocabItem {
  return {
    id:           'test-id',
    term:         'test',
    type:         'word',
    status:       overrides.status ?? 'learning',
    createdAt:    '2024-01-01T00:00:00Z',
    updatedAt:    '2024-01-01T00:00:00Z',
    tags:         [],
    themes:       [],
    synonyms:     [],
    antonyms:     [],
    collocations: [],
    sentenceFrames: [],
    relatedPhrases: [],
    weeklyFocus:  false,
    archived:     false,
    review:       makeReview(overrides.review),
    activation:   makeActivation(overrides.activation),
    ...('exposureCount' in overrides
      ? { exposureCount: overrides.exposureCount }
      : { exposureCount: 0 }),
  } as VocabItem
}

// ── Exposure boundary tests ───────────────────────────────────────────────────

describe('getDisplayStage — exposure boundaries', () => {
  it('returns "new" when exposureCount is 0', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 0 }))).toBe('new')
  })

  it('returns "new" when exposureCount is undefined', () => {
    expect(getDisplayStage(makeItem({ exposureCount: undefined }))).toBe('new')
  })

  it('returns "introduced" when exposureCount is 1', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 1 }))).toBe('introduced')
  })

  it('returns "introduced" when exposureCount is 2', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 2 }))).toBe('introduced')
  })

  it('returns "drilling" when exposureCount is 3', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 3 }))).toBe('drilling')
  })

  it('returns "drilling" when exposureCount is 5', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 5 }))).toBe('drilling')
  })

  it('returns "drilling" when exposureCount is 7', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 7 }))).toBe('drilling')
  })

  it('returns "activate" when exposureCount is 8 and no activation evidence', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 8 }))).toBe('activate')
  })

  it('returns "activate" when exposureCount exceeds 8 and no activation evidence', () => {
    expect(getDisplayStage(makeItem({ exposureCount: 9 }))).toBe('activate')
  })
})

// ── Activation evidence gates at exp = 8 ─────────────────────────────────────

describe('getDisplayStage — activation evidence gates (exp = 8)', () => {
  it('returns "mastered" when sentenceProduced is true', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      review: { sentenceProduced: true },
    }))).toBe('mastered')
  })

  it('returns "mastered" when usageCount is exactly 3', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      activation: { usageCount: 3 },
    }))).toBe('mastered')
  })

  it('returns "mastered" when usageCount exceeds 3', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      activation: { usageCount: 5 },
    }))).toBe('mastered')
  })

  it('returns "activate" when usageCount is 2 (below threshold)', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      activation: { usageCount: 2 },
    }))).toBe('activate')
  })

  it('returns "mastered" when confidenceLevel is 3', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      activation: { confidenceLevel: 3 },
    }))).toBe('mastered')
  })

  it('returns "activate" when confidenceLevel is 2 (below threshold)', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      activation: { confidenceLevel: 2 },
    }))).toBe('activate')
  })

  it('returns "activate" when no activation gate is met', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      review:     { sentenceProduced: false },
      activation: { usageCount: 0, confidenceLevel: 0 },
    }))).toBe('activate')
  })

  it('returns "mastered" when multiple gates are met simultaneously', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 8,
      review:     { sentenceProduced: true },
      activation: { usageCount: 3, confidenceLevel: 3 },
    }))).toBe('mastered')
  })
})

// ── Confidence does NOT trigger mastery below exp 8 ──────────────────────────

describe('getDisplayStage — confidence level below exp 8', () => {
  it('returns "drilling" when confidenceLevel is 3 but exp is 5', () => {
    // confidenceLevel only counts as activation evidence at exp >= 8
    expect(getDisplayStage(makeItem({
      exposureCount: 5,
      activation: { confidenceLevel: 3 },
    }))).toBe('drilling')
  })

  it('returns "introduced" when confidenceLevel is 3 but exp is 1', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 1,
      activation: { confidenceLevel: 3 },
    }))).toBe('introduced')
  })

  it('returns "drilling" when sentenceProduced is true but exp is 6', () => {
    expect(getDisplayStage(makeItem({
      exposureCount: 6,
      review: { sentenceProduced: true },
    }))).toBe('drilling')
  })
})

// ── Legacy-mastered guard ─────────────────────────────────────────────────────

describe('getDisplayStage — legacy-mastered guard', () => {
  it('returns "mastered" when status is "mastered" regardless of exposureCount = 0', () => {
    // Old words mastered via review system before challenge SRS existed
    expect(getDisplayStage(makeItem({
      status: 'mastered',
      exposureCount: 0,
    }))).toBe('mastered')
  })

  it('returns "mastered" when status is "mastered" with exposureCount = 3', () => {
    expect(getDisplayStage(makeItem({
      status: 'mastered',
      exposureCount: 3,
    }))).toBe('mastered')
  })

  it('returns "mastered" when status is "mastered" with exposureCount = 8 and no activation', () => {
    // Modern mastered: both paths agree
    expect(getDisplayStage(makeItem({
      status: 'mastered',
      exposureCount: 8,
      review:     { sentenceProduced: false },
      activation: { usageCount: 0, confidenceLevel: 0 },
    }))).toBe('mastered')
  })

  it('does NOT return "mastered" for status "activation" with exposureCount = 8 and no evidence', () => {
    // 'activation' status ≠ mastered; must go through activation evidence
    expect(getDisplayStage(makeItem({
      status: 'activation',
      exposureCount: 8,
      activation: { usageCount: 0, confidenceLevel: 0 },
    }))).toBe('activate')
  })

  it('does NOT return "mastered" for status "stable" with high exposureCount', () => {
    expect(getDisplayStage(makeItem({
      status: 'stable',
      exposureCount: 7,
    }))).toBe('drilling')
  })
})

// ── Null / undefined safety ───────────────────────────────────────────────────

describe('getDisplayStage — null / undefined safety', () => {
  it('handles missing activation object gracefully', () => {
    const item = makeItem({ exposureCount: 8 })
    // Remove activation to simulate malformed data
    ;(item as unknown as Record<string, unknown>).activation = undefined
    expect(getDisplayStage(item)).toBe('activate')
  })

  it('handles activation with no confidenceLevel field', () => {
    const item = makeItem({ exposureCount: 8 })
    delete (item.activation as unknown as Record<string, unknown>).confidenceLevel
    expect(getDisplayStage(item)).toBe('activate')
  })

  it('handles activation with no usageCount field', () => {
    const item = makeItem({ exposureCount: 8 })
    delete (item.activation as unknown as Record<string, unknown>).usageCount
    expect(getDisplayStage(item)).toBe('activate')
  })
})
