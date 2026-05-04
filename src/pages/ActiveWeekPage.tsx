import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Star, Plus, CheckCircle2, Search, Zap, Info, TrendingUp, X } from 'lucide-react'
import { useVocabStore, useFocusThisWeekItems } from '@/store/vocabStore'
import { LevelBadge } from '@/components/LevelBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { UsageProgress } from '@/components/UsageProgress'
import { LogUsageModal } from '@/components/LogUsageModal'
import { usagePoints } from '@/lib/mastery'
import { VocabItem } from '@/types/vocabulary'
import { FOCUS_MAX, FOCUS_RECOMMENDED_MIN, FOCUS_RECOMMENDED_MAX, getRuleACandidates } from '@/lib/focusWeek'

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
  const fallbacks = DEFAULT_PROMPTS.filter((p) => !picked.includes(p))
  while (picked.length < 3 && fallbacks.length > 0) {
    const idx = (item.term.length + picked.length) % fallbacks.length
    picked.push(fallbacks[idx])
    fallbacks.splice(idx, 1)
  }
  return picked
}

// ─── Capacity indicator ───────────────────────────────────────────────────────

function CapacityBar({ count }: { count: number }) {
  const pct = Math.min((count / FOCUS_MAX) * 100, 100)
  const tooFew = count < FOCUS_RECOMMENDED_MIN
  const ideal = count >= FOCUS_RECOMMENDED_MIN && count <= FOCUS_RECOMMENDED_MAX
  const tooMany = count > FOCUS_RECOMMENDED_MAX && count <= FOCUS_MAX
  const atCap = count >= FOCUS_MAX

  const barColour = atCap
    ? 'bg-red-500'
    : tooMany
    ? 'bg-amber-500'
    : ideal
    ? 'bg-emerald-500'
    : 'bg-brand-500'

  const label = atCap
    ? 'At limit — remove lower-priority words to add new ones'
    : tooMany
    ? `${count} words — slightly above the ideal range`
    : ideal
    ? `${count} words — perfect range`
    : tooFew && count > 0
    ? `${count} words — add more for a richer practice set`
    : ''

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-500">
          {count} / {FOCUS_MAX} words in focus
        </span>
        <span className={`text-[10px] font-medium ${atCap ? 'text-red-500' : tooMany ? 'text-amber-600' : ideal ? 'text-emerald-600' : 'text-slate-400'}`}>
          ideal: {FOCUS_RECOMMENDED_MIN}–{FOCUS_RECOMMENDED_MAX}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && (
        <p className="text-[10px] text-slate-400 mt-1">{label}</p>
      )}
    </div>
  )
}

// ─── Week progress header ─────────────────────────────────────────────────────

function WeekHeader({ total, done }: { total: number; done: number }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="mb-5 bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Week progress</span>
        <span className="text-sm font-bold text-slate-900">
          {done}/{total} <span className="text-xs font-normal text-slate-400">used 3× this week</span>
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
          All focus words reached 3 uses — outstanding week!
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
            className="text-slate-300 hover:text-red-400 transition-colors ml-1"
            title="Remove from My Current Focus"
          >
            <X size={16} />
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
            <LevelBadge item={item} />
          </div>
          {item.definitionEn && (
            <p className="text-xs text-slate-500 line-clamp-1">{item.definitionEn}</p>
          )}
        </button>
        <button
          onClick={onRemove}
          className="text-slate-300 hover:text-red-400 transition-colors mt-0.5"
          title="Remove from My Current Focus"
        >
          <X size={16} />
        </button>
      </div>

      {/* Usage progress */}
      <div className="px-4 pb-3">
        <UsageProgress done={usesDone} needed={3} size="sm" />
      </div>

      {/* Real-life prompts */}
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

// ─── Auto-suggest panel (Rule A) ──────────────────────────────────────────────

function AutoSuggestPanel({
  suggestions,
  currentCount,
  onAdd,
  onDismiss,
}: {
  suggestions: VocabItem[]
  currentCount: number
  onAdd: (id: string) => void
  onDismiss: () => void
}) {
  if (suggestions.length === 0) return null
  const canAdd = currentCount < FOCUS_MAX

  return (
    <div className="mb-5 bg-brand-50 border border-brand-200 rounded-2xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <TrendingUp size={15} className="text-brand-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-800 leading-snug">
            Ready to practise in real life
          </p>
          <p className="text-xs text-brand-600 mt-0.5">
            You've reviewed {suggestions.length === 1 ? 'this word' : 'these words'} enough to start using {suggestions.length === 1 ? 'it' : 'them'} — add to My Current Focus.
          </p>
        </div>
        <button onClick={onDismiss} className="text-brand-300 hover:text-brand-500 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5">
        {suggestions.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center gap-2 bg-white border border-brand-100 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-900">{item.term}</span>
              {item.definitionEn && (
                <p className="text-xs text-slate-400 truncate">{item.definitionEn}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">{item.review.successfulRecalls} reviews</span>
            {canAdd ? (
              <button
                onClick={() => onAdd(item.id)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-100 rounded-lg hover:bg-brand-200 transition-colors"
              >
                <Plus size={11} /> Add
              </button>
            ) : (
              <span className="text-[10px] text-slate-300 shrink-0">Cap reached</span>
            )}
          </div>
        ))}
        {suggestions.length > 4 && (
          <p className="text-xs text-brand-500 text-center pt-1">
            +{suggestions.length - 4} more ready — browse library to add
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Candidate browser ────────────────────────────────────────────────────────

function CandidateBrowser({
  candidates,
  currentCount,
  onAdd,
  onNavigate,
}: {
  candidates: VocabItem[]
  currentCount: number
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

  const atCap = currentCount >= FOCUS_MAX

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-3">Add words to Focus</h2>

      {atCap && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700">
          <Info size={13} className="shrink-0" />
          Focus is at the 50-word limit. Remove a word first to add a new one.
        </div>
      )}

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
                <LevelBadge item={item} />
              </div>
              {item.definitionEn && (
                <p className="text-xs text-slate-400 truncate">{item.definitionEn}</p>
              )}
            </button>
            <button
              onClick={() => !atCap && onAdd(item.id)}
              disabled={atCap}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Star size={12} />
              Add
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No matching words.</p>
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
  const focusItems = useFocusThisWeekItems()
  const { setFocusThisWeek, items } = useVocabStore()
  const [logTarget, setLogTarget] = useState<{ id: string; term: string } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)

  const { inProgress, completed } = useMemo(() => {
    const ip: VocabItem[] = []
    const done: VocabItem[] = []
    for (const item of focusItems) {
      const pts = usagePoints(item.activation.usageLogs)
      if (pts >= 3) done.push(item)
      else ip.push(item)
    }
    ip.sort((a, b) => usagePoints(b.activation.usageLogs) - usagePoints(a.activation.usageLogs))
    return { inProgress: ip, completed: done }
  }, [focusItems])

  // Rule A suggestions — words reviewed 2-3 times, not yet in focus
  const autoSuggestions = useMemo(
    () => (!dismissedSuggestions ? getRuleACandidates(items) : []),
    [items, dismissedSuggestions],
  )

  const candidates = useMemo(
    () =>
      items
        .filter((i) => !i.weeklyFocus && i.status !== 'mastered' && i.status !== 'inbox')
        .sort((a, b) => (b.focusPriority ?? 0) - (a.focusPriority ?? 0)),
    [items],
  )

  const totalFocus = focusItems.length
  const totalDone = completed.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

      {/* Page title */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">My Current Focus</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">
            The words you're actively practising in real life — aim for 100–150.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/challenge')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
          >
            <Zap size={12} /> Practice now
          </button>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="What is My Current Focus?"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-800">My Current Focus</p>
          <p>These are the words you're actively working to <em>use</em>, not just recognise. Keep this list small and deliberate.</p>
          <p>The system auto-selects words based on what you've learned, where you're struggling, and what matters for your goals. Your goal: use each word at least 3× in real life this week.</p>
          <p className="text-slate-400">Ideal range: {FOCUS_RECOMMENDED_MIN}–{FOCUS_RECOMMENDED_MAX} words. Maximum: {FOCUS_MAX}. Words are refreshed each Monday.</p>
        </div>
      )}

      {/* Capacity bar */}
      {totalFocus > 0 && <CapacityBar count={totalFocus} />}

      {/* Week progress */}
      <WeekHeader total={totalFocus} done={totalDone} />

      {/* Auto-suggestions (Rule A) */}
      <AutoSuggestPanel
        suggestions={autoSuggestions}
        currentCount={totalFocus}
        onAdd={(id) => setFocusThisWeek(id, true)}
        onDismiss={() => setDismissedSuggestions(true)}
      />

      {/* Empty state */}
      {focusItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
          <Target size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600 mb-1">No words in focus yet</p>
          <p className="text-sm text-slate-400 mb-4 max-w-xs mx-auto">
            The system adds words automatically as you learn. You can also add them manually below.
          </p>
          <button
            onClick={() => navigate('/challenge')}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
          >
            Start Daily Challenge
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {/* In-progress items */}
          {inProgress.map((item) => (
            <FocusCard
              key={item.id}
              item={item}
              done={false}
              usesDone={usagePoints(item.activation.usageLogs)}
              onLogUsage={() => setLogTarget({ id: item.id, term: item.term })}
              onRemove={() => setFocusThisWeek(item.id, false)}
              onNavigate={() => navigate(`/item/${item.id}`)}
            />
          ))}

          {/* Completed items */}
          {completed.length > 0 && (
            <>
              {inProgress.length > 0 && (
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider pt-2 pb-1 px-0.5">
                  Completed this week ✓
                </p>
              )}
              {completed.map((item) => (
                <FocusCard
                  key={item.id}
                  item={item}
                  done
                  usesDone={usagePoints(item.activation.usageLogs)}
                  onLogUsage={() => setLogTarget({ id: item.id, term: item.term })}
                  onRemove={() => setFocusThisWeek(item.id, false)}
                  onNavigate={() => navigate(`/item/${item.id}`)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Manual add — candidate browser */}
      {candidates.length > 0 && (
        <CandidateBrowser
          candidates={candidates}
          currentCount={totalFocus}
          onAdd={(id) => setFocusThisWeek(id, true)}
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
