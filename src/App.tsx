import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { NavBar } from '@/components/NavBar'
import { DashboardPage } from '@/pages/DashboardPage'
import { InboxPage } from '@/pages/InboxPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { ItemDetailPage } from '@/pages/ItemDetailPage'
import { ActiveWeekPage } from '@/pages/ActiveWeekPage'
import { StatsPage } from '@/pages/StatsPage'
import { useVocabStore } from '@/store/vocabStore'

export default function App() {
  const { load, loaded } = useVocabStore()

  useEffect(() => {
    load()
  }, [load])

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your vocabulary…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavBar />
      <main className="flex-1 overflow-y-auto min-h-screen">
        <Routes>
          <Route path="/"        element={<DashboardPage />} />
          <Route path="/inbox"   element={<InboxPage />} />
          <Route path="/review"  element={<ReviewPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/week"    element={<ActiveWeekPage />} />
          <Route path="/stats"   element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  )
}
