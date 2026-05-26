/**
 * db.ts — Dexie (IndexedDB) database definition for SpeakEnglishDB.
 *
 * ══════════════════════════════════════════════════════════════════════
 * USER LEARNING HISTORY IS SACRED — DATA SAFETY INVARIANTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every piece of data a learner accumulates represents real effort and
 * real time.  Silent data loss is unacceptable.  The following rules
 * are non-negotiable for all future schema changes:
 *
 *   PROTECTED FIELDS — must never be cleared or overwritten by a
 *   schema upgrade, migration, or automated process:
 *     • exposureCount          — challenge drilling progress (0–8)
 *     • review.*               — SRS scheduling + recall history
 *     • review.sentenceProduced — mastery gate; cannot be re-derived
 *     • activation.usageLogs  — real-life usage history
 *     • activation.usageCount — usage counter
 *     • activation.confidenceLevel — self-reported comfort
 *     • mySentence            — learner's own produced sentence
 *     • status                — queue membership gate
 *     • archived              — soft-delete state
 *     • inFocus / weeklyFocus — focus membership
 *     • tags / themes         — user-assigned organisation
 *     • sourceText / sourceType — user-provided context
 *     • createdAt             — chronological record
 *
 *   SCHEMA UPGRADE RULES:
 *
 *   1. All upgrades must be ADDITIVE.  Add new index columns or
 *      transform existing fields — never remove or clear data.
 *
 *   2. NEVER use `.upgrade((tx) => tx.table('items').clear())` or any
 *      equivalent that truncates the table.  See the v2 comment below
 *      for why this was acceptable once and must never happen again.
 *
 *   3. NEVER use `.upgrade()` to delete, overwrite, or reset any of
 *      the protected fields listed above.
 *
 *   4. Any new VocabItem field added alongside a schema bump must be
 *      handled in `migrateItem()` in `src/lib/migration.ts` with a
 *      safe default so old items are backfilled on next load.
 *
 *   5. If a future change genuinely cannot avoid touching user data,
 *      STOP — do not implement it without explicit product approval,
 *      a manual export/backup step surfaced to the user, and a
 *      documented recovery path.
 *
 * See also: CLAUDE.md § User Data Safety and Persistence
 * ══════════════════════════════════════════════════════════════════════
 */

import Dexie, { Table } from 'dexie'
import { VocabItem } from '@/types/vocabulary'

class VocabDatabase extends Dexie {
  items!: Table<VocabItem, string>

  constructor() {
    super('SpeakEnglishDB')

    // v1 — original schema (small built-in seed data)
    this.version(1).stores({
      items: 'id, status, type, weeklyFocus, archived, &term, *tags',
    })

    // v2 — ⚠ HISTORICAL DESTRUCTIVE UPGRADE — MUST NOT BE REPEATED ⚠
    //
    // Context: this ran during early development (pre-production, zero real
    // users) to replace a tiny 20-item seed with 1 156 enriched entries from
    // migration-vocab.json.  Wiping all items was acceptable ONLY because:
    //   • no learner had accumulated any real progress at this point, AND
    //   • the app was in internal development / initial setup.
    //
    // NOW THAT REAL USERS HAVE PROGRESS THIS MUST NEVER BE REPEATED.
    //
    // Do not use this block as a template.  `.upgrade((tx) => tx.table('items').clear())`
    // would silently erase every learner's exposureCount, review history,
    // usage logs, confidence levels, focus membership, and archived state.
    // That is an unrecoverable data loss with no warning to the user.
    //
    // All future upgrades must follow the additive rules in the file header.
    this.version(2)
      .stores({
        items: 'id, status, type, weeklyFocus, archived, &term, *tags',
      })
      .upgrade((tx) => tx.table('items').clear())  // ← pre-production only; never repeat

    // v3 — add *themes multi-value index.
    // Non-destructive: existing items get themes: [] defaulted in load().
    this.version(3).stores({
      items: 'id, status, type, weeklyFocus, archived, &term, *tags, *themes',
    })

    // v4 — add learned index for filtering.
    // Non-destructive: existing items default to learned: undefined (falsy).
    this.version(4).stores({
      items: 'id, status, type, weeklyFocus, archived, learned, &term, *tags, *themes',
    })

    // v5 — remove separate learned concept; merge into mastered status.
    // Non-destructive data transform: items with learned=true are promoted to
    // mastered; all other fields on every item are preserved untouched.
    this.version(5)
      .stores({
        items: 'id, status, type, weeklyFocus, archived, &term, *tags, *themes',
      })
      .upgrade((tx) =>
        tx
          .table('items')
          .filter((item) => item.learned === true)
          .modify({ status: 'mastered', learned: undefined }),
      )

    // ── Future versions: add below this line ─────────────────────────────────
    //
    // Before adding v6+, re-read the DATA SAFETY INVARIANTS at the top of this
    // file.  Every upgrade must be additive and data-preserving.  When in doubt,
    // write the new field into migrateItem() in src/lib/migration.ts instead of
    // adding a Dexie upgrade handler — migrateItem() runs on every load and is
    // safer than a one-shot upgrade that cannot be undone.
  }
}

export const db = new VocabDatabase()
