import { useEffect, useMemo, useState } from 'react'
import { ESE_GAME_EXPERIMENT_ROUTE, SENTENCE_REPAIR_PROGRESS_KEY } from './constants'
import { SENTENCE_REPAIR_PROMPTS, SentenceRepairPrompt } from './sampleData'
import { loadB2C1SentenceRepairPrompts } from './starterPackVocabulary'
import {
  loadSentenceRepairProgress,
  saveSentenceRepairProgress,
  SentenceRepairProgress,
} from './storage'

const PROMPTS_PER_RUN = 6

type RunStatus = 'idle' | 'playing' | 'feedback' | 'complete'

interface RunAnswer {
  promptId: string
  selectedChoice: string
  isCorrect: boolean
  feedback?: string
}

interface RunState {
  status: RunStatus
  promptIndex: number
  prompts: SentenceRepairPrompt[]
  answers: RunAnswer[]
  score: number
  streak: number
  bestStreak: number
  selectedChoice: string | null
}

interface PromptLibraryState {
  prompts: SentenceRepairPrompt[]
  status: 'loading' | 'ready' | 'fallback'
  label: string
  detail: string
}

const EMPTY_RUN_STATE: RunState = {
  status: 'idle',
  promptIndex: 0,
  prompts: [],
  answers: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  selectedChoice: null,
}

function samplePrompts(prompts: SentenceRepairPrompt[]) {
  return [...prompts]
    .sort(() => Math.random() - 0.5)
    .slice(0, PROMPTS_PER_RUN)
}

function getResultLabel(score: number) {
  if (score === PROMPTS_PER_RUN) {
    return 'Clean run'
  }
  if (score >= 5) {
    return 'Natural ear'
  }
  if (score >= 3) {
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
  const [progress, setProgress] = useState<SentenceRepairProgress>(() =>
    loadSentenceRepairProgress(),
  )
  const [run, setRun] = useState<RunState>(EMPTY_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState>({
    prompts: [],
    status: 'loading',
    label: 'Loading B2-C1 starter packs',
    detail: 'Reading static JSON from /data/starter-packs only.',
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
          label: 'B2-C1 starter packs',
          detail: `${source.prompts.length} prompts from ${source.wordCount} words across ${source.packCount} static packs.`,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setPromptLibrary({
          prompts: SENTENCE_REPAIR_PROMPTS,
          status: 'fallback',
          label: 'Fallback prompt set',
          detail: `${message}. Using local hardcoded prompts for this run.`,
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
    if (promptLibrary.status === 'loading') {
      return
    }

    setRun({
      ...EMPTY_RUN_STATE,
      status: 'playing',
      prompts: samplePrompts(promptLibrary.prompts),
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-8 sm:py-6">
        <header className="border-b border-neutral-800 pb-4 sm:pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Local experiment
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                Sentence Repair
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300 sm:mt-3">
                Fix six unnatural sentences. No production stores, APIs, or vocabulary writes.
              </p>
            </div>
            <div className="w-fit max-w-full break-all rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-400">
              {ESE_GAME_EXPERIMENT_ROUTE}
            </div>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-4 sm:py-6">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-2xl shadow-black/20 sm:p-6">
            {run.status === 'idle' && (
              <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
                <p className="text-sm font-medium text-teal-300">B2-C1 starter packs</p>
                <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                  Fix 6 sentences before the run ends.
                </h2>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  Choose the word or phrase that sounds most natural in context.
                </p>
                <div className="mx-auto mt-5 max-w-md rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Vocabulary source
                  </p>
                  <p className="mt-1 text-sm font-medium text-neutral-100">
                    {promptLibrary.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">
                    {promptLibrary.detail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startRun}
                  disabled={promptLibrary.status === 'loading'}
                  className="mt-7 w-full rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {promptLibrary.status === 'loading' ? 'Loading prompts...' : 'Start run'}
                </button>
              </div>
            )}

            {(run.status === 'playing' || run.status === 'feedback') && currentPrompt && (
              <div>
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="font-medium text-neutral-300">
                    Sentence {run.promptIndex + 1} / {PROMPTS_PER_RUN}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-400">
                    <span>Score {run.score}</span>
                    <span>Streak {run.streak}</span>
                    <span>Best {run.bestStreak}</span>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-6 rounded-md border border-neutral-800 bg-neutral-950 p-4 sm:mt-8 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Repair the highlighted phrase
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentPrompt.difficulty && (
                      <span className="rounded bg-teal-400/10 px-2 py-1 text-xs font-semibold text-teal-300">
                        {currentPrompt.difficulty}
                      </span>
                    )}
                    {currentPrompt.register && (
                      <span className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300">
                        {currentPrompt.register}
                      </span>
                    )}
                    {(currentPrompt.tags ?? []).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xl leading-8 text-white sm:text-2xl sm:leading-10">
                    {currentPrompt.sentence.split(currentPrompt.target)[0]}
                    <mark className="rounded bg-amber-300 px-1 text-neutral-950">
                      {currentPrompt.target}
                    </mark>
                    {currentPrompt.sentence.split(currentPrompt.target).slice(1).join(currentPrompt.target)}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {currentPrompt.choices.map((choice) => {
                    const isSelected = run.selectedChoice === choice
                    const isCorrect = currentPrompt.correctChoice === choice
                    const showCorrect = run.status === 'feedback' && isCorrect
                    const showIncorrect = run.status === 'feedback' && isSelected && !isCorrect

                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => selectChoice(choice)}
                        disabled={run.status === 'feedback'}
                        className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm font-semibold shadow-sm transition active:scale-[0.99] ${
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

                {run.status === 'feedback' && latestAnswer && (
                  <div className="mt-6 rounded-md border border-neutral-700 bg-neutral-950 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            latestAnswer.isCorrect ? 'text-teal-300' : 'text-rose-300'
                          }`}
                        >
                          {latestAnswer.isCorrect ? 'Correct' : 'Not quite'}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                          {currentPrompt.skillFocus ?? 'sentence repair'}
                        </p>
                      </div>
                      {!latestAnswer.isCorrect && (
                        <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
                          Your pick: <span className="font-semibold text-rose-300">{latestAnswer.selectedChoice}</span>
                        </div>
                      )}
                    </div>

                    {!latestAnswer.isCorrect && latestAnswer.feedback && (
                      <p className="mt-4 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm leading-6 text-rose-100">
                        {latestAnswer.feedback}
                      </p>
                    )}

                    <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        Best repair
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-100">
                        {repairSentence(currentPrompt)}
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-neutral-300">
                      {currentPrompt.explanation}
                    </p>
                    <button
                      type="button"
                      onClick={continueRun}
                      className="mt-4 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 sm:w-auto sm:py-2"
                    >
                      {run.promptIndex + 1 >= run.prompts.length ? 'Show result' : 'Continue'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {run.status === 'complete' && (
              <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
                <p className="text-sm font-medium text-teal-300">{getResultLabel(run.score)}</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {run.score} / {PROMPTS_PER_RUN}
                </h2>
                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ResultMetric label="Score" value={`${run.score}/${PROMPTS_PER_RUN}`} />
                  <ResultMetric label="Streak" value={run.streak.toString()} />
                  <ResultMetric label="Best streak" value={progress.bestStreak.toString()} />
                  <ResultMetric label="Runs played" value={progress.totalRuns.toString()} />
                </div>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={startRun}
                    className="w-full rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 sm:w-auto"
                  >
                    Play again
                  </button>
                  <button
                    type="button"
                    onClick={() => setRun(EMPTY_RUN_STATE)}
                    className="w-full rounded-md border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 sm:w-auto"
                  >
                    Back to start
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-neutral-500">Best score</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {progress.bestScore} / {PROMPTS_PER_RUN}
              </p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-neutral-500">Best streak</p>
              <p className="mt-1 text-lg font-semibold text-white">{progress.bestStreak}</p>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-neutral-500">Storage / source</p>
              <p className="mt-1 break-all text-xs font-medium text-neutral-300">
                {SENTENCE_REPAIR_PROGRESS_KEY}
              </p>
              <p className="mt-2 text-xs text-neutral-500">{promptLibrary.label}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
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
