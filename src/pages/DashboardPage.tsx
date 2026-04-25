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
  ChevronRight, TrendingUp, Sparkles, GraduationCap, Layers, Loader2,
} from 'lucide-react'
import { useVocabStore, useDueItems } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useThemeAutoAssign } from '@/hooks/useThemeAutoAssign'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { isDueChallengeNow } from '@/lib/challengeSchedule'
import { QuickAddModal } from '@/components/QuickAddModal'
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
          Build your personal<br className="hidden sm:block" /> English system
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
  onReview,
  onChallenge,
}: {
  dueCount: number
  challengeCount: number
  challengeDoneToday: boolean
  onReview: () => void
  onChallenge: () => void
}) {
  const allDone = challengeDoneToday && dueCount === 0

  if (allDone) {
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
}: {
  name: string
  total: number
  mastered: number
  onNavigate: () => void
}) {
  const pct   = total > 0 ? Math.round((mastered / total) * 100) : 0
  const emoji = THEME_EMOJI[name] ?? '📌'

  return (
    <button
      onClick={onNavigate}
      className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col hover:border-brand-200 hover:shadow-sm transition-all group"
    >
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
      <div className="mt-auto w-full">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span className="text-slate-400">{pct}% mastered</span>
          <span className="flex items-center gap-0.5 text-brand-500 font-semibold group-hover:underline">
            Open <ChevronRight size={10} />
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? Math.max(pct, 3) : 0}%` }}
          />
        </div>
      </div>
    </button>
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

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage() {
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

  const todayKey = new Date().toISOString().slice(0, 10)
  const challengeDoneToday = lastChallengeDate === todayKey

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
        action: '/inbox',
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
      return {
        text: `${challengeDueCount} words are ready for your Daily Challenge. Completing today's session keeps your learning streak strong.`,
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
        challengeCount={challengeDueCount}
        challengeDoneToday={challengeDoneToday}
        onReview={() => navigate('/review')}
        onChallenge={() => navigate('/challenge')}
      />

      {/* 3. Today's Focus (cockpit) */}
      <TodaysFocusPanel
        dueCount={dueItems.length}
        nextDueWord={nextDueWord}
        challengeCount={challengeDueCount}
        challengeDoneToday={challengeDoneToday}
        onReview={() => navigate('/review')}
        onChallenge={() => navigate('/challenge')}
      />

      {/* 4. Focus Areas */}
      <FocusAreasPreview
        themeStats={themeStats}
        onNavigateToTheme={(theme) => navigate(`/library?theme=${encodeURIComponent(theme)}`)}
        onManageThemes={() => navigate('/themes')}
        onAddTheme={handleActivateTheme}
        processingTheme={processingTheme}
      />

      {/* 5. Progress */}
      <ProgressSummaryCard
        streak={streak}
        masteredCount={masteredCount}
        usesThisWeek={usesThisWeek}
        totalCount={items.length}
      />

      {/* 6. AI Insight */}
      <AIInsightCard insight={insight} />

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
