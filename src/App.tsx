import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { Spinner } from '@/components/Spinner'
import { OnboardingModal } from '@/components/OnboardingModal'
import { QuickAddModal } from '@/components/QuickAddModal'
import { useVocabStore } from '@/store/vocabStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemesStore } from '@/store/themesStore'
import { loadTodaySession, PRACTICE_MODE_KEY } from '@/lib/challengeSession'
import { useDriveSyncStore, type ConfirmMergeHelpers } from '@/store/driveSyncStore'
import { detectOAuthCallback, clearCallbackFromUrl } from '@/lib/googleAuth'
import type { ExportExtras, GamificationSnapshot } from '@/lib/vocabImportExport'
import { useSpeedGameStore } from '@/store/speedGameStore'
import { usePracticeStore } from '@/store/practiceStore'

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
const EffortPage = lazy(() =>
  import('@/pages/EffortPage').then((m) => ({ default: m.EffortPage }))
)
const SpeedGamePage = lazy(() =>
  import('@/pages/SpeedGamePage').then((m) => ({ default: m.SpeedGamePage }))
)

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
  const syncNotification = useDriveSyncStore((s) => s.syncNotification)

  // ── Drive sync: hydrate + OAuth callback ─────────────────────────────────────
  // Runs once on mount. Hydrates Drive store from localStorage.
  // Handles the redirect back from Google's OAuth consent page (?code=&state=).
  useEffect(() => {
    useDriveSyncStore.getState().hydrate()

    const callback = detectOAuthCallback()
    if (!callback) return

    clearCallbackFromUrl()

    if (callback.type === 'error') {
      useDriveSyncStore.getState().setError(
        `Google Drive sign-in was declined: ${callback.error}`
      )
    } else {
      useDriveSyncStore
        .getState()
        .completeOAuthCallback(callback.code, callback.state)
        .catch(() => { /* error already set in store */ })
    }

    navigate('/settings', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drive auto-sync ───────────────────────────────────────────────────────────
  // Runs after vocab data is loaded.
  //
  // Triggers:
  //   • Initial load     — pull from Drive, merge, push merged result back
  //   • Page visible     — same (catches changes made on the other device)
  //   • Page hidden      — push local state (saves before user switches apps)
  //   • After add/edit   — silentSync 1.5 s after items.length increases (most
  //                        reliable mobile path: doesn't depend on visibility events)
  //   • Every 2 minutes  — periodic fallback for iOS where visibilitychange is
  //                        unreliable when the app is backgrounded
  //
  // All operations are silent: no preview panel, errors logged but not surfaced.
  // If a manual merge preview (pendingMerge) is open the auto-sync is skipped.
  useEffect(() => {
    if (!loaded) return

    /** Build the current local state snapshot for a sync operation.
     *  Reads exclusively from store.getState() so it is safe to call
     *  from any context (effects, timers, subscriptions). */
    function buildSyncArgs(): {
      localItems: ReturnType<typeof useVocabStore.getState>['items']
      extras:     ExportExtras
      helpers:    ConfirmMergeHelpers
    } {
      const vocab     = useVocabStore.getState()
      const gami      = useGamificationStore.getState()
      const themes    = useThemesStore.getState()
      const ob        = useOnboardingStore.getState()
      const speedGame = useSpeedGameStore.getState()
      const practice  = usePracticeStore.getState()

      const extras: ExportExtras = {
        gamification: {
          points:               gami.points,
          streakDays:           gami.streakDays,
          lastChallengeDate:    gami.lastChallengeDate,
          badges:               gami.badges,
          challengeCompletions: gami.challengeCompletions,
          pointsHistory:        gami.pointsHistory,
          goalTarget:           gami.goalTarget,
          goalStartDate:        gami.goalStartDate,
          goalDeadline:         gami.goalDeadline,
          gamesPlayed:          gami.gamesPlayed,
          bestGameStreak:       gami.bestGameStreak,
        } as GamificationSnapshot,
        themes: themes.themes,
        preferences: {
          onboardingCompleted: ob.completed,
          onboardingProfile:   ob.profile ?? undefined,
        },
        speedGameResults: speedGame.results,
        practiceSessions: practice.sessions,
      }

      const helpers: ConfirmMergeHelpers = {
        bulkImport:            vocab.bulkImport,
        applyGamification:     (snap) => useGamificationStore.setState(snap),
        applySpeedGameResults: (results) => useSpeedGameStore.getState().setResults(results),
        applyPracticeSessions: (sessions) => usePracticeStore.getState().setSessions(sessions),
        addTheme:              themes.addTheme,
        currentThemes:         themes.themes,
        localItems:            vocab.items,
        extras,
      }

      return { localItems: vocab.items, extras, helpers }
    }

    function triggerSilentSync() {
      const drive = useDriveSyncStore.getState()
      if (!drive.isAuthenticated) return
      const { localItems, extras, helpers } = buildSyncArgs()
      void drive.silentSync(localItems, extras, helpers)
    }

    function triggerSilentPush() {
      const drive = useDriveSyncStore.getState()
      if (!drive.isAuthenticated || drive.status !== 'idle') return
      const { localItems, extras } = buildSyncArgs()
      // Fire-and-forget: page is hiding, best effort
      void drive.push(localItems, extras)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') triggerSilentSync()
      else triggerSilentPush()
    }

    // Sync on first load
    triggerSilentSync()

    // Visibility-change sync (catches tab-switching and app-switching)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Periodic fallback — fires every 2 minutes while the app is open.
    // Handles iOS Safari where visibilitychange is unreliable on background.
    const periodicId = setInterval(triggerSilentSync, 2 * 60 * 1000)

    // Push-after-save — most reliable mobile path.
    // When items.length grows (word added), trigger a full silentSync after 1.5 s.
    // This gets the new word to Drive before the user switches apps,
    // without relying on visibilitychange firing (which iOS can suppress).
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let prevItemCount = useVocabStore.getState().items.length
    const unsubItems = useVocabStore.subscribe((state) => {
      const n = state.items.length
      if (n > prevItemCount) {
        prevItemCount = n
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(triggerSilentSync, 1500)
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(periodicId)
      unsubItems()
      if (saveTimer) clearTimeout(saveTimer)
    }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

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

            <Route path="/atlas"       element={<AtlasPage />} />
            <Route path="/effort"      element={<EffortPage />} />
            <Route path="/game/speed"  element={<SpeedGamePage />} />

            {/* Legacy aliases — redirect to canonical routes */}
            <Route path="/inbox"  element={<Navigate to="/library"  replace />} />
            <Route path="/week"   element={<Navigate to="/focus"    replace />} />
            <Route path="/stats"  element={<Navigate to="/progress" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* ── Global floating add button ── */}
      {/* Hidden on /progress, /atlas and /effort — reflective / analytics surfaces */}
      {location.pathname !== '/progress' && location.pathname !== '/atlas' && location.pathname !== '/effort' && (
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

      {/* ── Auto-sync notification toast ── */}
      {syncNotification && (
        <div
          key={syncNotification.id}
          className="fixed bottom-[5.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-sm font-medium rounded-full shadow-lg whitespace-nowrap animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" aria-hidden="true" />
            {syncNotification.message}
          </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  )
}
