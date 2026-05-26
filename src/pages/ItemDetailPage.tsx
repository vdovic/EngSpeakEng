import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Star, StarOff, Plus, Check, Pencil, Save, X,
  BookText, Network, GitBranch, Trash2, BarChart2, Sparkles, ArrowRight,
  Loader2, AlertCircle, RefreshCw, Target, Layers, ChevronDown,
  TrendingUp, Info, Zap, GraduationCap, MessageSquarePlus,
} from 'lucide-react'
import { useVocabStore } from '@/store/vocabStore'
import { useThemesStore } from '@/store/themesStore'
import { StageBadge } from '@/components/StageBadge'
import { TypeBadge } from '@/components/TypeBadge'
import { WordRelationGraph } from '@/components/WordRelationGraph'
import { LogUsageModal } from '@/components/LogUsageModal'
import { ConfidenceDots } from '@/components/ConfidenceDots'
import { getUsageProfileLines } from '@/components/UsageProfileCard'
import { USAGE_PROFILES } from '@/data/usageProfiles'
import { deriveStatus } from '@/lib/mastery'
import {
  getDisplayStage,
  type DisplayStage,
  DISPLAY_STAGE_LABEL,
  DISPLAY_STAGE_DESCRIPTION,
} from '@/lib/progressionLogic'
import { VocabItem, ItemStatus, ItemType, RelatedSuggestion, UsageContext, RelatedEntry, RelationshipType, RelationshipDirection } from '@/types/vocabulary'
import { STATIC_RELATIONSHIPS, StaticRelDirection } from '@/data/staticRelationshipEntries'
import { format } from 'date-fns'
import { loadTodaySession } from '@/lib/challengeSession'

// ── Static relationship direction → RelationshipType mapping ─────────────────
// Used when converting static relationship entries into RelatedEntry objects.
const STATIC_REL_TYPE: Record<StaticRelDirection, RelationshipType> = {
  synonym:      'meaning',
  contrast:     'nuance',
  same_family:  'word_family',
  confusable:   'confusable',
  same_context: 'usage_context',
}

// ── Context label map ─────────────────────────────────────────────────────────

const CONTEXT_LABEL: Record<UsageContext, string> = {
  'conversation':     'Conversation',
  'meeting':         'Meeting',
  'work-email':      'Work email',
  'writing-practice':'Writing practice',
  'note':            'Note',
  'reading-listening':'Heard / read',
  'other':           'Other',
}


// ── Inline badge helpers for Nuance & Register section ───────────────────────
// Duplicates minimal logic from UsageProfileCard without re-exporting internals.

function inlineFormalityBadge(f: string): { label: string; cls: string } | null {
  switch (f) {
    case 'informal':     return { label: 'Informal',     cls: 'bg-slate-100 text-slate-600' }
    case 'formal':       return { label: 'Formal',       cls: 'bg-blue-50 text-blue-700 border border-blue-200' }
    case 'academic':     return { label: 'Academic',     cls: 'bg-purple-50 text-purple-700 border border-purple-200' }
    case 'professional': return { label: 'Professional', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' }
    default:             return null
  }
}

function inlineFrequencyBadge(f: string): { label: string; cls: string } | null {
  switch (f) {
    case 'very-common':     return { label: 'Very common',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    case 'advanced-common': return { label: 'Advanced, common', cls: 'bg-violet-50 text-violet-700 border border-violet-200' }
    case 'rare':            return { label: 'Rare',             cls: 'bg-rose-50 text-rose-600 border border-rose-200' }
    default:                return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  /** @deprecated — all sections are now always expanded */
  defaultOpen?: boolean
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        {icon && <span className="text-slate-500">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1">{title}</h3>
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
  const { items, addItem, updateItem, deleteItem, toggleWeeklyFocus, enrichItem, generateRelatedEntries, setConfidenceLevel } = useVocabStore()
  const [addedTerm, setAddedTerm] = useState<string | null>(null)
  const item = items.find((i) => i.id === id) as VocabItem | undefined

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<VocabItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [loggedSuccessfully, setLoggedSuccessfully] = useState(false)

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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookText size={24} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Word not found</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
          This word may have been deleted or the link is out of date.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Go back
          </button>
          <button
            onClick={() => navigate('/library')}
            className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Open library
          </button>
        </div>
      </div>
    )
  }

  const current = editing ? draft! : item

  // ── Static relationship lookup ────────────────────────────────────────────
  // User-generated relatedEntries take priority over static data.
  // Static data is used as a fallback only when relatedEntries is empty.
  const userRelatedEntries  = item.relatedEntries ?? []
  const staticRawRels       = STATIC_RELATIONSHIPS[item.term] ?? []
  const staticRelatedEntries: RelatedEntry[] = userRelatedEntries.length === 0
    ? staticRawRels.flatMap(rel => {
        const target = items.find(i => i.term.toLowerCase() === rel.targetTerm.toLowerCase())
        if (!target) return []
        return [{
          id:               target.id,
          term:             target.term,
          relationshipType: STATIC_REL_TYPE[rel.direction],
          direction:        rel.direction as RelationshipDirection,
          strength:         rel.strength,
          explanation:      rel.explanation,
        }]
      })
    : []
  const effectiveRelatedEntries: RelatedEntry[] =
    userRelatedEntries.length > 0 ? userRelatedEntries : staticRelatedEntries
  const graphEligible = effectiveRelatedEntries.length >= 4
  // Show the "Build" prompt only when there's genuinely no data (user or static)
  const hasAnyRelationshipData =
    userRelatedEntries.length > 0 || staticRelatedEntries.length > 0

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
          title={item.weeklyFocus ? 'Remove from My Current Focus' : 'Add to My Current Focus'}
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
                <option value="idiom">Idiom</option>
                <option value="phrasal-verb">Phrasal verb</option>
                <option value="collocation">Collocation</option>
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
                <option value="stable">Familiar</option>
                <option value="activation">Activating</option>
                <option value="mastered">Mastered</option>
              </select>
            ) : (
              <StageBadge item={current} />
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

        {/* ── Compact progress strip ─────────────────────────────────────────── */}
        {!editing && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Confidence dots — real-life comfort */}
              <ConfidenceDots
                item={item}
                onChange={(level) => setConfidenceLevel(item.id, level)}
              />
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
              onClick={() => setShowUsageModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors shrink-0 active:scale-95"
            >
              <Plus size={12} />
              Add note
            </button>
          </div>
        )}
      </div>

      {/* ── 1. Meaning ───────────────────────────────────────────────────────── */}
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
          <Field label="Ukrainian" value={current.translations?.uk} placeholder="Переклад…"
            editing={editing} onChange={(v) => patch('translations', { ...current.translations, uk: v })} />
        )}
        {(editing || current.translations?.pl) && (
          <Field label="Polish" value={current.translations?.pl} placeholder="Tłumaczenie…"
            editing={editing} onChange={(v) => patch('translations', { ...current.translations, pl: v })} />
        )}
        {(editing || current.translations?.ru) && (
          <Field label="Russian" value={current.translations?.ru} placeholder="Перевод…"
            editing={editing} onChange={(v) => patch('translations', { ...current.translations, ru: v })} />
        )}
      </Section>

      <div className="my-3" />

      {/* ── 2. Examples ──────────────────────────────────────────────────────── */}
      <Section title="Examples" icon={<GitBranch size={14} />}>
        <Field label="Natural example" value={current.exampleSentence}
          placeholder="Natural example sentence…" editing={editing}
          onChange={(v) => patch('exampleSentence', v)} multiline />
        <Field label="Work context" value={current.workSentence}
          placeholder="Work / professional example…" editing={editing}
          onChange={(v) => patch('workSentence', v)} multiline />
        <Field label="My sentence" value={current.mySentence}
          placeholder="Your own example sentence…" editing={editing}
          onChange={(v) => patch('mySentence', v)} multiline />
        {current.sourceText && (
          <Field label="Source sentence" value={current.sourceText}
            placeholder="Where you found it…" editing={editing}
            onChange={(v) => patch('sourceText', v)} multiline />
        )}
      </Section>

      <div className="my-3" />

      {/* ── 3. Nuance & Register ─────────────────────────────────────────────── */}
      {/* Combines compact visual signals (UsageProfile) with the nuance text.   */}
      {/* Visual-only is too shallow for B2–C1 learning; text-only is harder to  */}
      {/* scan. Static data only — no runtime AI generation.                     */}
      {(() => {
        const profile = item.usageProfile ?? USAGE_PROFILES[item.term]
        const fBadge = profile?.formality ? inlineFormalityBadge(profile.formality) : null
        const qBadge = profile?.frequency ? inlineFrequencyBadge(profile.frequency) : null
        const pills = [fBadge, qBadge].filter(Boolean) as { label: string; cls: string }[]
        const signalLines = profile ? getUsageProfileLines(profile).slice(0, 3) : []
        const domains = (profile?.domains ?? []).slice(0, 2)
        const textExplanation = current.nuance || profile?.naturalnessHint
        const hasSignals = pills.length > 0 || signalLines.length > 0 || domains.length > 0
        const hasContent = hasSignals || !!textExplanation || !!current.register || !!current.commonMistakes

        if (!editing && !hasContent) return null

        return (
          <Section title="Nuance & register" icon={<BarChart2 size={14} />}>

            {/* Register selector — edit mode only */}
            {editing && (
              <div className="mb-3">
                <label className="text-xs font-medium text-slate-500 block mb-1">Register</label>
                <div className="flex gap-2">
                  {registerOptions.map((r) => (
                    <button key={r} onClick={() => patch('register', r)}
                      className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors capitalize ${
                        current.register === r
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visual signals — formality/frequency pills + signal lines + domains */}
            {hasSignals && (
              <div className="mb-3 space-y-2">
                {pills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pills.map((p, i) => (
                      <span key={i} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.cls}`}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                )}
                {signalLines.length > 0 && (
                  <ul className="space-y-0.5">
                    {signalLines.map((line, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                {domains.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {domains.map((d) => (
                      <span key={d} className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full capitalize">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text explanation — nuance field preferred, naturalnessHint as fallback */}
            {editing ? (
              <Field label="Nuance note" value={current.nuance}
                placeholder="How it sounds, when it's natural, how it differs from close alternatives…"
                editing onChange={(v) => patch('nuance', v)} multiline />
            ) : textExplanation ? (
              <p className="text-sm text-slate-700 leading-relaxed mb-2">{textExplanation}</p>
            ) : null}

            {/* Common mistakes */}
            {editing ? (
              <Field label="Common mistakes" value={current.commonMistakes}
                placeholder="What learners often get wrong…"
                editing onChange={(v) => patch('commonMistakes', v)} multiline />
            ) : current.commonMistakes ? (
              <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide mb-0.5">Common mistake</p>
                <p className="text-xs text-rose-700 leading-relaxed">{current.commonMistakes}</p>
              </div>
            ) : null}

          </Section>
        )
      })()}

      <div className="my-3" />

      {/* ── 4. Collocations & Phrase Patterns ────────────────────────────────── */}
      {(editing || current.collocations.length > 0 || current.sentenceFrames.length > 0 || current.relatedPhrases.length > 0) && (
        <>
          <Section title="Collocations & phrase patterns" icon={<GitBranch size={14} />}>
            <ListField label="Collocations"    items={current.collocations}   editing={editing} onChange={(v) => patch('collocations', v)} />
            <ListField label="Sentence frames" items={current.sentenceFrames} editing={editing} onChange={(v) => patch('sentenceFrames', v)} />
            <ListField label="Related phrases" items={current.relatedPhrases} editing={editing} onChange={(v) => patch('relatedPhrases', v)} />
          </Section>
          <div className="my-3" />
        </>
      )}

      {/* ── 5. Practice / Real-life use ──────────────────────────────────────── */}
      {(current.realLifeTask || editing) && (
        <>
          <Section title="Real-life challenge" icon={<Target size={14} />}>
            <Field label="Your task" value={current.realLifeTask}
              placeholder="e.g. Use this in your next standup when describing a blocker…"
              editing={editing} onChange={(v) => patch('realLifeTask', v)} multiline />
          </Section>
          <div className="my-3" />
        </>
      )}

      {!editing && (
        <>
          <Section title="Real-life usage" icon={<MessageSquarePlus size={14} />}>
            {(() => {
              const logs = item.activation.usageLogs
              const confidenceLevel = (item.activation?.confidenceLevel ?? 0) as 0 | 1 | 2 | 3
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">How comfortable are you using this word in real life?</p>
                    <ConfidenceDots item={item} onChange={(level) => setConfidenceLevel(item.id, level)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {logs.length > 0 ? `${logs.length} usage note${logs.length !== 1 ? 's' : ''} logged` : 'No usage notes yet'}
                    </span>
                    <button
                      onClick={() => { setLoggedSuccessfully(false); setShowUsageModal(true) }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors active:scale-95"
                    >
                      <Plus size={11} />
                      Add note
                    </button>
                  </div>
                  {logs.length > 0 && (
                    <div className="space-y-1.5">
                      {[...logs].reverse().slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="shrink-0 text-slate-400 tabular-nums">{format(new Date(log.usedAt), 'MMM d')}</span>
                          <span className="text-slate-500 shrink-0">
                            {log.context ? CONTEXT_LABEL[log.context] : log.channel === 'speaking' ? 'Speaking' : log.channel === 'writing' ? 'Writing' : ''}
                          </span>
                          {log.confidence && <span className="text-amber-500 shrink-0">{'★'.repeat(log.confidence)}</span>}
                          {log.sentence && <span className="italic text-slate-500 line-clamp-1 flex-1">"{log.sentence}"</span>}
                          {log.note && !log.sentence && <span className="text-slate-400 flex-1 line-clamp-1">{log.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {confidenceLevel === 0 && (
                    <p className="text-xs text-slate-400 italic">
                      Mark how comfortable you are using this word — it helps the system track your progress.
                    </p>
                  )}
                  {loggedSuccessfully && <p className="text-xs text-green-600 font-medium">✓ Note logged!</p>}
                </div>
              )
            })()}
          </Section>
          <div className="my-3" />
        </>
      )}

      {/* ── 6. Etymology ─────────────────────────────────────────────────────── */}
      <Section title="Etymology" icon={<BookText size={14} />}>
        {(current.etymology || editing) ? (
          <Field label="Origin" value={current.etymology}
            placeholder="Root language, base word, historical origin…"
            editing={editing} onChange={(v) => patch('etymology', v)} multiline />
        ) : (
          <p className="text-sm text-slate-400 italic">Not recorded for this word.</p>
        )}
        {(current.memoryCue || editing) && (
          <Field label="Memory cue / mnemonic" value={current.memoryCue}
            placeholder="Visual image, rhyme, or mental cue…"
            editing={editing} onChange={(v) => patch('memoryCue', v)} multiline />
        )}
      </Section>

      <div className="my-3" />

      {/* ── 7. Related Words ─────────────────────────────────────────────────── */}
      {/* Policy:                                                                 */}
      {/*   ≥4 relationships → diagram expanded by default, text list below.     */}
      {/*   < 4 relationships → text list only, no diagram.                      */}
      {/*   Static data used as fallback when no user-generated relatedEntries.  */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
          <Network size={14} className="text-slate-500 shrink-0" />
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1">Related words</h3>
          {effectiveRelatedEntries.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              {effectiveRelatedEntries.length}
            </span>
          )}
        </div>

        {/* "Word added" confirmation */}
        {addedTerm && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
            <Check size={13} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium flex-1">&ldquo;{addedTerm}&rdquo; added to your library</p>
            <button onClick={() => setAddedTerm(null)} className="text-emerald-400 hover:text-emerald-600"><X size={13} /></button>
          </div>
        )}

        {/* Network diagram — expanded by default when ≥4 entries exist (static or user) */}
        {graphEligible && !editing && (
          <div className="border-b border-slate-100">
            <WordRelationGraph
              inline
              entries={effectiveRelatedEntries}
              suggestions={userRelatedEntries.length > 0 ? (item.relatedSuggestions ?? []) : []}
              status={item.relatedEntriesStatus}
              currentTerm={item.term}
              onGenerate={userRelatedEntries.length > 0 ? () => generateRelatedEntries(item.id) : undefined}
              onAdd={userRelatedEntries.length > 0
                ? async (suggestion: RelatedSuggestion) => {
                    await addItem({ term: suggestion.term, type: suggestion.type })
                    setAddedTerm(suggestion.term)
                    await updateItem(item.id, {
                      relatedSuggestions: (item.relatedSuggestions ?? []).filter((s) => s.term !== suggestion.term),
                    })
                  }
                : undefined
              }
            />
          </div>
        )}

        <div className="px-4 py-3 space-y-3">

          {/* Related entries list — shown below diagram (or standalone if < 4) */}
          {effectiveRelatedEntries.length > 0 && (
            <div className="space-y-0.5">
              {effectiveRelatedEntries.slice(0, 8).map((entry) => (
                <button key={entry.id} onClick={() => navigate(`/item/${entry.id}`)}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group">
                  <span className="flex-1 text-sm text-slate-700 font-medium group-hover:text-brand-700 truncate">{entry.term}</span>
                  {entry.direction && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full capitalize shrink-0">
                      {entry.direction.replace('_', ' ')}
                    </span>
                  )}
                  <ArrowRight size={11} className="text-slate-300 group-hover:text-brand-400 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Synonyms & antonyms — editing or when data exists */}
          {(editing || current.synonyms.length > 0) && (
            <ListField label="Synonyms" items={current.synonyms} editing={editing} onChange={(v) => patch('synonyms', v)} />
          )}
          {(editing || current.antonyms.length > 0) && (
            <ListField label="Antonyms" items={current.antonyms} editing={editing} onChange={(v) => patch('antonyms', v)} />
          )}

          {/* Pending / failed for user-initiated generation */}
          {item.relatedEntriesStatus === 'pending' && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
              <Loader2 size={12} className="text-indigo-400 animate-spin shrink-0" />
              Mapping word connections…
            </div>
          )}
          {item.relatedEntriesStatus === 'failed' && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle size={12} />
                Couldn't build the graph.
              </div>
              <button onClick={() => generateRelatedEntries(item.id)}
                className="flex items-center gap-1 text-xs text-indigo-500 font-medium hover:underline">
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Build prompt — only when genuinely no data (neither user nor static) */}
          {!item.relatedEntriesStatus && !hasAnyRelationshipData && !editing && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 leading-relaxed">Discover how this word connects to others in your library.</p>
              <button onClick={() => generateRelatedEntries(item.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 active:scale-95 transition-all">
                <Sparkles size={12} />
                Build
              </button>
            </div>
          )}

          {/* Suggestions — only for user-generated data below threshold */}
          {userRelatedEntries.length > 0 && userRelatedEntries.length < 4 &&
            (item.relatedSuggestions?.length ?? 0) > 0 && !editing && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Words to discover</p>
              {(item.relatedSuggestions ?? []).slice(0, 3).map((s) => (
                <div key={s.term} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-600 font-medium">{s.term}</span>
                    {s.definitionHint && <span className="text-xs text-slate-400 ml-2 italic">{s.definitionHint}</span>}
                  </div>
                  <button
                    onClick={async () => {
                      await addItem({ term: s.term, type: s.type })
                      setAddedTerm(s.term)
                      await updateItem(item.id, {
                        relatedSuggestions: (item.relatedSuggestions ?? []).filter((x) => x.term !== s.term),
                      })
                    }}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Plus size={11} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="my-3" />

      {/* ── 8. Themes ────────────────────────────────────────────────────────── */}
      <Section title="Themes" icon={<Layers size={14} />}>
        <ThemeAssignment itemId={item.id} assigned={item.themes ?? []} />
      </Section>

      <div className="my-3" />

      {/* ── 9. Progress ──────────────────────────────────────────────────────── */}
      <ProgressSection item={item} />

      {/* Mastered state */}
      {!editing && (
        <div className="mt-6">
          {item.status === 'mastered' ? (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <GraduationCap size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Mastered</p>
                <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">
                  This word won't appear in Review or Daily Challenge. Reactivate it to bring it back.
                </p>
              </div>
              <button
                onClick={() => updateItem(item.id, { status: deriveStatus({ ...item, status: 'learning' }) })}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
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
                <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 py-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg">Cancel</button>
                <button onClick={handleDelete} className="text-xs px-3 py-1.5 text-white bg-red-600 rounded-lg font-semibold">Delete</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
              <Trash2 size={13} />
              Delete item
            </button>
          )}
        </div>
      )}

      {/* ── Log usage modal ──────────────────────────────────────────────────── */}
      {showUsageModal && (
        <LogUsageModal
          itemId={item.id}
          term={item.term}
          onClose={() => setShowUsageModal(false)}
          onSaved={() => setLoggedSuccessfully(true)}
        />
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

// ── Journey pipeline ──────────────────────────────────────────────────────────
//
// Five-dot horizontal tracker showing the learner's position in the
// New → Introduced → Drilling → Activate → Mastered journey.
//
// Layout: [dot + connector] × 4, then [dot] at the end.
// Current dot: larger (12px), full-opacity stage color.
// Past dots: smaller (8px), stage color at 50% opacity.
// Future dots: smaller (8px), empty circle outline.
// Labels are accessible via title attribute; no visible text (keeps it compact).

const STAGE_DOT_COLOR: Record<DisplayStage, string> = {
  new:        'bg-slate-400',
  introduced: 'bg-sky-500',
  drilling:   'bg-amber-500',
  activate:   'bg-violet-500',
  mastered:   'bg-emerald-600',
}

const ORDERED_STAGES: DisplayStage[] = [
  'new', 'introduced', 'drilling', 'activate', 'mastered',
]

function JourneyPipeline({ stage }: { stage: DisplayStage }) {
  const currentIdx = ORDERED_STAGES.indexOf(stage)
  return (
    <div
      className="flex items-center w-full"
      role="progressbar"
      aria-label={`Learning stage: ${DISPLAY_STAGE_LABEL[stage]}, step ${currentIdx + 1} of ${ORDERED_STAGES.length}`}
    >
      {ORDERED_STAGES.map((s, i) => (
        <div
          key={s}
          className={`flex items-center ${i < ORDERED_STAGES.length - 1 ? 'flex-1' : ''}`}
        >
          {/* Stage dot */}
          <span
            className={[
              'rounded-full shrink-0 transition-all',
              i === currentIdx
                ? `w-3 h-3 ${STAGE_DOT_COLOR[s]}`
                : i < currentIdx
                  ? `w-2 h-2 ${STAGE_DOT_COLOR[s]} opacity-50`
                  : 'w-2 h-2 border-2 border-slate-200 bg-white',
            ].join(' ')}
            title={DISPLAY_STAGE_LABEL[s]}
          />
          {/* Connecting line to next dot */}
          {i < ORDERED_STAGES.length - 1 && (
            <div
              className={`flex-1 h-px mx-1 ${
                i < currentIdx ? 'bg-slate-300' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── ProgressSection ───────────────────────────────────────────────────────────
//
// Replaces the old MasteryMemorySection.  Shows:
//   1. Section header with StageBadge pill
//   2. JourneyPipeline + stage description
//   3. Stage-specific progress block (drilling / activate / mastered only)
//   4. Collapsible memory-system stats (review cadence data)
//   5. Collapsible "How progress works" explanation

function ProgressSection({ item }: { item: VocabItem }) {
  const stage = getDisplayStage(item)
  const [showMemory, setShowMemory] = useState(false)
  const [howOpen,    setHowOpen]    = useState(false)

  const { reviewCount, successfulRecalls, intervalDays, ease, lastReviewedAt, nextReviewAt } = item.review
  const exposureCount   = item.exposureCount ?? 0
  const usageCount      = item.activation?.usageCount ?? 0
  const confidenceLevel = item.activation?.confidenceLevel ?? 0

  const intervalLabel =
    intervalDays === 0 ? 'Due now' :
    intervalDays === 1 ? 'Tomorrow' :
    intervalDays < 14  ? `In ${intervalDays} days` :
    intervalDays < 60  ? `In ${Math.round(intervalDays / 7)} weeks` :
                         `In ${Math.round(intervalDays / 30)} months`

  const easeColor = ease < 1.8 ? 'text-red-600' : ease > 2.5 ? 'text-emerald-600' : 'text-slate-800'

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <TrendingUp size={14} className="text-slate-500 shrink-0" />
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1">Progress</h3>
        <StageBadge item={item} />
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Journey pipeline + description ── */}
        <div>
          <JourneyPipeline stage={stage} />
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            {DISPLAY_STAGE_DESCRIPTION[stage]}
          </p>
        </div>

        {/* ── Stage-specific progress block ── */}

        {/* Drilling: show challenge exposure bar */}
        {stage === 'drilling' && (
          <div>
            <SectionDivider label="Challenge progress" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600">Exposures</span>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {exposureCount}/8
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${
                    i < exposureCount ? 'bg-amber-400' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activate: drilling complete + activation gate checklist */}
        {stage === 'activate' && (
          <div>
            <SectionDivider label="Activation" />
            {/* Confirm drilling is done */}
            <div className="flex items-center gap-2 mb-3 text-xs text-emerald-700">
              <Check size={13} className="text-emerald-500 shrink-0" />
              <span>8 challenge exposures complete</span>
            </div>
            {/* Activation gates — any one is enough */}
            <p className="text-[10px] text-slate-400 italic mb-2">
              Reach any one of these to advance to Mastered:
            </p>
            <div className="space-y-2">
              <MasteryRow
                label="Sentence produced in a challenge"
                done={item.review.sentenceProduced ? 1 : 0}
                needed={1}
                boolStyle
              />
              <MasteryRow
                label="Real-life uses"
                done={Math.min(usageCount, 3)}
                needed={3}
              />
              <MasteryRow
                label="Confidence level"
                done={Math.min(confidenceLevel, 3)}
                needed={3}
              />
            </div>
          </div>
        )}

        {/* Mastered: success confirmation */}
        {stage === 'mastered' && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <Check size={14} className="text-emerald-500 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">
              Part of your active vocabulary.
            </p>
          </div>
        )}

        {/* ── Memory system — collapsible ── */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowMemory((v) => !v)}
            className="flex items-center gap-1.5 w-full text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors"
          >
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform duration-200 ${showMemory ? 'rotate-180' : ''}`}
            />
            Memory system
          </button>
          {showMemory && (
            <div className="mt-3 space-y-3">
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
              {(lastReviewedAt || nextReviewAt) && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-xs">
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── How progress works — collapsible ── */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setHowOpen((v) => !v)}
            className="flex items-center gap-1.5 w-full text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors"
          >
            <ChevronDown
              size={12}
              className={`shrink-0 transition-transform duration-200 ${howOpen ? 'rotate-180' : ''}`}
            />
            How progress works
          </button>
          {howOpen && (
            <ol className="mt-3 space-y-2 pl-5 text-xs text-slate-500 list-decimal leading-relaxed">
              <li>Each challenge session adds one exposure to this word</li>
              <li>After 8 exposures, the word enters the Activate stage</li>
              <li>Activate means: try using it in real conversation, writing, or work</li>
              <li>Once you've produced a sentence or used it enough, the word is Mastered</li>
            </ol>
          )}
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
