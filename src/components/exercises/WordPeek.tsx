import { useState } from 'react'
import { ChevronDown, BookOpen, ExternalLink, Lightbulb } from 'lucide-react'
import { VocabItem } from '@/types/vocabulary'

interface Props {
  item: VocabItem
  /** When true the panel is forced open (e.g. after a wrong hint pick). */
  forceOpen?: boolean
}

/**
 * Collapsible word-details panel for use inside exercise cards.
 * Lets learners peek at the full description (definition, synonyms,
 * examples, nuance, etymology, memory cue…) without leaving the challenge.
 *
 * The "Open full page →" link opens the detail page in a new tab so the
 * learner never loses their exercise session.
 */
export function WordPeek({ item, forceOpen = false }: Props) {
  const [open, setOpen] = useState(false)
  const isOpen = open || forceOpen

  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors group"
      >
        <BookOpen size={13} className="shrink-0" />
        <span className="flex-1 text-left">
          {isOpen ? 'Hide word details' : "Don't know this word? See full description"}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="mt-4 space-y-4 text-sm">

          {/* Word heading — always shown first so the learner knows which word this is */}
          <div className="flex items-baseline gap-2 pb-3 border-b border-slate-100">
            <span className="text-2xl font-bold text-slate-900 leading-tight">{item.term}</span>
            {item.partOfSpeech && (
              <span className="text-xs text-slate-400 italic shrink-0">{item.partOfSpeech}</span>
            )}
          </div>

          {/* Definition + part of speech */}
          {item.definitionEn && (
            <Section label="Definition">
              <p className="text-slate-800 leading-relaxed">{item.definitionEn}</p>
            </Section>
          )}

          {/* Synonyms */}
          {item.synonyms.length > 0 && (
            <Section label="Synonyms">
              <Pills items={item.synonyms} color="blue" />
            </Section>
          )}

          {/* Antonyms */}
          {item.antonyms.length > 0 && (
            <Section label="Antonyms">
              <Pills items={item.antonyms} color="red" />
            </Section>
          )}

          {/* Example sentence */}
          {item.exampleSentence && (
            <Section label="Example">
              <Quote text={item.exampleSentence} />
            </Section>
          )}

          {/* Work / professional context */}
          {item.workSentence && (
            <Section label="Work context">
              <Quote text={item.workSentence} />
            </Section>
          )}

          {/* Nuance note */}
          {item.nuance && (
            <Section label="Nuance">
              <p className="text-slate-600 leading-relaxed">{item.nuance}</p>
            </Section>
          )}

          {/* Collocations */}
          {item.collocations.length > 0 && (
            <Section label="Collocations">
              <Pills items={item.collocations} color="slate" />
            </Section>
          )}

          {/* Sentence frames */}
          {item.sentenceFrames.length > 0 && (
            <Section label="Sentence frames">
              <ul className="space-y-1">
                {item.sentenceFrames.map((f) => (
                  <li key={f} className="text-xs text-slate-600 italic">
                    &ldquo;{f}&rdquo;
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Etymology */}
          {item.etymology && (
            <Section label="Etymology">
              <p className="text-xs text-slate-500">{item.etymology}</p>
            </Section>
          )}

          {/* Memory cue */}
          {item.memoryCue && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-0.5">
                  Memory cue
                </p>
                <p className="text-xs text-amber-800">{item.memoryCue}</p>
              </div>
            </div>
          )}

          {/* Real-life task */}
          {item.realLifeTask && (
            <Section label="Real-life challenge">
              <p className="text-xs text-slate-600">{item.realLifeTask}</p>
            </Section>
          )}

          {/* Link to full detail page (new tab — preserves exercise session) */}
          <a
            href={`/item/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline transition-colors pt-1"
          >
            <ExternalLink size={11} />
            Open full word page
          </a>
        </div>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

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
    <p className="text-slate-600 italic leading-relaxed">
      &ldquo;{text}&rdquo;
    </p>
  )
}

const PILL_COLORS = {
  blue:  'bg-blue-50 text-blue-700 border border-blue-100',
  red:   'bg-red-50 text-red-600 border border-red-100',
  slate: 'bg-slate-100 text-slate-600',
} as const

function Pills({
  items,
  color,
}: {
  items: string[]
  color: keyof typeof PILL_COLORS
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className={`text-xs px-2 py-0.5 rounded-full ${PILL_COLORS[color]}`}
        >
          {s}
        </span>
      ))}
    </div>
  )
}
