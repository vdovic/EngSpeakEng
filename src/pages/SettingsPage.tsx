/**
 * SettingsPage.tsx — Phase 9
 *
 * Three sections:
 *   1. Export — download a full JSON backup of the vocabulary library
 *   2. Import — pick a JSON backup, preview what will change, then import safely
 *   3. Validation — check the library for data quality issues
 */

import { useRef, useState } from 'react'
import {
  Download, Upload, ShieldCheck, AlertTriangle, Info,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, FileJson,
  AlertCircle, Activity,
} from 'lucide-react'
import { useVocabStore }  from '@/store/vocabStore'
import {
  exportVocabToJson,
  downloadVocabJson,
  parseImportedVocabJson,
  mergeImportedVocabItems,
  VocabImportError,
  type MergeResult,
} from '@/lib/vocabImportExport'
import {
  validateVocabItems,
  summariseValidation,
  type VocabValidationIssue,
  type ValidationSummary,
} from '@/lib/vocabValidation'
import { buildDiagnosticReport, downloadDiagnosticReport } from '@/lib/diagnostics'
import { APP_VERSION, APP_PHASE, BUILD_DATE } from '@/lib/appVersion'
import type { VocabItem } from '@/types/vocabulary'

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-brand-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  error: {
    label: 'Error',
    icon:  XCircle,
    chip:  'bg-red-100 text-red-700',
    row:   'border-red-200 bg-red-50/40',
  },
  warning: {
    label: 'Warning',
    icon:  AlertTriangle,
    chip:  'bg-amber-100 text-amber-700',
    row:   'border-amber-200 bg-amber-50/40',
  },
  info: {
    label: 'Info',
    icon:  Info,
    chip:  'bg-sky-100 text-sky-700',
    row:   'border-sky-200 bg-sky-50/40',
  },
} as const

function SeverityChip({ severity }: { severity: keyof typeof SEVERITY_CONFIG }) {
  const cfg = SEVERITY_CONFIG[severity]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.chip}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ── Validation results list ────────────────────────────────────────────────────

function ValidationResults({ issues }: { issues: VocabValidationIssue[] }) {
  const [showAll, setShowAll] = useState(false)
  const SHOW_INITIAL = 15
  const visible = showAll ? issues : issues.slice(0, SHOW_INITIAL)

  if (issues.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((issue, i) => {
        const cfg = SEVERITY_CONFIG[issue.severity]
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-sm ${cfg.row}`}
          >
            <div className="shrink-0 pt-0.5">
              <SeverityChip severity={issue.severity} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-slate-800 mr-1">{issue.term}</span>
              <span className="text-slate-600">{issue.message}</span>
            </div>
          </div>
        )
      })}

      {issues.length > SHOW_INITIAL && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium mt-1"
        >
          {showAll ? (
            <><ChevronUp size={14} /> Show fewer</>
          ) : (
            <><ChevronDown size={14} /> Show all {issues.length} issues</>
          )}
        </button>
      )}
    </div>
  )
}

// ── Validation summary card ────────────────────────────────────────────────────

function ValidationSummaryCard({ summary }: { summary: ValidationSummary }) {
  if (summary.clean && summary.warnings === 0 && summary.info === 0) {
    return (
      <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
        <span className="font-medium">Library looks healthy — no issues found.</span>
      </div>
    )
  }

  const pills = [
    summary.errors   > 0 && { label: `${summary.errors} error${summary.errors > 1 ? 's' : ''}`,     cls: 'bg-red-100 text-red-700' },
    summary.warnings > 0 && { label: `${summary.warnings} warning${summary.warnings > 1 ? 's' : ''}`, cls: 'bg-amber-100 text-amber-700' },
    summary.info     > 0 && { label: `${summary.info} info`,                                          cls: 'bg-sky-100 text-sky-700' },
  ].filter(Boolean) as { label: string; cls: string }[]

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl border text-sm ${
      summary.errors > 0
        ? 'bg-red-50/50 border-red-200 text-red-800'
        : 'bg-amber-50/50 border-amber-200 text-amber-800'
    }`}>
      <AlertCircle size={16} className="shrink-0" />
      <span className="font-medium">{summary.total} issue{summary.total !== 1 ? 's' : ''} found across your library</span>
      <div className="flex gap-1.5 flex-wrap">
        {pills.map((p) => (
          <span key={p.label} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.cls}`}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── Export section ─────────────────────────────────────────────────────────────

function ExportSection({ items }: { items: VocabItem[] }) {
  const [exported, setExported] = useState(false)

  function handleExport() {
    const payload = exportVocabToJson(items)
    downloadVocabJson(payload)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <Section title="Export" icon={Download}>
      <p className="text-sm text-slate-600 leading-relaxed">
        Download your entire vocabulary library as a JSON file. This is your personal
        backup — keep it somewhere safe. You can re-import it at any time to restore
        or migrate your words.
      </p>

      <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-600" />
        <span>
          <strong>Local storage reminder:</strong> your vocabulary is stored only in this
          browser. Export regularly, especially before clearing browser data or switching
          devices.
        </span>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <p className="text-sm font-medium text-slate-700">{items.length} word{items.length !== 1 ? 's' : ''} in your library</p>
          <p className="text-xs text-slate-500 mt-0.5">Including archived items</p>
        </div>
        <button
          onClick={handleExport}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            exported
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-600 hover:bg-brand-700 text-white'
          }`}
        >
          {exported ? (
            <><CheckCircle2 size={15} /> Downloaded!</>
          ) : (
            <><Download size={15} /> Download backup</>
          )}
        </button>
      </div>
    </Section>
  )
}

// ── Import section ─────────────────────────────────────────────────────────────

function ImportSection({ items }: { items: VocabItem[] }) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [parseError,  setParseError]  = useState<string | null>(null)
  const [preview,     setPreview]     = useState<MergeResult | null>(null)
  const [importState, setImportState] = useState<'idle' | 'importing' | 'done'>('idle')
  const { bulkImport } = useVocabStore()

  function reset() {
    setParseError(null)
    setPreview(null)
    setImportState('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError(null)
    setPreview(null)
    setImportState('idle')

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed  = parseImportedVocabJson(ev.target?.result as string)
        const result  = mergeImportedVocabItems(items, parsed)
        setPreview(result)
      } catch (err) {
        if (err instanceof VocabImportError) {
          setParseError(err.message)
        } else {
          setParseError('Unexpected error reading the file.')
        }
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!preview) return
    setImportState('importing')
    try {
      await bulkImport(preview.merged)
      setImportState('done')
    } catch {
      setParseError('Import failed — your library has not been changed.')
      setImportState('idle')
    }
  }

  return (
    <Section title="Import" icon={Upload}>
      <p className="text-sm text-slate-600 leading-relaxed">
        Restore a previously exported backup or merge vocabulary from another device.
        Existing words are never overwritten with older data — duplicates by term are
        skipped automatically.
      </p>

      {importState === 'done' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            Import complete — your library has been updated.
          </div>
          {preview && (
            <ul className="text-sm text-slate-600 space-y-1 pl-2">
              <li>· <strong>{preview.added}</strong> new word{preview.added !== 1 ? 's' : ''} added</li>
              {preview.updatedExisting > 0 && (
                <li>· <strong>{preview.updatedExisting}</strong> existing word{preview.updatedExisting !== 1 ? 's' : ''} updated (newer data won)</li>
              )}
              {preview.skippedDuplicates > 0 && (
                <li>· <strong>{preview.skippedDuplicates}</strong> duplicate{preview.skippedDuplicates !== 1 ? 's' : ''} skipped</li>
              )}
            </ul>
          )}
          <button onClick={reset} className="text-sm text-brand-600 hover:text-brand-800 font-medium">
            Import another file
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File picker */}
          <div
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileJson size={28} className="text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              {preview ? 'File loaded — review below' : 'Click to choose a JSON backup file'}
            </p>
            <p className="text-xs text-slate-400">vocab-backup-*.json</p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              <XCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview */}
          {preview && !parseError && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-sm">
                <p className="font-semibold text-slate-700 mb-2">Import preview</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-2xl font-bold text-emerald-600">{preview.added}</p>
                    <p className="text-xs text-slate-500 mt-0.5">New words</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-2xl font-bold text-brand-600">{preview.updatedExisting}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Updated</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-2xl font-bold text-slate-400">{preview.skippedDuplicates}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Skipped</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importState === 'importing' || preview.added === 0 && preview.updatedExisting === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {importState === 'importing' ? (
                    'Importing…'
                  ) : preview.added === 0 && preview.updatedExisting === 0 ? (
                    'Nothing to import'
                  ) : (
                    <><Upload size={15} /> Import safely</>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

// ── Validation section ─────────────────────────────────────────────────────────

function ValidationSection({ items }: { items: VocabItem[] }) {
  const [result,   setResult]   = useState<{ issues: VocabValidationIssue[]; summary: ValidationSummary } | null>(null)
  const [checking, setChecking] = useState(false)

  function handleCheck() {
    setChecking(true)
    // Use a micro-task to let the spinner render first
    setTimeout(() => {
      const issues  = validateVocabItems(items)
      const summary = summariseValidation(issues)
      setResult({ issues, summary })
      setChecking(false)
    }, 0)
  }

  return (
    <Section title="Library Validation" icon={ShieldCheck}>
      <p className="text-sm text-slate-600 leading-relaxed">
        Scan your vocabulary library for data quality issues — missing definitions,
        duplicate terms, broken relationships, and more. Errors affect app behaviour;
        warnings and info items are advisory.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCheck}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <ShieldCheck size={15} />
          {checking ? 'Checking…' : result ? 'Re-check library' : 'Check library'}
        </button>
        {result && (
          <span className="text-xs text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''} scanned
          </span>
        )}
      </div>

      {result && (
        <div className="space-y-3 mt-1">
          <ValidationSummaryCard summary={result.summary} />
          <ValidationResults issues={result.issues} />
        </div>
      )}
    </Section>
  )
}

// ── Diagnostics section ────────────────────────────────────────────────────────

function DiagnosticsSection({ items }: { items: VocabItem[] }) {
  const [downloaded, setDownloaded] = useState(false)

  function handleDownload() {
    const report = buildDiagnosticReport(items)
    downloadDiagnosticReport(report)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <Section title="Diagnostics" icon={Activity}>
      <p className="text-sm text-slate-600 leading-relaxed">
        Download a technical snapshot of app state to help diagnose issues.
        The report includes item counts, validation summary, localStorage keys,
        and browser info — <strong>no vocabulary content or personal notes</strong>.
      </p>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-sm text-slate-600 space-y-0.5">
          <p className="font-medium text-slate-700">Diagnostic report</p>
          <p className="text-xs text-slate-400">ese-diagnostics-YYYY-MM-DD.json</p>
        </div>
        <button
          onClick={handleDownload}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            downloaded
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-700 hover:bg-slate-800 text-white'
          }`}
        >
          {downloaded ? (
            <><CheckCircle2 size={15} /> Downloaded!</>
          ) : (
            <><Download size={15} /> Download report</>
          )}
        </button>
      </div>
    </Section>
  )
}

// ── About section ──────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <Section title="About" icon={Info}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'App version', value: `v${APP_VERSION}` },
          { label: 'Current phase', value: APP_PHASE },
          { label: 'Build date', value: BUILD_DATE },
          { label: 'Storage', value: 'Local (IndexedDB + localStorage)' },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-medium text-slate-700 break-words">{value}</p>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-400 leading-relaxed pt-1">
        All vocabulary data is stored entirely in your browser. Nothing is sent to a server.
        Export backups regularly to protect against browser data loss.
      </p>
    </Section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  // Include archived items in export/validation so the backup is complete
  const allItems = useVocabStore((s) => s.items)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-5 pb-28 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your library data — export backups, import from a file, validate content quality, and view app info.
        </p>
      </div>

      <ExportSection items={allItems} />
      <ImportSection items={allItems} />
      <ValidationSection items={allItems} />
      <DiagnosticsSection items={allItems} />
      <AboutSection />
    </div>
  )
}
