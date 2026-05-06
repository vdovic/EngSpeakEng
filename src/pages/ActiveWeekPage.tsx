/**
 * ActiveWeekPage.tsx — My Current Focus
 *
 * Three-zone layout:
 *
 *   Zone 1 — Active Focus  (drag-and-drop sortable)
 *     The 20–25 words most ready to practise right now, selected from the
 *     Focus Portfolio by selectActiveFocusItems().  Each row shows the term,
 *     type, level, a short definition, exposure progress (0/8), real-life
 *     usage progress (0/3), and one compact usage prompt.
 *     The user can drag rows to reorder them; the order is saved to localStorage.
 *
 *   Zone 2 — Suggested Candidates
 *     Balance-aware suggestions from the Library.  Each candidate shows a
 *     human-readable reason badge (no internal scores exposed).
 *     "Add to Active Focus" is blocked with a soft message when the portfolio
 *     already has 25 words.
 *
 *   Zone 3 — Portfolio Overview
 *     Compact stats panel: total words in the Focus Portfolio, active count,
 *     and a breakdown by learning level.  Expands to show portfolio words
 *     that are not in the current Active Focus view.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target, Plus, CheckCircle2, Info, X, Search,
  ChevronDown, ChevronUp, Lightbulb, GripVertical,
} from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVocabStore, useFocusThisWeekItems } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { LevelBadge } from '@/components/LevelBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { ConfidenceDots } from '@/components/ConfidenceDots'
import { VocabItem } from '@/types/vocabulary'
import { generateCandidates } from '@/lib/candidateLogic'
import {
  ACTIVE_FOCUS_LIMIT,
  selectActiveFocusItems,
  getSuggestedUsagePrompt,
  getFocusProgressSummary,
  getCandidateReasonBadge,
  FocusProgressSummary,
} from '@/lib/activeFocusLogic'

// ─── Exposure bar ─────────────────────────────────────────────────────────────
//
// Coloured micro-bar showing challenge-exposure progress (0–8).
// slate → blue → violet → emerald as the learner advances.

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
        <span className={`block h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  )
}

// ─── Active Focus row ─────────────────────────────────────────────────────────
//
// [⋮⋮]  term · TypeBadge · LevelBadge · ConfidenceDots      [✓] [×]
//        short definition                         ExposureBar
//        💡 usage prompt (always visible)
//
// ConfidenceDots are placed inline with the term (Line 1) so the interaction
// reads "my confidence in THIS word", not "some status on the right side".
// ExposureBar stays on Line 2 to keep confidence (subjective) and
// system progress (objective) visually separate.
//
// dragHandleProps is spread onto the grip button so @dnd-kit can bind its
// pointer/touch listeners there rather than on the whole card.

interface ActiveFocusRowProps {
  item: VocabItem
  onConfidenceChange: (level: 0 | 1 | 2 | 3) => void
  onRemove: () => void
  onNavigate: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  isDragging?: boolean
}

function ActiveFocusRow({
  item,
  onConfidenceChange,
  onRemove,
  onNavigate,
  dragHandleProps,
  isDragging = false,
}: ActiveFocusRowProps) {
  const confidenceLevel = (item.activation?.confidenceLevel ?? 0) as 0 | 1 | 2 | 3
  const done            = confidenceLevel >= 3
  const shortDef        = item.shortDefinition ?? item.definitionEn ?? ''
  const usagePrompt     = getSuggestedUsagePrompt(item)

  return (
    <div className={`bg-white border rounded-2xl px-3.5 py-3 transition-colors ${
      done       ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
    } ${isDragging ? 'shadow-lg ring-2 ring-brand-300 opacity-90' : ''}`}>

      {/* ── Outer: drag handle + content column ── */}
      <div className="flex items-start gap-1.5">

        {/* Drag handle — only drag trigger, doesn't navigate */}
        <button
          {...dragHandleProps}
          className="mt-0.5 shrink-0 text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none focus:outline-none"
          title="Drag to reorder"
          tabIndex={0}
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>

        {/* Content column */}
        <div className="flex-1 min-w-0">

          {/* ── Line 1: term · badges · confidence dots · actions ── */}
          {/*                                                          */}
          {/* ConfidenceDots sit directly next to the word so the     */}
          {/* interaction reads "my confidence in THIS word", not       */}
          {/* "some status on the right side of the row".              */}
          <div className="flex items-center gap-1.5">
            {/* Navigate area covers term + type + level */}
            <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap leading-snug">
                <span className={`text-sm font-semibold ${done ? 'text-slate-400' : 'text-slate-900'}`}>
                  {item.term}
                </span>
                <TypeBadge type={item.type} />
                <LevelBadge item={item} compact />
              </div>
            </button>

            {/* Confidence dots — outside navigate, inline with term */}
            <ConfidenceDots
              item={item}
              onChange={onConfidenceChange}
              compact
              className="shrink-0"
            />

            {/* Done indicator + remove */}
            <div className="flex items-center gap-0.5 shrink-0">
              {done && <CheckCircle2 size={16} className="text-emerald-400 mx-0.5" />}
              <button
                onClick={onRemove}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Remove from Active Focus"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Line 2: definition · exposure bar ── */}
          {/*                                         */}
          {/* ExposureBar stays right-aligned here:   */}
          {/* exposure = system-tracked progress       */}
          {/* confidence = personal, subjective signal */}
          <div className="mt-1 flex items-center gap-2">
            <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
              <p className="text-[11px] text-slate-400 truncate">{shortDef}</p>
            </button>
            <ExposureBar count={item.exposureCount ?? 0} />
          </div>

          {/* ── Line 3: usage prompt ── */}
          <p className="mt-2 text-[11px] text-slate-500 italic leading-snug flex items-start gap-1.5">
            <Lightbulb size={10} className="shrink-0 mt-[2px] text-amber-400" />
            <span>{usagePrompt}</span>
          </p>

        </div>
      </div>
    </div>
  )
}

// ─── Sortable wrapper for ActiveFocusRow ──────────────────────────────────────
//
// Thin wrapper that connects @dnd-kit's useSortable hook to the row.
// The drag handle props are forwarded so only the grip triggers a drag —
// tap on the row body still navigates normally.

function SortableActiveFocusRow(props: Omit<ActiveFocusRowProps, 'dragHandleProps' | 'isDragging'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Keep layout space while dragging so other items slide smoothly
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' : undefined,
      }}
    >
      <ActiveFocusRow
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

// ─── Compact portfolio row ────────────────────────────────────────────────────
//
// Used for portfolio-overflow items (beyond the top-25 active set).
// Deliberately muted — not the focus of attention.

function PortfolioRow({
  item,
  onRemove,
  onNavigate,
}: {
  item: VocabItem
  onRemove: () => void
  onNavigate: () => void
}) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 opacity-60 hover:opacity-80 transition-opacity">
      <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 flex-wrap leading-snug">
          <span className="text-sm font-medium text-slate-700">{item.term}</span>
          <TypeBadge type={item.type} />
          <LevelBadge item={item} compact />
        </div>
      </button>
      <ExposureBar count={item.exposureCount ?? 0} />
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
        title="Remove from focus"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Candidate row ────────────────────────────────────────────────────────────
//
// Line 1: term · TypeBadge · LevelBadge · reason badge       [Add]
// Line 2: short definition                         ExposureBar

function CandidateRow({
  item,
  activeThemes,
  onAdd,
  onNavigate,
}: {
  item: VocabItem
  activeThemes: string[]
  onAdd: () => void
  onNavigate: () => void
}) {
  const reason   = getCandidateReasonBadge(item, activeThemes)
  const shortDef = item.shortDefinition ?? item.definitionEn ?? ''

  return (
    <div className="flex items-start gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors">
      <button onClick={onNavigate} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 flex-wrap leading-snug">
          <span className="text-sm font-semibold text-slate-800">{item.term}</span>
          <TypeBadge type={item.type} />
          <LevelBadge item={item} compact />
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${reason.colorClass}`}>
            {reason.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-slate-400 truncate min-w-0">{shortDef}</p>
          <ExposureBar count={item.exposureCount ?? 0} />
        </div>
      </button>

      <button
        onClick={onAdd}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 active:scale-95 transition-all mt-0.5"
      >
        <Plus size={11} />
        Add
      </button>
    </div>
  )
}

// ─── Portfolio overview panel ─────────────────────────────────────────────────

function PortfolioOverview({
  summary,
  onShowAll,
  isExpanded,
}: {
  summary: FocusProgressSummary
  onShowAll: () => void
  isExpanded: boolean
}) {
  const { total, activeCount, newCount, learningCount, familiarCount, masteredCount } = summary
  const hasOverflow = total > ACTIVE_FOCUS_LIMIT

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
      {/* Summary line */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {total} {total === 1 ? 'word' : 'words'} in your Focus Portfolio
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {activeCount} active now
          </p>
        </div>

        {hasOverflow && (
          <button
            onClick={onShowAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            {isExpanded
              ? <><ChevronUp size={12} /> Hide</>
              : <><ChevronDown size={12} /> Show all {total}</>
            }
          </button>
        )}
      </div>

      {/* Level breakdown */}
      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
        {newCount > 0 && (
          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
            {newCount} New
          </span>
        )}
        {learningCount > 0 && (
          <span className="text-[10px] font-semibold text-blue-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {learningCount} Learning
          </span>
        )}
        {familiarCount > 0 && (
          <span className="text-[10px] font-semibold text-violet-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            {familiarCount} Familiar
          </span>
        )}
        {masteredCount > 0 && (
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {masteredCount} Mastered
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CANDIDATE_PAGE = 15
const FOCUS_ORDER_LS_KEY = 'active-focus-order'

export function ActiveWeekPage() {
  const navigate   = useNavigate()
  const focusItems = useFocusThisWeekItems()
  const { setFocusThisWeek, setConfidenceLevel, items } = useVocabStore()
  const { themes: activeThemes }    = useThemesStore()

  const [showInfo,         setShowInfo]         = useState(false)
  const [query,            setQuery]            = useState('')
  const [candidateCap,     setCandidateCap]     = useState(CANDIDATE_PAGE)
  const [showFullMessage,  setShowFullMessage]  = useState(false)
  const [showAllPortfolio, setShowAllPortfolio] = useState(false)

  // ── Manual order — persisted to localStorage ──────────────────────────────────
  // Stores an array of item IDs in the user's preferred display sequence.
  // Empty = use the system's priority ordering (default).
  const [manualOrder, setManualOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FOCUS_ORDER_LS_KEY)
      return saved ? (JSON.parse(saved) as string[]) : []
    } catch {
      return []
    }
  })

  // ── DnD sensors ───────────────────────────────────────────────────────────────
  // PointerSensor: requires 8px movement before activating (prevents mis-fires on click).
  // TouchSensor:   250ms press delay + 5px tolerance for mobile scroll safety.
  // KeyboardSensor: allows keyboard-driven reordering for accessibility.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Active Focus — top 25 from portfolio, then apply manual order ─────────────
  const activeFocusItems = useMemo(
    () => selectActiveFocusItems(focusItems, ACTIVE_FOCUS_LIMIT, activeThemes),
    [focusItems, activeThemes],
  )

  const orderedActiveFocus = useMemo(() => {
    if (manualOrder.length === 0) return activeFocusItems
    const posMap = new Map(manualOrder.map((id, i) => [id, i]))
    return [...activeFocusItems].sort((a, b) => {
      const pa = posMap.get(a.id) ?? Infinity
      const pb = posMap.get(b.id) ?? Infinity
      return pa - pb
    })
  }, [activeFocusItems, manualOrder])

  // ── Portfolio overflow — items beyond the top-25 active view ─────────────────
  const activeFocusIds = useMemo(
    () => new Set(activeFocusItems.map((i) => i.id)),
    [activeFocusItems],
  )
  const portfolioOverflow = useMemo(
    () => focusItems.filter((i) => !activeFocusIds.has(i.id)),
    [focusItems, activeFocusIds],
  )

  // ── Candidates — excluded from active focus view, scored by relevance ──────────
  const allCandidates = useMemo(
    () => generateCandidates(items, focusItems, activeFocusItems, activeThemes),
    [items, focusItems, activeFocusItems, activeThemes],
  )

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

  // ── Portfolio summary ─────────────────────────────────────────────────────────
  const summary = useMemo(() => getFocusProgressSummary(focusItems), [focusItems])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  // isFull = the VISIBLE active focus is at its 25-word target, not the total portfolio.
  const isFull = orderedActiveFocus.length >= ACTIVE_FOCUS_LIMIT

  function handleAddCandidate(item: VocabItem) {
    if (isFull) {
      setShowFullMessage(true)
      return
    }
    setShowFullMessage(false)
    setFocusThisWeek(item.id, true)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedActiveFocus.findIndex((i) => i.id === active.id)
    const newIndex = orderedActiveFocus.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(orderedActiveFocus, oldIndex, newIndex)
    const newOrder  = reordered.map((i) => i.id)
    setManualOrder(newOrder)
    try { localStorage.setItem(FOCUS_ORDER_LS_KEY, JSON.stringify(newOrder)) } catch { /* noop */ }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-8">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900">My Current Focus</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">
            Your active vocabulary portfolio.
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
          <p className="font-semibold text-slate-800">About Active Focus</p>
          <p>
            Your Focus Portfolio is your active vocabulary collection — words you're working
            to <em>use</em>, not just recognise.
          </p>
          <p>
            Active Focus shows the 20–25 words most ready to practise right now. The system
            selects them based on what's due for a challenge, what needs more work, and your
            current themes.
          </p>
          <p>
            Tap the <strong>three dots</strong> on any word to mark your real-life comfort level —
            red, yellow, or green. This is the fastest way to track whether you can actually use
            the word, not just recognise it.
          </p>
          <p>
            Tap <strong>×</strong> to remove a word from your portfolio.
            Drag the <strong>⋮⋮</strong> handle to reorder words.
          </p>
          <p>
            The exposure bar{' '}
            <span className="font-semibold">(0/8 → 8/8)</span>{' '}
            tracks how many times a word has appeared in Daily Challenges.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 1 — Active Focus                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-800">Active Focus</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            The words you are actively developing now.
          </p>
        </div>

        {focusItems.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
            <Target size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-500 mb-1">Your Focus Portfolio is empty</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              Start by adding a few suggested candidates below.
            </p>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  document.getElementById('candidates-section')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Add suggested words ↓
              </button>
              <button
                onClick={() => navigate('/themes')}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Adjust themes
              </button>
              <button
                onClick={() => navigate('/library')}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Open Library
              </button>
            </div>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedActiveFocus.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedActiveFocus.map((item) => (
                    <SortableActiveFocusRow
                      key={item.id}
                      item={item}
                      onConfidenceChange={(level) => setConfidenceLevel(item.id, level)}
                      onRemove={() => setFocusThisWeek(item.id, false)}
                      onNavigate={() => navigate(`/item/${item.id}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Under-20 nudge */}
            {orderedActiveFocus.length < 20 && allCandidates.length > 0 && (
              <p className="mt-3 text-xs text-slate-400 text-center">
                Add a few more words to keep your learning effective.{' '}
                <button
                  className="text-brand-500 font-semibold hover:text-brand-700 transition-colors"
                  onClick={() => {
                    document.getElementById('candidates-section')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  See suggestions ↓
                </button>
              </p>
            )}
          </>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 2 — Suggested Candidates                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="candidates-section" className="mb-8">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-800">Suggested Candidates</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Words that match your goals and help you progress.
          </p>
        </div>

        {allCandidates.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm font-medium text-slate-500 mb-1">No suggestions right now.</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              Try adjusting your themes or exploring your Library.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate('/themes')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Adjust themes
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => navigate('/library')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Open Library
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Active Focus full message */}
            {showFullMessage && isFull && (
              <div className="mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium flex items-start gap-2">
                <Lightbulb size={13} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Your Active Focus is full.{' '}
                  <button
                    className="underline hover:text-amber-900 transition-colors"
                    onClick={() => {
                      setShowFullMessage(false)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Remove a word to add a new one.
                  </button>
                </span>
              </div>
            )}

            {/* Search — only when list is long enough */}
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

            <div className="space-y-1.5">
              {candidates.slice(0, candidateCap).map((item) => (
                <CandidateRow
                  key={item.id}
                  item={item}
                  activeThemes={activeThemes}
                  onAdd={() => handleAddCandidate(item)}
                  onNavigate={() => navigate(`/item/${item.id}`)}
                />
              ))}

              {/* No results for current search query */}
              {candidates.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No matching words.</p>
              )}

              {candidates.length > candidateCap && (
                <button
                  onClick={() => setCandidateCap((c) => c + CANDIDATE_PAGE)}
                  className="w-full py-2 text-xs font-semibold text-brand-600 hover:text-brand-700 text-center transition-colors"
                >
                  Show {Math.min(CANDIDATE_PAGE, candidates.length - candidateCap)} more…
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ZONE 3 — Portfolio Overview                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {focusItems.length > 0 && (
        <section>
          <PortfolioOverview
            summary={summary}
            onShowAll={() => setShowAllPortfolio((v) => !v)}
            isExpanded={showAllPortfolio}
          />

          {/* Portfolio overflow — words beyond the top-25 active set */}
          {showAllPortfolio && (
            <div className="mt-3">
              {portfolioOverflow.length > 0 ? (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-0.5">
                    Rest of your portfolio ({portfolioOverflow.length})
                  </p>
                  <div className="space-y-1.5">
                    {portfolioOverflow.map((item) => (
                      <PortfolioRow
                        key={item.id}
                        item={item}
                        onRemove={() => setFocusThisWeek(item.id, false)}
                        onNavigate={() => navigate(`/item/${item.id}`)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-slate-400 text-center py-2">
                  All {focusItems.length} {focusItems.length === 1 ? 'word is' : 'words are'} shown in Active Focus above.
                </p>
              )}
            </div>
          )}
        </section>
      )}

    </div>
  )
}
