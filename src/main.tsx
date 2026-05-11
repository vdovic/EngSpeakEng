import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { EseGameSandboxPage } from '@/experiments/ese-game/EseGameSandboxPage'
import { ESE_GAME_EXPERIMENT_ROUTE } from '@/experiments/ese-game/constants'
import './index.css'

function ExperimentUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Experiment unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold">ESE Game Sandbox is disabled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Enable it in local development with VITE_ENABLE_ESE_GAME_EXPERIMENT=true.
        </p>
      </div>
    </main>
  )
}

const isEseGameExperimentPath = window.location.pathname === ESE_GAME_EXPERIMENT_ROUTE

const isEseGameExperimentEnabled =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_ESE_GAME_EXPERIMENT === 'true'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isEseGameExperimentPath ? (
        isEseGameExperimentEnabled ? <EseGameSandboxPage /> : <ExperimentUnavailable />
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>
)
