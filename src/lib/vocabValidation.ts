/**
 * vocabValidation.ts — Phase 9
 *
 * Pure validation helpers for the vocabulary library.
 * No side-effects, no React, no store — just data in, issues out.
 */

import type { VocabItem, ItemType, Level } from '@/types/vocabulary'

// ── Issue types ────────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info'

export type ValidationCode =
  | 'missing-term'
  | 'duplicate-term'
  | 'missing-definition'
  | 'missing-type'
  | 'invalid-type'
  | 'invalid-level'
  | 'invalid-exposure'
  | 'missing-tags'
  | 'missing-theme'
  | 'enrichment-incomplete'
  | 'relationship-broken'

export interface VocabValidationIssue {
  itemId: string
  term: string
  severity: ValidationSeverity
  code: ValidationCode
  message: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TYPES: ItemType[] = [
  'word', 'phrase', 'chunk', 'idiom', 'phrasal-verb', 'collocation',
]

const VALID_LEVELS: Level[] = [0, 1, 2, 3]

// ── Per-item validation ────────────────────────────────────────────────────────

/**
 * Validate a single VocabItem and return all issues found.
 * Does NOT check for duplicates — use findDuplicateTerms() for that.
 */
export function validateVocabItem(item: VocabItem): VocabValidationIssue[] {
  const issues: VocabValidationIssue[] = []
  const ref = { itemId: item.id, term: item.term || '(no term)' }

  // ── Errors ────────────────────────────────────────────────────────────────

  if (!item.term || item.term.trim() === '') {
    issues.push({
      ...ref,
      severity: 'error',
      code: 'missing-term',
      message: 'Item has no term.',
    })
  }

  if (!item.type) {
    issues.push({
      ...ref,
      severity: 'error',
      code: 'missing-type',
      message: 'Item has no type (word / phrase / idiom etc.).',
    })
  } else if (!VALID_TYPES.includes(item.type)) {
    issues.push({
      ...ref,
      severity: 'error',
      code: 'invalid-type',
      message: `Unknown type "${item.type}". Expected one of: ${VALID_TYPES.join(', ')}.`,
    })
  }

  if (item.level !== undefined && !VALID_LEVELS.includes(item.level as Level)) {
    issues.push({
      ...ref,
      severity: 'error',
      code: 'invalid-level',
      message: `Level ${item.level} is out of range (0–3).`,
    })
  }

  const exp = item.exposureCount ?? 0
  if (exp < 0 || !Number.isInteger(exp)) {
    issues.push({
      ...ref,
      severity: 'error',
      code: 'invalid-exposure',
      message: `exposureCount must be a non-negative integer (got ${item.exposureCount}).`,
    })
  }

  // ── Warnings ──────────────────────────────────────────────────────────────

  if (!item.definitionEn || item.definitionEn.trim() === '') {
    issues.push({
      ...ref,
      severity: 'warning',
      code: 'missing-definition',
      message: 'No English definition — study cards will be bare.',
    })
  }

  if (!item.tags || item.tags.length === 0) {
    issues.push({
      ...ref,
      severity: 'warning',
      code: 'missing-tags',
      message: 'No tags — personalisation scoring will be weaker.',
    })
  }

  if (!item.themes || item.themes.length === 0) {
    issues.push({
      ...ref,
      severity: 'warning',
      code: 'missing-theme',
      message: 'Not assigned to any theme — will not appear in theme-filtered views.',
    })
  }

  // ── Info ──────────────────────────────────────────────────────────────────

  const hasEnrichment =
    item.definitionEn &&
    item.exampleSentence &&
    (item.synonyms ?? []).length > 0

  if (!hasEnrichment) {
    issues.push({
      ...ref,
      severity: 'info',
      code: 'enrichment-incomplete',
      message: 'Missing at least one of: definition, example sentence, synonyms.',
    })
  }

  // Check that relatedEntries IDs will resolve (we only know about this item here,
  // so the cross-item check lives in validateVocabItems).
  // We flag items that have relatedEntries with no explanation as info.
  if (item.relatedEntries && item.relatedEntries.length > 0) {
    const noExplanation = item.relatedEntries.filter((r) => !r.explanation?.trim())
    if (noExplanation.length > 0) {
      issues.push({
        ...ref,
        severity: 'info',
        code: 'relationship-broken',
        message: `${noExplanation.length} related entr${noExplanation.length === 1 ? 'y' : 'ies'} missing an explanation.`,
      })
    }
  }

  return issues
}

// ── Duplicate detection ────────────────────────────────────────────────────────

/**
 * Return one error issue per duplicate term found across the library.
 * Comparison is case-insensitive and trims whitespace.
 */
export function findDuplicateTerms(items: VocabItem[]): VocabValidationIssue[] {
  const seen = new Map<string, VocabItem>()
  const issues: VocabValidationIssue[] = []

  for (const item of items) {
    if (!item.term) continue
    const key = item.term.trim().toLowerCase()
    const first = seen.get(key)
    if (first) {
      // Flag the duplicate (the second occurrence)
      issues.push({
        itemId: item.id,
        term: item.term,
        severity: 'error',
        code: 'duplicate-term',
        message: `Duplicate of "${first.term}" (id: ${first.id}).`,
      })
    } else {
      seen.set(key, item)
    }
  }

  return issues
}

// ── Cross-item broken-relationship check ───────────────────────────────────────

/**
 * Check that every relatedEntry.id points to an existing item in the library.
 * Returns one warning per broken reference.
 */
function findBrokenRelationships(items: VocabItem[]): VocabValidationIssue[] {
  const ids = new Set(items.map((i) => i.id))
  const issues: VocabValidationIssue[] = []

  for (const item of items) {
    if (!item.relatedEntries?.length) continue
    for (const rel of item.relatedEntries) {
      if (!ids.has(rel.id)) {
        issues.push({
          itemId: item.id,
          term: item.term,
          severity: 'warning',
          code: 'relationship-broken',
          message: `Related entry "${rel.term}" (id: ${rel.id}) not found in library.`,
        })
      }
    }
  }

  return issues
}

// ── Full library validation ────────────────────────────────────────────────────

/**
 * Run all validations across the entire library.
 * Returns a flat list of issues sorted: errors first, then warnings, then info.
 */
export function validateVocabItems(items: VocabItem[]): VocabValidationIssue[] {
  const perItem   = items.flatMap((item) => validateVocabItem(item))
  const dupes     = findDuplicateTerms(items)
  const relations = findBrokenRelationships(items)

  const all = [...perItem, ...dupes, ...relations]

  const ORDER: Record<ValidationSeverity, number> = { error: 0, warning: 1, info: 2 }
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])

  return all
}

// ── Summary helpers ────────────────────────────────────────────────────────────

export interface ValidationSummary {
  total:    number
  errors:   number
  warnings: number
  info:     number
  /** True when errors === 0 */
  clean: boolean
}

export function summariseValidation(issues: VocabValidationIssue[]): ValidationSummary {
  const errors   = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.filter((i) => i.severity === 'warning').length
  const info     = issues.filter((i) => i.severity === 'info').length
  return { total: issues.length, errors, warnings, info, clean: errors === 0 }
}
