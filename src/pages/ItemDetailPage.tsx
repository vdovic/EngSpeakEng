import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, StarOff, Plus, Check, Pencil, Save, X,
  Mic, PenLine, BookText, Lightbulb, Network, GitBranch, Clock, Trash2,
  Loader2, AlertCircle, RefreshCw, Target
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { StatusBadge } from '@/components/StatusBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { UsageProgress } from '@/components/UsageProgress'
import { LogUsageModal } from '@/components/LogUsageModal'
import { ExposureBar } from '@/components/ExposureBar'
import { usagePoints, progressTowardMastery } from '@/lib/mastery'
import { VocabItem, ItemStatus, ItemType } from '@/types/vocabulary'
import { format } from 'date-fns'

const STATUS_FLOW: ItemStatus[] = ['inbox', 'learning', 'stable', 'activation', 'mastered']

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        {icon && <span className="text-slate-500">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  placeholder,
  editing,
  onChange,
  multiline = false,
}: {
  label: string
  value?: string
  placeholder?: string
  editing: boolean
  onChange?: (v: string) => void
  multiline?: boolean
}) {
  if (!editing && !value) return null
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            rows={2}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-300"
          />
        )
      ) : (
        <p className="text-sm text-slate-900 leading-snug">{value}</p>
      )}
    </div>
  )
}

function TagList({ tags, editing, onChange }: { tags: string[]; editing: boolean; onChange?: (tags: string[]) => void }) {
  const [input, setInput] = useState('')

  function addTag() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange?.([...tags, t])
    setInput('')
  }

  function removeTag(t: string) {
    onChange?.(tags.filter((x) => x !== t))
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
          #{t}
          {editing && (
            <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-slate-700">
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      {editing && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          placeholder="add tag…"
          className="text-xs px-2 py-0.5 border border-dashed border-slate-300 rounded-full focus:outline-none focus:border-brand-400 w-24 placeholder:text-slate-300"
        />
      )}
      {tags.length === 0 && !editing && <span className="text-xs text-slate-400">No tags</span>}
    </div>
  )
}

function ListField({ label, items, editing, onChange }: {
  label: string
  items: string[]
  editing: boolean
  onChange?: (items: string[]) => void
}) {
  const [input, setInput] = useState('')

  function add() {
    const t = input.trim()
    if (t && !items.includes(t)) onChange?.([...items, t])
    setInput('')
  }

  if (!editing && items.length === 0) return null

  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">
            {item}
            {editing && (
              <button onClick={() => onChange?.(items.filter((x) => x !== item))} className="text-slate-400 hover:text-slate-700">
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        {editing && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="add…"
            className="text-xs px-2 py-0.5 border border-dashed border-slate-300 rounded focus:outline-none focus:border-brand-400 w-24 placeholder:text-slate-300"
          />
        )}
      </div>
    </div>
  )
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, updateItem, deleteItem, toggleWeeklyFocus, enrichItem } = useVocabStore()
  const item = items.find((i) => i.id === id) as VocabItem | undefined

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VocabItem | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [retrying, setRetrying] = useState(false)

  async function handleRetryEnrich() {
    if (!item) return
    setRetrying(true)
    await enrichItem(item.id)
    setRetrying(false)
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400">
        <p>Item not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-brand-600 hover:underline text-sm">
          Go back
        </button>
      </div>
    )
  }

  const current = editing ? draft! : item
  const usesDone = usagePoints(item.activation.usageLogs)
  const mastery = progressTowardMastery(item)

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(item!)) as VocabItem)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
  }

  async function saveEdit() {
    if (!draft || !item) return
    await updateItem(item.id, draft)
    setEditing(false)
    setDraft(null)
  }

  function patch<K extends keyof VocabItem>(key: K, value: VocabItem[K]) {
    setDraft((d) => d ? { ...d, [key]: value } : d)
  }

  async function handleDelete() {
    if (!item) return
    await deleteItem(item.id)
    navigate(-1)
  }

  async function advanceStatus() {
    if (!item) return
    const idx = STATUS_FLOW.indexOf(item.status)
    if (idx < STATUS_FLOW.length - 1) {
      await updateItem(item.id, { status: STATUS_FLOW[idx + 1] })
    }
  }

  const registerOptions: Array<'formal' | 'neutral' | 'conversational'> = ['formal', 'neutral', 'conversational']

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1" />
        {/* Re-generate button — visible when not editing and generation is complete/failed */}
        {!editing && item.generationStatus !== 'pending' && (
          <button
            onClick={handleRetryEnrich}
            disabled={retrying}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Re-generate study card with AI"
          >
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
          </button>
        )}
        <button
          onClick={() => toggleWeeklyFocus(item.id)}
          className={`p-1.5 rounded-lg transition-colors ${item.weeklyFocus ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
          title={item.weeklyFocus ? 'Remove from Active This Week' : 'Add to Active This Week'}
        >
          {item.weeklyFocus ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
        </button>
        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700">
              <Save size={14} />
              Save
            </button>
          </div>
        )}
      </div>

      {/* ── Generation status banner ──────────────────────────────────────────── */}
      {item.generationStatus === 'pending' && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Loader2 size={16} className="text-amber-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Generating study card…</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Claude is writing your definition, synonyms, examples and more. This takes a few seconds.
            </p>
          </div>
        </div>
      )}
      {item.generationStatus === 'failed' && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Generation failed</p>
            {item.generationError && (
              <p className="text-xs text-red-500 mt-0.5 break-words">{item.generationError}</p>
            )}
          </div>
          <button
            onClick={handleRetryEnrich}
            disabled={retrying}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
            Retry
          </button>
        </div>
      )}

      {/* Identity header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={current.term}
                onChange={(e) => patch('term', e.target.value)}
                className="text-2xl font-bold text-slate-900 w-full border-b border-brand-400 focus:outline-none pb-1 bg-transparent"
              />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{current.term}</h1>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {editing ? (
              <select
                value={current.type}
                onChange={(e) => patch('type', e.target.value as ItemType)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="word">Word</option>
                <option value="phrase">Phrase</option>
                <option value="chunk">Chunk</option>
              </select>
            ) : (
              <TypeBadge type={current.type} />
            )}
            {editing ? (
              <select
                value={current.status}
                onChange={(e) => patch('status', e.target.value as ItemStatus)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {STATUS_FLOW.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            ) : (
              <StatusBadge status={current.status} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <TagList tags={current.tags} editing={editing} onChange={(t) => patch('tags', t)} />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>Added {format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
          {item.sourceType && (
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded capitalize">{item.sourceType}</span>
          )}
        </div>

        {/* Status advance button */}
        {!editing && item.status !== 'mastered' && (
          <button
            onClick={advanceStatus}
            className="mt-3 w-full py-2 text-xs font-medium text-brand-700 bg-brand-50 rounded-xl border border-brand-100 hover:bg-brand-100 transition-colors"
          >
            Move to {STATUS_FLOW[STATUS_FLOW.indexOf(item.status) + 1]} →
          </button>
        )}
      </div>

      {/* Real-life usage tracker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Real-life usage</h2>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} />
            I used it
          </button>
        </div>

        <UsageProgress done={usesDone} needed={3} />

        {item.activation.usageLogs.length > 0 && (
          <div className="mt-3 space-y-2">
            {item.activation.usageLogs.slice().reverse().map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs bg-slate-50 rounded-lg p-2.5">
                <div className="shrink-0 mt-0.5">
                  {log.channel === 'speaking' ? (
                    <Mic size={12} className="text-blue-500" />
                  ) : (
                    <PenLine size={12} className="text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-slate-700 capitalize">{log.channel}</span>
                    <span className="text-slate-400">{format(new Date(log.usedAt), 'MMM d')}</span>
                  </div>
                  {log.note && <p className="text-slate-500">{log.note}</p>}
                  {log.sentence && (
                    <p className="text-slate-700 italic mt-0.5">"{log.sentence}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenge exposure progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Challenge progress</h2>
        <ExposureBar
          exposureCount={item.exposureCount}
          nextChallengeDate={item.nextChallengeDate}
          size="md"
        />
        <p className="text-xs text-slate-400 mt-2">
          Complete the Daily Challenge to advance through 8 SRS exposure steps.
        </p>
      </div>

      {/* Mastery progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Mastery progress</h2>
        <div className="space-y-2.5">
          <MasteryRow
            label="Successful recalls"
            done={mastery.recalls.done}
            needed={mastery.recalls.needed}
          />
          <MasteryRow
            label="Own sentence written"
            done={mastery.sentence ? 1 : 0}
            needed={1}
            boolStyle
          />
          <MasteryRow
            label="Real-life uses"
            done={mastery.uses.done}
            needed={mastery.uses.needed}
          />
        </div>
        {item.status === 'mastered' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            <Check size={16} className="text-emerald-600" />
            <span className="font-medium">Mastered!</span>
          </div>
        )}
      </div>

      {/* Meaning */}
      <Section title="Meaning" icon={<BookText size={14} />}>
        <Field
          label="Part of speech"
          value={current.partOfSpeech}
          placeholder="verb, noun, phrase…"
          editing={editing}
          onChange={(v) => patch('partOfSpeech', v)}
        />
        <Field
          label="Definition"
          value={current.definitionEn}
          placeholder="Concise English definition…"
          editing={editing}
          onChange={(v) => patch('definitionEn', v)}
          multiline
        />
        {(editing || current.translations?.uk) && (
          <Field
            label="Ukrainian"
            value={current.translations?.uk}
            placeholder="Переклад…"
            editing={editing}
            onChange={(v) => patch('translations', { ...current.translations, uk: v })}
          />
        )}
        {(editing || current.translations?.pl) && (
          <Field
            label="Polish"
            value={current.translations?.pl}
            placeholder="Tłumaczenie…"
            editing={editing}
            onChange={(v) => patch('translations', { ...current.translations, pl: v })}
          />
        )}
        {(editing || current.translations?.ru) && (
          <Field
            label="Russian"
            value={current.translations?.ru}
            placeholder="Перевод…"
            editing={editing}
            onChange={(v) => patch('translations', { ...current.translations, ru: v })}
          />
        )}
      </Section>

      <div className="my-3" />

      {/* Usage examples */}
      <Section title="Usage examples" icon={<GitBranch size={14} />}>
        <Field
          label="Natural example"
          value={current.exampleSentence}
          placeholder="Natural example sentence…"
          editing={editing}
          onChange={(v) => patch('exampleSentence', v)}
          multiline
        />
        <Field
          label="Work context"
          value={current.workSentence}
          placeholder="Work / professional example…"
          editing={editing}
          onChange={(v) => patch('workSentence', v)}
          multiline
        />
        <Field
          label="My sentence"
          value={current.mySentence}
          placeholder="Your own example sentence…"
          editing={editing}
          onChange={(v) => patch('mySentence', v)}
          multiline
        />
        {current.sourceText && (
          <Field
            label="Source sentence"
            value={current.sourceText}
            placeholder="Where you found it…"
            editing={editing}
            onChange={(v) => patch('sourceText', v)}
            multiline
          />
        )}
      </Section>

      <div className="my-3" />

      {/* Nuance */}
      <Section title="Nuance & register">
        {editing && (
          <div className="mb-3">
            <label className="text-xs font-medium text-slate-500 block mb-1">Register</label>
            <div className="flex gap-2">
              {registerOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => patch('register', r)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors capitalize ${
                    current.register === r
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {!editing && current.register && (
          <div className="mb-2">
            <span className="text-xs font-medium text-slate-500">Register: </span>
            <span className="text-sm text-slate-700 capitalize">{current.register}</span>
          </div>
        )}
        <Field
          label="Nuance note"
          value={current.nuance}
          placeholder="Subtle meaning distinctions…"
          editing={editing}
          onChange={(v) => patch('nuance', v)}
          multiline
        />
        <Field
          label="Common mistakes"
          value={current.commonMistakes}
          placeholder="What learners often get wrong…"
          editing={editing}
          onChange={(v) => patch('commonMistakes', v)}
          multiline
        />
      </Section>

      <div className="my-3" />

      {/* Word relationships */}
      <Section title="Relationships" icon={<Network size={14} />}>
        <ListField label="Synonyms" items={current.synonyms} editing={editing} onChange={(v) => patch('synonyms', v)} />
        <ListField label="Antonyms" items={current.antonyms} editing={editing} onChange={(v) => patch('antonyms', v)} />
        <ListField label="Collocations" items={current.collocations} editing={editing} onChange={(v) => patch('collocations', v)} />
        <ListField label="Sentence frames" items={current.sentenceFrames} editing={editing} onChange={(v) => patch('sentenceFrames', v)} />
        <ListField label="Related phrases" items={current.relatedPhrases} editing={editing} onChange={(v) => patch('relatedPhrases', v)} />
      </Section>

      <div className="my-3" />

      {/* Real-life challenge */}
      {(current.realLifeTask || editing) && (
        <>
          <div className="my-3" />
          <Section title="Real-life challenge" icon={<Target size={14} />}>
            <Field
              label="Your task"
              value={current.realLifeTask}
              placeholder="e.g. Use this in your next standup when describing a blocker…"
              editing={editing}
              onChange={(v) => patch('realLifeTask', v)}
              multiline
            />
          </Section>
        </>
      )}

      {/* Memory */}
      <Section title="Memory support" icon={<Lightbulb size={14} />}>
        <Field
          label="Etymology"
          value={current.etymology}
          placeholder="Origin or root…"
          editing={editing}
          onChange={(v) => patch('etymology', v)}
          multiline
        />
        <Field
          label="Memory cue / mnemonic"
          value={current.memoryCue}
          placeholder="Visual image, rhyme, or mental cue…"
          editing={editing}
          onChange={(v) => patch('memoryCue', v)}
          multiline
        />
      </Section>

      <div className="my-3" />

      {/* Review data */}
      <Section title="Review history" icon={<Clock size={14} />}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-slate-500">Reviewed</span>
            <p className="font-semibold text-slate-800">{item.review.reviewCount}×</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Successful</span>
            <p className="font-semibold text-slate-800">{item.review.successfulRecalls}×</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Interval</span>
            <p className="font-semibold text-slate-800">{item.review.intervalDays} days</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Ease</span>
            <p className="font-semibold text-slate-800">{item.review.ease.toFixed(2)}</p>
          </div>
          {item.review.lastReviewedAt && (
            <div>
              <span className="text-xs text-slate-500">Last reviewed</span>
              <p className="font-semibold text-slate-800">
                {format(new Date(item.review.lastReviewedAt), 'MMM d, yyyy')}
              </p>
            </div>
          )}
          {item.review.nextReviewAt && (
            <div>
              <span className="text-xs text-slate-500">Next review</span>
              <p className="font-semibold text-slate-800">
                {format(new Date(item.review.nextReviewAt), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
        {editing && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Own sentence written:</label>
            <button
              onClick={() => patch('review', { ...current.review, sentenceProduced: !current.review.sentenceProduced })}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                current.review.sentenceProduced
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {current.review.sentenceProduced ? <Check size={12} /> : null}
              {current.review.sentenceProduced ? 'Yes' : 'No'}
            </button>
          </div>
        )}
      </Section>

      {/* Delete */}
      {!editing && (
        <div className="mt-6">
          {showDeleteConfirm ? (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between">
              <p className="text-sm text-red-700">Delete "{item.term}"?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleDelete} className="text-xs px-3 py-1.5 text-white bg-red-600 rounded-lg font-semibold">
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} />
              Delete item
            </button>
          )}
        </div>
      )}

      {showLogModal && (
        <LogUsageModal itemId={item.id} term={item.term} onClose={() => setShowLogModal(false)} />
      )}
    </div>
  )
}

function MasteryRow({
  label,
  done,
  needed,
  boolStyle = false,
}: {
  label: string
  done: number
  needed: number
  boolStyle?: boolean
}) {
  const complete = done >= needed
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-600 flex-1">{label}</span>
      <div className="flex items-center gap-2">
        {boolStyle ? (
          <span className={`text-xs font-semibold ${complete ? 'text-emerald-600' : 'text-slate-400'}`}>
            {complete ? '✓ Done' : 'Not yet'}
          </span>
        ) : (
          <>
            <div className="flex gap-1">
              {Array.from({ length: needed }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 ${i < done ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">{done}/{needed}</span>
          </>
        )}
      </div>
    </div>
  )
}
