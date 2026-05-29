import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { Spinner } from '@/components/Spinner'
import { OnboardingModal } from '@/components/OnboardingModal'
import { QuickAddModal } from '@/components/QuickAddModal'
import { useVocabStore } from '@/store/vocabStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { loadTodaySession, PRACTICE_MODE_KEY } from '@/lib/challengeSession'
import { useDriveSyncStore } from '@/store/driveSyncStore'
import { detectOAuthCallback, clearCallbackFromUrl } from '@/lib/googleAuth'

// ── Eager-loaded pages (part of the initial bundle — fast critical paths) ───────

import { DashboardPage } from '@/pages/DashboardPage'

// ── Lazy-loaded pages (split to keep initial bundle lean) ─────────────────────

// StatsPage — recharts adds ~370 KB
const StatsPage = lazy(() =>
  import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage }))
)

// Heavy feature pages — loaded on demand
const ReviewPage = lazy(() =>
  import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage }))
)
const LibraryPage = lazy(() =>
  import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage }))
)
const ItemDetailPage = lazy(() =>
  import('@/pages/ItemDetailPage').then((m) => ({ default: m.ItemDetailPage }))
)
const ActiveWeekPage = lazy(() =>
  import('@/pages/ActiveWeekPage').then((m) => ({ default: m.ActiveWeekPage }))
)
const DailyChallengePage = lazy(() =>
  import('@/pages/DailyChallengePage').then((m) => ({ default: m.DailyChallengePage }))
)
const ThemesPage = lazy(() =>
  import('@/pages/ThemesPage').then((m) => ({ default: m.ThemesPage }))
)
const ThemeDetailPage = lazy(() =>
  import('@/pages/ThemeDetailPage').then((m) => ({ default: m.ThemeDetailPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const AtlasPage = lazy(() => import('@/pages/AtlasPage'))

// ── DeepPracticeIndicator ─────────────────────────────────────────────────────
// Shown across the whole app (except on /challenge itself) when a Deep Practice
// session is in progress. Tapping it returns the user to the challenge.
// No interval: reads localStorage on each navigation to stay up to date.

function DeepPracticeIndicator() {
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname === '/challenge') return null

  const session = loadTodaySession()
  const mode = localStorage.getItem(PRACTICE_MODE_KEY)
  if (!session || session.completed || session.isBonus || mode !== 'deep') return null

  const word = session.slots[session.currentIndex]
  const label = word ? `"${word.itemId}"` : null
  void label // display-only, not used in this pill for brevity

  return (
    <button
      onClick={() => navigate('/challenge')}
      className="fixed top-3 right-3 z-40 flex items-center gap-1.5 bg-indigo-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-indigo-700 transition-colors select-none"
      title="Return to your active Deep Practice session"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-200 shrink-0" aria-hidden="true" />
      Deep Practice · active
    </button>
  )
}

// ── Page-level suspense fallback ──────────────────────────────────────────────

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner />
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { load, loaded } = useVocabStore()
  const { completed: onboardingCompleted, reset: resetOnboarding } = useOnboardingStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showQuickAdd,   setShowQuickAdd]   = useState(false)

  // ── Google Drive OAuth callback + store hydration ─────────────────────────────
  // Runs once on mount. Handles the redirect back from Google's OAuth page,
  // and ensures the Drive sync store is hydrated from localStorage on every load.
  useEffect(() => {
    // Hydrate Drive auth + metadata from localStorage on every app start
    useDriveSyncStore.getState().hydrate()

    // Handle OAuth2 PKCE callback (?code=...&state=... in the URL)
    const callback = detectOAuthCallback()
    if (!callback) return

    clearCallbackFromUrl()  // clean up URL before any other logic

    if (callback.type === 'error') {
      useDriveSyncStore.getState().setError(
        `Google Drive sign-in was declined: ${callback.error}`
      )
    } else {
      useDriveSyncStore
        .getState()
        .completeOAuthCallback(callback.code, callback.state)
        .catch(() => { /* error already set in the store */ })
    }

    // Navigate to Settings so the user sees the connection result
    navigate('/settings', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [load])

  // Show onboarding once data is loaded and user hasn't completed it yet
  useEffect(() => {
    if (loaded && !onboardingCompleted) {
      setShowOnboarding(true)
    }
  }, [loaded, onboardingCompleted])

  function handleOpenOnboarding() {
    resetOnboarding()        // clear previous selections so steps start fresh
    setShowOnboarding(true)
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your vocabulary…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavBar />

      {/* pb-safe adds env(safe-area-inset-bottom) on top of each page's own
          bottom padding so content is never hidden under the iPhone home bar. */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-safe md:pb-0">
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Primary routes */}
            <Route path="/"          element={<DashboardPage onOpenOnboarding={handleOpenOnboarding} />} />
            <Route path="/focus"     element={<ActiveWeekPage />} />
            <Route path="/progress"  element={<StatsPage />} />
            <Route path="/review"    element={<ReviewPage />} />
            <Route path="/library"   element={<LibraryPage />} />
            <Route path="/item/:id"  element={<ItemDetailPage />} />
            <Route path="/challenge" element={<DailyChallengePage />} />
            <Route path="/themes"    element={<ThemesPage />} />
            <Route path="/themes/:themeName" element={<ThemeDetailPage />} />
            <Route path="/settings"  element={<SettingsPage />} />

            <Route path="/atlas"     element={<AtlasPage />} />

            {/* Legacy aliases — redirect to canonical routes */}
            <Route path="/inbox"  element={<Navigate to="/library"  replace />} />
            <Route path="/week"   element={<Navigate to="/focus"    replace />} />
            <Route path="/stats"  element={<Navigate to="/progress" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* ── Global floating add button ── */}
      {/* Hidden on /progress and /atlas — reflective / exploration surfaces */}
      {location.pathname !== '/progress' && location.pathname !== '/atlas' && (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-[4.5rem] right-4 md:bottom-6 md:right-6 z-20 w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Add word"
        >
          <Plus size={22} />
        </button>
      )}

      {/* Deep Practice session indicator — visible app-wide except on /challenge */}
      <DeepPracticeIndicator />

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  )
}
