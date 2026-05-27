/**
 * UseNowSheet.tsx
 *
 * The "Use Now" pre-performance linguistic warm-up surface.
 *
 * Opens as a bottom sheet on mobile and a centered floating panel on desktop.
 * Renders into a React portal so it escapes any stacking-context issues.
 *
 * Design philosophy:
 *   - Immediate: words are visible without any interaction
 *   - Lightweight: nothing to configure or manage
 *   - Confidence-building: example sentences prime active recall
 *   - Practical: "I used it" closes the loop with one tap
 *
 * NOT: a quiz, a dashboard, a management interface, or a challenge.
 *
 * Dismissal paths:
 *   - Tap the × button
 *   - Tap the backdrop (mobile + desktop)
 *   - Press Escape
 *   - Drag the handle pill downward > 100px (mobile only)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import type { VocabItem } from '@/types/vocabulary'
import { getActivationExample } from '@/lib/activationLogic'
import { ConfidenceDots } from '@/components/ConfidenceDots'
import { useVocabStore } from '@/store/vocabStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseNowSheetProps {
  /** Curated list of activation words — pre-selected by the caller. */
  words: VocabItem[]
  isOpen: boolean
  onClose: () => void
}

// ── Word card ─────────────────────────────────────────────────────────────────

interface WordCardProps {
  item: VocabItem
  used: boolean
  onLogUsed: () => void
  onConfidenceChange: (level: 0 | 1 | 2 | 3) => void
}

function WordCard({ item, used, onLogUsed, onConfidenceChange }: WordCardProps) {
  const example = getActivationExample(item)
  const theme   = item.themes?.[0] ?? null

  return (
    <div
      className={[
        'px-5 py-4 transition-colors duration-300',
        used ? 'bg-emerald-50/60' : 'bg-white',
      ].join(' ')}
    >
      {/* Term row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold leading-snug text-slate-900 break-words">
            {item.term}
          </p>
          {theme && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {theme}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          <ConfidenceDots
            item={item}
            onChange={onConfidenceChange}
            compact
          />
        </div>
      </div>

      {/* Example sentence */}
      {example && (
        <p className="mt-2 text-sm leading-relaxed text-slate-500 italic">
          &ldquo;{example}&rdquo;
        </p>
      )}

      {/* Action row */}
      <div className="mt-3 flex items-center justify-end">
        {used ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Check size={13} strokeWidth={2.5} />
            Logged
          </div>
        ) : (
          <button
            onClick={onLogUsed}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-95"
          >
            I used it
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function UseNowSheet({ words, isOpen, onClose }: UseNowSheetProps) {
  const logUsage          = useVocabStore((s) => s.logUsage)
  const updateItem        = useVocabStore((s) => s.updateItem)

  // Session-scoped: which words the learner has logged in this open/close cycle.
  // Resets each time the sheet opens (snapshot IDs change).
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())

  // Two-phase animation: rendered controls DOM, visible controls CSS classes.
  const [rendered, setRendered] = useState(false)
  const [visible,  setVisible]  = useState(false)

  // Drag-to-dismiss state (mobile only).
  const dragStartY = useRef<number | null>(null)
  const [dragDelta, setDragDelta] = useState(0)

  // ── Animation lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setUsedIds(new Set())          // reset session state on each open
      setRendered(true)
      // Micro-delay: first render is invisible, then transition fires
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(t)
    } else {
      setVisible(false)
      // Keep in DOM for exit-animation duration before unmounting
      const t = setTimeout(() => setRendered(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // ── Body scroll lock ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // ── Escape key ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // ── Drag-to-dismiss (mobile handle) ─────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    const delta = e.touches[0].clientY - dragStartY.current
    setDragDelta(Math.max(0, delta))
  }

  function handleTouchEnd() {
    if (dragDelta > 100) {
      onClose()
    }
    setDragDelta(0)
    dragStartY.current = null
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleLogUsed = useCallback(
    (item: VocabItem) => {
      setUsedIds((prev) => new Set(prev).add(item.id))
      void logUsage(item.id, {
        usedAt:  new Date().toISOString(),
        context: 'conversation',
        note:    'Logged from Use Now',
      })
    },
    [logUsage],
  )

  const handleConfidenceChange = useCallback(
    (item: VocabItem, level: 0 | 1 | 2 | 3) => {
      void updateItem(item.id, {
        activation: {
          ...item.activation,
          confidenceLevel: level,
        },
      })
    },
    [updateItem],
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!rendered) return null

  const usedCount = usedIds.size

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Use now — words to say today"
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Sheet / panel */}
      <div
        className={[
          // Positioning & shape
          'relative w-full md:max-w-md md:mx-4',
          'bg-white shadow-2xl',
          // Mobile: full-width bottom sheet
          'rounded-t-2xl md:rounded-2xl',
          // Max height
          'max-h-[88svh] md:max-h-[80vh]',
          // Flex column for sticky header/footer
          'flex flex-col',
          // Transition
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          // Visible state
          visible ? 'translate-y-0 md:scale-100 md:opacity-100' : 'translate-y-full md:translate-y-0 md:scale-95 md:opacity-0',
        ].join(' ')}
        style={dragDelta > 0 ? { transform: `translateY(${dragDelta}px)` } : undefined}
      >
        {/* Drag handle (mobile only) */}
        <div
          className="flex justify-center pt-3 pb-1 md:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-2 md:pt-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Words to say today</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {words.length} word{words.length !== 1 ? 's' : ''} ready for real use
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mx-5" />

        {/* Scrollable word list */}
        <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
          {words.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-sm text-slate-500">No words ready yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Keep practising — activation-ready words will appear here.
              </p>
            </div>
          ) : (
            words.map((item) => (
              <WordCard
                key={item.id}
                item={item}
                used={usedIds.has(item.id)}
                onLogUsed={() => handleLogUsed(item)}
                onConfidenceChange={(level) => handleConfidenceChange(item, level)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {usedCount === 0 ? (
            <p className="text-center text-xs text-slate-400">
              Tap &ldquo;I used it&rdquo; after your conversation to log real-life use.
            </p>
          ) : (
            <p className="text-center text-xs text-emerald-600 font-medium">
              {usedCount === words.length
                ? 'All logged — great work.'
                : `${usedCount} of ${words.length} logged.`}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
