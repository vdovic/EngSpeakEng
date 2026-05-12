import { PHRASE_UPGRADE_PROGRESS_KEY, SENTENCE_REPAIR_PROGRESS_KEY } from './constants'

export interface SentenceRepairProgress {
  totalRuns: number
  bestScore: number
  bestStreak: number
}

export interface PhraseUpgradeProgress {
  totalRuns: number
  bestScore: number
  bestStreak: number
}

export const DEFAULT_SENTENCE_REPAIR_PROGRESS: SentenceRepairProgress = {
  totalRuns: 0,
  bestScore: 0,
  bestStreak: 0,
}

export const DEFAULT_PHRASE_UPGRADE_PROGRESS: PhraseUpgradeProgress = {
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

function isPhraseUpgradeProgress(value: unknown): value is PhraseUpgradeProgress {
  return isProgress(value)
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

export function loadPhraseUpgradeProgress(): PhraseUpgradeProgress {
  const raw = localStorage.getItem(PHRASE_UPGRADE_PROGRESS_KEY)
  if (!raw) {
    return DEFAULT_PHRASE_UPGRADE_PROGRESS
  }

  try {
    const parsed = JSON.parse(raw)
    return isPhraseUpgradeProgress(parsed) ? parsed : DEFAULT_PHRASE_UPGRADE_PROGRESS
  } catch {
    return DEFAULT_PHRASE_UPGRADE_PROGRESS
  }
}

export function savePhraseUpgradeProgress(
  progress: PhraseUpgradeProgress,
): PhraseUpgradeProgress {
  localStorage.setItem(PHRASE_UPGRADE_PROGRESS_KEY, JSON.stringify(progress))
  return progress
}
