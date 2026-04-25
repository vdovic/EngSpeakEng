import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Pencil, Trash2, Check, X, ChevronRight, Sparkles, ChevronDown } from 'lucide-react'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { useVocabStore } from '@/store/vocabStore'

// ── Edit-in-place theme row ───────────────────────────────────────────────────

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
        <button onClick={submitRename} className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors" title="Save">
          <Check size={14} />
        </button>
        <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" title="Cancel">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex items-center group hover:border-brand-200 hover:shadow-sm transition-all">
      <button onClick={onNavigate} className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0">
        <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
        <span className="font-medium text-slate-900 text-sm truncate">{name}</span>
        <span className="text-xs text-slate-400 shrink-0">{count} word{count !== 1 ? 's' : ''}</span>
        <ChevronRight size={14} className="text-slate-300 ml-auto shrink-0 group-hover:text-brand-400 transition-colors" />
      </button>
      <div className="flex items-center gap-1 pr-3 shrink-0">
        <button
          onClick={() => { setEditing(true); setDraft(name) }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="Rename"
        >
          <Pencil size={14} />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600 font-medium">Delete?</span>
            <button onClick={onDelete} className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"><Check size={13} /></button>
            <button onClick={() => setConfirmDelete(false)} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors"><X size={13} /></button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Suggested themes section ──────────────────────────────────────────────────

function SuggestedThemesSection({
  existingThemes,
  onAdd,
}: {
  existingThemes: string[]
  onAdd: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(existingThemes.length === 0)
  const existingSet = new Set(existingThemes)
  const unadopted = SUGGESTED_THEMES.filter((s) => !existingSet.has(s.name))

  if (unadopted.length === 0) return null

  return (
    <div className="mt-6 border border-dashed border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <Sparkles size={15} className="text-brand-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-700">Suggested dimensions</span>
          <span className="ml-2 text-xs text-slate-400">{unadopted.length} available</span>
        </div>
        <ChevronDown
          size={15}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {unadopted.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg shrink-0 w-7 text-center">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400 leading-snug">{s.description}</p>
              </div>
              <button
                onClick={() => onAdd(s.name)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          ))}
          <div className="px-4 py-2.5 bg-slate-50">
            <p className="text-xs text-slate-400">
              Adding a dimension creates an empty theme. Open any word's detail page to assign it.
            </p>
          </div>
        </div>
      )}
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
    const { items: allItems, assignThemes } = useVocabStore.getState()
    renameTheme(old, next)
    for (const item of allItems) {
      if ((item.themes ?? []).includes(old)) {
        assignThemes(item.id, item.themes.map((t) => (t === old ? next : t))).catch(() => {})
      }
    }
  }

  function handleDelete(name: string) {
    const { items: allItems, assignThemes } = useVocabStore.getState()
    deleteTheme(name)
    for (const item of allItems) {
      if ((item.themes ?? []).includes(name)) {
        assignThemes(item.id, item.themes.filter((t) => t !== name)).catch(() => {})
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
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
      <p className="text-sm text-slate-500 mb-5">
        Group words into topics. Words can belong to multiple themes. Use themes to filter Vocabulary and to focus Daily Challenge sessions.
      </p>

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
          <button onClick={submitNew} disabled={!newName.trim()} className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-40">
            <Check size={14} />
          </button>
          <button onClick={() => { setShowNewInput(false); setNewName('') }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Theme list (user-created + adopted suggestions) */}
      {themes.length > 0 ? (
        <div className="space-y-2">
          {themes.map((name) => (
            <ThemeRow
              key={name}
              name={name}
              count={themeCounts.get(name) ?? 0}
              onNavigate={() => navigate(`/library?theme=${encodeURIComponent(name)}`)}
              onRename={(next) => handleRename(name, next)}
              onDelete={() => handleDelete(name)}
            />
          ))}
          <p className="text-xs text-slate-400 pt-1 pl-1">
            Click any theme to browse its words in Vocabulary.
          </p>
        </div>
      ) : (
        !showNewInput && (
          <div className="text-center py-10">
            <Layers size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700 mb-1">No themes yet</p>
            <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
              Create your own or pick from the suggested dimensions below.
            </p>
            <button
              onClick={() => setShowNewInput(true)}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Create your first theme
            </button>
          </div>
        )
      )}

      {/* Suggested dimensions */}
      <SuggestedThemesSection existingThemes={themes} onAdd={addTheme} />
    </div>
  )
}
