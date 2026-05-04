# Content Library Governance

Phase 9 — added May 2026.

Defines how vocabulary data is structured, validated, exported, and imported across the ESE app.

---

## Data shape

Every word in the library is a `VocabItem` (see `src/types/vocabulary.ts`).
Key fields used for governance:

| Field | Required | Notes |
|---|---|---|
| `id` | ✓ | `crypto.randomUUID()` — must be globally unique |
| `term` | ✓ | Non-empty string; case-insensitive uniqueness enforced |
| `type` | ✓ | `word \| phrase \| chunk \| idiom \| phrasal-verb \| collocation` |
| `level` | advisory | `0–3`; derived by `deriveLevel()` in `progressionLogic.ts` |
| `tags` | advisory | Kebab-case, lower-case; drive personalisation scoring |
| `themes` | advisory | Must match a theme name defined in `themesStore` |
| `definitionEn` | advisory | Required for study card quality |
| `exposureCount` | advisory | Non-negative integer; `0` = never challenged |

---

## Validation rules

All rules live in `src/lib/vocabValidation.ts`.

### Errors (break app behaviour)

| Code | Trigger |
|---|---|
| `missing-term` | `item.term` is empty or whitespace |
| `duplicate-term` | Two items share the same normalised term |
| `missing-type` | `item.type` is absent |
| `invalid-type` | `item.type` is not one of the six valid values |
| `invalid-level` | `item.level` is set but not in `[0, 1, 2, 3]` |
| `invalid-exposure` | `item.exposureCount` is negative or non-integer |

### Warnings (degrade UX)

| Code | Trigger |
|---|---|
| `missing-definition` | No `definitionEn` |
| `missing-tags` | No entries in `tags` array |
| `missing-theme` | No entries in `themes` array |
| `relationship-broken` | A `relatedEntries` ID does not exist in the library |

### Info (advisory)

| Code | Trigger |
|---|---|
| `enrichment-incomplete` | Missing at least one of: definition, example, synonyms |
| `relationship-broken` | A `relatedEntry` is missing its `explanation` field |

Run validation from **Settings → Library Validation → Check library**.

---

## Export

`src/lib/vocabImportExport.ts` → `exportVocabToJson()` + `downloadVocabJson()`

Export payload shape:

```json
{
  "exportedAt": "2026-05-04T12:00:00.000Z",
  "appVersion": "0.1.0",
  "itemCount": 147,
  "items": [ ...VocabItem[] ]
}
```

- All items are included (active + archived).
- Filename: `vocab-backup-YYYY-MM-DD.json`.
- The file is human-readable pretty-printed JSON.

**When to export:** before clearing browser data, switching devices, or making bulk edits.

---

## Import

`parseImportedVocabJson(raw: string): VocabItem[]`

- Accepts a full export payload (`{ items: [...] }`) or a bare array (`[...]`).
- Validates that every element has a string `id` and `term`.
- Runs each item through `migrateItem()` to backfill any missing fields from earlier phases.
- Throws `VocabImportError` with a user-friendly message on failure.

### Merge strategy (`mergeImportedVocabItems`)

| Situation | Action |
|---|---|
| Same ID, same `updatedAt` or existing is newer | Keep existing, no change |
| Same ID, imported is newer | Replace with imported (newer data wins) |
| Different ID, same normalised term | Skip imported (prefer existing name) |
| Different ID, new term | Add as new item |

The merge never deletes existing items. Run from **Settings → Import**.

---

## Seeding and starter packs

- `src/lib/seed.ts` — `createSeedData()` returns ~15 richly populated demo items used on first load.
- `src/types/starterPacks.ts` — `StarterPack` type; `importPack()` in `vocabStore` bulk-adds without triggering AI enrichment.
- Starter pack items arrive with `tags` and `themes` pre-filled; they pass validation out of the box.

---

## Adding new vocabulary items

### Via the UI (Quick Add modal)
1. Type term → AI enrichment runs automatically via `/api/enrich`.
2. Tags and themes are suggested by `suggestThemes()`.
3. Item lands at `level: 0` (New).

### Via seed data
Add entries to `createSeedData()` in `src/lib/seed.ts`.
Use `makeItem({ term, type, ...fields })` to get all defaults.
All fields listed in `VocabItem` are valid.

### Via import
Export from another device → import via **Settings → Import**.

---

## Keeping data healthy

1. **Export regularly** — once a week is sufficient for active learners.
2. **Run validation** after any bulk operation (import, starter pack load).
3. **Fix errors first** — duplicates and missing terms affect search and personalisation.
4. **Warnings are advisory** — missing definitions reduce study card quality but don't break the app.
5. **After AI enrichment fails** — items get `generationStatus: 'failed'`; retry from the word's detail page.
