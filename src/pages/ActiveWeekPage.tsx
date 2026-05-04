import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target, Plus, CheckCircle2, Info, TrendingUp, X, Search,
} from 'lucide-react'
import { useVocabStore, useFocusThisWeekItems } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { LevelBadge } from '@/components/LevelBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { LogUsageModal } from '@/components/LogUsageModal'
import { usagePoints } from '@/lib/mastery'
import { VocabItem } from '@/types/vocabulary'
import { FOCUS_MAX, FOCUS_RECOMMENDED_MIN, FOCUS_RECOMMENDED_MAX } from '@/lib/focusWeek'
import { generateCandidates } from '@/lib/candidateLogic'

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function CapacityBar({ count }: { count: number }) {
  const pct     = Math.min((count / FOCUS_MAX) * 100, 100)
  const ideal   = count >= FOCUS_RECOMMENDED_MIN && count <= FOCUS_RECOMMENDED_MAX
  const tooMany = count > FOCUS_RECOMMENDED_MAX && count < FOCUS_MAX
  const atCap   = count >= FOCUS_MAX

  const barColor  = atCap ? 'bg-red-500'    : tooMany ? 'bg-amber-500' : ideal ? 'bg-emerald-500' : 'bg-brand-500'
  const textColor = atCap ? 'text-red-500'  : tooMany ? 'text-amber-600' : ideal ? 'text-emerald-600' : 'text-slate-400'
  const label = atCap
    ? `At the ${FOCUS_MAX}-word limit — remove words to add more`
    : tooMany
    ? `${count} words — slightly above ideal`
    : ideal
    ? `${count} words — ideal range`
    : count > 0
    ? `${count} words — add more for a richer set`
    : ''

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-500">
          {count} / {FOCUS_MAX} words in focus
        </span>
        <span className={`text-[10px] font-medium ${textColor}`}>
          ideal: {FOCUS_RECOMMENDED_MIN}–{FOCUS_RECOMMENDED_MAX}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {label && <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>}
    </div>
  )
}

// ─── Exposure bar ─────────────────────────────────────────────────────────────
//
// Shows challenge-exposure progress (0–8) as a coloured micro-bar + text.
// Color progression:
//   0–1  slate   (new, unchallenged)
//   2–5  blue    (being challenged)
//   6–7  violet  (nearly mastered via challenge)
//   8    emerald (fully challenged)

function ExposureBar({ count }: { count: number }) {
  const capped = Math.min(count, 8)
  const pct    = (capped / 8) * 100

  const barColor =
    capped >= 8 ? 'bg-emerald-500'
    : capped >= 6 ? 'bg-violet-400'
    : capped >= 2 ? 'bg-blue-400'
    : 'bg-slate-300'

  const textColor =
    capped >= 8 ? 'text-emerald-600'
    : capped >= 6 ? 'text-violet-500'
    : capped >= 2 ? 'text-blue-500'
    : 'text-slate-400'

  return (
    <span className="flex items-center gap-1 shrink-0">
      <span className={`text-[9px] font-semibold tabular-nums ${textColor}`}>{capped}/8</span>
      <span className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
        <span
          className={`block h-full ${barColor} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}

// ─── Compact focus-word row (2 lines max) ─────────────────────────────────────
//
// Line 1: [usage dots]  term  TypeBadge  LevelBadge        [log] [×]
// Line 2:               definition · tags              [ExposureBar]

function CompactFocusRow({
  item,
  usesDone,
  onLogUsage,
  onRemove,
  onNavigate,
}: {
  item: VocabItem
  usesDone: number
  onLogUsage: () => void
  onRemove: () => void
  onNavigate: () => void
}) {
  const done = usesDone >= 3

  const meta = [
    item.definitionEn,
    item.tags.slice(0, 2).join(' · '),
  ].filter(Boolean).join('  ·  ')

  return (
    <div
      className={`flex items-start gap-2.5 bg-white border rounded-xl px-3 py-2.5 transition-colors ${
        done ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
      }`}
    >
      {/* Usage dots */}
      <div className="flex gap-0.5 mt-[5px] shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < usesDone
                ? done ? 'bg-emerald-400' : 'bg-amber-400'
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Content — tappable to view word detail */}
      <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
        {/* Line 1: term + badges */}
        <div className="flex items-center gap-1.5 flex-wrap leading-snug">
          <span className={`text-sm font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {item.term}
          </span>
          <TypeBadge type={item.type} />
          <LevelBadge item={item} compact />
        </div>
        {/* Line 2: definition snippet + exposure bar */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 truncate min-w-0">
            {meta || ' '}
          </p>
          <ExposureBar count={item.exposureCount ?? 0} />
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        {done ? (
          <CheckCircle2 size={16} className="text-emerald-400 mx-1" />
        ) : (
          <button
            onClick={onLogUsage}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 transition-colors"
            title="Log a real-life use"
          >
            <Plus size={15} />
          </button>
        )}
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Remove from focus"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Compact candidate row ────────────────────────────────────────────────────
//
// Line 1: term  TypeBadge  LevelBadge  [ready badge]      [Add]
// Line 2: definition · tags            [ExposureBar]

function CompactCandidateRow({
  item,
  atCap,
  onAdd,
  onNavigate,
}: {
  item: VocabItem
  atCap: boolean
  onAdd: () => void
  onNavigate: () => void
}) {
  const meta = [
    item.definitionEn,
    item.tags.slice(0, 2).join(' · '),
  ].filter(Boolean).join('  ·  ')

  return (
    <div className="flex items-start gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors">
      <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
        {/* Line 1: term + badges */}
        <div className="flex items-center gap-1.5 flex-wrap leading-snug">
          <span className="text-sm font-semibold text-slate-800">{item.term}</span>
          <TypeBadge type={item.type} />
          <LevelBadge item={item} compact />
          {item.review.successfulRecalls >= 2 && (
            <span className="text-[9px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full border border-brand-100">
              ready
            </span>
          )}
        </div>
        {/* Line 2: definition snippet + exposure bar */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 truncate min-w-0">
            {meta || ' '}
          </p>
          <ExposureBar count={item.exposureCount ?? 0} />
        </div>
      </button>

      <button
        onClick={onAdd}
        disabled={atCap}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none mt-0.5"
      >
        <Plus size={11} /> Add
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CANDIDATE_PAGE = 15   // candidates shown per page

export function ActiveWeekPage() {
  const navigate   = useNavigate()
  const focusItems = useFocusThisWeekItems()
  const { setFocusThisWeek, items } = useVocabStore()
  const { themes: activeThemes }    = useThemesStore()

  const [logTarget,    setLogTarget]    = useState<{ id: string; term: string } | null>(null)
  const [showInfo,     setShowInfo]     = useState(false)
  const [query,        setQuery]        = useState('')
  const [candidateCap, setCandidateCap] = useState(CANDIDATE_PAGE)

  // Split focus items into in-progress and completed
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

  // Balance-aware candidates list
  const allCandidates = useMemo(
    () => generateCandidates(items, focusItems, activeThemes),
    [items, focusItems, activeThemes],
  )

  // Filter candidates by search query
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCandidates
    return allCandidates.filter(
      (i) =>
        i.term.toLowerCase().includes(q) ||
        i.definitionEn?.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [allCandidates, query])

  const atCap     = focusItems.length >= FOCUS_MAX
  const totalDone = completed.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">My Current Focus</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">
            The words you're actively practising in real life — aim for 100–150.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={() => navigate('/themes')}
            className="text-[11px] font-semibold text-brand-500 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
          >
            Adjust themes
          </button>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-800">My Current Focus</p>
          <p>These are the words you're working to <em>use</em>, not just recognise. Keep the list deliberate.</p>
          <p>Tap <strong>+</strong> on a focus word to log a real-life use. Three uses marks a word done for the week. Tap <strong>×</strong> to remove it from focus.</p>
          <p>The exposure bar <span className="font-semibold">(0/8 → 8/8)</span> shows how many times a word has appeared in your daily challenges.</p>
          <p className="text-slate-400">Ideal: {FOCUS_RECOMMENDED_MIN}–{FOCUS_RECOMMENDED_MAX} words. Max: {FOCUS_MAX}.</p>
        </div>
      )}

      {/* Capacity bar */}
      <CapacityBar count={focusItems.length} />

      {/* Week summary (only when words exist) */}
      {focusItems.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-0.5">
          <span className="text-xs text-slate-500">
            {totalDone}/{focusItems.length} used 3× this week
          </span>
          {totalDone === focusItems.length && focusItems.length > 0 && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> All done!
            </span>
          )}
        </div>
      )}

      {/* ── Focus words — compact list ── */}
      {focusItems.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
          <Target size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-500 mb-1">No words in focus yet</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Add words from the list below — the system prioritises words you've already practised in challenges.
          </p>
          {allCandidates.length > 0 ? (
            <p className="mt-2 text-xs text-brand-500 flex items-center justify-center gap-1">
              <TrendingUp size={11} />
              {allCandidates.length} candidate{allCandidates.length !== 1 ? 's' : ''} ready to add
            </p>
          ) : (
            <button
              onClick={() => navigate('/themes')}
              className="mt-3 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Adjust your themes →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5 mb-6">
          {/* In-progress words */}
          {inProgress.map((item) => (
            <CompactFocusRow
              key={item.id}
              item={item}
              usesDone={usagePoints(item.activation.usageLogs)}
              onLogUsage={() => setLogTarget({ id: item.id, term: item.term })}
              onRemove={() => setFocusThisWeek(item.id, false)}
              onNavigate={() => navigate(`/item/${item.id}`)}
            />
          ))}

          {/* Completed this week */}
          {completed.length > 0 && (
            <>
              {inProgress.length > 0 && (
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest pt-2 pb-0.5 px-0.5">
                  Completed this week ✓
                </p>
              )}
              {completed.map((item) => (
                <CompactFocusRow
                  key={item.id}
                  item={item}
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

      {/* ── Add to Focus — candidate list ── */}
      {allCandidates.length > 0 && (
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Add to Focus
              <span className="ml-1.5 text-xs font-normal text-slate-400">
                ({allCandidates.length})
              </span>
            </h2>
            {atCap && (
              <span className="text-[10px] text-red-500 font-semibold">
                Limit reached — remove a word first
              </span>
            )}
          </div>

          {/* Search filter — only shown when list is long enough */}
          {allCandidates.length > 6 && (
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCandidateCap(CANDIDATE_PAGE) }}
                placeholder="Filter by word, definition or tag…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300 bg-white"
              />
            </div>
          )}

          {/* Candidate rows */}
          <div className="space-y-1.5">
            {candidates.slice(0, candidateCap).map((item) => (
              <CompactCandidateRow
                key={item.id}
                item={item}
                atCap={atCap}
                onAdd={() => setFocusThisWeek(item.id, true)}
                onNavigate={() => navigate(`/item/${item.id}`)}
              />
            ))}

            {candidates.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No matching words.</p>
            )}

            {candidates.length > candidateCap && (
              <button
                onClick={() => setCandidateCap((c) => c + CANDIDATE_PAGE)}
                className="w-full py-2 text-xs font-semibold text-brand-600 hover:text-brand-700 text-center"
              >
                Show {Math.min(CANDIDATE_PAGE, candidates.length - candidateCap)} more…
              </button>
            )}
          </div>
        </div>
      )}

      {/* Usage log modal */}
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
