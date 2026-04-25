/**
 * QuickAddModal — redesigned 2-step add flow
 *
 * Step 1 (add):   minimal term input → [Add + another] [Add]
 * Step 2 (assign): "Where should this go?" — theme cards + new theme inline
 *
 * Removed from UI (kept in data model):
 *   - Word / Phrase / Chunk type selector  (type saved as 'word' by default; AI enriches it)
 *   - Source type icons (Meeting, Article, …)
 *   - Context sentence input
 *   - "Add definition" field
 *
 * Theme suggestion: lightweight keyword heuristic, 0–2 suggestions per word.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, AlertCircle, AlertTriangle, ArrowRight,
  Check, Plus, Sparkles, ChevronRight,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabItem } from '@/types/vocabulary'
import { findExactDuplicate, findNearDuplicates } from '@/utils/vocabSearch'

// ── Heuristic theme suggester ─────────────────────────────────────────────────

/**
 * Common particles used in English phrasal verbs.
 * If a multi-word term ends with one of these, it's likely a phrasal verb.
 */
const PHRASAL_PARTICLES = new Set([
  'up', 'down', 'out', 'off', 'on', 'away', 'back',
  'over', 'through', 'into', 'around', 'along', 'apart', 'aside', 'in',
])

/**
 * Per-theme keyword lists — order matters (first match wins within a theme).
 * Kept intentionally short: false positives > missed suggestions.
 */
const THEME_HINTS: Array<[string, string[]]> = [
  ['Phrasal Verbs',            []],  // handled separately by particle detection
  ['Idioms & Expressions',     ['bite the', 'on the fence', 'kick the', 'break a leg', 'hit the nail', 'under the weather', 'cost an arm', 'spill the beans', 'burn bridges']],
  ['Business & Professional',  ['leverage', 'synergy', 'stakeholder', 'bandwidth', 'pipeline', 'deadline', 'initiative', 'milestone', 'roadmap', 'deliverable', 'align', 'scale', 'pivot', 'corporate', 'KPI', 'ROI', 'headcount', 'capacity']],
  ['Meetings & Presentations', ['agenda', 'standup', 'retrospective', 'action item', 'follow-up', 'facilitate', 'chair', 'minutes', 'deck', 'slide', 'brief', 'pitch']],
  ['Written Communication',    ['pursuant', 'herewith', 'sincerely', 'attached please', 'as per', 'I am writing', 'kind regards', 'please find']],
  ['Leadership & Management',  ['delegate', 'appraisal', 'performance review', 'empower', 'accountability', 'mentor', 'coach', 'headcount', 'direct report']],
  ['Transitions & Connectors', ['however', 'furthermore', 'therefore', 'consequently', 'nevertheless', 'moreover', 'notwithstanding', 'whereas', 'despite', 'in contrast', 'as a result', 'in addition']],
  ['Formal & Academic',        ['pursuant to', 'hereby', 'aforementioned', 'therein', 'whereby', 'henceforth', 'inasmuch', 'ex parte', 'prima facie']],
  ['Everyday Conversation',    ['catch up', 'small talk', 'break the ice', 'how are you', 'long time no see', 'what\'s up', 'hang out']],
  ['Negotiations & Persuasion',['negotiate', 'concession', 'counter-offer', 'common ground', 'win-win', 'leverage', 'trade-off', 'bottom line', 'walk away']],
  ['Problem-solving & Analysis',['root cause', 'hypothesis', 'framework', 'drill down', 'deep dive', 'trade-off', 'iterate', 'troubleshoot', 'diagnose']],
  ['Collocations & Chunks',    ['make a point', 'take a look', 'have a go', 'pay attention', 'keep in mind', 'as a matter of', 'for the time being']],
]

function suggestThemes(term: string, available: string[]): string[] {
  if (!term.trim()) return []
  const lower = term.toLowerCase().trim()
  const words  = lower.split(/\s+/)
  const result: string[] = []

  // Rule 1: phrasal verb — 2+ words, last word is a particle
  if (
    words.length >= 2 &&
    PHRASAL_PARTICLES.has(words[words.length - 1]) &&
    available.includes('Phrasal Verbs')
  ) {
    result.push('Phrasal Verbs')
  }

  // Rule 2: keyword matching per theme
  for (const [theme, keywords] of THEME_HINTS) {
    if (!available.includes(theme)) continue
    if (result.includes(theme)) continue
    if (keywords.length > 0 && keywords.some((kw) => lower.includes(kw))) {
      result.push(theme)
    }
    if (result.length >= 2) break
  }

  return result
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'add' | 'assign'

interface Props {
  onClose: () => void
}

const DEBOUNCE_MS = 280

// ── QuickAddModal ─────────────────────────────────────────────────────────────

export function QuickAddModal({ onClose }: Props) {
  const navigate  = useNavigate()
  const addItem   = useVocabStore((s) => s.addItem)
  const items     = useVocabStore((s) => s.items)
  const assignThemes = useVocabStore((s) => s.assignThemes)
  const { themes, addTheme } = useThemesStore()
  const termRef   = useRef<HTMLInputElement>(null)
  const newThemeRef = useRef<HTMLInputElement>(null)

  // ── Step 1: Add ────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<Phase>('add')
  const [term, setTerm]             = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [saving, setSaving]         = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError]           = useState<string | null>(null)

  // ── Step 2: Assign ────────────────────────────────────────────────────────
  const [savedWordId, setSavedWordId]   = useState<string | null>(null)
  const [savedTerm, setSavedTerm]       = useState('')
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set())
  const [newThemeName, setNewThemeName] = useState('')
  const [assigning, setAssigning]       = useState(false)

  // Focus on mount
  useEffect(() => { termRef.current?.focus() }, [])

  // Focus term input when returning to 'add' phase
  useEffect(() => {
    if (phase === 'add') setTimeout(() => termRef.current?.focus(), 60)
    if (phase === 'assign') setTimeout(() => {}, 60) // let animation settle
  }, [phase])

  // Debounce for duplicate detection
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [term])

  const exactDuplicate = useMemo<VocabItem | null>(
    () => (debouncedTerm.trim() ? findExactDuplicate(items, debouncedTerm) : null),
    [items, debouncedTerm],
  )

  const nearDuplicates = useMemo<VocabItem[]>(
    () =>
      debouncedTerm.trim() && !exactDuplicate
        ? findNearDuplicates(items, debouncedTerm)
        : [],
    [items, debouncedTerm, exactDuplicate],
  )

  const suggestedThemeNames = useMemo(
    () => suggestThemes(savedTerm, themes),
    [savedTerm, themes],
  )

  function openExisting(id: string) {
    navigate(`/item/${id}`)
    onClose()
  }

  // ── Save word ────────────────────────────────────────────────────────────────

  /**
   * andNext = true  → "Add + another": save, reset, stay on Step 1 (no theme step)
   * andNext = false → "Add":           save, advance to Step 2
   */
  async function save(andNext: boolean) {
    const t = term.trim()
    if (!t) return

    const realTimeExact = findExactDuplicate(items, t)
    if (realTimeExact) {
      setError(`"${t}" is already in your vocabulary.`)
      return
    }

    setSaving(true)
    setError(null)

    let newId: string | null = null
    try {
      newId = await addItem({ term: t, type: 'word' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save — please try again.')
      setSaving(false)
      return
    }

    setSaving(false)

    if (andNext) {
      // Batch mode: stay on Step 1
      setTerm('')
      setSavedCount((c) => c + 1)
      setError(null)
    } else {
      // Single mode: advance to Step 2
      setSavedWordId(newId)
      setSavedTerm(t)
      setSelectedThemes(new Set())
      setPhase('assign')
    }
  }

  const canSave = term.trim().length > 0 && !saving && !exactDuplicate

  // ── Theme toggle ──────────────────────────────────────────────────────────────

  function toggleTheme(t: string) {
    setSelectedThemes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  // ── Create new theme inline ───────────────────────────────────────────────────

  function handleCreateTheme() {
    const name = newThemeName.trim()
    if (!name) return
    addTheme(name)
    setSelectedThemes((prev) => new Set([...prev, name]))
    setNewThemeName('')
    newThemeRef.current?.focus()
  }

  // ── Assign & close ────────────────────────────────────────────────────────────

  const handleAssignAndClose = useCallback(async () => {
    if (!savedWordId || selectedThemes.size === 0) {
      onClose()
      return
    }
    setAssigning(true)
    try {
      await assignThemes(savedWordId, Array.from(selectedThemes))
    } catch {
      // fail silently — word is already saved
    }
    setAssigning(false)
    onClose()
  }, [savedWordId, selectedThemes, assignThemes, onClose])

  function handleSkip() {
    onClose()
  }

  function handleGoToVocab() {
    onClose()
    navigate('/library')
  }

  // ── Render: Step 1 — Add ──────────────────────────────────────────────────────

  if (phase === 'add') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
        <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Add to Inbox</h2>
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

          {/* Term input */}
          <div className="px-5 pb-2 space-y-2.5">
            <input
              ref={termRef}
              type="text"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) void save(false)
              }}
              placeholder="word or phrase…"
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-4 py-4 text-lg font-medium border-2 rounded-2xl focus:outline-none placeholder:text-slate-300 transition-colors ${
                exactDuplicate || error
                  ? 'border-red-400 focus:border-red-500'
                  : nearDuplicates.length > 0
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-slate-200 focus:border-brand-500'
              }`}
            />

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

            {/* Near duplicates */}
            {nearDuplicates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <p className="text-xs font-semibold text-amber-800">Similar entries found</p>
                </div>
                <div className="space-y-1">
                  {nearDuplicates.map((dup) => (
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

            {/* Generic error */}
            {error && !exactDuplicate && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium px-1">
                <AlertCircle size={12} className="shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Helper text */}
          <p className="px-5 pb-3 text-xs text-slate-400">
            AI will auto-generate the definition. You can assign themes next.
          </p>

          {/* Actions */}
          <div className="px-5 pb-5 grid grid-cols-2 gap-2.5">
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
        </div>
      </div>
    )
  }

  // ── Render: Step 2 — Assign theme ─────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div>
            {/* Confirmation pill */}
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <Check size={11} />
              <span>"{savedTerm}" added to Inbox</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Where should this go?</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign to a theme for faster learning</p>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 space-y-4">

          {/* ── Suggested themes ── */}
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

          {/* ── All themes ── */}
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

          {/* ── No themes at all ── */}
          {themes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">
              No themes yet — create your first one below.
            </p>
          )}

          {/* ── Create new theme inline ── */}
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

          {/* ── Vocabulary link ── */}
          <button
            onClick={handleGoToVocab}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors group"
          >
            <span>Assign more words in Vocabulary</span>
            <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 grid grid-cols-2 gap-2.5 border-t border-slate-100">
          <button
            onClick={handleSkip}
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
