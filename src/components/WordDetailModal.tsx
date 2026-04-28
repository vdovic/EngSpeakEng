import { X, ExternalLink, Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'
import { VocabItem } from '@/types/vocabulary'

interface Props {
  item: VocabItem
  /** Called when the user taps "Back to Challenge" or the × button. */
  onClose: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}

function Quote({ text }: { text: string }) {
  return (
    <p className="text-sm text-slate-600 italic leading-relaxed">
      &ldquo;{text}&rdquo;
    </p>
  )
}

const PILL: Record<string, string> = {
  blue:  'bg-blue-50 text-blue-700 border border-blue-100',
  red:   'bg-red-50 text-red-600 border border-red-100',
  slate: 'bg-slate-100 text-slate-600',
}

function Pills({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${PILL[color]}`}>
          {s}
        </span>
      ))}
    </div>
  )
}

// ── WordDetailModal ───────────────────────────────────────────────────────────

/**
 * Full-screen word detail overlay used inside the Daily Challenge so the user
 * can study a word without navigating away and losing their session.
 *
 * z-[60] puts it above the feedback sheet (z-50) and the mobile NavBar (z-30).
 */
export function WordDetailModal({ item, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden">

      {/* ── Sticky header ── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 shrink-0">
        <button
          onClick={onClose}
          aria-label="Back to challenge"
          className="p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 leading-tight truncate">
            {item.term}
          </h2>
          {item.partOfSpeech && (
            <p className="text-xs text-slate-400 italic mt-0.5">{item.partOfSpeech}</p>
          )}
        </div>

        <Link
          to={`/item/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          <ExternalLink size={13} />
          Full page
        </Link>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-28">

        {item.definitionEn && (
          <Section label="Definition">
            <p className="text-sm text-slate-800 leading-relaxed">{item.definitionEn}</p>
          </Section>
        )}

        {item.synonyms.length > 0 && (
          <Section label="Synonyms">
            <Pills items={item.synonyms} color="blue" />
          </Section>
        )}

        {item.antonyms.length > 0 && (
          <Section label="Antonyms">
            <Pills items={item.antonyms} color="red" />
          </Section>
        )}

        {item.exampleSentence && (
          <Section label="Example">
            <Quote text={item.exampleSentence} />
          </Section>
        )}

        {item.workSentence && (
          <Section label="Work context">
            <Quote text={item.workSentence} />
          </Section>
        )}

        {item.nuance && (
          <Section label="Nuance">
            <p className="text-sm text-slate-600 leading-relaxed">{item.nuance}</p>
          </Section>
        )}

        {item.collocations.length > 0 && (
          <Section label="Collocations">
            <Pills items={item.collocations} color="slate" />
          </Section>
        )}

        {item.sentenceFrames.length > 0 && (
          <Section label="Sentence frames">
            <ul className="space-y-1.5">
              {item.sentenceFrames.map((f) => (
                <li key={f} className="text-sm text-slate-600 italic">
                  &ldquo;{f}&rdquo;
                </li>
              ))}
            </ul>
          </Section>
        )}

        {item.memoryCue && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">
                Memory cue
              </p>
              <p className="text-sm text-amber-800">{item.memoryCue}</p>
            </div>
          </div>
        )}

        {item.etymology && (
          <Section label="Etymology">
            <p className="text-xs text-slate-500">{item.etymology}</p>
          </Section>
        )}

        {item.realLifeTask && (
          <Section label="Real-life challenge">
            <p className="text-sm text-slate-600">{item.realLifeTask}</p>
          </Section>
        )}
      </div>

      {/* ── Pinned back button ── */}
      <div className="shrink-0 px-4 pt-3 pb-8 bg-white border-t border-slate-100">
        <button
          onClick={onClose}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-base hover:bg-brand-700 active:scale-[0.98] transition-all"
        >
          ← Back to Challenge
        </button>
      </div>
    </div>
  )
}
