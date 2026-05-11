/**
 * DashboardPage — ESE Today
 *
 * Sections (top→bottom):
 *  1. TodayHeader         — compact greeting + date
 *  2. TodaySessionCard    — confidence-aware challenge CTA (with session size hint)
 *  3. SRS review chip     — subtle "X due for review" when review items exist
 *  4. TodayHealthStrip    — 4 KPI pills (due · confidence · close · goal)
 *  5. TodayNudgeCard      — contextual nudge (no "AI" label, white card)
 *  6. AlmostMasteredStrip — well-drilled words needing real-life use (conditional)
 *  7. TodayFocusPreview   — My Current Focus list (red-first, ConfidenceDots)
 *  8. FocusAreasPreview   — real theme cards
 *  9. HowItWorks          — collapsible pipeline explainer (collapsed for experienced users)
 * 10. LearningProfileCard — profile summary + adjust link
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Zap, Trophy, Flame,
  ChevronRight, Layers, Loader2, ChevronDown,
  SlidersHorizontal, Target, CheckCircle2, Clock, TrendingUp,
} from 'lucide-react'
import { getCanonicalLevel } from '@/lib/progressionLogic'
import { useVocabStore, useDueItems, useWeeklyFocusItems } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemeAutoAssign } from '@/hooks/useThemeAutoAssign'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { CHALLENGE_SESSION_CAP } from '@/lib/constants'
import { QuickAddModal } from '@/components/QuickAddModal'
import { StarterPacksSection } from '@/components/StarterPacksSection'
import { ConfidenceDots } from '@/components/ConfidenceDots'
import { usagePoints } from '@/lib/mastery'
import {
  getTodaySessionState,
  getAlmostMasteredCount,
  getAlmostMasteredItems,
  getFocusConfidenceSummary,
  getTodayNudge,
  getGoalMomentum,
  type SessionSize,
} from '@/lib/todayLogic'
import { GOAL_LABELS, INTENSITY_CONFIG } from '@/types/profile'
import type { VocabItem } from '@/types/vocabulary'

// ── Module-level constants ─────────────────────────────────────────────────────

/** Emoji map built once from SUGGESTED_THEMES at module load */
const THEME_EMOJI: Record<string, string> = Object.fromEntries(
  SUGGESTED_THEMES.map((s) => [s.name, s.emoji]),
)

/** Three suggested starter focus areas (always non-empty — names match SUGGESTED_THEMES) */
const STARTER_SUGGESTIONS = SUGGESTED_THEMES.filter((s) =>
  ['Business & Professional', 'Everyday Conversation', 'Written Communication'].includes(s.name),
)

/**
 * Sort weight for red-first ordering in TodayFocusPreview.
 * Red (1) first, then unset (0), yellow (2), green (3).
 */
const CONFIDENCE_ORDER: Record<number, number> = { 1: 0, 0: 1, 2: 2, 3: 3 }

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThemeStat { name: string; total: number; mastered: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const SESSION_SIZE_LABEL: Record<SessionSize, string> = {
  quick:  'Quick session',
  normal: 'Full session',
  deep:   'Large queue',
}

// ── TodayHeader ───────────────────────────────────────────────────────────────

function TodayHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <div className="flex items-baseline justify-between mb-5">
      <h1 className="text-xl font-bold text-slate-900">{greeting}</h1>
      <span className="text-xs text-slate-400">{dateLabel}</span>
    </div>
  )
}

// ── TodaySessionCard ──────────────────────────────────────────────────────────
// Confidence-aware challenge CTA with session-size hint and soft post-session state.

function TodaySessionCard({
  dueCount,
  sessionDoneToday,
  redCount,
  suggestedSize,
  onChallenge,
  onFocus,
}: {
  dueCount: number
  sessionDoneToday: boolean
  redCount: number
  suggestedSize: SessionSize
  onChallenge: () => void
  onFocus: () => void
}) {
  // Post-session + nothing left due: soft card
  if (sessionDoneToday && dueCount === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-3">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
          Done for today ✓
        </p>
        <p className="text-base font-bold text-slate-900 mb-1">You've practised today</p>
        <p className="text-sm text-slate-500 mb-4">
          Try using a focus word in a real conversation.
        </p>
        <button
          onClick={onFocus}
          className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <Zap size={14} />
          Practice focus words
          <ChevronRight size={13} />
        </button>
      </div>
    )
  }

  // Confidence-aware heading
  const heading =
    redCount > 3
      ? `${redCount} words need your attention`
      : dueCount > 0
      ? `${dueCount} word${dueCount !== 1 ? 's' : ''} ready to practise`
      : 'Keep your momentum going'

  const subtext =
    redCount > 3
      ? 'Challenge sessions build the recall needed for real-life use.'
      : sessionDoneToday
      ? 'Session done — another round keeps it fresh.'
      : 'Daily Challenge · spaced repetition'

  // Session size hint (only when there's something to do)
  const sizeLabel = dueCount > 0 ? SESSION_SIZE_LABEL[suggestedSize] : null

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-violet-700 p-5 mb-3 shadow-sm">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-brand-200 text-[10px] font-bold uppercase tracking-widest">
            {sessionDoneToday ? 'Session done · more available' : 'Ready to learn?'}
          </p>
          {sizeLabel && (
            <span className="text-[9px] font-semibold text-brand-300 bg-white/10 px-1.5 py-0.5 rounded-full">
              {sizeLabel}
            </span>
          )}
        </div>

        <p className="text-lg font-bold text-white mb-0.5">{heading}</p>
        <p className="text-brand-200 text-xs mb-4">{subtext}</p>

        <div className="flex gap-2">
          <button
            onClick={onChallenge}
            className="px-4 py-2 bg-white text-brand-700 rounded-xl font-bold text-sm hover:bg-brand-50 transition-colors shadow-sm"
          >
            {sessionDoneToday ? 'Review again' : 'Daily Challenge'}
          </button>
          {sessionDoneToday && (
            <button
              onClick={onFocus}
              className="px-4 py-2 bg-white/15 border border-white/25 text-white rounded-xl font-bold text-sm hover:bg-white/25 transition-colors"
            >
              Focus words
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SRS Review chip ───────────────────────────────────────────────────────────
// Subtle secondary signal shown when SRS review items exist.
// Does not compete with the Challenge CTA.

function ReviewChip({
  reviewCount,
  onNavigate,
}: {
  reviewCount: number
  onNavigate: () => void
}) {
  if (reviewCount === 0) return null
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl mb-5">
      <span className="text-xs text-slate-500">
        {reviewCount} word{reviewCount !== 1 ? 's' : ''} due for review
      </span>
      <button
        onClick={onNavigate}
        className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
      >
        Review <ChevronRight size={11} />
      </button>
    </div>
  )
}

// ── TodayHealthStrip ──────────────────────────────────────────────────────────
// 4 compact KPI pills: due · struggling · close (to mastery) · goal

function TodayHealthStrip({
  dueCount,
  redCount,
  almostCount,
  percentComplete,
  onChallenge,
  onFocus,
  onProgress,
}: {
  dueCount: number
  redCount: number
  almostCount: number
  percentComplete: number
  onChallenge: () => void
  onFocus: () => void
  onProgress: () => void
}) {
  const pills = [
    {
      icon: <Clock size={12} className="text-slate-400" />,
      value: String(dueCount),
      label: 'due',
      highlight: dueCount > 10 ? 'text-amber-600 font-bold' : 'text-slate-700',
      onClick: onChallenge,
    },
    {
      icon: <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />,
      value: String(redCount),
      label: 'struggling',
      highlight: redCount > 5 ? 'text-rose-600 font-bold' : 'text-slate-700',
      onClick: onChallenge,
    },
    {
      icon: <Zap size={12} className="text-amber-500" />,
      value: String(almostCount),
      label: 'close',        // Fix 4: was "almost mastered" — too long for 4-col pill
      highlight: almostCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-700',
      onClick: onFocus,
    },
    {
      icon: <Trophy size={12} className="text-emerald-500" />,
      value: `${percentComplete}%`,
      label: 'of goal',
      highlight: 'text-slate-700',
      onClick: onProgress,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {pills.map((pill) => (
        <button
          key={pill.label}
          onClick={pill.onClick}
          className="bg-white border border-slate-200 rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
        >
          <div className="flex items-center gap-1">
            {pill.icon}
          </div>
          <span className={`text-base font-extrabold leading-none ${pill.highlight}`}>
            {pill.value}
          </span>
          <span className="text-[9px] text-slate-400 font-medium leading-none text-center whitespace-nowrap">
            {pill.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── TodayNudgeCard ────────────────────────────────────────────────────────────
// White card — contextual nudge, no "AI" label

function TodayNudgeCard({
  text,
  action,
  actionLabel,
}: {
  text: string
  action: string | null
  actionLabel: string
}) {
  const navigate = useNavigate()

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
        <TrendingUp size={13} className="text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        {action && (
          <button
            onClick={() => navigate(action)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
          >
            {actionLabel}
            <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── AlmostMasteredStrip ───────────────────────────────────────────────────────
// Conditional — only shown when almost-mastered items exist.
// "I used it" calls logUsage only — NO AI.

function AlmostMasteredStrip({
  items,
  onNavigate,
  onLogUsed,
}: {
  items: VocabItem[]
  onNavigate: () => void
  onLogUsed: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Almost mastered
        </p>
        <button
          onClick={onNavigate}
          className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          See all <ChevronRight size={12} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm">
        {items.map((item) => {
          const uses = usagePoints(item.activation.usageLogs)
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{item.term}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {uses}/3 real-life uses · exp {item.exposureCount ?? 0}/8
                </p>
              </div>
              <button
                onClick={() => onLogUsed(item.id)}  // NO AI — direct store write
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100 active:scale-95 transition-all"
              >
                <Plus size={11} />
                I used it
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── TodayFocusPreview ─────────────────────────────────────────────────────────
// Red-first ordering, ConfidenceDots (read-only), usagePoints().
// CONFIDENCE_ORDER is module-level (Fix 7).

function TodayFocusPreview({ onNavigate }: { onNavigate: () => void }) {
  const focusItems = useWeeklyFocusItems()
  const FOCUS_MAX  = 50

  const sorted = [...focusItems].sort((a, b) => {
    const ca = a.activation?.confidenceLevel ?? 0
    const cb = b.activation?.confidenceLevel ?? 0
    return (CONFIDENCE_ORDER[ca] ?? 1) - (CONFIDENCE_ORDER[cb] ?? 1)
  })

  const preview   = sorted.slice(0, 5)
  const usedCount = focusItems.filter((i) => usagePoints(i.activation.usageLogs) >= 3).length

  return (
    <section className="mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Target size={14} className="text-amber-500" />
            My Current Focus
          </h2>
          {focusItems.length > 0 ? (
            <p className="text-xs text-slate-500 mt-0.5">
              {focusItems.length} / {FOCUS_MAX} words · {usedCount} used 3×
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              Words selected for real-life practice
            </p>
          )}
        </div>
        <button
          onClick={onNavigate}
          className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0 mt-1"
        >
          {focusItems.length > 0 ? 'See all' : 'Set up'} <ChevronRight size={12} />
        </button>
      </div>

      {focusItems.length === 0 ? (
        <button
          onClick={onNavigate}
          className="w-full bg-amber-50 border border-amber-200 border-dashed rounded-2xl p-5 text-center hover:bg-amber-100 transition-colors"
        >
          <Target size={24} className="mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-semibold text-amber-800 mb-1">No focus words yet</p>
          <p className="text-xs text-amber-600">
            Complete Daily Challenges and the system will auto-select words for real-life practice.
          </p>
        </button>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm mb-3">
            {preview.map((item) => {
              const uses = usagePoints(item.activation.usageLogs)
              const done = uses >= 3
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {done
                    ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.term}
                    </p>
                  </div>
                  {/* Confidence dots — read-only (no onChange) */}
                  <ConfidenceDots item={item} compact />
                  {/* Usage dots */}
                  <div className="flex gap-1 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < uses ? (done ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            {focusItems.length > 5 && (
              <button
                onClick={onNavigate}
                className="w-full py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors text-center"
              >
                +{focusItems.length - 5} more →
              </button>
            )}
          </div>
          <button
            onClick={onNavigate}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            <Zap size={13} /> Practice Focus Words
          </button>
        </>
      )}
    </section>
  )
}

// ── Focus Areas ───────────────────────────────────────────────────────────────

function SuggestedFocusAreaCard({
  name,
  emoji,
  description,
  onActivate,
  isProcessing,
}: {
  name: string
  emoji: string
  description: string
  onActivate: () => void
  isProcessing?: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:border-brand-200 hover:shadow-sm transition-all">
      <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl mb-3 shrink-0">
        {emoji}
      </div>
      <p className="text-sm font-bold text-slate-900 mb-1">{name}</p>
      <p className="text-xs text-slate-500 leading-snug flex-1 mb-4">{description}</p>
      <button
        onClick={onActivate}
        disabled={isProcessing}
        className="w-full py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        {isProcessing ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Scanning…
          </>
        ) : (
          'Activate'
        )}
      </button>
    </div>
  )
}

function FocusAreaCard({
  name,
  total,
  mastered,
  onNavigate,
  onAssign,
  isAssigning,
}: {
  name: string
  total: number
  mastered: number
  onNavigate: () => void
  onAssign?: () => void
  isAssigning?: boolean
}) {
  const pct   = total > 0 ? Math.round((mastered / total) * 100) : 0
  const emoji = THEME_EMOJI[name] ?? '📌'
  const empty = total === 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:border-brand-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl">
          {emoji}
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          Active
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900 mb-0.5 truncate">{name}</p>
      <p className="text-xs text-slate-400 mb-4">{total} word{total !== 1 ? 's' : ''}</p>

      {empty ? (
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={onAssign}
            disabled={isAssigning}
            className="w-full py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isAssigning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Scanning…
              </>
            ) : (
              'Assign words with AI →'
            )}
          </button>
          <button
            onClick={onNavigate}
            className="text-center text-[10px] text-slate-400 hover:text-brand-500 transition-colors"
          >
            or open theme
          </button>
        </div>
      ) : (
        <div className="mt-auto w-full">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-slate-400">{pct}% mastered</span>
            <button
              onClick={onNavigate}
              className="flex items-center gap-0.5 text-brand-500 font-semibold hover:underline"
            >
              Open <ChevronRight size={10} />
            </button>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FocusAreasPreview({
  themeStats,
  onNavigateToTheme,
  onManageThemes,
  onAddTheme,
  processingTheme,
}: {
  themeStats: ThemeStat[]
  onNavigateToTheme: (theme: string) => void
  onManageThemes: () => void
  onAddTheme: (name: string) => void
  processingTheme: string | null
}) {
  const isEmpty = themeStats.length === 0

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Focus Areas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmpty
              ? 'Get started with a suggested focus area below'
              : 'Your personalized learning themes'}
          </p>
        </div>
        <button
          onClick={onManageThemes}
          className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
        >
          Manage all <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isEmpty ? (
          STARTER_SUGGESTIONS.map((s) => (
            <SuggestedFocusAreaCard
              key={s.name}
              name={s.name}
              emoji={s.emoji}
              description={s.description}
              onActivate={() => onAddTheme(s.name)}
              isProcessing={processingTheme === s.name}
            />
          ))
        ) : (
          <>
            {themeStats.slice(0, 3).map(({ name, total, mastered }) => (
              <FocusAreaCard
                key={name}
                name={name}
                total={total}
                mastered={mastered}
                onNavigate={() => onNavigateToTheme(name)}
                onAssign={() => onAddTheme(name)}
                isAssigning={processingTheme === name}
              />
            ))}
            {themeStats.length < 3 && (
              <button
                onClick={onManageThemes}
                className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                style={{ minHeight: '180px' }}
              >
                <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center">
                  <Plus size={18} className="text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Add focus area</span>
              </button>
            )}
          </>
        )}
      </div>

      {isEmpty && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Or{' '}
          <button
            onClick={onManageThemes}
            className="text-brand-600 font-semibold hover:underline"
          >
            create a custom focus area
          </button>
        </p>
      )}
    </section>
  )
}

// ── HowItWorks ────────────────────────────────────────────────────────────────
// Collapsed by default for experienced users (challengeCompletions >= 3).

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '📥',
    label: 'Capture',
    badge: 'Library',
    badgeCls: 'bg-slate-100 text-slate-600',
    cardBorder: 'border-slate-200 hover:border-slate-300',
    actionCls: 'text-slate-500',
    description: 'Add words from meetings, articles, or anywhere you encounter new language.',
    howTo: 'Tap + Add or Quick Add',
    href: '/library',
  },
  {
    emoji: '📖',
    label: 'Learn',
    badge: 'Review & Challenge',
    badgeCls: 'bg-blue-100 text-blue-700',
    cardBorder: 'border-blue-200 hover:border-blue-300',
    actionCls: 'text-blue-600',
    description: 'Activate new words from Library. They enter spaced-repetition Review and the Daily Challenge pool.',
    howTo: 'Tap "Learning" on any new word',
    href: '/review',
  },
  {
    emoji: '💬',
    label: 'Use it',
    badge: 'Focus',
    badgeCls: 'bg-amber-100 text-amber-700',
    cardBorder: 'border-amber-200 hover:border-amber-300',
    actionCls: 'text-amber-600',
    description: 'Speak or write the word in real life. 3 logged uses moves it to the active stage.',
    howTo: 'Tap "+ I used it" on any word',
    href: '/focus',
  },
  {
    emoji: '🏆',
    label: 'Mastered',
    badge: 'Complete',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    cardBorder: 'border-emerald-200 hover:border-emerald-300',
    actionCls: 'text-emerald-600',
    description: '3 recalls + 3 real-life uses + a sentence written. ESE marks it mastered automatically.',
    howTo: 'Achieved automatically',
    href: '/progress',
  },
] as const

function HowItWorks({ defaultExpanded }: { defaultExpanded: boolean }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className="mb-6">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="text-left">
          <h2 className="text-base font-bold text-slate-900">How learning works</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your path from new word to fluent use</p>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <button
              key={step.label}
              onClick={() => navigate(step.href)}
              className={`text-left border rounded-2xl p-4 bg-white transition-all hover:shadow-sm flex flex-col gap-2 ${step.cardBorder}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl leading-none">{step.emoji}</span>
                <span className="text-[10px] font-extrabold text-slate-200 tabular-nums">0{i + 1}</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 mb-1.5">{step.label}</p>
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${step.badgeCls}`}>
                  {step.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed flex-1">{step.description}</p>
              <p className={`text-[10px] font-semibold leading-none ${step.actionCls}`}>
                → {step.howTo}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// ── LearningProfileCard ───────────────────────────────────────────────────────

function LearningProfileCard({ onAdjust }: { onAdjust: () => void }) {
  const profile    = useOnboardingStore((s) => s.profile)
  const focusCount = useVocabStore((s) => s.items.filter((i) => i.inFocus).length)

  if (!profile) {
    return (
      <div className="mb-5">
        <button
          onClick={onAdjust}
          className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
              <SlidersHorizontal size={16} className="text-brand-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 leading-snug">Personalise my setup</p>
              <p className="text-xs text-slate-400 mt-0.5">Set your learning goal and build a focus set</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" />
        </button>
      </div>
    )
  }

  const cfg = INTENSITY_CONFIG[profile.intensity]

  return (
    <div className="mb-5 bg-white border border-slate-200 rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Learning profile</p>
        <button
          onClick={onAdjust}
          className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-800 transition-colors"
        >
          <SlidersHorizontal size={11} />
          Adjust
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Goal</p>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {GOAL_LABELS[profile.goal] ?? profile.goal}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Intensity</p>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {cfg.emoji} {cfg.label}
            <span className="font-normal text-slate-500"> · {cfg.wordsPerDay}/day</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">My Current Focus</p>
          <p className="text-sm font-semibold text-slate-800">
            {focusCount}
            <span className="font-normal text-slate-500"> / {profile.targetFocusSize} target</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Themes</p>
          <p className="text-sm font-semibold text-slate-800">{profile.preferredThemes.length} selected</p>
        </div>
      </div>
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)

  const items      = useVocabStore((s) => s.items)
  const logUsage   = useVocabStore((s) => s.logUsage)
  const focusItems = useWeeklyFocusItems()
  // SRS review items (review.nextReviewAt, distinct from Challenge nextChallengeDate)
  const dueItems   = useDueItems()

  const { themes, addTheme }                                        = useThemesStore()
  const { lastChallengeDate, challengeCompletions, streakDays }     = useGamificationStore()

  // useThemeAutoAssign must remain at component level — React hook, not conditional
  const { trigger, processingTheme } = useThemeAutoAssign()

  /** Create theme then immediately run AI word assignment */
  function handleActivateTheme(name: string) {
    addTheme(name)
    void trigger(name)
  }

  // ── Derived values ──

  const { dueForChallenge, sessionDoneToday, suggestedSize } = useMemo(
    () => getTodaySessionState(items, lastChallengeDate),
    [items, lastChallengeDate],
  )

  // Capped count used consistently in CTA, health strip, and nudge (Fix 3)
  const visibleDueCount = Math.min(dueForChallenge, CHALLENGE_SESSION_CAP)

  // True total — not capped by display limit (Fix 2)
  const almostMasteredCount = useMemo(() => getAlmostMasteredCount(items), [items])
  // Display list — capped at 4 rows for the strip UI
  const almostMasteredItems = useMemo(() => getAlmostMasteredItems(items, 4), [items])

  const focusConf = useMemo(() => getFocusConfidenceSummary(focusItems), [focusItems])

  const nudge = useMemo(
    () => getTodayNudge(focusItems, sessionDoneToday, visibleDueCount, almostMasteredCount),
    [focusItems, sessionDoneToday, visibleDueCount, almostMasteredCount],
  )

  const { percentComplete } = useMemo(() => getGoalMomentum(items), [items])

  const themeStats = useMemo<ThemeStat[]>(
    () =>
      themes.map((theme) => {
        const themeItems = items.filter((i) => (i.themes ?? []).includes(theme))
        return {
          name:     theme,
          total:    themeItems.length,
          mastered: themeItems.filter((i) => getCanonicalLevel(i) >= 3).length,
        }
      }),
    [themes, items],
  )

  const isEmpty = items.length === 0

  // ── Handlers ──

  function handleLogUsed(id: string) {
    // NO AI — direct store write
    void logUsage(id, {
      usedAt:  new Date().toISOString(),
      context: 'conversation',
      note:    'Logged from Today page',
    })
  }

  // ── Render ──

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">

      {/* 1. Compact header */}
      <TodayHeader
        greeting={getGreeting()}
        dateLabel={getTodayLabel()}
      />

      {/* Quick-add shortcut row */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={14} />
          Add word
        </button>
        <button
          onClick={() => navigate('/themes')}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
        >
          <Layers size={14} />
          Focus areas
        </button>
        {/* Streak — Fix 1: Flame icon, hidden when zero */}
        {streakDays > 0 && (
          <div className="flex items-center gap-1 ml-auto text-xs text-slate-500">
            <Flame size={12} className="text-amber-500" />
            {streakDays}d streak
          </div>
        )}
      </div>

      {/* 2. Challenge CTA */}
      <TodaySessionCard
        dueCount={visibleDueCount}
        sessionDoneToday={sessionDoneToday}
        redCount={focusConf.red}
        suggestedSize={suggestedSize}
        onChallenge={() => navigate('/challenge')}
        onFocus={() => navigate('/focus')}
      />

      {/* 3. Subtle SRS review chip — Fix 5: restores the review path */}
      <ReviewChip
        reviewCount={dueItems.length}
        onNavigate={() => navigate('/review')}
      />

      {/* 4. Health strip */}
      <TodayHealthStrip
        dueCount={visibleDueCount}
        redCount={focusConf.red}
        almostCount={almostMasteredCount}
        percentComplete={percentComplete}
        onChallenge={() => navigate('/challenge')}
        onFocus={() => navigate('/focus')}
        onProgress={() => navigate('/progress')}
      />

      {/* 5. Nudge card */}
      <TodayNudgeCard
        text={nudge.text}
        action={nudge.action}
        actionLabel={nudge.actionLabel}
      />

      {/* 6. Almost-mastered strip (conditional) */}
      <AlmostMasteredStrip
        items={almostMasteredItems}
        onNavigate={() => navigate('/focus')}
        onLogUsed={handleLogUsed}
      />

      {/* 7. My Current Focus preview */}
      <TodayFocusPreview onNavigate={() => navigate('/focus')} />

      {/* 8. Focus Areas (themes) */}
      <FocusAreasPreview
        themeStats={themeStats}
        onNavigateToTheme={(theme) => navigate(`/library?theme=${encodeURIComponent(theme)}`)}
        onManageThemes={() => navigate('/themes')}
        onAddTheme={handleActivateTheme}
        processingTheme={processingTheme}
      />

      {/* 9. Starter packs — only in empty / onboarding state */}
      {isEmpty && <StarterPacksSection showAll={false} />}

      {/* 10. How learning works — collapsed for experienced users */}
      <HowItWorks defaultExpanded={challengeCompletions < 3} />

      {/* 11. Learning profile summary */}
      {onOpenOnboarding && (
        <LearningProfileCard onAdjust={onOpenOnboarding} />
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
