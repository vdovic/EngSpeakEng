import { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Top-level error boundary.
 *
 * Catches any render-time exception in the React tree and shows a recovery
 * screen instead of a blank white page.  Vocab data is always safe — it lives
 * in IndexedDB and is never affected by a render crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd send to a crash-reporting service
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  private reload = () => window.location.reload()
  private recover = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          {/* Icon */}
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
            <AlertTriangle size={24} className="text-red-500" />
          </div>

          {/* Heading */}
          <h1 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The app hit an unexpected error. Your vocabulary data is safe — this is a display issue only.
          </p>

          {/* Error detail (collapsed) */}
          {this.state.error?.message && (
            <details className="mb-6 text-left">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none mb-1">
                Technical details
              </summary>
              <p className="text-xs text-slate-500 font-mono bg-slate-50 rounded-lg px-3 py-2 break-all leading-relaxed border border-slate-100">
                {this.state.error.message}
              </p>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={this.reload}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={15} />
              Reload app
            </button>
            <button
              onClick={this.recover}
              className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Try to recover
            </button>
          </div>
        </div>
      </div>
    )
  }
}
