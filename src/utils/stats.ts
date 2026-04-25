/**
 * src/utils/stats.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility functions for computing StatsPage metrics.
 * No React or store imports — everything takes plain data and returns plain data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { VocabItem } from '@/types/vocabulary'
import { isDueChallengeNow } from '@/lib/challengeSchedule'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DayActivity {
  dateKey: string   // YYYY-MM-DD
  label: string     // 'Apr 25'
  shortLabel: string // '25'
  points: number
  uses: number
}

export interface DueProjection {
  now: number
  oneDay: number
  threeDays: number
  oneWeek: number
}

export interface BreakdownRow {
  label: string
  count: number
  pct: number
  color: string
}

export interface GoalProgress {
  pct: number
  remaining: number
  weeksLeft: number
  paceNeeded: number   // mastered per week needed to hit goal
  onTrack: boolean
}

export interface Insight {
  type: 'info' | 'warn' | 'success'
  text: string
}

// ── Daily activity (last N days) ──────────────────────────────────────────────

export function getDailyActivity(
  items: VocabItem[],
  pointsHistory: Record<string, number>,
  days = 30,
): DayActivity[] {
  const allLogs = items.flatMap((i) => i.activation.usageLogs)

  return Array.from({ length: days }, (_, i) => {
    const day = subDays(new Date(), days - 1 - i)
    const dateKey = day.toISOString().slice(0, 10)
    const start = startOfDay(day)
    const end = endOfDay(day)
    const uses = allLogs.filter((l) => {
      const t = new Date(l.usedAt)
      return t >= start && t <= end
    }).length
    return {
      dateKey,
      label: format(day, 'MMM d'),
      shortLabel: format(day, 'd'),
      points: pointsHistory[dateKey] ?? 0,
      uses,
    }
  })
}

// ── Exposure distribution (buckets 0–8) ───────────────────────────────────────

export function getExposureDistribution(items: VocabItem[]): number[] {
  const dist = Array<number>(9).fill(0)
  for (const item of items) {
    const e = Math.min(item.exposureCount ?? 0, 8)
    dist[e]++
  }
  return dist
}

// ── Due projections ───────────────────────────────────────────────────────────

export function getDueProjection(items: VocabItem[]): DueProjection {
  const now = Date.now()
  const D1 = 1 * 24 * 60 * 60 * 1000
  const D3 = 3 * 24 * 60 * 60 * 1000
  const D7 = 7 * 24 * 60 * 60 * 1000

  const proj: DueProjection = { now: 0, oneDay: 0, threeDays: 0, oneWeek: 0 }
  for (const item of items) {
    if ((item.exposureCount ?? 0) >= 8) continue
    const due = item.nextChallengeDate ? new Date(item.nextChallengeDate).getTime() : 0
    if (due <= now) proj.now++
    else if (due <= now + D1) proj.oneDay++
    else if (due <= now + D3) proj.threeDays++
    else if (due <= now + D7) proj.oneWeek++
  }
  return proj
}

// ── Category breakdowns ───────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  word: '#818cf8',
  phrase: '#34d399',
  chunk: '#fb923c',
}

const POS_COLORS = [
  '#818cf8', '#34d399', '#fb923c', '#f472b6', '#60a5fa',
  '#a78bfa', '#4ade80', '#fbbf24', '#f87171', '#38bdf8',
]

export function getTypeBreakdown(items: VocabItem[]): BreakdownRow[] {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.type, (map.get(item.type) ?? 0) + 1)
  }
  const total = items.length || 1
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count,
      pct: Math.round((count / total) * 100),
      color: TYPE_COLORS[label] ?? '#94a3b8',
    }))
    .sort((a, b) => b.count - a.count)
}

export function getPartOfSpeechBreakdown(items: VocabItem[]): BreakdownRow[] {
  const map = new Map<string, number>()
  for (const item of items) {
    if (item.partOfSpeech) {
      const pos = item.partOfSpeech.trim()
      map.set(pos, (map.get(pos) ?? 0) + 1)
    }
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1
  return Array.from(map.entries())
    .map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      color: POS_COLORS[i % POS_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

// ── Weekly items added (last N weeks) ─────────────────────────────────────────

export function getWeeklyAdded(items: VocabItem[], weeks = 8): { label: string; count: number }[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = subDays(new Date(), (weeks - 1 - i) * 7 + 6)
    const weekEnd = subDays(new Date(), (weeks - 1 - i) * 7)
    const count = items.filter((item) => {
      const d = new Date(item.createdAt)
      return d >= startOfDay(weekStart) && d <= endOfDay(weekEnd)
    }).length
    return { label: format(weekEnd, 'MMM d'), count }
  })
}

// ── Goal progress ─────────────────────────────────────────────────────────────

export function getGoalProgress(
  masteredCount: number,
  target: number,
  deadline: string,
): GoalProgress {
  const msLeft = new Date(deadline).getTime() - Date.now()
  const weeksLeft = Math.max(0, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)))
  const remaining = Math.max(0, target - masteredCount)
  const pct = Math.min(100, target > 0 ? Math.round((masteredCount / target) * 100) : 0)
  const paceNeeded = weeksLeft > 0 ? Math.ceil(remaining / weeksLeft) : remaining
  // "on track" if you only need ≤ 3 mastered/week
  return { pct, remaining, weeksLeft, paceNeeded, onTrack: paceNeeded <= 3 }
}

// ── Actionable insights ───────────────────────────────────────────────────────

export function getInsights(
  items: VocabItem[],
  gamification: { streakDays: number; challengeCompletions: number; points: number },
  usesThisWeek: number,
): Insight[] {
  const insights: Insight[] = []
  const inboxCount    = items.filter((i) => i.status === 'inbox').length
  const dueNow        = items.filter((i) => isDueChallengeNow(i.exposureCount, i.nextChallengeDate)).length
  const { streakDays, challengeCompletions, points } = gamification

  if (dueNow > 0) {
    insights.push({
      type: 'warn',
      text: `${dueNow} word${dueNow !== 1 ? 's are' : ' is'} ready for the next challenge step — open Daily Challenge now.`,
    })
  }

  if (inboxCount > 20) {
    insights.push({
      type: 'info',
      text: `${inboxCount} words are still in Inbox. Enrich a few today to start the spaced-repetition clock.`,
    })
  }

  if (usesThisWeek === 0) {
    insights.push({
      type: 'warn',
      text: `No real-life uses logged this week — try to drop one new word into a conversation or email today.`,
    })
  }

  if (streakDays >= 1 && streakDays < 7) {
    const need = 7 - streakDays
    insights.push({
      type: 'info',
      text: `${streakDays}-day streak! ${need} more day${need !== 1 ? 's' : ''} to unlock the Week Warrior badge ⚔️`,
    })
  }

  if (streakDays >= 7) {
    insights.push({ type: 'success', text: `7-day streak active — you're on fire! 🔥` })
  }

  if (challengeCompletions >= 1 && challengeCompletions < 10) {
    insights.push({
      type: 'info',
      text: `${10 - challengeCompletions} more challenge${10 - challengeCompletions !== 1 ? 's' : ''} to unlock the Early Bird badge 🐦`,
    })
  }

  if (points > 0 && points < 100) {
    insights.push({
      type: 'info',
      text: `${100 - points} more points to reach the Century badge 💯 — keep answering correctly.`,
    })
  }

  return insights.slice(0, 3)
}
