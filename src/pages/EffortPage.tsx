/**
 * EffortPage — the dedicated "Progress & Effort" analytics page (route /effort).
 *
 * Reached from navigation and from a compact summary card on the Main dashboard.
 * Kept separate from the reflective Progress page (/progress) so neither surface
 * is overloaded: /progress is atmospheric and present-tense; /effort is the
 * effort-and-growth analytics.
 *
 * All data is read live from the stores and passed to EffortView, which owns the
 * (CLAUDE.md-compliant) presentation.
 */

import { useMemo } from 'react'
import { useVocabStore } from '@/store/vocabStore'
import { usePracticeStore } from '@/store/practiceStore'
import { EffortView } from '@/components/EffortView'

export function EffortPage() {
  const items    = useVocabStore((s) => s.items)
  const sessions = usePracticeStore((s) => s.sessions)

  const nonArchived = useMemo(() => items.filter((i) => !i.archived), [items])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <header className="mb-2">
        <h1 className="text-2xl font-light text-slate-800">Progress &amp; Effort</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your consistency, cumulative growth, and how far you are through the whole vocabulary.
        </p>
      </header>

      <EffortView sessions={sessions} items={nonArchived} />
    </div>
  )
}
