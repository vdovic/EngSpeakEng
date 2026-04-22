import { ReviewOutcome } from '@/types/vocabulary'
import { addDays, startOfDay } from 'date-fns'

const INTERVALS = [0, 1, 3, 7, 14, 30, 60]

function nextIntervalIndex(currentDays: number, outcome: ReviewOutcome): number {
  let idx = -1
  for (let i = INTERVALS.length - 1; i >= 0; i--) {
    if (INTERVALS[i] <= currentDays) { idx = i; break }
  }
  const current = idx < 0 ? 0 : idx

  switch (outcome) {
    case 'again': return 0
    case 'hard':  return Math.max(0, current - 1)
    case 'good':  return Math.min(INTERVALS.length - 1, current + 1)
    case 'easy':  return Math.min(INTERVALS.length - 1, current + 2)
  }
}

export function calculateNextReview(
  currentIntervalDays: number,
  currentEase: number,
  outcome: ReviewOutcome
): { nextReviewAt: string; intervalDays: number; ease: number } {
  const easeDelta: Record<ReviewOutcome, number> = {
    again: -0.2,
    hard: -0.15,
    good: 0,
    easy: 0.15,
  }

  const newEase = Math.max(1.3, Math.min(3.0, currentEase + easeDelta[outcome]))
  const newIdx = nextIntervalIndex(currentIntervalDays, outcome)
  const newInterval = INTERVALS[newIdx]
  const nextReviewAt = addDays(startOfDay(new Date()), newInterval).toISOString()

  return { nextReviewAt, intervalDays: newInterval, ease: newEase }
}

export function isDueToday(nextReviewAt: string | undefined): boolean {
  if (!nextReviewAt) return true
  return new Date(nextReviewAt) <= new Date()
}

export function isWeak(ease: number, reviewCount: number): boolean {
  return reviewCount >= 2 && ease < 1.8
}
