/**
 * SentenceProductionChallenge.tsx
 *
 * Active-production challenge for words at exposure 6–8.
 * The learner writes a sentence using the target word, then self-assesses
 * correctness — no AI call required.
 *
 * Flow:
 *   write  → learner types their sentence, optional hints available
 *   assess → learner sees their sentence + definition + example reference,
 *            chooses "Looks good ✓" (+10 pts) or "Try again ✗" (+5 pts)
 *
 * Both outcomes mark the exercise as answered and advance the session.
 * "Try again" awards partial credit to reward the attempt and keep momentum.
 *
 * DailyChallengePage advances immediately (skipFeedbackOverlay = true for
 * 'sentence-production') so the exercise handles its own post-answer UI.
 */

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Lightbulb, ArrowRight } from 'lucide-react'
import { VocabItem, ExerciseResult } from '@/types/vocabulary'
import { WordPeek } from '../exercises/WordPeek'

interface Props {
  item: VocabItem
  onAnswer: (result: ExerciseResult) => void
}

type Phase = 'write' | 'assess'

export function SentenceProductionChallenge({ item, onAnswer }: Props) {
  const [sentence, setSentence] = useState('')
  const [phase,    setPhase]    = useState<Phase>('write')

  const exampleContext = item.workSentence ?? item.exampleSentence

  // ── Submit sentence → move to self-assessment phase ───────────────────────

  function handleSubmit() {
    if (!sentence.trim()) return
    setPhase('assess')
  }

  // ── Self-assessment ────────────────────────────────────────────────────────

  function handleAssess(looksGood: boolean) {
    onAnswer({
      itemId:       item.id,
      exerciseType: 'sentence-production',
      points:       looksGood ? 10 : 5,
      userAnswer:   sentence.trim(),
      correct:      looksGood,
    })
  }

  // ── Write phase ─────────────────────────────────────────────────────────────

  if (phase === 'write') {
    return (
      <div className="space-y-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Write a sentence
        </p>

        {/* Word card — definition always visible for context */}
        <div className="bg-slate-50 rounded-xl px-4 py-4 border border-slate-200">
          <p className="text-2xl font-bold text-slate-900 mb-1">{item.term}</p>
          {item.partOfSpeech && (
            <p className="text-xs text-slate-400 italic mb-2">{item.partOfSpeech}</p>
          )}
          {item.definitionEn && (
            <p className="text-sm text-slate-600 leading-relaxed">{item.definitionEn}</p>
          )}
        </div>

        {/* Example context — collapsed to avoid copying; reveal on demand */}
        {exampleContext && (
          <details className="text-sm">
            <summary className="cursor-pointer text-brand-600 hover:text-brand-700 font-medium select-none flex items-center gap-1.5">
              <Lightbulb size={13} className="shrink-0" />
              Show example sentence
            </summary>
            <p className="mt-2 text-slate-600 italic bg-brand-50 rounded-lg px-3 py-2.5 border border-brand-100 leading-relaxed">
              &ldquo;{exampleContext}&rdquo;
            </p>
          </details>
        )}

        {/* Sentence frames — collapsed starter prompts */}
        {item.sentenceFrames.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-400 hover:text-brand-600 font-medium select-none text-xs flex items-center gap-1.5">
              <Lightbulb size={13} className="shrink-0" />
              Sentence starters
            </summary>
            <ul className="mt-2 space-y-1">
              {item.sentenceFrames.slice(0, 3).map((f) => (
                <li
                  key={f}
                  className="text-xs text-slate-600 italic px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed"
                >
                  &ldquo;{f}&rdquo;
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Input */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            Use{' '}
            <strong className="text-slate-700">&ldquo;{item.term}&rdquo;</strong>{' '}
            in a sentence of your own
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
          <p className="text-[10px] text-slate-400 mt-1">Ctrl+Enter to continue</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!sentence.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-brand-700 active:scale-[0.98] transition-all"
        >
          Check my sentence
          <ArrowRight size={15} />
        </button>

        <WordPeek item={item} />
      </div>
    )
  }

  // ── Assess phase ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        How did you do?
      </p>

      {/* Their sentence */}
      <div className="border-2 border-slate-200 rounded-xl px-4 py-3 bg-white">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Your sentence
        </p>
        <p className="text-sm text-slate-800 leading-relaxed italic">
          &ldquo;{sentence}&rdquo;
        </p>
      </div>

      {/* Definition reference */}
      {item.definitionEn && (
        <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Definition
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{item.definitionEn}</p>
        </div>
      )}

      {/* Example for comparison */}
      {exampleContext && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-1">
            Example
          </p>
          <p className="text-sm text-brand-800 italic leading-relaxed">
            &ldquo;{exampleContext}&rdquo;
          </p>
        </div>
      )}

      {/* Self-assessment prompt */}
      <p className="text-sm text-slate-600 text-center font-medium">
        Did you use{' '}
        <strong className="text-slate-900">&ldquo;{item.term}&rdquo;</strong>{' '}
        correctly?
      </p>

      {/* Assessment buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAssess(false)}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.98] transition-all"
        >
          <RefreshCw size={15} />
          Try again
        </button>
        <button
          onClick={() => handleAssess(true)}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 size={15} />
          Looks good ✓
        </button>
      </div>
    </div>
  )
}
