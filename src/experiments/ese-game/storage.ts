import { SENTENCE_REPAIR_PROGRESS_KEY } from './constants'

export interface SentenceRepairProgress {
  totalRuns: number
  bestScore: number
  bestStreak: number
}

export const DEFAULT_SENTENCE_REPAIR_PROGRESS: SentenceRepairProgress = {
  totalRuns: 0,
  bestScore: 0,
  bestStreak: 0,
}

function isProgress(value: unknown): value is SentenceRepairProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const progress = value as Record<string, unknown>
  return (
    typeof progress.totalRuns === 'number' &&
    typeof progress.bestScore === 'number' &&
    typeof progress.bestStreak === 'number'
  )
}

export function loadSentenceRepairProgress(): SentenceRepairProgress {
  const raw = localStorage.getItem(SENTENCE_REPAIR_PROGRESS_KEY)
  if (!raw) {
    return DEFAULT_SENTENCE_REPAIR_PROGRESS
  }

  try {
    const parsed = JSON.parse(raw)
    return isProgress(parsed) ? parsed : DEFAULT_SENTENCE_REPAIR_PROGRESS
  } catch {
    return DEFAULT_SENTENCE_REPAIR_PROGRESS
  }
}

export function saveSentenceRepairProgress(
  progress: SentenceRepairProgress,
): SentenceRepairProgress {
  localStorage.setItem(SENTENCE_REPAIR_PROGRESS_KEY, JSON.stringify(progress))
  return progress
}
