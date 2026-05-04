/**
 * vocabImportExport.ts — Phase 9
 *
 * Helpers for exporting the local vocabulary library to JSON and safely
 * importing it back.  No React, no store — pure data transformations.
 */

import type { VocabItem } from '@/types/vocabulary'
import { migrateItem } from '@/lib/migration'

// ── Export payload ─────────────────────────────────────────────────────────────

export interface VocabExportPayload {
  exportedAt:  string        // ISO timestamp
  appVersion?: string        // package.json version if available
  itemCount:   number
  items:       VocabItem[]
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Build the structured JSON export payload from the current library items.
 * Archived items are included so the backup is complete.
 */
export function exportVocabToJson(items: VocabItem[]): VocabExportPayload {
  return {
    exportedAt:  new Date().toISOString(),
    appVersion:  '0.1.0',          // keep in sync with package.json
    itemCount:   items.length,
    items:       items,
  }
}

/**
 * Trigger a JSON file download in the browser.
 * Filename: vocab-backup-YYYY-MM-DD.json
 */
export function downloadVocabJson(payload: VocabExportPayload): void {
  const dateSlug = payload.exportedAt.slice(0, 10)  // "YYYY-MM-DD"
  const filename = `vocab-backup-${dateSlug}.json`

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()

  // Clean up the object URL after the browser picks up the download
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

// ── Import ────────────────────────────────────────────────────────────────────

/** Thrown by parseImportedVocabJson when the file structure is unrecognised. */
export class VocabImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VocabImportError'
  }
}

/**
 * Parse and lightly validate a raw JSON string from an imported file.
 * Runs every item through the idempotent migration to backfill any missing
 * fields before returning.
 *
 * Throws VocabImportError if the JSON is invalid or the shape is wrong.
 */
export function parseImportedVocabJson(raw: string): VocabItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new VocabImportError('File is not valid JSON.')
  }

  // Accept two shapes:
  //   1. A full VocabExportPayload  { items: [...] }
  //   2. A bare array               [...]  (e.g. exported from an earlier version)
  let items: unknown[]

  if (Array.isArray(parsed)) {
    items = parsed
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'items' in (parsed as object) &&
    Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    items = (parsed as Record<string, unknown>).items as unknown[]
  } else {
    throw new VocabImportError(
      'Unrecognised file format — expected a vocab export or a plain array.',
    )
  }

  if (items.length === 0) {
    return []
  }

  // Basic shape guard: every element must have at least id + term
  const invalid = items.filter(
    (it) =>
      it === null ||
      typeof it !== 'object' ||
      typeof (it as Record<string, unknown>).id !== 'string' ||
      typeof (it as Record<string, unknown>).term !== 'string',
  )
  if (invalid.length > 0) {
    throw new VocabImportError(
      `${invalid.length} item(s) are missing required "id" or "term" fields.`,
    )
  }

  // Run migration so old export files get backfilled fields
  return (items as VocabItem[]).map(migrateItem)
}

// ── Merge ─────────────────────────────────────────────────────────────────────

export interface MergeResult {
  merged:            VocabItem[]  // full combined library (existing + new)
  added:             number       // net new items added
  skippedDuplicates: number       // items skipped because term already exists (same id)
  updatedExisting:   number       // items where id matched but content differed (updatedAt wins)
}

/**
 * Merge imported items into the existing library without data loss.
 *
 * Strategy:
 *   • Same ID + same content    → keep existing (no change)
 *   • Same ID + different       → keep whichever was updated most recently
 *   • Different ID + same term  → skip imported (duplicate by name, prefer existing)
 *   • Different ID + new term   → add as new
 */
export function mergeImportedVocabItems(
  existing: VocabItem[],
  imported: VocabItem[],
): MergeResult {
  const byId   = new Map(existing.map((i) => [i.id,                     i]))
  const byTerm = new Map(existing.map((i) => [i.term.trim().toLowerCase(), i]))

  let added             = 0
  let skippedDuplicates = 0
  let updatedExisting   = 0

  const merged = new Map(byId)  // start with all existing items

  for (const imp of imported) {
    const termKey = imp.term.trim().toLowerCase()

    if (merged.has(imp.id)) {
      // Same ID already in library — compare updatedAt to decide which wins
      const cur = merged.get(imp.id)!
      if (imp.updatedAt > cur.updatedAt) {
        merged.set(imp.id, imp)
        updatedExisting++
      }
      // else: keep existing — no action needed
    } else if (byTerm.has(termKey)) {
      // Different ID but same term — treat as duplicate by name
      skippedDuplicates++
    } else {
      // Brand new item
      merged.set(imp.id, imp)
      added++
    }
  }

  return {
    merged:            Array.from(merged.values()),
    added,
    skippedDuplicates,
    updatedExisting,
  }
}
