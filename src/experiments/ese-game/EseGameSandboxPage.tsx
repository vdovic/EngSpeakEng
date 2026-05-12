import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  ESE_GAME_EXPERIMENT_ROUTE,
  PHRASE_UPGRADE_PROGRESS_KEY,
  SENTENCE_REPAIR_PROGRESS_KEY,
} from './constants'
import {
  PHRASE_UPGRADE_PROMPTS,
  PhraseUpgradePrompt,
  SENTENCE_REPAIR_PROMPTS,
  SentenceRepairPrompt,
} from './sampleData'
import {
  loadB2C1PhraseUpgradePrompts,
  loadB2C1SentenceRepairPrompts,
} from './starterPackVocabulary'
import {
  loadPhraseUpgradeProgress,
  loadSentenceRepairProgress,
  PhraseUpgradeProgress,
  savePhraseUpgradeProgress,
  saveSentenceRepairProgress,
  SentenceRepairProgress,
} from './storage'

const PROMPTS_PER_RUN = 6

type GameMode = 'sentence-repair' | 'phrase-upgrade'
type RunStatus = 'idle' | 'playing' | 'feedback' | 'complete'

interface RunAnswer {
  promptId: string
  selectedChoice: string
  isCorrect: boolean
  feedback?: string
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

function samplePrompts<TPrompt>(prompts: TPrompt[]) {
  return [...prompts].sort(() => Math.random() - 0.5).slice(0, PROMPTS_PER_RUN)
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
  const [mode, setMode] = useState<GameMode>('phrase-upgrade')

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
          <div className="mt-4 grid gap-2 sm:inline-grid sm:grid-cols-2">
            <ModeButton
              active={mode === 'phrase-upgrade'}
              label="Phrase Upgrade"
              onClick={() => setMode('phrase-upgrade')}
            />
            <ModeButton
              active={mode === 'sentence-repair'}
              label="Sentence Repair"
              onClick={() => setMode('sentence-repair')}
            />
          </div>
        </header>

        {mode === 'phrase-upgrade' ? <PhraseUpgradeMode /> : <SentenceRepairMode />}
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

function SentenceRepairMode() {
  const [progress, setProgress] = useState<SentenceRepairProgress>(() =>
    loadSentenceRepairProgress(),
  )
  const [run, setRun] = useState<SentenceRunState>(EMPTY_SENTENCE_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState<SentenceRepairPrompt>>({
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
      ...EMPTY_SENTENCE_RUN_STATE,
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
            body="Choose the word or phrase that sounds most natural in context."
            promptLibrary={promptLibrary}
            buttonLabel="Start run"
            onStart={startRun}
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

function PhraseUpgradeMode() {
  const [progress, setProgress] = useState<PhraseUpgradeProgress>(() =>
    loadPhraseUpgradeProgress(),
  )
  const [run, setRun] = useState<PhraseRunState>(EMPTY_PHRASE_RUN_STATE)
  const [promptLibrary, setPromptLibrary] = useState<PromptLibraryState<PhraseUpgradePrompt>>({
    prompts: [],
    status: 'loading',
    label: 'Loading B2-C1 starter packs',
    detail: 'Reading static JSON from /data/starter-packs only.',
  })

  useEffect(() => {
    let cancelled = false

    loadB2C1PhraseUpgradePrompts()
      .then((source) => {
        if (cancelled) {
          return
        }

        setPromptLibrary({
          prompts: [...PHRASE_UPGRADE_PROMPTS, ...source.prompts],
          status: 'ready',
          label: 'Curated prompts + B2-C1 starter packs',
          detail: `${PHRASE_UPGRADE_PROMPTS.length} curated prompts plus ${source.prompts.length} prompts from ${source.wordCount} words across ${source.packCount} static packs.`,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Static vocabulary fetch failed'
        setPromptLibrary({
          prompts: PHRASE_UPGRADE_PROMPTS,
          status: 'fallback',
          label: 'Curated fallback prompt set',
          detail: `${message}. Using local hardcoded phrase upgrades for this run.`,
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
      ...EMPTY_PHRASE_RUN_STATE,
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
          feedback: currentPrompt.weakChoiceFeedback?.[choice],
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
            body="Pick the sentence that sounds most natural, precise, and professional for B2-C1 English."
            promptLibrary={promptLibrary}
            buttonLabel="Start Phrase Upgrade"
            onStart={startRun}
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

function ModeLayout({
  children,
  progress,
  progressKey,
  promptLibraryLabel,
}: {
  children: ReactNode
  progress: SentenceRepairProgress | PhraseUpgradeProgress
  progressKey: string
  promptLibraryLabel: string
}) {
  return (
    <section className="flex flex-1 flex-col justify-center py-4 sm:py-6">
      {children}
      <aside className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <ResultMetric label="Best score" value={`${progress.bestScore} / ${PROMPTS_PER_RUN}`} />
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
  buttonLabel,
  onStart,
}: {
  eyebrow: string
  title: string
  body: string
  promptLibrary: PromptLibraryState<TPrompt>
  buttonLabel: string
  onStart: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
      <p className="text-sm font-medium text-teal-300">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-300">{body}</p>
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
        disabled={promptLibrary.status === 'loading'}
        className="mt-7 w-full rounded-md bg-teal-400 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {promptLibrary.status === 'loading' ? 'Loading prompts...' : buttonLabel}
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
}: {
  current: number
  score: number
  streak: number
  bestStreak: number
  progressPercent: number
}) {
  return (
    <>
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="font-medium text-neutral-300">
          Prompt {current} / {PROMPTS_PER_RUN}
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
}: {
  score: number
  progress: SentenceRepairProgress | PhraseUpgradeProgress
  runStreak: number
  onPlayAgain: () => void
  onBack: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-8">
      <p className="text-sm font-medium text-teal-300">{getResultLabel(score)}</p>
      <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
        {score} / {PROMPTS_PER_RUN}
      </h2>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResultMetric label="Score" value={`${score}/${PROMPTS_PER_RUN}`} />
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
