import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, Library } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { VocabCard } from '@/components/VocabCard'
import { ItemStatus, ItemType } from '@/types/vocabulary'

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'inbox',      label: 'Inbox' },
  { value: 'learning',   label: 'Learning' },
  { value: 'stable',     label: 'Stable' },
  { value: 'activation', label: 'Activation' },
  { value: 'mastered',   label: 'Mastered' },
]

const TYPE_OPTIONS: { value: ItemType | 'all'; label: string }[] = [
  { value: 'all',    label: 'All types' },
  { value: 'word',   label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
  { value: 'chunk',  label: 'Chunks' },
]

export function LibraryPage() {
  const items = useVocabStore((s) => s.items)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')
  const [type, setType] = useState<ItemType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch =
        !search ||
        i.term.toLowerCase().includes(search.toLowerCase()) ||
        i.definitionEn?.toLowerCase().includes(search.toLowerCase()) ||
        i.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = status === 'all' || i.status === status
      const matchType = type === 'all' || i.type === type
      return matchSearch && matchStatus && matchType
    })
  }, [items, search, status, type])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center gap-2 mb-5">
        <Library size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Library</h1>
        <span className="text-sm text-slate-400 ml-1">({items.length} items)</span>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms, definitions, tags…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 bg-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || status !== 'all' || type !== 'all'
                ? 'bg-brand-50 border-brand-300 text-brand-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filter
          </button>
        </div>

        {showFilters && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1.5">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setStatus(o.value)}
                    className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                      status === o.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1.5">Type</p>
              <div className="flex gap-1.5">
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setType(o.value)}
                    className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                      type === o.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Library size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No items found</p>
          {search && <p className="text-sm mt-1">Try a different search term or clear the filters.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <VocabCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
