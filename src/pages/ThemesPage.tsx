import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Pencil, Trash2, Check, X, ChevronRight } from 'lucide-react'
import { useThemesStore } from '@/store/themesStore'
import { useVocabStore } from '@/store/vocabStore'

// ── Small component: edit-in-place theme row ──────────────────────────────────

interface ThemeRowProps {
  name: string
  count: number
  onNavigate: () => void
  onRename: (newName: string) => void
  onDelete: () => void
}

function ThemeRow({ name, count, onNavigate, onRename, onDelete }: ThemeRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function submitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    setEditing(false)
  }

  function cancelEdit() {
    setDraft(name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white border border-brand-300 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename()
            if (e.key === 'Escape') cancelEdit()
          }}
          className="flex-1 text-sm font-medium text-slate-900 bg-transparent outline-none border-b border-brand-400 pb-0.5"
        />
        <button
          onClick={submitRename}
          className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancelEdit}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex items-center group hover:border-brand-200 hover:shadow-sm transition-all">
      {/* Main clickable area → library filtered by theme */}
      <button
        onClick={onNavigate}
        className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
      >
        <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
        <span className="font-medium text-slate-900 text-sm truncate">{name}</span>
        <span className="text-xs text-slate-400 shrink-0">{count} word{count !== 1 ? 's' : ''}</span>
        <ChevronRight size={14} className="text-slate-300 ml-auto shrink-0 group-hover:text-brand-400 transition-colors" />
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 pr-3 shrink-0">
        <button
          onClick={() => { setEditing(true); setDraft(name) }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Rename theme"
        >
          <Pencil size={14} />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600 font-medium">Delete?</span>
            <button
              onClick={onDelete}
              className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
              title="Confirm delete"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors"
              title="Cancel"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete theme"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ThemesPage() {
  const navigate = useNavigate()
  const { themes, addTheme, renameTheme, deleteTheme } = useThemesStore()
  const items = useVocabStore((s) => s.items)

  const [showNewInput, setShowNewInput] = useState(false)
  const [newName, setNewName] = useState('')

  // Count words per theme
  const themeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const theme of themes) counts.set(theme, 0)
    for (const item of items) {
      for (const t of item.themes ?? []) {
        if (counts.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1)
      }
    }
    return counts
  }, [themes, items])

  function submitNew() {
    const trimmed = newName.trim()
    if (trimmed) {
      addTheme(trimmed)
      setNewName('')
      setShowNewInput(false)
    }
  }

  function handleRename(old: string, next: string) {
    // Also patch all vocab items that had this theme
    const { items: allItems, assignThemes } = useVocabStore.getState()
    renameTheme(old, next)
    for (const item of allItems) {
      if ((item.themes ?? []).includes(old)) {
        const updated = item.themes.map((t) => (t === old ? next : t))
        assignThemes(item.id, updated).catch(() => {})
      }
    }
  }

  function handleDelete(name: string) {
    // Remove theme from all vocab items before deleting from store
    const { items: allItems, assignThemes } = useVocabStore.getState()
    deleteTheme(name)
    for (const item of allItems) {
      if ((item.themes ?? []).includes(name)) {
        const updated = item.themes.filter((t) => t !== name)
        assignThemes(item.id, updated).catch(() => {})
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">Themes</h1>
          {themes.length > 0 && (
            <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {themes.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowNewInput(true); setNewName('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          New theme
        </button>
      </div>

      {/* New theme input */}
      {showNewInput && (
        <div className="mb-4 bg-white border border-brand-300 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNew()
              if (e.key === 'Escape') { setShowNewInput(false); setNewName('') }
            }}
            placeholder="Theme name…"
            className="flex-1 text-sm font-medium text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
          />
          <button
            onClick={submitNew}
            disabled={!newName.trim()}
            className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40"
            title="Create theme"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => { setShowNewInput(false); setNewName('') }}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Empty state */}
      {themes.length === 0 && !showNewInput && (
        <div className="text-center py-16">
          <Layers size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700 mb-1">No themes yet</p>
          <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
            Group your vocabulary into topics like "Business English", "Phrasal Verbs", or "Interviews".
          </p>
          <button
            onClick={() => setShowNewInput(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Create your first theme
          </button>
        </div>
      )}

      {/* Theme list */}
      {themes.length > 0 && (
        <div className="space-y-2">
          {themes.map((name) => (
            <ThemeRow
              key={name}
              name={name}
              count={themeCounts.get(name) ?? 0}
              onNavigate={() => navigate(`/library?theme=${encodeURIComponent(name)}`)}
              onRename={(newName) => handleRename(name, newName)}
              onDelete={() => handleDelete(name)}
            />
          ))}
        </div>
      )}

      {/* Stats summary */}
      {themes.length > 0 && (
        <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
          Click any theme to browse its words in Vocabulary. Use the word detail page to assign or remove themes.
        </div>
      )}
    </div>
  )
}
