/**
 * AtlasWordCard.tsx
 *
 * Inline word card shown when the learner clicks a node in the Atlas.
 * Floats near the click position, clamped to the viewport.
 *
 * Designed to be elegant and restrained — gives just enough context to
 * orient the learner without overwhelming them with data.
 *
 * Content:
 *   • Term + part of speech + stage
 *   • Short definition (shortDefinition → definitionEn fallback)
 *   • Example sentence (if available)
 *   • Exposures + real-life usage count
 *   • Confidence level (if set)
 *   • First seen / last used dates
 *   • Link to full detail page
 *
 * Dismissal: Escape key, click outside, or × button.
 * No editing — Atlas is read-only.
 */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { VocabItem } from '@/types/vocabulary'
import type { AtlasNode } from '@/lib/atlasLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AtlasWordCardProps {
  item: VocabItem
  node: AtlasNode
  /** Viewport X coordinate of the click that opened this card */
  screenX: number
  /** Viewport Y coordinate of the click that opened this card */
  screenY: number
  onClose: () => void
}

// ── Visual helpers ────────────────────────────────────────────────────────────

const STAGE_DOT: Record<string, string> = {
  new:        'bg-slate-500',
  introduced: 'bg-indigo-400',
  drilling:   'bg-amber-400',
  activate:   'bg-white/80',
  mastered:   'bg-emerald-400',
}

const STAGE_LABEL: Record<string, string> = {
  new:        'New',
  introduced: 'Introduced',
  drilling:   'Drilling',
  activate:   'Activate',
  mastered:   'Mastered',
}

const CONFIDENCE_LABEL: Record<number, string> = {
  1: 'Not yet comfortable',
  2: 'Getting comfortable',
  3: 'Feels natural',
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function relativeTime(isoString: string | undefined | null): string | null {
  if (!isoString) return null
  const ms = new Date(isoString).getTime()
  if (isNaN(ms)) return null
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days === 0)   return 'today'
  if (days === 1)   return 'yesterday'
  if (days < 7)    return `${days}d ago`
  if (days < 30)   return `${Math.floor(days / 7)}w ago`
  if (days < 365)  return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function shortDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(isoString))
  } catch {
    return ''
  }
}

// ── Exposure dots ─────────────────────────────────────────────────────────────

function ExposureDots({ count }: { count: number }) {
  const total = 8
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} of 8 exposures`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < count ? 'bg-indigo-400' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

// ── AtlasWordCard ─────────────────────────────────────────────────────────────

const CARD_W = 284
const CARD_H_APPROX = 220

export function AtlasWordCard({ item, node, screenX, screenY, onClose }: AtlasWordCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // ── Escape key dismissal ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Click-outside dismissal (deferred so opening click doesn't close it) ─
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    t = setTimeout(() => document.addEventListener('mousedown', handler), 80)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  // ── Viewport-clamped position ─────────────────────────────────────────────
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = screenX + 18
  let top  = screenY - 28
  if (left + CARD_W > vw - 12)         left = screenX - CARD_W - 18
  if (top + CARD_H_APPROX > vh - 12)   top  = vh - CARD_H_APPROX - 12
  left = Math.max(8, left)
  top  = Math.max(8, top)

  // ── Derived display data ──────────────────────────────────────────────────
  const definition    = item.shortDefinition ?? (item.definitionEn ? item.definitionEn.slice(0, 120) : null)
  const exposures     = item.exposureCount ?? 0
  const usageCount    = item.activation?.usageCount ?? 0
  const confidenceLevel = item.activation?.confidenceLevel ?? 0
  const lastLog       = item.activation?.usageLogs?.slice(-1)[0]?.usedAt
  const confLabel     = CONFIDENCE_LABEL[confidenceLevel]

  return (
    <div
      ref={cardRef}
      className="fixed z-50 rounded-xl border border-white/10 bg-[#0d1526]/96 shadow-2xl backdrop-blur-md"
      style={{ left, top, width: CARD_W }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2.5 border-b border-white/8">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-slate-100 truncate leading-tight">
            {item.term}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STAGE_DOT[node.stage] ?? 'bg-slate-500'}`}
              aria-hidden="true"
            />
            <span className="text-[10px] text-slate-500">{STAGE_LABEL[node.stage]}</span>
            {item.partOfSpeech && (
              <span className="text-[10px] text-slate-700">· {item.partOfSpeech}</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 mt-0.5 text-slate-700 hover:text-slate-400 transition-colors p-1 -m-1 rounded"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2">

        {definition && (
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {definition}
          </p>
        )}

        {item.exampleSentence && (
          <p className="text-[11px] text-slate-500 italic leading-relaxed border-l-2 border-white/10 pl-2.5">
            {item.exampleSentence}
          </p>
        )}

        {/* Exposures + usage */}
        <div className="flex items-center gap-3">
          <ExposureDots count={Math.min(8, exposures)} />
          {usageCount > 0 && (
            <span className="text-[10px] text-slate-600">
              Used {usageCount}× in real life
            </span>
          )}
        </div>

        {/* Confidence */}
        {confLabel && (
          <p className="text-[10px] text-slate-600">{confLabel}</p>
        )}

        {/* Temporal row */}
        <div className="flex items-center gap-3 text-[10px] text-slate-700">
          <span>Added {shortDate(item.createdAt)}</span>
          {lastLog && <span>Last used {relativeTime(lastLog)}</span>}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <Link
          to={`/item/${item.id}`}
          onClick={onClose}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Open full page →
        </Link>
      </div>
    </div>
  )
}
