import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  ESE_GAME_EXPERIMENT_ROUTE,
  MISSION_CONTROL_STATE_KEY,
  PHRASE_UPGRADE_PROGRESS_KEY,
  RECALL_CHALLENGE_PROGRESS_KEY,
  SENTENCE_REPAIR_PROGRESS_KEY,
} from './constants'
import {
  PhraseUpgradePrompt,
  SentenceRepairPrompt,
} from './sampleData'
import {
  createMission,
  DEFAULT_MISSION_FILTERS,
  getMissionCategoryCounts,
  getMissionProgress,
  getMissionThemes,
  getMissionVocabulary,
  getProgressTrends,
  Mission,
  MISSION_CATEGORIES,
  MissionControlState,
  MissionCategoryFilter,
  MissionDifficultyFilter,
  MissionStyle,
  recordMissionAnswers,
  sampleRecallMissionPrompts,
  sampleMissionPrompts,
} from './missionControl'
import {
  buildRecallPrompts,
  evaluateRecallAnswer,
  RecallEvaluation,
  RecallPrompt,
} from './recallChallenge'
import {
  loadB2C1PhraseUpgradePrompts,
  loadB2C1SentenceRepairPrompts,
  loadStarterPackMissionVocabulary,
  StarterPackMissionWord,
} from './starterPackVocabulary'
import {
  loadMissionControlState,
  loadPhraseUpgradeProgress,
  loadRecallChallengeProgress,
  loadSentenceRepairProgress,
  saveMissionControlState,
  PhraseUpgradeProgress,
  savePhraseUpgradeProgress,
  RecallChallengeProgress,
  saveRecallChallengeProgress,
  saveSentenceRepairProgress,
  SentenceRepairProgress,
} from './storage'

const PROMPTS_PER_RUN = 6
const RECALL_PROMPTS_PER_RUN = 5

type GameMode = 'sentence-repair' | 'phrase-upgrade' | 'recall-challenge'
type Screen = 'mission-control' | 'game'
type RunStatus = 'idle' | 'playing' | 'feedback' | 'complete'

interface RunAnswer {
  promptId: string
  selectedChoice: string
  isCorrect: boolean
  score?: number
  feedback?: string
  sourceWordId?: string
}

interface SentenceRunState {
  status: RunStatus
  promptIndex: number
  prompts: SentenceRepairPrompt[]
  answers: RunAnswer[]
  score: number
  streak: number
  bestStreak: number
  selectedChoice: string | null
}

interface PhraseRunState {
  status: RunStatus
  promptIndex: number
  prompts: PhraseUpgradePrompt[]
  answers: RunAnswer[]
  score: number
  streak: number
  bestStreak: number
  selectedChoice: string | null
}

interface RecallRunState {
  status: RunStatus
  promptIndex: number
  prompts: RecallPrompt[]
  answers: RunAnswer[]
  score: number
  streak: number
  bestStreak: number
  typedAnswer: string
  evaluation: RecallEvaluation | null
}

interface PromptLibraryState<TPrompt> {
  prompts: TPrompt[]
  status: 'loading' | 'ready' | 'fallback'
  label: string
  detail: string
}

const EMPTY_SENTENCE_RUN_STATE: SentenceRunState = {
  status: 'idle',
  promptIndex: 0,
  prompts: [],
  answers: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  selectedChoice: null,
}

const EMPTY_PHRASE_RUN_STATE: PhraseRunState = {
  status: 'idle',
  promptIndex: 0,
  prompts: [],
  answers: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  selectedChoice: null,
}

const EMPTY_RECALL_RUN_STATE: RecallRunState = {
  status: 'idle',
  promptIndex: 0,
  prompts: [],
  answers: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  typedAnswer: '',
  evaluation: null,
}

function getResultLabel(score: number, total = PROMPTS_PER_RUN) {
  if (score === total) {
    return 'Clean run'
  }
  if (score / total >= 0.8) {
    return 'Natural ear'
  }
  if (score / total >= 0.5) {
    return 'Getting sharper'
  }
  return 'Warming up'
}

function repairSentence(prompt: SentenceRepairPrompt): string {
  if (prompt.repairedSentence) {
    return prompt.repairedSentence
  }

  return prompt.sentence.replace(prompt.target, prompt.correctChoice)
}

export function EseGameSandboxPage() {
  const [mode, setMode] = useState<GameMode>('phrase-upgrade')
  const [screen, setScreen] = useState<Screen>('mission-control')
  const [missionState, setMissionState] = useState<MissionControlState>(() =>
    loadMissionControlState(),
  )
  const [missionVocabulary, setMissionVocabulary] = useState<PromptLibraryState<StarterPackMissionWord>>({
    prompts: [],
    status: 'loading',
    label: 'Loading full library missions',
    detail: 'Reading static JSON from /data/migration-vocab.json and /data/starter-packs only.',
  })

  useEffect(() => {
    let cancelled = false

    loadStarterPackMissionVocabulary()
      .then((source) => {
        if (cancelled) {
          return
        }

        setMissionVocabulary({
          prompts: source.words,
          status: 'ready',
          label: 'B2-C1 full vocabulary library',
          detail: `${source.words.length} items from migration vocabulary plus ${source.packs.length} starter packs.`,
        })

        setMissionState((current) => {
          if (current.activeMission) {
            return current
          }

          const mission = createMission(source.words, current.filters, current.wordStats)
          const nextState = {
            ...current,
            activeMission: mission,
          }
          saveMissionControlState(nextState)
          return nextState
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setMissionVocabulary({
          prompts: [],
          status: 'fallback',
          label: 'Full library unavailable',
          detail: `${message}. Mission Control requires static vocabulary JSON.`,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const missionThemes = useMemo(
    () => getMissionThemes(missionVocabulary.prompts),
    [missionVocabulary.prompts],
  )
  const activeMissionWords = useMemo(
    () => getMissionVocabulary(missionState.activeMission, missionVocabulary.prompts),
    [missionState.activeMission, missionVocabulary.prompts],
  )
  const categoryCounts = useMemo(
    () => getMissionCategoryCounts(missionVocabulary.prompts),
    [missionVocabulary.prompts],
  )
  const progressTrends = useMemo(() => getProgressTrends(missionState), [missionState])

  function saveMissionState(nextState: MissionControlState) {
    setMissionState(saveMissionControlState(nextState))
  }

  function updateMissionFilters(nextFilters: MissionControlState['filters']) {
    const mission = createMission(missionVocabulary.prompts, nextFilters, missionState.wordStats)
    saveMissionState({
      ...missionState,
      filters: nextFilters,
      activeMission: mission,
    })
  }

  function reshuffleMission() {
    const mission = createMission(
      missionVocabulary.prompts,
      missionState.filters,
      missionState.wordStats,
    )
    saveMissionState({
      ...missionState,
      activeMission: mission,
    })
  }

  function startMission(nextMode: GameMode = mode) {
    if (!missionState.activeMission && missionVocabulary.status === 'ready') {
      const mission = createMission(
        missionVocabulary.prompts,
        missionState.filters,
        missionState.wordStats,
      )
      saveMissionState({
        ...missionState,
        activeMission: mission,
      })
    }

    setMode(nextMode)
    setScreen('game')
  }

  function returnToMissionControl() {
    setScreen('mission-control')
  }

  function updateMissionProgress(modeId: GameMode, answers: RunAnswer[]) {
    saveMissionState(recordMissionAnswers(missionState, modeId, answers))
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-8 sm:py-6">
        <header className="border-b border-neutral-800 pb-4 sm:pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Local experiment
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                ESE Game Lab
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300 sm:mt-3">
                Short B2-C1 English practice modes. No production stores, APIs, or vocabulary writes.
              </p>
            </div>
            <div className="w-fit max-w-full break-all rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-400">
              {ESE_GAME_EXPERIMENT_ROUTE}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:inline-grid sm:grid-cols-3">
            <ModeButton
              active={mode === 'phrase-upgrade'}
              label="Phrase Upgrade"
              onClick={() => startMission('phrase-upgrade')}
            />
            <ModeButton
              active={mode === 'recall-challenge'}
              label="Recall Challenge"
              onClick={() => startMission('recall-challenge')}
            />
            <ModeButton
              active={mode === 'sentence-repair'}
              label="Sentence Repair"
              onClick={() => startMission('sentence-repair')}
            />
          </div>
        </header>

        {screen === 'mission-control' ? (
          <MissionControlPanel
            activeMission={missionState.activeMission}
            filters={missionState.filters}
            missionVocabulary={missionVocabulary}
            missionWords={activeMissionWords}
            themes={missionThemes}
            categoryCounts={categoryCounts}
            progressTrends={progressTrends}
            onFiltersChange={updateMissionFilters}
            onResetFilters={() => updateMissionFilters(DEFAULT_MISSION_FILTERS)}
            onReshuffle={reshuffleMission}
            onStart={startMission}
          />
        ) : mode === 'phrase-upgrade' ? (
          <PhraseUpgradeMode
            mission={missionState.activeMission}
            onMissionProgress={updateMissionProgress}
            onMissionControl={returnToMissionControl}
          />
        ) : mode === 'recall-challenge' ? (
          <RecallChallengeMode
            mission={missionState.activeMission}
            onMissionProgress={updateMissionProgress}
            onMissionControl={returnToMissionControl}
          />
        ) : (
          <SentenceRepairMode
            mission={missionState.activeMission}
            onMissionProgress={updateMissionProgress}
            onMissionControl={returnToMissionControl}
          />
        )}
      </div>
    </main>
  )
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-teal-300 bg-teal-300 text-neutral-950'
          : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  )
}

function MissionControlPanel({
  activeMission,
  filters,
  missionVocabulary,
  missionWords,
  themes,
  categoryCounts,
  progressTrends,
  onFiltersChange,
  onResetFilters,
  onReshuffle,
  onStart,
}: {
  activeMission: Mission | null
  filters: MissionControlState['filters']
  missionVocabulary: PromptLibraryState<StarterPackMissionWord>
  missionWords: StarterPackMissionWord[]
  themes: string[]
  categoryCounts: Record<string, number>
  progressTrends: {
    totalAttempts: number
    weakCount: number
    masteredCount: number
    recentAverage: number
    previousAverage: number
    trendLabel: 'New' | 'Improving' | 'Steady' | 'Needs focus'
  }
  onFiltersChange: (filters: MissionControlState['filters']) => void
  onResetFilters: () => void
  onReshuffle: () => void
  onStart: (mode?: GameMode) => void
}) {
  const progress = getMissionProgress(activeMission)
  const canStart = missionVocabulary.status === 'ready' && Boolean(activeMission)

  return (
    <section className="flex flex-1 flex-col justify-center py-4 sm:py-6">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-2xl shadow-black/20 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-teal-300">Mission Control</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              {activeMission?.title ?? 'Build today\'s mission'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              Full Library Mode turns the complete vocabulary set into short, focused B2-C1
              missions with professional context and local-only adaptation.
            </p>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Storage</p>
            <p className="mt-1 break-all text-xs font-medium text-neutral-300">
              {MISSION_CONTROL_STATE_KEY}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultMetric label="Mission type" value={activeMission?.style ?? filters.style} />
          <ResultMetric
            label="Target words"
            value={(activeMission?.targetCount ?? 0).toString()}
          />
          <ResultMetric
            label="Progress"
            value={`${progress.masteredCount}/${activeMission?.targetCount ?? 0}`}
          />
          <ResultMetric
            label="Duration"
            value={`${activeMission?.estimatedMinutes ?? 0} min`}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultMetric label="Library items" value={missionVocabulary.prompts.length.toString()} />
          <ResultMetric label="Weak areas" value={progressTrends.weakCount.toString()} />
          <ResultMetric label="Mastered" value={progressTrends.masteredCount.toString()} />
          <ResultMetric
            label="Recent trend"
            value={progressTrends.recentAverage ? `${progressTrends.recentAverage}%` : progressTrends.trendLabel}
          />
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-teal-400 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Theme
            </span>
            <select
              value={filters.theme}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  theme: event.target.value,
                })
              }
              disabled={missionVocabulary.status !== 'ready'}
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white disabled:opacity-50"
            >
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Category
            </span>
            <select
              value={filters.category}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  category: event.target.value as MissionCategoryFilter,
                })
              }
              disabled={missionVocabulary.status !== 'ready'}
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white disabled:opacity-50"
            >
              {MISSION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category === 'Any' ? 'Any' : `${category} (${categoryCounts[category] ?? 0})`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Difficulty
            </span>
            <select
              value={filters.difficulty}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  difficulty: event.target.value as MissionDifficultyFilter,
                })
              }
              disabled={missionVocabulary.status !== 'ready'}
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white disabled:opacity-50"
            >
              {(['Any', 'B2', 'C1'] as MissionDifficultyFilter[]).map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Mission
            </span>
            <select
              value={filters.style}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  style: event.target.value as MissionStyle,
                })
              }
              disabled={missionVocabulary.status !== 'ready'}
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white disabled:opacity-50"
            >
              {(['themed', 'mixed', 'challenge'] as MissionStyle[]).map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={filters.focusWeakAreas}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  focusWeakAreas: event.target.checked,
                })
              }
              disabled={missionVocabulary.status !== 'ready'}
              className="h-4 w-4 accent-teal-400"
            />
            <span>Focus weak areas</span>
          </label>

          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onReshuffle}
              disabled={missionVocabulary.status !== 'ready'}
              className="rounded-md border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reshuffle
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              disabled={missionVocabulary.status !== 'ready'}
              className="rounded-md border border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        {activeMission && (
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Composition
              </p>
              <p className="mt-2 text-neutral-200">
                {activeMission.composition.b2} B2 / {activeMission.composition.c1} C1
              </p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Item mix
              </p>
              <p className="mt-2 text-neutral-200">
                {activeMission.composition.words} words / {activeMission.composition.phrases} phrases / {activeMission.composition.chunks} chunks
              </p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Adaptation
              </p>
              <p className="mt-2 text-neutral-200">
                {activeMission.composition.weak} weak / {activeMission.composition.migrationVocab} full-library
              </p>
            </div>
          </div>
        )}

        {activeMission && (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Vocabulary categories
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['business', activeMission.composition.business],
                  ['meetings', activeMission.composition.meetings],
                  ['email', activeMission.composition.email],
                  ['fluency', activeMission.composition.fluency],
                  ['phrasal verbs', activeMission.composition.phrasalVerbs],
                ]
                  .filter(([, value]) => Number(value) > 0)
                  .map(([label, value]) => (
                    <span
                      key={label}
                      className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300"
                    >
                      {label} {value}
                    </span>
                  ))}
              </div>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Progress trend
              </p>
              <p className="mt-2 text-neutral-200">
                {progressTrends.trendLabel}
                {progressTrends.previousAverage
                  ? ` from ${progressTrends.previousAverage}% to ${progressTrends.recentAverage}%`
                  : progressTrends.recentAverage
                    ? ` at ${progressTrends.recentAverage}%`
                    : ' after your first run'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Vocabulary source
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-100">
                {missionVocabulary.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                {missionVocabulary.detail}
              </p>
            </div>
            <p className="text-xs text-neutral-500">
              Attempted {progress.attemptedCount} mission items / {progressTrends.totalAttempts} total answers
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {missionWords.slice(0, 18).map((word) => {
              const wordProgress = activeMission?.progress[word.id]
              const isMastered = Boolean(wordProgress?.correct)
              const isAttempted = Boolean(wordProgress?.attempts)

              return (
                <span
                  key={word.id}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    isMastered
                      ? 'bg-teal-400 text-neutral-950'
                      : isAttempted
                        ? 'bg-amber-300 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {word.term}
                </span>
              )
            })}
            {missionWords.length > 18 && (
              <span className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-400">
                +{missionWords.length - 18} more
              </span>
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStart('phrase-upgrade')}
            disabled={!canStart}
            className="rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Phrase Upgrade
          </button>
          <button
            type="button"
            onClick={() => onStart('recall-challenge')}
            disabled={!canStart}
            className="rounded-md border border-teal-400 px-5 py-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-400 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Recall Challenge
          </button>
          <button
            type="button"
            onClick={() => onStart('sentence-repair')}
            disabled={!canStart}
            className="rounded-md border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Sentence Repair
          </button>
        </div>
      </div>
    </section>
  )
}

function SentenceRepairMode({
  mission,
  onMissionProgress,
  onMissionControl,
}: {
  mission: Mission | null
  onMissionProgress: (mode: GameMode, answers: RunAnswer[]) => void
  onMissionControl: () => void
}) {
  const [progress, setProgress] = useState<SentenceRepairProgress>(() =>
    loadSentenceRepairProgress(),
  )
  const [run, setRun] = useState<SentenceRunState>(EMPTY_SENTENCE_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState<SentenceRepairPrompt>>({
    prompts: [],
    status: 'loading',
    label: 'Loading B2-C1 full library',
    detail: 'Reading static JSON from /data/migration-vocab.json and /data/starter-packs only.',
  })

  useEffect(() => {
    let cancelled = false

    loadB2C1SentenceRepairPrompts()
      .then((source) => {
        if (cancelled) {
          return
        }

        setPromptLibrary({
          prompts: source.prompts,
          status: 'ready',
          label: 'B2-C1 full library',
          detail: `${source.prompts.length} prompts from ${source.wordCount} library items plus ${source.packCount} starter packs.`,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setPromptLibrary({
          prompts: [],
          status: 'fallback',
          label: 'Full library unavailable',
          detail: `${message}. Sentence Repair requires static vocabulary JSON.`,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const currentPrompt = run.prompts[run.promptIndex]
  const latestAnswer = run.answers[run.answers.length - 1]
  const progressPercent = useMemo(() => {
    if (run.status === 'idle') {
      return 0
    }

    return Math.round((run.answers.length / PROMPTS_PER_RUN) * 100)
  }, [run.answers.length, run.status])

  function startRun() {
    if (promptLibrary.status !== 'ready' || promptLibrary.prompts.length < PROMPTS_PER_RUN) {
      return
    }

    setRun({
      ...EMPTY_SENTENCE_RUN_STATE,
      status: 'playing',
      prompts: sampleMissionPrompts(promptLibrary.prompts, mission, PROMPTS_PER_RUN),
    })
  }

  function selectChoice(choice: string) {
    if (!currentPrompt || run.status !== 'playing') {
      return
    }

    const isCorrect = choice === currentPrompt.correctChoice
    const nextStreak = isCorrect ? run.streak + 1 : 0

    setRun({
      ...run,
      status: 'feedback',
      selectedChoice: choice,
      answers: [
        ...run.answers,
        {
          promptId: currentPrompt.id,
          selectedChoice: choice,
          isCorrect,
          feedback: currentPrompt.wrongChoiceFeedback?.[choice],
          sourceWordId: currentPrompt.sourceWordId,
        },
      ],
      score: isCorrect ? run.score + 1 : run.score,
      streak: nextStreak,
      bestStreak: Math.max(run.bestStreak, nextStreak),
    })
  }

  function continueRun() {
    const isComplete = run.promptIndex + 1 >= run.prompts.length

    if (isComplete) {
      const nextProgress = saveSentenceRepairProgress({
        totalRuns: progress.totalRuns + 1,
        bestScore: Math.max(progress.bestScore, run.score),
        bestStreak: Math.max(progress.bestStreak, run.bestStreak),
      })
      setProgress(nextProgress)
      onMissionProgress('sentence-repair', run.answers)
      setRun({
        ...run,
        status: 'complete',
        selectedChoice: null,
      })
      return
    }

    setRun({
      ...run,
      status: 'playing',
      promptIndex: run.promptIndex + 1,
      selectedChoice: null,
    })
  }

  return (
    <ModeLayout
      progress={progress}
      progressKey={SENTENCE_REPAIR_PROGRESS_KEY}
      promptLibraryLabel={promptLibrary.label}
    >
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-2xl shadow-black/20 sm:p-6">
        {run.status === 'idle' && (
          <StartPanel
            eyebrow="Sentence Repair"
            title="Fix 6 sentences before the run ends."
            body="Choose the word or phrase that sounds most natural in context. Mission words appear first when available."
            promptLibrary={promptLibrary}
            mission={mission}
            buttonLabel="Start run"
            onStart={startRun}
            onMissionControl={onMissionControl}
          />
        )}

        {(run.status === 'playing' || run.status === 'feedback') && currentPrompt && (
          <div>
            <RunHeader
              current={run.promptIndex + 1}
              score={run.score}
              streak={run.streak}
              bestStreak={run.bestStreak}
              progressPercent={progressPercent}
            />

            <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-950 p-4 sm:mt-8 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Repair the highlighted phrase
              </p>
              <MetaTags prompt={currentPrompt} />
              <p className="mt-4 text-xl leading-8 text-white sm:text-2xl sm:leading-10">
                {currentPrompt.sentence.split(currentPrompt.target)[0]}
                <mark className="rounded bg-amber-300 px-1 text-neutral-950">
                  {currentPrompt.target}
                </mark>
                {currentPrompt.sentence
                  .split(currentPrompt.target)
                  .slice(1)
                  .join(currentPrompt.target)}
              </p>
            </div>

            <ChoiceGrid
              choices={currentPrompt.choices}
              selectedChoice={run.selectedChoice}
              correctChoice={currentPrompt.correctChoice}
              status={run.status}
              onSelect={selectChoice}
            />

            {run.status === 'feedback' && latestAnswer && (
              <div className="mt-6 rounded-md border border-neutral-700 bg-neutral-950 p-4 sm:p-5">
                <FeedbackHeader
                  isCorrect={latestAnswer.isCorrect}
                  skillFocus={currentPrompt.skillFocus ?? 'sentence repair'}
                  selectedChoice={latestAnswer.selectedChoice}
                />

                {!latestAnswer.isCorrect && latestAnswer.feedback && (
                  <p className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm leading-6 text-rose-100">
                    {latestAnswer.feedback}
                  </p>
                )}

                <ExplanationBlock label="Best repair" body={repairSentence(currentPrompt)} />
                <p className="mt-4 text-sm leading-6 text-neutral-300">
                  {currentPrompt.explanation}
                </p>
                <ContinueButton
                  isLast={run.promptIndex + 1 >= run.prompts.length}
                  onClick={continueRun}
                />
              </div>
            )}
          </div>
        )}

        {run.status === 'complete' && (
          <CompletePanel
            score={run.score}
            progress={progress}
            runStreak={run.streak}
            onPlayAgain={startRun}
            onBack={() => setRun(EMPTY_SENTENCE_RUN_STATE)}
          />
        )}
      </div>
    </ModeLayout>
  )
}

function PhraseUpgradeMode({
  mission,
  onMissionProgress,
  onMissionControl,
}: {
  mission: Mission | null
  onMissionProgress: (mode: GameMode, answers: RunAnswer[]) => void
  onMissionControl: () => void
}) {
  const [progress, setProgress] = useState<PhraseUpgradeProgress>(() =>
    loadPhraseUpgradeProgress(),
  )
  const [run, setRun] = useState<PhraseRunState>(EMPTY_PHRASE_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState<PhraseUpgradePrompt>>({
    prompts: [],
    status: 'loading',
    label: 'Loading B2-C1 full library',
    detail: 'Reading static JSON from /data/migration-vocab.json and /data/starter-packs only.',
  })

  useEffect(() => {
    let cancelled = false

    loadB2C1PhraseUpgradePrompts()
      .then((source) => {
        if (cancelled) {
          return
        }

        setPromptLibrary({
          prompts: source.prompts,
          status: 'ready',
          label: 'B2-C1 full library',
          detail: `${source.prompts.length} prompts from ${source.wordCount} library items plus ${source.packCount} starter packs.`,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setPromptLibrary({
          prompts: [],
          status: 'fallback',
          label: 'Full library unavailable',
          detail: `${message}. Phrase Upgrade requires static vocabulary JSON.`,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const currentPrompt = run.prompts[run.promptIndex]
  const latestAnswer = run.answers[run.answers.length - 1]
  const progressPercent = useMemo(() => {
    if (run.status === 'idle') {
      return 0
    }

    return Math.round((run.answers.length / PROMPTS_PER_RUN) * 100)
  }, [run.answers.length, run.status])

  function startRun() {
    if (promptLibrary.status !== 'ready' || promptLibrary.prompts.length < PROMPTS_PER_RUN) {
      return
    }

    setRun({
      ...EMPTY_PHRASE_RUN_STATE,
      status: 'playing',
      prompts: sampleMissionPrompts(promptLibrary.prompts, mission, PROMPTS_PER_RUN),
    })
  }

  function selectChoice(choice: string) {
    if (!currentPrompt || run.status !== 'playing') {
      return
    }

    const isCorrect = choice === currentPrompt.correctChoice
    const nextStreak = isCorrect ? run.streak + 1 : 0

    setRun({
      ...run,
      status: 'feedback',
      selectedChoice: choice,
      answers: [
        ...run.answers,
        {
          promptId: currentPrompt.id,
          selectedChoice: choice,
          isCorrect,
          feedback: currentPrompt.weakChoiceFeedback?.[choice],
          sourceWordId: currentPrompt.sourceWordId,
        },
      ],
      score: isCorrect ? run.score + 1 : run.score,
      streak: nextStreak,
      bestStreak: Math.max(run.bestStreak, nextStreak),
    })
  }

  function continueRun() {
    const isComplete = run.promptIndex + 1 >= run.prompts.length

    if (isComplete) {
      const nextProgress = savePhraseUpgradeProgress({
        totalRuns: progress.totalRuns + 1,
        bestScore: Math.max(progress.bestScore, run.score),
        bestStreak: Math.max(progress.bestStreak, run.bestStreak),
      })
      setProgress(nextProgress)
      onMissionProgress('phrase-upgrade', run.answers)
      setRun({
        ...run,
        status: 'complete',
        selectedChoice: null,
      })
      return
    }

    setRun({
      ...run,
      status: 'playing',
      promptIndex: run.promptIndex + 1,
      selectedChoice: null,
    })
  }

  return (
    <ModeLayout
      progress={progress}
      progressKey={PHRASE_UPGRADE_PROGRESS_KEY}
      promptLibraryLabel={promptLibrary.label}
    >
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-2xl shadow-black/20 sm:p-6">
        {run.status === 'idle' && (
          <StartPanel
            eyebrow="Phrase Upgrade"
            title="Upgrade 6 basic sentences."
            body="Pick the sentence that sounds natural, precise, and professional. Mission words appear first when available."
            promptLibrary={promptLibrary}
            mission={mission}
            buttonLabel="Start Phrase Upgrade"
            onStart={startRun}
            onMissionControl={onMissionControl}
          />
        )}

        {(run.status === 'playing' || run.status === 'feedback') && currentPrompt && (
          <div>
            <RunHeader
              current={run.promptIndex + 1}
              score={run.score}
              streak={run.streak}
              bestStreak={run.bestStreak}
              progressPercent={progressPercent}
            />

            <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-950 p-4 sm:mt-8 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Upgrade this basic sentence
              </p>
              <MetaTags prompt={currentPrompt} />
              <p className="mt-4 text-xl leading-8 text-white sm:text-2xl sm:leading-10">
                {currentPrompt.basicSentence}
              </p>
            </div>

            <ChoiceGrid
              choices={currentPrompt.choices}
              selectedChoice={run.selectedChoice}
              correctChoice={currentPrompt.correctChoice}
              status={run.status}
              onSelect={selectChoice}
            />

            {run.status === 'feedback' && latestAnswer && (
              <div className="mt-6 rounded-md border border-neutral-700 bg-neutral-950 p-4 sm:p-5">
                <FeedbackHeader
                  isCorrect={latestAnswer.isCorrect}
                  skillFocus={currentPrompt.skillFocus ?? 'phrase upgrade'}
                  selectedChoice={latestAnswer.selectedChoice}
                />

                {!latestAnswer.isCorrect && latestAnswer.feedback && (
                  <p className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm leading-6 text-rose-100">
                    {latestAnswer.feedback}
                  </p>
                )}

                <ExplanationBlock label="Why it is stronger" body={currentPrompt.whyStronger} />
                <ExplanationBlock label="Nuance / register / tone" body={currentPrompt.nuance} />
                <ExplanationBlock label="Full upgraded sentence" body={currentPrompt.upgradedSentence} />

                <ContinueButton
                  isLast={run.promptIndex + 1 >= run.prompts.length}
                  onClick={continueRun}
                />
              </div>
            )}
          </div>
        )}

        {run.status === 'complete' && (
          <CompletePanel
            score={run.score}
            progress={progress}
            runStreak={run.streak}
            onPlayAgain={startRun}
            onBack={() => setRun(EMPTY_PHRASE_RUN_STATE)}
          />
        )}
      </div>
    </ModeLayout>
  )
}

function RecallChallengeMode({
  mission,
  onMissionProgress,
  onMissionControl,
}: {
  mission: Mission | null
  onMissionProgress: (mode: GameMode, answers: RunAnswer[]) => void
  onMissionControl: () => void
}) {
  const [progress, setProgress] = useState<RecallChallengeProgress>(() =>
    loadRecallChallengeProgress(),
  )
  const [run, setRun] = useState<RecallRunState>(EMPTY_RECALL_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState<RecallPrompt>>({
    prompts: [],
    status: 'loading',
    label: 'Loading B2-C1 recall prompts',
    detail: 'Reading static JSON from /data/migration-vocab.json and /data/starter-packs only.',
  })
  const answerInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    loadStarterPackMissionVocabulary()
      .then((source) => {
        if (cancelled) {
          return
        }

        const prompts = buildRecallPrompts(source.words)
        setPromptLibrary({
          prompts,
          status: 'ready',
          label: 'B2-C1 full library recall',
          detail: `${prompts.length} typed recall prompts from ${source.words.length} library items.`,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setPromptLibrary({
          prompts: [],
          status: 'fallback',
          label: 'Recall library unavailable',
          detail: `${message}. Recall Challenge requires static vocabulary JSON.`,
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (run.status === 'playing') {
      answerInputRef.current?.focus()
    }
  }, [run.promptIndex, run.status])

  const currentPrompt = run.prompts[run.promptIndex]
  const progressPercent = useMemo(() => {
    if (run.status === 'idle') {
      return 0
    }

    return Math.round((run.answers.length / RECALL_PROMPTS_PER_RUN) * 100)
  }, [run.answers.length, run.status])

  function startRun() {
    if (promptLibrary.status !== 'ready' || promptLibrary.prompts.length < RECALL_PROMPTS_PER_RUN) {
      return
    }

    setRun({
      ...EMPTY_RECALL_RUN_STATE,
      status: 'playing',
      prompts: sampleRecallMissionPrompts(
        promptLibrary.prompts,
        mission,
        RECALL_PROMPTS_PER_RUN,
      ),
    })
  }

  function submitAnswer(event?: FormEvent) {
    event?.preventDefault()
    if (!currentPrompt || run.status !== 'playing') {
      return
    }

    const evaluation = evaluateRecallAnswer(currentPrompt, run.typedAnswer)
    const isStrongRecall = evaluation.score === 1
    const nextStreak = isStrongRecall ? run.streak + 1 : 0

    setRun({
      ...run,
      status: 'feedback',
      evaluation,
      answers: [
        ...run.answers,
        {
          promptId: currentPrompt.id,
          selectedChoice: run.typedAnswer || '(blank)',
          isCorrect: evaluation.isCorrect,
          score: evaluation.score,
          feedback: evaluation.feedback,
          sourceWordId: currentPrompt.sourceWordId,
        },
      ],
      score: run.score + evaluation.score,
      streak: nextStreak,
      bestStreak: Math.max(run.bestStreak, nextStreak),
    })
  }

  function continueRun() {
    const isComplete = run.promptIndex + 1 >= run.prompts.length

    if (isComplete) {
      const nextProgress = saveRecallChallengeProgress({
        totalRuns: progress.totalRuns + 1,
        bestScore: Math.max(progress.bestScore, run.score),
        bestStreak: Math.max(progress.bestStreak, run.bestStreak),
      })
      setProgress(nextProgress)
      onMissionProgress('recall-challenge', run.answers)
      setRun({
        ...run,
        status: 'complete',
        typedAnswer: '',
      })
      return
    }

    setRun({
      ...run,
      status: 'playing',
      promptIndex: run.promptIndex + 1,
      typedAnswer: '',
      evaluation: null,
    })
  }

  return (
    <ModeLayout
      progress={progress}
      progressKey={RECALL_CHALLENGE_PROGRESS_KEY}
      promptLibraryLabel={promptLibrary.label}
      promptCount={RECALL_PROMPTS_PER_RUN}
    >
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-2xl shadow-black/20 sm:p-6">
        {run.status === 'idle' && (
          <StartPanel
            eyebrow="Recall Challenge"
            title="Type 5 target words or phrases."
            body="Produce the missing B2-C1 vocabulary from meaning, register, and context hints. Mission words appear first when available."
            promptLibrary={promptLibrary}
            mission={mission}
            buttonLabel="Start Recall Challenge"
            onStart={startRun}
            onMissionControl={onMissionControl}
            promptCount={RECALL_PROMPTS_PER_RUN}
          />
        )}

        {(run.status === 'playing' || run.status === 'feedback') && currentPrompt && (
          <div>
            <RunHeader
              current={run.promptIndex + 1}
              score={run.score}
              streak={run.streak}
              bestStreak={run.bestStreak}
              progressPercent={progressPercent}
              promptCount={RECALL_PROMPTS_PER_RUN}
            />

            <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-950 p-4 sm:mt-8 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Fill the gap
              </p>
              <MetaTags prompt={currentPrompt} />
              <p className="mt-4 text-xl leading-8 text-white sm:text-2xl sm:leading-10">
                {currentPrompt.sentence}
              </p>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Meaning
                  </p>
                  <p className="mt-2 leading-6 text-neutral-200">{currentPrompt.meaningHint}</p>
                </div>
                <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Register / nuance
                  </p>
                  <p className="mt-2 leading-6 text-neutral-200">{currentPrompt.nuanceHint}</p>
                  {currentPrompt.firstLetterHint && (
                    <p className="mt-2 text-xs font-medium text-teal-300">
                      First letter hint: {currentPrompt.firstLetterHint}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {run.status === 'playing' && (
              <form onSubmit={submitAnswer} className="mt-5">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Your answer
                  </span>
                  <input
                    ref={answerInputRef}
                    type="text"
                    value={run.typedAnswer}
                    onChange={(event) =>
                      setRun({
                        ...run,
                        typedAnswer: event.target.value,
                      })
                    }
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="text"
                    className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-4 text-base text-white outline-none transition placeholder:text-neutral-600 focus:border-teal-300"
                    placeholder="Type the missing word or phrase"
                  />
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <button
                    type="submit"
                    className="rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300"
                  >
                    Check answer
                  </button>
                  <button
                    type="button"
                    onClick={() => submitAnswer()}
                    className="rounded-md border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500"
                  >
                    Skip
                  </button>
                </div>
              </form>
            )}

            {run.status === 'feedback' && run.evaluation && (
              <div className="mt-6 rounded-md border border-neutral-700 bg-neutral-950 p-4 sm:p-5">
                <FeedbackHeader
                  isCorrect={run.evaluation.isCorrect}
                  skillFocus={run.evaluation.title}
                  selectedChoice={run.answers[run.answers.length - 1]?.selectedChoice ?? ''}
                />
                <p className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm leading-6 text-neutral-100">
                  {run.evaluation.feedback}
                </p>
                <ExplanationBlock label="Target answer" body={run.evaluation.betterAnswer} />
                {currentPrompt.saferAlternatives.length > 0 && (
                  <ExplanationBlock
                    label="Related alternatives"
                    body={currentPrompt.saferAlternatives.join(', ')}
                  />
                )}
                <ExplanationBlock label="Professional nuance" body={currentPrompt.nuanceHint} />
                <ContinueButton
                  isLast={run.promptIndex + 1 >= run.prompts.length}
                  onClick={continueRun}
                />
              </div>
            )}
          </div>
        )}

        {run.status === 'complete' && (
          <CompletePanel
            score={run.score}
            progress={progress}
            runStreak={run.streak}
            onPlayAgain={startRun}
            onBack={() => setRun(EMPTY_RECALL_RUN_STATE)}
            promptCount={RECALL_PROMPTS_PER_RUN}
          />
        )}
      </div>
    </ModeLayout>
  )
}

function ModeLayout({
  children,
  progress,
  progressKey,
  promptLibraryLabel,
  promptCount = PROMPTS_PER_RUN,
}: {
  children: ReactNode
  progress: SentenceRepairProgress | PhraseUpgradeProgress | RecallChallengeProgress
  progressKey: string
  promptLibraryLabel: string
  promptCount?: number
}) {
  return (
    <section className="flex flex-1 flex-col justify-center py-4 sm:py-6">
      {children}
      <aside className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <ResultMetric label="Best score" value={`${progress.bestScore} / ${promptCount}`} />
        <ResultMetric label="Best streak" value={progress.bestStreak.toString()} />
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-neutral-500">Storage / source</p>
          <p className="mt-1 break-all text-xs font-medium text-neutral-300">{progressKey}</p>
          <p className="mt-2 text-xs text-neutral-500">{promptLibraryLabel}</p>
        </div>
      </aside>
    </section>
  )
}

function StartPanel<TPrompt>({
  eyebrow,
  title,
  body,
  promptLibrary,
  mission,
  buttonLabel,
  onStart,
  onMissionControl,
  promptCount = PROMPTS_PER_RUN,
}: {
  eyebrow: string
  title: string
  body: string
  promptLibrary: PromptLibraryState<TPrompt>
  mission: Mission | null
  buttonLabel: string
  onStart: () => void
  onMissionControl: () => void
  promptCount?: number
}) {
  const canStart = promptLibrary.status === 'ready' && promptLibrary.prompts.length >= promptCount

  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
      <p className="text-sm font-medium text-teal-300">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-300">{body}</p>
      {mission && (
        <div className="mx-auto mt-5 max-w-md rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">
            Active mission
          </p>
          <p className="mt-1 text-sm font-medium text-white">{mission.title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-300">
            {mission.targetCount} target words / {mission.estimatedMinutes} min / {mission.theme}
          </p>
        </div>
      )}
      <div className="mx-auto mt-5 max-w-md rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Vocabulary source
        </p>
        <p className="mt-1 text-sm font-medium text-neutral-100">{promptLibrary.label}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-400">{promptLibrary.detail}</p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="mt-7 w-full rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {promptLibrary.status === 'loading' ? 'Loading prompts...' : buttonLabel}
      </button>
      <button
        type="button"
        onClick={onMissionControl}
        className="mt-3 w-full rounded-md border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 sm:ml-3 sm:w-auto"
      >
        Mission Control
      </button>
    </div>
  )
}

function RunHeader({
  current,
  score,
  streak,
  bestStreak,
  progressPercent,
  promptCount = PROMPTS_PER_RUN,
}: {
  current: number
  score: number
  streak: number
  bestStreak: number
  progressPercent: number
  promptCount?: number
}) {
  return (
    <>
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="font-medium text-neutral-300">
          Prompt {current} / {promptCount}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-400">
          <span>Score {score}</span>
          <span>Streak {streak}</span>
          <span>Best {bestStreak}</span>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-teal-400 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </>
  )
}

function MetaTags({
  prompt,
}: {
  prompt: Pick<SentenceRepairPrompt | PhraseUpgradePrompt, 'difficulty' | 'register' | 'tags'>
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {prompt.difficulty && (
        <span className="rounded bg-teal-400/10 px-2 py-1 text-xs font-semibold text-teal-300">
          {prompt.difficulty}
        </span>
      )}
      {prompt.register && (
        <span className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300">
          {prompt.register}
        </span>
      )}
      {(prompt.tags ?? []).slice(0, 2).map((tag) => (
        <span
          key={tag}
          className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

function ChoiceGrid({
  choices,
  selectedChoice,
  correctChoice,
  status,
  onSelect,
}: {
  choices: string[]
  selectedChoice: string | null
  correctChoice: string
  status: RunStatus
  onSelect: (choice: string) => void
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {choices.map((choice) => {
        const isSelected = selectedChoice === choice
        const isCorrect = correctChoice === choice
        const showCorrect = status === 'feedback' && isCorrect
        const showIncorrect = status === 'feedback' && isSelected && !isCorrect

        return (
          <button
            key={choice}
            type="button"
            onClick={() => onSelect(choice)}
            disabled={status === 'feedback'}
            className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm font-semibold leading-5 shadow-sm transition active:scale-[0.99] ${
              showCorrect
                ? 'border-teal-300 bg-teal-300 text-neutral-950 shadow-teal-950/30'
                : showIncorrect
                  ? 'border-rose-300 bg-rose-300 text-neutral-950 shadow-rose-950/30'
                  : 'border-neutral-700 bg-neutral-950 text-neutral-100 hover:border-teal-300 hover:bg-neutral-900 disabled:hover:border-neutral-700 disabled:hover:bg-neutral-950'
            }`}
          >
            {choice}
          </button>
        )
      })}
    </div>
  )
}

function FeedbackHeader({
  isCorrect,
  skillFocus,
  selectedChoice,
}: {
  isCorrect: boolean
  skillFocus: string
  selectedChoice: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={`text-sm font-semibold ${isCorrect ? 'text-teal-300' : 'text-rose-300'}`}>
          {isCorrect ? 'Correct' : 'Not quite'}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
          {skillFocus}
        </p>
      </div>
      {!isCorrect && (
        <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
          Your pick: <span className="font-semibold text-rose-300">{selectedChoice}</span>
        </div>
      )}
    </div>
  )
}

function ExplanationBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-100">{body}</p>
    </div>
  )
}

function ContinueButton({ isLast, onClick }: { isLast: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:w-auto sm:py-2"
    >
      {isLast ? 'Show result' : 'Continue'}
    </button>
  )
}

function CompletePanel({
  score,
  progress,
  runStreak,
  onPlayAgain,
  onBack,
  promptCount = PROMPTS_PER_RUN,
}: {
  score: number
  progress: SentenceRepairProgress | PhraseUpgradeProgress | RecallChallengeProgress
  runStreak: number
  onPlayAgain: () => void
  onBack: () => void
  promptCount?: number
}) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
      <p className="text-sm font-medium text-teal-300">{getResultLabel(score, promptCount)}</p>
      <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
        {score} / {promptCount}
      </h2>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResultMetric label="Score" value={`${score}/${promptCount}`} />
        <ResultMetric label="Streak" value={runStreak.toString()} />
        <ResultMetric label="Best streak" value={progress.bestStreak.toString()} />
        <ResultMetric label="Runs played" value={progress.totalRuns.toString()} />
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 sm:w-auto"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-md border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 sm:w-auto"
        >
          Back to start
        </button>
      </div>
    </div>
  )
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
