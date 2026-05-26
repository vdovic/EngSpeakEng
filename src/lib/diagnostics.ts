/**
 * diagnostics.ts — Phase 10
 *
 * Build and download a safe diagnostic report for debugging and support.
 * Does NOT include vocabulary content, personal notes, or full item data.
 */

import type { VocabItem } from '@/types/vocabulary'
import { APP_VERSION, APP_PHASE, BUILD_DATE } from '@/lib/appVersion'
import { validateVocabItems, summariseValidation } from '@/lib/vocabValidation'
import { getCanonicalLevel } from '@/lib/progressionLogic'

// ── Known localStorage keys ────────────────────────────────────────────────────

const KNOWN_LS_KEYS = [
  'speak-english-onboarding',
  'speak-english-gamification',
  'speak-english-themes',
  'focus-week-start',
  'ese-challenge-session',
  'ese-review-tip-v1',
  'ese.challenge.practiceMode',
  'active-focus-order',
] as const

// ── Report shape ───────────────────────────────────────────────────────────────

export interface DiagnosticReport {
  generatedAt:    string
  appVersion:     string
  appPhase:       string
  buildDate:      string
  userAgent:      string
  library: {
    totalItems:      number
    archivedItems:   number
    masteredItems:   number
    focusItems:      number
    itemsWithDef:    number
    itemsWithTags:   number
    itemsInChallenge: number
  }
  validation: {
    errors:   number
    warnings: number
    info:     number
    clean:    boolean
  }
  localStorage: {
    key:    string
    exists: boolean
    bytes:  number | null
  }[]
  indexedDB: {
    available: boolean
  }
}

// ── Build report ───────────────────────────────────────────────────────────────

export function buildDiagnosticReport(items: VocabItem[]): DiagnosticReport {
  const validationIssues = validateVocabItems(items)
  const validationSummary = summariseValidation(validationIssues)

  const lsEntries = KNOWN_LS_KEYS.map((key) => {
    try {
      const val = localStorage.getItem(key)
      return {
        key,
        exists: val !== null,
        bytes:  val !== null ? new Blob([val]).size : null,
      }
    } catch {
      return { key, exists: false, bytes: null }
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    appVersion:  APP_VERSION,
    appPhase:    APP_PHASE,
    buildDate:   BUILD_DATE,
    userAgent:   navigator.userAgent,

    library: {
      totalItems:       items.length,
      archivedItems:    items.filter((i) => i.archived).length,
      masteredItems:    items.filter((i) => getCanonicalLevel(i) >= 3).length,
      focusItems:       items.filter((i) => i.inFocus).length,
      itemsWithDef:     items.filter((i) => !!i.definitionEn).length,
      itemsWithTags:    items.filter((i) => (i.tags ?? []).length > 0).length,
      itemsInChallenge: items.filter((i) => (i.exposureCount ?? 0) > 0 && (i.exposureCount ?? 0) < 8).length,
    },

    validation: {
      errors:   validationSummary.errors,
      warnings: validationSummary.warnings,
      info:     validationSummary.info,
      clean:    validationSummary.clean,
    },

    localStorage: lsEntries,

    indexedDB: {
      available: typeof indexedDB !== 'undefined',
    },
  }
}

// ── Download ───────────────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the diagnostic report as a JSON file.
 * Filename: ese-diagnostics-YYYY-MM-DD.json
 */
export function downloadDiagnosticReport(report: DiagnosticReport): void {
  const dateSlug = report.generatedAt.slice(0, 10)
  const filename = `ese-diagnostics-${dateSlug}.json`

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()

  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}
