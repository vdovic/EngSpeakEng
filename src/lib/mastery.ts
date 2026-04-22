import { VocabItem, ItemStatus, UsageLog } from '@/types/vocabulary'

const MASTERY_RECALLS = 3
const MASTERY_USES = 3

export function usagePoints(logs: UsageLog[]): number {
  return logs.reduce((sum, l) => sum + (l.channel === 'speaking' || l.channel === 'writing' ? 1 : 0), 0)
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
