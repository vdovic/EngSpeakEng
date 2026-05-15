import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ESE_GAME_EXPERIMENT_ROUTE } from '@/experiments/ese-game/constants'
import './index.css'

const EseGameSandboxPage = React.lazy(() =>
  import('@/experiments/ese-game/EseGameSandboxPage').then((module) => ({
    default: module.EseGameSandboxPage,
  })),
)

function ExperimentUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Practice Games unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Practice Games are not enabled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Enable it by setting VITE_ENABLE_ESE_GAME_EXPERIMENT=true before building.
        </p>
      </div>
    </main>
  )
}

function ExperimentLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Loading Practice Games
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Opening Practice Games</h1>
      </div>
    </main>
  )
}

const isEseGameExperimentPath = window.location.pathname === ESE_GAME_EXPERIMENT_ROUTE

const isEseGameExperimentEnabled =
  import.meta.env.VITE_ENABLE_ESE_GAME_EXPERIMENT === 'true'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isEseGameExperimentPath ? (
        isEseGameExperimentEnabled ? (
          <React.Suspense fallback={<ExperimentLoading />}>
            <EseGameSandboxPage />
          </React.Suspense>
        ) : (
          <ExperimentUnavailable />
        )
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
