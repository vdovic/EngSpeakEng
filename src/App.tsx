import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { NavBar } from '@/components/NavBar'
import { Spinner } from '@/components/Spinner'
import { OnboardingModal } from '@/components/OnboardingModal'
import { useVocabStore } from '@/store/vocabStore'
import { useOnboardingStore } from '@/store/onboardingStore'

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
  const { load, loaded } = useVocabStore()
  const { completed: onboardingCompleted, reset: resetOnboarding } = useOnboardingStore()
  const [showOnboarding, setShowOnboarding] = useState(false)

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
            <Route path="/"        element={<DashboardPage onOpenOnboarding={handleOpenOnboarding} />} />
            <Route path="/inbox"   element={<Navigate to="/library" replace />} />
            <Route path="/review"  element={<ReviewPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
            <Route path="/week"      element={<ActiveWeekPage />} />
            <Route path="/stats"     element={<StatsPage />} />
            <Route path="/challenge" element={<DailyChallengePage />} />
            <Route path="/themes"    element={<ThemesPage />} />
            <Route path="/themes/:themeName" element={<ThemeDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </main>

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
