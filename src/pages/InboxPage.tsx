import { useState } from 'react'
import { Plus, Inbox } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { QuickAddModal } from '@/components/QuickAddModal'
import { VocabCard } from '@/components/VocabCard'

export function InboxPage() {
  const [showAdd, setShowAdd] = useState(false)
  const items = useVocabStore((s) => s.items)
  const inboxItems = items.filter((i) => i.status === 'inbox')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">New Words</h1>
          {inboxItems.length > 0 && (
            <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {inboxItems.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {inboxItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Inbox size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No new words</p>
          <p className="text-sm mt-1">Capture new words and phrases as you encounter them.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Add your first item
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            These items need enrichment before they enter review. Tap any to add definition, examples, and more.
          </p>
          <div className="space-y-2">
            {inboxItems.map((item) => (
              <VocabCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            <strong>Tip:</strong> Open each item to add a definition and example sentence, then move it to Learning.
          </div>
        </>
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
