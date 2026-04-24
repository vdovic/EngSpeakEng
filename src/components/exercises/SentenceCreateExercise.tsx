import { useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  WifiOff,
} from 'lucide-react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

interface CheckResult {
  score: 0 | 5 | 10
  correct: boolean
  feedback: string
  correctedSentence: string | null
  tip: string | null
}

type Phase = 'input' | 'checking' | 'reviewed'

// ── Score styling helpers ─────────────────────────────────────────────────────

const SCORE_CONFIG = {
  10: {
    icon: CheckCircle2,
    label: 'Excellent!',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconCls: 'text-emerald-500',
    labelCls: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  5: {
    icon: AlertCircle,
    label: 'Good attempt',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconCls: 'text-amber-500',
    labelCls: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  0: {
    icon: XCircle,
    label: 'Needs work',
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconCls: 'text-red-400',
    labelCls: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export function SentenceCreateExercise({ item, onAnswer }: Props) {
  const [sentence, setSentence] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [apiErrored, setApiErrored] = useState(false)

  // ── Submit sentence to Claude ─────────────────────────────────────────────
  async function handleSubmit() {
    const trimmed = sentence.trim()
    if (!trimmed || phase !== 'input') return

    setPhase('checking')
    setApiErrored(false)

    try {
      const res = await fetch('/api/checkSentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: item.term,
          type: item.type,
          definitionEn: item.definitionEn,
          userSentence: trimmed,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const { result } = (await res.json()) as { result: CheckResult }
      setCheckResult(result)
      setPhase('reviewed')
    } catch {
      // API unavailable or failed — award partial credit and show a generic note
      setApiErrored(true)
      setCheckResult({
        score: 5,
        correct: true,
        feedback:
          "Couldn't reach the AI coach right now, but good effort — keep practising sentence production!",
        correctedSentence: null,
        tip: null,
      })
      setPhase('reviewed')
    }
  }

  // ── Pass result up when user clicks Continue ──────────────────────────────
  function handleContinue() {
    if (!checkResult) return
    onAnswer({
      itemId: item.id,
      exerciseType: 'sentence-create',
      points: checkResult.score,
      userAnswer: sentence.trim(),
      correct: checkResult.correct,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const cfg = checkResult ? SCORE_CONFIG[checkResult.score as 0 | 5 | 10] : null

  return (
    <div className="space-y-5">
      {/* Header label */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Create your own sentence
      </p>

      {/* Word card */}
      <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
        <p className="text-2xl font-bold text-slate-900 mb-1">{item.term}</p>
        {item.partOfSpeech && (
          <p className="text-xs text-slate-400 italic mb-2">{item.partOfSpeech}</p>
        )}
        {item.definitionEn && (
          <p className="text-sm text-slate-600 leading-relaxed">{item.definitionEn}</p>
        )}
      </div>

      {/* Example hint (collapsed) */}
      {item.workSentence && phase === 'input' && (
        <details className="text-sm">
          <summary className="cursor-pointer text-brand-600 hover:text-brand-700 font-medium select-none">
            Show example sentence
          </summary>
          <p className="mt-2 text-slate-600 italic bg-brand-50 rounded-lg px-3 py-2 border border-brand-100">
            &ldquo;{item.workSentence}&rdquo;
          </p>
        </details>
      )}

      {/* ── INPUT phase ────────────────────────────────────────────────── */}
      {phase === 'input' && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Write a sentence using{' '}
              <strong className="text-slate-700">&ldquo;{item.term}&rdquo;</strong>
            </label>
            <textarea
              rows={3}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
              }}
              placeholder="Type your sentence here…"
              className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 placeholder:text-slate-300 resize-none"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Ctrl+Enter to submit
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!sentence.trim()}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 transition-colors"
          >
            Check with AI →
          </button>
        </>
      )}

      {/* ── CHECKING phase ─────────────────────────────────────────────── */}
      {phase === 'checking' && (
        <>
          {/* Show their sentence disabled */}
          <div className="bg-white border-2 border-slate-200 rounded-xl px-4 py-3 opacity-70">
            <p className="text-sm text-slate-700 italic">&ldquo;{sentence}&rdquo;</p>
          </div>

          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 size={18} className="text-brand-500 animate-spin" />
            <span className="text-sm font-medium text-slate-600">
              AI coach is reviewing your sentence…
            </span>
          </div>
        </>
      )}

      {/* ── REVIEWED phase ─────────────────────────────────────────────── */}
      {phase === 'reviewed' && checkResult && cfg && (
        <>
          {/* Their sentence */}
          <div className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Your sentence
            </p>
            <p className="text-sm text-slate-800 italic">&ldquo;{sentence}&rdquo;</p>
          </div>

          {/* Feedback panel */}
          <div className={`rounded-xl border ${cfg.bg} ${cfg.border} p-4 space-y-3`}>
            {/* Score badge + label */}
            <div className="flex items-center gap-2.5">
              <cfg.icon size={20} className={cfg.iconCls} />
              <span className={`font-bold text-base ${cfg.labelCls}`}>
                {cfg.label}
              </span>
              <span
                className={`ml-auto text-sm font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}
              >
                +{checkResult.score} pts
              </span>
            </div>

            {/* AI feedback text */}
            <p className="text-sm text-slate-700 leading-relaxed">
              {checkResult.feedback}
            </p>

            {/* Corrected sentence */}
            {checkResult.correctedSentence && (
              <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Try this instead
                </p>
                <p className="text-sm text-slate-800 italic">
                  &ldquo;{checkResult.correctedSentence}&rdquo;
                </p>
              </div>
            )}

            {/* Tip */}
            {checkResult.tip && (
              <div className="flex items-start gap-2">
                <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">{checkResult.tip}</p>
              </div>
            )}

            {/* API error notice */}
            {apiErrored && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <WifiOff size={11} />
                <span>AI unavailable — partial credit awarded</span>
              </div>
            )}
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Continue
            <ArrowRight size={15} />
          </button>
        </>
      )}
    </div>
  )
}
