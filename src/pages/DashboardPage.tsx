/**
 * DashboardPage — ESE Main
 *
 * Sections (top→bottom):
 *  1. TodayHeader              — compact greeting + date
 *  2. Quick-action bar         — Add Word + streak
 *  3. ChallengeLauncherSection — Standard / Deep Practice CTAs + resume prompt
 *  4. LearningSnapshotStrip    — 4 high-level stats (library · learning · focus · progress)
 *  5. ReviewChip               — subtle "X due for review" when SRS items exist
 *  6. TodayNudgeCard           — contextual nudge (no "AI" label)
 *  7. GamesSection             — optional practice games (feature-flagged)
 *  8. AlmostMasteredStrip      — well-drilled words needing real-life use (conditional)
 *  9. FocusSetupSection        — Quick fill + By theme builder
 * 10. HowItWorks               — collapsible pipeline explainer
 * 11. LearningProfileCard      — profile summary + adjust link
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRACTICE_MODE_KEY, loadTodaySession } from '@/lib/challengeSession'
import {
  Plus, Flame,
  ChevronRight, ChevronDown,
  SlidersHorizontal, TrendingUp,
  Gamepad2,
} from 'lucide-react'
import { useVocabStore, useDueItems, useWeeklyFocusItems } from '@/store/vocabStore'
import { useGamificationStore } from '@/store/gamificationStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { CHALLENGE_SESSION_CAP } from '@/lib/constants'
import { QuickAddModal } from '@/components/QuickAddModal'
import { StarterPacksSection } from '@/components/StarterPacksSection'
import { usagePoints } from '@/lib/mastery'
import {
  getTodaySessionState,
  getAlmostMasteredCount,
  getAlmostMasteredItems,
  getTodayNudge,
  getGoalMomentum,
} from '@/lib/todayLogic'
import { GOAL_LABELS, INTENSITY_CONFIG } from '@/types/profile'
import type { VocabItem } from '@/types/vocabulary'

const ESE_GAME_EXPERIMENT_ROUTE = '/__experiments/ese-game'

const isEseGameExperimentEnabled =
  import.meta.env.VITE_ENABLE_ESE_GAME_EXPERIMENT === 'true'

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

// ── TodayHeader ───────────────────────────────────────────────────────────────

function TodayHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <div className="flex items-baseline justify-between mb-5">
      <h1 className="text-xl font-bold text-slate-900">{greeting}</h1>
      <span className="text-xs text-slate-400">{dateLabel}</span>
    </div>
  )
}

// ── ChallengeLauncherSection ──────────────────────────────────────────────────
// Two-card launcher: Standard Challenge + Deep Practice.
// Shows a resume prompt when a session is in progress.

function ChallengeLauncherSection({
  dueCount,
  sessionDoneToday,
  onChallenge,
}: {
  dueCount: number
  sessionDoneToday: boolean
  onChallenge: (mode: 'standard' | 'deep') => void
}) {
  const session   = loadTodaySession()
  const hasResume = session !== null && !session.completed && session.currentIndex > 0

  return (
    <section className="mb-5">
      {hasResume && session && (
        <div className="mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <div>
            <p className="text-xs font-bold text-amber-800 leading-none">Session in progress</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Word {session.currentIndex} of {session.slots.length}
            </p>
          </div>
          <button
            onClick={() => onChallenge(session.practiceMode ?? 'standard')}
            className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
          >
            Resume <ChevronRight size={12} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Standard Challenge */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 p-4 flex flex-col shadow-sm">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
          <p className="text-brand-200 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
            Daily Challenge
          </p>
          <p className="text-white font-bold text-sm mb-0.5 relative z-10">
            {dueCount > 0
              ? `${dueCount} word${dueCount !== 1 ? 's' : ''} ready`
              : sessionDoneToday
              ? 'Done for today'
              : 'Keep going'}
          </p>
          <p className="text-brand-200 text-[10px] mb-3 flex-1 relative z-10">
            Spaced recall · ~5 min
          </p>
          <button
            onClick={() => onChallenge('standard')}
            className="w-full py-2 bg-white text-brand-700 rounded-xl font-bold text-xs hover:bg-brand-50 transition-colors relative z-10"
          >
            {sessionDoneToday ? 'Review again' : 'Start'}
          </button>
        </div>

        {/* Deep Practice */}
        <div className="relative rounded-2xl overflow-hidden bg-indigo-700 p-4 flex flex-col shadow-sm">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
          <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">
            Deep Practice
          </p>
          <p className="text-white font-bold text-sm mb-0.5 relative z-10">1 word · 1 minute</p>
          <p className="text-indigo-200 text-[10px] mb-3 flex-1 relative z-10">
            Think before you answer
          </p>
          <button
            onClick={() => onChallenge('deep')}
            className="w-full py-2 bg-white/20 border border-white/30 text-white rounded-xl font-bold text-xs hover:bg-white/30 transition-colors relative z-10"
          >
            Start
          </button>
        </div>
      </div>
    </section>
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

// ── LearningSnapshotStrip ────────────────────────────────────────────────────
// 4 high-level stat pills: library · learning · in focus · progress

function LearningSnapshotStrip({
  librarySize,
  activelyLearning,
  focusSize,
  percentComplete,
  onLibrary,
  onFocus,
  onProgress,
}: {
  librarySize: number
  activelyLearning: number
  focusSize: number
  percentComplete: number
  onLibrary: () => void
  onFocus: () => void
  onProgress: () => void
}) {
  const pills = [
    { value: String(librarySize),      label: 'library',  onClick: onLibrary  },
    { value: String(activelyLearning), label: 'learning', onClick: onFocus    },
    { value: String(focusSize),        label: 'in focus', onClick: onFocus    },
    { value: `${percentComplete}%`,    label: 'progress', onClick: onProgress },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {pills.map((pill) => (
        <button
          key={pill.label}
          onClick={pill.onClick}
          className="bg-white border border-slate-200 rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 hover:border-brand-200 hover:bg-brand-50/30 transition-all"
        >
          <span className="text-base font-extrabold leading-none text-slate-700">
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

// ── FocusSetupSection ─────────────────────────────────────────────────────────
// Two-card section: "Quick fill" (auto-add from library) + "By theme" (→ /themes).

function FocusSetupSection({
  onQuickFill,
  onManageThemes,
}: {
  onQuickFill: () => void
  onManageThemes: () => void
}) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Build your Focus</h2>
          <p className="text-xs text-slate-500 mt-0.5">Choose how to fill your Focus Portfolio</p>
        </div>
        <button
          onClick={onManageThemes}
          className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
        >
          Manage all <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col hover:border-brand-200 hover:shadow-sm transition-all">
          <span className="text-2xl mb-2">🎲</span>
          <p className="text-sm font-bold text-slate-900 mb-1">Quick fill</p>
          <p className="text-xs text-slate-500 leading-snug flex-1 mb-3">
            Auto-select the best words from your Library
          </p>
          <button
            onClick={onQuickFill}
            className="w-full py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors"
          >
            Build my Focus
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col hover:border-brand-200 hover:shadow-sm transition-all">
          <span className="text-2xl mb-2">🎯</span>
          <p className="text-sm font-bold text-slate-900 mb-1">By theme</p>
          <p className="text-xs text-slate-500 leading-snug flex-1 mb-3">
            Choose focus areas that match your goals
          </p>
          <button
            onClick={onManageThemes}
            className="w-full py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors"
          >
            Choose themes
          </button>
        </div>
      </div>
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
    description: 'Add words from work, reading, or conversations. Build your personal Library.',
    howTo: 'Tap + Add or Quick Add',
    href: '/library',
  },
  {
    emoji: '⚡',
    label: 'Challenge',
    badge: 'Daily practice',
    badgeCls: 'bg-blue-100 text-blue-700',
    cardBorder: 'border-blue-200 hover:border-blue-300',
    actionCls: 'text-blue-600',
    description: 'Daily Challenge sessions build recall through spaced repetition. Short, adaptive, effective.',
    howTo: 'Start a Challenge here',
    href: '/challenge',
  },
  {
    emoji: '💬',
    label: 'Use it',
    badge: 'Focus',
    badgeCls: 'bg-amber-100 text-amber-700',
    cardBorder: 'border-amber-200 hover:border-amber-300',
    actionCls: 'text-amber-600',
    description: 'Use the word in a real conversation or message. Log it with one tap.',
    howTo: 'Tap "+ I used it" anywhere',
    href: '/focus',
  },
  {
    emoji: '🏆',
    label: 'Mastered',
    badge: 'Complete',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    cardBorder: 'border-emerald-200 hover:border-emerald-300',
    actionCls: 'text-emerald-600',
    description: 'Enough challenges and real-life uses? The system marks it mastered automatically.',
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
          <h2 className="text-base font-bold text-slate-900">How it works</h2>
          <p className="text-xs text-slate-500 mt-0.5">From new word to fluent, natural use</p>
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
              <p className="text-sm font-semibold text-slate-800 leading-snug">Personalise my learning</p>
              <p className="text-xs text-slate-400 mt-0.5">Your goals, your focus — adapted to you</p>
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

function BetaBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
      Beta
    </span>
  )
}

function GamesSection() {
  if (!isEseGameExperimentEnabled) {
    return null
  }

  return (
    <section className="mb-6">
      <div className="mb-1.5 flex items-center gap-2">
        <h2 className="text-base font-bold text-slate-900">Practice games</h2>
        <BetaBadge />
      </div>
      <p className="mb-3 text-xs text-slate-400 leading-relaxed">
        Optional drills to reinforce vocabulary outside the main Challenge sessions — playing here does not replace your daily challenges.
      </p>

      <a
        href={ESE_GAME_EXPERIMENT_ROUTE}
        className="group flex min-h-[92px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50/30 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
            <Gamepad2 size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">ESE Learning System</p>
              <BetaBadge />
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              Strengthen meaning recognition through sentence repair, phrase upgrade, and recall challenges.
            </p>
            <p className="mt-1.5 text-xs font-medium text-teal-600">
              +1 exposure per correct answer · capped at 3 words per game
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 self-start text-xs font-semibold text-teal-700 transition-colors group-hover:text-teal-800 sm:self-center">
          Open
          <ChevronRight size={13} aria-hidden="true" />
        </span>
      </a>
    </section>
  )
}

export function DashboardPage({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)

  const items            = useVocabStore((s) => s.items)
  const logUsage         = useVocabStore((s) => s.logUsage)
  const setFocusThisWeek = useVocabStore((s) => s.setFocusThisWeek)
  const focusItems       = useWeeklyFocusItems()
  const dueItems         = useDueItems()

  const { lastChallengeDate, challengeCompletions, streakDays } = useGamificationStore()

  // ── Derived values ──

  const { dueForChallenge, sessionDoneToday } = useMemo(
    () => getTodaySessionState(items, lastChallengeDate),
    [items, lastChallengeDate],
  )

  const visibleDueCount = Math.min(dueForChallenge, CHALLENGE_SESSION_CAP)

  const almostMasteredCount = useMemo(() => getAlmostMasteredCount(items), [items])
  const almostMasteredItems = useMemo(() => getAlmostMasteredItems(items, 4), [items])

  const nudge = useMemo(
    () => getTodayNudge(focusItems, sessionDoneToday, visibleDueCount, almostMasteredCount),
    [focusItems, sessionDoneToday, visibleDueCount, almostMasteredCount],
  )

  const { percentComplete } = useMemo(() => getGoalMomentum(items), [items])

  const activelyLearningCount = useMemo(
    () => items.filter((i) => (i.exposureCount ?? 0) > 0 && i.status !== 'mastered').length,
    [items],
  )

  const isEmpty = items.length === 0

  // ── Handlers ──

  function handleLogUsed(id: string) {
    void logUsage(id, {
      usedAt:  new Date().toISOString(),
      context: 'conversation',
      note:    'Logged from Main page',
    })
  }

  function handleQuickFillFocus() {
    const notInFocus = items
      .filter((i) => !i.inFocus && i.status !== 'mastered')
      .sort((a, b) => (b.exposureCount ?? 0) - (a.exposureCount ?? 0))
      .slice(0, 15)
    notInFocus.forEach((i) => setFocusThisWeek(i.id, true))
    navigate('/focus')
  }

  // ── Render ──

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">

      {/* 1. Compact header */}
      <TodayHeader
        greeting={getGreeting()}
        dateLabel={getTodayLabel()}
      />

      {/* 2. Quick-action bar: Add Word + streak */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={14} />
          Add word
        </button>
        {streakDays > 0 && (
          <div className="flex items-center gap-1 ml-auto text-xs text-slate-500">
            <Flame size={12} className="text-amber-500" />
            {streakDays}d streak
          </div>
        )}
      </div>

      {/* 3. Challenge Launcher */}
      <ChallengeLauncherSection
        dueCount={visibleDueCount}
        sessionDoneToday={sessionDoneToday}
        onChallenge={(mode) => {
          localStorage.setItem(PRACTICE_MODE_KEY, mode)
          navigate('/challenge')
        }}
      />

      {/* 4. Learning Snapshot — high-level stats */}
      <LearningSnapshotStrip
        librarySize={items.length}
        activelyLearning={activelyLearningCount}
        focusSize={focusItems.length}
        percentComplete={percentComplete}
        onLibrary={() => navigate('/library')}
        onFocus={() => navigate('/focus')}
        onProgress={() => navigate('/progress')}
      />

      {/* 5. Subtle SRS review chip */}
      <ReviewChip
        reviewCount={dueItems.length}
        onNavigate={() => navigate('/review')}
      />

      {/* 6. Nudge card */}
      <TodayNudgeCard
        text={nudge.text}
        action={nudge.action}
        actionLabel={nudge.actionLabel}
      />

      {/* 7. Practice games (feature-flagged) */}
      <GamesSection />

      {/* 8. Almost-mastered strip (conditional) */}
      <AlmostMasteredStrip
        items={almostMasteredItems}
        onNavigate={() => navigate('/focus')}
        onLogUsed={handleLogUsed}
      />

      {/* 9. Focus Portfolio builder */}
      {!isEmpty && (
        <FocusSetupSection
          onQuickFill={handleQuickFillFocus}
          onManageThemes={() => navigate('/themes')}
        />
      )}

      {/* 10. Starter packs — only in empty / onboarding state */}
      {isEmpty && <StarterPacksSection showAll={false} />}

      {/* 11. How it works — collapsed for experienced users */}
      <HowItWorks defaultExpanded={challengeCompletions < 3} />

      {/* 12. Learning profile summary */}
      {onOpenOnboarding && (
        <LearningProfileCard onAdjust={onOpenOnboarding} />
      )}

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
