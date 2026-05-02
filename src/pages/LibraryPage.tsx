import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, Library, X, ChevronDown, Plus,
  Check, Zap, Star, Layers, Trash2, MoreVertical, BookOpen, ArrowRight, Loader2,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabCard } from '@/components/VocabCard'
import { QuickAddModal } from '@/components/QuickAddModal'
import { TypeBadge } from '@/components/TypeBadge'
import { ItemStatus, VocabItem } from '@/types/vocabulary'
import { searchVocabulary } from '@/utils/vocabSearch'
import { useEtymologyEnricher } from '@/hooks/useEtymologyEnricher'
import { useRelationshipEnricher } from '@/hooks/useRelationshipEnricher'

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'inbox',      label: 'New' },
  { value: 'learning',   label: 'Learning' },
  { value: 'stable',     label: 'Stable' },
  { value: 'activation', label: 'Active' },
  { value: 'mastered',   label: '🎓 Mastered' },
]

/** Human-readable display names for known tags */
const TAG_LABELS: Record<string, string> = {
  'vocabulary':   'General Vocabulary',
  'phrasal-verb': 'Phrasal Verbs',
  'idiom':        'Idioms',
  'chunks':       'Fixed Phrases',
}

// ── Sort ───────────────────────────────────────────────────────────────────────

type SortKey =
  | 'newest'           // date added, newest first
  | 'oldest'           // date added, oldest first
  | 'az'               // alphabetical A → Z
  | 'za'               // alphabetical Z → A
  | 'challenge-desc'   // Daily Challenge exposures: 8 → 0  (most done first)
  | 'challenge-asc'    // Daily Challenge exposures: 0 → 8  (not started first)
  | 'due'              // SRS review: due soonest first
  | 'weak'             // SRS review: lowest ease factor first

const SORT_GROUPS: { label: string; options: { value: SortKey; label: string }[] }[] = [
  {
    label: 'Date added',
    options: [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
    ],
  },
  {
    label: 'Name',
    options: [
      { value: 'az', label: 'A → Z' },
      { value: 'za', label: 'Z → A' },
    ],
  },
  {
    label: 'Daily Challenge (0 – 8 steps)',
    options: [
      { value: 'challenge-desc', label: 'Most practiced first (8 → 0)' },
      { value: 'challenge-asc',  label: 'Least practiced first (0 → 8)' },
    ],
  },
  {
    label: 'Spaced-repetition review',
    options: [
      { value: 'due',  label: 'Due for review soonest' },
      { value: 'weak', label: 'Weakest recall (ease score)' },
    ],
  },
]

// ── Types ──────────────────────────────────────────────────────────────────────

type UndoPatch = { id: string; prev: Partial<VocabItem> }

interface ToastState {
  key: number
  message: string
  detail?: string
  undoPatches?: UndoPatch[]
  ctaLabel?: string
  onCta?: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sortItems(items: VocabItem[], sort: SortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    if (sort === 'challenge-desc') {
      return (b.exposureCount ?? 0) - (a.exposureCount ?? 0)
    }
    if (sort === 'challenge-asc') {
      return (a.exposureCount ?? 0) - (b.exposureCount ?? 0)
    }

    // All other sorts: mastered items sink to the bottom
    const aMastered = a.status === 'mastered' ? 1 : 0
    const bMastered = b.status === 'mastered' ? 1 : 0
    if (aMastered !== bMastered) return aMastered - bMastered

    switch (sort) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'az':
        return a.term.localeCompare(b.term)
      case 'za':
        return b.term.localeCompare(a.term)
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'due': {
        const aT = a.review.nextReviewAt ? new Date(a.review.nextReviewAt).getTime() : Infinity
        const bT = b.review.nextReviewAt ? new Date(b.review.nextReviewAt).getTime() : Infinity
        return aT - bT
      }
      case 'weak':
        if (a.review.reviewCount < 2 && b.review.reviewCount < 2) return 0
        if (a.review.reviewCount < 2) return 1
        if (b.review.reviewCount < 2) return -1
        return a.review.ease - b.review.ease
    }
  })
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({
  toast,
  bulkBarVisible,
  onUndo,
  onDismiss,
}: {
  toast: ToastState
  bulkBarVisible: boolean
  onUndo: (patches: UndoPatch[]) => void
  onDismiss: () => void
}) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), 5000)
    return () => clearTimeout(timer)
  }, [toast.key])

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl max-w-md w-[calc(100%-2rem)] transition-all ${
        bulkBarVisible ? 'bottom-36 md:bottom-24' : 'bottom-20 md:bottom-6'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
        {toast.detail && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{toast.detail}</p>}
      </div>
      {toast.onCta && (
        <button
          onClick={() => { toast.onCta!(); onDismiss() }}
          className="shrink-0 text-xs font-bold text-brand-300 hover:text-brand-200 transition-colors whitespace-nowrap"
        >
          {toast.ctaLabel ?? '→'}
        </button>
      )}
      {toast.undoPatches && toast.undoPatches.length > 0 && (
        <button
          onClick={() => onUndo(toast.undoPatches!)}
          className="shrink-0 text-xs font-bold text-slate-400 hover:text-white px-1 transition-colors"
        >
          Undo
        </button>
      )}
      <button
        onClick={onDismiss}
        className="shrink-0 text-slate-400 hover:text-white transition-colors p-0.5"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Theme picker modal ─────────────────────────────────────────────────────────

function ThemePickerModal({
  title,
  initialSelected,
  onApply,
  onClose,
}: {
  title: string
  initialSelected: string[]
  onApply: (themes: string[]) => void
  onClose: () => void
}) {
  const { themes, addTheme } = useThemesStore()
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set(initialSelected))
  const [newName, setNewName] = useState('')

  function toggle(t: string) {
    setPickerSelected((s) => {
      const next = new Set(s)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function createAndSelect() {
    const t = newName.trim()
    if (!t) return
    addTheme(t)
    setPickerSelected((s) => new Set([...s, t]))
    setNewName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
          {themes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No themes yet — create one below.</p>
          )}
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                pickerSelected.has(t)
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  pickerSelected.has(t) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}
              >
                {pickerSelected.has(t) && <Check size={10} className="text-white" />}
              </div>
              <span className={`text-sm font-medium ${pickerSelected.has(t) ? 'text-indigo-700' : 'text-slate-700'}`}>
                {t}
              </span>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 space-y-2.5">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndSelect()}
              placeholder="New theme name…"
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300"
            />
            <button
              onClick={createAndSelect}
              disabled={!newName.trim()}
              className="px-3 py-2 bg-slate-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={() => onApply(Array.from(pickerSelected))}
            className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Apply{pickerSelected.size > 0 ? ` (${pickerSelected.size} theme${pickerSelected.size !== 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inbox item card ────────────────────────────────────────────────────────────
// Shown for items with status === 'inbox'; provides Learning / Challenge / This Week actions.

interface InboxCardProps {
  item: VocabItem
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onMoveLearning: (id: string) => void
  onAddChallenge: (id: string) => void
  onAddWeek: (id: string) => void
  onAssignTheme: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (id: string) => void
}

function InboxCard({
  item,
  selected,
  onSelect,
  onMoveLearning,
  onAddChallenge,
  onAddWeek,
  onAssignTheme,
  onDelete,
  onNavigate,
}: InboxCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      className={`relative bg-white border rounded-xl transition-all ${
        selected
          ? 'border-brand-300 ring-1 ring-brand-200 shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top: checkbox + term + definition */}
      <div className="flex items-start gap-3 px-3 pt-3 pb-2">
        <button
          onClick={() => onSelect(item.id, !selected)}
          className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
            selected
              ? 'border-brand-600 bg-brand-600'
              : 'border-slate-300 hover:border-brand-400'
          }`}
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected && <Check size={11} className="text-white" />}
        </button>

        <button onClick={() => onNavigate(item.id)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-semibold text-slate-900 text-sm leading-tight">{item.term}</span>
            <TypeBadge type={item.type} />
          </div>
          {item.definitionEn ? (
            <p className="text-xs text-slate-500 line-clamp-2 leading-snug">{item.definitionEn}</p>
          ) : (
            <p className="text-xs text-slate-400 italic">No definition yet — tap to add</p>
          )}
          {(item.themes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(item.themes ?? []).slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-1.5 border-t border-slate-100">
        <button
          onClick={() => onMoveLearning(item.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 active:scale-95 transition-all"
        >
          <BookOpen size={11} />
          Learning
        </button>
        <button
          onClick={() => onAddChallenge(item.id)}
          title="Add to Daily Challenge"
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Zap size={11} />
          <span className="hidden sm:inline">Challenge</span>
        </button>
        <button
          onClick={() => onAddWeek(item.id)}
          title="Add to This Week's Focus"
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <Star size={11} />
          <span className="hidden sm:inline">This Week</span>
        </button>

        <div className="relative ml-auto" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="More actions"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-9 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 w-40">
              <button
                onClick={() => { onAssignTheme(item.id); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Layers size={12} />
                Assign theme
              </button>
              <button
                onClick={() => { onNavigate(item.id); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowRight size={12} />
                Open detail
              </button>
              <div className="border-t border-slate-100 my-0.5" />
              <button
                onClick={() => { onDelete(item.id); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Bulk action bar ────────────────────────────────────────────────────────────

function BulkActionBar({
  count,
  onMoveLearning,
  onAddChallenge,
  onAddWeek,
  onAssignTheme,
  onDelete,
  onClear,
}: {
  count: number
  onMoveLearning: () => void
  onAddChallenge: () => void
  onAddWeek: () => void
  onAssignTheme: () => void
  onDelete: () => void
  onClear: () => void
}) {
  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 md:left-56 right-0 z-30 bg-slate-900 border-t border-slate-700 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold text-white">{count} selected</span>
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear selection
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onMoveLearning}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
          >
            <BookOpen size={12} />
            Learning
          </button>
          <button
            onClick={onAddChallenge}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors"
          >
            <Zap size={12} />
            Challenge
          </button>
          <button
            onClick={onAddWeek}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors"
          >
            <Star size={12} />
            This Week
          </button>
          <button
            onClick={onAssignTheme}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-semibold hover:bg-indigo-600 transition-colors"
          >
            <Layers size={12} />
            Theme
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors ml-auto"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Journey guide ─────────────────────────────────────────────────────────────

function JourneyGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <BookOpen size={13} className="text-brand-500 shrink-0" />
        <span className="text-xs font-semibold text-slate-700 flex-1">3 ways to activate a word</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pt-3 pb-4 space-y-3">
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Learning</span> — enters your SRS Review queue. Words come back at growing intervals (1 day → 3 → 7 → 14…) until recalled 3 times. Best for most words.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Challenge</span> — jumps into today's Daily Challenge quiz (multiple choice + fill-in). Best for words you want to test right now with active recall.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">This Week</span> — adds to your weekly focus board. Best for a small set of words you're consciously practising this week (speaking, writing).
            </p>
          </div>
          <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-2.5">
            All three paths move the word into Learning. Mix and match — or select multiple words for bulk actions.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Dropdown sort selector — groups options by dimension using optgroup. */
function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 shrink-0">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 cursor-pointer"
      >
        {SORT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

/** Wrapping pill buttons — no horizontal scroll */
function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors whitespace-nowrap ${
            value === o.value
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LibraryPage() {
  const navigate = useNavigate()
  const items = useVocabStore((s) => s.items)
  const {
    moveToLearning, addToChallenge, addToWeekFocus,
    deleteItems, assignThemes, updateItem,
  } = useVocabStore()
  const allThemes = useThemesStore((s) => s.themes)
  const [searchParams] = useSearchParams()

  // ── Filter / sort state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')
  const [tag, setTag]       = useState<string>('all')
  const [theme, setTheme]   = useState<string>(() => searchParams.get('theme') ?? 'all')
  const [sort, setSort]     = useState<SortKey>('newest')
  const [moreOpen, setMoreOpen] = useState(false)

  // ── Add modal ─────────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)

  // ── Selection state (inbox items only) ───────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastKeyRef = useRef(0)

  // ── Theme picker ──────────────────────────────────────────────────────────────
  const [themePickerMode, setThemePickerMode] = useState<'single' | 'bulk' | null>(null)
  const [themePickerItemId, setThemePickerItemId] = useState<string | null>(null)

  // ── Delete confirm ────────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Background etymology enrichment ──────────────────────────────────────────
  const etymologyProgress = useEtymologyEnricher()

  // ── Background relationship graph enrichment ──────────────────────────────────
  const relationshipProgress = useRelationshipEnricher()

  // Sync URL params when they change (e.g. GlobalSearch "View all" → library?q=…)
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q) setSearch(q)
    const t = searchParams.get('theme') ?? 'all'
    if (t !== 'all') { setTheme(t); setMoreOpen(true) }
  }, [searchParams])

  // ── Tag options ───────────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [items])

  const tagOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...allTags.map((t) => ({ value: t, label: TAG_LABELS[t] ?? `#${t}` })),
    ],
    [allTags],
  )

  // ── Filter counts ─────────────────────────────────────────────────────────────
  const activeFilterCount = [
    status !== 'all',
    tag !== 'all',
    theme !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setStatus('all')
    setTag('all')
    setTheme('all')
    setSearch('')
  }

  // ── Filtered + sorted items ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const hasFilters = status !== 'all' || tag !== 'all' || theme !== 'all'

    function passesFilters(i: VocabItem) {
      if (status !== 'all' && i.status !== status) return false
      if (tag !== 'all' && !i.tags.includes(tag)) return false
      if (theme !== 'all' && !(i.themes ?? []).includes(theme)) return false
      return true
    }

    if (search.trim()) {
      const SEARCH_LIMIT = 200
      const ranked = searchVocabulary(items, search, SEARCH_LIMIT).map((r) => r.item)
      return hasFilters ? ranked.filter(passesFilters) : ranked
    }

    return sortItems(items.filter(passesFilters), sort)
  }, [items, search, status, tag, theme, sort])

  // ── Derived: inbox items visible in current filter ────────────────────────────
  const inboxInFiltered = useMemo(
    () => filtered.filter((i) => i.status === 'inbox'),
    [filtered],
  )

  // ── Derived: selected inbox IDs that are currently visible ───────────────────
  const selectedIds = useMemo(
    () => inboxInFiltered.map((i) => i.id).filter((id) => selected.has(id)),
    [inboxInFiltered, selected],
  )
  const anySelected = selectedIds.length > 0

  // ── Toast helpers ─────────────────────────────────────────────────────────────
  function showToast(
    message: string,
    detail?: string,
    undoPatches?: UndoPatch[],
    ctaLabel?: string,
    onCta?: () => void,
  ) {
    toastKeyRef.current += 1
    setToast({ key: toastKeyRef.current, message, detail, undoPatches, ctaLabel, onCta })
  }

  async function handleUndo(patches: UndoPatch[]) {
    for (const { id, prev } of patches) {
      await updateItem(id, prev)
    }
    setToast(null)
    showToast('Action undone.')
  }

  function captureSnapshot(ids: string[], fields: (keyof VocabItem)[]): UndoPatch[] {
    return ids.flatMap((id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return []
      const prev: Partial<VocabItem> = {}
      for (const f of fields) {
        const val = item[f]
        ;(prev as Record<string, unknown>)[f] = Array.isArray(val) ? [...val] : val
      }
      return [{ id, prev }]
    })
  }

  // ── Selection helpers ─────────────────────────────────────────────────────────
  function toggleSelect(id: string, checked: boolean) {
    setSelected((s) => {
      const next = new Set(s)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected((s) => new Set([...s, ...inboxInFiltered.map((i) => i.id)]))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  // ── Single-item actions ───────────────────────────────────────────────────────
  async function handleMoveLearning(id: string) {
    const snap = captureSnapshot([id], ['status'])
    const { moved, skipped } = await moveToLearning([id])
    if (moved > 0) showToast('Added to Review queue', 'Word appears in Review & Daily Challenge.', snap, 'Review now →', () => navigate('/review'))
    else if (skipped > 0) showToast('Already in Learning or beyond — skipped.')
  }

  async function handleAddChallenge(id: string) {
    const snap = captureSnapshot([id], ['status', 'nextChallengeDate'])
    const { added, skipped } = await addToChallenge([id])
    if (added > 0) showToast("Added to Daily Challenge", "Word is ready for today's quiz.", snap, 'Start Challenge →', () => navigate('/challenge'))
    else if (skipped > 0) showToast('Already due for challenge — skipped.')
  }

  async function handleAddWeek(id: string) {
    const snap = captureSnapshot([id], ['status', 'weeklyFocus'])
    const { added, skipped } = await addToWeekFocus([id])
    if (added > 0) showToast("Added to This Week's Focus", 'Word is now on your weekly board.', snap, 'See Active Words →', () => navigate('/week'))
    else if (skipped > 0) showToast('Already in This Week — skipped.')
  }

  function handleAssignThemeSingle(id: string) {
    setThemePickerItemId(id)
    setThemePickerMode('single')
  }

  async function handleDeleteSingle(id: string) {
    await deleteItems([id])
    setSelected((s) => { const n = new Set(s); n.delete(id); return n })
    showToast('Word deleted.')
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  async function handleBulkMoveLearning() {
    if (!selectedIds.length) return
    const snap = captureSnapshot(selectedIds, ['status'])
    const { moved, skipped } = await moveToLearning(selectedIds)
    clearSelection()
    showToast(
      `${moved} word${moved !== 1 ? 's' : ''} added to Review queue`,
      skipped > 0 ? `${skipped} already in Learning — skipped.` : 'Words appear in Review & Daily Challenge.',
      snap, 'Review now →', () => navigate('/review'),
    )
  }

  async function handleBulkAddChallenge() {
    if (!selectedIds.length) return
    const snap = captureSnapshot(selectedIds, ['status', 'nextChallengeDate'])
    const { added, skipped } = await addToChallenge(selectedIds)
    clearSelection()
    showToast(
      `${added} word${added !== 1 ? 's' : ''} added to Daily Challenge`,
      skipped > 0 ? `${skipped} already due — skipped.` : undefined,
      snap, 'Start Challenge →', () => navigate('/challenge'),
    )
  }

  async function handleBulkAddWeek() {
    if (!selectedIds.length) return
    const snap = captureSnapshot(selectedIds, ['status', 'weeklyFocus'])
    const { added, skipped } = await addToWeekFocus(selectedIds)
    clearSelection()
    showToast(
      `${added} word${added !== 1 ? 's' : ''} added to This Week's Focus`,
      skipped > 0 ? `${skipped} already in This Week — skipped.` : undefined,
      snap, 'See Active Words →', () => navigate('/week'),
    )
  }

  function handleBulkAssignTheme() {
    if (!selectedIds.length) return
    setThemePickerMode('bulk')
  }

  function handleBulkDelete() {
    if (!selectedIds.length) return
    if (selectedIds.length === 1) {
      handleDeleteSingle(selectedIds[0])
      return
    }
    setShowDeleteConfirm(true)
  }

  async function confirmBulkDelete() {
    const count = selectedIds.length
    await deleteItems(selectedIds)
    clearSelection()
    setShowDeleteConfirm(false)
    showToast(`${count} word${count !== 1 ? 's' : ''} deleted.`)
  }

  // ── Theme picker apply ────────────────────────────────────────────────────────
  async function handleThemeApply(themesToAdd: string[]) {
    if (themePickerMode === 'single' && themePickerItemId) {
      const item = items.find((i) => i.id === themePickerItemId)
      if (item) {
        const snap = captureSnapshot([themePickerItemId], ['themes'])
        const next = Array.from(new Set([...(item.themes ?? []), ...themesToAdd]))
        await assignThemes(themePickerItemId, next)
        showToast(`Theme${themesToAdd.length !== 1 ? 's' : ''} assigned.`, undefined, snap)
      }
    } else if (themePickerMode === 'bulk') {
      const snap = captureSnapshot(selectedIds, ['themes'])
      for (const id of selectedIds) {
        const item = items.find((i) => i.id === id)
        if (!item) continue
        const next = Array.from(new Set([...(item.themes ?? []), ...themesToAdd]))
        await assignThemes(id, next)
      }
      const count = selectedIds.length
      clearSelection()
      showToast(
        `${count} word${count !== 1 ? 's' : ''} assigned to ${themesToAdd.length} theme${themesToAdd.length !== 1 ? 's' : ''}.`,
        undefined,
        snap,
      )
    }
    setThemePickerMode(null)
    setThemePickerItemId(null)
  }

  const themeForPicker = useMemo(() => {
    if (themePickerMode === 'single' && themePickerItemId) {
      return items.find((i) => i.id === themePickerItemId)?.themes ?? []
    }
    return []
  }, [themePickerMode, themePickerItemId, items])

  const hasActive = activeFilterCount > 0 || search.trim().length > 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 ${anySelected ? 'pb-48 md:pb-36' : 'pb-24 md:pb-6'}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">Vocabulary</h1>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
            >
              <X size={12} />
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms, definitions, tags…"
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Sort (always visible) ── */}
      <div className="mb-3">
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {/* ── Status (always visible) ── */}
      <div className="mb-3">
        <PillGroup
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </div>

      {/* ── More filters (collapsible) ── */}
      <div className="mb-4">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
          />
          More filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {moreOpen && (
          <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
            {allThemes.length > 0 && (
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Theme</p>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">All themes</option>
                  {allThemes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            {tagOptions.length > 1 && (
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tag</p>
                <PillGroup options={tagOptions} value={tag} onChange={setTag} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Library size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-600">No items found</p>
          <p className="text-sm mt-1">
            {hasActive
              ? 'Try different filters or clear them.'
              : 'Add your first item to get started.'}
          </p>
          {hasActive ? (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-brand-600 hover:underline font-medium"
            >
              Clear all filters
            </button>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Add your first word
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Result count */}
          {hasActive && (
            <p className="text-xs text-slate-400 mb-2 pl-0.5">
              {filtered.length} of {items.length} items
              {search.trim() && (
                <span className="ml-1 text-brand-500 font-medium">· ranked by relevance</span>
              )}
            </p>
          )}

          {/* Item list — two sections when both inbox and non-inbox are visible */}
          {(() => {
            const inboxItems = filtered.filter((i) => i.status === 'inbox')
            const otherItems = filtered.filter((i) => i.status !== 'inbox')
            const hasBoth = inboxItems.length > 0 && otherItems.length > 0

            const inboxSection = inboxItems.length > 0 && (
              <>
                {/* Section header + selection control */}
                {hasBoth && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                      New · needs activation
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                    <button
                      onClick={anySelected ? clearSelection : selectAllVisible}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors shrink-0"
                    >
                      {anySelected
                        ? `${selectedIds.length} selected — clear`
                        : `Select all ${inboxItems.length}`}
                    </button>
                  </div>
                )}

                {/* Selection control for inbox-only view */}
                {!hasBoth && (
                  <div className="flex items-center justify-between mb-3 px-0.5">
                    <button
                      onClick={anySelected ? clearSelection : selectAllVisible}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      {anySelected
                        ? `${selectedIds.length} selected — clear`
                        : `Select all ${inboxItems.length} new word${inboxItems.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}

                {/* Journey guide */}
                <JourneyGuide />

                {/* Inbox cards */}
                <div className="space-y-2">
                  {inboxItems.map((item) => (
                    <InboxCard
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onSelect={toggleSelect}
                      onMoveLearning={handleMoveLearning}
                      onAddChallenge={handleAddChallenge}
                      onAddWeek={handleAddWeek}
                      onAssignTheme={handleAssignThemeSingle}
                      onDelete={handleDeleteSingle}
                      onNavigate={(id) => navigate(`/item/${id}`)}
                    />
                  ))}
                </div>
              </>
            )

            const otherSection = otherItems.length > 0 && (
              <>
                {hasBoth && (
                  <div className="flex items-center gap-2 mt-5 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                      Active vocabulary
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                )}
                <div className="space-y-2">
                  {otherItems.map((item) => (
                    <VocabCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )

            return <>{inboxSection}{otherSection}</>
          })()}
        </>
      )}

      {/* ── Bulk action bar ── */}
      {anySelected && (
        <BulkActionBar
          count={selectedIds.length}
          onMoveLearning={handleBulkMoveLearning}
          onAddChallenge={handleBulkAddChallenge}
          onAddWeek={handleBulkAddWeek}
          onAssignTheme={handleBulkAssignTheme}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">
              Delete {selectedIds.length} words?
            </h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete {selectedIds.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Theme picker modal ── */}
      {themePickerMode && (
        <ThemePickerModal
          title={
            themePickerMode === 'single'
              ? `Assign themes — ${items.find((i) => i.id === themePickerItemId)?.term ?? ''}`
              : `Assign themes to ${selectedIds.length} word${selectedIds.length !== 1 ? 's' : ''}`
          }
          initialSelected={themeForPicker}
          onApply={handleThemeApply}
          onClose={() => { setThemePickerMode(null); setThemePickerItemId(null) }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          toast={toast}
          bulkBarVisible={anySelected}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Add modal ── */}
      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}

      {/* ── Relationship graph enrichment progress toast ── */}
      {relationshipProgress && (
        <div
          className={`fixed right-4 z-50 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 min-w-[220px] transition-all duration-300 ${
            etymologyProgress ? 'bottom-[168px] md:bottom-[112px]' : 'bottom-20 md:bottom-6'
          }`}
        >
          <Loader2 size={15} className="text-violet-500 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700">Building word graphs</p>
            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((relationshipProgress.done / relationshipProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {relationshipProgress.done} / {relationshipProgress.total} words
            </p>
          </div>
        </div>
      )}

      {/* ── Etymology enrichment progress toast ── */}
      {etymologyProgress && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 min-w-[220px]">
          <Loader2 size={15} className="text-brand-500 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700">Adding etymology</p>
            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((etymologyProgress.done / etymologyProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {etymologyProgress.done} / {etymologyProgress.total} words
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
