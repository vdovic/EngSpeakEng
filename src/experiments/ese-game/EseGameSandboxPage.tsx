import { useEffect, useMemo, useState } from 'react'
import { ESE_GAME_EXPERIMENT_DB_NAME, ESE_GAME_EXPERIMENT_ROUTE } from './constants'
import { SANDBOX_WORDS } from './sampleData'
import {
  EseGameSandboxState,
  getSandboxLastOpened,
  loadSandboxState,
  markSandboxOpened,
  saveSandboxState,
} from './storage'

export function EseGameSandboxPage() {
  const [state, setState] = useState<EseGameSandboxState | null>(null)
  const [lastOpened, setLastOpened] = useState<string | null>(null)
  const [status, setStatus] = useState('Loading sandbox storage...')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        markSandboxOpened()
        const saved = await loadSandboxState()
        if (!cancelled) {
          setState(saved)
          setLastOpened(getSandboxLastOpened())
          setStatus('Experiment storage ready')
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Storage failed')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedWord = useMemo(
    () => SANDBOX_WORDS.find((word) => word.id === state?.selectedWordId) ?? SANDBOX_WORDS[0],
    [state?.selectedWordId],
  )

  async function updateSelectedWord(selectedWordId: string) {
    const next = await saveSandboxState({ selectedWordId })
    setState(next)
  }

  async function startSandboxRun() {
    const next = await saveSandboxState({
      runCount: (state?.runCount ?? 0) + 1,
    })
    setState(next)
  }

  async function updateNotes(notes: string) {
    const next = await saveSandboxState({ notes })
    setState(next)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="border-b border-zinc-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Local experiment
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
            ESE Game Sandbox
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            A separate development surface for testing game mechanics without loading the
            production vocabulary store.
          </p>
        </header>

        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedWord.term}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">
                  {selectedWord.definition}
                </p>
              </div>
              <button
                type="button"
                onClick={startSandboxRun}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Start run
              </button>
            </div>

            <div className="mt-6 rounded-md border border-zinc-700 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Prompt
              </p>
              <p className="mt-2 text-base leading-7 text-zinc-100">{selectedWord.prompt}</p>
            </div>

            <label className="mt-6 block text-sm font-medium text-zinc-200" htmlFor="sandbox-notes">
              Experiment notes
            </label>
            <textarea
              id="sandbox-notes"
              value={state?.notes ?? ''}
              onChange={(event) => updateNotes(event.target.value)}
              className="mt-2 min-h-32 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
              placeholder="Track mechanic ideas, friction, and learning-loop fit."
            />
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Sandbox words
              </h2>
              <div className="mt-4 space-y-2">
                {SANDBOX_WORDS.map((word) => (
                  <button
                    key={word.id}
                    type="button"
                    onClick={() => updateSelectedWord(word.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      word.id === selectedWord.id
                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-100'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {word.term}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-300">
              <h2 className="font-semibold text-white">Isolation status</h2>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-zinc-500">Route</dt>
                  <dd className="break-all text-zinc-200">{ESE_GAME_EXPERIMENT_ROUTE}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">IndexedDB</dt>
                  <dd className="text-zinc-200">{ESE_GAME_EXPERIMENT_DB_NAME}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Runs</dt>
                  <dd className="text-zinc-200">{state?.runCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="text-zinc-200">{status}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Last opened</dt>
                  <dd className="break-all text-zinc-200">{lastOpened ?? 'Not recorded'}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
