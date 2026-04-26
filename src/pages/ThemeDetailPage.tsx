/**
 * ThemeDetailPage — /themes/:themeName
 *
 * Lets the user:
 *  - Rename or delete the theme
 *  - Re-run AI auto-assignment (picks up any words added since last run)
 *  - See all words currently in the theme, remove them individually
 *  - Search their vocabulary and add more words manually
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Check, X, Trash2,
  Sparkles, Loader2, Search, Plus, RefreshCw,
  BookOpen, ExternalLink,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { useThemeAutoAssign } from '@/hooks/useThemeAutoAssign'
import { StatusBadge } from '@/components/StatusBadge'
import { VocabItem } from '@/types/vocabulary'

// ── ThemeDetailPage ───────────────────────────────────────────────────────────

export function ThemeDetailPage() {
  const { themeName: rawName = '' } = useParams<{ themeName: string }>()
  const navigate = useNavigate()
  const themeName = decodeURIComponent(rawName)

  const { themes, renameTheme, deleteTheme } = useThemesStore()
  const items = useVocabStore((s) => s.items)
  const { assignThemes } = useVocabStore()

  const { trigger, isProcessing, lastResult, error, clearResult, clearError } =
    useThemeAutoAssign()

  // Guard: bad URL or theme was deleted
  const themeExists = themes.includes(themeName)

  // ── Rename ──────────────────────────────────────────────────────────────────

  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(themeName)

  function submitRename() {
    const trimmed = draft.trim()
    setRenaming(false)
    if (!trimmed || trimmed === themeName) return

    // Update store
    renameTheme(themeName, trimmed)

    // Update theme field on every word that referenced the old name
    const { items: allItems } = useVocabStore.getState()
    for (const item of allItems) {
      if ((item.themes ?? []).includes(themeName)) {
        void assignThemes(item.id, item.themes.map((t) => (t === themeName ? trimmed : t)))
      }
    }

    // Navigate to the new URL so the page reflects the new name
    navigate(`/themes/${encodeURIComponent(trimmed)}`, { replace: true })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    const { items: allItems } = useVocabStore.getState()
    deleteTheme(themeName)
    for (const item of allItems) {
      if ((item.themes ?? []).includes(themeName)) {
        void assignThemes(item.id, (item.themes ?? []).filter((t) => t !== themeName))
      }
    }
    navigate('/themes')
  }

  // ── Words currently in theme ────────────────────────────────────────────────

  const themeWords = useMemo(
    () => items.filter((i) => (i.themes ?? []).includes(themeName) && !i.archived),
    [items, themeName],
  )

  const [searchIn, setSearchIn] = useState('')
  const filteredIn = useMemo(() => {
    if (!searchIn.trim()) return themeWords
    const q = searchIn.toLowerCase()
    return themeWords.filter(
      (i) =>
        i.term.toLowerCase().includes(q) ||
        i.definitionEn?.toLowerCase().includes(q),
    )
  }, [themeWords, searchIn])

  async function removeWord(item: VocabItem) {
    const next = (item.themes ?? []).filter((t) => t !== themeName)
    await assignThemes(item.id, next)
  }

  // ── Words NOT yet in theme ───────────────────────────────────────────────────

  const nonThemeWords = useMemo(
    () => items.filter((i) => !(i.themes ?? []).includes(themeName) && !i.archived),
    [items, themeName],
  )

  const [searchOut, setSearchOut] = useState('')
  const filteredOut = useMemo(() => {
    if (!searchOut.trim()) return []
    const q = searchOut.toLowerCase()
    return nonThemeWords
      .filter(
        (i) =>
          i.term.toLowerCase().includes(q) ||
          i.definitionEn?.toLowerCase().includes(q),
      )
      .slice(0, 25)
  }, [nonThemeWords, searchOut])

  async function addWord(item: VocabItem) {
    const next = Array.from(new Set([...(item.themes ?? []), themeName]))
    await assignThemes(item.id, next)
  }

  // ── Not found ───────────────────────────────────────────────────────────────

  if (!themeExists) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">
        <p className="font-medium text-slate-600 mb-2">Theme not found</p>
        <button
          onClick={() => navigate('/themes')}
          className="text-brand-600 hover:underline text-sm"
        >
          ← Back to Themes
        </button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">

      {/* ── Top bar: back + name + actions ── */}
      <div className="mb-6">
        {/* Row 1: back arrow + title */}
        <div className="flex items-start gap-2 mb-1">
          <button
            onClick={() => navigate('/themes')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0 transition-colors mt-0.5"
          >
            <ArrowLeft size={20} />
          </button>

          {renaming ? (
            <>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename()
                  if (e.key === 'Escape') { setDraft(themeName); setRenaming(false) }
                }}
                className="flex-1 min-w-0 text-xl font-bold text-slate-900 bg-transparent border-b-2 border-brand-500 outline-none pb-0.5"
              />
              <button
                onClick={submitRename}
                className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors shrink-0"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setDraft(themeName); setRenaming(false) }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {themeName}
            </h1>
          )}
        </div>

        {/* Row 2: word count + actions (only in non-renaming mode) */}
        {!renaming && (
          <div className="flex items-center gap-2 pl-9">
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {themeWords.length} word{themeWords.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setDraft(themeName); setRenaming(true) }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Rename theme"
            >
              <Pencil size={15} />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete?</span>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors"
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
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── AI Assignment card ── */}
      <div className="bg-gradient-to-br from-violet-50 to-brand-50 border border-violet-100 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">AI Word Assignment</p>
            <p className="text-xs text-slate-500 leading-snug mt-0.5">
              Scans your full vocabulary and assigns matching words automatically.
              Re-run anytime — new words added since last time will be included.
            </p>
          </div>
        </div>

        {/* Status banners */}
        {isProcessing && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2.5 bg-white/70 rounded-xl text-sm text-violet-700">
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>Scanning your vocabulary…</span>
          </div>
        )}
        {!isProcessing && lastResult && (
          <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2.5 bg-white/70 rounded-xl text-sm text-emerald-700">
            <span>
              {lastResult.assigned > 0 ? (
                <>
                  <strong>{lastResult.assigned}</strong> word
                  {lastResult.assigned !== 1 ? 's' : ''} assigned
                  {lastResult.scanned > 0 && (
                    <span className="text-emerald-500 ml-1">({lastResult.scanned} scanned)</span>
                  )}
                </>
              ) : (
                <>No new matches found ({lastResult.scanned} scanned)</>
              )}
            </span>
            <button onClick={clearResult} className="text-emerald-400 hover:text-emerald-700 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {!isProcessing && error && (
          <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2.5 bg-white/70 rounded-xl text-sm text-red-700">
            <span>AI failed: {error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}

        <button
          onClick={() => void trigger(themeName)}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {isProcessing ? (
            <><Loader2 size={14} className="animate-spin" /> Scanning…</>
          ) : themeWords.length === 0 ? (
            <><Sparkles size={14} /> Run AI assignment</>
          ) : (
            <><RefreshCw size={14} /> Re-run AI assignment</>
          )}
        </button>
      </div>

      {/* ── Words in this theme ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Words in this theme
            {themeWords.length > 0 && (
              <span className="text-xs font-normal text-slate-400">{themeWords.length}</span>
            )}
          </h2>
          <button
            onClick={() => navigate(`/library?theme=${encodeURIComponent(themeName)}`)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Browse in Vocabulary <ExternalLink size={11} />
          </button>
        </div>

        {themeWords.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-500 mb-1">No words assigned yet</p>
            <p className="text-xs">Run AI assignment above, or search your vocabulary below.</p>
          </div>
        ) : (
          <>
            {/* Filter — only shown when there are enough words to be worth it */}
            {themeWords.length > 6 && (
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchIn}
                  onChange={(e) => setSearchIn(e.target.value)}
                  placeholder="Filter words…"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300 bg-white"
                />
                {searchIn && (
                  <button
                    onClick={() => setSearchIn('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {filteredIn.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors group"
                >
                  <button
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.term}</p>
                    {item.definitionEn && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                        {item.definitionEn}
                      </p>
                    )}
                  </button>
                  <StatusBadge status={item.status} />
                  <button
                    onClick={() => void removeWord(item)}
                    className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove from theme"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {filteredIn.length === 0 && searchIn && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No words match &ldquo;{searchIn}&rdquo;
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Add words manually ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Add words manually</h2>
        <p className="text-xs text-slate-400 mb-3">
          Search your vocabulary ({nonThemeWords.length} word{nonThemeWords.length !== 1 ? 's' : ''} not yet in this theme)
        </p>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchOut}
            onChange={(e) => setSearchOut(e.target.value)}
            placeholder="Search to add words…"
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300 bg-white"
          />
          {searchOut && (
            <button
              onClick={() => setSearchOut('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {!searchOut.trim() ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Type above to search your vocabulary
          </p>
        ) : filteredOut.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No words match &ldquo;{searchOut}&rdquo;
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {filteredOut.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-brand-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.term}</p>
                    {item.definitionEn && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                        {item.definitionEn}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                  <button
                    onClick={() => void addWord(item)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              ))}
              {filteredOut.length === 25 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  Showing first 25 — narrow your search to find more
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
