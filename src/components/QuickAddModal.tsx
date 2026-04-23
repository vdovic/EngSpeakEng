import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, FileText, Mic, Film, Users, Mail, BookOpen, MoreHorizontal, AlertCircle } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { ItemType, SourceType } from '@/types/vocabulary'

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

export function QuickAddModal({ onClose }: Props) {
  const addItem = useVocabStore((s) => s.addItem)
  // Used for pre-flight duplicate detection against in-memory items
  const items = useVocabStore((s) => s.items)
  const termRef = useRef<HTMLInputElement>(null)

  const [term, setTerm] = useState('')
  const [type, setType] = useState<ItemType>('word')
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [definition, setDefinition] = useState('')
  const [showDef, setShowDef] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    termRef.current?.focus()
  }, [])

  async function save(andNext: boolean) {
    const t = term.trim()
    if (!t) return

    // Pre-flight duplicate check: compare case-insensitively against current items.
    // This catches duplicates instantly without a DB round-trip and gives a clear
    // message before Dexie's ConstraintError can fire.
    const duplicate = items.find((i) => i.term.toLowerCase() === t.toLowerCase())
    if (duplicate) {
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
      // addItem re-throws ConstraintError as a readable Error; catch any other DB
      // error here too so the button is never left frozen in "Saving…" state.
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

  const canSave = term.trim().length > 0 && !saving

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
                // Clear error as soon as the user starts editing
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) save(false)
              }}
              placeholder={ITEM_TYPES.find((t) => t.value === type)?.hint}
              className={`w-full px-4 py-3 text-base border-2 rounded-xl focus:outline-none placeholder:text-slate-300 transition-colors ${
                error
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 focus:border-brand-500'
              }`}
            />
            {/* Inline error message */}
            {error && (
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

          {/* Context sentence — shown only when a source is selected */}
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
