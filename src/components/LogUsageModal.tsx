import { useState } from 'react'
import { X, Mic, PenLine } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { UsageChannel } from '@/types/vocabulary'

interface Props {
  itemId: string
  term: string
  onClose: () => void
}

export function LogUsageModal({ itemId, term, onClose }: Props) {
  const logUsage = useVocabStore((s) => s.logUsage)
  const [channel, setChannel] = useState<UsageChannel>('speaking')
  const [note, setNote] = useState('')
  const [sentence, setSentence] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await logUsage(itemId, {
      usedAt: new Date().toISOString(),
      channel,
      note: note.trim() || undefined,
      sentence: sentence.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">I used it</h2>
            <p className="text-xs text-slate-500 mt-0.5">"{term}"</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">How did you use it?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setChannel('speaking')}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                  channel === 'speaking'
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Mic size={22} />
                <span className="text-sm font-medium">Speaking</span>
              </button>
              <button
                onClick={() => setChannel('writing')}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                  channel === 'writing'
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <PenLine size={22} />
                <span className="text-sm font-medium">Writing</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Where? (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. sprint planning, email to stakeholders"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">What did you say/write? (optional)</label>
            <textarea
              rows={2}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={`Sentence using "${term}"…`}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 resize-none"
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
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Logging…' : 'Log usage'}
          </button>
        </div>
      </div>
    </div>
  )
}
