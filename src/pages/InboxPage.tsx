import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Inbox, Search, X, Check, Zap, Star, Layers,
  Trash2, MoreVertical, BookOpen, ArrowRight,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { QuickAddModal } from '@/components/QuickAddModal'
import { TypeBadge } from '@/components/TypeBadge'
import { VocabItem, ItemType } from '@/types/vocabulary'

// ── Types ─────────────────────────────────────────────────────────────────────

type UndoPatch = { id: string; prev: Partial<VocabItem> }

interface ToastState {
  key: number           // changes to reset the auto-dismiss timer
  message: string
  detail?: string
  undoPatches?: UndoPatch[]
}

// ── Toast ─────────────────────────────────────────────────────────────────────

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
  // Use a ref so the effect always calls the latest dismiss without resetting the timer
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), 4500)
    return () => clearTimeout(timer)
  }, [toast.key])

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl max-w-sm w-[calc(100%-2rem)] transition-all ${
        bulkBarVisible ? 'bottom-36 md:bottom-24' : 'bottom-20 md:bottom-6'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
        {toast.detail && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{toast.detail}</p>}
      </div>
      {toast.undoPatches && toast.undoPatches.length > 0 && (
        <button
          onClick={() => onUndo(toast.undoPatches!)}
          className="shrink-0 text-xs font-bold text-brand-400 hover:text-brand-300 px-1 transition-colors"
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
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [newName, setNewName] = useState('')

  function toggle(t: string) {
    setSelected((s) => {
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
    setSelected((s) => new Set([...s, t]))
    setNewName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Theme list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
          {themes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              No themes yet — create one below.
            </p>
          )}
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                selected.has(t)
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selected.has(t) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}
              >
                {selected.has(t) && <Check size={10} className="text-white" />}
              </div>
              <span className={`text-sm font-medium ${selected.has(t) ? 'text-indigo-700' : 'text-slate-700'}`}>
                {t}
              </span>
            </button>
          ))}
        </div>

        {/* Create new theme + apply */}
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
            onClick={() => onApply(Array.from(selected))}
            className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Apply{selected.size > 0 ? ` (${selected.size} theme${selected.size !== 1 ? 's' : ''})` : ''}
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

  // Close kebab menu on outside click
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
      {/* Top section: checkbox + term + definition */}
      <div className="flex items-start gap-3 px-3 pt-3 pb-2">
        {/* Checkbox */}
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

        {/* Content — tappable to open detail */}
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
        {/* Primary: Move to Learning */}
        <button
          onClick={() => onMoveLearning(item.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 active:scale-95 transition-all"
        >
          <BookOpen size={11} />
          Learning
        </button>

        {/* Challenge */}
        <button
          onClick={() => onAddChallenge(item.id)}
          title="Add to Daily Challenge"
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <Zap size={11} />
          <span className="hidden sm:inline">Challenge</span>
        </button>

        {/* This Week */}
        <button
          onClick={() => onAddWeek(item.id)}
          title="Add to This Week's Focus"
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <Star size={11} />
          <span className="hidden sm:inline">This Week</span>
        </button>

        {/* Kebab menu */}
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
        {/* Count + clear */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-semibold text-white">{count} selected</span>
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear selection
          </button>
        </div>
        {/* Action buttons */}
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

// ── Main page ──────────────────────────────────────────────────────────────────

export function InboxPage() {
  const navigate = useNavigate()
  const items = useVocabStore((s) => s.items)
  const {
    moveToLearning, addToChallenge, addToWeekFocus,
    deleteItems, assignThemes, updateItem,
  } = useVocabStore()
  const allThemes = useThemesStore((s) => s.themes)

  const [showAdd, setShowAdd] = useState(false)

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all')
  const [filterTheme, setFilterTheme] = useState<string>('all')

  // ── Selection state ───────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Toast state ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastKeyRef = useRef(0)

  // ── Modal state ───────────────────────────────────────────────────────────────
  // 'single' | 'bulk' | null — which context opened the theme picker
  const [themePickerMode, setThemePickerMode] = useState<'single' | 'bulk' | null>(null)
  const [themePickerItemId, setThemePickerItemId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Derived data ──────────────────────────────────────────────────────────────

  const inboxItems = useMemo(
    () => items.filter((i) => i.status === 'inbox'),
    [items],
  )

  const filtered = useMemo(() => {
    return inboxItems.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false
      if (filterTheme === 'unassigned' && (item.themes ?? []).length > 0) return false
      if (
        filterTheme !== 'all' &&
        filterTheme !== 'unassigned' &&
        !(item.themes ?? []).includes(filterTheme)
      ) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          item.term.toLowerCase().includes(q) ||
          item.definitionEn?.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          (item.themes ?? []).some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [inboxItems, filterType, filterTheme, search])

  // IDs of filtered items that are currently selected (selection outside filter is ignored)
  const selectedIds = useMemo(
    () => filtered.map((i) => i.id).filter((id) => selected.has(id)),
    [filtered, selected],
  )
  const anySelected = selectedIds.length > 0

  // ── Toast helper ──────────────────────────────────────────────────────────────

  function showToast(message: string, detail?: string, undoPatches?: UndoPatch[]) {
    toastKeyRef.current += 1
    setToast({ key: toastKeyRef.current, message, detail, undoPatches })
  }

  async function handleUndo(patches: UndoPatch[]) {
    for (const { id, prev } of patches) {
      await updateItem(id, prev)
    }
    setToast(null)
    showToast('Action undone.')
  }

  // Capture a snapshot of specific fields for undo
  function captureSnapshot(ids: string[], fields: (keyof VocabItem)[]): UndoPatch[] {
    return ids.flatMap((id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return []
      const prev: Partial<VocabItem> = {}
      for (const f of fields) {
        const val = item[f]
        // Deep-copy arrays
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
    setSelected((s) => new Set([...s, ...filtered.map((i) => i.id)]))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  // ── Single-item actions ───────────────────────────────────────────────────────

  async function handleMoveLearning(id: string) {
    const snap = captureSnapshot([id], ['status'])
    const { moved, skipped } = await moveToLearning([id])
    if (moved > 0) showToast('Moved to Learning', undefined, snap)
    else if (skipped > 0) showToast('Already in Learning or beyond — skipped.')
  }

  async function handleAddChallenge(id: string) {
    const snap = captureSnapshot([id], ['status', 'nextChallengeDate'])
    const { added, skipped } = await addToChallenge([id])
    if (added > 0) showToast('Added to Daily Challenge', undefined, snap)
    else if (skipped > 0) showToast('Already due for challenge — skipped.')
  }

  async function handleAddWeek(id: string) {
    const snap = captureSnapshot([id], ['status', 'weeklyFocus'])
    const { added, skipped } = await addToWeekFocus([id])
    if (added > 0) showToast("Added to This Week's Focus", undefined, snap)
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
      `${moved} word${moved !== 1 ? 's' : ''} moved to Learning`,
      skipped > 0 ? `${skipped} already in Learning — skipped.` : undefined,
      snap,
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
      snap,
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
      snap,
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

  // ── Render ────────────────────────────────────────────────────────────────────

  const themeForPicker = useMemo(() => {
    if (themePickerMode === 'single' && themePickerItemId) {
      return items.find((i) => i.id === themePickerItemId)?.themes ?? []
    }
    return []
  }, [themePickerMode, themePickerItemId, items])

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 ${anySelected ? 'pb-48 md:pb-36' : 'pb-24 md:pb-6'}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">New Words</h1>
          {inboxItems.length > 0 && (
            <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {inboxItems.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms, definitions, themes…"
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {/* Type pills */}
        <div className="flex gap-1">
          {(['all', 'word', 'phrase', 'chunk'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                filterType === t
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Theme filter */}
        {allThemes.length > 0 && (
          <select
            value={filterTheme}
            onChange={(e) => setFilterTheme(e.target.value)}
            className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer"
          >
            <option value="all">All themes</option>
            <option value="unassigned">No theme</option>
            {allThemes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {/* Active filters indicator */}
        {(filterType !== 'all' || filterTheme !== 'all') && (
          <button
            onClick={() => { setFilterType('all'); setFilterTheme('all') }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full transition-colors"
          >
            <X size={10} />
            Clear
          </button>
        )}
      </div>

      {/* ── Selection controls ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-0.5">
          <button
            onClick={anySelected ? clearSelection : selectAllVisible}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            {anySelected
              ? `${selectedIds.length} selected — clear`
              : `Select all ${filtered.length === inboxItems.length ? 'new words' : `${filtered.length} visible`}`}
          </button>
          {filtered.length < inboxItems.length && (
            <span className="text-xs text-slate-400">
              {filtered.length} of {inboxItems.length} shown
            </span>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Inbox size={40} className="mx-auto mb-3 opacity-40" />
          {inboxItems.length === 0 ? (
            <>
              <p className="font-medium text-slate-600">No new words yet</p>
              <p className="text-sm mt-1">Capture words and phrases as you encounter them.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                Add your first word
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-600">No words match your filters</p>
              <button
                onClick={() => { setSearch(''); setFilterType('all'); setFilterTheme('all') }}
                className="mt-3 text-sm text-brand-600 hover:underline font-medium"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Instruction tip ── */}
      {inboxItems.length > 0 && filtered.length > 0 && (
        <p className="text-xs text-slate-400 mb-3">
          Use the buttons below each word to activate it. Select multiple words for batch actions.
        </p>
      )}

      {/* ── Item list ── */}
      <div className="space-y-2">
        {filtered.map((item) => (
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

      {/* ── Delete confirmation modal ── */}
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

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
