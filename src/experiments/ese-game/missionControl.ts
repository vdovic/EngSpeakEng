import { PhraseUpgradePrompt, SentenceRepairPrompt } from './sampleData'
import { RecallPrompt } from './recallChallenge'
import { StarterPackMissionWord } from './starterPackVocabulary'

export type MissionDifficultyFilter = 'Any' | 'B2' | 'C1'
export type MissionCategoryFilter =
  | 'Any'
  | 'business'
  | 'meetings'
  | 'email'
  | 'fluency'
  | 'phrasal verbs'
  | 'chunks'
  | 'phrases'
export type MissionStyle = 'themed' | 'mixed' | 'challenge'
export type MissionModeId = 'sentence-repair' | 'phrase-upgrade' | 'recall-challenge'

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
  category: MissionCategoryFilter
  style: MissionStyle
  targetCount: number
  estimatedMinutes: number
  vocabularyIds: string[]
  createdAt: string
  composition: {
    b2: number
    c1: number
    words: number
    phrases: number
    chunks: number
    weak: number
    business: number
    meetings: number
    email: number
    fluency: number
    phrasalVerbs: number
    starterPack: number
    migrationVocab: number
  }
  progress: Record<string, MissionWordProgress>
}

export interface MissionFilters {
  theme: string
  difficulty: MissionDifficultyFilter
  category: MissionCategoryFilter
  style: MissionStyle
  focusWeakAreas: boolean
}

export interface MissionControlState {
  activeMission: Mission | null
  filters: MissionFilters
  wordStats: Record<string, MissionWordProgress>
  recentRuns: {
    score: number
    total: number
    completedAt: string
  }[]
}

export interface MissionAnswer {
  sourceWordId?: string
  isCorrect: boolean
  score?: number
}

export interface MissionSelectionContext {
  focusTermKeys?: Set<string>
  eligibleTermKeys?: Set<string>
}

export const DEFAULT_MISSION_FILTERS: MissionFilters = {
  theme: 'Any',
  difficulty: 'Any',
  category: 'Any',
  style: 'themed',
  focusWeakAreas: false,
}

export const DEFAULT_MISSION_CONTROL_STATE: MissionControlState = {
  activeMission: null,
  filters: DEFAULT_MISSION_FILTERS,
  wordStats: {},
  recentRuns: [],
}

const MIN_MISSION_WORDS = 8
const DEFAULT_MISSION_WORDS = 10
const MAX_MISSION_WORDS = 14
const MASTERED_ATTEMPTS = 3
const WEAK_ACCURACY_THRESHOLD = 0.65

export const MISSION_CATEGORIES: MissionCategoryFilter[] = [
  'Any',
  'business',
  'meetings',
  'email',
  'fluency',
  'phrasal verbs',
  'chunks',
  'phrases',
]

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function normalizeMissionTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function getAccuracy(progress?: MissionWordProgress): number {
  if (!progress?.attempts) {
    return 0
  }

  return progress.correct / progress.attempts
}

function isWeak(progress?: MissionWordProgress): boolean {
  return Boolean(progress?.attempts && getAccuracy(progress) < WEAK_ACCURACY_THRESHOLD)
}

function isMastered(progress?: MissionWordProgress): boolean {
  return Boolean(
    progress &&
      progress.attempts >= MASTERED_ATTEMPTS &&
      progress.correct >= 2 &&
      getAccuracy(progress) >= 0.8,
  )
}

function canPractice(word: StarterPackMissionWord): boolean {
  return Boolean((word.workSentence || word.exampleSentence) && word.definitionEn && word.qualityScore >= 6)
}

function matchesFilters(word: StarterPackMissionWord, filters: MissionFilters): boolean {
  const themeMatches = filters.theme === 'Any' || word.packTheme === filters.theme
  const difficultyMatches = filters.difficulty === 'Any' || word.difficulty === filters.difficulty
  const categoryMatches =
    filters.category === 'Any' || word.categories.includes(filters.category)

  return themeMatches && difficultyMatches && categoryMatches
}

function getWeightedScore(
  word: StarterPackMissionWord,
  filters: MissionFilters,
  stats: Record<string, MissionWordProgress>,
): number {
  const progress = stats[word.id]
  const incorrect = progress ? progress.attempts - progress.correct : 0
  let score = Math.random()

  if (filters.focusWeakAreas || filters.style === 'challenge') {
    score += isWeak(progress) ? 5 : 0
  }
  score += incorrect * (filters.focusWeakAreas ? 1.2 : 0.7)
  if (!progress?.attempts) {
    score += filters.focusWeakAreas ? 0.25 : 1.3
  }
  if (progress?.attempts && !isWeak(progress)) {
    score += 0.35
  }
  if (isMastered(progress)) {
    score -= filters.focusWeakAreas ? 4 : 2.25
  }
  if (filters.style === 'challenge' && word.difficulty === 'C1') {
    score += 1.5
  }
  if (filters.style === 'mixed') {
    score += word.categories.length * 0.15
  }
  score += Math.min(word.qualityScore, 10) * 0.08

  return score
}

function scoreWords(
  words: StarterPackMissionWord[],
  filters: MissionFilters,
  stats: Record<string, MissionWordProgress>,
): StarterPackMissionWord[] {
  return words
    .map((word) => ({
      word,
      score: getWeightedScore(word, filters, stats),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.word)
}

function diversifyWords(words: StarterPackMissionWord[], targetCount: number): StarterPackMissionWord[] {
  const selected: StarterPackMissionWord[] = []
  const seenTerms = new Set<string>()
  const categoryUse = new Map<string, number>()

  for (const word of words) {
    const termKey = word.term.toLowerCase()
    const primaryCategory = word.categories[0] ?? 'business'
    const categoryCount = categoryUse.get(primaryCategory) ?? 0

    if (seenTerms.has(termKey) || categoryCount >= 4) {
      continue
    }

    selected.push(word)
    seenTerms.add(termKey)
    categoryUse.set(primaryCategory, categoryCount + 1)

    if (selected.length >= targetCount) {
      return selected
    }
  }

  for (const word of words) {
    if (selected.some((selectedWord) => selectedWord.id === word.id)) {
      continue
    }
    selected.push(word)
    if (selected.length >= targetCount) {
      break
    }
  }

  return selected
}

function pickMissionWords(
  words: StarterPackMissionWord[],
  filters: MissionFilters,
  stats: Record<string, MissionWordProgress>,
  context: MissionSelectionContext = {},
): StarterPackMissionWord[] {
  const filteredWords = words.filter((word) => canPractice(word) && matchesFilters(word, filters))
  const fallbackWords = words.filter(canPractice)
  const sourceWords = filteredWords.length >= MIN_MISSION_WORDS ? filteredWords : fallbackWords
  const targetCount = Math.min(
    MAX_MISSION_WORDS,
    Math.max(MIN_MISSION_WORDS, filters.style === 'challenge' ? 12 : DEFAULT_MISSION_WORDS),
  )

  const focusTermKeys = context.focusTermKeys ?? new Set<string>()
  const eligibleTermKeys = context.eligibleTermKeys ?? new Set<string>()
  const focusWords: StarterPackMissionWord[] = []
  const eligibleWords: StarterPackMissionWord[] = []
  const genericWords: StarterPackMissionWord[] = []

  for (const word of sourceWords) {
    const termKey = normalizeMissionTerm(word.term)
    if (focusTermKeys.has(termKey)) {
      focusWords.push(word)
    } else if (eligibleTermKeys.has(termKey)) {
      eligibleWords.push(word)
    } else {
      genericWords.push(word)
    }
  }

  const scoredWords = [
    ...scoreWords(focusWords, filters, stats),
    ...scoreWords(eligibleWords, filters, stats),
    ...scoreWords(genericWords, filters, stats),
  ]

  return filters.style === 'mixed'
    ? diversifyWords(scoredWords, targetCount)
    : scoredWords.slice(0, targetCount)
}

function getComposition(
  vocabulary: StarterPackMissionWord[],
  stats: Record<string, MissionWordProgress>,
): Mission['composition'] {
  return {
    b2: vocabulary.filter((word) => word.difficulty === 'B2').length,
    c1: vocabulary.filter((word) => word.difficulty === 'C1').length,
    words: vocabulary.filter((word) => word.type === 'word').length,
    phrases: vocabulary.filter((word) => word.type === 'phrase').length,
    chunks: vocabulary.filter((word) => word.type === 'chunk').length,
    weak: vocabulary.filter((word) => isWeak(stats[word.id])).length,
    business: vocabulary.filter((word) => word.categories.includes('business')).length,
    meetings: vocabulary.filter((word) => word.categories.includes('meetings')).length,
    email: vocabulary.filter((word) => word.categories.includes('email')).length,
    fluency: vocabulary.filter((word) => word.categories.includes('fluency')).length,
    phrasalVerbs: vocabulary.filter((word) => word.categories.includes('phrasal verbs')).length,
    starterPack: vocabulary.filter((word) => word.source === 'starter-pack').length,
    migrationVocab: vocabulary.filter((word) => word.source === 'migration-vocab').length,
  }
}

function titleForMission(
  vocabulary: StarterPackMissionWord[],
  filters: MissionFilters,
): string {
  if (filters.focusWeakAreas) {
    return 'Weak Areas Mission'
  }
  if (filters.style === 'challenge') {
    return 'C1 Challenge Mission'
  }
  if (filters.style === 'mixed') {
    return 'Mixed Fluency Mission'
  }

  const label = filters.category !== 'Any'
    ? filters.category
    : filters.theme !== 'Any'
      ? filters.theme
      : vocabulary[0]?.packTheme ?? 'Full Library'

  return `${label.charAt(0).toUpperCase()}${label.slice(1)} Mission`
}

export function getMissionThemes(words: StarterPackMissionWord[]): string[] {
  return ['Any', ...uniq(words.map((word) => word.packTheme)).sort()]
}

export function getMissionCategoryCounts(words: StarterPackMissionWord[]): Record<string, number> {
  return words.reduce<Record<string, number>>((counts, word) => {
    word.categories.forEach((category) => {
      counts[category] = (counts[category] ?? 0) + 1
    })
    return counts
  }, {})
}

export function createMission(
  words: StarterPackMissionWord[],
  filters: MissionFilters,
  stats: Record<string, MissionWordProgress> = {},
  context: MissionSelectionContext = {},
): Mission | null {
  const vocabulary = pickMissionWords(words, filters, stats, context)

  if (vocabulary.length < MIN_MISSION_WORDS) {
    return null
  }

  const theme = filters.theme === 'Any' ? vocabulary[0].packTheme : filters.theme
  const difficulty = filters.difficulty
  const today = new Date().toISOString()

  return {
    id: `mission-${filters.style}-${slug(theme)}-${Date.now()}`,
    title: titleForMission(vocabulary, filters),
    theme,
    difficulty,
    category: filters.category,
    style: filters.style,
    targetCount: vocabulary.length,
    estimatedMinutes: Math.max(4, Math.ceil(vocabulary.length * 0.7)),
    vocabularyIds: vocabulary.map((word) => word.id),
    createdAt: today,
    composition: getComposition(vocabulary, stats),
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

  const byId = new Map(words.map((word) => [word.id, word]))
  return mission.vocabularyIds
    .map((id) => byId.get(id))
    .filter((word): word is StarterPackMissionWord => Boolean(word))
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
  const masteredCount = progressEntries.filter((entry) => isMastered(entry) || entry?.correct > 0).length

  return {
    attemptedCount,
    masteredCount,
    percent: Math.round((masteredCount / mission.targetCount) * 100),
  }
}

export function getProgressTrends(state: MissionControlState): {
  totalAttempts: number
  weakCount: number
  masteredCount: number
  recentAverage: number
  previousAverage: number
  trendLabel: 'New' | 'Improving' | 'Steady' | 'Needs focus'
} {
  const stats = Object.values(state.wordStats)
  const recentRuns = state.recentRuns.slice(-5)
  const previousRuns = state.recentRuns.slice(-10, -5)
  const total = recentRuns.reduce((sum, run) => sum + run.total, 0)
  const score = recentRuns.reduce((sum, run) => sum + run.score, 0)
  const previousTotal = previousRuns.reduce((sum, run) => sum + run.total, 0)
  const previousScore = previousRuns.reduce((sum, run) => sum + run.score, 0)
  const recentAverage = total ? Math.round((score / total) * 100) : 0
  const previousAverage = previousTotal ? Math.round((previousScore / previousTotal) * 100) : 0
  const trendLabel = !total
    ? 'New'
    : previousTotal && recentAverage >= previousAverage + 8
      ? 'Improving'
      : previousTotal && recentAverage <= previousAverage - 8
        ? 'Needs focus'
        : 'Steady'

  return {
    totalAttempts: stats.reduce((sum, entry) => sum + entry.attempts, 0),
    weakCount: stats.filter(isWeak).length,
    masteredCount: stats.filter(isMastered).length,
    recentAverage,
    previousAverage,
    trendLabel,
  }
}

export function recordMissionAnswers(
  state: MissionControlState,
  mode: MissionModeId,
  answers: MissionAnswer[],
): MissionControlState {
  if (!state.activeMission) {
    return state
  }

  const missionIds = new Set(state.activeMission.vocabularyIds)
  const nextProgress = { ...state.activeMission.progress }
  const nextWordStats = { ...state.wordStats }

  answers.forEach((answer) => {
    if (!answer.sourceWordId || !missionIds.has(answer.sourceWordId)) {
      return
    }

    const currentMission = nextProgress[answer.sourceWordId] ?? {
      attempts: 0,
      correct: 0,
      modes: {},
    }
    const currentGlobal = nextWordStats[answer.sourceWordId] ?? {
      attempts: 0,
      correct: 0,
      modes: {},
    }
    const update = (current: MissionWordProgress): MissionWordProgress => ({
      attempts: current.attempts + 1,
      correct: current.correct + (answer.isCorrect ? 1 : 0),
      modes: {
        ...current.modes,
        [mode]: (current.modes[mode] ?? 0) + 1,
      },
    })

    nextProgress[answer.sourceWordId] = update(currentMission)
    nextWordStats[answer.sourceWordId] = update(currentGlobal)
  })

  return {
    ...state,
    activeMission: {
      ...state.activeMission,
      progress: nextProgress,
    },
    wordStats: nextWordStats,
    recentRuns: [
      ...state.recentRuns,
      {
        score: answers.filter((answer) => answer.isCorrect).length,
        total: answers.length,
        completedAt: new Date().toISOString(),
      },
    ].slice(-12),
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

export function sampleRecallMissionPrompts(
  prompts: RecallPrompt[],
  mission: Mission | null,
  count: number,
): RecallPrompt[] {
  if (!mission) {
    return shuffle(prompts).slice(0, count)
  }

  const missionIds = new Set(mission.vocabularyIds)
  const missionPrompts = shuffle(
    prompts.filter((prompt) => missionIds.has(prompt.sourceWordId)),
  )
  const fallbackPrompts = shuffle(
    prompts.filter((prompt) => !missionIds.has(prompt.sourceWordId)),
  )

  return [...missionPrompts, ...fallbackPrompts].slice(0, count)
}
