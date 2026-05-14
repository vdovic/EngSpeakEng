/**
 * DashboardPage - ESE Main
 *
 * Primary flow:
 *  1. Greeting + Add Word
 *  2. Focus System Setup
 *  3. Daily Practice Launcher
 *  4. Learning Snapshot
 *  5. How Learning Works
 *  6. Personalization
 *  7. Secondary content
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Flame, Gamepad2, Plus, RotateCw, SlidersHorizontal, TrendingUp } from 'lucide-react'
import { clearSession, getUniqueWordProgress, loadTodaySession, PRACTICE_MODE_KEY } from '@/lib/challengeSession'
import { CHALLENGE_SESSION_CAP, MAX_EXPOSURE } from '@/lib/constants'
import { usagePoints } from '@/lib/mastery'
import { getCanonicalLevel } from '@/lib/progressionLogic'
import {
  getAlmostMasteredItems,
  getAlmostMasteredCount,
  getTodayNudge,
  getTodaySessionState,
} from '@/lib/todayLogic'
import { QuickAddModal } from '@/components/QuickAddModal'
import { StarterPacksSection } from '@/components/StarterPacksSection'
import { useGamificationStore } from '@/store/gamificationStore'
import { useDueItems, useVocabStore, useWeeklyFocusItems } from '@/store/vocabStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { GOAL_LABELS, INTENSITY_CONFIG } from '@/types/profile'
import type { VocabItem } from '@/types/vocabulary'

const ESE_GAME_EXPERIMENT_ROUTE = '/__experiments/ese-game'
const isEseGameExperimentEnabled = import.meta.env.VITE_ENABLE_ESE_GAME_EXPERIMENT === 'true'

type FocusCount = 10 | 25 | 50
type FocusKind = 'mixed' | 'words' | 'phrases'

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

function shuffleForUserAction<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function TodayHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <h1 className="text-xl font-bold text-slate-900">{greeting}</h1>
      <span className="text-xs text-slate-400">{dateLabel}</span>
    </div>
  )
}

function FocusSetupSection({
  count,
  kind,
  availableCount,
  personalizeLabel,
  onCountChange,
  onKindChange,
  onRandomReshuffle,
  onPersonalize,
}: {
  count: FocusCount
  kind: FocusKind
  availableCount: number
  personalizeLabel: string
  onCountChange: (count: FocusCount) => void
  onKindChange: (kind: FocusKind) => void
  onRandomReshuffle: () => void
  onPersonalize: () => void
}) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">Focus System Setup</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Focus is your active vocabulary portfolio. These words appear more often in challenges so concentrated practice
          turns library items into usable English.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Portfolio size</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([10, 25, 50] as const).map((value) => (
              <button
                key={value}
                onClick={() => onCountChange(value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  count === value
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Item type</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['mixed', 'Mixed'],
              ['words', 'Words'],
              ['phrases', 'Phrases'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onKindChange(value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  kind === value
                    ? 'border-slate-700 bg-slate-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-900">Random Focus Builder</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Reshuffle from existing library items only. Archived and mastered items are skipped where possible.
          </p>
          <button
            onClick={onRandomReshuffle}
            disabled={availableCount === 0}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCw size={13} />
            Random reshuffle
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-900">Personalized setup</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Answer a few questions so ESE can shape your focus balance, challenge pacing, and vocabulary direction.
          </p>
          <button
            onClick={onPersonalize}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
          >
            {personalizeLabel}
          </button>
        </div>
      </div>
    </section>
  )
}

function ChallengeLauncherSection({
  dueCount,
  sessionDoneToday,
  onChallenge,
  onResume,
  onStartOver,
}: {
  dueCount: number
  sessionDoneToday: boolean
  onChallenge: (mode: 'standard' | 'deep') => void
  onResume: () => void
  onStartOver: (mode: 'standard' | 'deep') => void
}) {
  const session = loadTodaySession()
  const hasResume = session !== null && !session.completed && !session.isBonus
  const progress = session ? getUniqueWordProgress(session.slots, session.currentIndex) : null

  return (
    <section className="mb-5">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">Daily Practice</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Choose how to practise today. Challenges move your vocabulary through structured progression; games give
          lighter reinforcement for the same active words.
        </p>
      </div>

      {hasResume && session && progress && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mb-3">
            <p className="text-sm font-bold text-amber-900">Resume your previous session</p>
            <p className="mt-0.5 text-xs text-amber-700">
              You stopped at word {progress.current} of {progress.total}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onResume}
              className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-800"
            >
              Resume
            </button>
            <button
              onClick={() => onStartOver(session.practiceMode ?? 'standard')}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-200 bg-brand-600 p-4 text-white shadow-sm">
          <p className="text-sm font-bold">Standard Daily Challenge</p>
          <p className="mt-1 min-h-[44px] text-xs leading-relaxed text-brand-100">
            Balanced review and recall practice across your active vocabulary.
          </p>
          <p className="mt-2 text-[10px] font-semibold text-brand-100">
            {dueCount > 0 ? `${dueCount} due now` : sessionDoneToday ? 'Available again' : 'Ready when you are'}
          </p>
          <button
            onClick={() => onChallenge('standard')}
            className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Start Standard Challenge
          </button>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-700 p-4 text-white shadow-sm">
          <p className="text-sm font-bold">Deep Practice · 1m/word</p>
          <p className="mt-1 min-h-[44px] text-xs leading-relaxed text-indigo-100">
            Slow down and explore each word deliberately before answering.
          </p>
          <p className="mt-2 text-[10px] font-semibold text-indigo-100">60 seconds for each word</p>
          <button
            onClick={() => onChallenge('deep')}
            className="mt-3 w-full rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/30"
          >
            Start Deep Practice
          </button>
        </div>
      </div>

      <GamesSection />
    </section>
  )
}

function LearningSnapshotStrip({
  librarySize,
  activelyLearning,
  focusSize,
  overallProgress,
  onLibrary,
  onFocus,
  onProgress,
}: {
  librarySize: number
  activelyLearning: number
  focusSize: number
  overallProgress: number
  onLibrary: () => void
  onFocus: () => void
  onProgress: () => void
}) {
  const cards = [
    { value: String(librarySize), label: 'library', onClick: onLibrary },
    { value: String(activelyLearning), label: 'learning', onClick: onFocus },
    { value: String(focusSize), label: 'in focus', onClick: onFocus },
    { value: `${overallProgress}%`, label: 'progress', onClick: onProgress },
  ]

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-base font-bold text-slate-900">Learning Snapshot</h2>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center transition-all hover:border-brand-200 hover:bg-brand-50/30"
          >
            <span className="block text-base font-extrabold leading-none text-slate-800">{card.value}</span>
            <span className="mt-1 block whitespace-nowrap text-[9px] font-medium leading-none text-slate-400">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ReviewChip({ reviewCount, onNavigate }: { reviewCount: number; onNavigate: () => void }) {
  if (reviewCount === 0) return null
  return (
    <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
      <span className="text-xs text-slate-500">
        {reviewCount} word{reviewCount !== 1 ? 's' : ''} due for review
      </span>
      <button
        onClick={onNavigate}
        className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
      >
        Review <ChevronRight size={11} />
      </button>
    </div>
  )
}

function TodayNudgeCard({ text, action, actionLabel }: { text: string; action: string | null; actionLabel: string }) {
  const navigate = useNavigate()

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50">
        <TrendingUp size={13} className="text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-slate-700">{text}</p>
        {action && (
          <button
            onClick={() => navigate(action)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-800"
          >
            {actionLabel}
            <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

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
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Almost mastered</p>
        <button onClick={onNavigate} className="flex items-center gap-0.5 text-xs font-semibold text-brand-600">
          See all <ChevronRight size={12} />
        </button>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.map((item) => {
          const uses = usagePoints(item.activation.usageLogs)
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{item.term}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {uses}/3 real-life uses · exp {item.exposureCount ?? 0}/8
                </p>
              </div>
              <button
                onClick={() => onLogUsed(item.id)}
                className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-100"
              >
                I used it
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const HOW_IT_WORKS_STEPS = [
  {
    label: 'Repeated exposure',
    badge: 'Library',
    description: 'Vocabulary grows through repeated encounters, not one-off memorization.',
    href: '/library',
  },
  {
    label: 'Focused practice',
    badge: 'Focus',
    description: 'Focus words appear more often so active vocabulary gets concentrated attention.',
    href: '/focus',
  },
  {
    label: 'Confidence and pace',
    badge: 'Challenge',
    description: 'Confidence levels guide difficulty, while Deep Practice · 1m/word supports slower attention.',
    href: '/challenge',
  },
  {
    label: 'Activation',
    badge: 'Progress',
    description: 'Mastery comes from exposure, understanding, and using words in real situations.',
    href: '/progress',
  },
] as const

function HowItWorks({ defaultExpanded }: { defaultExpanded: boolean }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className="mb-6">
      <button onClick={() => setExpanded((e) => !e)} className="mb-3 flex w-full items-center justify-between">
        <div className="text-left">
          <h2 className="text-base font-bold text-slate-900">How Learning Works</h2>
          <p className="mt-0.5 text-xs text-slate-500">From new word to natural use</p>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <button
              key={step.label}
              onClick={() => navigate(step.href)}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-200 hover:shadow-sm"
            >
              <span className="text-[10px] font-extrabold text-slate-200 tabular-nums">0{index + 1}</span>
              <div>
                <p className="mb-1.5 text-sm font-bold text-slate-900">{step.label}</p>
                <span className="inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600">
                  {step.badge}
                </span>
              </div>
              <p className="flex-1 text-[11px] leading-relaxed text-slate-500">{step.description}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function LearningProfileCard({ onAdjust }: { onAdjust: () => void }) {
  const profile = useOnboardingStore((s) => s.profile)
  const focusCount = useVocabStore((s) => s.items.filter((i) => i.inFocus || i.weeklyFocus).length)

  if (!profile) {
    return (
      <div className="mb-5">
        <button
          onClick={onAdjust}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-brand-200 hover:bg-brand-50/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <SlidersHorizontal size={16} className="text-brand-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold leading-snug text-slate-800">Personalize my learning</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Shape your learning path, focus balance, challenge pacing, and vocabulary direction.
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
      </div>
    )
  }

  const cfg = INTENSITY_CONFIG[profile.intensity]

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Learning profile</p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust your learning path, focus balance, challenge pacing, and vocabulary direction.
          </p>
        </div>
        <button onClick={onAdjust} className="flex items-center gap-1 text-xs font-medium text-brand-600">
          <SlidersHorizontal size={11} />
          Adjust
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Goal</p>
          <p className="text-sm font-semibold leading-snug text-slate-800">{GOAL_LABELS[profile.goal] ?? profile.goal}</p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Intensity</p>
          <p className="text-sm font-semibold leading-snug text-slate-800">
            {cfg.emoji} {cfg.label}
            <span className="font-normal text-slate-500"> · {cfg.wordsPerDay}/day</span>
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Focus</p>
          <p className="text-sm font-semibold text-slate-800">
            {focusCount}
            <span className="font-normal text-slate-500"> / {profile.targetFocusSize} target</span>
          </p>
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Themes</p>
          <p className="text-sm font-semibold text-slate-800">{profile.preferredThemes.length} selected</p>
        </div>
      </div>
    </div>
  )
}

function BetaBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
      Beta
    </span>
  )
}

function GamesSection() {
  if (!isEseGameExperimentEnabled) return null

  return (
    <div className="mt-3">
      <a
        href={ESE_GAME_EXPERIMENT_ROUTE}
        className="group flex min-h-[84px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50/30 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
            <Gamepad2 size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900">Practice Games</p>
              <BetaBadge />
            </div>
            <p className="mt-0.5 text-sm leading-snug text-slate-600">
              Optional drills for Focus words: recognition, recall, sentence repair, and phrase fluency.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 self-start text-xs font-semibold text-teal-700 sm:self-center">
          Open Practice Games
          <ChevronRight size={13} aria-hidden="true" />
        </span>
      </a>
    </div>
  )
}

function computeOverallProgress(items: VocabItem[]): number {
  const active = items.filter((item) => !item.archived)
  if (active.length === 0) return 0

  const total = active.reduce((sum, item) => {
    if (item.status === 'mastered' || getCanonicalLevel(item) >= 3) return sum + 1
    const exposureScore = Math.min(item.exposureCount ?? 0, MAX_EXPOSURE) / MAX_EXPOSURE
    const confidenceScore = Math.min(item.activation?.confidenceLevel ?? 0, 3) / 3
    return sum + exposureScore * 0.65 + confidenceScore * 0.35
  }, 0)

  return Math.min(100, Math.round((total / active.length) * 100))
}

export function DashboardPage({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [focusCount, setFocusCount] = useState<FocusCount>(25)
  const [focusKind, setFocusKind] = useState<FocusKind>('mixed')

  const items = useVocabStore((s) => s.items)
  const logUsage = useVocabStore((s) => s.logUsage)
  const setFocusThisWeek = useVocabStore((s) => s.setFocusThisWeek)
  const focusItems = useWeeklyFocusItems()
  const dueItems = useDueItems()
  const { lastChallengeDate, challengeCompletions, streakDays } = useGamificationStore()

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

  const libraryItems = useMemo(() => items.filter((item) => !item.archived), [items])
  const currentFocusItems = useMemo(
    () => items.filter((item) => item.inFocus || item.weeklyFocus),
    [items],
  )
  const focusBuilderPool = useMemo(
    () =>
      libraryItems.filter((item) => {
        if (item.status === 'mastered') return false
        if (focusKind === 'words') return item.type === 'word'
        if (focusKind === 'phrases') return item.type !== 'word'
        return true
      }),
    [focusKind, libraryItems],
  )
  const activelyLearningCount = useMemo(
    () =>
      libraryItems.filter((item) => {
        if (item.status === 'mastered') return false
        const confidence = item.activation?.confidenceLevel ?? 0
        return (confidence >= 1 && confidence <= 3) || (item.exposureCount ?? 0) > 0
      }).length,
    [libraryItems],
  )
  const overallProgress = useMemo(() => computeOverallProgress(items), [items])
  const isEmpty = items.length === 0

  async function handleRandomFocusReshuffle() {
    const currentIds = new Set(currentFocusItems.map((item) => item.id))
    const nonCurrent = focusBuilderPool.filter((item) => !currentIds.has(item.id))
    const currentEligible = focusBuilderPool.filter((item) => currentIds.has(item.id))
    const selected = [
      ...shuffleForUserAction(nonCurrent),
      ...shuffleForUserAction(currentEligible),
    ].slice(0, focusCount)
    await Promise.all(currentFocusItems.map((item) => setFocusThisWeek(item.id, false)))
    await Promise.all(selected.map((item) => setFocusThisWeek(item.id, true)))
    navigate('/focus')
  }

  function handleChallenge(mode: 'standard' | 'deep') {
    const existing = loadTodaySession()
    if (existing && !existing.completed && !existing.isBonus) return
    localStorage.setItem(PRACTICE_MODE_KEY, mode)
    navigate('/challenge')
  }

  function handleStartOver(mode: 'standard' | 'deep') {
    clearSession()
    handleChallenge(mode)
  }

  function handleLogUsed(id: string) {
    void logUsage(id, {
      usedAt: new Date().toISOString(),
      context: 'conversation',
      note: 'Logged from Main page',
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
      <TodayHeader greeting={getGreeting()} dateLabel={getTodayLabel()} />

      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Plus size={14} />
          Add word
        </button>
        {streakDays > 0 && (
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
            <Flame size={12} className="text-amber-500" />
            {streakDays}d streak
          </div>
        )}
      </div>

      <FocusSetupSection
        count={focusCount}
        kind={focusKind}
        availableCount={focusBuilderPool.length}
        personalizeLabel={onOpenOnboarding ? 'Personalize my learning' : 'Start with themes'}
        onCountChange={setFocusCount}
        onKindChange={setFocusKind}
        onRandomReshuffle={handleRandomFocusReshuffle}
        onPersonalize={() => (onOpenOnboarding ? onOpenOnboarding() : navigate('/themes'))}
      />

      <ChallengeLauncherSection
        dueCount={visibleDueCount}
        sessionDoneToday={sessionDoneToday}
        onChallenge={handleChallenge}
        onResume={() => navigate('/challenge')}
        onStartOver={handleStartOver}
      />

      <LearningSnapshotStrip
        librarySize={libraryItems.length}
        activelyLearning={activelyLearningCount}
        focusSize={focusItems.length}
        overallProgress={overallProgress}
        onLibrary={() => navigate('/library')}
        onFocus={() => navigate('/focus')}
        onProgress={() => navigate('/progress')}
      />

      <HowItWorks defaultExpanded={challengeCompletions < 3} />

      {onOpenOnboarding && <LearningProfileCard onAdjust={onOpenOnboarding} />}

      {isEmpty && <StarterPacksSection showAll={false} />}

      <ReviewChip reviewCount={dueItems.length} onNavigate={() => navigate('/review')} />

      <TodayNudgeCard text={nudge.text} action={nudge.action} actionLabel={nudge.actionLabel} />

      <AlmostMasteredStrip
        items={almostMasteredItems}
        onNavigate={() => navigate('/focus')}
        onLogUsed={handleLogUsed}
      />

      {showAdd && <QuickAddModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
