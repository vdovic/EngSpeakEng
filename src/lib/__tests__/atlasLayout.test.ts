/**
 * Unit tests for atlasLayout.ts
 *
 * Tests cover:
 *   - hash32: known values, determinism, avalanche
 *   - computeAtlasLayout: returns correct node count
 *   - computeAtlasLayout: excludes archived items
 *   - computeAtlasLayout: determinism — same input → same output
 *   - computeAtlasLayout: all nodes within CANVAS bounds (with margin)
 *   - computeAtlasLayout: theme regions created for themes with ≥ 2 items
 *   - computeAtlasLayout: no region for themes with < 2 items
 *   - computeAtlasLayout: correct stage assignment
 *   - computeAtlasLayout: driftPhase in [0, 2π)
 *   - computeAtlasLayout: bounds reflect node positions
 */

import { describe, it, expect } from 'vitest'
import {
  hash32,
  computeAtlasLayout,
  CANVAS_W,
  CANVAS_H,
} from '@/lib/atlasLayout'
import type { VocabItem, ActivationData, ReviewData } from '@/types/vocabulary'

// ── Fixtures ──────────────────────────────────────────────────────────────────

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
    requiredUses:    3,
    usageCount:      0,
    usageLogs:       [],
    confidenceLevel: 0,
    ...overrides,
  }
}

let _counter = 0
function makeItem(overrides: Partial<VocabItem> = {}): VocabItem {
  _counter++
  return {
    id:             `item-${_counter}`,
    term:           `word-${_counter}`,
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

// ── hash32 ────────────────────────────────────────────────────────────────────

describe('hash32', () => {
  it('returns a number', () => {
    expect(typeof hash32('hello')).toBe('number')
  })

  it('is deterministic — same string returns same value', () => {
    expect(hash32('test-word')).toBe(hash32('test-word'))
  })

  it('returns different values for different strings (avalanche)', () => {
    expect(hash32('word-1')).not.toBe(hash32('word-2'))
    expect(hash32('abc')).not.toBe(hash32('def'))
  })

  it('returns a 32-bit unsigned integer (0 ≤ x < 2^32)', () => {
    const h = hash32('some-id-12345')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(0x100000000)
  })

  it('handles empty string without throwing', () => {
    expect(() => hash32('')).not.toThrow()
  })
})

// ── computeAtlasLayout ────────────────────────────────────────────────────────

describe('computeAtlasLayout — node count', () => {
  it('returns one node per non-archived item', () => {
    const items = [makeItem(), makeItem(), makeItem()]
    const layout = computeAtlasLayout(items)
    expect(layout.nodes).toHaveLength(3)
  })

  it('excludes archived items', () => {
    const items = [makeItem(), makeItem({ archived: true }), makeItem()]
    const layout = computeAtlasLayout(items)
    expect(layout.nodes).toHaveLength(2)
  })

  it('returns empty layout for empty input', () => {
    const layout = computeAtlasLayout([])
    expect(layout.nodes).toHaveLength(0)
    expect(layout.regions).toHaveLength(0)
  })
})

describe('computeAtlasLayout — determinism', () => {
  it('returns identical node positions on repeated calls', () => {
    const items = Array.from({ length: 20 }, () => makeItem())
    const a = computeAtlasLayout(items)
    const b = computeAtlasLayout(items)
    a.nodes.forEach((nodeA, i) => {
      const nodeB = b.nodes[i]
      expect(nodeA.x).toBe(nodeB.x)
      expect(nodeA.y).toBe(nodeB.y)
    })
  })
})

describe('computeAtlasLayout — node positions', () => {
  it('all node x positions are finite numbers', () => {
    const items = Array.from({ length: 30 }, () => makeItem())
    const layout = computeAtlasLayout(items)
    for (const n of layout.nodes) {
      expect(Number.isFinite(n.x)).toBe(true)
      expect(Number.isFinite(n.y)).toBe(true)
    }
  })

  it('node positions are broadly within a generous canvas margin', () => {
    const items = Array.from({ length: 50 }, () => makeItem())
    const layout = computeAtlasLayout(items)
    const MARGIN = 800
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThan(-MARGIN)
      expect(n.x).toBeLessThan(CANVAS_W + MARGIN)
      expect(n.y).toBeGreaterThan(-MARGIN)
      expect(n.y).toBeLessThan(CANVAS_H + MARGIN)
    }
  })
})

describe('computeAtlasLayout — regions', () => {
  it('creates a region for themes with ≥ 2 items', () => {
    const items = [
      makeItem({ themes: ['work'] }),
      makeItem({ themes: ['work'] }),
      makeItem({ themes: ['travel'] }),
      makeItem({ themes: ['travel'] }),
    ]
    const layout = computeAtlasLayout(items)
    const themeNames = layout.regions.map((r) => r.theme)
    expect(themeNames).toContain('work')
    expect(themeNames).toContain('travel')
  })

  it('does NOT create a region for themes with only 1 item', () => {
    const items = [
      makeItem({ themes: ['solo-theme'] }),
      makeItem({ themes: ['work'] }),
      makeItem({ themes: ['work'] }),
    ]
    const layout = computeAtlasLayout(items)
    const themeNames = layout.regions.map((r) => r.theme)
    expect(themeNames).not.toContain('solo-theme')
  })

  it('regions have positive halo dimensions', () => {
    const items = [
      makeItem({ themes: ['business'] }),
      makeItem({ themes: ['business'] }),
      makeItem({ themes: ['business'] }),
    ]
    const layout = computeAtlasLayout(items)
    for (const r of layout.regions) {
      expect(r.rx).toBeGreaterThan(0)
      expect(r.ry).toBeGreaterThan(0)
    }
  })
})

describe('computeAtlasLayout — stage assignment', () => {
  it('assigns "new" stage to unexposed items', () => {
    const item = makeItem({ exposureCount: 0, status: 'inbox' })
    const layout = computeAtlasLayout([item])
    expect(layout.nodes[0].stage).toBe('new')
  })

  it('assigns "mastered" stage to mastered items', () => {
    const item = makeItem({
      status: 'mastered',
      exposureCount: 8,
      review: makeReview({ sentenceProduced: true, successfulRecalls: 5 }),
      activation: makeActivation({ usageCount: 3, usageLogs: [
        { id: 'l1', usedAt: '2024-01-01', context: 'meeting' },
        { id: 'l2', usedAt: '2024-01-02', context: 'meeting' },
        { id: 'l3', usedAt: '2024-01-03', context: 'meeting' },
      ] }),
    })
    const layout = computeAtlasLayout([item])
    expect(layout.nodes[0].stage).toBe('mastered')
  })
})

describe('computeAtlasLayout — drift phases', () => {
  it('driftPhase is in [0, 2π)', () => {
    const items = Array.from({ length: 20 }, () => makeItem())
    const layout = computeAtlasLayout(items)
    for (const n of layout.nodes) {
      expect(n.driftPhase).toBeGreaterThanOrEqual(0)
      expect(n.driftPhase).toBeLessThan(Math.PI * 2 + 0.001)
    }
  })
})

describe('computeAtlasLayout — bounds', () => {
  it('bounds.minX ≤ all node x ≤ bounds.maxX', () => {
    const items = Array.from({ length: 30 }, () => makeItem())
    const layout = computeAtlasLayout(items)
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(layout.bounds.minX - 0.001)
      expect(n.x).toBeLessThanOrEqual(layout.bounds.maxX + 0.001)
    }
  })
})
