import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowRight } from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import {
  searchVocabulary,
  highlightMatches,
  buildSnippet,
  SearchResult,
  MatchField,
} from '@/utils/vocabSearch'
import { VocabItem } from '@/types/vocabulary'

// ── Sub-components ────────────────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  const segments = highlightMatches(text, query)
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="bg-amber-100 text-amber-900 not-italic font-semibold rounded-sm px-px"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

const STATUS_COLORS: Record<string, string> = {
  inbox:      'bg-slate-100 text-slate-600',
  learning:   'bg-blue-100 text-blue-700',
  stable:     'bg-teal-100 text-teal-700',
  activation: 'bg-amber-100 text-amber-700',
  mastered:   'bg-emerald-100 text-emerald-700',
}

const MATCH_LABEL: Record<MatchField, string> = {
  term:       '',
  synonym:    'Synonym',
  definition: 'Definition',
  example:    'Example',
  tag:        'Tag',
  other:      '',
}

function MatchContext({
  result,
  query,
}: {
  result: SearchResult
  query: string
}) {
  const { item, matchField, matchSnippet } = result

  if (matchField === 'term') {
    // Show definition preview when matched via term
    const def = item.definitionEn
    if (!def) return null
    return (
      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
        {def.length > 80 ? def.slice(0, 80) + '…' : def}
      </p>
    )
  }

  const label = MATCH_LABEL[matchField]
  if (!matchSnippet) {
    if (matchField === 'tag') {
      return (
        <p className="text-xs text-slate-400 mt-0.5">
          #{item.tags.find((t) => t.toLowerCase().includes(query.toLowerCase()))}
        </p>
      )
    }
    return null
  }

  const snippet = buildSnippet(matchSnippet, query, 75)

  return (
    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
      {label && (
        <span className="font-medium text-slate-500 mr-1">{label}:</span>
      )}
      <HighlightedText text={snippet} query={query} />
    </p>
  )
}

function ResultRow({
  result,
  query,
  isSelected,
  onSelect,
  onHover,
}: {
  result: SearchResult
  query: string
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  const { item } = result
  const statusCls = STATUS_COLORS[item.status] ?? 'bg-slate-100 text-slate-600'

  return (
    <button
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b last:border-0 border-slate-100 transition-colors ${
        isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'
      }`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div className="flex-1 min-w-0">
        {/* Term + badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-slate-900">
            <HighlightedText text={item.term} query={query} />
          </span>
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">
            {item.type}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${statusCls}`}
          >
            {item.status}
          </span>
        </div>
        {/* Context line */}
        <MatchContext result={result} query={query} />
      </div>
      <ArrowRight size={14} className="text-slate-300 shrink-0 mt-1" />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  placeholder?: string
  className?: string
  /** Called after the user selects a result (useful to close parent modals). */
  onResultSelect?: () => void
  autoFocus?: boolean
}

const DEBOUNCE_MS = 180
const RESULTS_SHOWN = 10

export function GlobalSearch({
  placeholder = 'Search vocabulary…',
  className = '',
  onResultSelect,
  autoFocus = false,
}: Props) {
  const navigate = useNavigate()
  const items = useVocabStore((s) => s.items)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  // Reset cursor when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery])

  // Search — ask for one extra to know if "View all" link is needed
  const allResults = useMemo(
    () => searchVocabulary(items, debouncedQuery, RESULTS_SHOWN + 1),
    [items, debouncedQuery],
  )
  const results = allResults.slice(0, RESULTS_SHOWN)
  const hasMore = allResults.length > RESULTS_SHOWN

  const showDropdown = isOpen && query.trim().length > 0

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const openItem = useCallback(
    (item: VocabItem) => {
      navigate(`/item/${item.id}`)
      setQuery('')
      setIsOpen(false)
      onResultSelect?.()
    },
    [navigate, onResultSelect],
  )

  function viewAll() {
    navigate(`/library?q=${encodeURIComponent(query)}`)
    setQuery('')
    setIsOpen(false)
    onResultSelect?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) openItem(results[selectedIndex].item)
      else if (hasMore) viewAll()
    } else if (e.key === 'Escape') {
      setQuery('')
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white placeholder:text-slate-400 transition-shadow"
        />
        {query && (
          <button
            onMouseDown={(e) => e.preventDefault()} // keep focus on input
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try a synonym, definition fragment, or partial word.
              </p>
            </div>
          ) : (
            <>
              {results.map((r, i) => (
                <ResultRow
                  key={r.item.id}
                  result={r}
                  query={debouncedQuery}
                  isSelected={i === selectedIndex}
                  onSelect={() => openItem(r.item)}
                  onHover={() => setSelectedIndex(i)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={viewAll}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 text-center border-t border-slate-100 transition-colors"
                >
                  View all results in Library →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
