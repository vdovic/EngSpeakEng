/**
 * DashboardPage — ESE Home
 *
 * Sections (top→bottom):
 *  1. HomeHero          — large headline + PersonalizationVisual
 *  2. LearningCtaCard   — purple gradient, primary learning CTA
 *  3. TodaysFocusPanel  — two-column daily cockpit (review + challenge)
 *  4. FocusAreasPreview — real theme cards, or suggested starter cards
 *  5. ProgressSummaryCard — horizontal streak / mastered / uses / total
 *  6. AIInsightCard     — contextual AI-powered insight
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Flame, BookOpen, RefreshCw, Zap, Trophy,
  ChevronRight, TrendingUp, Sparkles, GraduationCap, Layers, Loader2, ChevronDown, SlidersHorizontal, Target, CheckCircle2,
} from 'lucide-react'
import { useVocabStore, useDueItems, useWeeklyFocusItems } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemeAutoAssign } from '@/hooks/useThemeAutoAssign'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { isDueChallengeNow } from '@/lib/challengeSchedule'
import { CHALLENGE_SESSION_CAP } from '@/lib/constants'
import { todayDateKey } from '@/lib/dateUtils'
import { QuickAddModal } from '@/components/QuickAddModal'
import { StarterPacksSection } from '@/components/StarterPacksSection'
import { subDays, startOfDay, isWithinInterval } from 'date-fns'

// ── Module-level constants ─────────────────────────────────────────────────────

/** Emoji map built once from SUGGESTED_THEMES at module load */
const THEME_EMOJI: Record<string, string> = Object.fromEntries(
  SUGGESTED_THEMES.map((s) => [s.name, s.emoji]),
)

/** Default topics shown in the hero visual before the user creates any themes */
const VISUAL_DEFAULT_TOPICS = [
  { name: 'Business Analysis',  emoji: '📊' },
  { name: 'Presentations',      emoji: '🎤' },
  { name: 'Casual Talk',        emoji: '☕' },
  { name: 'Email Writing',      emoji: '✉️' },
  { name: 'Product Management', emoji: '🗺️' },
  { name: 'Interviews',         emoji: '🤝' },
]

/** Three suggested starter focus areas (always non-empty — names match SUGGESTED_THEMES) */
const STARTER_SUGGESTIONS = SUGGESTED_THEMES.filter((s) =>
  ['Business & Professional', 'Everyday Conversation', 'Written Communication'].includes(s.name),
)

// ── Types ─────────────────────────────────────────────────────────────────────

type VocabItems = ReturnType<typeof useVocabStore.getState>['items']

interface ThemeStat { name: string; total: number; mastered: number }
interface Insight    { text: string; action: string | null; actionLabel: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function calcStreak(items: VocabItems): number {
  const logs = items.flatMap((i) => i.activation.usageLogs)
  const today = startOfDay(new Date())
  let streak = 0
  for (let d = 0; d < 30; d++) {
    const day  = subDays(today, d)
    const next = subDays(today, d - 1)
    const active = logs.some((l) =>
      isWithinInterval(new Date(l.usedAt), { start: day, end: next }),
    )
    if (active) streak++
    else if (d > 0) break
  }
  return streak
}

// ── PersonalizationVisual ─────────────────────────────────────────────────────
// Dark-panel "system diagram" that communicates configurability

function PersonalizationVisual({ themes }: { themes: string[] }) {
  const topics =
    themes.length > 0
      ? themes.slice(0, 6).map((n) => ({ name: n, emoji: THEME_EMOJI[n] ?? '📌' }))
      : VISUAL_DEFAULT_TOPICS

  return (
    <div
      className="relative rounded-3xl overflow-hidden bg-slate-900 flex flex-col gap-3 p-6"
      style={{ minHeight: '250px' }}
    >
      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-6 right-6  w-32 h-32 rounded-full bg-brand-600/30  blur-3xl pointer-events-none" />
      <div className="absolute bottom-4 left-6 w-24 h-24 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

      {/* Header badge — "Your English System" */}
      <div className="relative z-10 flex items-start">
        <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 backdrop-blur-sm">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shrink-0">
            <GraduationCap size={13} className="text-white" />
          </div>
          <div>
            <p className="text-white text-[11px] font-bold leading-none">Your English System</p>
            <p className="text-white/50 text-[9px] mt-0.5">Personalized for you</p>
          </div>
        </div>
      </div>

      {/* Connector dots */}
      <div className="relative z-10 flex items-center gap-1.5">
        <div className="flex-1 h-px bg-white/10" />
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
        </div>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Topic chips */}
      <div className="relative z-10 flex flex-wrap gap-1.5 flex-1">
        {topics.map((t) => (
          <span
            key={t.name}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/10 border border-white/[0.12] rounded-xl text-[11px] font-medium text-white/80"
          >
            <span>{t.emoji}</span>
            {t.name}
          </span>
        ))}
      </div>

      {/* Footer label */}
      <p className="relative z-10 text-[10px] text-white/25 leading-tight">
        You choose what matters — ESE adapts the rest
      </p>
    </div>
  )
}

// ── HomeHero ──────────────────────────────────────────────────────────────────

function HomeHero({
  greeting,
  themes,
  onAdd,
  onManageFocus,
}: {
  greeting: string
  themes: string[]
  onAdd: () => void
  onManageFocus: () => void
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 mb-8 items-center">

      {/* ── Left: text ── */}
      <div className="lg:col-span-3">
        {/* Greeting + product badge */}
        <p className="text-sm font-semibold text-brand-600 mb-2">{greeting}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-100 rounded-full mb-4">
          <Sparkles size={11} className="text-brand-600" />
          <span className="text-xs font-semibold text-brand-700 tracking-wide">Personalized English · ESE</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-3">
          Move your vocabulary forward
        </h1>

        {/* Core message */}
        <p className="text-base text-slate-600 leading-relaxed mb-2">
          ESE is a personalized vocabulary system for mastering advanced English —
          from intermediate to near-native.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Choose what matters by role, context, or goal. ESE adapts your learning
          so you retain and use new language effectively.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add word
          </button>
          <button
            onClick={onManageFocus}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            <Layers size={15} />
            Focus areas
          </button>
        </div>
      </div>

      {/* ── Right: personalization visual ── */}
      <div className="lg:col-span-2">
        <PersonalizationVisual themes={themes} />
      </div>
    </section>
  )
}

// ── LearningCtaCard ───────────────────────────────────────────────────────────

function LearningCtaCard({
  dueCount,
  challengeCount,
  challengeDoneToday,
  inboxCount,
  onReview,
  onChallenge,
  onInbox,
}: {
  dueCount: number
  challengeCount: number
  challengeDoneToday: boolean
  inboxCount: number
  onReview: () => void
  onChallenge: () => void
  onInbox: () => void
}) {
  const sessionsDone = challengeDoneToday && dueCount === 0

  // Sessions done but words still sitting in Inbox → redirect to activate more
  if (sessionsDone && inboxCount > 0) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-700 p-6 mb-6 shadow-md">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
        <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-1">
          Today's sessions done ✓
        </p>
        <h2 className="text-2xl font-bold text-white mb-1.5">
          {inboxCount.toLocaleString()} word{inboxCount !== 1 ? 's' : ''} waiting in Inbox
        </h2>
        <p className="text-violet-200 text-sm mb-4">
          You've finished today's Review and Challenge. Activate more words to keep growing.
        </p>
        <button
          onClick={onInbox}
          className="px-5 py-2.5 bg-white text-violet-700 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors shadow-sm"
        >
          Activate words from Inbox →
        </button>
      </div>
    )
  }

  // Truly all done — no inbox backlog either
  if (sessionsDone) {
    return (
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 p-6 mb-6 shadow-md">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
        <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">
          🎉 All done today
        </p>
        <h2 className="text-2xl font-bold text-white mb-1">You're all caught up!</h2>
        <p className="text-sm text-emerald-100">
          Great consistency. Come back tomorrow to keep your streak alive.
        </p>
      </div>
    )
  }

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-violet-700 p-6 mb-6 shadow-md">
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-8  -left-8  w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        {/* Text */}
        <div className="flex-1">
          <p className="text-brand-200 text-xs font-bold uppercase tracking-widest mb-1">
            Ready to learn?
          </p>
          <h2 className="text-2xl font-bold text-white mb-1.5">
            {dueCount > 0
              ? `${dueCount} word${dueCount !== 1 ? 's' : ''} ready for review`
              : 'Keep your momentum going'}
          </h2>
          <p className="text-brand-200 text-sm">
            {challengeCount > 0
              ? `+ ${challengeCount} word${challengeCount !== 1 ? 's' : ''} in today's challenge`
              : challengeDoneToday
              ? 'Challenge complete for today ✓'
              : 'Daily Challenge available'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 shrink-0">
          {dueCount > 0 && (
            <button
              onClick={onReview}
              className="px-5 py-2.5 bg-white text-brand-700 rounded-xl font-bold text-sm hover:bg-brand-50 transition-colors shadow-sm whitespace-nowrap"
            >
              Continue learning
            </button>
          )}
          <button
            onClick={onChallenge}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
              dueCount > 0
                ? 'bg-white/15 text-white hover:bg-white/25 border border-white/25'
                : 'bg-white text-brand-700 hover:bg-brand-50 shadow-sm'
            }`}
          >
            {challengeDoneToday ? 'Review again' : 'Daily Challenge'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TodaysFocusPanel ──────────────────────────────────────────────────────────

function TodaysFocusPanel({
  dueCount,
  nextDueWord,
  challengeCount,
  challengeDoneToday,
  onReview,
  onChallenge,
}: {
  dueCount: number
  nextDueWord: string | null
  challengeCount: number
  challengeDoneToday: boolean
  onReview: () => void
  onChallenge: () => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
        Today's Focus
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* ── Column 1: Review ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Review</p>
              <p className="text-xs text-slate-500">
                {dueCount === 0
                  ? 'All caught up!'
                  : `${dueCount} word${dueCount !== 1 ? 's' : ''} due today`}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
              Next word
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {nextDueWord
                ? `"${nextDueWord}"`
                : dueCount === 0
                ? 'No words due right now'
                : 'Start to reveal the first word'}
            </p>
          </div>

          <button
            onClick={onReview}
            className="py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            {dueCount > 0 ? 'Start review' : 'Browse vocabulary'}
          </button>
        </div>

        {/* ── Mobile divider ── */}
        <div className="sm:hidden h-px bg-slate-100" />

        {/* ── Column 2: Today's Training ── */}
        <div className="flex flex-col gap-3 sm:border-l sm:border-slate-100 sm:pl-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              challengeDoneToday ? 'bg-emerald-100' : 'bg-brand-100'
            }`}>
              {challengeDoneToday
                ? <Trophy size={18} className="text-emerald-600" />
                : <Zap    size={18} className="text-brand-600"   />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Today's Training</p>
              <p className="text-xs text-slate-500">
                {challengeDoneToday
                  ? 'Done today ✓'
                  : `${challengeCount} word${challengeCount !== 1 ? 's' : ''} ready`}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
              Source
            </p>
            <p className="text-sm font-semibold text-slate-800">From your focus areas</p>
          </div>

          <button
            onClick={onChallenge}
            disabled={challengeDoneToday}
            className="py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-default"
          >
            {challengeDoneToday ? 'Done for today ✓' : 'Start challenge'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Focus Areas ───────────────────────────────────────────────────────────────

/** Shown when the user has no focus areas yet */
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

/** Shown when real focus area (theme) exists */
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
        /* No words yet — offer AI assignment */
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
        /* Has words — show progress bar and open link */
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
          <h2 className="text-lg font-bold text-slate-900">Focus Areas</h2>
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
          /* Suggested starter cards */
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
            {/* Add area card — shown when fewer than 3 themes */}
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

// ── ProgressSummaryCard ───────────────────────────────────────────────────────

function ProgressSummaryCard({
  streak,
  masteredCount,
  usesThisWeek,
  totalCount,
}: {
  streak: number
  masteredCount: number
  usesThisWeek: number
  totalCount: number
}) {
  const stats = [
    {
      icon: <Flame size={18} className={streak > 0 ? 'text-amber-500' : 'text-slate-300'} />,
      bg:   streak > 0 ? 'bg-amber-100' : 'bg-slate-100',
      value: streak,
      label: 'day streak',
    },
    {
      icon:  <Trophy size={18} className="text-emerald-600" />,
      bg:    'bg-emerald-100',
      value: masteredCount,
      label: 'words mastered',
    },
    {
      icon:  <TrendingUp size={18} className="text-blue-600" />,
      bg:    'bg-blue-100',
      value: usesThisWeek,
      label: 'real-life uses / wk',
    },
    {
      icon:  <BookOpen size={18} className="text-slate-500" />,
      bg:    'bg-slate-100',
      value: totalCount,
      label: 'total words',
    },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
        Your Progress
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {stats.map(({ icon, bg, value, label }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${bg}`}>
              {icon}
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 leading-none">{value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AIInsightCard ─────────────────────────────────────────────────────────────

function AIInsightCard({ insight }: { insight: Insight }) {
  const navigate = useNavigate()

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-700 via-brand-700 to-indigo-800 p-6 shadow-md">
      {/* Decorative shapes */}
      <div className="absolute -top-6   -right-6  w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
      <div className="absolute -bottom-4 -left-4  w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
            AI Insight
          </p>
        </div>

        {/* Insight text */}
        <p className="text-white text-sm leading-relaxed mb-4">{insight.text}</p>

        {/* CTA or fallback note */}
        {insight.action ? (
          <button
            onClick={() => navigate(insight.action!)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/25 transition-colors"
          >
            {insight.actionLabel}
            <ChevronRight size={13} />
          </button>
        ) : (
          <p className="text-white/40 text-xs leading-relaxed">
            ESE will surface more personalized insights as you build your vocabulary system.
          </p>
        )}
      </div>
    </div>
  )
}

// ── FocusThisWeekPreview ──────────────────────────────────────────────────────

function FocusThisWeekPreview({ onNavigate }: { onNavigate: () => void }) {
  const focusItems = useWeeklyFocusItems()
  const FOCUS_MAX = 50

  // Always show — if empty, show an enticing CTA
  const preview = focusItems.slice(0, 5)
  const usedCount = focusItems.filter((i) => i.activation.usageLogs.length >= 3).length

  return (
    <section className="mb-8">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Target size={16} className="text-amber-500" />
            My Current Focus
          </h2>
          {focusItems.length > 0 ? (
            <p className="text-xs text-slate-500 mt-0.5">
              {focusItems.length} / {FOCUS_MAX} words · {usedCount} used 3× this week
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              Words the system selected for you to use this week
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
        /* Empty state — still shows the section, invites action */
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
              const uses = item.activation.usageLogs.length
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

// ── HowItWorks ────────────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '📥',
    label: 'Capture',
    badge: 'Inbox',
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
    description: 'Activate new words from Vocabulary. They enter spaced-repetition Review and the Daily Challenge pool.',
    howTo: 'Tap "Learning" on any new word',
    href: '/review',
  },
  {
    emoji: '💬',
    label: 'Use it',
    badge: 'In the wild',
    badgeCls: 'bg-amber-100 text-amber-700',
    cardBorder: 'border-amber-200 hover:border-amber-300',
    actionCls: 'text-amber-600',
    description: 'Speak or write the word in real life. 3 logged uses moves it to the active stage.',
    howTo: 'Tap "+ I used it" on any word',
    href: '/week',
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
    href: '/stats',
  },
] as const

function HowItWorks() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">How learning works</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your path from new word to fluent use</p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {expanded ? 'Less' : 'More detail'}
          <ChevronDown size={12} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 4-step pipeline grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <button
            key={step.label}
            onClick={() => navigate(step.href)}
            className={`text-left border rounded-2xl p-4 bg-white transition-all hover:shadow-sm flex flex-col gap-2 ${step.cardBorder}`}
          >
            {/* Emoji + step number */}
            <div className="flex items-start justify-between">
              <span className="text-2xl leading-none">{step.emoji}</span>
              <span className="text-[10px] font-extrabold text-slate-200 tabular-nums">0{i + 1}</span>
            </div>

            {/* Label + stage badge */}
            <div>
              <p className="font-bold text-sm text-slate-900 mb-1.5">{step.label}</p>
              <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${step.badgeCls}`}>
                {step.badge}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-500 leading-relaxed flex-1">{step.description}</p>

            {/* How-to line */}
            <p className={`text-[10px] font-semibold leading-none ${step.actionCls}`}>
              → {step.howTo}
            </p>
          </button>
        ))}
      </div>

      {/* Expanded: connecting flow explanation */}
      {expanded && (
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">How stages connect</p>
          <div className="space-y-2.5">
            {[
              { from: '📥 Inbox', to: '📖 Learn', how: 'Tap "Learning", "Challenge", or "My Focus" on any inbox word.' },
              { from: '📖 Learn', to: '💬 Use it', how: 'Complete reviews until recalled 3 times. Then tap "+ I used it" when you speak or write the word.' },
              { from: '💬 Use it', to: '🏆 Mastered', how: 'Log 3 real-life uses and write a sentence. ESE advances status automatically.' },
            ].map(({ from, to, how }) => (
              <div key={from} className="flex gap-3 text-xs">
                <span className="shrink-0 font-semibold text-slate-500 w-28 leading-relaxed">{from} → {to}</span>
                <span className="text-slate-500 leading-relaxed">{how}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)

  const items    = useVocabStore((s) => s.items)
  const dueItems = useDueItems()
  const { themes, addTheme } = useThemesStore()
  const { lastChallengeDate } = useGamificationStore()
  const { trigger, processingTheme } = useThemeAutoAssign()

  /** Create theme then immediately run AI word assignment */
  function handleActivateTheme(name: string) {
    addTheme(name)
    void trigger(name)
  }

  // ── Derived values ──

  const masteredCount = items.filter((i) => i.status === 'mastered').length
  const inboxCount   = useMemo(() => items.filter((i) => i.status === 'inbox').length, [items])

  const challengeDueCount = useMemo(
    () => items.filter((i) => isDueChallengeNow(i.exposureCount, i.nextChallengeDate)).length,
    [items],
  )

  const streak = useMemo(() => calcStreak(items), [items])

  const usesThisWeek = useMemo(() => {
    const cutoff = subDays(new Date(), 7)
    return items
      .flatMap((i) => i.activation.usageLogs)
      .filter((l) => new Date(l.usedAt) >= cutoff).length
  }, [items])

  const challengeDoneToday = lastChallengeDate === todayDateKey()

  const themeStats = useMemo<ThemeStat[]>(
    () =>
      themes.map((theme) => {
        const themeItems = items.filter((i) => (i.themes ?? []).includes(theme))
        return {
          name:     theme,
          total:    themeItems.length,
          mastered: themeItems.filter((i) => i.status === 'mastered').length,
        }
      }),
    [themes, items],
  )

  const nextDueWord = dueItems[0]?.term ?? null

  // ── AI Insight logic ──

  const insight = useMemo<Insight>(() => {
    if (items.length === 0) {
      return {
        text: 'Start by adding your first words to build your personal vocabulary system. ESE will adapt to your focus areas as you grow.',
        action: '/library',
        actionLabel: 'Add first words',
      }
    }
    if (dueItems.length >= 8) {
      return {
        text: `You have ${dueItems.length} words waiting for review. A focused 10-minute session will significantly strengthen your long-term retention.`,
        action: '/review',
        actionLabel: 'Start review now',
      }
    }
    const lowMastery = themeStats.find((t) => t.total >= 5 && t.mastered / t.total < 0.3)
    if (lowMastery) {
      return {
        text: `You're focusing on "${lowMastery.name}" — ${lowMastery.total - lowMastery.mastered} words from this area are still in progress. Regular practice builds lasting recall.`,
        action: `/library?theme=${encodeURIComponent(lowMastery.name)}`,
        actionLabel: `Review ${lowMastery.name}`,
      }
    }
    if (challengeDueCount >= 5 && !challengeDoneToday) {
      const capped = Math.min(challengeDueCount, CHALLENGE_SESSION_CAP)
      return {
        text: `${capped} word${capped !== 1 ? 's' : ''} are ready for your Daily Challenge. Completing today's session keeps your learning streak strong.`,
        action: '/challenge',
        actionLabel: 'Start Challenge',
      }
    }
    if (masteredCount > 0) {
      return {
        text: `You've mastered ${masteredCount} word${masteredCount !== 1 ? 's' : ''} so far. Consistent daily review is the most proven path to fluency — keep going.`,
        action: null,
        actionLabel: '',
      }
    }
    return {
      text: 'ESE will surface personalized insights about your vocabulary patterns as you build your learning system.',
      action: null,
      actionLabel: '',
    }
  }, [items, dueItems, themeStats, challengeDueCount, challengeDoneToday, masteredCount])

  // ── Render ──

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-10">

      {/* 1. Hero */}
      <HomeHero
        greeting={getGreeting()}
        themes={themes}
        onAdd={() => setShowAdd(true)}
        onManageFocus={() => navigate('/themes')}
      />

      {/* 2. Primary CTA */}
      <LearningCtaCard
        dueCount={dueItems.length}
        challengeCount={Math.min(challengeDueCount, CHALLENGE_SESSION_CAP)}
        challengeDoneToday={challengeDoneToday}
        inboxCount={inboxCount}
        onReview={() => navigate('/review')}
        onChallenge={() => navigate('/challenge')}
        onInbox={() => navigate('/library')}
      />

      {/* 3. Today's Focus (cockpit) */}
      <TodaysFocusPanel
        dueCount={dueItems.length}
        nextDueWord={nextDueWord}
        challengeCount={Math.min(challengeDueCount, CHALLENGE_SESSION_CAP)}
        challengeDoneToday={challengeDoneToday}
        onReview={() => navigate('/review')}
        onChallenge={() => navigate('/challenge')}
      />

      {/* 3b. How learning works */}
      <HowItWorks />

      {/* 3c. Starter Packs — curated vocabulary packs to import in one click */}
      <StarterPacksSection showAll={false} />

      {/* 4. Focus Areas */}
      <FocusAreasPreview
        themeStats={themeStats}
        onNavigateToTheme={(theme) => navigate(`/library?theme=${encodeURIComponent(theme)}`)}
        onManageThemes={() => navigate('/themes')}
        onAddTheme={handleActivateTheme}
        processingTheme={processingTheme}
      />

      {/* 4b. Focus This Week preview */}
      <FocusThisWeekPreview onNavigate={() => navigate('/week')} />

      {/* 5. Progress */}
      <ProgressSummaryCard
        streak={streak}
        masteredCount={masteredCount}
        usesThisWeek={usesThisWeek}
        totalCount={items.length}
      />

      {/* 6. AI Insight */}
      <AIInsightCard insight={insight} />

      {/* 7. Re-personalise — available for repeat users */}
      {onOpenOnboarding && (
        <div className="mt-6 mb-2">
          <button
            onClick={onOpenOnboarding}
            className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0 group-hover:bg-brand-200 transition-colors">
                <SlidersHorizontal size={16} className="text-brand-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 leading-snug">Personalise my setup</p>
                <p className="text-xs text-slate-400 mt-0.5">Re-run the guided setup to refresh your focus areas</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" />
          </button>
        </div>
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
