import { VocabItem, ItemStatus, UsageLog } from '@/types/vocabulary'
import { MASTERY_RECALLS, MASTERY_USES } from '@/lib/constants'

/**
 * Count the number of valid usage log entries.
 * Phase-5 and earlier logs have `channel`; Phase-6+ logs have `context`.
 * A log is valid (counts as one real-life use) when it has at least one of
 * those fields.  This keeps old seed data and imported packs working unchanged.
 */
export function usagePoints(logs: UsageLog[]): number {
  return logs.filter((l) => l.channel !== undefined || l.context !== undefined).length
}

export function meetsUsageThreshold(logs: UsageLog[]): boolean {
  return usagePoints(logs) >= MASTERY_USES
}

export function isMastered(item: VocabItem): boolean {
  return (
    item.review.successfulRecalls >= MASTERY_RECALLS &&
    item.review.sentenceProduced &&
    meetsUsageThreshold(item.activation.usageLogs)
  )
}

export function deriveStatus(item: VocabItem): ItemStatus {
  if (isMastered(item)) return 'mastered'

  if (item.activation.usageLogs.length > 0 || item.status === 'activation') {
    return 'activation'
  }

  if (item.review.successfulRecalls >= 3) return 'stable'
  if (item.review.reviewCount > 0 || item.definitionEn) return 'learning'
  return 'inbox'
}

export function progressTowardMastery(item: VocabItem): {
  recalls: { done: number; needed: number }
  sentence: boolean
  uses: { done: number; needed: number }
} {
  return {
    recalls: { done: Math.min(item.review.successfulRecalls, MASTERY_RECALLS), needed: MASTERY_RECALLS },
    sentence: item.review.sentenceProduced,
    uses: { done: Math.min(usagePoints(item.activation.usageLogs), MASTERY_USES), needed: MASTERY_USES },
  }
}
