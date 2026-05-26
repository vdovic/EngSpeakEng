/**
 * vocabImportExport.ts — Phase 10
 *
 * Helpers for exporting the local vocabulary library to JSON and safely
 * importing it back.  No React, no store — pure data transformations.
 *
 * Backward compatibility guarantee:
 *   • parseImportedVocabJson — MUST remain unchanged; handles both the bare
 *     array format (very old exports) and VocabExportPayload format.
 *   • All new export sections (gamification, themes, preferences) are optional
 *     in VocabExportPayload, so old imports that lack them work without change.
 *   • parseFullExport delegates to parseImportedVocabJson for the items array,
 *     then extracts the optional sections — callers that only care about items
 *     can continue using parseImportedVocabJson directly.
 */

import type { Badge, VocabItem } from '@/types/vocabulary'
import { migrateItem } from '@/lib/migration'
import { APP_VERSION } from '@/lib/appVersion'

// ── Gamification snapshot ──────────────────────────────────────────────────────

/**
 * A point-in-time snapshot of the gamification store fields.
 * Matches the persisted shape of useGamificationStore exactly.
 */
export interface GamificationSnapshot {
  points:               number
  streakDays:           number
  lastChallengeDate:    string | null
  badges:               Badge[]
  challengeCompletions: number
  /** Daily points keyed by YYYY-MM-DD. */
  pointsHistory:        Record<string, number>
  goalTarget:           number
  goalStartDate:        string
  goalDeadline:         string
  gamesPlayed:          number
  bestGameStreak:       number
}

// ── Preferences snapshot ───────────────────────────────────────────────────────

/**
 * Minimal onboarding/preferences snapshot included in a full backup.
 * Only non-destructive fields are included — the completed flag is excluded
 * so that importing from a backup never re-triggers onboarding.
 * onboardingProfile is typed as `unknown` for forward compatibility.
 */
export interface PreferencesSnapshot {
  onboardingCompleted?: boolean
  onboardingProfile?:   unknown
}

// ── Export payload ─────────────────────────────────────────────────────────────

export interface VocabExportPayload {
  exportedAt:    string        // ISO timestamp
  appVersion?:   string        // semver string
  itemCount:     number
  items:         VocabItem[]
  // Optional sections — absent in exports from versions before Phase 10
  gamification?: GamificationSnapshot
  themes?:       string[]
  preferences?:  PreferencesSnapshot
}

/** Optional extra sections passed to exportVocabToJson. */
export interface ExportExtras {
  gamification?: GamificationSnapshot
  themes?:       string[]
  preferences?:  PreferencesSnapshot
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Build the structured JSON export payload from the current library items
 * and optional extra sections (gamification, themes, preferences).
 * Archived items are included so the backup is complete.
 */
export function exportVocabToJson(
  items: VocabItem[],
  extras?: ExportExtras,
): VocabExportPayload {
  return {
    exportedAt:  new Date().toISOString(),
    appVersion:  APP_VERSION,
    itemCount:   items.length,
    items,
    ...extras,
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

// ── Full export parse ──────────────────────────────────────────────────────────

/**
 * The result of parsing a full backup file — items plus any optional sections.
 * Missing sections (from older exports) will be undefined.
 */
export interface FullExportParseResult {
  items:        VocabItem[]
  gamification?: GamificationSnapshot
  themes?:       string[]
  preferences?:  PreferencesSnapshot
}

/**
 * Parse a full backup file.  Items are validated and migrated via the existing
 * parseImportedVocabJson path (backward-compatible with bare-array and v1 payloads).
 * Optional sections are extracted when present and lightly validated for shape.
 *
 * Throws VocabImportError if the items cannot be parsed.
 */
export function parseFullExport(raw: string): FullExportParseResult {
  // Items — delegate to the existing backward-compat parser.
  // This may throw VocabImportError; let it propagate to callers.
  const items = parseImportedVocabJson(raw)

  // Re-parse the outer envelope to extract optional sections.
  // JSON.parse will not throw here because parseImportedVocabJson already
  // succeeded (meaning the raw string is valid JSON).
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { items }
  }

  // Bare array format has no extra sections
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    return { items }
  }

  const obj = parsed as Record<string, unknown>
  const result: FullExportParseResult = { items }

  if (obj.gamification != null && typeof obj.gamification === 'object' && !Array.isArray(obj.gamification)) {
    result.gamification = obj.gamification as GamificationSnapshot
  }
  if (Array.isArray(obj.themes)) {
    result.themes = (obj.themes as unknown[]).filter((t): t is string => typeof t === 'string')
  }
  if (obj.preferences != null && typeof obj.preferences === 'object' && !Array.isArray(obj.preferences)) {
    result.preferences = obj.preferences as PreferencesSnapshot
  }

  return result
}

// ── Gamification merge ─────────────────────────────────────────────────────────

/** Return the later of two nullable date strings (YYYY-MM-DD or ISO). */
function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

/**
 * Merge an imported gamification snapshot into the current store state.
 *
 * Strategy — max-wins for counters:
 *   • points, streakDays, challengeCompletions, gamesPlayed, bestGameStreak
 *     → Math.max(current, imported)   — prevents regression, avoids double-count
 *   • lastChallengeDate → later of the two dates
 *   • badges → union of both sets; for duplicates prefer the earlier unlockedAt
 *     (the first time is the real achievement)
 *   • pointsHistory → per-date max so daily totals never deflate
 *   • goal settings (goalTarget, goalStartDate, goalDeadline) → current wins
 *     (the user may have changed their goal after the backup was taken)
 */
export function mergeGamificationSnapshot(
  current:  GamificationSnapshot,
  imported: GamificationSnapshot,
): GamificationSnapshot {
  const badgeMap = new Map<string, Badge>()
  for (const b of [...current.badges, ...imported.badges]) {
    const existing = badgeMap.get(b.id)
    if (!existing) {
      badgeMap.set(b.id, b)
    } else if (
      b.unlockedAt && existing.unlockedAt && b.unlockedAt < existing.unlockedAt
    ) {
      // Prefer the earlier unlock timestamp — that's the original achievement
      badgeMap.set(b.id, b)
    }
  }

  const pointsHistory: Record<string, number> = { ...imported.pointsHistory }
  for (const [date, pts] of Object.entries(current.pointsHistory)) {
    pointsHistory[date] = Math.max(pointsHistory[date] ?? 0, pts)
  }

  return {
    points:               Math.max(current.points,               imported.points),
    streakDays:           Math.max(current.streakDays,           imported.streakDays),
    lastChallengeDate:    laterDate(current.lastChallengeDate,    imported.lastChallengeDate),
    badges:               Array.from(badgeMap.values()),
    challengeCompletions: Math.max(current.challengeCompletions, imported.challengeCompletions),
    pointsHistory,
    // Preserve current goal — user may have updated it after the backup was taken
    goalTarget:           current.goalTarget,
    goalStartDate:        current.goalStartDate,
    goalDeadline:         current.goalDeadline,
    gamesPlayed:          Math.max(current.gamesPlayed,           imported.gamesPlayed),
    bestGameStreak:       Math.max(current.bestGameStreak,        imported.bestGameStreak),
  }
}
