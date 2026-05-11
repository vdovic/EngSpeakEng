/**
 * QuickAddModal — streamlined 4-phase add flow
 *
 * Phase 1 (add):
 *   • Large term input (Enter to add)
 *   • "Did you mean…" fuzzy spell-correction suggestions (Levenshtein ≤ 2)
 *     Clicking a suggestion replaces the input — does NOT save.
 *     The user must explicitly press [Add + another] or [Add →] to persist.
 *   • "Similar entries" near-duplicate detection (Dice coefficient)
 *   • [Add + another] [Add →]
 *
 * Phase 2a (enriching):
 *   • Spinner while AI enriches the saved term
 *
 * Phase 2b (review):
 *   • Full enriched content — definition, examples, collocations, usage profile
 *   • 3-level Familiarity selector (defaults to level 1 = New)
 *   • Error + retry option when enrichment fails
 *   • [Add another] [Done →]
 *
 * Phase 3 (assign):
 *   • "Where should this go?" — theme cards + new theme inline
 *
 * Design rules:
 *   • No type selector — type is auto-detected silently
 *   • No context / tags fields — removed to reduce friction
 *   • AI enrichment always runs; user sees the result before closing
 *   • Confidence level is set in the review phase (before confirming)
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, AlertCircle, AlertTriangle, ArrowRight,
  Check, Plus, Sparkles, ChevronRight, RefreshCw,
  Loader2, BookOpen, Star, Zap,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabItem, ItemType } from '@/types/vocabulary'
import {
  findExactDuplicate,
  findNearDuplicates,
  fuzzySpellingSuggestions,
} from '@/utils/vocabSearch'
import { suggestThemes } from '@/lib/themeSuggestion'
import { ConfidenceDots } from '@/components/ConfidenceDots'
import { UsageProfileCard } from '@/components/UsageProfileCard'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'add' | 'enriching' | 'review' | 'assign' | 'saved'
type ConfidenceLevel = 0 | 1 | 2 | 3

interface Props {
  onClose: () => void
}

// PERFORMANCE NOTE — suggestion calculation runs on every debounce tick.
// Do NOT reduce this value: shorter debounces cause expensive Levenshtein and
// Dice coefficient scans to fire more frequently, blocking the JS thread.
const DEBOUNCE_MS = 400

// Particles that mark a multi-word term as a phrasal verb
const PV_PARTICLES = new Set([
  'up', 'down', 'out', 'off', 'on', 'away', 'back', 'over', 'through', 'into',
])

// ── Familiarity option descriptors ────────────────────────────────────────────

const FAMILIARITY_OPTIONS = [
  {
    level: 1 as ConfidenceLevel,
    label: 'New to me',
    desc:  "I haven't used it yet",
    activeClass: 'border-rose-400 bg-rose-50',
    labelClass:  'text-rose-700',
    checkClass:  'text-rose-500',
  },
  {
    level: 2 as ConfidenceLevel,
    label: 'Getting comfortable',
    desc:  'I recognise it but need practice',
    activeClass: 'border-amber-400 bg-amber-50',
    labelClass:  'text-amber-700',
    checkClass:  'text-amber-500',
  },
  {
    level: 3 as ConfidenceLevel,
    label: 'Comfortable',
    desc:  'I can use it naturally',
    activeClass: 'border-emerald-400 bg-emerald-50',
    labelClass:  'text-emerald-700',
    checkClass:  'text-emerald-500',
  },
] as const

// ── Overlay ───────────────────────────────────────────────────────────────────
//
// MUST be defined at module level, NOT inside QuickAddModal.
//
// If a component is defined inside a parent function, JavaScript creates a new
// function reference on every render.  React uses reference equality to decide
// whether the component type has changed.  A new reference = React unmounts the
// old subtree and mounts a fresh one — destroying the <input> DOM node, losing
// focus, and forcing the user to click back into the field after every keystroke.
// That is exactly the "1 character then nothing" bug.

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">
        {children}
      </div>
    </div>
  )
}

// ── QuickAddModal ─────────────────────────────────────────────────────────────

export function QuickAddModal({ onClose }: Props) {
  const navigate           = useNavigate()
  const addItem            = useVocabStore((s) => s.addItem)
  const enrichItem         = useVocabStore((s) => s.enrichItem)
  const setConfidenceLevel = useVocabStore((s) => s.setConfidenceLevel)
  const moveToLearning     = useVocabStore((s) => s.moveToLearning)
  const setFocusThisWeek   = useVocabStore((s) => s.setFocusThisWeek)
  const items              = useVocabStore((s) => s.items)
  const assignThemes       = useVocabStore((s) => s.assignThemes)
  const { themes, addTheme } = useThemesStore()
  const termRef     = useRef<HTMLInputElement>(null)
  const newThemeRef = useRef<HTMLInputElement>(null)

  // ── Phase 1 state ─────────────────────────────────────────────────────────
  const [phase, setPhase]                   = useState<Phase>('add')
  const [term, setTerm]                     = useState('')
  const [debouncedTerm, setDebouncedTerm]   = useState('')
  const [saving, setSaving]                 = useState(false)
  const [savedCount, setSavedCount]         = useState(0)
  const [error, setError]                   = useState<string | null>(null)
  /**
   * Separate from `error`:  infrastructure failures (storage full, network down)
   * that have nothing to do with the value the user typed.
   * These must NOT trigger the red input border — the input is valid.
   */
  const [systemError, setSystemError]       = useState<string | null>(null)

  // ── Phase 2 / 3 state ────────────────────────────────────────────────────
  const [savedWordId, setSavedWordId]   = useState<string | null>(null)
  const [savedTerm, setSavedTerm]       = useState('')
  const [confidence, setConfidence]     = useState<ConfidenceLevel>(1)

  // ── Phase 3 (assign) state ────────────────────────────────────────────────
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set())
  const [newThemeName, setNewThemeName]     = useState('')
  const [assigning, setAssigning]           = useState(false)

  // ── Phase 4 (saved) state ─────────────────────────────────────────────────
  const [addedToFocus, setAddedToFocus]     = useState(false)

  // Reactive saved item — drives enriching → review transition
  const savedItem = useVocabStore(
    useCallback(
      (s) => (savedWordId ? s.items.find((i) => i.id === savedWordId) : undefined),
      [savedWordId],
    ),
  )

  // Focus term input on mount and when returning to add phase
  useEffect(() => { termRef.current?.focus() }, [])
  useEffect(() => {
    if (phase === 'add') setTimeout(() => termRef.current?.focus(), 60)
  }, [phase])

  // Debounce term → duplicate / suggestion detection
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [term])

  // Transition enriching → review when generationStatus resolves
  useEffect(() => {
    if (phase !== 'enriching') return
    const status = savedItem?.generationStatus
    if (status === 'complete' || status === 'failed') {
      setPhase('review')
    }
  }, [phase, savedItem?.generationStatus])

  // ── Derived: duplicate / suggestion state ─────────────────────────────────

  const exactDuplicate = useMemo<VocabItem | null>(
    () => (debouncedTerm.trim() ? findExactDuplicate(items, debouncedTerm) : null),
    [items, debouncedTerm],
  )

  /** "Did you mean…" — character-level typo corrections (min 4 chars to avoid noise) */
  const spellSuggestions = useMemo<VocabItem[]>(
    () =>
      debouncedTerm.trim().length >= 4 && !exactDuplicate
        ? fuzzySpellingSuggestions(items, debouncedTerm)
        : [],
    [items, debouncedTerm, exactDuplicate],
  )

  /**
   * "Similar entries" — structural near-duplicates via Dice coefficient.
   * Only runs when spell suggestions found nothing — avoids a full Dice scan
   * (O(n) bigram map per item) on top of an already-expensive Levenshtein pass.
   */
  const nearDuplicates = useMemo<VocabItem[]>(() => {
    if (!debouncedTerm.trim() || exactDuplicate || spellSuggestions.length > 0) return []
    return findNearDuplicates(items, debouncedTerm, 0.62, 3)
  }, [items, debouncedTerm, exactDuplicate, spellSuggestions])

  /** Auto-detect type (word / phrase / phrasal-verb) — not shown in UI */
  const detectedType = useMemo<ItemType>(() => {
    const lower = term.toLowerCase().trim()
    const words = lower.split(/\s+/)
    if (words.length >= 2) {
      return PV_PARTICLES.has(words[words.length - 1]) ? 'phrasal-verb' : 'phrase'
    }
    return 'word'
  }, [term])

  const suggestedThemeNames = useMemo(
    () => suggestThemes(savedTerm, themes),
    [savedTerm, themes],
  )

  // ── Helpers ───────────────────────────────────────────────────────────────

  function openExisting(id: string) {
    navigate(`/item/${id}`)
    onClose()
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  /**
   * andNext = true  → batch mode: save, reset form, stay on Phase 1
   * andNext = false → single mode: save, advance to Phase 2 (enriching)
   */
  async function save(andNext: boolean) {
    const t = term.trim()
    if (!t) return

    // Real-time check (debouncedTerm may lag)
    const dup = findExactDuplicate(items, t)
    if (dup) {
      setError(`"${t}" is already in your vocabulary.`)
      return
    }

    setSaving(true)
    setError(null)
    setSystemError(null)

    let newId: string | null = null
    try {
      newId = await addItem({ term: t, type: detectedType })
    } catch (err: unknown) {
      setSaving(false)

      // ── Distinguish infrastructure errors from validation errors ─────────────
      // QuotaExceededError is thrown by the browser when IndexedDB storage is
      // full (common in private/incognito windows).  It has nothing to do with
      // the input value, so it must NOT trigger the red input border.
      // Dexie may expose the name on err.name OR as the err.message string.
      const errName = (err as { name?: string }).name ?? ''
      const errMsg  = err instanceof Error ? err.message : String(err)
      const isQuota =
        errName === 'QuotaExceededError' ||
        errMsg   === 'QuotaExceededError' ||
        errMsg.toLowerCase().includes('quota exceeded')

      if (isQuota) {
        setSystemError(
          'Your browser storage is full — the word could not be saved. ' +
          'Try using a non-private (non-incognito) window, or clear some browsing data.'
        )
      } else {
        setError(errMsg || 'Could not save — please try again.')
      }
      return
    }

    setSaving(false)

    if (andNext) {
      // Batch: stay on Phase 1
      setTerm('')
      setSavedCount((c) => c + 1)
      setError(null)
    } else {
      // Single: advance to enriching
      setSavedWordId(newId)
      setSavedTerm(t)
      setConfidence(1) // default familiarity = New
      setPhase('enriching')
    }
  }

  const canSave = term.trim().length > 0 && !saving && !exactDuplicate

  // ── Phase 2 actions ───────────────────────────────────────────────────────

  /** Confirm confidence level, then advance to assign phase */
  function handleDone() {
    if (savedWordId && confidence > 0) {
      setConfidenceLevel(savedWordId, confidence).catch(() => {})
    }
    // Promote inbox → learning when the user signals comfort (≥ 2).
    // Familiarity 1 ("New to me") intentionally keeps inbox status.
    if (savedWordId && confidence >= 2) {
      moveToLearning([savedWordId]).catch(() => {})
    }
    setSelectedThemes(new Set())
    setPhase('assign')
  }

  /** Return to add phase from the final "saved" phase */
  function handleAddAnotherFromSaved() {
    setSavedWordId(null)
    setSavedTerm('')
    setTerm('')
    setError(null)
    setAddedToFocus(false)
    setPhase('add')
  }

  /** Confirm confidence level, then return to add phase for another word */
  function handleAddAnother() {
    if (savedWordId && confidence > 0) {
      setConfidenceLevel(savedWordId, confidence).catch(() => {})
    }
    setSavedCount((c) => c + 1)
    setSavedWordId(null)
    setTerm('')
    setError(null)
    setPhase('add')
  }

  /** Re-trigger AI enrichment after a failure */
  async function handleRetryEnrich() {
    if (!savedWordId) return
    setPhase('enriching')
    await enrichItem(savedWordId)
  }

  // ── Phase 3 actions ───────────────────────────────────────────────────────

  function toggleTheme(t: string) {
    setSelectedThemes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function handleCreateTheme() {
    const name = newThemeName.trim()
    if (!name) return
    addTheme(name)
    setSelectedThemes((prev) => new Set([...prev, name]))
    setNewThemeName('')
    newThemeRef.current?.focus()
  }

  const handleAssignAndClose = useCallback(async () => {
    if (!savedWordId || selectedThemes.size === 0) {
      setSavedCount((c) => c + 1)
      setAddedToFocus(false)
      setPhase('saved')
      return
    }
    setAssigning(true)
    try {
      await assignThemes(savedWordId, Array.from(selectedThemes))
    } catch { /* word already saved — fail silently */ }
    setAssigning(false)
    setSavedCount((c) => c + 1)
    setAddedToFocus(false)
    setPhase('saved')
  }, [savedWordId, selectedThemes, assignThemes])

  // ── Render: Phase 1 — Add ─────────────────────────────────────────────────

  if (phase === 'add') {
    return (
      <Overlay>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add word</h2>
            {savedCount > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {savedCount} word{savedCount !== 1 ? 's' : ''} added this session
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2 space-y-3 overflow-y-auto flex-1">

          {/* Term input */}
          <input
            ref={termRef}
            type="text"
            value={term}
            onChange={(e) => { setTerm(e.target.value); if (error) setError(null); if (systemError) setSystemError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) void save(false) }}
            placeholder="word or phrase…"
            autoComplete="off"
            spellCheck={false}
            className={`w-full px-4 py-4 text-lg font-medium border-2 rounded-2xl focus:outline-none placeholder:text-slate-300 transition-colors ${
              exactDuplicate || error
                ? 'border-red-400 focus:border-red-500'
                : nearDuplicates.length > 0
                ? 'border-amber-400 focus:border-amber-500'
                : spellSuggestions.length > 0
                ? 'border-sky-400 focus:border-sky-500'
                : 'border-slate-200 focus:border-brand-500'
            }`}
          />

          {/* "Did you mean…" — fuzzy spell suggestions (Levenshtein ≤ 2).
              These are always EXISTING library items — clicking opens the word
              directly so the user sees its enriched data immediately, without
              needing to press Add → only to get a duplicate error. */}
          {spellSuggestions.length > 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-sky-700 mb-1.5">Did you mean…</p>
              <div className="space-y-1">
                {spellSuggestions.slice(0, 3).map((sug) => (
                  <button
                    key={sug.id}
                    onClick={() => openExisting(sug.id)}
                    className="w-full flex items-center justify-between gap-2 bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 hover:border-sky-400 hover:bg-sky-50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 truncate">{sug.term}</span>
                      {sug.definitionEn && (
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                          {sug.definitionEn.slice(0, 45)}…
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-sky-600 group-hover:text-sky-700 shrink-0 flex items-center gap-0.5">
                      View <ArrowRight size={10} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exact duplicate */}
          {exactDuplicate && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-700">Already in your vocabulary</p>
                {exactDuplicate.definitionEn && (
                  <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{exactDuplicate.definitionEn}</p>
                )}
              </div>
              <button
                onClick={() => openExisting(exactDuplicate.id)}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
              >
                Open <ArrowRight size={11} />
              </button>
            </div>
          )}

          {/* Similar entries — structural near-duplicates */}
          {nearDuplicates.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-800">Similar entries found</p>
              </div>
              <div className="space-y-1">
                {nearDuplicates.slice(0, 3).map((dup) => (
                  <button
                    key={dup.id}
                    onClick={() => openExisting(dup.id)}
                    className="w-full flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 hover:border-amber-400 hover:bg-amber-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 truncate">{dup.term}</span>
                      <span className="text-[10px] text-slate-400 capitalize shrink-0">{dup.status}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-600 group-hover:text-amber-700 shrink-0 flex items-center gap-0.5">
                      View <ArrowRight size={10} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-amber-600 mt-2">You can still save if this is a different word.</p>
            </div>
          )}

          {/* Generic validation error (red, affects border) */}
          {error && !exactDuplicate && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium px-1">
              <AlertCircle size={12} className="shrink-0" />
              {error}
            </p>
          )}

          {/* System / storage error — amber banner, does NOT affect input border.
              The input value is valid; this is an infrastructure failure. */}
          {systemError && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800">Couldn't save</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{systemError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Helper text */}
        <p className="px-5 pt-2 pb-2 text-xs text-slate-400">
          AI generates definition, synonyms, examples and more automatically.
        </p>

        {/* Actions */}
        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => void save(true)}
            disabled={!canSave}
            className="py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            Add + another
          </button>
          <button
            onClick={() => void save(false)}
            disabled={!canSave}
            className="py-3.5 text-sm font-semibold text-white bg-brand-600 rounded-2xl hover:bg-brand-700 disabled:opacity-40 transition-colors shadow-sm shadow-brand-200"
          >
            {saving ? 'Saving…' : 'Add →'}
          </button>
        </div>
      </Overlay>
    )
  }

  // ── Render: Phase 2a — Enriching ──────────────────────────────────────────

  if (phase === 'enriching') {
    return (
      <Overlay>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="text-brand-500 animate-spin shrink-0" />
            <h2 className="text-base font-bold text-slate-900 truncate">"{savedTerm}"</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 px-5 pb-8 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Sparkles size={24} className="text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Getting definition, examples and more…</p>
            <p className="text-xs text-slate-400 mt-1">This takes a few seconds</p>
          </div>
        </div>
      </Overlay>
    )
  }

  // ── Render: Phase 2b — Review ─────────────────────────────────────────────

  if (phase === 'review') {
    const genFailed = savedItem?.generationStatus === 'failed'

    return (
      <Overlay>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {genFailed
              ? <AlertCircle size={15} className="text-amber-500 shrink-0" />
              : <Check size={15} className="text-emerald-500 shrink-0" />
            }
            <h2 className="text-base font-bold text-slate-900 truncate">"{savedTerm}"</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 space-y-4">

          {genFailed ? (
            /* ── Enrichment failed ── */
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-amber-800">Enrichment didn't complete</p>
              <p className="text-xs text-amber-700">
                The word was saved, but we couldn't generate its definition automatically.
              </p>
              <button
                onClick={() => void handleRetryEnrich()}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-white border border-amber-300 rounded-lg px-3 py-1.5 transition-colors"
              >
                <RefreshCw size={12} />
                Try again
              </button>
            </div>
          ) : (
            /* ── Enrichment succeeded: show content ── */
            <div className="space-y-3">

              {/* Part of speech + register */}
              {(savedItem?.partOfSpeech || savedItem?.register) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {savedItem?.partOfSpeech && (
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {savedItem.partOfSpeech}
                    </span>
                  )}
                  {savedItem?.register && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      savedItem.register === 'formal'        ? 'bg-blue-50 text-blue-700'
                      : savedItem.register === 'conversational' ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {savedItem.register}
                    </span>
                  )}
                </div>
              )}

              {/* Definition */}
              {(savedItem?.shortDefinition || savedItem?.definitionEn) && (
                <p className="text-sm text-slate-800 leading-snug">
                  {savedItem?.shortDefinition ?? savedItem?.definitionEn}
                </p>
              )}

              {/* Usage Profile */}
              {savedItem?.usageProfile && (
                <UsageProfileCard profile={savedItem.usageProfile} />
              )}

              {/* Example sentence */}
              {savedItem?.exampleSentence && (
                <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2.5 leading-relaxed">
                  "{savedItem.exampleSentence}"
                </p>
              )}

              {/* Collocations */}
              {savedItem?.collocations && savedItem.collocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedItem.collocations.slice(0, 5).map((c) => (
                    <span key={c} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Real-life task */}
              {savedItem?.realLifeTask && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BookOpen size={11} className="text-brand-500" />
                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Try in real life</p>
                  </div>
                  <p className="text-xs text-brand-700">{savedItem.realLifeTask}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Familiarity selector ── */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">How familiar is this word?</p>
            <div className="space-y-2">
              {FAMILIARITY_OPTIONS.map(({ level, label, desc, activeClass, labelClass, checkClass }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidence(level)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    confidence === level ? activeClass : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <ConfidenceDots value={level} compact />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${confidence === level ? labelClass : 'text-slate-700'}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                  {confidence === level && (
                    <Check size={14} className={`ml-auto shrink-0 ${checkClass}`} />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
              Familiarity is your self-assessment. The level badge grows through challenges.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2.5 border-t border-slate-100">
          <button
            onClick={handleAddAnother}
            className="py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Add another
          </button>
          <button
            onClick={handleDone}
            className="py-3.5 text-sm font-bold text-white bg-brand-600 rounded-2xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
          >
            Done →
          </button>
        </div>
      </Overlay>
    )
  }

  // ── Render: Phase 4 — Saved (next actions) ───────────────────────────────

  if (phase === 'saved') {
    const familiarityOpt = FAMILIARITY_OPTIONS.find((o) => o.level === confidence)

    return (
      <Overlay>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Check size={14} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">"{savedTerm}" saved</h2>
              {savedCount > 1 && (
                <p className="text-xs text-slate-400">{savedCount} words this session</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2 overflow-y-auto flex-1 space-y-2">

          {/* Familiarity echo */}
          {familiarityOpt && (
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 ${familiarityOpt.activeClass}`}>
              <ConfidenceDots value={confidence} compact />
              <p className={`text-xs font-semibold ${familiarityOpt.labelClass}`}>{familiarityOpt.label}</p>
            </div>
          )}

          {/* Next-action list */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => { navigate(`/item/${savedWordId}`); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
            >
              <span>View word</span>
              <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => {
                if (!addedToFocus && savedWordId) {
                  void setFocusThisWeek(savedWordId, true)
                  setAddedToFocus(true)
                }
              }}
              disabled={addedToFocus}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors group ${
                addedToFocus
                  ? 'bg-orange-50 border-orange-200 text-orange-700 cursor-default'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700'
              }`}
            >
              <span>{addedToFocus ? 'Added to My Current Focus' : 'Add to My Current Focus'}</span>
              {addedToFocus
                ? <Check size={15} className="text-orange-500 shrink-0" />
                : <Star size={15} className="text-slate-400 group-hover:text-orange-400 transition-colors shrink-0" />
              }
            </button>

            <button
              onClick={() => { navigate('/challenge'); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors group"
            >
              <span>Start Challenge</span>
              <Zap size={15} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100">
          <button
            onClick={handleAddAnotherFromSaved}
            className="py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Add another
          </button>
          <button
            onClick={onClose}
            className="py-3.5 text-sm font-bold text-white bg-brand-600 rounded-2xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
          >
            Done
          </button>
        </div>
      </Overlay>
    )
  }

  // ── Render: Phase 3 — Assign theme ────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <Check size={11} />
              <span>"{savedTerm}" saved</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Where should this go?</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign to a theme for faster learning</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 space-y-4">

          {/* Suggested themes */}
          {suggestedThemeNames.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-violet-500" />
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedThemeNames.map((t) => {
                  const active = selectedThemes.has(t)
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTheme(t)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        active
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400'
                      }`}
                    >
                      {active && <Check size={13} />}
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* All themes */}
          {themes.length > 0 && (
            <div>
              {suggestedThemeNames.length > 0 && (
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">All themes</p>
              )}
              <div className="flex flex-wrap gap-2">
                {themes
                  .filter((t) => !suggestedThemeNames.includes(t))
                  .map((t) => {
                    const active = selectedThemes.has(t)
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTheme(t)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          active
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                      >
                        {active && <Check size={13} />}
                        {t}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          {/* No themes yet */}
          {themes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">
              No themes yet — create your first one below.
            </p>
          )}

          {/* Create new theme inline */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">New theme</p>
            <div className="flex gap-2">
              <input
                ref={newThemeRef}
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTheme()}
                placeholder="Theme name…"
                className="flex-1 text-sm px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300"
              />
              <button
                onClick={handleCreateTheme}
                disabled={!newThemeName.trim()}
                className="px-3 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm disabled:opacity-30 hover:bg-slate-900 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Go to library */}
          <button
            onClick={() => { onClose(); navigate('/library') }}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
          >
            <span>Assign more words in Vocabulary</span>
            <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2.5 border-t border-slate-100">
          <button
            onClick={() => { setSavedCount((c) => c + 1); setAddedToFocus(false); setPhase('saved') }}
            className="py-3.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => void handleAssignAndClose()}
            disabled={assigning}
            className={`py-3.5 text-sm font-bold rounded-2xl transition-colors shadow-sm ${
              selectedThemes.size > 0
                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-200'
                : 'bg-slate-200 text-slate-500 cursor-default'
            }`}
          >
            {assigning
              ? 'Saving…'
              : selectedThemes.size > 0
              ? `Assign (${selectedThemes.size})`
              : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
