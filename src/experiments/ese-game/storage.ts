import {
  DAILY_TRAINING_SESSION_KEY,
  MISSION_CONTROL_STATE_KEY,
  PHRASE_UPGRADE_PROGRESS_KEY,
  RECALL_CHALLENGE_PROGRESS_KEY,
  SENTENCE_REPAIR_PROGRESS_KEY,
} from './constants'
import {
  DEFAULT_MISSION_CONTROL_STATE,
  MissionControlState,
} from './missionControl'

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

export interface RecallChallengeProgress {
  totalRuns: number
  bestScore: number
  bestStreak: number
}

export interface DailyTrainingSessionSummary {
  completedAt: string
  missionId: string | null
  missionTitle: string
  totalScore: number
  totalPrompts: number
  wordsPracticed: string[]
  weakWords: string[]
  strongestWords: string[]
  recommendedNextMission: string
  insight: string
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

export const DEFAULT_RECALL_CHALLENGE_PROGRESS: RecallChallengeProgress = {
  totalRuns: 0,
  bestScore: 0,
  bestStreak: 0,
}

export const DEFAULT_DAILY_TRAINING_SESSION_SUMMARY: DailyTrainingSessionSummary | null = null

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

function isRecallChallengeProgress(value: unknown): value is RecallChallengeProgress {
  return isProgress(value)
}

function isMissionControlState(value: unknown): value is MissionControlState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Record<string, unknown>
  if (!state.filters || typeof state.filters !== 'object') {
    return false
  }

  if (state.activeMission !== null && typeof state.activeMission !== 'object') {
    return false
  }

  return true
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isDailyTrainingSessionSummary(
  value: unknown,
): value is DailyTrainingSessionSummary {
  if (!value || typeof value !== 'object') {
    return false
  }

  const summary = value as Record<string, unknown>
  return (
    typeof summary.completedAt === 'string' &&
    (typeof summary.missionId === 'string' || summary.missionId === null) &&
    typeof summary.missionTitle === 'string' &&
    typeof summary.totalScore === 'number' &&
    typeof summary.totalPrompts === 'number' &&
    isStringArray(summary.wordsPracticed) &&
    isStringArray(summary.weakWords) &&
    isStringArray(summary.strongestWords) &&
    typeof summary.recommendedNextMission === 'string' &&
    typeof summary.insight === 'string'
  )
}

function normalizeMissionControlState(state: MissionControlState): MissionControlState {
  const activeMission = state.activeMission &&
    'composition' in state.activeMission &&
    'migrationVocab' in state.activeMission.composition
    ? state.activeMission
    : null

  return {
    ...DEFAULT_MISSION_CONTROL_STATE,
    ...state,
    activeMission,
    filters: {
      ...DEFAULT_MISSION_CONTROL_STATE.filters,
      ...(state.filters ?? {}),
    },
    wordStats: state.wordStats ?? {},
    recentRuns: Array.isArray(state.recentRuns) ? state.recentRuns : [],
  }
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

export function loadRecallChallengeProgress(): RecallChallengeProgress {
  const raw = localStorage.getItem(RECALL_CHALLENGE_PROGRESS_KEY)
  if (!raw) {
    return DEFAULT_RECALL_CHALLENGE_PROGRESS
  }

  try {
    const parsed = JSON.parse(raw)
    return isRecallChallengeProgress(parsed) ? parsed : DEFAULT_RECALL_CHALLENGE_PROGRESS
  } catch {
    return DEFAULT_RECALL_CHALLENGE_PROGRESS
  }
}

export function saveRecallChallengeProgress(
  progress: RecallChallengeProgress,
): RecallChallengeProgress {
  localStorage.setItem(RECALL_CHALLENGE_PROGRESS_KEY, JSON.stringify(progress))
  return progress
}

export function loadMissionControlState(): MissionControlState {
  const raw = localStorage.getItem(MISSION_CONTROL_STATE_KEY)
  if (!raw) {
    return DEFAULT_MISSION_CONTROL_STATE
  }

  try {
    const parsed = JSON.parse(raw)
    return isMissionControlState(parsed)
      ? normalizeMissionControlState(parsed)
      : DEFAULT_MISSION_CONTROL_STATE
  } catch {
    return DEFAULT_MISSION_CONTROL_STATE
  }
}

export function saveMissionControlState(
  state: MissionControlState,
): MissionControlState {
  localStorage.setItem(MISSION_CONTROL_STATE_KEY, JSON.stringify(state))
  return state
}

export function loadDailyTrainingSessionSummary(): DailyTrainingSessionSummary | null {
  const raw = localStorage.getItem(DAILY_TRAINING_SESSION_KEY)
  if (!raw) {
    return DEFAULT_DAILY_TRAINING_SESSION_SUMMARY
  }

  try {
    const parsed = JSON.parse(raw)
    return isDailyTrainingSessionSummary(parsed)
      ? parsed
      : DEFAULT_DAILY_TRAINING_SESSION_SUMMARY
  } catch {
    return DEFAULT_DAILY_TRAINING_SESSION_SUMMARY
  }
}

export function saveDailyTrainingSessionSummary(
  summary: DailyTrainingSessionSummary,
): DailyTrainingSessionSummary {
  localStorage.setItem(DAILY_TRAINING_SESSION_KEY, JSON.stringify(summary))
  return summary
}
