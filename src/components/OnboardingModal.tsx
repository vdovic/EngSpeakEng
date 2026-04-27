/**
 * OnboardingModal
 *
 * 60-second guided setup flow:
 *  Step 1 — "What's your role?"        (PM / Engineer / Consultant / Student / Other)
 *  Step 2 — "What matters most?"       (Meetings / Writing / Speaking / All)
 *  Step 3 — "Pick 3 focus areas"       (pre-selected grid based on answers)
 *  Step 4 — Completion / loading       (import pack → activate → AI in background)
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, ArrowLeft, Zap, Loader2, Sparkles } from 'lucide-react'
import {
  useOnboardingStore,
  OnboardingRole,
  OnboardingPriority,
  getPreselectedThemes,
  getBestPackId,
} from '@/store/onboardingStore'
import { useThemesStore, SUGGESTED_THEMES } from '@/store/themesStore'
import { useVocabStore } from '@/store/vocabStore'
import { assignWordsToTheme } from '@/lib/aiThemeAssignment'
import type { StarterPack } from '@/types/starterPacks'

// ── Step data ────────────────────────────────────────────────────────────────

const ROLES: { id: OnboardingRole; label: string; emoji: string; detail: string }[] = [
  { id: 'pm',         label: 'PM / Product',  emoji: '🗺️', detail: 'Roadmaps, stakeholders, decisions' },
  { id: 'engineer',   label: 'Engineer',      emoji: '⚙️', detail: 'Technical writing, code reviews, docs' },
  { id: 'consultant', label: 'Consultant',    emoji: '📋', detail: 'Client work, proposals, negotiations' },
  { id: 'student',    label: 'Student',       emoji: '🎓', detail: 'Essays, presentations, academic English' },
  { id: 'other',      label: 'Other',         emoji: '✨', detail: 'General professional English' },
]

const PRIORITIES: { id: OnboardingPriority; label: string; emoji: string; detail: string }[] = [
  { id: 'meetings', label: 'Meetings & Presentations', emoji: '📊', detail: 'Speak up, chair, present with confidence' },
  { id: 'writing',  label: 'Business writing',         emoji: '✍️', detail: 'Emails, reports, clear documents' },
  { id: 'speaking', label: 'Everyday speaking',        emoji: '💬', detail: 'Natural, fluent conversation' },
  { id: 'all',      label: 'A bit of everything',      emoji: '🌐', detail: 'Broad professional vocabulary' },
]

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < step ? 'bg-brand-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

// ── Step 1 — Role ─────────────────────────────────────────────────────────────

function StepRole({
  selected,
  onSelect,
  onNext,
}: {
  selected: OnboardingRole | null
  onSelect: (r: OnboardingRole) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
          What's your role?
        </h1>
        <p className="text-sm text-slate-500">
          We'll suggest focus areas tailored to your work.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {ROLES.map((r) => {
          const active = selected === r.id
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                active
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl leading-none mt-0.5 shrink-0">{r.emoji}</span>
              <div className="min-w-0">
                <p className={`font-semibold text-sm leading-snug ${active ? 'text-brand-700' : 'text-slate-900'}`}>
                  {r.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.detail}</p>
              </div>
              {active && (
                <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={onNext}
          disabled={!selected}
          className="w-full py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 2 — Priority ─────────────────────────────────────────────────────────

function StepPriority({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: OnboardingPriority | null
  onSelect: (p: OnboardingPriority) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
          What matters most?
        </h1>
        <p className="text-sm text-slate-500">
          We'll pre-select focus areas to match your goal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {PRIORITIES.map((p) => {
          const active = selected === p.id
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                active
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-2xl leading-none mt-0.5 shrink-0">{p.emoji}</span>
              <div className="min-w-0">
                <p className={`font-semibold text-sm leading-snug ${active ? 'text-brand-700' : 'text-slate-900'}`}>
                  {p.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{p.detail}</p>
              </div>
              {active && (
                <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Step 3 — Theme grid ───────────────────────────────────────────────────────

function StepThemes({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[]
  onToggle: (name: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const MAX = 3
  const ready = selected.length === MAX

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
          Pick 3 focus areas
        </h1>
        <p className="text-sm text-slate-500">
          We pre-selected these based on your answers. Swap any you like.
        </p>
      </div>

      {/* Counter pill */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          ready ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-brand-500' : 'bg-slate-400'}`} />
          {selected.length} / {MAX} selected
        </div>
        {ready && (
          <span className="text-xs text-brand-600 font-medium animate-pulse">
            Ready to go!
          </span>
        )}
      </div>

      {/* Theme grid — scrollable */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
          {SUGGESTED_THEMES.map((theme) => {
            const active = selected.includes(theme.name)
            const disabled = !active && selected.length >= MAX
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
                <span className="text-xl leading-none shrink-0">{theme.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-xs leading-snug ${active ? 'text-brand-700' : 'text-slate-800'}`}>
                    {theme.name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5 truncate">
                    {theme.description}
                  </p>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  active
                    ? 'bg-brand-500 border-brand-500'
                    : 'border-slate-300 bg-white'
                }`}>
                  {active && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!ready}
          className="flex-1 py-3 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Zap size={15} /> Set up my vocabulary
        </button>
      </div>
    </div>
  )
}

// ── Step 4 — Completion ───────────────────────────────────────────────────────

interface CompletionState {
  themesCreated: boolean
  wordsImported: number
  activatedCount: number
  aiRunning: boolean
  /** True once themes + import + activation are all done (CTAs unlock) */
  setupComplete: boolean
}

function StepComplete({
  themes,
  state,
  onChallenge,
  onDashboard,
}: {
  themes: string[]
  state: CompletionState
  onChallenge: () => void
  onDashboard: () => void
}) {
  const ready = state.setupComplete

  return (
    <div className="flex flex-col h-full items-center justify-center text-center py-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-200">
        {ready ? (
          <Zap size={36} className="text-white" />
        ) : (
          <Loader2 size={36} className="text-white animate-spin" />
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {ready ? "You're all set! 🎉" : 'Setting things up…'}
      </h1>
      <p className="text-sm text-slate-500 mb-8 max-w-xs">
        {ready
          ? `${state.activatedCount > 0 ? state.activatedCount + ' words are' : 'Words are'} ready for your first Daily Challenge. Your AI system is working in the background.`
          : 'Just a moment while we personalise your vocabulary system.'}
      </p>

      {/* Progress checklist */}
      <div className="w-full max-w-xs bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3">
        <ChecklistRow done={state.themesCreated} label={`${themes.length} focus areas created`} />
        <ChecklistRow
          done={state.wordsImported > 0}
          loading={state.themesCreated && state.wordsImported === 0}
          label={state.wordsImported > 0 ? `${state.wordsImported} words added to your library` : 'Importing vocabulary…'}
        />
        <ChecklistRow
          done={state.activatedCount > 0}
          loading={state.wordsImported > 0 && state.activatedCount === 0}
          label={state.activatedCount > 0 ? `${state.activatedCount} words activated for Daily Challenge` : 'Activating words…'}
        />
        <ChecklistRow
          done={false}
          loading={state.aiRunning}
          label="AI assigning words to your themes"
          subtitle="Runs in the background"
        />
      </div>

      {/* CTAs */}
      {ready && (
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onChallenge}
            className="w-full py-3.5 rounded-2xl bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.98] transition-all shadow-md shadow-brand-200"
          >
            <Zap size={16} /> Start Daily Challenge
          </button>
          <button
            onClick={onDashboard}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            Explore my dashboard
          </button>
        </div>
      )}
    </div>
  )
}

function ChecklistRow({
  done,
  loading = false,
  label,
  subtitle,
}: {
  done: boolean
  loading?: boolean
  label: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
        done ? 'bg-emerald-500' : loading ? 'bg-brand-100' : 'bg-slate-200'
      }`}>
        {done ? (
          <Check size={11} className="text-white" strokeWidth={3} />
        ) : loading ? (
          <Loader2 size={11} className="text-brand-500 animate-spin" />
        ) : null}
      </div>
      <div>
        <p className={`text-sm font-medium leading-snug ${done ? 'text-slate-900' : loading ? 'text-slate-600' : 'text-slate-400'}`}>
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Sparkles size={9} /> {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onClose?: () => void
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const navigate = useNavigate()
  const { role, priority, selectedThemes, setRole, setPriority, setSelectedThemes, markComplete } =
    useOnboardingStore()
  const { addTheme } = useThemesStore()
  const { importPack, moveToLearning } = useVocabStore()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [completionState, setCompletionState] = useState<CompletionState>({
    themesCreated: false,
    wordsImported: 0,
    activatedCount: 0,
    aiRunning: false,
    setupComplete: false,
  })

  // ── Step handlers ──────────────────────────────────────────────────────────

  function handleRoleSelect(r: OnboardingRole) {
    setRole(r)
  }

  function handleRoleNext() {
    if (!role) return
    setStep(2)
  }

  function handlePrioritySelect(p: OnboardingPriority) {
    setPriority(p)
    // Auto-compute preselected themes whenever priority changes
    if (role) {
      setSelectedThemes(getPreselectedThemes(role, p))
    }
  }

  function handlePriorityNext() {
    if (!priority || !role) return
    // Ensure preselection is computed (handles edge case of priority already set)
    if (selectedThemes.length === 0) {
      setSelectedThemes(getPreselectedThemes(role, priority))
    }
    setStep(3)
  }

  function handleThemeToggle(name: string) {
    setSelectedThemes(
      selectedThemes.includes(name)
        ? selectedThemes.filter((t) => t !== name)
        : selectedThemes.length < 3
        ? [...selectedThemes, name]
        : selectedThemes,
    )
  }

  // ── Setup action (step 3 → 4) ──────────────────────────────────────────────

  const handleSetup = useCallback(async () => {
    if (selectedThemes.length !== 3) return
    setStep(4)

    // 1. Create themes
    for (const theme of selectedThemes) {
      addTheme(theme)
    }
    setCompletionState((s) => ({ ...s, themesCreated: true }))

    // 2. Import best-matching starter pack
    const packId = getBestPackId(selectedThemes)
    let importedIds: string[] = []
    try {
      const res = await fetch(`/data/starter-packs/${packId}.json`)
      if (res.ok) {
        const pack: StarterPack = await res.json()
        const outcome = await importPack(pack)
        importedIds = outcome.ids
        setCompletionState((s) => ({ ...s, wordsImported: outcome.imported }))
      }
    } catch {
      // Pack fetch failed — not fatal, continue
      setCompletionState((s) => ({ ...s, wordsImported: 0 }))
    }

    // 3. Activate first 10 imported words for Daily Challenge
    const toActivate = importedIds.slice(0, 10)
    if (toActivate.length > 0) {
      await moveToLearning(toActivate)
    }
    setCompletionState((s) => ({
      ...s,
      activatedCount: toActivate.length,
      setupComplete: true,   // unlock CTAs — core setup is done
    }))

    // 4. AI assignment — fire-and-forget (works in prod, 404 in local dev)
    setCompletionState((s) => ({ ...s, aiRunning: true }))
    const { items } = useVocabStore.getState()
    Promise.all(
      selectedThemes.map((theme) =>
        assignWordsToTheme(theme, items)
          .then(async ({ assignedIds }) => {
            const { assignThemes } = useVocabStore.getState()
            for (const id of assignedIds) {
              const item = useVocabStore.getState().items.find((i) => i.id === id)
              if (!item) continue
              const merged = Array.from(new Set([...(item.themes ?? []), theme]))
              await assignThemes(id, merged)
            }
          })
          .catch(() => { /* local dev — silently ignore */ }),
      ),
    ).finally(() => {
      setCompletionState((s) => ({ ...s, aiRunning: false }))
    })

    // 5. Mark onboarding complete
    markComplete()
  }, [selectedThemes, addTheme, importPack, moveToLearning, markComplete])

  // ── Close / navigate ───────────────────────────────────────────────────────

  function close() {
    markComplete()
    onClose?.()
  }

  function goChallenge() {
    markComplete()
    onClose?.()
    navigate('/challenge')
  }

  function goDashboard() {
    markComplete()
    onClose?.()
    navigate('/')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: 'min(85vh, 680px)', height: step === 3 ? 'min(85vh, 680px)' : 'auto' }}
      >
        {/* Inner padding wrapper */}
        <div className="flex flex-col flex-1 p-6 sm:p-8 overflow-hidden">

          {/* Skip / close — only shown on steps 1-3 */}
          {step < 4 && (
            <button
              onClick={close}
              className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
            >
              Skip →
            </button>
          )}

          {/* Progress bar — steps 1-3 */}
          {step < 4 && <ProgressBar step={step} total={3} />}

          {/* Step content */}
          {step === 1 && (
            <StepRole
              selected={role}
              onSelect={handleRoleSelect}
              onNext={handleRoleNext}
            />
          )}
          {step === 2 && (
            <StepPriority
              selected={priority}
              onSelect={handlePrioritySelect}
              onNext={handlePriorityNext}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepThemes
              selected={selectedThemes}
              onToggle={handleThemeToggle}
              onNext={handleSetup}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepComplete
              themes={selectedThemes}
              state={completionState}
              onChallenge={goChallenge}
              onDashboard={goDashboard}
            />
          )}
        </div>
      </div>
    </div>
  )
}
