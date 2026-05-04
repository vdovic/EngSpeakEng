import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { NavBar } from '@/components/NavBar'
import { DashboardPage } from '@/pages/DashboardPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { ActiveWeekPage } from '@/pages/ActiveWeekPage'
import { DailyChallengePage } from '@/pages/DailyChallengePage'
import { ThemesPage } from '@/pages/ThemesPage'
import { ThemeDetailPage } from '@/pages/ThemeDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { Spinner } from '@/components/Spinner'
import { OnboardingModal } from '@/components/OnboardingModal'

// Lazy-load StatsPage — recharts adds ~370 KB; split it to keep initial bundle lean
const StatsPage = lazy(() => import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })))
import { useVocabStore } from '@/store/vocabStore'
import { useOnboardingStore } from '@/store/onboardingStore'

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
        <Routes>
          <Route path="/"        element={<DashboardPage onOpenOnboarding={handleOpenOnboarding} />} />
          <Route path="/inbox"   element={<Navigate to="/library" replace />} />
          <Route path="/review"  element={<ReviewPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/week"      element={<ActiveWeekPage />} />
          <Route path="/stats"     element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Spinner /></div>}><StatsPage /></Suspense>} />
          <Route path="/challenge" element={<DailyChallengePage />} />
          <Route path="/themes"    element={<ThemesPage />} />
          <Route path="/themes/:themeName" element={<ThemeDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
