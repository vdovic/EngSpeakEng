import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Library, X, ChevronDown } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabCard } from '@/components/VocabCard'
import { ItemStatus, VocabItem } from '@/types/vocabulary'
import { searchVocabulary } from '@/utils/vocabSearch'

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'inbox',      label: 'New' },
  { value: 'learning',   label: 'Learning' },
  { value: 'stable',     label: 'Stable' },
  { value: 'activation', label: 'Active' },
  { value: 'mastered',   label: '🎓 Mastered' },
]

/** Human-readable display names for known tags */
const TAG_LABELS: Record<string, string> = {
  'vocabulary':   'General Vocabulary',
  'phrasal-verb': 'Phrasal Verbs',
  'idiom':        'Idioms',
  'chunks':       'Fixed Phrases',
}

// ── Sort ───────────────────────────────────────────────────────────────────────

type SortKey =
  | 'newest'           // date added, newest first
  | 'oldest'           // date added, oldest first
  | 'az'               // alphabetical A → Z
  | 'za'               // alphabetical Z → A
  | 'challenge-desc'   // Daily Challenge exposures: 8 → 0  (most done first)
  | 'challenge-asc'    // Daily Challenge exposures: 0 → 8  (not started first)
  | 'due'              // SRS review: due soonest first
  | 'weak'             // SRS review: lowest ease factor first

/**
 * Groups of sort options shown in the <select>.
 * Each group maps to an <optgroup> so the user sees dimension headings.
 */
const SORT_GROUPS: { label: string; options: { value: SortKey; label: string }[] }[] = [
  {
    label: 'Date added',
    options: [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
    ],
  },
  {
    label: 'Name',
    options: [
      { value: 'az', label: 'A → Z' },
      { value: 'za', label: 'Z → A' },
    ],
  },
  {
    label: 'Daily Challenge (0 – 8 steps)',
    options: [
      { value: 'challenge-desc', label: 'Most practiced first (8 → 0)' },
      { value: 'challenge-asc',  label: 'Least practiced first (0 → 8)' },
    ],
  },
  {
    label: 'Spaced-repetition review',
    options: [
      { value: 'due',  label: 'Due for review soonest' },
      { value: 'weak', label: 'Weakest recall (ease score)' },
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function sortItems(items: VocabItem[], sort: SortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    // Challenge sorts show all items in pure exposure order — mastered words
    // are included so the user can see the full 0–8 spectrum at a glance.
    if (sort === 'challenge-desc') {
      return (b.exposureCount ?? 0) - (a.exposureCount ?? 0)
    }
    if (sort === 'challenge-asc') {
      return (a.exposureCount ?? 0) - (b.exposureCount ?? 0)
    }

    // All other sorts: mastered items sink to the bottom so active words
    // are prominent regardless of sort key.
    const aMastered = a.status === 'mastered' ? 1 : 0
    const bMastered = b.status === 'mastered' ? 1 : 0
    if (aMastered !== bMastered) return aMastered - bMastered

    switch (sort) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'az':
        return a.term.localeCompare(b.term)
      case 'za':
        return b.term.localeCompare(a.term)
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'due': {
        const aT = a.review.nextReviewAt ? new Date(a.review.nextReviewAt).getTime() : Infinity
        const bT = b.review.nextReviewAt ? new Date(b.review.nextReviewAt).getTime() : Infinity
        return aT - bT
      }
      case 'weak':
        if (a.review.reviewCount < 2 && b.review.reviewCount < 2) return 0
        if (a.review.reviewCount < 2) return 1
        if (b.review.reviewCount < 2) return -1
        return a.review.ease - b.review.ease
    }
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Dropdown sort selector — groups options by dimension using <optgroup>. */
function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 shrink-0">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 cursor-pointer"
      >
        {SORT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

/** Wrapping pill buttons — no horizontal scroll */
function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors whitespace-nowrap ${
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

// ── Main component ─────────────────────────────────────────────────────────────

export function LibraryPage() {
  const items = useVocabStore((s) => s.items)
  const allThemes = useThemesStore((s) => s.themes)
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')
  const [tag, setTag]       = useState<string>('all')
  const [theme, setTheme]   = useState<string>(() => searchParams.get('theme') ?? 'all')
  const [sort, setSort]     = useState<SortKey>('newest')
  const [moreOpen, setMoreOpen] = useState(false)

  // Sync URL params when they change (e.g. from GlobalSearch "View all" → library?q=…)
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q) setSearch(q)
    const t = searchParams.get('theme') ?? 'all'
    if (t !== 'all') { setTheme(t); setMoreOpen(true) }
  }, [searchParams])

  // All tags by frequency (high to low)
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((i) => i.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [items])

  const tagOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...allTags.map((t) => ({ value: t, label: TAG_LABELS[t] ?? `#${t}` })),
    ],
    [allTags],
  )

  const activeFilterCount = [
    status !== 'all',
    tag !== 'all',
    theme !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setStatus('all')
    setTag('all')
    setTheme('all')
    setSearch('')
  }

  const filtered = useMemo(() => {
    const hasFilters = status !== 'all' || tag !== 'all' || theme !== 'all'

    function passesFilters(i: VocabItem) {
      if (status !== 'all' && i.status !== status) return false
      if (tag !== 'all' && !i.tags.includes(tag)) return false
      if (theme !== 'all' && !(i.themes ?? []).includes(theme)) return false
      return true
    }

    if (search.trim()) {
      // Ranked search mode — relevance order preserved, filters applied on top
      const SEARCH_LIMIT = 200
      const ranked = searchVocabulary(items, search, SEARCH_LIMIT).map((r) => r.item)
      return hasFilters ? ranked.filter(passesFilters) : ranked
    }

    // Filter + sort mode (no query)
    return sortItems(items.filter(passesFilters), sort)
  }, [items, search, status, tag, theme, sort])

  const hasActive = activeFilterCount > 0 || search.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-slate-500" />
          <h1 className="text-xl font-bold text-slate-900">Vocabulary</h1>
          <span className="text-sm text-slate-400">({items.length})</span>
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

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
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

      {/* ── Sort (always visible) ── */}
      <div className="mb-3">
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {/* ── Status (always visible) ── */}
      <div className="mb-3">
        <PillGroup
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
      </div>

      {/* ── More filters (collapsible) ── */}
      <div className="mb-4">
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
          />
          More filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {moreOpen && (
          <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">

            {/* Theme */}
            {allThemes.length > 0 && (
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Theme</p>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">All themes</option>
                  {allThemes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags — all shown, flex-wrap, renamed for clarity */}
            {tagOptions.length > 1 && (
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tag</p>
                <PillGroup options={tagOptions} value={tag} onChange={setTag} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Library size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-600">No items found</p>
          <p className="text-sm mt-1">
            {hasActive
              ? 'Try different filters or clear them.'
              : 'Add your first item to get started.'}
          </p>
          {hasActive && (
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
          {hasActive && (
            <p className="text-xs text-slate-400 mb-2 pl-0.5">
              {filtered.length} of {items.length} items
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
