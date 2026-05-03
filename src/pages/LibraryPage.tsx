import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, Library, X, ChevronDown, Plus,
  Check, Zap, Star, Layers, Trash2, MoreVertical,
  BookOpen, ArrowRight, Loader2, Tag,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabCard } from '@/components/VocabCard'
import { QuickAddModal } from '@/components/QuickAddModal'
import { TypeBadge } from '@/components/TypeBadge'
import { LevelBadge } from '@/components/LevelBadge'
import { VocabItem } from '@/types/vocabulary'
import { searchVocabulary } from '@/utils/vocabSearch'
import { useEtymologyEnricher } from '@/hooks/useEtymologyEnricher'
import { useRelationshipEnricher } from '@/hooks/useRelationshipEnricher'
import {
  LevelFilter, FocusFilter, ExposureBandFilter, LibrarySortKey,
  LibraryFilters, itemPassesFilters, activeFilterCount as countActiveFilters,
  hasActiveFilter, isInFocus, sortLibraryItems,
} from '@/lib/libraryFilters'
import { FOCUS_MAX } from '@/lib/focusLogic'

// ── Constants ──────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 0,     label: 'New' },
  { value: 1,     label: 'Learning' },
  { value: 2,     label: 'Familiar' },
  { value: 3,     label: 'Mastered' },
]

const FOCUS_OPTIONS: { value: FocusFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'focus',     label: 'In My Current Focus' },
  { value: 'not-focus', label: 'Not in focus' },
]

const EXPOSURE_BAND_OPTIONS: { value: ExposureBandFilter; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'not-started', label: 'Not started' },
  { value: 'early',       label: 'Early (1–2)' },
  { value: 'building',    label: 'Building (3–7)' },
  { value: 'complete',    label: 'Complete (8)' },
]

/** Human-readable display names for known tags */
const TAG_LABELS: Record<string, string> = {
  'vocabulary':   'General Vocabulary',
  'phrasal-verb': 'Phrasal Verbs',
  'idiom':        'Idioms',
  'chunks':       'Fixed Phrases',
}

const SORT_GROUPS: { label: string; options: { value: LibrarySortKey; label: string }[] }[] = [
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
    label: 'Learning level',
    options: [
      { value: 'level-asc',  label: 'New → Mastered' },
      { value: 'level-desc', label: 'Mastered → New' },
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
    label: 'Difficulty (how hard for you)',
    options: [
      { value: 'difficulty-desc', label: 'Hardest for me first' },
      { value: 'difficulty-asc',  label: 'Easiest for me first' },
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

interface InboxCardProps {
  item: VocabItem
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onMoveLearning: (id: string) => void
  onAddChallenge: (id: string) => void
  onAddFocus: (id: string) => void
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
  onAddFocus,
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
            <LevelBadge item={item} />
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
          onClick={() => onAddFocus(item.id)}
          title="Add to My Current Focus"
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <Star size={11} />
          <span className="hidden sm:inline">My Focus</span>
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
  onAddFocus,
  onAssignTheme,
  onAddTag,
  onDelete,
  onClear,
}: {
  count: number
  onMoveLearning: () => void
  onAddChallenge: () => void
  onAddFocus: () => void
  onAssignTheme: () => void
  onAddTag: (tag: string) => void
  onDelete: () => void
  onClear: () => void
}) {
  const [tagInput, setTagInput] = useState('')

  function submitTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) return
    onAddTag(t)
    setTagInput('')
  }

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
        <div className="flex gap-2 flex-wrap mb-2.5">
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
            onClick={onAddFocus}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors"
          >
            <Star size={12} />
            My Focus
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
        {/* Bulk tag input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTag()}
              placeholder="Add tag to all selected…"
              className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={submitTag}
            disabled={!tagInput.trim()}
            className="px-3 py-2 bg-slate-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-slate-600 transition-colors"
          >
            Add tag
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
              <span className="font-bold text-slate-800">Learning</span> — enters your SRS Review queue. Words come back at growing intervals (1 day → 3 → 7 → 14…) until recalled 3 times.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Challenge</span> — jumps into today's Daily Challenge quiz (multiple choice + fill-in). Best for words you want to test right now.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">My Focus</span> — adds to your current focus list. Best for a small set of words you're consciously practising (speaking, writing).
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

function SortSelect({ value, onChange }: { value: LibrarySortKey; onChange: (v: LibrarySortKey) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 shrink-0">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LibrarySortKey)}
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

function PillGroup<T extends string | number>({
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
          key={String(o.value)}
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
    addToFocus, removeFromFocus, addTag,
  } = useVocabStore()
  const allThemes = useThemesStore((s) => s.themes)
  const [searchParams] = useSearchParams()

  // ── Filter / sort state ───────────────────────────────────────────────────────
  const [search, setSearch]           = useState(() => searchParams.get('q') ?? '')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all')
  const [exposureBand, setExposureBand] = useState<ExposureBandFilter>('all')
  const [tag, setTag]                 = useState<string>('all')
  const [theme, setTheme]             = useState<string>(() => searchParams.get('theme') ?? 'all')
  const [sort, setSort]               = useState<LibrarySortKey>('newest')
  const [moreOpen, setMoreOpen]       = useState(false)

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

  // ── Background enrichment ─────────────────────────────────────────────────────
  const etymologyProgress     = useEtymologyEnricher()
  const relationshipProgress  = useRelationshipEnricher()

  // Sync URL params
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q) setSearch(q)
    const t = searchParams.get('theme') ?? 'all'
    if (t !== 'all') { setTheme(t); setMoreOpen(true) }
  }, [searchParams])

  // ── Derived: focus count (both fields, for banner) ────────────────────────────
  const focusCount = useMemo(
    () => items.filter(isInFocus).length,
    [items],
  )

  // ── Tag options ───────────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [items])

  const tagOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...allTags.map((t) => ({ value: t, label: TAG_LABELS[t] ?? `#${t}` })),
    ],
    [allTags],
  )

  // ── Composed filters object ───────────────────────────────────────────────────
  const filters: LibraryFilters = {
    level: levelFilter,
    focus: focusFilter,
    exposureBand,
    tag,
    theme,
  }

  const filterCount = countActiveFilters(filters)

  function clearFilters() {
    setLevelFilter('all')
    setFocusFilter('all')
    setExposureBand('all')
    setTag('all')
    setTheme('all')
    setSearch('')
  }

  // ── Filtered + sorted items ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const active = hasActiveFilter(filters)

    function passes(i: VocabItem) {
      return itemPassesFilters(i, filters)
    }

    if (search.trim()) {
      const SEARCH_LIMIT = 200
      const ranked = searchVocabulary(items, search, SEARCH_LIMIT).map((r) => r.item)
      return active ? ranked.filter(passes) : ranked
    }

    return sortLibraryItems(items.filter(passes), sort)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, levelFilter, focusFilter, exposureBand, tag, theme, sort])

  // ── Derived: inbox items visible in current filter ────────────────────────────
  const inboxInFiltered = useMemo(
    () => filtered.filter((i) => i.status === 'inbox'),
    [filtered],
  )

  // ── Derived: selected inbox IDs visible ──────────────────────────────────────
  const selectedIds = useMemo(
    () => inboxInFiltered.map((i) => i.id).filter((id) => selected.has(id)),
    [inboxInFiltered, selected],
  )
  const anySelected = selectedIds.length > 0

  const hasActive = filterCount > 0 || search.trim().length > 0

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
    for (const { id, prev } of patches) await updateItem(id, prev)
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
    setSelected((s) => { const n = new Set(s); if (checked) n.add(id); else n.delete(id); return n })
  }
  function selectAllVisible() {
    setSelected((s) => new Set([...s, ...inboxInFiltered.map((i) => i.id)]))
  }
  function clearSelection() { setSelected(new Set()) }

  // ── Per-card focus toggle (non-inbox items) ───────────────────────────────────
  async function handleFocusToggle(id: string, currentlyFocused: boolean) {
    if (currentlyFocused) {
      await removeFromFocus(id)
      showToast('Removed from My Current Focus.')
    } else {
      const { added, evicted } = await addToFocus([id])
      if (added > 0) {
        showToast(
          'Added to My Current Focus',
          evicted > 0 ? `${evicted} lower-priority word${evicted !== 1 ? 's' : ''} removed to make room.` : undefined,
        )
      } else {
        showToast('Already in My Current Focus.')
      }
    }
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

  async function handleAddFocus(id: string) {
    const snap = captureSnapshot([id], ['status', 'weeklyFocus', 'inFocus'])
    const { added, skipped } = await addToWeekFocus([id])
    if (added > 0) showToast("Added to My Current Focus", 'Word is now on your focus list.', snap, 'See Active Words →', () => navigate('/week'))
    else if (skipped > 0) showToast('Already in My Current Focus — skipped.')
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

  async function handleBulkAddFocus() {
    if (!selectedIds.length) return
    const snap = captureSnapshot(selectedIds, ['status', 'weeklyFocus', 'inFocus'])
    const { added, skipped } = await addToWeekFocus(selectedIds)
    clearSelection()
    showToast(
      `${added} word${added !== 1 ? 's' : ''} added to My Current Focus`,
      skipped > 0 ? `${skipped} already in focus — skipped.` : undefined,
      snap, 'See Active Words →', () => navigate('/week'),
    )
  }

  function handleBulkAssignTheme() {
    if (!selectedIds.length) return
    setThemePickerMode('bulk')
  }

  async function handleBulkAddTag(tagStr: string) {
    if (!selectedIds.length || !tagStr) return
    for (const id of selectedIds) {
      await addTag(id, tagStr)
    }
    showToast(`Tag #${tagStr} added to ${selectedIds.length} word${selectedIds.length !== 1 ? 's' : ''}.`)
  }

  function handleBulkDelete() {
    if (!selectedIds.length) return
    if (selectedIds.length === 1) { handleDeleteSingle(selectedIds[0]); return }
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
        undefined, snap,
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 ${anySelected ? 'pb-56 md:pb-44' : 'pb-24 md:pb-6'}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">Vocabulary</h1>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {filterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
            >
              <X size={12} />
              Clear {filterCount} filter{filterCount > 1 ? 's' : ''}
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

      {/* ── My Current Focus banner ── */}
      {focusCount > 0 && (
        <button
          onClick={() => navigate('/week')}
          className="w-full flex items-center gap-2 px-3 py-2 mb-3 bg-orange-50 border border-orange-200 rounded-xl text-xs hover:bg-orange-100 transition-colors"
        >
          <Star size={12} className="text-orange-500 shrink-0" fill="currentColor" />
          <span className="text-orange-700 font-medium flex-1 text-left">
            {focusCount} / {FOCUS_MAX} in My Current Focus
          </span>
          <span className="text-orange-400">→</span>
        </button>
      )}

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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

      {/* ── Level filter pills (replaces status) ── */}
      <div className="mb-3">
        <PillGroup<LevelFilter>
          options={LEVEL_OPTIONS}
          value={levelFilter}
          onChange={setLevelFilter}
        />
      </div>

      {/* ── More filters (collapsible) ── */}
      <div className="mb-4">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
          More filters
          {filterCount > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {filterCount}
            </span>
          )}
        </button>

        {moreOpen && (
          <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">

            {/* Focus filter */}
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Focus</p>
              <PillGroup<FocusFilter>
                options={FOCUS_OPTIONS}
                value={focusFilter}
                onChange={setFocusFilter}
              />
            </div>

            {/* Exposure band */}
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Daily Challenge progress</p>
              <PillGroup<ExposureBandFilter>
                options={EXPOSURE_BAND_OPTIONS}
                value={exposureBand}
                onChange={setExposureBand}
              />
            </div>

            {/* Theme */}
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

            {/* Tag */}
            {tagOptions.length > 1 && (
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tag</p>
                <PillGroup<string> options={tagOptions} value={tag} onChange={setTag} />
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
            {hasActive ? 'Try different filters or clear them.' : 'Add your first item to get started.'}
          </p>
          {hasActive ? (
            <button onClick={clearFilters} className="mt-3 text-sm text-brand-600 hover:underline font-medium">
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
              {search.trim() && <span className="ml-1 text-brand-500 font-medium">· ranked by relevance</span>}
            </p>
          )}

          {/* Item list */}
          {(() => {
            const inboxItems = filtered.filter((i) => i.status === 'inbox')
            const otherItems = filtered.filter((i) => i.status !== 'inbox')
            const hasBoth    = inboxItems.length > 0 && otherItems.length > 0

            const inboxSection = inboxItems.length > 0 && (
              <>
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
                      {anySelected ? `${selectedIds.length} selected — clear` : `Select all ${inboxItems.length}`}
                    </button>
                  </div>
                )}
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
                <JourneyGuide />
                <div className="space-y-2">
                  {inboxItems.map((item) => (
                    <InboxCard
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onSelect={toggleSelect}
                      onMoveLearning={handleMoveLearning}
                      onAddChallenge={handleAddChallenge}
                      onAddFocus={handleAddFocus}
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
                    <VocabCard
                      key={item.id}
                      item={item}
                      inFocus={isInFocus(item)}
                      onFocusToggle={() => handleFocusToggle(item.id, isInFocus(item))}
                    />
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
          onAddFocus={handleBulkAddFocus}
          onAssignTheme={handleBulkAssignTheme}
          onAddTag={handleBulkAddTag}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">Delete {selectedIds.length} words?</h3>
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

      {/* ── Relationship graph enrichment progress ── */}
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
            <p className="text-[10px] text-slate-400 mt-1">{relationshipProgress.done} / {relationshipProgress.total} words</p>
          </div>
        </div>
      )}

      {/* ── Etymology enrichment progress ── */}
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
            <p className="text-[10px] text-slate-400 mt-1">{etymologyProgress.done} / {etymologyProgress.total} words</p>
          </div>
        </div>
      )}
    </div>
  )
}
