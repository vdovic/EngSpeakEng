import { ArrowRight, Gamepad2 } from 'lucide-react'
import { ESE_GAME_EXPERIMENT_ROUTE } from './constants'

const isEseGameExperimentEnabled =
  import.meta.env.VITE_ENABLE_ESE_GAME_EXPERIMENT === 'true'

export function EseBetaEntryPoint() {
  if (!isEseGameExperimentEnabled) {
    return null
  }

  return (
    <section className="mt-5 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Gamepad2 size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">Practice Games</p>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Try lighter fluency drills for your active vocabulary. Challenges remain the main structured path.
            </p>
          </div>
        </div>
        <a
          href={ESE_GAME_EXPERIMENT_ROUTE}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
        >
          Open Practice Games
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
