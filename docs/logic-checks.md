# Logic Checks

Manual and console-level checks for the core pure functions.
Run these in the browser DevTools console or a scratch script when making changes
to `progressionLogic.ts`, `challengeLogic.ts`, `vocabValidation.ts`, or `personalizationLogic.ts`.

---

## 1. `deriveLevel` / `getCanonicalLevel`

Both are the same function. `getCanonicalLevel` is the preferred name in new code.

### Rules under test

| exposureCount | sentenceProduced | usageCount | Expected level |
|---|---|---|---|
| 0 | — | — | 0 (New) |
| 1 | — | — | 1 (Learning) |
| 2 | — | — | 1 (Learning) |
| 3 | — | — | 2 (Familiar) |
| 7 | true | 5 | 2 (Familiar) — exp < 8 |
| 8 | true | 0 | 3 (Mastered) |
| 8 | false | 3 | 3 (Mastered) — usageCount qualifies |
| 8 | false | 2 | 2 (Familiar) — neither condition met |
| 9 | true | 5 | 3 (Mastered) — capped by challenge, but derives correctly |

### Console check

```js
// Paste into DevTools console after app loads

import('/src/lib/progressionLogic.ts').then(({ getCanonicalLevel }) => {
  const makeItem = (exp, sentenceProduced, usageCount) => ({
    exposureCount: exp,
    review: { sentenceProduced, intervalDays: 1, ease: 2.5, reviewCount: 0, successfulRecalls: 0 },
    activation: { requiredUses: 3, usageCount, usageLogs: [] },
  })

  const cases = [
    [makeItem(0,  false, 0), 0],
    [makeItem(1,  false, 0), 1],
    [makeItem(2,  false, 0), 1],
    [makeItem(3,  false, 0), 2],
    [makeItem(7,  true,  5), 2],  // exp < 8 — stays Familiar
    [makeItem(8,  true,  0), 3],
    [makeItem(8,  false, 3), 3],  // usageCount qualifies
    [makeItem(8,  false, 2), 2],  // neither condition
  ]

  cases.forEach(([item, expected]) => {
    const got = getCanonicalLevel(item)
    const ok  = got === expected
    console[ok ? 'log' : 'error'](`exp=${item.exposureCount} sp=${item.review.sentenceProduced} uc=${item.activation.usageCount} → ${got} (expected ${expected}) ${ok ? '✓' : '✗'}`)
  })
})
```

---

## 2. `getChallengeType`

### Rules under test

| exposureCount | definitionEn | exampleSentence | sentenceProduced | usageCount | Expected type |
|---|---|---|---|---|---|
| 0 | — | — | — | — | recognition |
| 0 | "some def" | — | — | — | recognition |
| 1 | — | — | — | — | recognition (no definition) |
| 1 | "some def" | — | — | — | definition-choice |
| 2 | "some def" | — | — | — | definition-choice (no sentence) |
| 2 | "some def" | "She ran." | — | — | fill-gap |
| 3 | "some def" | "She ran." | — | — | fill-gap or definition-choice (stable per id) |
| 5 | any | any | false | 0 | sentence-production |
| 8 | any | any | true | 0 | real-life-use-check |
| 8 | any | any | false | 3 | real-life-use-check (usageCount qualifies) |
| 8 | any | any | false | 2 | sentence-production (no mastery evidence yet) |

### Console check

```js
import('/src/lib/challengeLogic.ts').then(({ getChallengeType }) => {
  const base = {
    id: 'test-id-001',
    review: { sentenceProduced: false, intervalDays: 1, ease: 2.5, reviewCount: 0, successfulRecalls: 0 },
    activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
  }

  const cases = [
    [{ ...base, exposureCount: 0 }, 'recognition'],
    [{ ...base, exposureCount: 1, definitionEn: 'def' }, 'definition-choice'],
    [{ ...base, exposureCount: 2, definitionEn: 'def', exampleSentence: 'ex' }, 'fill-gap'],
    [{ ...base, exposureCount: 5 }, 'sentence-production'],
    [{ ...base, exposureCount: 8, review: { ...base.review, sentenceProduced: true } }, 'real-life-use-check'],
    [{ ...base, exposureCount: 8, activation: { ...base.activation, usageCount: 3 } }, 'real-life-use-check'],
    [{ ...base, exposureCount: 8, activation: { ...base.activation, usageCount: 2 } }, 'sentence-production'],
  ]

  cases.forEach(([item, expected]) => {
    const got = getChallengeType(item)
    const ok  = got === expected
    console[ok ? 'log' : 'error'](`exp=${item.exposureCount} → ${got} (expected ${expected}) ${ok ? '✓' : '✗'}`)
  })
})
```

### Determinism check (stableChoiceFromId)

```js
import('/src/lib/challengeLogic.ts').then(({ stableChoiceFromId }) => {
  const id = 'abc-123-def'
  // Should return the same value on every call
  const results = Array.from({ length: 10 }, () => stableChoiceFromId(id))
  const allSame = results.every((v) => v === results[0])
  console[allSame ? 'log' : 'error'](`stableChoiceFromId is deterministic: ${allSame} ✓`)
})
```

---

## 3. `validateVocabItems`

### Items to test

```js
import('/src/lib/vocabValidation.ts').then(({ validateVocabItems, summariseValidation }) => {
  const good = {
    id: 'item-1', term: 'mitigate', type: 'word',
    status: 'learning', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    level: 1, exposureCount: 1, inFocus: false, weeklyFocus: false, archived: false,
    definitionEn: 'To reduce the severity of something.',
    exampleSentence: 'We need to mitigate the risks.',
    synonyms: ['reduce'], antonyms: [], collocations: [], sentenceFrames: [], relatedPhrases: [],
    tags: ['business'], themes: ['Business & Professional'],
    review: { intervalDays: 1, ease: 2.5, reviewCount: 0, successfulRecalls: 0, sentenceProduced: false },
    activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
  }

  // Should have no errors
  const issuesGood = validateVocabItems([good])
  console.log('Good item issues:', summariseValidation(issuesGood))

  // Errors: missing term, exposure > 8
  const bad = { ...good, id: 'item-2', term: '', exposureCount: 9 }
  const issuesBad = validateVocabItems([bad])
  console.log('Bad item issues:', summariseValidation(issuesBad))

  // Warning: stored level inconsistent with derived level
  // exp=1 → deriveLevel = 1, but stored level = 3 → should warn
  const staleLevel = { ...good, id: 'item-3', term: 'stale', exposureCount: 1, level: 3 }
  const issuesStale = validateVocabItems([staleLevel])
  const hasInconsistent = issuesStale.some((i) => i.code === 'inconsistent-level')
  console[hasInconsistent ? 'log' : 'error'](`inconsistent-level warning fired: ${hasInconsistent} ✓`)
})
```

---

## 4. `recommendInitialFocusItems`

```js
import('/src/lib/personalizationLogic.ts').then(({ recommendInitialFocusItems }) => {
  const profile = {
    goal: 'work-communication',
    contexts: ['meetings', 'work-email'],
    preferredThemes: ['Business & Professional', 'Meetings & Presentations'],
    intensity: 'standard',
    targetFocusSize: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Simulate a library with a mix of levels
  const items = [
    { id: '1', term: 'delegate',  exposureCount: 0, tags: ['business'],  themes: ['Business & Professional'], archived: false, review: { sentenceProduced: false }, activation: { usageCount: 0 }, definitionEn: 'To assign.' },
    { id: '2', term: 'synergy',   exposureCount: 8, tags: ['business'],  themes: ['Business & Professional'], archived: false, review: { sentenceProduced: true  }, activation: { usageCount: 3 } },
    { id: '3', term: 'agenda',    exposureCount: 2, tags: ['meetings'],  themes: ['Meetings & Presentations'], archived: false, review: { sentenceProduced: false }, activation: { usageCount: 0 }, definitionEn: 'List of topics.' },
  ]

  const recs = recommendInitialFocusItems(items, profile, 5)
  // 'synergy' is Level 3 — should be excluded
  const hasMastered = recs.some((i) => i.term === 'synergy')
  console[!hasMastered ? 'log' : 'error'](`Mastered items excluded from recommendations: ${!hasMastered} ✓`)
  console.log('Recommended:', recs.map((i) => i.term))
})
```

---

## 5. `getItemLevel` (libraryFilters)

Ensures Library sorts and filters use derived levels.

```js
import('/src/lib/libraryFilters.ts').then(({ getItemLevel, filterLibraryItems, DEFAULT_FILTERS }) => {
  // An item with stale stored level=3 but exposureCount=1 → should return level 1
  const staleItem = {
    id: 'a', term: 'test', type: 'word', level: 3, exposureCount: 1,
    tags: [], themes: [], synonyms: [], antonyms: [], collocations: [], sentenceFrames: [],
    relatedPhrases: [], review: { sentenceProduced: false, intervalDays: 1, ease: 2.5, reviewCount: 0, successfulRecalls: 0 },
    activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    status: 'learning', createdAt: '', updatedAt: '', weeklyFocus: false, archived: false,
  }

  const lvl = getItemLevel(staleItem)
  console[lvl === 1 ? 'log' : 'error'](`getItemLevel uses derived level (got ${lvl}, expected 1) ✓`)

  // Filter for Mastered (level=3) should NOT include the stale item
  const filtered = filterLibraryItems([staleItem], { ...DEFAULT_FILTERS, level: 3 })
  console[filtered.length === 0 ? 'log' : 'error'](`Stale Mastered item not shown in Mastered filter: ${filtered.length === 0} ✓`)
})
```

---

## Notes

- All these checks can be pasted into the DevTools console while the dev server is running (`npm run dev`).
- The import paths use the raw TS source — Vite's dev server handles transpilation on the fly.
- For the production build, use the minified bundle; function names may differ.
- If any `✗` appears, re-read the relevant source file and verify the logic change was saved.
