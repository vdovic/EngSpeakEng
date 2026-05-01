import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Library, X, ChevronDown } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { VocabCard } from '@/components/VocabCard'
import { ItemStatus, ItemType, VocabItem } from '@/types/vocabulary'
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

const TYPE_OPTIONS: { value: ItemType | 'all'; label: string }[] = [
  { value: 'all',    label: 'All types' },
  { value: 'word',   label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
  { value: 'chunk',  label: 'Chunks' },
]

/** Human-readable display names for known tags */
const TAG_LABELS: Record<string, string> = {
  'vocabulary':   'General Vocabulary',
  'phrasal-verb': 'Phrasal Verbs',
  'idiom':        'Idioms',
  'chunks':       'Fixed Phrases',
}

type SortKey = 'newest' | 'az' | 'due' | 'weak' | 'progress'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',   label: 'Newest' },
  { value: 'az',       label: 'A → Z' },
  { value: 'due',      label: 'Due soon' },
  { value: 'weak',     label: 'Weakest' },
  { value: 'progress', label: 'Progress' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Composite progress score — used by the 'progress' sort.
 *
 * Status is the primary driver (inbox=0 → mastered=4, each worth 1 000 pts).
 * Within each status, three secondary signals refine the ranking:
 *   - Challenge exposures  (0–8 steps)   → up to 100 pts
 *   - SRS successful recalls (0–3+)       → up to  50 pts
 *   - Real-life uses logged (0–3+)        → up to  30 pts
 *
 * Sorting ascending (lowest score first) surfaces words that need the
 * most work; sorting descending shows the most-mastered words first.
 */
const STATUS_SCORE: Record<string, number> = {
  inbox: 0, learning: 1, stable: 2, activation: 3, mastered: 4,
}

function progressScore(item: VocabItem): number {
  const s         = STATUS_SCORE[item.status] ?? 0
  const challenge = (item.exposureCount ?? 0) / 8                                         // 0–1
  const recalls   = Math.min(item.review.successfulRecalls / 3, 1)                        // 0–1
  const usage     = Math.min(
    item.activation.usageLogs.length / Math.max(item.activation.requiredUses, 1),
    1,
  )                                                                                         // 0–1
  return s * 1_000 + challenge * 100 + recalls * 50 + usage * 30
}

function sortItems(items: VocabItem[], sort: SortKey): VocabItem[] {
  return [...items].sort((a, b) => {
    // 'progress' lets the composite score order everything naturally
    // (mastered items will already rank highest and appear at the bottom).
    if (sort === 'progress') return progressScore(a) - progressScore(b)

    // All other sorts: mastered items always sink to the bottom
    const aMastered = a.status === 'mastered' ? 1 : 0
    const bMastered = b.status === 'mastered' ? 1 : 0
    if (aMastered !== bMastered) return aMastered - bMastered

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
        if (a.review.reviewCount < 2 && b.review.reviewCount < 2) return 0
        if (a.review.reviewCount < 2) return 1
        if (b.review.reviewCount < 2) return -1
        return a.review.ease - b.review.ease
    }
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Segment control — visually prominent, used for Sort */
function SortSegment({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5 overflow-x-auto scrollbar-hide">
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 flex-1 min-w-[4rem] py-1.5 px-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
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
  const [type, setType]     = useState<ItemType | 'all'>('all')
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
    type !== 'all',
    tag !== 'all',
    theme !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setStatus('all')
    setType('all')
    setTag('all')
    setTheme('all')
    setSearch('')
  }

  const filtered = useMemo(() => {
    const hasFilters = status !== 'all' || type !== 'all' || tag !== 'all' || theme !== 'all'

    function passesFilters(i: VocabItem) {
      if (status !== 'all' && i.status !== status) return false
      if (type !== 'all' && i.type !== type) return false
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
  }, [items, search, status, type, tag, theme, sort])

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
        <SortSegment value={sort} onChange={setSort} />
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

            {/* Type */}
            <div className="px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</p>
              <PillGroup options={TYPE_OPTIONS} value={type} onChange={setType} />
            </div>

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
          {(hasActive || sort === 'progress') && (
            <p className="text-xs text-slate-400 mb-2 pl-0.5">
              {filtered.length} of {items.length} items
              {search.trim() ? (
                <span className="ml-1 text-brand-500 font-medium">· ranked by relevance</span>
              ) : sort === 'progress' ? (
                <span className="ml-1 text-brand-500 font-medium">· least progress first</span>
              ) : null}
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
