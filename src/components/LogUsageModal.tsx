/**
 * LogUsageModal.tsx — Phase 6
 *
 * Modal for recording a real-life usage of a vocabulary item.
 *
 * Fields:
 *   • context  (required, default: 'conversation')  — 7 options
 *   • sentence (optional)
 *   • note     (optional)
 *   • confidence 1–5 stars (optional)
 *
 * Mobile-first: bottom-sheet on small screens, centred modal on wide.
 * Fast path: tap context tile → tap "Log use" — two taps, done.
 *
 * Backward compat: passes `context` field (Phase-6+), not the legacy `channel`.
 */

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { UsageContext } from '@/types/vocabulary'

// ── Context options ───────────────────────────────────────────────────────────

interface ContextOption {
  value: UsageContext
  label: string
  emoji: string
}

const CONTEXT_OPTIONS: ContextOption[] = [
  { value: 'conversation',     label: 'Conversation',      emoji: '💬' },
  { value: 'meeting',          label: 'Meeting',           emoji: '🗓️' },
  { value: 'work-email',       label: 'Work email',        emoji: '📧' },
  { value: 'writing-practice', label: 'Writing practice',  emoji: '✍️' },
  { value: 'note',             label: 'Note / journal',    emoji: '📝' },
  { value: 'reading-listening',label: 'Heard / read it',   emoji: '🎧' },
  { value: 'other',            label: 'Other',             emoji: '⭐' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  itemId: string
  term: string
  onClose: () => void
  /** Called after the log is saved successfully. */
  onSaved?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LogUsageModal({ itemId, term, onClose, onSaved }: Props) {
  const logUsage = useVocabStore((s) => s.logUsage)

  const [context, setContext]       = useState<UsageContext>('conversation')
  const [sentence, setSentence]     = useState('')
  const [note, setNote]             = useState('')
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5 | 0>(0)
  const [saving, setSaving]         = useState(false)

  async function handleSave() {
    setSaving(true)
    await logUsage(itemId, {
      usedAt:     new Date().toISOString(),
      context,
      sentence:   sentence.trim()   || undefined,
      note:       note.trim()       || undefined,
      confidence: confidence > 0 ? (confidence as 1 | 2 | 3 | 4 | 5) : undefined,
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92dvh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">I used it</h2>
            <p className="text-xs text-slate-500 mt-0.5">"{term}"</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Context grid */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2.5">Where did you use it?</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTEXT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setContext(opt.value)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-colors ${
                    context === opt.value
                      ? 'bg-brand-50 border-brand-500 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg leading-none shrink-0">{opt.emoji}</span>
                  <span className="text-sm font-medium leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              How natural did it feel?{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </p>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setConfidence(confidence === n ? 0 : n)}
                  aria-label={`Confidence ${n}`}
                  className="p-0.5 transition-transform active:scale-95"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${
                      n <= confidence
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300 fill-transparent'
                    }`}
                  />
                </button>
              ))}
              {confidence > 0 && (
                <span className="text-xs text-slate-400 self-center ml-1">
                  {['', 'Struggled', 'Unsure', 'OK', 'Good', 'Natural'][confidence]}
                </span>
              )}
            </div>
          </div>

          {/* Sentence */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              What did you say / write?{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={`Sentence using "${term}"…`}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Extra note{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. sprint planning, email to team lead…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-slate-100 shrink-0">
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
            {saving ? 'Logging…' : 'Log use ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
