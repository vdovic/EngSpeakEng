import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Star, Plus, CheckCircle2, Search } from 'lucide-react'
import { useVocabStore, useWeeklyFocusItems } from '@/store/vocabStore'
import { StatusBadge } from '@/components/StatusBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { UsageProgress } from '@/components/UsageProgress'
import { LogUsageModal } from '@/components/LogUsageModal'
import { usagePoints } from '@/lib/mastery'
import { VocabItem } from '@/types/vocabulary'

// ─── Tag-aware prompt system ──────────────────────────────────────────────────

const TAG_PROMPTS: Record<string, string[]> = {
  meetings:     ['Bring this up in your next team meeting.', 'Use this in your daily standup.', 'Try this in a retrospective or planning session.'],
  email:        ['Write this into a stakeholder email today.', 'Use it in a follow-up or update email.', 'Include this in a written decision or summary.'],
  diplomacy:    ['Use this when navigating a tense discussion.', 'Try this when clarifying a misunderstanding.', 'Use this to soften a difficult message.'],
  stakeholders: ['Use this when talking with a key stakeholder.', 'Include this in your next stakeholder update.', 'Try this when managing expectations.'],
  delivery:     ['Use this in your next delivery planning session.', 'Try this when discussing risks or blockers.', 'Use this in a sprint or release discussion.'],
  product:      ['Use this in a product review or sprint planning.', 'Include this in your product brief or PRD.', 'Try this in a discovery or prioritisation session.'],
  strategy:     ['Use this when presenting your roadmap.', 'Try this in a strategic discussion or OKR review.', 'Use this when aligning on long-term direction.'],
  chunks:       ['Say this out loud in your next meeting.', 'Use this to clarify your point in conversation.', 'Try this when you need to restate something clearly.'],
  risk:         ['Use this when raising a risk in a meeting.', 'Include this in a risk register or status update.', 'Try this when discussing delivery uncertainty.'],
}

const DEFAULT_PROMPTS = [
  'Use this in your next meeting about priorities.',
  'Include this in an email to a stakeholder.',
  'Use this when discussing scope or risk.',
  'Try this in your daily standup.',
  'Use this in a Confluence page or Jira comment.',
  'Use this when clarifying a misunderstanding.',
]

function getTagAwarePrompts(item: VocabItem): string[] {
  const picked: string[] = []

  for (const tag of item.tags) {
    const candidates = TAG_PROMPTS[tag]
    if (!candidates) continue
    for (const p of candidates) {
      if (!picked.includes(p)) picked.push(p)
      if (picked.length === 3) return picked
    }
  }

  // Fill remaining slots from defaults (vary by term to avoid repetition)
  const fallbacks = DEFAULT_PROMPTS.filter((p) => !picked.includes(p))
  while (picked.length < 3 && fallbacks.length > 0) {
    const idx = (item.term.length + picked.length) % fallbacks.length
    picked.push(fallbacks[idx])
    fallbacks.splice(idx, 1)
  }

  return picked
}

// ─── Week progress header ─────────────────────────────────────────────────────

function WeekHeader({ total, done }: { total: number; done: number }) {
  if (total === 0) return null
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="mb-5 bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Week progress</span>
        <span className="text-sm font-bold text-slate-900">
          {done}/{total} <span className="text-xs font-normal text-slate-400">completed</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            done === total && total > 0 ? 'bg-emerald-500' : 'bg-brand-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {done === total && total > 0 && (
        <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle2 size={13} />
          All items reached 3 uses — great week!
        </p>
      )}
    </div>
  )
}

// ─── Focus item card ──────────────────────────────────────────────────────────

interface FocusCardProps {
  item: VocabItem
  done: boolean
  usesDone: number
  onLogUsage: () => void
  onRemove: () => void
  onNavigate: () => void
}

function FocusCard({ item, done, usesDone, onLogUsage, onRemove, onNavigate }: FocusCardProps) {
  const prompts = getTagAwarePrompts(item)

  if (done) {
    return (
      <div className="bg-white border-2 border-emerald-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <button onClick={onNavigate} className="flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 line-through decoration-emerald-300">{item.term}</span>
              <TypeBadge type={item.type} />
            </div>
          </button>
          <UsageProgress done={usesDone} needed={3} size="sm" />
          <button
            onClick={onRemove}
            className="text-slate-300 hover:text-amber-500 transition-colors ml-1"
            title="Remove from this week"
          >
            <Star size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <button onClick={onNavigate} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-900 text-[15px]">{item.term}</span>
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </div>
          {item.definitionEn && (
            <p className="text-xs text-slate-500 line-clamp-1">{item.definitionEn}</p>
          )}
        </button>
        <button
          onClick={onRemove}
          className="text-amber-400 hover:text-slate-400 transition-colors mt-0.5"
          title="Remove from this week"
        >
          <Star size={16} fill="currentColor" />
        </button>
      </div>

      {/* Usage progress */}
      <div className="px-4 pb-3">
        <UsageProgress done={usesDone} needed={3} size="sm" />
      </div>

      {/* Prompts */}
      <div className="bg-amber-50 border-t border-amber-100 px-4 py-3 space-y-1.5">
        {prompts.map((prompt, i) => (
          <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5 leading-snug">
            <span className="font-bold shrink-0 mt-px">→</span>
            {prompt}
          </p>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={onLogUsage}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-[0.98] transition-all"
        >
          <Plus size={16} />
          I used it
        </button>
      </div>
    </div>
  )
}

// ─── Candidate browser ────────────────────────────────────────────────────────

function CandidateBrowser({
  candidates,
  onAdd,
  onNavigate,
}: {
  candidates: VocabItem[]
  onAdd: (id: string) => void
  onNavigate: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return candidates
    const q = query.toLowerCase()
    return candidates.filter(
      (i) =>
        i.term.toLowerCase().includes(q) ||
        i.definitionEn?.toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q))
    )
  }, [candidates, query])

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-3">Add items to this week</h2>

      {candidates.length > 6 && (
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter candidates…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300 bg-white"
          />
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.slice(0, 8).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors"
          >
            <button onClick={() => onNavigate(item.id)} className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-slate-800 truncate">{item.term}</span>
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
              </div>
              {item.definitionEn && (
                <p className="text-xs text-slate-400 truncate">{item.definitionEn}</p>
              )}
            </button>
            <button
              onClick={() => onAdd(item.id)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Star size={12} />
              Add
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No matching items.</p>
        )}

        {filtered.length > 8 && (
          <p className="text-xs text-slate-400 text-center py-2">
            +{filtered.length - 8} more — search to narrow down
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ActiveWeekPage() {
  const navigate = useNavigate()
  const weeklyItems = useWeeklyFocusItems()
  const { toggleWeeklyFocus, items } = useVocabStore()
  const [logTarget, setLogTarget] = useState<{ id: string; term: string } | null>(null)

  const { inProgress, completed } = useMemo(() => {
    const ip: VocabItem[] = []
    const done: VocabItem[] = []
    for (const item of weeklyItems) {
      const pts = usagePoints(item.activation.usageLogs)
      if (pts >= 3) done.push(item)
      else ip.push(item)
    }
    // Sort in-progress by most uses first (closest to done)
    ip.sort((a, b) => usagePoints(b.activation.usageLogs) - usagePoints(a.activation.usageLogs))
    return { inProgress: ip, completed: done }
  }, [weeklyItems])

  const candidates = useMemo(
    () => items.filter((i) => !i.weeklyFocus && i.status !== 'mastered' && i.status !== 'inbox'),
    [items]
  )

  const totalFocus = weeklyItems.length
  const totalDone = completed.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-1">
        <Target size={20} className="text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">Active This Week</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Use each item at least 3 times in real life — speaking or writing.
      </p>

      {/* Week progress bar */}
      <WeekHeader total={totalFocus} done={totalDone} />

      {/* Empty state */}
      {weeklyItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
          <Star size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600 mb-1">No active items this week</p>
          <p className="text-sm text-slate-400 mb-4">
            Star items from the library or item detail to track them here.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            Browse library
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {/* In-progress items first */}
          {inProgress.map((item) => (
            <FocusCard
              key={item.id}
              item={item}
              done={false}
              usesDone={usagePoints(item.activation.usageLogs)}
              onLogUsage={() => setLogTarget({ id: item.id, term: item.term })}
              onRemove={() => toggleWeeklyFocus(item.id)}
              onNavigate={() => navigate(`/item/${item.id}`)}
            />
          ))}

          {/* Completed items (collapsed, at bottom) */}
          {completed.length > 0 && (
            <>
              {inProgress.length > 0 && (
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider pt-2 pb-1 px-0.5">
                  Completed ✓
                </p>
              )}
              {completed.map((item) => (
                <FocusCard
                  key={item.id}
                  item={item}
                  done
                  usesDone={usagePoints(item.activation.usageLogs)}
                  onLogUsage={() => setLogTarget({ id: item.id, term: item.term })}
                  onRemove={() => toggleWeeklyFocus(item.id)}
                  onNavigate={() => navigate(`/item/${item.id}`)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Candidate browser */}
      {candidates.length > 0 && (
        <CandidateBrowser
          candidates={candidates}
          onAdd={(id) => toggleWeeklyFocus(id)}
          onNavigate={(id) => navigate(`/item/${id}`)}
        />
      )}

      {logTarget && (
        <LogUsageModal
          itemId={logTarget.id}
          term={logTarget.term}
          onClose={() => setLogTarget(null)}
        />
      )}
    </div>
  )
}
