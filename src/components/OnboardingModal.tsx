/**
 * OnboardingModal — Phase 8
 *
 * 5-step personalisation flow + completion screen.
 *
 *  Step 1 — Goal        "What do you mainly want to improve?"          (single select, 8 options)
 *  Step 2 — Contexts    "Where do you want to use better English?"     (multi-select)
 *  Step 3 — Themes      "Which themes should your focus set include?"  (multi-select, up to 5)
 *  Step 4 — Intensity   "How intensive should your learning plan be?"  (3 options)
 *  Step 5 — Focus size  "How many words to start with?"                (adjustable 20–150)
 *  Step 6 — Completion  Runs recommendation + adds to My Current Focus
 *
 * Re-run: when onboarding was already completed, step 6 asks whether to
 *   add / replace / skip updating focus.
 *
 * Mobile-first: bottom-sheet on small screens, centred modal on wide.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronRight, ArrowLeft, Zap, Loader2, Minus, Plus, Star,
} from 'lucide-react'
import {
  useOnboardingStore, GOAL_THEME_SUGGESTIONS,
} from '@/store/onboardingStore'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { useVocabStore } from '@/store/vocabStore'
import {
  recommendInitialFocusItems,
} from '@/lib/personalizationLogic'
import {
  LearningGoal, LearningContext, LearningIntensity,
  UserLearningProfile, INTENSITY_CONFIG,
} from '@/types/profile'

// ── Step data ──────────────────────────────────────────────────────────────────

const GOALS: { id: LearningGoal; label: string; emoji: string; detail: string }[] = [
  { id: 'work-communication', label: 'Work communication',  emoji: '💬', detail: 'Emails, calls, professional exchanges' },
  { id: 'meetings',           label: 'Meetings',            emoji: '🗓️', detail: 'Participate, chair, and facilitate' },
  { id: 'presentations',      label: 'Presentations',       emoji: '🎤', detail: 'Pitch, explain, and persuade clearly' },
  { id: 'writing',            label: 'Writing',             emoji: '✍️', detail: 'Reports, emails, clear documents' },
  { id: 'product-management', label: 'Product management',  emoji: '🗺️', detail: 'Roadmaps, stakeholders, decisions' },
  { id: 'general-fluency',    label: 'General fluency',     emoji: '🌐', detail: 'Broader, more natural English' },
  { id: 'exam-preparation',   label: 'Exam preparation',    emoji: '🎓', detail: 'IELTS, TOEFL, Cambridge exams' },
  { id: 'other',              label: 'Other',               emoji: '✨', detail: 'Something else entirely' },
]

const CONTEXTS: { id: LearningContext; label: string; emoji: string }[] = [
  { id: 'work-email',    label: 'Work emails',   emoji: '📧' },
  { id: 'meetings',      label: 'Meetings',      emoji: '🗓️' },
  { id: 'small-talk',    label: 'Small talk',    emoji: '☕' },
  { id: 'presentations', label: 'Presentations', emoji: '🎤' },
  { id: 'reading',       label: 'Reading',       emoji: '📖' },
  { id: 'listening',     label: 'Listening',     emoji: '🎧' },
  { id: 'travel',        label: 'Travel',        emoji: '✈️' },
  { id: 'academic',      label: 'Academic',      emoji: '🎓' },
]

const MAX_THEMES = 5
const FOCUS_MIN  = 20
const FOCUS_MAX  = 150

// ── Shared sub-components ──────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6 shrink-0">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < step ? 'bg-brand-500' : 'bg-slate-200'
          }`}
        />
      ))}
      <span className="text-[11px] font-medium text-slate-400 ml-1 shrink-0 tabular-nums">
        {step}/{total}
      </span>
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = 'Continue',
  backLabel  = 'Back',
  showBack   = true,
}: {
  onBack?:     () => void
  onNext:      () => void
  nextDisabled?: boolean
  nextLabel?:  string
  backLabel?:  string
  showBack?:   boolean
}) {
  return (
    <div className="mt-5 flex gap-3 shrink-0 pt-2 border-t border-slate-100">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} /> {backLabel}
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
      >
        {nextLabel} <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── Step 1 — Goal ──────────────────────────────────────────────────────────────

function StepGoal({
  selected, onSelect, onNext, onSkip,
}: {
  selected: LearningGoal | null
  onSelect: (g: LearningGoal) => void
  onNext:   () => void
  onSkip:   () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          What do you mainly want to improve?
        </h1>
        <p className="text-sm text-slate-500">
          This shapes your vocabulary recommendations.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
          {GOALS.map((g) => {
            const active = selected === g.id
            return (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
                className={`text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  active
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
                }`}
              >
                <span className="text-xl leading-none mt-0.5 shrink-0">{g.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm leading-snug ${active ? 'text-brand-700' : 'text-slate-900'}`}>
                    {g.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{g.detail}</p>
                </div>
                {active && (
                  <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <NavButtons
        onNext={onNext}
        nextDisabled={!selected}
        showBack={false}
      />
      <button
        onClick={onSkip}
        className="mt-2 text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        Skip setup →
      </button>
    </div>
  )
}

// ── Step 2 — Contexts ──────────────────────────────────────────────────────────

function StepContexts({
  selected, onToggle, onNext, onBack,
}: {
  selected: LearningContext[]
  onToggle: (c: LearningContext) => void
  onNext:   () => void
  onBack:   () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          Where do you want to use better English?
        </h1>
        <p className="text-sm text-slate-500">
          Select all that apply — helps us weight the right vocabulary.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2 pb-1">
          {CONTEXTS.map((c) => {
            const active = selected.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  active
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
                }`}
              >
                <span className="text-xl leading-none shrink-0">{c.emoji}</span>
                <span className={`font-semibold text-xs leading-snug ${active ? 'text-brand-700' : 'text-slate-800'}`}>
                  {c.label}
                </span>
                {active && (
                  <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={selected.length === 0}
        nextLabel="Continue"
      />
    </div>
  )
}

// ── Step 3 — Themes ────────────────────────────────────────────────────────────

function StepThemes({
  selected, onToggle, onNext, onBack,
}: {
  selected: string[]
  onToggle: (name: string) => void
  onNext:   () => void
  onBack:   () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-3 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          Which themes should your focus set include?
        </h1>
        <p className="text-sm text-slate-500">
          Pre-selected based on your goal. Swap any you like.{' '}
          <span className="text-slate-400">(up to {MAX_THEMES})</span>
        </p>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 shrink-0 transition-colors ${
        selected.length > 0 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${selected.length > 0 ? 'bg-brand-500' : 'bg-slate-400'}`} />
        {selected.length} / {MAX_THEMES} selected
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
          {SUGGESTED_THEMES.map((theme) => {
            const active   = selected.includes(theme.name)
            const disabled = !active && selected.length >= MAX_THEMES
            return (
              <button
                key={theme.name}
                onClick={() => !disabled && onToggle(theme.name)}
                className={`text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : disabled
                    ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
                }`}
              >
                <span className="text-lg leading-none shrink-0">{theme.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-xs leading-snug ${active ? 'text-brand-700' : 'text-slate-800'}`}>
                    {theme.name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5 truncate">
                    {theme.description}
                  </p>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  active ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'
                }`}>
                  {active && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={selected.length === 0}
      />
    </div>
  )
}

// ── Step 4 — Intensity ─────────────────────────────────────────────────────────

function StepIntensity({
  selected, onSelect, onNext, onBack,
}: {
  selected: LearningIntensity | null
  onSelect: (i: LearningIntensity) => void
  onNext:   () => void
  onBack:   () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          How intensive should your plan be?
        </h1>
        <p className="text-sm text-slate-500">
          You can change this any time from your dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {(Object.entries(INTENSITY_CONFIG) as [LearningIntensity, typeof INTENSITY_CONFIG[LearningIntensity]][]).map(
          ([id, cfg]) => {
            const active = selected === id
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  active
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
                }`}
              >
                <span className="text-2xl leading-none mt-0.5 shrink-0">{cfg.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold text-base leading-snug ${active ? 'text-brand-700' : 'text-slate-900'}`}>
                    {cfg.label}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-snug">{cfg.detail}</p>
                </div>
                {active && (
                  <div className="ml-auto shrink-0 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          },
        )}
      </div>

      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selected} />
    </div>
  )
}

// ── Step 5 — Focus size ────────────────────────────────────────────────────────

function StepFocusSize({
  value, intensity, onChange, onNext, onBack,
}: {
  value:     number
  intensity: LearningIntensity
  onChange:  (n: number) => void
  onNext:    () => void
  onBack:    () => void
}) {
  const presets = [
    { n: 50,  label: 'Starter',    detail: 'Focused, manageable' },
    { n: 100, label: 'Standard',   detail: 'Good variety'        },
    { n: 150, label: 'Full focus', detail: 'Maximum coverage'    },
  ]

  const cfg = INTENSITY_CONFIG[intensity]

  function adjust(delta: number) {
    onChange(Math.max(FOCUS_MIN, Math.min(FOCUS_MAX, value + delta)))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          How many words to start with?
        </h1>
        <p className="text-sm text-slate-500">
          These go into My Current Focus — your personalised active word list.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2 mb-5 shrink-0">
        {presets.map((p) => (
          <button
            key={p.n}
            onClick={() => onChange(p.n)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              value === p.n
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <div className={`text-xl font-bold leading-none mb-0.5 ${value === p.n ? 'text-brand-700' : 'text-slate-900'}`}>
              {p.n}
            </div>
            <div className={`text-[10px] font-semibold ${value === p.n ? 'text-brand-600' : 'text-slate-500'}`}>
              {p.label}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{p.detail}</div>
          </button>
        ))}
      </div>

      {/* Fine-tune */}
      <div className="bg-slate-50 rounded-2xl p-4 mb-4 shrink-0">
        <p className="text-xs font-medium text-slate-500 mb-3 text-center">Fine-tune</p>
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => adjust(-10)}
            disabled={value <= FOCUS_MIN}
            className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-30 transition-colors"
          >
            <Minus size={18} />
          </button>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
            <div className="text-xs text-slate-400 mt-1">words</div>
          </div>
          <button
            onClick={() => adjust(10)}
            disabled={value >= FOCUS_MAX}
            className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-30 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700 shrink-0">
        <span className="font-semibold">{cfg.label} plan:</span> ~{cfg.wordsPerDay} new words/day at this focus size will take around{' '}
        <span className="font-semibold">{Math.ceil(value / cfg.wordsPerDay)} days</span> to cycle through once.
      </div>

      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

// ── Step 6 — Completion ────────────────────────────────────────────────────────

type FocusAction = 'add' | 'replace' | 'profile-only'

interface CompletionProps {
  profile:      UserLearningProfile
  isRerun:      boolean
  currentFocus: number
  onDone:       (action: FocusAction) => void
  status:       'idle' | 'loading' | 'done'
  addedCount:   number
  onChallenge:  () => void
  onMyFocus:    () => void
}

function StepCompletion({
  profile, isRerun, currentFocus,
  onDone, status, addedCount,
  onChallenge, onMyFocus,
}: CompletionProps) {
  const [chosenAction, setChosenAction] = useState<FocusAction | null>(
    isRerun ? null : 'add',
  )

  const cfg = INTENSITY_CONFIG[profile.intensity]

  if (status === 'done') {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center py-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-200">
          <Star size={36} className="text-white fill-white" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {addedCount > 0 ? 'Your focus set is ready! 🎉' : 'Profile saved!'}
        </h1>
        <p className="text-sm text-slate-500 mb-8 max-w-xs">
          {addedCount > 0
            ? `${addedCount} words added to My Current Focus based on your profile.`
            : 'Your learning profile has been updated. Focus set unchanged.'}
        </p>

        <div className="w-full flex flex-col gap-3">
          {addedCount > 0 && (
            <>
              <button
                onClick={onChallenge}
                className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all shadow-md shadow-brand-200"
              >
                <Zap size={16} /> Start Daily Challenge
              </button>
              <button
                onClick={onMyFocus}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                Review My Current Focus
              </button>
            </>
          )}
          {addedCount === 0 && (
            <button
              onClick={onMyFocus}
              className="w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
            >
              Go to dashboard
            </button>
          )}
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center py-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-200">
          <Loader2 size={36} className="text-white animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Setting up your focus set…</h1>
        <p className="text-sm text-slate-500">Analysing your library and picking the best words.</p>
      </div>
    )
  }

  // idle — show profile summary and focus action picker
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
          {isRerun ? 'Update your learning setup' : 'Your personalised setup'}
        </h1>
        <p className="text-sm text-slate-500">
          {isRerun
            ? 'Choose how to apply your new profile.'
            : 'We\'ll pick the best words from your library.'}
        </p>
      </div>

      {/* Profile summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 w-20 text-xs font-medium shrink-0">Goal</span>
          <span className="font-semibold text-slate-800">{GOALS.find((g) => g.id === profile.goal)?.label}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-400 w-20 text-xs font-medium shrink-0 mt-0.5">Contexts</span>
          <div className="flex flex-wrap gap-1">
            {profile.contexts.slice(0, 4).map((c) => (
              <span key={c} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                {CONTEXTS.find((x) => x.id === c)?.label ?? c}
              </span>
            ))}
            {profile.contexts.length > 4 && (
              <span className="text-[10px] text-slate-400">+{profile.contexts.length - 4}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 w-20 text-xs font-medium shrink-0">Intensity</span>
          <span className="font-semibold text-slate-800">{cfg.emoji} {cfg.label} · {cfg.wordsPerDay} words/day</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 w-20 text-xs font-medium shrink-0">Focus size</span>
          <span className="font-semibold text-slate-800">{profile.targetFocusSize} words</span>
        </div>
      </div>

      {/* Focus action choice */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        {isRerun ? (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              What should we do with My Current Focus?
            </p>
            {[
              { id: 'add'          as FocusAction, label: 'Add recommended words',       detail: `Add up to ${profile.targetFocusSize} words · keeps your ${currentFocus} existing` },
              { id: 'replace'      as FocusAction, label: 'Replace with new selection',  detail: 'Clear current focus and apply new recommendation' },
              { id: 'profile-only' as FocusAction, label: 'Save profile only',           detail: 'Update profile without changing My Current Focus' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setChosenAction(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  chosenAction === opt.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                  chosenAction === opt.id ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'
                }`}>
                  {chosenAction === opt.id && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${chosenAction === opt.id ? 'text-brand-800' : 'text-slate-800'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.detail}</p>
                </div>
              </button>
            ))}
          </>
        ) : (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-3.5">
            <p className="text-sm font-semibold text-brand-800 mb-0.5">
              Recommended: {profile.targetFocusSize} words
            </p>
            <p className="text-xs text-brand-600">
              Selected from your library based on your goal, contexts, and themes.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-3 border-t border-slate-100 mt-4">
        <button
          onClick={() => onDone(chosenAction ?? 'add')}
          disabled={isRerun && !chosenAction}
          className="w-full py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Zap size={15} />
          {isRerun ? 'Apply' : 'Build my focus set'}
        </button>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onClose?: () => void
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const navigate = useNavigate()
  const { completed: wasCompleted, profile: savedProfile, setProfile, markComplete } = useOnboardingStore()
  const { addTheme }                = useThemesStore()
  const { items, addToFocus, removeFromFocus } = useVocabStore()

  // Determine if this is a re-run at the time the modal opens
  const [isRerun]      = useState(() => wasCompleted)
  const currentFocusCount = items.filter((i) => i.inFocus).length

  // ── Local draft state ──────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)

  const [goal,       setGoal]       = useState<LearningGoal | null>(savedProfile?.goal ?? null)
  const [contexts,   setContexts]   = useState<LearningContext[]>(savedProfile?.contexts ?? [])
  const [themes,     setThemes]     = useState<string[]>(
    savedProfile?.preferredThemes ?? [],
  )
  const [intensity,  setIntensity]  = useState<LearningIntensity | null>(savedProfile?.intensity ?? null)
  const [focusSize,  setFocusSize]  = useState<number>(savedProfile?.targetFocusSize ?? 100)

  // Completion state
  const [compStatus,  setCompStatus]  = useState<'idle' | 'loading' | 'done'>('idle')
  const [addedCount,  setAddedCount]  = useState(0)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleContext(c: LearningContext) {
    setContexts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  function toggleTheme(name: string) {
    setThemes((prev) =>
      prev.includes(name)
        ? prev.filter((t) => t !== name)
        : prev.length < MAX_THEMES
        ? [...prev, name]
        : prev,
    )
  }

  // Auto pre-select themes when moving to step 3
  function goToThemes() {
    if (!goal) return
    if (themes.length === 0) {
      setThemes(GOAL_THEME_SUGGESTIONS[goal].slice(0, MAX_THEMES))
    }
    setStep(3)
  }

  // Auto-set focus size based on intensity when moving to step 5
  function goToFocusSize() {
    if (!intensity) return
    // Only set default if user hasn't already explicitly changed it
    setFocusSize((prev) => {
      const defaults = [50, 100, 150]
      return defaults.includes(prev) ? INTENSITY_CONFIG[intensity].defaultFocus : prev
    })
    setStep(5)
  }

  const handleApply = useCallback(
    async (action: FocusAction) => {
      if (!goal || !intensity) return
      setCompStatus('loading')

      const now = new Date().toISOString()
      const profile: UserLearningProfile = {
        goal,
        contexts,
        preferredThemes: themes,
        intensity,
        targetFocusSize: focusSize,
        createdAt: savedProfile?.createdAt ?? now,
        updatedAt: now,
      }

      // 1. Save profile
      setProfile(profile)
      markComplete()

      // 2. Create themes in theme store
      for (const t of themes) addTheme(t)

      // 3. Apply focus changes
      if (action !== 'profile-only') {
        const recommended = recommendInitialFocusItems(items, profile, focusSize)
        const ids = recommended.map((i) => i.id)

        if (action === 'replace') {
          // Clear all existing focus first
          const focusedIds = items.filter((i) => i.inFocus || i.weeklyFocus).map((i) => i.id)
          for (const id of focusedIds) {
            await removeFromFocus(id)
          }
        }

        const { added } = await addToFocus(ids)
        setAddedCount(added)
      }

      setCompStatus('done')
    },
    [
      goal, contexts, themes, intensity, focusSize,
      savedProfile, setProfile, markComplete, addTheme,
      items, addToFocus, removeFromFocus,
    ],
  )

  function close() {
    markComplete()
    onClose?.()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TOTAL_STEPS = 5

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6">
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg flex flex-col"
        style={{ maxHeight: 'min(92dvh, 700px)', height: step < 6 ? 'min(92dvh, 700px)' : 'auto' }}
      >
        <div className="flex flex-col flex-1 p-5 sm:p-7 overflow-hidden">

          {/* Progress bar — steps 1-5 */}
          {step < 6 && <ProgressBar step={step - 1} total={TOTAL_STEPS} />}

          {/* Step content */}
          {step === 1 && (
            <StepGoal
              selected={goal}
              onSelect={(g) => {
                setGoal(g)
                // Reset themes when goal changes so pre-selection is recalculated
                setThemes([])
              }}
              onNext={() => setStep(2)}
              onSkip={close}
            />
          )}
          {step === 2 && (
            <StepContexts
              selected={contexts}
              onToggle={toggleContext}
              onNext={() => goToThemes()}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepThemes
              selected={themes}
              onToggle={toggleTheme}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepIntensity
              selected={intensity}
              onSelect={setIntensity}
              onNext={() => goToFocusSize()}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepFocusSize
              value={focusSize}
              intensity={intensity ?? 'standard'}
              onChange={setFocusSize}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}
          {step === 6 && goal && intensity && (
            <StepCompletion
              profile={{
                goal,
                contexts,
                preferredThemes: themes,
                intensity,
                targetFocusSize: focusSize,
                createdAt: savedProfile?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }}
              isRerun={isRerun}
              currentFocus={currentFocusCount}
              onDone={handleApply}
              status={compStatus}
              addedCount={addedCount}
              onChallenge={() => { close(); navigate('/challenge') }}
              onMyFocus={() => { close(); navigate('/week') }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
