import { useState } from 'react'
import { X } from 'lucide-react'
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

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'article',  label: 'Article' },
  { value: 'podcast',  label: 'Podcast' },
  { value: 'movie',    label: 'Movie' },
  { value: 'meeting',  label: 'Meeting' },
  { value: 'email',    label: 'Email' },
  { value: 'book',     label: 'Book' },
  { value: 'other',    label: 'Other' },
]

export function QuickAddModal({ onClose }: Props) {
  const addItem = useVocabStore((s) => s.addItem)
  const [term, setTerm] = useState('')
  const [type, setType] = useState<ItemType>('word')
  const [sourceType, setSourceType] = useState<SourceType | ''>('')
  const [sourceText, setSourceText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!term.trim()) return
    setSaving(true)
    await addItem({
      term: term.trim(),
      type,
      sourceType: sourceType || undefined,
      sourceText: sourceText.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Quick add</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {ITEM_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  type === t.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Term input */}
          <div>
            <input
              autoFocus
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={ITEM_TYPES.find((t) => t.value === type)?.hint}
              className="w-full px-3 py-3 text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>

          {/* Source */}
          <div className="flex gap-2">
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="flex-none px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Source…</option>
              {SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Context sentence (optional)"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!term.trim() || saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save to Inbox'}
          </button>
        </div>
      </div>
    </div>
  )
}
