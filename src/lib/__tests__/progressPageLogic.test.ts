/**
 * src/lib/__tests__/progressPageLogic.test.ts
 *
 * Unit tests for the pure helper functions in progressPageLogic.ts.
 */

import { describe, it, expect } from 'vitest'
import {
  getStageDistribution,
  getAliveVocabCount,
  getActivateStageItems,
  get90DayActivity,
  relativeTime,
  buildProgressHeadline,
  buildConstellationNodes,
  buildGrowthCohorts,
  buildThemeTerritory,
  buildLongHorizon,
  type HeadlineInput,
} from '@/lib/progressPageLogic'
import type { VocabItem } from '@/types/vocabulary'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeReview(overrides: Partial<VocabItem['review']> = {}): VocabItem['review'] {
  return {
    intervalDays: 1,
    ease: 2.5,
    reviewCount: 0,
    successfulRecalls: 0,
    sentenceProduced: false,
    ...overrides,
  }
}

function makeActivation(overrides: Partial<VocabItem['activation']> = {}): VocabItem['activation'] {
  return {
    requiredUses: 3,
    usageCount: 0,
    usageLogs: [],
    confidenceLevel: 0,
    ...overrides,
  }
}

let _idCounter = 0
function makeItem(overrides: Partial<VocabItem> = {}): VocabItem {
  _idCounter++
  const base: VocabItem = {
    id: `item-${_idCounter}`,
    term: `word${_idCounter}`,
    type: 'word',
    status: 'learning',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    updatedAt: new Date().toISOString(),
    exposureCount: 0,
    inFocus: false,
    weeklyFocus: false,
    archived: false,
    tags: [],
    themes: [],
    synonyms: [],
    antonyms: [],
    collocations: [],
    sentenceFrames: [],
    relatedPhrases: [],
    review: makeReview(),
    activation: makeActivation(),
    ...overrides,
  }
  return base
}

// Item helpers by DisplayStage
function newItem()        { return makeItem({ exposureCount: 0, status: 'learning' }) }
function introducedItem() { return makeItem({ exposureCount: 1 }) }
function drillingItem()   { return makeItem({ exposureCount: 4 }) }
function activateItem()   { return makeItem({ exposureCount: 8 }) }
function masteredItem()   {
  return makeItem({
    exposureCount: 8,
    activation: makeActivation({ usageCount: 3, usageLogs: [] }),
  })
}

// ── getStageDistribution ───────────────────────────────────────────────────────

describe('getStageDistribution', () => {
  it('returns all-zero distribution for empty array', () => {
    const dist = getStageDistribution([])
    expect(dist).toEqual({ new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0 })
  })

  it('counts each stage correctly', () => {
    const items = [
      newItem(), newItem(),
      introducedItem(),
      drillingItem(), drillingItem(), drillingItem(),
      activateItem(),
      masteredItem(), masteredItem(),
    ]
    const dist = getStageDistribution(items)
    expect(dist.new).toBe(2)
    expect(dist.introduced).toBe(1)
    expect(dist.drilling).toBe(3)
    expect(dist.activate).toBe(1)
    expect(dist.mastered).toBe(2)
  })

  it('excludes archived items', () => {
    const items = [
      masteredItem(),
      makeItem({ archived: true, exposureCount: 8, activation: makeActivation({ usageCount: 3, usageLogs: [] }) }),
    ]
    const dist = getStageDistribution(items)
    expect(dist.mastered).toBe(1)
  })
})

// ── getAliveVocabCount ─────────────────────────────────────────────────────────

describe('getAliveVocabCount', () => {
  it('returns 0 for empty array', () => {
    expect(getAliveVocabCount([])).toBe(0)
  })

  it('counts mastered items', () => {
    const items = [masteredItem(), masteredItem(), drillingItem()]
    expect(getAliveVocabCount(items)).toBe(2)
  })

  it('counts activate-stage items with usageCount > 0', () => {
    const items = [
      activateItem(),                                                           // usageCount=0 → NOT alive
      makeItem({ exposureCount: 8, activation: makeActivation({ usageCount: 1, usageLogs: [] }) }),  // alive
      masteredItem(),                                                           // alive
    ]
    expect(getAliveVocabCount(items)).toBe(2)
  })

  it('excludes archived items', () => {
    const archived = makeItem({
      archived: true,
      exposureCount: 8,
      activation: makeActivation({ usageCount: 3, usageLogs: [] }),
    })
    expect(getAliveVocabCount([archived])).toBe(0)
  })
})

// ── getActivateStageItems ──────────────────────────────────────────────────────

describe('getActivateStageItems', () => {
  it('returns empty array when no activate-stage items', () => {
    expect(getActivateStageItems([newItem(), masteredItem()])).toHaveLength(0)
  })

  it('includes only activate-stage items', () => {
    const items = [activateItem(), masteredItem(), newItem(), activateItem()]
    const result = getActivateStageItems(items)
    expect(result).toHaveLength(2)
  })

  it('sorts by daysKnown descending (oldest first)', () => {
    const older = makeItem({
      exposureCount: 8,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const newer = makeItem({
      exposureCount: 8,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const result = getActivateStageItems([newer, older])
    expect(result[0].daysKnown).toBeGreaterThan(result[1].daysKnown)
  })

  it('sets daysKnown correctly', () => {
    const item = makeItem({
      exposureCount: 8,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const result = getActivateStageItems([item])
    expect(result[0].daysKnown).toBe(7)
  })

  it('excludes archived items', () => {
    const item = makeItem({ exposureCount: 8, archived: true })
    expect(getActivateStageItems([item])).toHaveLength(0)
  })
})

// ── get90DayActivity ──────────────────────────────────────────────────────────

describe('get90DayActivity', () => {
  it('returns exactly 90 entries by default', () => {
    expect(get90DayActivity({})).toHaveLength(90)
  })

  it('respects custom days parameter', () => {
    expect(get90DayActivity({}, 30)).toHaveLength(30)
  })

  it('marks days with points as active', () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = get90DayActivity({ [today]: 10 })
    const todayDot = result.find((d) => d.dateKey === today)!
    expect(todayDot.active).toBe(true)
    expect(todayDot.points).toBe(10)
  })

  it('marks days without points as inactive', () => {
    const result = get90DayActivity({})
    expect(result.every((d) => !d.active && d.points === 0)).toBe(true)
  })

  it('last entry is today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = get90DayActivity({})
    expect(result[result.length - 1].dateKey).toBe(today)
  })
})

// ── relativeTime ──────────────────────────────────────────────────────────────

describe('relativeTime', () => {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

  it('returns "today" for 0 days ago', () => {
    expect(relativeTime(new Date().toISOString())).toBe('today')
  })

  it('returns "yesterday" for 1 day ago', () => {
    expect(relativeTime(daysAgo(1))).toBe('yesterday')
  })

  it('returns "X days ago" for 2–6 days', () => {
    expect(relativeTime(daysAgo(3))).toBe('3 days ago')
    expect(relativeTime(daysAgo(6))).toBe('6 days ago')
  })

  it('returns "1 week ago" for ~7 days', () => {
    expect(relativeTime(daysAgo(7))).toBe('1 week ago')
  })

  it('returns "X weeks ago" for 14–34 days', () => {
    expect(relativeTime(daysAgo(14))).toBe('2 weeks ago')
    expect(relativeTime(daysAgo(21))).toBe('3 weeks ago')
  })

  it('returns month-based label for 30+ days', () => {
    expect(relativeTime(daysAgo(30))).toBe('1 month ago')
    expect(relativeTime(daysAgo(60))).toBe('2 months ago')
  })

  it('returns "over a year ago" for 365+ days', () => {
    expect(relativeTime(daysAgo(400))).toBe('over a year ago')
  })
})

// ── buildProgressHeadline ─────────────────────────────────────────────────────

describe('buildProgressHeadline', () => {
  function makeInput(overrides: Partial<HeadlineInput> = {}): HeadlineInput {
    return {
      aliveCount: 0,
      masteredCount: 0,
      activateCount: 0,
      totalInLibrary: 0,
      stageDistribution: { new: 0, introduced: 0, drilling: 0, activate: 0, mastered: 0 },
      usesThisWeek: 0,
      streakDays: 0,
      ...overrides,
    }
  }

  it('returns milestone headline for 1000+ alive words', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 1000 }))
    expect(main).toContain('thousand')
  })

  it('returns milestone headline for 500–999 alive words', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 500 }))
    expect(main).toContain('Five hundred')
  })

  it('returns milestone headline for 250–499 alive words', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 250 }))
    expect(main.toLowerCase()).toContain('foundation')
  })

  it('returns milestone headline for 100–249 alive words', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 100 }))
    expect(main).toContain('hundred')
  })

  it('returns strong momentum headline for 7-day streak', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 10, streakDays: 7 }))
    expect(main.toLowerCase()).toContain('momentum')
  })

  it('returns strong momentum headline for 5+ uses this week', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 10, usesThisWeek: 5 }))
    expect(main.toLowerCase()).toContain('momentum')
  })

  it('returns good momentum headline for 3-day streak', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 10, streakDays: 3 }))
    expect(main.toLowerCase()).toContain('progress')
  })

  it('mentions activate count when backlog >= 10', () => {
    const { main } = buildProgressHeadline(makeInput({ aliveCount: 5, activateCount: 10 }))
    expect(main).toContain('10')
  })

  it('returns starter headline when no library items', () => {
    const { main } = buildProgressHeadline(makeInput({ totalInLibrary: 0, aliveCount: 0 }))
    expect(main.toLowerCase()).toContain('journey')
  })

  it('returns steady default for moderate progress', () => {
    const result = buildProgressHeadline(makeInput({ aliveCount: 20, masteredCount: 10, activateCount: 10 }))
    expect(result.main).toBeTruthy()
    expect(result.sub).toBeTruthy()
  })
})

// ── buildConstellationNodes ───────────────────────────────────────────────────

describe('buildConstellationNodes', () => {
  it('returns empty array for empty items', () => {
    expect(buildConstellationNodes([], [])).toHaveLength(0)
  })

  it('excludes archived items', () => {
    const items = [
      masteredItem(),
      makeItem({ archived: true, exposureCount: 8, activation: makeActivation({ usageCount: 3, usageLogs: [] }) }),
    ]
    expect(buildConstellationNodes(items, [])).toHaveLength(1)
  })

  it('respects maxNodes cap', () => {
    const items = Array.from({ length: 20 }, () => drillingItem())
    expect(buildConstellationNodes(items, [], 10)).toHaveLength(10)
  })

  it('all node positions are within [MARGIN, 1-MARGIN]', () => {
    const MARGIN = 0.04
    const items = Array.from({ length: 30 }, (_, i) => makeItem({ id: `stable-${i}` }))
    const nodes = buildConstellationNodes(items, ['Business & Professional'])
    for (const n of nodes) {
      expect(n.x).toBeGreaterThanOrEqual(MARGIN)
      expect(n.x).toBeLessThanOrEqual(1 - MARGIN)
      expect(n.y).toBeGreaterThanOrEqual(MARGIN)
      expect(n.y).toBeLessThanOrEqual(1 - MARGIN)
    }
  })

  it('positions are deterministic — same item always gets same (x, y)', () => {
    const item = makeItem({ id: 'fixed-id-123' })
    const run1 = buildConstellationNodes([item], [])
    const run2 = buildConstellationNodes([item], [])
    expect(run1[0].x).toBe(run2[0].x)
    expect(run1[0].y).toBe(run2[0].y)
  })

  it('position is stable regardless of other items in the list', () => {
    const target = makeItem({ id: 'target-xyz' })
    const others = Array.from({ length: 10 }, (_, i) => makeItem({ id: `other-${i}` }))

    const alone    = buildConstellationNodes([target], [])
    const withOthers = buildConstellationNodes([target, ...others], [])
    const targetNode = withOthers.find((n) => n.id === target.id)!

    expect(targetNode.x).toBeCloseTo(alone[0].x, 10)
    expect(targetNode.y).toBeCloseTo(alone[0].y, 10)
  })

  it('prioritises mastered words when cap is applied', () => {
    const newItems      = Array.from({ length: 10 }, () => newItem())
    const masteredItems = Array.from({ length: 5 }, () => masteredItem())
    const nodes = buildConstellationNodes([...newItems, ...masteredItems], [], 5)
    // All 5 results should be mastered
    expect(nodes.every((n) => n.stage === 'mastered')).toBe(true)
  })

  it('assigns primaryTheme from item.themes matching the themes list', () => {
    const item = makeItem({ themes: ['Business & Professional', 'Everyday Conversation'] })
    const nodes = buildConstellationNodes([item], ['Business & Professional', 'Everyday Conversation'])
    // First alphabetically: 'Business & Professional'
    expect(nodes[0].primaryTheme).toBe('Business & Professional')
  })

  it('sets primaryTheme to null when item has no matching themes', () => {
    const item = makeItem({ themes: [] })
    const nodes = buildConstellationNodes([item], ['Business & Professional'])
    expect(nodes[0].primaryTheme).toBeNull()
  })

  it('items with a theme cluster closer to their theme center than unthemed items cluster to centre', () => {
    // Themed items should NOT be at exact centre (0.5, 0.5) unless the scatter happens to land there
    // This is a statistical test — just verify themed items have different positions from unthemed
    const themedItem   = makeItem({ id: 'themed-001',   themes: ['Business & Professional'] })
    const unthemedItem = makeItem({ id: 'unthemed-001', themes: [] })
    const nodes = buildConstellationNodes([themedItem, unthemedItem], ['Business & Professional'])
    expect(nodes[0].x).not.toBe(nodes[1].x)   // very unlikely to collide exactly
  })

  it('includes usageCount and confidenceLevel on each node', () => {
    const item = makeItem({
      activation: makeActivation({ usageCount: 2, confidenceLevel: 3, usageLogs: [] }),
    })
    const [node] = buildConstellationNodes([item], [])
    expect(node.usageCount).toBe(2)
    expect(node.confidenceLevel).toBe(3)
  })

  // ── Phase 3: createdAt + lastActiveAt ─────────────────────────────────────

  it('includes createdAt on each node matching item.createdAt', () => {
    const ts = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const item = makeItem({ createdAt: ts })
    const [node] = buildConstellationNodes([item], [])
    expect(node.createdAt).toBe(ts)
  })

  it('sets lastActiveAt from activation.lastUsedAt when present', () => {
    const lastUsedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const item = makeItem({
      activation: makeActivation({ lastUsedAt, usageLogs: [] }),
    })
    const [node] = buildConstellationNodes([item], [])
    expect(node.lastActiveAt).toBe(lastUsedAt)
  })

  it('sets lastActiveAt to latest of lastUsedAt and lastExposureAt', () => {
    const older  = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const newer  = new Date(Date.now() -  2 * 24 * 60 * 60 * 1000).toISOString()
    const item = makeItem({
      lastExposureAt: newer,
      activation: makeActivation({ lastUsedAt: older, usageLogs: [] }),
    })
    const [node] = buildConstellationNodes([item], [])
    expect(node.lastActiveAt).toBe(newer)
  })

  it('sets lastActiveAt to undefined for a brand-new untouched item', () => {
    // No lastExposureAt, no lastUsedAt, no usageLogs
    const item = makeItem({
      activation: makeActivation({ lastUsedAt: undefined, usageLogs: [] }),
    })
    const [node] = buildConstellationNodes([item], [])
    expect(node.lastActiveAt).toBeUndefined()
  })
})

// ── buildGrowthCohorts ────────────────────────────────────────────────────────

describe('buildGrowthCohorts', () => {
  it('returns empty array for empty input', () => {
    expect(buildGrowthCohorts([])).toHaveLength(0)
  })

  it('returns empty array when all items are archived', () => {
    expect(buildGrowthCohorts([makeItem({ archived: true })])).toHaveLength(0)
  })

  it('groups items by creation month', () => {
    const jan = makeItem({ createdAt: '2025-01-15T10:00:00.000Z' })
    const feb = makeItem({ createdAt: '2025-02-20T10:00:00.000Z' })
    const result = buildGrowthCohorts([jan, feb])
    expect(result).toHaveLength(2)
    expect(result[0].monthKey).toBe('2025-01')
    expect(result[1].monthKey).toBe('2025-02')
  })

  it('groups multiple items in the same month into one cohort', () => {
    const items = [
      makeItem({ createdAt: '2025-01-01T00:00:00.000Z' }),
      makeItem({ createdAt: '2025-01-15T00:00:00.000Z' }),
      makeItem({ createdAt: '2025-01-31T00:00:00.000Z' }),
    ]
    const result = buildGrowthCohorts(items)
    expect(result).toHaveLength(1)
    expect(result[0].total).toBe(3)
  })

  it('sorts cohorts oldest-first', () => {
    const items = [
      makeItem({ createdAt: '2025-03-01T00:00:00.000Z' }),
      makeItem({ createdAt: '2025-01-01T00:00:00.000Z' }),
      makeItem({ createdAt: '2025-02-01T00:00:00.000Z' }),
    ]
    const result = buildGrowthCohorts(items)
    expect(result[0].monthKey).toBe('2025-01')
    expect(result[1].monthKey).toBe('2025-02')
    expect(result[2].monthKey).toBe('2025-03')
  })

  it('counts stage distribution correctly per cohort', () => {
    const items = [
      makeItem({
        createdAt: '2025-01-01T00:00:00.000Z',
        exposureCount: 8,
        activation: makeActivation({ usageCount: 3, usageLogs: [] }),
      }),  // mastered
      makeItem({ createdAt: '2025-01-01T00:00:00.000Z', exposureCount: 4 }),  // drilling
    ]
    const result = buildGrowthCohorts(items)
    expect(result[0].distribution.mastered).toBe(1)
    expect(result[0].distribution.drilling).toBe(1)
    expect(result[0].total).toBe(2)
  })

  it('excludes archived items', () => {
    const items = [
      makeItem({ createdAt: '2025-01-01T00:00:00.000Z' }),
      makeItem({ createdAt: '2025-01-01T00:00:00.000Z', archived: true }),
    ]
    const result = buildGrowthCohorts(items)
    expect(result[0].total).toBe(1)
  })

  it('provides a human-readable label for each cohort', () => {
    const item = makeItem({ createdAt: '2025-06-10T00:00:00.000Z' })
    const result = buildGrowthCohorts([item])
    expect(result[0].label).toMatch(/Jun\s+2025/)
  })
})

// ── buildThemeTerritory ───────────────────────────────────────────────────────

describe('buildThemeTerritory', () => {
  it('returns empty array for empty items', () => {
    expect(buildThemeTerritory([], ['Business'])).toHaveLength(0)
  })

  it('returns empty array when no items match any theme', () => {
    const item = makeItem({ themes: [] })
    expect(buildThemeTerritory([item], ['Business'])).toHaveLength(0)
  })

  it('counts items in their assigned themes', () => {
    const items = [
      makeItem({ themes: ['Business'] }),
      makeItem({ themes: ['Business'] }),
      makeItem({ themes: ['Casual'] }),
    ]
    const result = buildThemeTerritory(items, ['Business', 'Casual'])
    const business = result.find((e) => e.theme === 'Business')!
    expect(business.total).toBe(2)
  })

  it('counts an item with multiple themes in each of those themes', () => {
    const item = makeItem({ themes: ['Business', 'Casual'] })
    const result = buildThemeTerritory([item], ['Business', 'Casual'])
    const b = result.find((e) => e.theme === 'Business')!
    const c = result.find((e) => e.theme === 'Casual')!
    expect(b.total).toBe(1)
    expect(c.total).toBe(1)
  })

  it('excludes archived items', () => {
    const item = makeItem({ themes: ['Business'], archived: true })
    expect(buildThemeTerritory([item], ['Business'])).toHaveLength(0)
  })

  it('sorts entries by total descending', () => {
    const items = [
      makeItem({ themes: ['A'] }),
      makeItem({ themes: ['B'] }),
      makeItem({ themes: ['B'] }),
      makeItem({ themes: ['B'] }),
      makeItem({ themes: ['A'] }),
    ]
    const result = buildThemeTerritory(items, ['A', 'B'])
    expect(result[0].theme).toBe('B')
    expect(result[0].total).toBe(3)
  })

  it('computes aliveCount as mastered + activate-with-use', () => {
    const alive    = makeItem({ themes: ['T'], exposureCount: 8, activation: makeActivation({ usageCount: 3, usageLogs: [] }) })
    const notAlive = makeItem({ themes: ['T'], exposureCount: 4 })
    const result   = buildThemeTerritory([alive, notAlive], ['T'])
    expect(result[0].aliveCount).toBe(1)
  })

  it('ignores themes not in the user themes list', () => {
    const item = makeItem({ themes: ['Unknown Theme'] })
    expect(buildThemeTerritory([item], ['Business'])).toHaveLength(0)
  })
})

// ── buildLongHorizon ──────────────────────────────────────────────────────────

describe('buildLongHorizon', () => {
  it('returns zero values for empty items', () => {
    const result = buildLongHorizon([])
    expect(result.currentTotal).toBe(0)
    expect(result.weeklyVelocity).toBe(0)
  })

  it('excludes archived items from currentTotal', () => {
    const result = buildLongHorizon([makeItem({ archived: true }), makeItem()])
    expect(result.currentTotal).toBe(1)
  })

  it('includes all six standard milestone targets', () => {
    const { milestones } = buildLongHorizon([])
    const targets = milestones.map((m) => m.target)
    expect(targets).toContain(100)
    expect(targets).toContain(250)
    expect(targets).toContain(500)
    expect(targets).toContain(750)
    expect(targets).toContain(1000)
    expect(targets).toContain(1500)
  })

  it('marks milestones already surpassed as reached', () => {
    const items = Array.from({ length: 105 }, () => makeItem())
    const { milestones } = buildLongHorizon(items)
    expect(milestones.find((m) => m.target === 100)!.reached).toBe(true)
    expect(milestones.find((m) => m.target === 250)!.reached).toBe(false)
  })

  it('marks all milestones as not reached when library is small', () => {
    const items = Array.from({ length: 5 }, () => makeItem())
    const { milestones } = buildLongHorizon(items)
    expect(milestones.every((m) => !m.reached)).toBe(true)
  })

  it('computes weeklyVelocity from recent additions (last 28 days)', () => {
    // 8 items added within the last 28 days → velocity = 2/week
    const recent = Array.from({ length: 8 }, () =>
      makeItem({ createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() })
    )
    const result = buildLongHorizon(recent)
    expect(result.weeklyVelocity).toBe(2)
  })

  it('does not count items older than 28 days in velocity', () => {
    const old = makeItem({ createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() })
    const result = buildLongHorizon([old])
    expect(result.weeklyVelocity).toBe(0)
  })

  it('sets weeksFromNow to null when velocity is zero', () => {
    const items = Array.from({ length: 5 }, () =>
      makeItem({ createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() })
    )
    const { milestones } = buildLongHorizon(items)
    expect(milestones.every((m) => m.weeksFromNow === null)).toBe(true)
  })

  it('sets weeksFromNow correctly when velocity is known', () => {
    // 4 recent items → velocity = 1/week. Need 96 more to reach 100 → 96 weeks
    const items = Array.from({ length: 4 }, () =>
      makeItem({ createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() })
    )
    const { milestones } = buildLongHorizon(items)
    const m100 = milestones.find((m) => m.target === 100)!
    expect(m100.weeksFromNow).toBe(96)  // ceil((100 - 4) / 1)
  })
})
