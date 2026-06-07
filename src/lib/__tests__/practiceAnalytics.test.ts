/**
 * practiceAnalytics.test.ts
 *
 * Covers the pure aggregation behind the Progress & Effort tab:
 *   1. buildDailyBuckets — zero-fill, ordering, day bucketing
 *   2. computePracticeMetrics — today / week / averages / totals
 *   3. currentConsistency — today vs yesterday anchoring, broken runs
 *   4. longestConsistency — longest consecutive run
 *   5. distributionByActivity — grouping, percentages, sort order
 *   6. withRollingAverage — trailing-window average
 *   7. formatDuration — human formatting
 *   8. getMasteryProgress — north-star formula
 */

import { describe, it, expect } from 'vitest'
import {
  buildDailyBuckets,
  computePracticeMetrics,
  currentConsistency,
  longestConsistency,
  distributionByActivity,
  withRollingAverage,
  formatDuration,
} from '@/lib/practiceAnalytics'
import { getMasteryProgress } from '@/lib/statsLogic'
import type { PracticeSession, ActivityType } from '@/lib/practice'
import type { VocabItem } from '@/types/vocabulary'

const NOW = new Date('2026-06-07T10:00:00Z') // anchor "today" = 2026-06-07

function session(
  endedAt: string,
  durationSecs: number,
  advancement: number,
  activity: ActivityType = 'daily-challenge',
  itemsPracticed = 1,
): PracticeSession {
  return { id: `${endedAt}-${Math.random()}`, activity, endedAt, durationSecs, advancement, itemsPracticed }
}

describe('buildDailyBuckets', () => {
  it('zero-fills and orders oldest→today', () => {
    const buckets = buildDailyBuckets([], 7, NOW)
    expect(buckets).toHaveLength(7)
    expect(buckets[0].dateKey).toBe('2026-06-01')
    expect(buckets[6].dateKey).toBe('2026-06-07')
    expect(buckets.every((b) => b.secs === 0 && b.advancement === 0)).toBe(true)
  })

  it('sums sessions into the matching day, ignoring out-of-range days', () => {
    const sessions = [
      session('2026-06-07T09:00:00Z', 120, 3),
      session('2026-06-07T08:00:00Z', 60, 2),
      session('2026-06-05T08:00:00Z', 30, 1),
      session('2026-05-01T08:00:00Z', 999, 9), // out of 7-day range
    ]
    const buckets = buildDailyBuckets(sessions, 7, NOW)
    const today = buckets[6]
    expect(today.secs).toBe(180)
    expect(today.advancement).toBe(5)
    const jun5 = buckets.find((b) => b.dateKey === '2026-06-05')!
    expect(jun5.secs).toBe(30)
    const total = buckets.reduce((s, b) => s + b.secs, 0)
    expect(total).toBe(210) // the May session is excluded
  })
})

describe('computePracticeMetrics', () => {
  it('aggregates today, week, averages and totals', () => {
    const sessions = [
      session('2026-06-07T09:00:00Z', 120, 3),  // today
      session('2026-06-06T09:00:00Z', 60, 2),   // within week
      session('2026-05-20T09:00:00Z', 600, 10), // older than a week
    ]
    const m = computePracticeMetrics(sessions, NOW)
    expect(m.todaySecs).toBe(120)
    expect(m.todayAdvancement).toBe(3)
    expect(m.weekSecs).toBe(180)
    expect(m.weekAdvancement).toBe(5)
    expect(m.avgDailySecs7d).toBe(Math.round(180 / 7))
    expect(m.totalSecs).toBe(780)
    expect(m.totalAdvancement).toBe(15)
    expect(m.sessionCount).toBe(3)
  })

  it('returns zeroed metrics for no sessions', () => {
    const m = computePracticeMetrics([], NOW)
    expect(m).toMatchObject({ todaySecs: 0, weekSecs: 0, totalSecs: 0, currentConsistencyDays: 0 })
  })
})

describe('currentConsistency', () => {
  it('counts consecutive days ending today', () => {
    const sessions = [
      session('2026-06-07T09:00:00Z', 60, 1),
      session('2026-06-06T09:00:00Z', 60, 1),
      session('2026-06-05T09:00:00Z', 60, 1),
    ]
    expect(currentConsistency(sessions, NOW)).toBe(3)
  })

  it('anchors on yesterday when today is idle', () => {
    const sessions = [
      session('2026-06-06T09:00:00Z', 60, 1),
      session('2026-06-05T09:00:00Z', 60, 1),
    ]
    expect(currentConsistency(sessions, NOW)).toBe(2)
  })

  it('is 0 when neither today nor yesterday is active', () => {
    const sessions = [session('2026-06-04T09:00:00Z', 60, 1)]
    expect(currentConsistency(sessions, NOW)).toBe(0)
  })
})

describe('longestConsistency', () => {
  it('finds the longest consecutive run', () => {
    const sessions = [
      session('2026-06-01T09:00:00Z', 60, 1),
      session('2026-06-02T09:00:00Z', 60, 1),
      session('2026-06-03T09:00:00Z', 60, 1),
      // gap on the 4th
      session('2026-06-05T09:00:00Z', 60, 1),
      session('2026-06-06T09:00:00Z', 60, 1),
    ]
    expect(longestConsistency(sessions)).toBe(3)
  })

  it('handles multiple sessions on the same day as one day', () => {
    const sessions = [
      session('2026-06-01T09:00:00Z', 60, 1),
      session('2026-06-01T10:00:00Z', 60, 1),
    ]
    expect(longestConsistency(sessions)).toBe(1)
  })
})

describe('distributionByActivity', () => {
  it('groups by activity, computes time share, sorts by time desc', () => {
    const sessions = [
      session('2026-06-07T09:00:00Z', 300, 5, 'speed-game'),
      session('2026-06-07T08:00:00Z', 100, 2, 'daily-challenge'),
    ]
    const dist = distributionByActivity(sessions)
    expect(dist[0].activity).toBe('speed-game')
    expect(dist[0].pct).toBe(75)
    expect(dist[1].activity).toBe('daily-challenge')
    expect(dist[1].pct).toBe(25)
    expect(dist[0].label).toBe('Speed Practice')
  })

  it('returns empty for no sessions', () => {
    expect(distributionByActivity([])).toEqual([])
  })
})

describe('withRollingAverage', () => {
  it('computes a trailing-window average', () => {
    const buckets = buildDailyBuckets(
      [
        session('2026-06-05T09:00:00Z', 60, 0),
        session('2026-06-06T09:00:00Z', 120, 0),
        session('2026-06-07T09:00:00Z', 180, 0),
      ],
      3,
      NOW,
    )
    const rolled = withRollingAverage(buckets, 'secs', 3)
    expect(rolled[0].avg).toBe(60) // only itself in window
    expect(rolled[1].avg).toBe(90) // (60+120)/2
    expect(rolled[2].avg).toBe(120) // (60+120+180)/3
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(59)).toBe('1m')
    expect(formatDuration(480)).toBe('8m')
    expect(formatDuration(3900)).toBe('1h 5m')
    expect(formatDuration(7200)).toBe('2h')
  })
})

describe('getMasteryProgress', () => {
  function item(exposureCount: number, archived = false): VocabItem {
    return { exposureCount, archived } as unknown as VocabItem
  }

  it('computes totalPossible, earned, remaining and percent', () => {
    const items = [item(8), item(4), item(0)]
    const mp = getMasteryProgress(items)
    expect(mp.wordCount).toBe(3)
    expect(mp.totalPossible).toBe(24)
    expect(mp.earned).toBe(12)
    expect(mp.remaining).toBe(12)
    expect(mp.percent).toBe(50)
  })

  it('caps per-word exposure at 8 and excludes archived words', () => {
    const items = [item(20), item(8, true)]
    const mp = getMasteryProgress(items)
    expect(mp.wordCount).toBe(1)
    expect(mp.totalPossible).toBe(8)
    expect(mp.earned).toBe(8)
    expect(mp.percent).toBe(100)
  })

  it('returns zero percent for an empty library', () => {
    const mp = getMasteryProgress([])
    expect(mp).toMatchObject({ totalPossible: 0, earned: 0, percent: 0 })
  })
})
