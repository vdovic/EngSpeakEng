import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Star, StarOff, Plus, Check, Pencil, Save, X,
  BookText, Lightbulb, Network, GitBranch, Trash2,
  Loader2, AlertCircle, RefreshCw, Target, Layers, ChevronDown, RotateCcw,
  TrendingUp, Info, Zap, GraduationCap,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { STATUS_FLOW } from '@/lib/constants'
import { StatusBadge } from '@/components/StatusBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { RelatedWordsSection } from '@/components/RelatedWordsSection'
import { usagePoints, progressTowardMastery, deriveStatus } from '@/lib/mastery'
import { VocabItem, ItemStatus, ItemType } from '@/types/vocabulary'
import { format } from 'date-fns'
import { loadTodaySession } from '@/lib/challengeSession'


function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200 hover:bg-slate-100 transition-colors text-left"
      >
        {icon && <span className="text-slate-500">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1">{title}</h3>
        <ChevronDown
          size={13}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
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

// ── Inline theme assignment panel ─────────────────────────────────────────────

function ThemeAssignment({ itemId, assigned }: { itemId: string; assigned: string[] }) {
  const allThemes = useThemesStore((s) => s.themes)
  const { assignThemes } = useVocabStore()

  const available = allThemes.filter((t) => !assigned.includes(t))

  function toggle(theme: string) {
    const next = assigned.includes(theme)
      ? assigned.filter((t) => t !== theme)
      : [...assigned, theme]
    assignThemes(itemId, next).catch(() => {})
  }

  if (allThemes.length === 0) {
    return (
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Layers size={12} />
        <span>No themes yet — create some in the <a href="/themes" className="text-brand-600 hover:underline">Themes</a> tab.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {/* Assigned themes — click × to remove */}
      {assigned.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium"
        >
          {t}
          <button
            onClick={() => toggle(t)}
            className="text-indigo-400 hover:text-indigo-700 transition-colors"
            title={`Remove from ${t}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {/* Available themes — click to add */}
      {available.map((t) => (
        <button
          key={t}
          onClick={() => toggle(t)}
          className="inline-flex items-center gap-0.5 text-xs text-slate-500 border border-dashed border-slate-300 px-2 py-0.5 rounded-full hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title={`Add to ${t}`}
        >
          <Plus size={10} />
          {t}
        </button>
      ))}

      {assigned.length === 0 && available.length === 0 && (
        <span className="text-xs text-slate-400">No themes assigned</span>
      )}
    </div>
  )
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, updateItem, deleteItem, toggleWeeklyFocus, enrichItem, generateRelatedEntries, logUsage, clearUsageLogs } = useVocabStore()
  const item = items.find((i) => i.id === id) as VocabItem | undefined

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VocabItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Detect an in-progress Daily Challenge so we can show a "Return" banner.
  // loadTodaySession() is synchronous — capture once on mount.
  const [hasActiveChallenge] = useState(() => {
    const s = loadTodaySession()
    return !!s && !s.completed
  })

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
          title={item.weeklyFocus ? 'Remove from Focus This Week' : 'Add to Focus This Week'}
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

      {/* ── Return-to-Challenge banner ────────────────────────────────────────── */}
      {hasActiveChallenge && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Zap size={16} className="text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Daily Challenge in progress</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your session is saved — pick up where you left off.
            </p>
          </div>
          <Link
            to="/challenge"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            <ArrowLeft size={12} />
            Return
          </Link>
        </div>
      )}

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
                <option value="inbox">New</option>
                <option value="learning">Learning</option>
                <option value="stable">Stable</option>
                <option value="activation">Active</option>
                <option value="mastered">Mastered</option>
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

        {/* ── Compact progress strip ─────────────────────────────────────────── */}
        {!editing && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Usage dots + clear */}
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                      i < usesDone ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-1.5">{usesDone}/3 used</span>
                {usesDone > 0 && !showClearConfirm && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="ml-1 p-0.5 rounded text-slate-300 hover:text-red-400 transition-colors"
                    title="Clear usage progress"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
                {showClearConfirm && (
                  <span className="ml-1.5 flex items-center gap-1">
                    <span className="text-xs text-red-500">Clear?</span>
                    <button
                      onClick={async () => { await clearUsageLogs(item.id); setShowClearConfirm(false) }}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      No
                    </button>
                  </span>
                )}
              </div>
              {/* Challenge exposure dots */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < (item.exposureCount ?? 0) ? 'bg-amber-400' : 'bg-slate-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-1.5">
                  {item.exposureCount ?? 0}/8 challenges
                </span>
              </div>
            </div>
            <button
              onClick={() => logUsage(item.id, { usedAt: new Date().toISOString(), channel: 'speaking' })}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 border border-brand-100 transition-colors shrink-0 active:scale-95"
            >
              <Plus size={12} />
              I used it
            </button>
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

      {/* Etymology */}
      {(current.etymology || editing) && (
        <Section title="Etymology" icon={<BookText size={14} />}>
          <Field
            label="Origin"
            value={current.etymology}
            placeholder="Root language, base word, historical origin…"
            editing={editing}
            onChange={(v) => patch('etymology', v)}
            multiline
          />
        </Section>
      )}

      {(current.etymology || editing) && <div className="my-3" />}

      {/* Related words from within the library */}
      <RelatedWordsSection
        entries={item.relatedEntries ?? []}
        status={item.relatedEntriesStatus}
        onGenerate={() => generateRelatedEntries(item.id)}
      />

      <div className="my-3" />

      {/* Usage examples */}
      <Section title="Usage examples" icon={<GitBranch size={14} />} defaultOpen={false}>
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
      <Section title="Nuance & register" defaultOpen={false}>
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
      <Section title="Relationships" icon={<Network size={14} />} defaultOpen={false}>
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
      <Section title="Memory support" icon={<Lightbulb size={14} />} defaultOpen={false}>
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

      {/* Themes */}
      <Section title="Themes" icon={<Layers size={14} />}>
        <ThemeAssignment itemId={item.id} assigned={item.themes ?? []} />
      </Section>

      <div className="my-3" />

      {/* Unified mastery + memory system */}
      <MasteryMemorySection item={item} />

      {/* Mastered state */}
      {!editing && (
        <div className="mt-6">
          {item.status === 'mastered' ? (
            <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <GraduationCap size={18} className="text-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-violet-800">Mastered</p>
                <p className="text-xs text-violet-600 mt-0.5 leading-relaxed">
                  This word won't appear in Review or Daily Challenge. Reactivate it to bring it back.
                </p>
              </div>
              <button
                onClick={() => updateItem(item.id, { status: deriveStatus({ ...item, status: 'learning' }) })}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-white border border-violet-300 rounded-lg hover:bg-violet-100 transition-colors"
              >
                Reactivate
              </button>
            </div>
          ) : (
            <button
              onClick={() => updateItem(item.id, { status: 'mastered' })}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors"
            >
              <GraduationCap size={13} />
              Mark as Mastered
            </button>
          )}
        </div>
      )}

      {/* Delete */}
      {!editing && (
        <div className="mt-4">
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

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => { e.stopPropagation(); setVisible((v) => !v) }}
        className="cursor-help"
      >
        {children}
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-44 px-3 py-2 text-xs bg-slate-800 text-slate-100 rounded-xl shadow-xl leading-relaxed text-center pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  )
}

// ── Stat cell (used inside Memory System grid) ────────────────────────────────

function StatCell({
  label,
  value,
  tooltip,
  valueColor = 'text-slate-800',
}: {
  label: string
  value: string
  tooltip: string
  valueColor?: string
}) {
  return (
    <div>
      <Tooltip text={tooltip}>
        <span className="flex items-center gap-1 text-xs text-slate-500 select-none">
          {label}
          <Info size={10} className="text-slate-300 shrink-0" />
        </span>
      </Tooltip>
      <p className={`text-sm font-semibold mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  )
}

// ── Word state derived from review data ───────────────────────────────────────

type WordState = 'new' | 'learning' | 'struggling' | 'strong'

function getWordState(item: VocabItem): WordState {
  const { reviewCount, successfulRecalls } = item.review
  if (reviewCount === 0) return 'new'
  const rate = successfulRecalls / reviewCount
  if (reviewCount >= 3 && rate < 0.5) return 'struggling'
  if (successfulRecalls >= 5 && rate >= 0.7) return 'strong'
  return 'learning'
}

const STATE_CONFIG: Record<WordState, {
  label: string
  badge: string
  panel: string
  action: string
}> = {
  new: {
    label: 'New',
    badge: 'text-amber-700 bg-amber-50 border border-amber-200',
    panel: 'bg-amber-50 border-amber-200 text-amber-800',
    action: 'Start practising — add this word to your Daily Challenge.',
  },
  learning: {
    label: 'Learning',
    badge: 'text-blue-700 bg-blue-50 border border-blue-200',
    panel: 'bg-blue-50 border-blue-200 text-blue-800',
    action: 'Keep practising a few more times to build confidence.',
  },
  struggling: {
    label: 'Struggling',
    badge: 'text-red-700 bg-red-50 border border-red-200',
    panel: 'bg-red-50 border-red-200 text-red-800',
    action: 'Try writing your own sentence to reinforce the meaning.',
  },
  strong: {
    label: 'Strong',
    badge: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    panel: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    action: 'Try using this word in your next real-life conversation.',
  },
}

// ── MasteryMemorySection ──────────────────────────────────────────────────────

function MasteryMemorySection({ item }: { item: VocabItem }) {
  const mastery = progressTowardMastery(item)
  const [showDetails, setShowDetails] = useState(false)
  const [howOpen, setHowOpen] = useState(false)

  const state = getWordState(item)
  const cfg = STATE_CONFIG[state]

  const { reviewCount, successfulRecalls, intervalDays, ease, lastReviewedAt, nextReviewAt } = item.review

  // Human-friendly interval label
  const intervalLabel =
    intervalDays === 0 ? 'Due now' :
    intervalDays === 1 ? 'Tomorrow' :
    intervalDays < 14  ? `In ${intervalDays} days` :
    intervalDays < 60  ? `In ${Math.round(intervalDays / 7)} weeks` :
    `In ${Math.round(intervalDays / 30)} months`

  // Ease interpretation
  const easeColor = ease < 1.8 ? 'text-red-600' : ease > 2.5 ? 'text-emerald-600' : 'text-slate-800'

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <TrendingUp size={14} className="text-slate-500 shrink-0" />
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1">Mastery</h3>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Summary line */}
        <p className="text-xs text-slate-500 leading-relaxed">
          We track both how well you remember this word and how actively you use it.
        </p>

        {/* ── A: Your Progress ── */}
        <div>
          <SectionDivider label="Your progress" />
          <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
            Your real-world progress with this word
          </p>
          <div className="space-y-2.5">
            <MasteryRow label="Successful recalls" done={mastery.recalls.done} needed={mastery.recalls.needed} />
            <MasteryRow label="Own sentence written" done={mastery.sentence ? 1 : 0} needed={1} boolStyle />
            <MasteryRow label="Real-life uses" done={mastery.uses.done} needed={mastery.uses.needed} />
          </div>
          {item.status === 'mastered' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
              <Check size={15} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">Mastered!</span>
            </div>
          )}
        </div>

        {/* ── B: Memory System ── */}
        <div>
          <SectionDivider label="Memory system" />
          <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
            We adjust when to show this word based on how well you remember it
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <StatCell
              label="Reviewed"
              value={`${reviewCount}×`}
              tooltip="How many times you've practised this word"
            />
            <StatCell
              label="Successful"
              value={`${successfulRecalls}×`}
              tooltip="How many times you got it right"
            />
            <StatCell
              label="Next review"
              value={intervalLabel}
              tooltip="When you'll see this word again"
            />
            <StatCell
              label="Ease"
              value={ease.toFixed(2)}
              tooltip="How easy this word is for you — affects how often it returns"
              valueColor={easeColor}
            />
          </div>

          {/* Advanced details toggle */}
          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 transition-colors"
            >
              <ChevronDown size={11} />
              Show details
            </button>
          ) : (
            <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Interval</span>
                <span>{intervalDays} day{intervalDays !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Ease factor</span>
                <span className={easeColor}>
                  {ease.toFixed(2)}
                  {ease < 1.8 ? ' · hard for you' : ease > 2.5 ? ' · easy for you' : ' · normal'}
                </span>
              </div>
              {lastReviewedAt && (
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">Last reviewed</span>
                  <span>{format(new Date(lastReviewedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
              {nextReviewAt && (
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">Next due</span>
                  <span>{format(new Date(nextReviewAt), 'MMM d, yyyy')}</span>
                </div>
              )}
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors pt-0.5"
              >
                <ChevronDown size={11} className="rotate-180" />
                Hide details
              </button>
            </div>
          )}
        </div>

        {/* ── How it works expandable ── */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setHowOpen((v) => !v)}
            className="flex items-center gap-1.5 w-full text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors"
          >
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${howOpen ? 'rotate-180' : ''}`} />
            How your memory works
          </button>
          {howOpen && (
            <ol className="mt-3 space-y-2 pl-5 text-xs text-slate-500 list-decimal leading-relaxed">
              <li>You practise a word in Daily Challenge</li>
              <li>We track how easy or hard it was for you</li>
              <li>Easy words appear less often — up to months apart</li>
              <li>Hard words come back sooner — sometimes the very next day</li>
            </ol>
          )}
        </div>

        {/* ── Actionable guidance ── */}
        <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${cfg.panel}`}>
          <Zap size={13} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-medium">{cfg.action}</p>
        </div>

      </div>
    </div>
  )
}

// ── SectionDivider ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}
