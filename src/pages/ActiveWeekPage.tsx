import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target, Plus, CheckCircle2, Info, TrendingUp, X,
  ChevronRight, BookOpen,
} from 'lucide-react'
import { useVocabStore, useFocusThisWeekItems } from '@/store/vocabStore'
import { LevelBadge } from '@/components/LevelBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { UsageProgress } from '@/components/UsageProgress'
import { LogUsageModal } from '@/components/LogUsageModal'
import { usagePoints } from '@/lib/mastery'
import { VocabItem } from '@/types/vocabulary'
import {
  FOCUS_MAX, FOCUS_RECOMMENDED_MIN, FOCUS_RECOMMENDED_MAX,
  getRuleACandidates, getRuleBCandidates,
} from '@/lib/focusWeek'

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
    ? `At the ${FOCUS_MAX}-word limit — remove lower-priority words to add new ones`
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

// ─── Focus Discovery Panel ────────────────────────────────────────────────────
//
// Shows a featured word card with definition + example always visible.
// User chooses "Add to Focus" or "Not yet" (skip). Replaced the old
// AutoSuggestPanel + CandidateBrowser combo.

function FocusDiscoveryPanel({
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
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  // Remove added items (they leave the candidates list) and skipped ones
  const available = useMemo(
    () => candidates.filter((c) => !skippedIds.has(c.id)),
    [candidates, skippedIds],
  )

  const featured  = available[0] ?? null
  const restCount = Math.max(0, available.length - 1)
  const atCap     = currentCount >= FOCUS_MAX

  function skip(id: string) {
    setSkippedIds((prev) => new Set([...prev, id]))
  }

  function addWord(id: string) {
    onAdd(id)
    // The item will disappear from candidates; skip it locally too so state
    // doesn't briefly show it again before the store updates.
    setSkippedIds((prev) => new Set([...prev, id]))
  }

  if (candidates.length === 0) return null

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Suggested for Focus</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review each word — add the ones you want to practise in real life.
          </p>
        </div>
        {restCount > 0 && (
          <span className="text-xs text-slate-400 shrink-0 ml-2">{restCount} more</span>
        )}
      </div>

      {/* Cap warning */}
      {atCap && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700">
          <Info size={13} className="shrink-0" />
          Focus is at the {FOCUS_MAX}-word limit. Remove a word above to add more.
        </div>
      )}

      {/* Featured word card */}
      {featured ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-3">
          {/* Word header */}
          <div className="px-5 pt-5 pb-1">
            <button
              onClick={() => onNavigate(featured.id)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                  {featured.term}
                </span>
                <TypeBadge type={featured.type} />
                <LevelBadge item={featured} />
              </div>
              {featured.review.successfulRecalls > 0 && (
                <p className="text-[10px] text-brand-500 font-medium">
                  Recalled {featured.review.successfulRecalls}× in challenges — ready to use!
                </p>
              )}
            </button>
          </div>

          {/* Definition — always open */}
          <div className="mx-5 my-3 bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Definition
            </p>
            {featured.definitionEn ? (
              <p className="text-sm text-slate-700 leading-relaxed">{featured.definitionEn}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No definition yet —{' '}
                <button
                  onClick={() => onNavigate(featured.id)}
                  className="text-brand-500 hover:underline"
                >
                  open the word
                </button>{' '}
                to add one.
              </p>
            )}
          </div>

          {/* Example sentence */}
          {featured.exampleSentence && (
            <p className="mx-5 mb-4 text-xs text-slate-400 italic leading-relaxed">
              "{featured.exampleSentence}"
            </p>
          )}

          {/* Synonyms / collocations hint */}
          {featured.synonyms && featured.synonyms.length > 0 && (
            <p className="mx-5 mb-3 text-[10px] text-slate-400">
              Also: {featured.synonyms.slice(0, 3).join(', ')}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 px-5 pb-4">
            <button
              onClick={() => !atCap && addWord(featured.id)}
              disabled={atCap}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus size={15} />
              Add to Focus
            </button>
            <button
              onClick={() => skip(featured.id)}
              className="px-5 py-2.5 text-slate-500 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              Not yet
            </button>
          </div>

          {/* View full word link */}
          <button
            onClick={() => onNavigate(featured.id)}
            className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-brand-600 font-semibold border-t border-slate-100 hover:bg-brand-50 transition-colors"
          >
            <BookOpen size={12} />
            View full word details
            <ChevronRight size={12} />
          </button>
        </div>
      ) : (
        /* All candidates reviewed */
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center mb-3">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-600 mb-0.5">You've seen all suggestions</p>
          <p className="text-xs text-slate-400">
            Keep learning and new candidates will appear here.
          </p>
        </div>
      )}

      {/* Compact list of remaining candidates (after the featured one) */}
      {available.length > 1 && (
        <div className="space-y-1.5">
          {available.slice(1, 7).map((item) => (
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
                onClick={() => !atCap && addWord(item.id)}
                disabled={atCap}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus size={11} /> Add
              </button>
            </div>
          ))}
          {available.length > 7 && (
            <p className="text-xs text-slate-400 text-center py-1">
              +{available.length - 7} more words in your library
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ActiveWeekPage() {
  const navigate   = useNavigate()
  const focusItems = useFocusThisWeekItems()
  const { setFocusThisWeek, items } = useVocabStore()
  const [logTarget,  setLogTarget]  = useState<{ id: string; term: string } | null>(null)
  const [showInfo,   setShowInfo]   = useState(false)

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

  // Combined candidates for discovery panel:
  // Rule A (reviewed 2–3 times) and Rule B (struggling) come first,
  // then all other non-focus, non-mastered, non-inbox words.
  const candidates = useMemo(() => {
    const ruleAIds = new Set(getRuleACandidates(items).map((i) => i.id))
    const ruleBIds = new Set(getRuleBCandidates(items).map((i) => i.id))

    const ruleA = items.filter((i) => ruleAIds.has(i.id))
    const ruleB = items.filter((i) => ruleBIds.has(i.id) && !ruleAIds.has(i.id))
    const rest  = items
      .filter(
        (i) =>
          !i.weeklyFocus &&
          !i.inFocus &&
          !i.archived &&
          i.status !== 'mastered' &&
          i.status !== 'inbox' &&
          !ruleAIds.has(i.id) &&
          !ruleBIds.has(i.id),
      )
      .sort((a, b) => (b.focusPriority ?? 0) - (a.focusPriority ?? 0))

    return [...ruleA, ...ruleB, ...rest]
  }, [items])

  const totalFocus = focusItems.length
  const totalDone  = completed.length

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
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors mt-0.5 shrink-0"
          title="What is My Current Focus?"
        >
          <Info size={16} />
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-800">My Current Focus</p>
          <p>These are the words you're actively working to <em>use</em>, not just recognise. Keep this list deliberate and manageable.</p>
          <p>The system suggests words based on what you've already learned in challenges. Your goal: use each word at least 3× in real life. You can log a use directly from each word card.</p>
          <p className="text-slate-400">Ideal range: {FOCUS_RECOMMENDED_MIN}–{FOCUS_RECOMMENDED_MAX} words for focused practice. Maximum: {FOCUS_MAX}.</p>
        </div>
      )}

      {/* Capacity bar */}
      {totalFocus > 0 && <CapacityBar count={totalFocus} />}

      {/* Week progress */}
      <WeekHeader total={totalFocus} done={totalDone} />

      {/* Empty state */}
      {focusItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
          <Target size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600 mb-1">No words in focus yet</p>
          <p className="text-sm text-slate-400 mb-3 max-w-xs mx-auto">
            Add words below to start tracking your real-life practice. The system will suggest the best candidates from your library.
          </p>
          {candidates.length > 0 && (
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <TrendingUp size={12} className="text-brand-400" />
              {candidates.length} word{candidates.length !== 1 ? 's' : ''} ready to add — see suggestions below
            </p>
          )}
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

      {/* ── Focus Discovery Panel — word suggestions with definition ── */}
      {candidates.length > 0 && (
        <FocusDiscoveryPanel
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
