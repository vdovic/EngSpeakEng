import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Library, X } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabCard } from '@/components/VocabCard'
import { ItemStatus, ItemType, SourceType, VocabItem } from '@/types/vocabulary'
import { searchVocabulary } from '@/utils/vocabSearch'

type StatusFilter = ItemStatus | 'all' | 'learned'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'inbox',      label: 'New' },
  { value: 'learning',   label: 'Learning' },
  { value: 'stable',     label: 'Stabilising' },
  { value: 'activation', label: 'Activating' },
  { value: 'mastered',   label: 'Mastered' },
  { value: 'learned',    label: '🎓 Learned' },
]

const TYPE_OPTIONS: { value: ItemType | 'all'; label: string }[] = [
  { value: 'all',    label: 'All types' },
  { value: 'word',   label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
  { value: 'chunk',  label: 'Chunks' },
]

const SOURCE_OPTIONS: { value: SourceType | 'all'; label: string }[] = [
  { value: 'all',      label: 'All sources' },
  { value: 'meeting',  label: 'Meeting' },
  { value: 'article',  label: 'Article' },
  { value: 'email',    label: 'Email' },
  { value: 'book',     label: 'Book' },
  { value: 'podcast',  label: 'Podcast' },
  { value: 'movie',    label: 'Movie' },
  { value: 'other',    label: 'Other' },
]

type SortKey = 'newest' | 'az' | 'due' | 'weak'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'az',     label: 'A → Z' },
  { value: 'due',    label: 'Due soon' },
  { value: 'weak',   label: 'Weakest' },
]

function sortItems(items: VocabItem[], sort: SortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    // Mastered items always sink to the bottom when mixed with other statuses
    const aMastered = a.status === 'mastered' ? 1 : 0
    const bMastered = b.status === 'mastered' ? 1 : 0
    if (aMastered !== bMastered) return aMastered - bMastered

    // Primary sort within each group
    switch (sort) {
      case 'az':
        return a.term.localeCompare(b.term)
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'due': {
        const aT = a.review.nextReviewAt ? new Date(a.review.nextReviewAt).getTime() : Infinity
        const bT = b.review.nextReviewAt ? new Date(b.review.nextReviewAt).getTime() : Infinity
        return aT - bT
      }
      case 'weak':
        // Only meaningful after 2+ reviews; push unreviewed items last
        if (a.review.reviewCount < 2 && b.review.reviewCount < 2) return 0
        if (a.review.reviewCount < 2) return 1
        if (b.review.reviewCount < 2) return -1
        return a.review.ease - b.review.ease
    }
  })
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
            value === o.value
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function LibraryPage() {
  const items = useVocabStore((s) => s.items)
  const allThemes = useThemesStore((s) => s.themes)
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<ItemType | 'all'>('all')
  const [source, setSource] = useState<SourceType | 'all'>('all')
  const [tag, setTag] = useState<string | 'all'>('all')
  const [theme, setTheme] = useState<string | 'all'>(() => searchParams.get('theme') ?? 'all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Sync search box / theme when the URL params change
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q) setSearch(q)
    const t = searchParams.get('theme') ?? 'all'
    if (t !== 'all') { setTheme(t); setShowFilters(true) }
  }, [searchParams])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [items])

  const activeFilterCount = [
    status !== 'all',
    type !== 'all',
    source !== 'all',
    tag !== 'all',
    theme !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setStatus('all')
    setType('all')
    setSource('all')
    setTag('all')
    setTheme('all')
    setSearch('')
  }

  const filtered = useMemo(() => {
    const hasFilters =
      status !== 'all' || type !== 'all' || source !== 'all' || tag !== 'all' || theme !== 'all'

    function passesFilters(i: VocabItem) {
      // ── Learned filter is a special view: show ONLY learned words ──
      if (status === 'learned') {
        if (!i.learned) return false
      } else {
        // All other views exclude learned words (they live in the Learned filter)
        if (i.learned) return false
        if (status !== 'all' && i.status !== status) return false
      }
      if (type !== 'all' && i.type !== type) return false
      if (source !== 'all' && i.sourceType !== source) return false
      if (tag !== 'all' && !i.tags.includes(tag)) return false
      if (theme !== 'all' && !(i.themes ?? []).includes(theme)) return false
      return true
    }

    if (search.trim()) {
      // ── Ranked search mode ──
      // Use full-text ranked search (term + synonyms + definition + examples + tags),
      // then apply the status/type/source/tag/theme filters.  Sort order is ignored while
      // a query is active so relevance ranking is preserved.
      const SEARCH_LIMIT = 200 // high enough to show everything that matches
      const ranked = searchVocabulary(items, search, SEARCH_LIMIT).map((r) => r.item)
      if (!hasFilters) return ranked.filter(passesFilters)
      return ranked.filter(passesFilters)
    }

    // ── Filter + sort mode (no search query) ──
    return sortItems(items.filter(passesFilters), sort)
  }, [items, search, status, type, source, tag, theme, sort])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">Vocabulary</h1>
          <span className="text-sm text-slate-400">({items.filter((i) => !i.learned).length})</span>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
          >
            <X size={12} />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Search + filter toggle */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms, definitions, tags…"
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-brand-50 border-brand-300 text-brand-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-3 bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
          <div className="px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</p>
            <FilterPills options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
          <div className="px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</p>
            <FilterPills options={TYPE_OPTIONS} value={type} onChange={setType} />
          </div>
          <div className="px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Source</p>
            <FilterPills options={SOURCE_OPTIONS} value={source} onChange={setSource} />
          </div>
          {allThemes.length > 0 && (
            <div className="px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Theme</p>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  onClick={() => setTheme('all')}
                  className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                    theme === 'all'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                  }`}
                >
                  All themes
                </button>
                {allThemes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                      theme === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {allTags.length > 0 && (
            <div className="px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tag</p>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  onClick={() => setTag('all')}
                  className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                    tag === 'all'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                  }`}
                >
                  All tags
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={`shrink-0 px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                      tag === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sort</p>
            <FilterPills options={SORT_OPTIONS} value={sort} onChange={setSort} />
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Library size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-600">No items found</p>
          <p className="text-sm mt-1 text-slate-400">
            {activeFilterCount > 0 || search
              ? 'Try different filters or clear them.'
              : 'Add your first item to get started.'}
          </p>
          {(activeFilterCount > 0 || search) && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-brand-600 hover:underline font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {(activeFilterCount > 0 || search) && (
            <p className="text-xs text-slate-400 mb-2 pl-0.5">
              {status === 'learned'
                ? `${filtered.length} learned word${filtered.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${items.filter((i) => !i.learned).length} items`}
              {search.trim() && (
                <span className="ml-1 text-brand-500 font-medium">· ranked by relevance</span>
              )}
            </p>
          )}
          <div className="space-y-2">
            {filtered.map((item) => (
              <VocabCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
