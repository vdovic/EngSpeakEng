import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  ChevronDown,
  FileText,
  Mic,
  Film,
  Users,
  Mail,
  BookOpen,
  MoreHorizontal,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { ItemType, SourceType, VocabItem } from '@/types/vocabulary'
import { findExactDuplicate, findNearDuplicates } from '@/utils/vocabSearch'

interface Props {
  onClose: () => void
}

const ITEM_TYPES: { value: ItemType; label: string; hint: string }[] = [
  { value: 'word',   label: 'Word',   hint: 'e.g. cumbersome' },
  { value: 'phrase', label: 'Phrase', hint: 'e.g. raise a concern' },
  { value: 'chunk',  label: 'Chunk',  hint: "e.g. What I'm trying to get at is…" },
]

const SOURCE_TYPES: { value: SourceType; label: string; icon: React.ElementType }[] = [
  { value: 'meeting',  label: 'Meeting',  icon: Users },
  { value: 'article',  label: 'Article',  icon: FileText },
  { value: 'email',    label: 'Email',    icon: Mail },
  { value: 'book',     label: 'Book',     icon: BookOpen },
  { value: 'podcast',  label: 'Podcast',  icon: Mic },
  { value: 'movie',    label: 'Movie',    icon: Film },
  { value: 'other',    label: 'Other',    icon: MoreHorizontal },
]

const DEBOUNCE_MS = 280

export function QuickAddModal({ onClose }: Props) {
  const navigate = useNavigate()
  const addItem  = useVocabStore((s) => s.addItem)
  const items    = useVocabStore((s) => s.items)
  const termRef  = useRef<HTMLInputElement>(null)

  const [term, setTerm]             = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [type, setType]             = useState<ItemType>('word')
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [definition, setDefinition] = useState('')
  const [showDef, setShowDef]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => { termRef.current?.focus() }, [])

  // Debounce the term for duplicate checks (avoid running on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [term])

  // Exact duplicate — blocks save and shows a link
  const exactDuplicate = useMemo<VocabItem | null>(
    () => (debouncedTerm.trim() ? findExactDuplicate(items, debouncedTerm) : null),
    [items, debouncedTerm],
  )

  // Near duplicates — shown as a non-blocking amber warning while typing
  const nearDuplicates = useMemo<VocabItem[]>(
    () =>
      debouncedTerm.trim() && !exactDuplicate
        ? findNearDuplicates(items, debouncedTerm)
        : [],
    [items, debouncedTerm, exactDuplicate],
  )

  function openExisting(id: string) {
    navigate(`/item/${id}`)
    onClose()
  }

  async function save(andNext: boolean) {
    const t = term.trim()
    if (!t) return

    // Guard: exact duplicate (real-time check, not the debounced one, for safety)
    const realTimeExact = findExactDuplicate(items, t)
    if (realTimeExact) {
      setError(`"${t}" is already in your vocabulary.`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await addItem({
        term: t,
        type,
        sourceType: sourceType ?? undefined,
        sourceText: sourceText.trim() || undefined,
        definitionEn: definition.trim() || undefined,
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Could not save. Please try again.'
      setError(message)
      setSaving(false)
      return
    }

    setSaving(false)

    if (andNext) {
      setTerm('')
      setDefinition('')
      setError(null)
      setSavedCount((c) => c + 1)
      setTimeout(() => termRef.current?.focus(), 50)
    } else {
      onClose()
    }
  }

  const canSave = term.trim().length > 0 && !saving && !exactDuplicate

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[90dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Quick add</h2>
            {savedCount > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {savedCount} saved this session
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

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">

          {/* Type selector */}
          <div className="flex gap-2">
            {ITEM_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors ${
                  type === t.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Term input */}
          <div className="space-y-1.5">
            <input
              ref={termRef}
              type="text"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) save(false)
              }}
              placeholder={ITEM_TYPES.find((t) => t.value === type)?.hint}
              className={`w-full px-4 py-3 text-base border-2 rounded-xl focus:outline-none placeholder:text-slate-300 transition-colors ${
                exactDuplicate || error
                  ? 'border-red-400 focus:border-red-500'
                  : nearDuplicates.length > 0
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-slate-200 focus:border-brand-500'
              }`}
            />

            {/* ── Exact duplicate banner ──────────────────────────────────── */}
            {exactDuplicate && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700">
                    Already in your vocabulary
                  </p>
                  {exactDuplicate.definitionEn && (
                    <p className="text-xs text-red-500 mt-0.5 line-clamp-1">
                      {exactDuplicate.definitionEn}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openExisting(exactDuplicate.id)}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
                >
                  Open entry
                  <ArrowRight size={11} />
                </button>
              </div>
            )}

            {/* ── Near-duplicate warning ──────────────────────────────────── */}
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
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {dup.term}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize shrink-0">
                          {dup.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-600 group-hover:text-amber-700 shrink-0 flex items-center gap-0.5">
                        View <ArrowRight size={10} />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-600 mt-2">
                  You can still save if this is a different word.
                </p>
              </div>
            )}

            {/* Generic error (e.g. DB failure) */}
            {error && !exactDuplicate && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium px-1">
                <AlertCircle size={12} className="shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Optional definition */}
          <div>
            <button
              onClick={() => setShowDef(!showDef)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${showDef ? 'rotate-180' : ''}`}
              />
              {showDef ? 'Hide definition' : 'Add definition (optional)'}
            </button>
            {showDef && (
              <textarea
                rows={2}
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Quick English definition…"
                className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-300 resize-none"
              />
            )}
          </div>

          {/* Source type — icon pills */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Source</p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {SOURCE_TYPES.map(({ value, label, icon: Icon }) => {
                const active = sourceType === value
                return (
                  <button
                    key={value}
                    onClick={() => setSourceType(active ? null : value)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Context sentence */}
          {sourceType && (
            <input
              type="text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Context sentence where you found it…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-300"
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => save(true)}
            disabled={!canSave}
            className="py-3 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 disabled:opacity-40 transition-colors"
          >
            Save + add another
          </button>
          <button
            onClick={() => save(false)}
            disabled={!canSave}
            className="py-3 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save to Inbox'}
          </button>
        </div>
      </div>
    </div>
  )
}
