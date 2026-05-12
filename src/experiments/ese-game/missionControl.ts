import { PhraseUpgradePrompt, SentenceRepairPrompt } from './sampleData'
import { StarterPackMissionWord } from './starterPackVocabulary'

export type MissionDifficultyFilter = 'Any' | 'B2' | 'C1'
export type MissionModeId = 'sentence-repair' | 'phrase-upgrade'

export interface MissionWordProgress {
  attempts: number
  correct: number
  modes: Partial<Record<MissionModeId, number>>
}

export interface Mission {
  id: string
  title: string
  theme: string
  difficulty: MissionDifficultyFilter
  targetCount: number
  estimatedMinutes: number
  vocabularyIds: string[]
  createdAt: string
  progress: Record<string, MissionWordProgress>
}

export interface MissionFilters {
  theme: string
  difficulty: MissionDifficultyFilter
}

export interface MissionControlState {
  activeMission: Mission | null
  filters: MissionFilters
}

export interface MissionAnswer {
  sourceWordId?: string
  isCorrect: boolean
}

export const DEFAULT_MISSION_FILTERS: MissionFilters = {
  theme: 'Any',
  difficulty: 'Any',
}

export const DEFAULT_MISSION_CONTROL_STATE: MissionControlState = {
  activeMission: null,
  filters: DEFAULT_MISSION_FILTERS,
}

const MIN_MISSION_WORDS = 8
const DEFAULT_MISSION_WORDS = 10
const MAX_MISSION_WORDS = 15

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function matchesFilters(word: StarterPackMissionWord, filters: MissionFilters): boolean {
  const themeMatches = filters.theme === 'Any' || word.packTheme === filters.theme
  const difficultyMatches = filters.difficulty === 'Any' || word.difficulty === filters.difficulty

  return themeMatches && difficultyMatches
}

function canPractice(word: StarterPackMissionWord): boolean {
  return Boolean(word.exampleSentence && word.definitionEn)
}

export function getMissionThemes(words: StarterPackMissionWord[]): string[] {
  return ['Any', ...uniq(words.map((word) => word.packTheme)).sort()]
}

export function createMission(
  words: StarterPackMissionWord[],
  filters: MissionFilters,
): Mission | null {
  const filteredWords = words.filter((word) => canPractice(word) && matchesFilters(word, filters))
  const fallbackWords = words.filter(canPractice)
  const sourceWords = filteredWords.length >= MIN_MISSION_WORDS ? filteredWords : fallbackWords
  const vocabulary = shuffle(sourceWords).slice(
    0,
    Math.min(MAX_MISSION_WORDS, Math.max(MIN_MISSION_WORDS, DEFAULT_MISSION_WORDS)),
  )

  if (vocabulary.length < MIN_MISSION_WORDS) {
    return null
  }

  const theme = filters.theme === 'Any' ? vocabulary[0].packTheme : filters.theme
  const difficulty = filters.difficulty
  const today = new Date().toISOString()

  return {
    id: `mission-${slug(theme)}-${Date.now()}`,
    title: `${theme} Mission`,
    theme,
    difficulty,
    targetCount: vocabulary.length,
    estimatedMinutes: Math.max(4, Math.ceil(vocabulary.length * 0.7)),
    vocabularyIds: vocabulary.map((word) => word.id),
    createdAt: today,
    progress: {},
  }
}

export function getMissionVocabulary(
  mission: Mission | null,
  words: StarterPackMissionWord[],
): StarterPackMissionWord[] {
  if (!mission) {
    return []
  }

  const missionIds = new Set(mission.vocabularyIds)
  return words.filter((word) => missionIds.has(word.id))
}

export function getMissionProgress(mission: Mission | null): {
  attemptedCount: number
  masteredCount: number
  percent: number
} {
  if (!mission) {
    return {
      attemptedCount: 0,
      masteredCount: 0,
      percent: 0,
    }
  }

  const progressEntries = mission.vocabularyIds.map((id) => mission.progress[id])
  const attemptedCount = progressEntries.filter((entry) => entry?.attempts > 0).length
  const masteredCount = progressEntries.filter((entry) => entry?.correct > 0).length

  return {
    attemptedCount,
    masteredCount,
    percent: Math.round((masteredCount / mission.targetCount) * 100),
  }
}

export function recordMissionAnswers(
  mission: Mission | null,
  mode: MissionModeId,
  answers: MissionAnswer[],
): Mission | null {
  if (!mission) {
    return mission
  }

  const missionIds = new Set(mission.vocabularyIds)
  const nextProgress = { ...mission.progress }

  answers.forEach((answer) => {
    if (!answer.sourceWordId || !missionIds.has(answer.sourceWordId)) {
      return
    }

    const current = nextProgress[answer.sourceWordId] ?? {
      attempts: 0,
      correct: 0,
      modes: {},
    }

    nextProgress[answer.sourceWordId] = {
      attempts: current.attempts + 1,
      correct: current.correct + (answer.isCorrect ? 1 : 0),
      modes: {
        ...current.modes,
        [mode]: (current.modes[mode] ?? 0) + 1,
      },
    }
  })

  return {
    ...mission,
    progress: nextProgress,
  }
}

export function sampleMissionPrompts<TPrompt extends SentenceRepairPrompt | PhraseUpgradePrompt>(
  prompts: TPrompt[],
  mission: Mission | null,
  count: number,
): TPrompt[] {
  if (!mission) {
    return shuffle(prompts).slice(0, count)
  }

  const missionIds = new Set(mission.vocabularyIds)
  const missionPrompts = shuffle(
    prompts.filter((prompt) => prompt.sourceWordId && missionIds.has(prompt.sourceWordId)),
  )
  const fallbackPrompts = shuffle(
    prompts.filter((prompt) => !prompt.sourceWordId || !missionIds.has(prompt.sourceWordId)),
  )

  return [...missionPrompts, ...fallbackPrompts].slice(0, count)
}
